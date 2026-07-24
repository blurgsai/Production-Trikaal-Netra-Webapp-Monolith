"""LLM Client with integrated MCP tool execution"""

from pprint import pprint

from blurgs_observability import init_observability
import json
import os
import asyncio
from typing import Optional, List, Tuple
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv
from blurgs_observability import get_logger
from blurgs_observability.decorators.tracing_function import traced
from core.clients.chat_db_client import ChatMongoClient
from core.clients.chroma_client import ChromaClient
from tool_client.client import MCPClient
from tool_server.rag_sources.text_source import TextSource

load_dotenv()

provider_model_mapping = {
    "ollama": os.getenv("OLLAMA_MODEL_NAME", 'qwen3-vl:2b'),
    "gemini": os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash-lite"),
}

# --- Global Chat DB Client ---
chat_db_client: Optional[ChatMongoClient] = None


# --- Setup the Unified Client Factory ---
def get_llm_client(provider: str):
    if provider == "ollama":
        ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        base_url = ollama_base if ollama_base.endswith("/v1") else f"{ollama_base}/v1"
        return AsyncOpenAI(
            base_url=base_url,
            api_key="ollama",  # Required but unused by Ollama
            timeout=60.0,
            max_retries=1,
        )
    elif provider == "gemini":
        return AsyncOpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=os.getenv("GOOGLE_API_KEY"),
            timeout=60.0,
            max_retries=1,
        )
    return None


def construct_streaming_response_format(content: str, chunk_count: int) -> str:
    """Helper to format content for SSE streaming"""
    stream_object = json.dumps({'p': '/message/content', 'o': 'append', 'v': content}) + "\n"
    return stream_object


def extract_tool_error(result_text: str) -> str | None:
    """Return a useful tool error message from MCP tool output, if present."""
    try:
        parsed = json.loads(result_text)
    except (TypeError, json.JSONDecodeError):
        return result_text if isinstance(result_text, str) and result_text.lower().startswith("error ") else None

    if isinstance(parsed, dict):
        error = parsed.get("error")
        if error:
            return str(error)

    return None


def build_no_content_fallback(tool_errors: list[str] | None = None) -> str:
    """Build a user-facing fallback when the final stream produces no text."""
    message = (
        "I searched the available sources, but I couldn't find enough relevant "
        "information to answer confidently."
    )
    if tool_errors:
        message += " I also encountered tool issues: " + "; ".join(tool_errors)
    return message

class StageOneResponseSchema(BaseModel):
    selected_sources: List[str]  # resource names 
    reasoning: str
    chunks_useful: bool



class LLMClientWithMCP:
    """LLM Client that integrates MCP tool execution"""

    @traced
    def __init__(self, mcp_server_url: str):
        """Initialize with MCP server URL"""
        self.mcp_client = MCPClient()
        self.logger = get_logger()
        self.mcp_server_url = mcp_server_url
        self.tools_schema: list = []
        self.resources_context: str = ""
        self.is_connected = False
        self._resources_stale: bool = False  # Set to True when a global document upload is detected
        
        # Memory configuration
        self.memory_threshold = int(os.getenv("MEMORY_THRESHOLD", "12"))
        self.memory_window_size = int(os.getenv("MEMORY_WINDOW_SIZE", "8"))
        self.memory_summary_model = os.getenv("MEMORY_SUMMARY_MODEL", "gemini-2.5-flash-lite")

    def _process_memory(self, messages: list) -> tuple:
        """Process messages by windowing based on MEMORY_WINDOW_SIZE
        
        Args:
            messages: List of Message objects in chronological order (oldest first)
            
        Returns:
            Tuple of (windowed_messages, dropped_count, dropped_messages):
            - windowed_messages: Last MEMORY_WINDOW_SIZE messages as dicts
            - dropped_count: Number of messages dropped
            - dropped_messages: List of dropped messages as dicts
        """
        total_messages = len(messages)
        dropped_count = max(0, total_messages - self.memory_window_size)
        
        # Convert Message objects to dicts in chat format
        message_dicts = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]
        
        if dropped_count > 0:
            dropped_messages = message_dicts[:dropped_count]
            windowed_messages = message_dicts[dropped_count:]
        else:
            dropped_messages = []
            windowed_messages = message_dicts
        
        return windowed_messages, dropped_count, dropped_messages

    def _retrieve_chunks(
        self,
        query: str,
        session_id: str,
        user_id: str | None = None,
        enabled_document_ids: list[str] | None = None
    ) -> Tuple[str, bool]:
        """
        Queries ChromaDB for relevant chunks from both the session and global
        user_documents collections.
    
        Args:
            query:      The user's query string (plain text — embedding is handled internally).
            session_id: The current session ID, used as a metadata filter on session_documents.
            user_id:    The ID of the user initiating the conversation.
            enabled_document_ids: Document IDs allowed for retrieval.

        Returns:
            A tuple of:
            - retrieved_chunks_text (str): Formatted, readable text of all retrieved chunks.
            - has_chunks (bool):           True if at least one chunk was found.
        """
        if not user_id or not enabled_document_ids:
            self.logger.info(
                "Skipping chunk retrieval because no enabled document IDs are available.",
                extra={
                    "user_id": user_id,
                    "enabled_document_ids": enabled_document_ids,
                }
            )
            return "", False

        try:
            self.logger.debug(
                "Retrieving chunks from Chroma",
                extra={
                    "query": query,
                    "session_id": session_id,
                    "user_id": user_id,
                    "enabled_document_ids_count": len(enabled_document_ids) if enabled_document_ids else 0,
                }
            )
            chroma = ChromaClient()

            session_chunks = chroma.search_documents(
                collection_name="session_documents",
                query=query,
                k=6,
                filter_metadata={
                    "$and": [
                        {"session_id": session_id},
                        {"document_id": {"$in": enabled_document_ids}},
                    ]
                }
            )
            global_chunks = chroma.search_documents(
                collection_name="global_documents",
                query=query,
                k=2,
                filter_metadata={
                    "$and": [
                        {"user_id": user_id},
                        {"document_id": {"$in": enabled_document_ids}},
                    ]
                }
            )

            all_chunks = session_chunks + global_chunks
            self.logger.info(
                "Chroma chunk retrieval completed",
                extra={
                    "session_chunk_count": len(session_chunks),
                    "global_chunk_count": len(global_chunks),
                    "total_chunks": len(all_chunks),
                }

               
            )
            print(f"Retrieved {len(all_chunks)} chunks from Chroma for session {session_id} and user {user_id}")
            if all_chunks:
                text = "\n\n---\n\n".join([
                    f"[Source: {c.metadata.get('file_name', 'unknown')}]\n{c.page_content}"
                    for c in all_chunks
                ])
                self.logger.debug(
                    "Retrieved chunk preview",
                    extra={
                        "preview": text[:1000],
                    }
                )
                return text, True

        except Exception as e:
            self.logger.warning(f"Chunk retrieval failed (non-fatal): {e}")

        return "", False

    def _should_summarize(self, total_messages: int, current_summary: Optional[str]) -> bool:
        """Check if summarization should occur
        
        Args:
            total_messages: Total number of messages in session
            current_summary: Current session summary (None if not set)
            
        Returns:
            True if total_messages >= threshold AND summary is None (first time only)
        """
        return total_messages >= self.memory_threshold and current_summary is None

    async def _create_incremental_summary(
        self,
        dropped_messages: list,
        existing_summary: Optional[str],
        provider: str
    ) -> str:
        """Create or update incremental summary
        
        Args:
            dropped_messages: List of dropped messages to summarize (as dicts)
            existing_summary: Existing session summary or None for first time
            provider: The LLM provider to use for summarization
            
        Returns:
            Updated summary string
        """
        llm_client = get_llm_client(provider)
        
        if existing_summary is None:
            # First-time summarization: summarize all dropped messages
            messages_text = "\n".join([
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in dropped_messages
            ])
            
            summary_prompt = f"""Please create a concise summary of the following conversation that captures the key context and decisions:

{messages_text}

Summary:"""
        else:
            # Incremental update: append new messages to existing summary
            # Assumes dropped_messages contains recent user+assistant pair
            new_messages_text = "\n".join([
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in dropped_messages
            ])
            
            summary_prompt = f"""Please update this existing summary with the new messages that follow:

EXISTING SUMMARY:
{existing_summary}

NEW MESSAGES:
{new_messages_text}

UPDATED SUMMARY:"""
        
        response = await llm_client.chat.completions.create(
            model=self.memory_summary_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise summaries of conversations."},
                {"role": "user", "content": summary_prompt}
            ]
        )
        
        return response.choices[0].message.content

    async def refresh_resources_context(self) -> list:
        """Fetch resources from MCP and rebuild the in-memory resource context."""
        self.logger.info("Refreshing MCP resources context from server")
        resources = await self.mcp_client.list_resources()
        self.resources_context = self.mcp_client.format_resources_for_context(resources)
        resource_names = [resource.get("name") for resource in resources if isinstance(resource, dict) and resource.get("name")]
        self.logger.info(
            f"Resources context refreshed successfully. Loaded {len(resources)} resources: {resource_names}"
        )
        return resources

    @traced
    async def connect(self):
        """Connect to MCP server and load tools and resources"""
        await self.mcp_client.connect_to_streamable_http_server(self.mcp_server_url)
        await self.mcp_client.list_tools()
        self.tools_schema = self.mcp_client.get_tools_schema()

        # Load and format resources for context
        await self.refresh_resources_context()

        self.is_connected = True
        print(f"Connected to MCP server. Loaded {len(self.tools_schema)} tools and {len(self.resources_context)} resources.")

   


    def _create_system_prompt(self) -> str:
        """Create a comprehensive system prompt with MCP context"""
        return f"""You are an AI assistant with access to MCP (Model Context Protocol) tools and resources.

Your capabilities:
- You can call any of the available MCP tools to help answer questions and complete tasks
- You have access to various data sources and resources through the MCP server

{self.resources_context}

Instructions:
0. Try to automatically decide which tools to use based on the user's request and the available resources.
1. When a user asks you to perform a task, analyze what tools or resources are needed
2. Call the appropriate MCP tools by providing their name and required arguments
3. Process the results and provide a clear, helpful response to the user
4. If multiple tool calls are needed, use them in sequence
5. Always explain what you're doing and why

Be proactive in using available tools to provide accurate and complete answers."""
    


    #deprecated
    async def run_conversation(self, messages: list, session_id: str, provider:str, model:str):

        if not self.is_connected:
            raise RuntimeError("Not connected to MCP server. Call connect() first.")

        llm_client = get_llm_client(provider)

        windowed_messages, dropped_count, dropped_messages = self._process_memory(messages)

        # Extract the latest user query (windowed_messages are plain dicts after _process_memory)
        user_query = windowed_messages[-1]["content"]

        # Retrieve relevant chunks from ChromaDB (session + global)
        retrieved_chunks_text, has_chunks = self._retrieve_chunks(user_query, session_id)

        # Build an optional context block to inject into Stage 1
        chunk_context_block = f"""
## Retrieved Document Context
The following content was retrieved from the user's uploaded documents and may be relevant to the query. Review it carefully before selecting tools.

{retrieved_chunks_text}
""" if has_chunks else ""

        # Stage 1: Get available tool names/descriptions + let LLM decide which tools and if chunks are useful.
        stage_1_resources_description = "\n".join([
            f"- {v['name']}: {v['description']}"
            for v in self.resources_context.values()
        ])

        stage1_system_prompt = f"""You are an AI assistant with access to MCP (Model Context Protocol) tools.

Your task is to analyze the user's request and select the appropriate tool(s) needed to resolve it.

{stage_1_resources_description}
{chunk_context_block}
Instructions:
1. Identify the tool(s) that match the intent of the user's query from the available tools listed above.
2. Because you do not have the detailed database schemas, collection names, table structures, or resource details yet, you do not need to provide accurate parameter arguments at this stage. Use placeholders or guessed values for the tool arguments.
3. The system will intercept your tool selection, fetch the exact resource schemas or contexts required, and feed them back to you in the next stage. You will then be able to refine and generate the correct parameters. ONLY in the next stage.
4. Focus only on calling the correct tool(s) to signal your selection in this stage.
5. Set `chunks_useful` to true if the Retrieved Document Context above directly answers or significantly contributes to the user's query. Set it to false if the context is irrelevant or absent.
6. If `chunks_useful` is true AND no tools are needed, set `selected_sources` to an empty list."""

        #building the conversation
        conversation_messages = [
            {"role": "system", "content": stage1_system_prompt},
        ] + windowed_messages

        create_params = {
            "model": model,
            "messages": conversation_messages,
        }

        self.logger.info(f"Sending Stage 1 to {provider}/{model}")

        response = await llm_client.chat.completions.create(
            **create_params,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "StageOneResponseSchema",
                    "strict": True,
                    "schema": StageOneResponseSchema.model_json_schema()
                }
            }
        )

        raw_content = response.choices[0].message.content
        stage_1_response = StageOneResponseSchema.model_validate_json(raw_content)

        self.logger.debug(f"Stage 1 result: {stage_1_response}")

        selected_resources = stage_1_response.selected_sources
        reasoning = stage_1_response.reasoning
        chunks_useful = stage_1_response.chunks_useful

        # --- Early Exit: no tools selected AND chunks are not useful ---
        if not selected_resources and not chunks_useful:
            self.logger.info("Stage 1: no tools selected and chunks not useful — early exit")
            return "I don't have enough information to answer this question based on the available data sources and documents."

        selected_resouces_info = {}
        for resource in selected_resources:
            if resource in self.resources_context:
                selected_resouces_info[resource] = self.resources_context[resource]
            else:
                self.logger.warning(f"Resource {resource} not found in resources context")

        # Build a formatted block of the selected resources for stage 2 context
        selected_resources_block = "\n\n".join([
            f"### {info['name']}\n{info['description']}\n\n{info['content']}"
            for info in selected_resouces_info.values()
        ])

        stage2_system_prompt = f"""You are an AI assistant with access to MCP (Model Context Protocol) tools.

You have already been given the schema and context of the relevant data sources based on the user's request. Use this information to call the correct tool(s) with accurate parameters.

## Available Data Source Context

{selected_resources_block}

## Instructions
1. Using the schema and source details above, determine the correct tool(s) to call and construct accurate arguments (e.g. database names, collection names, table names, filters, pipelines, etc.).
2. Call the tool(s) with precise, well-formed arguments — no placeholders.
3. After receiving the tool results, synthesize a clear and helpful response to the user.
4. If multiple tool calls are needed, execute them in sequence and combine the results.
5. If the user's question cannot be answered with the available tools and context, explain why clearly.

Stage 1 reasoning (for your reference): {reasoning}"""

        if selected_resources_block:
            create_params["messages"].append({"role": "system", "content": stage2_system_prompt})
            create_params["tools"] = self.tools_schema
            create_params["tool_choice"] = "auto"

        self.logger.info(f"Sending Stage 2 to {provider}/{model}")
        response = await llm_client.chat.completions.create(**create_params)

        self.logger.info(f"Stage 2 response: {response.choices[0].message}")

        conversation_messages.append(response.choices[0].message)

        if response.choices[0].message.tool_calls:
            self.logger.info(f"Executing {len(response.choices[0].message.tool_calls)} tool(s)")

            for tool_call in response.choices[0].message.tool_calls or []:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)

                try:
                    function_response = await self.mcp_client.call_tool(
                        function_name,
                        function_args
                    )

                    if isinstance(function_response, dict) and function_response.get("isError"):
                        result_text = function_response["content"][0]["text"]
                    else:
                        result_text = json.dumps(function_response) if isinstance(function_response, dict) else str(function_response)

                except Exception as e:
                    result_text = f"Error calling tool {function_name}: {str(e)}"

                conversation_messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": result_text,
                })

            # Inject retrieved chunks into Stage 3 if they are useful
            if chunks_useful and retrieved_chunks_text:
                conversation_messages.append({
                    "role": "system",
                    "content": (
                        "## Retrieved Document Context\n"
                        "Use the following retrieved content to help answer the user's question:\n\n"
                        f"{retrieved_chunks_text}"
                    )
                })

            self.logger.info(f"Sending Stage 3 (final) to {provider}/{model}")
            final_params = {
                "model": model,
                "messages": conversation_messages,
            }
            if self.tools_schema:
                final_params["tools"] = self.tools_schema
                final_params["tool_choice"] = "none"
            final_response = await llm_client.chat.completions.create(**final_params)
            return final_response.choices[0].message.content

        # No tool calls — if chunks are useful, inject them and do a final synthesis pass
        if chunks_useful and retrieved_chunks_text:
            conversation_messages.append({
                "role": "system",
                "content": (
                    "## Retrieved Document Context\n"
                    "Use the following retrieved content to answer the user's question:\n\n"
                    f"{retrieved_chunks_text}"
                )
            })
            self.logger.info(f"Sending Stage 3 (chunks-only) to {provider}/{model}")
            final_params = {
                "model": model,
                "messages": conversation_messages,
            }
            if self.tools_schema:
                final_params["tools"] = self.tools_schema
                final_params["tool_choice"] = "none"
            final_response = await llm_client.chat.completions.create(**final_params)
            return final_response.choices[0].message.content

        return response.choices[0].message.content

    @traced
    async def run_conversation_streaming(self, messages: list, session_id: str, provider: str, model: str, user_id: str):
        """Stream conversation using two-stage prompting; only the final answer is streamed.

        Stage 1 (non-streaming): LLM selects which data-source resources are relevant.
        Stage 2 (non-streaming): LLM receives full resource schemas, calls tools, results are collected.
        Final pass (streaming): LLM synthesizes and streams the answer.

        Yields SSE-formatted events:
        - {"p": "/messsage/content", "o": "append", "v": "..."}
        - [DONE]

        Args:
            messages: List of Message objects in chronological order (oldest first)
            session_id: Session ID for memory persistence
            provider: The LLM provider (e.g., 'ollama', 'gemini')
            model: The specific model name to use
            user_id: The ID of the user initiating the conversation
        """
        if not self.is_connected:
            raise RuntimeError("Not connected to MCP server. Call connect() first.")

        # If a global document was uploaded since the last prompt, re-fetch MCP resources.
        # The _resources_stale flag is set by /internal/mark_resources_stale in api.py,
        # which is called by the MCP server's /notify/resources_updated endpoint.
        if self._resources_stale:
            self.logger.info("Resources marked stale — re-fetching from MCP server.")
            try:
                await self.refresh_resources_context()
                self.logger.info("Resources refreshed successfully after stale flag was set.")
            except Exception as e:
                self.logger.warning(f"Failed to refresh resources after stale flag: {e}")
            finally:
                self._resources_stale = False  # Always clear, even on failure

        # FIX #1: Guard against a completely un-initialised MCP connection.
        # If tools_schema is empty the LLM has nothing to select from and Stage 1
        # will either return an empty selection or produce un-parseable JSON, both
        # of which cascade into the "No response content" error in api.py.
        # Attempt a live re-fetch first; if it still fails, surface a clear message.
        if not self.tools_schema:
            self.logger.warning("[STREAM] tools_schema is empty — attempting live re-fetch from MCP server.")
            try:
                await self.mcp_client.list_tools()  # repopulates mcp_client.tools_cache
                self.tools_schema = self.mcp_client.get_tools_schema()
                self.logger.info(f"[STREAM] Live tool re-fetch succeeded: {len(self.tools_schema)} tools loaded.")
            except Exception as e:
                self.logger.error(f"[STREAM] Live tool re-fetch failed: {e}")

            if not self.tools_schema:
                self.logger.error("[STREAM] MCP tools still unavailable after re-fetch — aborting.")
                yield construct_streaming_response_format(
                    "The AI assistant is not fully initialised yet — the tool server is unavailable. "
                    "Please try again in a few seconds.",
                    0,
                )
                yield "[DONE]\n\n"
                return

        llm_client = get_llm_client(provider)

        # Process memory: window messages and track drops
        windowed_messages, dropped_count, dropped_messages = self._process_memory(messages)

        # Extract the latest user query (windowed_messages are plain dicts after _process_memory)
        user_query = windowed_messages[-1]["content"]

        global chat_db_client
        if chat_db_client is None:
            chat_db_client = ChatMongoClient()

        enabled_document_ids = chat_db_client.list_enabled_documents(session_id=session_id, user_id=user_id)
        self.logger.info(
            "Enabled document IDs for session",
            extra={
                "session_id": session_id,
                "user_id": user_id,
                "enabled_document_ids_count": len(enabled_document_ids),
                "enabled_document_ids_preview": enabled_document_ids[:10],
            }
        )

        # Retrieve relevant chunks from ChromaDB (session + global)
        retrieved_chunks_text, has_chunks = self._retrieve_chunks(user_query, session_id, user_id, enabled_document_ids=enabled_document_ids)
        self.logger.info(
            "Chunk retrieval result",
            extra={
                "has_chunks": has_chunks,
                "retrieved_chunks_length": len(retrieved_chunks_text),
                "retrieved_chunks_preview": retrieved_chunks_text[:500] if retrieved_chunks_text else "",
            }
        )

        # Build an optional context block to inject into Stage 1
        chunk_context_block = f"""
## Retrieved Document Context
The following content was retrieved from the user's uploaded documents and may be relevant to the query. Review it carefully before selecting tools.

{retrieved_chunks_text}
""" if has_chunks else ""

        # --- Stage 1: Resource selection (non-streaming) ---
        # Show resource *keys* (e.g. "text_files_schema") in the prompt so the LLM
        # returns the exact dict key used in resources_context — not a file-level
        # name invented from the retrieved chunk metadata.
        stage_1_resources_description = "\n\n".join([
            f"### key={k!r}: {v['name']}\nDescription: {v['description']}\nContent:\n{v['content']}"
            for k, v in self.resources_context.items()
        ])

        stage1_system_prompt = f"""You are an AI assistant with access to MCP (Model Context Protocol) tools.

Your task is to analyze the user's request and select the appropriate data source(s) needed to resolve it.

Available data sources (use the exact key values in `selected_sources`):
{stage_1_resources_description}
{chunk_context_block}
Instructions:
1. Identify the data source(s) that match the intent of the user's query from the list above.
2. In `selected_sources`, return ONLY the exact key strings shown above (e.g. "text_files_schema"). Do NOT return file names, document titles, or any other invented strings.
3. Because you do not have the detailed database schemas, collection names, table structures, or resource details yet, you do not need to provide accurate parameter arguments at this stage — the system will supply those in the next stage.
4. Focus only on selecting the correct source key(s) at this stage.
5. Set `chunks_useful` to true if the Retrieved Document Context above directly answers or significantly contributes to the user's query. Set it to false if the context is irrelevant or absent.
6. If `chunks_useful` is true AND no tools are needed, set `selected_sources` to an empty list."""

        conversation_messages = [
            {"role": "system", "content": stage1_system_prompt},
        ] + windowed_messages

        create_params = {
            "model": model,
            "messages": conversation_messages,
        }

        self.logger.info(f"[STREAM] Stage 1: selecting resources with {provider}/{model}")
        stage1_response = await llm_client.chat.completions.create(
            **create_params,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "StageOneResponseSchema",
                    "strict": True,
                    "schema": StageOneResponseSchema.model_json_schema()
                }
            }
        )

        if hasattr(stage1_response, "usage") and stage1_response.usage:
            self.logger.info(
                f"[STREAM] Stage 1 output tokens: completion_tokens={stage1_response.usage.completion_tokens}, prompt_tokens={stage1_response.usage.prompt_tokens}, total_tokens={stage1_response.usage.total_tokens}"
            )

        raw_content = stage1_response.choices[0].message.content
        self.logger.debug(
            "Stage 1 raw output",
            extra={
                "raw_content": raw_content[:2000] if raw_content else None,
            }
        )

        # FIX #2: Catch malformed / null Stage-1 JSON before it propagates as an
        # unhandled exception to api.py, which would trigger the generic
        # "No response content was generated" error instead of a readable message.
        try:
            stage_1_result = StageOneResponseSchema.model_validate_json(raw_content)
        except Exception as parse_err:
            self.logger.error(
                f"[STREAM] Stage 1 JSON parse failed (raw={repr(raw_content)}): {parse_err}"
            )
            yield construct_streaming_response_format(
                "I encountered an internal error while processing your request. "
                "Please try again.",
                0,
            )
            yield "[DONE]\n\n"
            return

        self.logger.debug(f"[STREAM] Stage 1 result: {stage_1_result}")

        selected_resources = stage_1_result.selected_sources
        reasoning = stage_1_result.reasoning
        chunks_useful = stage_1_result.chunks_useful

        # Note: Early exit removed so general/conversational queries proceed to Stage 2 directly when no tools/chunks are needed.

        selected_resources_info = {}
        for resource in selected_resources:
            if resource in self.resources_context:
                selected_resources_info[resource] = self.resources_context[resource]
            else:
                self.logger.warning(f"Resource {resource} not found in resources context")

        selected_resources_block = "\n\n".join([
            f"### {info['name']}\n{info['description']}\n\n{info['content']}"
            for info in selected_resources_info.values()
        ])

        available_tool_names = [tool["function"]["name"] for tool in self.tools_schema]
        available_tools_text = "\n".join([f"- {name}" for name in available_tool_names])

        stage2_system_prompt = f"""You are an AI assistant with access to MCP (Model Context Protocol) tools.

You have already been given the schema and context of the relevant data sources based on the user's request. Use this information to call the correct tool(s) with accurate parameters.

## Available Data Source Context

{selected_resources_block if selected_resources_block else "No specific data source resources required or selected in Stage 1."}

## Valid tool names
{available_tools_text}

IMPORTANT:
- Only call tools from the list above.
- Do not call resource names such as `text_files_schema`, `mongo_schema`, or any other resource descriptor.
- If you need document search, use `search_documents`.

## Instructions
1. Using the schema and source details above, determine the correct tool(s) to call and construct accurate arguments (e.g. database names, collection names, table names, filters, pipelines, etc.).
2. Call the tool(s) with precise, well-formed arguments — no placeholders.
3. After receiving the tool results, synthesize a clear and helpful response to the user.
4. If multiple tool calls are needed, execute them in sequence and combine the results.
5. If the user's question cannot be answered with the available tools and context, explain why clearly.

Stage 1 reasoning (for your reference): {reasoning}"""

        # --- Stage 2: Tool execution (non-streaming) ---
        if self.tools_schema:
            create_params["messages"].append({"role": "system", "content": stage2_system_prompt})
            create_params["tools"] = self.tools_schema
            create_params["tool_choice"] = "auto"

        self.logger.info(f"[STREAM] Stage 2: tool execution with {provider}/{model}")
        stage2_response = await llm_client.chat.completions.create(**create_params)
        if hasattr(stage2_response, "usage") and stage2_response.usage:
            self.logger.info(
                f"[STREAM] Stage 2 output tokens: completion_tokens={stage2_response.usage.completion_tokens}, prompt_tokens={stage2_response.usage.prompt_tokens}, total_tokens={stage2_response.usage.total_tokens}"
            )
        self.logger.debug(
            "Stage 2 response summary",
            extra={
                "message_content": stage2_response.choices[0].message.content[:2000] if stage2_response.choices[0].message.content else None,
                "tool_calls_count": len(stage2_response.choices[0].message.tool_calls or []),
                "tool_calls": [tool_call.function.name for tool_call in (stage2_response.choices[0].message.tool_calls or [])],
            }
        )

        # FIX B: Only append the Stage 2 assistant message when tool calls are
        # present. If we append it unconditionally, the final streaming pass sees
        # a completed [user → assistant] exchange and the provider emits zero tokens
        # (chunk_count: 0). Tool messages must follow an assistant message that
        # contains tool_calls, so this is also required for correct message ordering.
        if stage2_response.choices[0].message.tool_calls:
            conversation_messages.append(stage2_response.choices[0].message)
            self.logger.info(f"[STREAM] Executing {len(stage2_response.choices[0].message.tool_calls)} tool(s)")

            tool_errors = []
            for tool_call in stage2_response.choices[0].message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)

                try:
                    function_response = await self.mcp_client.call_tool(function_name, function_args)

                    if isinstance(function_response, dict) and function_response.get("isError"):
                        result_text = function_response["content"][0]["text"]
                    else:
                        result_text = json.dumps(function_response) if isinstance(function_response, dict) else str(function_response)
                except Exception as e:
                    result_text = f"Error calling tool {function_name}: {str(e)}"
                    self.logger.error(f"Tool execution failed for {function_name}: {e}")

                tool_error = extract_tool_error(result_text)
                if tool_error:
                    tool_errors.append(f"{function_name}: {tool_error}")

                conversation_messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": result_text,
                })

            # Inject retrieved chunks before streaming the final answer
            if chunks_useful and retrieved_chunks_text:
                conversation_messages.append({
                    "role": "system",
                    "content": (
                        "## Retrieved Document Context\n"
                        "Use the following retrieved content to help answer the user's question:\n\n"
                        f"{retrieved_chunks_text}"
                    )
                })

            # Add this strict guardrail message
            conversation_messages.append({
                "role": "system",
                "content": (
                    "IMPORTANT: You are now in the final synthesis stage. "
                    "Do NOT attempt to call any more tools, even if previous tool calls failed or returned 0 results. "
                    "You must provide your final answer to the user in natural language based ONLY on the information you currently have."
                )
            })
            

            # --- Final pass: Stream the synthesized answer ---
            self.logger.info(f"[STREAM] Final pass: streaming answer with {provider}/{model}")
            final_params = {
                "model": model,
                "messages": conversation_messages,
                "stream": True,
                "stream_options": {"include_usage": True},
            }
            if self.tools_schema:
                final_params["tools"] = self.tools_schema
                final_params["tool_choice"] = "none"
            final_stream = await llm_client.chat.completions.create(**final_params)

            chunk_count = 0
            async for chunk in final_stream:
                if hasattr(chunk, "usage") and chunk.usage:
                    self.logger.info(
                        f"[STREAM] Final pass output tokens: completion_tokens={chunk.usage.completion_tokens}, prompt_tokens={chunk.usage.prompt_tokens}, total_tokens={chunk.usage.total_tokens}"
                    )
                self.logger.debug(
                    f"Final stream raw chunk: {chunk.model_dump() if hasattr(chunk, 'model_dump') else repr(chunk)}"
                )
                delta = chunk.choices[0].delta
                if delta.content:
                    yield construct_streaming_response_format(delta.content, chunk_count)
                    chunk_count += 1
            self.logger.info(
                "Final stream complete",
                extra={
                    "chunk_count": chunk_count,
                    "tool_errors": tool_errors,
                }
            )

            if chunk_count == 0:
                yield construct_streaming_response_format(
                    build_no_content_fallback(tool_errors if tool_errors else None),
                    0,
                )

        else:
            # No tool calls in Stage 2 — if chunks are useful, do a streaming synthesis pass with chunk context
            if chunks_useful and retrieved_chunks_text:
                conversation_messages.append({
                    "role": "system",
                    "content": (
                        "## Retrieved Document Context\n"
                        "Use the following retrieved content to answer the user's question:\n\n"
                        f"{retrieved_chunks_text}"
                    )
                })
                self.logger.info(f"[STREAM] Final pass (chunks-only): streaming answer with {provider}/{model}")
                self.logger.debug(
                    "Final pass conversation messages",
                    extra={
                        "message_count": len(conversation_messages),
                        "last_messages": [
                            {
                                "role": msg.get("role"),
                                "content_preview": msg.get("content", "")[:400]
                            }
                            for msg in conversation_messages[-3:]
                        ],
                    }
                )
                final_params = {
                    "model": model,
                    "messages": conversation_messages,
                    "stream": True,
                    "stream_options": {"include_usage": True},
                }
                if self.tools_schema:
                    final_params["tools"] = self.tools_schema
                    final_params["tool_choice"] = "none"
                final_stream = await llm_client.chat.completions.create(**final_params)
                chunk_count = 0
                async for chunk in final_stream:
                    if hasattr(chunk, "usage") and chunk.usage:
                        self.logger.info(
                            f"[STREAM] Final pass (chunks-only) output tokens: completion_tokens={chunk.usage.completion_tokens}, prompt_tokens={chunk.usage.prompt_tokens}, total_tokens={chunk.usage.total_tokens}"
                        )
                    self.logger.debug(
                        f"Final stream raw chunk (chunks-only): {chunk.model_dump() if hasattr(chunk, 'model_dump') else repr(chunk)}"
                    )
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield construct_streaming_response_format(delta.content, chunk_count)
                        chunk_count += 1
                self.logger.info(
                    "Final stream complete (chunks-only)",
                    extra={
                        "chunk_count": chunk_count,
                    }
                )
                if chunk_count == 0:
                    self.logger.warning(
                        "Chunks-only final pass produced no streaming content",
                        extra={
                            "conversation_message_count": len(conversation_messages),
                            "stage2_response_content_preview": stage2_response.choices[0].message.content[:1000] if stage2_response.choices[0].message.content else None,
                        }
                    )
                    yield construct_streaming_response_format(
                        build_no_content_fallback(),
                        0,
                    )
                else:
                    self.logger.debug(
                        "Chunks-only final pass produced stream chunks",
                        extra={
                            "chunk_count": chunk_count,
                        }
                    )
            else:
                # No tool calls, no useful chunks — re-stream Stage 2 response token-by-token
                self.logger.info("[STREAM] No tools called; re-streaming Stage 2 response")
                content = stage2_response.choices[0].message.content
                self.logger.debug(
                    "Stage 2 direct content",
                    extra={
                        "content": content[:2000] if content else None,
                    }
                )
                if content:
                    final_params = {
                        "model": model,
                        "messages": conversation_messages,
                        "stream": True,
                        "stream_options": {"include_usage": True},
                    }
                    if self.tools_schema:
                        final_params["tools"] = self.tools_schema
                        final_params["tool_choice"] = "none"
                    final_stream = await llm_client.chat.completions.create(**final_params)
                    chunk_count = 0
                    async for chunk in final_stream:
                        if hasattr(chunk, "usage") and chunk.usage:
                            self.logger.info(
                                f"[STREAM] Final pass (no-tools) output tokens: completion_tokens={chunk.usage.completion_tokens}, prompt_tokens={chunk.usage.prompt_tokens}, total_tokens={chunk.usage.total_tokens}"
                            )
                        delta = chunk.choices[0].delta
                        if delta.content:
                            yield construct_streaming_response_format(delta.content, chunk_count)
                            chunk_count += 1
                    if chunk_count == 0:
                        yield construct_streaming_response_format(content, 0)
                else:
                    yield construct_streaming_response_format(
                        build_no_content_fallback(),
                        0,
                    )

        yield "[DONE]\n\n"

    async def cleanup(self):
        """Clean up MCP client"""
        await self.mcp_client.cleanup()


# --- Mock Message for standalone testing ---
class MockRole:
    def __init__(self, role: str):
        self.value = role

class MockMessage:
    """Mimics the Message ORM object used by the real API (has .role.value and .content)."""
    def __init__(self, content: str, role: str = "user"):
        self.content = content
        self.role = MockRole(role)


# --- Main execution ---
async def main():
    """Standalone test harness — runs without the API, UI, or database.
    
    Prerequisites:
        - MCP tool server must be running (default: http://localhost:5000/mcp)
        - .env must be configured with GOOGLE_API_KEY and MCP_SERVER_URL
    
    Run from project root:
        python -m llm_client_with_mcp
    """

    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:5000/mcp")
    provider = os.getenv("LLM_PROVIDER", "gemini")
    model = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash-lite")

    print(f"[STANDALONE] Connecting to MCP server at {mcp_url}")
    print(f"[STANDALONE] Using provider={provider}, model={model}\n")

    llm_client = LLMClientWithMCP(mcp_url)

    try:
        await llm_client.connect()

        # --- Edit your test prompts here ---
        test_prompts = [
            # "What tools do you have access to?",
            "How many documents are in the world_monitor_articles collection in the dev database?",
        ]

        session_id = "standalone-test-session"

        for i, prompt in enumerate(test_prompts, 1):
            print(f"\n{'='*60}")
            print(f"[{i}/{len(test_prompts)}] Prompt: {prompt}")
            print('='*60)

            # Build a minimal message history with just the user prompt
            messages = [MockMessage(content=prompt, role="user")]

            response = await llm_client.run_conversation(
                messages=messages,
                session_id=session_id,
                provider=provider,
                model=model,
            )
            print(f"\n[FINAL RESPONSE]\n{response}")

    finally:
        await llm_client.cleanup()
        print("\n[STANDALONE] Cleanup complete.")


if __name__ == "__main__":

    init_observability(
        None,
        'testing-llm-mcp-client',
        json_file_log_level="INFO",
        console_log_level="DEBUG",
        otel_log_level="INFO",
    )
    logger = get_logger()
    logger.info("Starting standalone llm client with mcp")

    asyncio.run(main())
