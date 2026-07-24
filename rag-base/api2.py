"""Simple Chat API using LLM Client with MCP"""

import os
import yaml
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# blurgs observability setup - MUST run before importing FastAPI so setup_auto_instrumentation patches FastAPI globally
from blurgs_observability import init_observability, shutdown_observability, get_logger
from blurgs_observability.decorators.tracing_function import traced
init_observability(
        None,
        'api-service',
        json_file_log_level="INFO",
        console_log_level="DEBUG",
        otel_log_level="INFO",
    )
logger = get_logger()

from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import httpx

from core.utils import session_auth
from core.utils.ingest_to_chroma import ingest_to_chroma_documents
from core.clients.chat_db_client import ChatMongoClient
from core.utils.jwt_auth import get_current_user
from core.utils.session_auth import verify_user_owns_session
from bson import ObjectId
from llm_client_with_mcp import LLMClientWithMCP

class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for BSON types"""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)
    
# Global LLM client instance
llm_client: Optional[LLMClientWithMCP] = None
chat_db_client: Optional[ChatMongoClient] = None
selected_provider: str = "ollama"
selected_model: str = "qwen3-vl:2b"
allowed_models: dict = {}


def load_allowed_models():
    """Load allowed models from JSON file"""
    global allowed_models
    
    models_file = Path("./allowed_models.json")
    if models_file.exists():
        try:
            with open(models_file, 'r') as f:
                allowed_models = json.load(f)
                logger.info(f"Loaded allowed models: {allowed_models}")
        except Exception as e:
            logger.error(f"Error loading allowed models: {e}")
            allowed_models = {"ollama": ["qwen3-vl:2b"], "gemini": ["gemini-3.1-flash-lite"]}
    else:
        allowed_models = {"ollama": ["qwen3-vl:2b"], "gemini": ["gemini-3.1-flash-lite"]}


def get_provider_for_model(model: str) -> str:
    """Determine provider based on model name"""
    for provider, models in allowed_models.items():
        if model in models:
            return provider
    raise ValueError(f"Model '{model}' not found in allowed models")


def load_config():
    """Load LLM configuration from MongoDB copilot_settings collection"""
    global selected_provider, selected_model, chat_db_client
    
    try:
        if chat_db_client and chat_db_client.db is not None:
            db = chat_db_client.db
        else:
            # Fallback connection if chat_db_client is not yet initialized
            mongo_host = os.getenv("MONGO_HOST", "localhost")
            mongo_port = os.getenv("MONGO_PORT", "27017")
            mongo_username = os.getenv("MONGO_USERNAME")
            mongo_password = os.getenv("MONGO_PASSWORD")
            mongo_auth_source = os.getenv("MONGO_AUTH_SOURCE", "admin")
            db_name = os.getenv("MONGO_DB_NAME", "dev")
            
            if mongo_username and mongo_password:
                uri = f"mongodb://{mongo_username}:{mongo_password}@{mongo_host}:{mongo_port}/?authSource={mongo_auth_source}"
            else:
                uri = f"mongodb://{mongo_host}:{mongo_port}"
            from pymongo import MongoClient
            client = MongoClient(uri)
            db = client[db_name]
            
        settings_doc = db["copilot_settings"].find_one({"_id": "default"})
        if not settings_doc:
            settings_doc = db["copilot_settings"].find_one()
            
        if settings_doc and "selected_llm" in settings_doc:
            llm_config = settings_doc["selected_llm"]
            selected_provider = llm_config.get("provider", "ollama")
            selected_model = llm_config.get("model", "qwen3-vl:2b")
            logger.info(f"Loaded LLM config from MongoDB copilot_settings: provider={selected_provider}, model={selected_model}")
        else:
            logger.info(f"No valid LLM settings found in MongoDB copilot_settings. Using defaults: provider={selected_provider}, model={selected_model}")
    except Exception as e:
        logger.error(f"Error loading LLM settings from MongoDB copilot_settings: {e}")
        logger.info(f"Using defaults: provider={selected_provider}, model={selected_model}")


class ChatRequest(BaseModel):
    """Chat request model"""
    session_id: str = Field(..., description="Session ID to retrieve message from")
    message: str = Field(..., description="User message to send")


class ChatResponse(BaseModel):
    """Chat response model"""
    message: str
    provider: str
    session_id: str
    message_id: str


class CreateSessionRequest(BaseModel):
    """Create session request model"""
    title: Optional[str] = Field(None, description="Session title (optional)")
    summary: Optional[str] = Field(None, description="Session summary (optional)")


class CreateSessionResponse(BaseModel):
    """Create session response model"""
    session_id: str
    title: str
    summary: Optional[str]
    user_id: str
    created_at: str


class MessageResponse(BaseModel):
    """Message response model"""
    message_id: str
    session_id: str
    role: str
    content: str
    created_at: str

class DocumentUploadRequest(BaseModel):
    file_path: str = Field(..., description="File path of the document to add")
    session_id: Optional[str] = Field(None, description="Session ID to add document to")

class GlobalUploadDocuments(BaseModel):
    file_path: str = Field(..., description="File path of the document to add")
    file_name: str = Field(..., description="Name of the file")
    description:str = Field(..., description="Description of the document")
    session_id: Optional[str] = Field(None, description="Session ID to add document to")

class ToggleSourceDocumentStatus(BaseModel):
    document_id: str = Field(..., description="Document ID to toggle status")
    document_type: Optional[str] = Field(None, description="Optional document type: 'global' or 'session'")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    global llm_client, chat_db_client
    
    logger.info("FastAPI startup: initializing services")
    
    # Load allowed models
    load_allowed_models()
    
    # Startup - Initialize ChatMongoClient first
    try:
        chat_db_client = ChatMongoClient()
        logger.info("Chat DB Client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Chat DB Client: {e}", exc_info=True)
        
    # Load configuration from MongoDB copilot_settings
    load_config()
    
    # Startup - Initialize LLM Client
    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:5000/mcp")
    llm_client = LLMClientWithMCP(mcp_url)
    logger.debug(f"LLM Client created with MCP URL: {mcp_url}")
    
    try:
        await llm_client.connect()
        logger.info("LLM Client connected and ready")
    except Exception as e:
        logger.warning(f"Failed to connect LLM Client: {e}")
        logger.debug(f"Make sure MCP server is running at {mcp_url}")
    
    yield
    
    # Shutdown
    if llm_client:
        try:
            await llm_client.cleanup()
            logger.info("LLM Client cleaned up")
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Chat API",
    description="Simple chat API using LLM with MCP tools",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.post("/sessions", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user)
) -> CreateSessionResponse:
    """
    Create a new session for the authenticated user
    
    Requires JWT authentication via Authorization header: Bearer <token>
    
    Args:
        request: CreateSessionRequest with optional title and summary
        current_user: Current authenticated user from JWT token
        
    Returns:
        CreateSessionResponse with session details
    """
    global chat_db_client
    
    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )
    
    try:
        # Get or create user based on username from JWT
        username = current_user["username"]
        
        # Check if user exists
        user = chat_db_client.db.users.find_one({"username": username})
        
        if not user:
            logger.warning(f"User not found for username from token: {username}")
            raise HTTPException(
                status_code=401,
                detail="User not found in database"
            )
            
        user_id = user["_id"]
        logger.info(f"Found existing user: {username} with ID: {user_id}")
        
        # Generate default title if not provided
        from datetime import datetime
        session_title = request.title or f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # Create session with authenticated user's ID
        session_id = chat_db_client.new_session(
            user_id=user_id,
            title=session_title,
            summary=request.summary
        )
        
        # Get the created session to return full details
        session = chat_db_client.sessions_collection.find_one({"_id": session_id})
        
        if not session:
            raise HTTPException(
                status_code=500,
                detail="Failed to create session"
            )
        
        logger.info(f"Session created: {session_id} for user: {current_user['username']} ({user_id})")
        
        return CreateSessionResponse(
            session_id=str(session_id),
            title=session["title"],
            summary=session.get("summary"),
            user_id=str(user_id),
            created_at=session["updated_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating session: {str(e)}")

@app.get("/sessions")
async def get_user_sessions(
    current_user: dict = Depends(get_current_user)
) -> list:
    """
    Get all sessions for the authenticated user
    
    Requires JWT authentication via Authorization header: Bearer <token>
    
    Args:
        current_user: Current authenticated user from JWT token
        
    Returns:
        List of sessions belonging to the authenticated user
    """
    global chat_db_client
    
    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )
    
    try:
        # Get user based on username from JWT
        username = current_user["username"]
        
        # Find user by username
        user = chat_db_client.db.users.find_one({"username": username})
        
        if not user:
            logger.info(f"No user found for username: {username}, returning empty sessions list")
            return []
        
        user_id = user["_id"]
        logger.info(f"Fetching sessions for user: {username} (ID: {user_id})")
        
        # Get all sessions for this user
        sessions = list(chat_db_client.sessions_collection.find(
            {"user_id": user_id}
        ).sort("updated_at", -1))
        
        # Convert to response format
        session_list = []
        for session in sessions:
            session_list.append({
                "session_id": str(session["_id"]),
                "title": session["title"],
                "summary": session.get("summary"),
                "updated_at": session["updated_at"].isoformat(),
                "created_at": session["updated_at"].isoformat()  # Sessions don't have created_at, using updated_at
            })
        
        logger.info(f"Retrieved {len(session_list)} sessions for user: {current_user['username']}")
        return session_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting sessions: {str(e)}")

@app.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
) -> list[MessageResponse]:
    """
    Get all messages for a specific session
    
    Requires JWT authentication via Authorization header: Bearer <token>
    
    Args:
        session_id: The session ID to retrieve messages from
        current_user: Current authenticated user from JWT token
        
    Returns:
        List of messages in chronological order
    """
    global chat_db_client
    
    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )
    
    # Verify user owns the session
    await verify_user_owns_session(
        session_id,
        current_user["username"],
        chat_db_client
    )
    
    try:
        # Get all messages for this session
        messages = chat_db_client.get_message(session_id, last_n=10000)
        
        if not messages:
            return []
        
        # Convert to response format
        message_list = []
        for msg in messages:
            message_list.append(MessageResponse(
                message_id=str(msg.id),
                session_id=str(msg.session_id),
                role=msg.role.value,
                content=msg.content,
                created_at=msg.created_at.isoformat()
            ))
        
        logger.info(f"Retrieved {len(message_list)} messages for session: {session_id}")
        return message_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting messages: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
) -> ChatResponse:
    """
    Chat endpoint - retrieves full conversation (user message already inserted by webapp),
    sends to LLM with memory processing, persists assistant response
    
    Requires JWT authentication via Authorization header: Bearer <token>
    
    Args:
        request: ChatRequest with session_id
        current_user: Current authenticated user from JWT token
        
    Returns:
        ChatResponse with the LLM's response and message IDs
    """
    global llm_client, chat_db_client
    
    if not llm_client or not llm_client.is_connected:
        raise HTTPException(
            status_code=503,
            detail="LLM Client not connected. Make sure MCP server is running."
        )
    
    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )
    
    # Verify user owns the session
    await verify_user_owns_session(
        request.session_id,
        current_user["username"],
        chat_db_client
    )
    
    try:
        # Retrieve full conversation history (large number to get all)
        # Returns in chronological order by default (oldest first)
        all_messages = chat_db_client.get_message(request.session_id, last_n=1000)
        
        if not all_messages:
            raise HTTPException(
                status_code=400,
                detail=f"No messages found in session {request.session_id}"
            )
        
        # Validate latest message is a user message
        if all_messages[-1].role.value != "user":
            raise HTTPException(
                status_code=400,
                detail=f"Latest message in session is not a user message (role: {all_messages[-1].role})"
            )
        
        user_message_id = str(all_messages[-1].id)
        
        # Send to LLM with full message history and memory processing
        llm_response = await llm_client.run_conversation(
            all_messages,
            request.session_id,
            selected_provider,
            selected_model
        )
        
        # Persist assistant response
        assistant_message_id = chat_db_client.insert_assistant_message(
            llm_response,
            request.session_id
        )
        
        logger.debug(f"Chat processed: session={request.session_id}, user_msg={user_message_id}, assistant_msg={assistant_message_id}")
        
        return ChatResponse(
            message=llm_response,
            provider=selected_provider,
            session_id=request.session_id,
            message_id=str(assistant_message_id)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


async def stream_conversation(session_id: str, user_message: str, user_id: str) -> AsyncGenerator[str, None]:
    """Stream conversation and buffer complete content for persistence
    
    Args:
        session_id: The session ID to process
        user_message: User message to insert before streaming
        user_id: ID of the user
        
    Yields:
        SSE-formatted event strings
    """
    global llm_client, chat_db_client
    
    if not llm_client or not llm_client.is_connected:
        error_msg = json.dumps({"type": "error", "content": "LLM Client not connected"}, cls=JSONEncoder)
        yield f"data: {error_msg}\n\n"
        yield "data: [DONE]\n\n"
        return
    
    if not chat_db_client:
        error_msg = json.dumps({"type": "error", "content": "Chat DB Client not initialized"}, cls=JSONEncoder)
        yield f"data: {error_msg}\n\n"
        yield "data: [DONE]\n\n"
        return
    
    try:
        # Insert user message
        user_message_id = chat_db_client.insert_user_message(user_message, session_id)
        logger.debug(f"Inserted user message: {user_message_id} in session {session_id}")
        
        # Retrieve full conversation history (large number to get all)
        # Returns in chronological order by default (oldest first)
        all_messages = chat_db_client.get_message(session_id, last_n=1000)
        
        if not all_messages:
            error_msg = json.dumps({"type": "error", "content": f"No messages found in session {session_id}"}, cls=JSONEncoder)
            yield f"data: {error_msg}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        # Validate latest message is a user message
        if all_messages[-1].role.value != "user":
            error_msg = json.dumps({"type": "error", "content": f"Latest message is not a user message (role: {all_messages[-1].role})"}, cls=JSONEncoder)
            yield f"data: {error_msg}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        full_content = ""
        stream_error_sent = False

        if DEBUG_MODE:
            debug_reply = f"Debug mode active. Echoing user message: {all_messages[-1].content}"
            full_content = debug_reply
            words = debug_reply.split()
            for i, word in enumerate(words):
                payload = {
                    "p": f"/message/content/{i}",
                    "o": "append",
                    "v": word + " ",
                }
                yield f"data: {json.dumps(payload, cls=JSONEncoder)}\n\n"
                await asyncio.sleep(0.5)
            yield "data: [DONE]\n\n"

        else:      
            #if debug not running
            # Stream conversation with full message history and memory processing
            async for event in llm_client.run_conversation_streaming(
                all_messages,
                session_id,
                selected_provider,
                selected_model,
                user_id
            ):
                logger.debug(f"Chunk from stream: {event}")
                event_stripped = event.strip()
                if event_stripped == "[DONE]":
                    continue

                if event_stripped:
                    yield f"data: {event_stripped}\n\n"

                
                
                # Extract and buffer content from events (JSON Patch-like format)
                try:
                    event_data = json.loads(event_stripped)
                    if event_data.get("type") == "error":
                        stream_error_sent = True
                    # Check for new JSON Patch-like format: {"p": "/message/content/n", "o": "append", "v": "text"}
                    if all(key in event_data for key in ['p', 'o', 'v']):
                        if event_data.get('o') == 'append' and '/content' in event_data.get('p', ''):
                            text_chunk = event_data.get('v')
                            if text_chunk is not None:
                                logger.debug(f"Adding text to buffer: {repr(text_chunk)}")
                                full_content += text_chunk
                except json.JSONDecodeError as e:
                    logger.debug(f"Failed to parse event as JSON: {repr(event_stripped[:100])}, error: {e}")
        
        # Persist complete response after stream ends
        logger.debug(f"Stream complete. Full content length: {len(full_content)}, Full content: {repr(full_content)}")
        if full_content:
            assistant_message_id = chat_db_client.insert_assistant_message(
                full_content,
                session_id
            )
            logger.debug(f"Stream processed and persisted: session={session_id}, assistant_msg={assistant_message_id}")
        elif not stream_error_sent:
            error_msg = json.dumps({"type": "error", "content": "No response content was generated. Check API and tool-server logs for the upstream tool or LLM error."}, cls=JSONEncoder)
            yield f"data: {error_msg}\n\n"
        yield "data: [DONE]\n\n"
    
    except Exception as e:
        logger.error(f"Error processing stream: {str(e)}", exc_info=True)
        error_msg = json.dumps({"type": "error", "content": f"Error processing stream: {str(e)}"}, cls=JSONEncoder)
        yield f"data: {error_msg}\n\n"
        yield "data: [DONE]\n\n"

@app.get("/health")
async def health() -> dict:
    """Health check endpoint"""
    global llm_client
    
    logger.debug("Health check requested")
    return {
        "status": "ok",
        "llm_client_connected": llm_client.is_connected if llm_client else False
    }

# add a debug mode that will return one word at a time for a given string
@app.post("/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
) -> StreamingResponse:
    """
    Streaming chat endpoint - inserts user message and streams LLM response
    
    Requires JWT authentication via Authorization header: Bearer <token>
    
    Args:
        request: ChatRequest with session_id and message
        current_user: Current authenticated user from JWT token
        
    Returns:
        StreamingResponse with SSE events
    """
    global chat_db_client

    user_id_bson = chat_db_client.get_user_id_by_username(current_user["username"])
    if not user_id_bson:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user_id_bson)

    # Verify user owns the session
    await verify_user_owns_session(
        request.session_id,
        current_user["username"],
        chat_db_client
    )

    
    
    logger.debug(f"Stream chat requested for session: {request.session_id} by user: {user_id}")
    return StreamingResponse(
        stream_conversation(request.session_id, request.message, user_id),
        media_type="text/event-stream"
    )

@app.get("/enable-file")
async def enable_document_status(
    request: ToggleSourceDocumentStatus,
    current_user: dict = Depends(get_current_user)
)-> dict:

    global chat_db_client

    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )

    target_status = True

    is_status_changed = chat_db_client.toggle_session_document_status(
        request.document_id,
        target_status
    )

    if not is_status_changed:
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle document status"
        )

    return {
        "status": "ok",
        "message": "Document status toggled successfully"
    }

@app.get("/disable-file")
async def disable_document_status(
    request: ToggleSourceDocumentStatus,
    current_user: dict = Depends(get_current_user)
)-> dict:

    global chat_db_client

    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )

    target_status = False  # Explicitly set target status to False for disabling
    
    is_status_changed = chat_db_client.toggle_session_document_status(
        request.document_id,
        target_status
    )

    if not is_status_changed:
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle document status"
        )

    return {
        "status": "ok",
        "message": "Document status toggled successfully"
    }

@app.post("/add-session-documents")
async def add_session_document(
    request: DocumentUploadRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    #verify ownership of the user
    global chat_db_client

    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )


    # Verify user owns the session
    await verify_user_owns_session(
        request.session_id,
        current_user["username"],
        chat_db_client
    )

    document_type = "session"  # For session documents, we set the type to "session"

    document_id = chat_db_client.save_session_document(
        request.session_id,
        request.file_path,
        document_type=document_type
    )
    logger.debug(f"Source ID generated: {document_id}")


    result = await run_in_threadpool(
        ingest_to_chroma_documents,
        request.file_path,
        document_id,
        document_type=document_type,
        session_id=request.session_id,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest document: {result.get('error')}"
        )


    return {
        "status": "ok",
        "message": "Document added successfully"
    }

@app.post("/add-global-documents")
async def add_global_document(
    request: GlobalUploadDocuments,
    current_user: dict = Depends(get_current_user)
) -> dict:
    #verify ownership of the user
    global chat_db_client

    if not chat_db_client:
        raise HTTPException(
            status_code=503,
            detail="Chat DB Client not initialized."
        )

    # Look up the user's _id from their username (extracted from JWT token)
    user_id = chat_db_client.get_user_id_by_username(current_user["username"])
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not request.file_path and not request.file_name:
        raise HTTPException(
            status_code=400,
            detail="Either file_path or file_name must be provided"
        )
    
    source_path = request.file_path or request.file_name
    document_name = request.file_name or (Path(source_path).name if source_path else None)

    document_id = chat_db_client.save_user_document(
        source_path,
        user_id,
        document_type="global"
    )
    logger.debug(f"Source ID generated: {document_id}")

    minio_collection_name = "omnisense-docs"
    chroma_collection_name = "user_documents"
    
    result = await run_in_threadpool(
        ingest_to_chroma_documents,
        source_path,
        document_id,
        document_type="global",
        session_id=request.session_id,
        user_id=str(user_id),
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest document: {result.get('error')}"
        )
    
    #marking the resource cache as stale after global document upload
    if llm_client:
        llm_client._resources_stale = True
        logger.info("Resource cache marked as stale after global document upload.")
    else:
        logger.warning("LLM client not initialized; resource cache could not be marked stale after global document upload.")


    # Notify MCP server that global resources changed (fire-and-forget)
    mcp_server_base = os.getenv("MCP_SERVER_BASE_URL", "http://localhost:5000")
    try:
        async with httpx.AsyncClient(timeout=3.0) as http:
            await http.post(
                f"{mcp_server_base}/webhooks/documents-updated",
                json={"name": document_name, "description": request.description}
                )
        logger.info("MCP server notified of resource update.")
    except Exception as e:
        logger.warning(f"Failed to notify MCP server of resource update: {e}")

    return {
        "status": "ok",
        "message": "Document added successfully"
    }

# #stale endpoint
# @app.post("/internal/mark_resources_stale")
# async def mark_resources_stale() -> dict:
#     """Internal endpoint called by the MCP server to invalidate the LLM client's resource cache."""
#     global llm_client
#     if llm_client:
#         llm_client._resources_stale = True
#         logger.info("Resource cache marked as stale by MCP server notification.")
#     load_config()
#     return {"status": "ok"}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    service_port = int(os.getenv("SERVICE_API_PORT", "8000"))
    logger.info(f"Starting FastAPI service on port {service_port}")
    
    #debug mode that will return one word at a time for a given request.message, useful for testing streaming behavior
    DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


    try:
        uvicorn.run(
            app,
            host='0.0.0.0',
            port=service_port,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Error starting FastAPI service: {str(e)}", exc_info=True)
    finally:
        shutdown_observability()
        logger.info(f"Shutting down observability")
