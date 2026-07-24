import asyncio
from pprint import pprint

from tool_client.client import MCPClient


async def main():
    client = MCPClient()
    try:
        await client.connect_to_streamable_http_server("http://localhost:8000/mcp")
        
        # List available tools first
        await client.list_tools()
        
        # Test 1: Server-side error - invalid pipeline JSON
        print("\n=== Test 1: Server-side error (invalid JSON) ===")
        result = await client.call_tool(
            "mongo_aggregate",
            {"database": "trident-satint-dev", "collection": "sub_tasks", "pipeline": "[{invalid json not proper}]"},
        )
        print("Result:", result)
        print("IsError:", result.get("isError"))
        print("Meta:", result.get("meta"))
        
        # Test 2: Client-side error - calling non-existent tool
        print("\n=== Test 2: Client-side error (non-existent tool) ===")
        result = await client.call_tool(
            "non_existent_tool_xyz",
            {"some_arg": "value"},
        )
        print("Result:")
        pprint(result)

    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())