import asyncio
import json
import logging
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
from mcp.server.fastmcp import FastMCP
from datetime import datetime, timezone
# Setup logging to see output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Initialize FastMCP server
mcp = FastMCP("DatabaseServer")

# Mock database for demonstration
MOCK_DB = {
    "123":{"id": "123", "name": "Project Blueprint", "status": "Draft"},
    # "456":{"id": "456", "name": "User Analytics", "status": "Active"},
}


@mcp.resource("info://about")
def get_server_info() -> str:
    """Returns static metadata about this MCP server."""
    return (
        f"System Monitoring MCP Server v1.0. Active since {datetime.now(timezone.utc)}"
    )

# 2. Define the MCP Resource (How LLMs read your data)
@mcp.resource("db://resources")
async def get_db_resource() -> str:
    """Fetches a resource raw data from the database."""
    return json.dumps(MOCK_DB,indent=4)

@mcp.custom_route('/get_info', methods=["GET"])
async def get_db_info(request):
    """Returns the status of a resource by its ID."""
    resource_id = request.query_params.get("resource_id")
    if not resource_id:
        return JSONResponse(content={"status": "error", "message": "Missing resource_id"}, status_code=400)
    resource = MOCK_DB.get(resource_id)
    if not resource:
        return JSONResponse(content={"status": "error", "message": "Resource not found"}, status_code=404)
    return JSONResponse(content={"resource_id": resource_id, "status": resource["status"]})

# 3. Custom Webhook Endpoint using mcp.custom_route
@mcp.custom_route("/webhooks/db-change", methods=["POST"])
async def handle_db_webhook(request):
    """
    This endpoint is hit by your database trigger or external backend
    whenever a row changes.
    """
    try:
        # FastMCP custom routes receive a standard Starlette Request object
        payload = await request.json()
        resource_id = payload.get("resource_id")

        if not resource_id:
            return JSONResponse(content={"status": "error", "message": "Missing resource_id"},
                status_code=400,
            )

        if resource_id not in MOCK_DB:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Resource not tracked in server",
                },
                status_code=404,
            )

        MOCK_DB[resource_id]['status'] = payload.get('status','empty_payload')

        return JSONResponse(content={"status": "success", "notified_uri": "db://resources"})

    except Exception as e:
        logger.error(f"Failed to handle DB webhook trigger: {e}", exc_info=True)
        return JSONResponse(
            content={"status": "error", "message": str(e)}, status_code=500
        )


if __name__ == "__main__":
    # Run everything via the streamable-http transport on port 8000
    # Your custom routes (/webhooks/db-change) are seamlessly hosted side-by-side
    mcp.run(transport="streamable-http")


# Test with:
# curl -X POST http://localhost:8000/webhooks/db-change -H "Content-Type: application/json" -d '{"resource_id": "123", "action": "UPDATE","status":"Active"}'