import asyncio
import os
from pprint import pprint

from dotenv import load_dotenv
from mcp.server import FastMCP
from openai import AsyncOpenAI
from core.utils.logger import Logger
from pydantic import BaseModel, Field
from typing import Callable, Dict, List, Optional, Union, Literal
from tool_server.rag_sources.base_class import RAGSource, ResourceDefinition, SourceType, ToolDefinition

logger = Logger("page-navigation-rag-source").get_logger()


class OperatorDetail(BaseModel):
    # 'token' and 'tokens' are safe, but 'context' is often a keyword in other libs
    token: Optional[str] = None
    tokens: Optional[List[str]] = None
    template: str
    description: Optional[str] = None
    context: Optional[str] = None


class StringOperators(BaseModel):
    eq: OperatorDetail
    ne: OperatorDetail
    contains: OperatorDetail
    starts: OperatorDetail
    ends: OperatorDetail


class NumberOperators(BaseModel):
    eq: OperatorDetail
    ne: OperatorDetail
    gt: OperatorDetail
    lt: OperatorDetail
    gte: OperatorDetail
    lte: OperatorDetail
    # 'range' is a Python keyword
    # range_op: OperatorDetail = Field(alias="range")


class DatetimeOperators(BaseModel):
    eq: OperatorDetail
    gte: OperatorDetail
    lte: OperatorDetail
    # range_op: OperatorDetail = Field(alias="range")


class GlobalOperators(BaseModel):
    string_ops: StringOperators = Field(alias="string")
    number_ops: NumberOperators = Field(alias="number")
    datetime_ops: DatetimeOperators = Field(alias="datetime")


class Attribute(BaseModel):
    name: str
    path: str
    # 'type' is a Python keyword
    data_type: Literal["string", "number", "datetime"] = Field(alias="type")
    description: Optional[str] = None
    examples: List[Union[str, int, float]] = Field(default_factory=list)
    is_range_eligible: bool = False


class PageConfig(BaseModel):
    endpoint: str
    attributes: List[Attribute]


class SiteContext(BaseModel):
    global_operators: GlobalOperators
    pages: Dict[str, PageConfig]


class QueryGenerationResponse(BaseModel):
    reasoning: str = Field(
        description="Step-by-step logic used to map the request to the schema."
    )
    endpoint: str = Field(
        description="The chosen page endpoint (e.g., '/events' or '/map')."
    )
    query_string: str = Field(
        description="The final generated URL query string starting with '?'."
    )


class PageNavigationRAGSource(RAGSource):
    def __init__(self):
        self._source_type = SourceType.page_navigator
        self.config = self.get_config()
        self.llm_provider = self.config.get('parameters', {}).get('llm_provider', 'gemini')
        self.llm_model = self.config.get('parameters', {}).get('llm_model', 'gemini-2.0-flash-lite')

        self.client = self._setup_client()

        self.base_url = self.config.get('parameters', {}).get('base_url', 'https://example.com')
        self.schema_resource = self.config.get('schema_resource', {})
        
        # Get site_context from parameters, with proper default structure
        site_context_data = self.config.get('parameters', {}).get('site_context')
        self.site_context = SiteContext.model_validate(site_context_data)

    def _setup_client(self) -> AsyncOpenAI:
        """Initializes the unified client based on config."""

        if self.llm_provider == "ollama":
            ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
            base_url = ollama_base if ollama_base.endswith("/v1") else f"{ollama_base}/v1"
            return AsyncOpenAI(
                base_url=base_url,
                api_key="ollama",
            )
        elif self.llm_provider == "gemini":
            return AsyncOpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=os.getenv("GOOGLE_API_KEY")
            )
        raise ValueError(f"Unsupported provider: {self.llm_provider}")

    def _reinitialize_from_config(self) -> bool:
        """Refresh provider, model, base_url, site_context and client after a config reload.

        Called by base_class.read_updated_config() after self.parameters has
        already been updated from the latest MongoDB copilot_sources document.

        Returns True on success, False if any part of reinitialization failed.
        """
        try:
            # Re-read all parameters that handlers depend on.
            self.llm_provider = self.parameters.get("llm_provider", "gemini")
            self.llm_model    = self.parameters.get("llm_model", "gemini-2.0-flash-lite")
            self.base_url     = self.parameters.get("base_url", "https://example.com")

            # Re-parse site_context — may raise ValidationError for bad docs.
            site_context_data = self.parameters.get("site_context")
            self.site_context = SiteContext.model_validate(site_context_data)

            # Rebuild the LLM client (picks up new provider / model / API key).
            # Must come after llm_provider is set, since _setup_client reads self.llm_provider.
            self.client = self._setup_client()

            logger.info("Page navigator config and client refreshed successfully.")
            return True

        except Exception as e:
            logger.error(f"Failed to refresh page navigator config: {e}", exc_info=True)
            return False


    def generate_system_prompt(self) -> str:
        # We include the full pages config so the LLM sees the endpoints
        site_context_json = self.site_context.model_dump_json(
            by_alias=True,indent=2
        )

        return f"""
### ROLE
You are a URL Query Parameter Generator. Your goal is to transform natural language into a structured JSON response.

### CONFIGURATION
The following JSON defines the available pages, their endpoints, attributes, and global operators:
{site_context_json}

### TASK STEPS
1. **Identify the Page**: Determine which page (e.g., 'map' or 'events') the user is asking about. Select its 'endpoint'.
2. **Identify Attributes**: Use ONLY the attributes listed under that specific page.
3. **Select Operators**: Match attribute types to the logic in 'global_operators'.
4. **Construct Query**: Use the 'path' as the key and the 'template' for the value.

### OUTPUT FORMAT
Return a valid JSON object:
{{
    "reasoning": "Explain which page was selected and why, then list the attribute and operator mapping.",
    "endpoint": "/the-selected-endpoint",
    "query_string": "?path=value&path2=value2"
}}

### EXAMPLES
- User: "Show me events for MMSI 12345"
  Output: {{
    "reasoning": "User asked for 'events', so I selected the events page and the MMSI attribute.",
    "endpoint": "/events",
    "query_string": "?MMSI=12345"
  }}
"""

    def get_structured_query(self, llm_response: str) -> QueryGenerationResponse:
        """Parses LLM string into Pydantic object."""
        try:
            clean_json = llm_response.strip().strip("```json").strip("```")
            return QueryGenerationResponse.model_validate_json(clean_json)
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            raise ValueError("LLM did not return valid JSON matching QueryGenerationResponse schema.")

    async def generate_full_url(self, user_query: str) -> dict:
        system_prompt = self.generate_system_prompt()
        try:
            response = await self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query},
                ],
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            structured = QueryGenerationResponse.model_validate_json(content)

            # Combine Base URL + Endpoint + Query String
            full_url = (
                f"{self.base_url}{structured.endpoint}{structured.query_string}"
            )

            return {
                "reasoning": structured.reasoning,
                "url": full_url,
                "endpoint_used": structured.endpoint,
            }
        except Exception as e:
            return {"error": str(e), "reasoning": f"Failed to generate {e}"}

    def get_tools(self,mcp:FastMCP) -> List[Callable]:
        tool_definitions = [
            ToolDefinition(
                name="generate_full_url",
                description="Generates a full URL based on the user query and page configuration.",
                handler=self.generate_full_url,
            )
        ]
        return super().get_tools(mcp, tool_definitions)


    async def page_navigator_resource_schema(self):
        """Resource: Page Navigation schemas and collections"""
        logger.debug("page_navigator_schema resource called")
        schema_name = self.schema_resource.get("name", "page_navigator_schema")
        schema_content = self.schema_resource.get("content", "No schema available")
        return f"{self.tool_set_description}\n\n{schema_name}:\n{schema_content}"
    
    def get_resources(self, mcp: FastMCP) -> List[Callable]:
        """Register and return Page Navigation resources"""
        resource_definitions = [
            ResourceDefinition(
                name="page_navigator_schema",
                uri="pagenavigation://resource/schema",
                handler=self.page_navigator_resource_schema,
            )
        ]
        return super().get_resources(mcp, resource_definitions)

    @property
    def tool_set_description(self):
        return "Tools to convert natural language queries into URL query strings for page navigation based on a defined schema."

async def run_benchmark():
    rag_source = PageNavigationRAGSource()

    TEST_CASES = [
        {
            "query": "Events for MMSI 12345678",
            "ideal": "https://example.com/events?MMSI=12345678",
        },
        {
            "query": "Events in London that are not dark_ship",
            "ideal": "https://example.com/events?city=London&event_type=!=dark_ship",
        },
        {
            "query": "Events starting between 2024-12-01 and 2024-12-05 (both inclusive)",
            "ideal": "https://example.com/events?start_timestamp=>=2024-12-01T00:00:00Z&start_timestamp=<=2024-12-05T23:59:59Z",
        },
        {
            "query": "Vessels with MMSI with MMSI 44050403",
            "ideal": "https://example.com/events?MMSI=44050403",
        },
        {
            "query": "Singapore map",
            "ideal": "https://example.com/map?city=Singapore",
        },
    ]

    print(f"{'='*100}")
    print(f"{'QUERY BENCHMARK':^100}")
    print(f"{'='*100}\n")

    for test in TEST_CASES:
        query = test["query"]
        ideal_url = test["ideal"]

        # Call the LLM
        result = await rag_source.generate_full_url(query)

        # Calculate generated path (URL minus base_url)
        generated_url = result.get("url", "")

        # Print Comparison
        status = "✅ PASS" if generated_url == ideal_url else "❌ FAIL"

        print(f"TEST: {query}")
        print(f"STATUS: {status}")
        print(f"REASONING: {result.get('reasoning')}")
        print(f"IDEAL:     {ideal_url}")
        print(f"GENERATED: {generated_url}")
        print("-" * 100)


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(run_benchmark())
