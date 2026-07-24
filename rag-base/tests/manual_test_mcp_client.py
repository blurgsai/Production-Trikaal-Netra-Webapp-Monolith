import asyncio
import yaml
import httpx
from pathlib import Path
from tool_client.client import MCPClient
from dotenv import load_dotenv

load_dotenv()


async def check_server_health(url: str) -> bool:
    """Check if MCP server is responding"""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(url, follow_redirects=True)
            return response.status_code < 500
    except Exception as e:
        print(f"   ⚠️  Server health check failed: {e}")
        return False


async def main():
    server_url = "http://localhost:5000/mcp"
    
    print("\n" + "=" * 70)
    print("🔌 MCP Tool Server Filter Verification")
    print("=" * 70)
    
    # Check if server is running
    print(f"\n🔍 Checking server at {server_url}...")
    if not await check_server_health(server_url):
        print("❌ Server is not responding. Make sure services are running:")
        print("   make start-services")
        print("\n💡 Then check the logs:")
        print("   tail -f ./tool_server.log")
        return
    
    print("✅ Server is responding")
    
    # Load expected tools from config
    config_path = Path("./selected_tools_config.yaml")
    expected_tools = {}
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Extract expected tools per source
        for source in ['mongo', 'clickhouse', 'text_files']:
            if source in config:
                selected_tools = config[source].get('selected_tools', [])
                expected_tools[source] = [tool['name'] for tool in selected_tools]
    except Exception as e:
        print(f"❌ Failed to load config: {e}")
        return
    
    print("\n📋 Expected tools from config (selected_tools_config.yaml):")
    for source, tools in sorted(expected_tools.items()):
        if tools:
            print(f"   {source}: {tools}")
    
    # Connect to MCP server and get actual tools
    print("\n🔗 Connecting to MCP server...")
    
    client = None
    try:
        client = MCPClient()
        await client.connect_to_streamable_http_server(server_url)
        
        # List all tools from server
        tools_cache = await client.list_tools()
        
        print(f"✅ Connected! Found {len(tools_cache)} tool(s)")
        
        # Group actual tools by source prefix
        actual_tools = {}
        for tool_name in sorted(tools_cache.keys()):
            # Try to extract source from tool name
            if '_' in tool_name:
                source = '_'.join(tool_name.split('_')[:-1])  # Handle multi-word sources like text_files
            else:
                source = tool_name.split('_')[0]
            
            if source not in actual_tools:
                actual_tools[source] = []
            actual_tools[source].append(tool_name)
        
        print("\n📊 Actual tools from server:")
        for source in sorted(actual_tools.keys()):
            tools = actual_tools[source]
            print(f"   {source}: {tools}")
        
        # Compare expected vs actual
        print("\n" + "=" * 70)
        print("🔍 Filtering Verification Results:")
        print("=" * 70)
        
        all_match = True
        for source in sorted(set(expected_tools.keys()) | set(actual_tools.keys())):
            expected = sorted(expected_tools.get(source, []))
            actual = sorted(actual_tools.get(source, []))
            
            if expected == actual:
                status = "✅ PASS"
            else:
                status = "❌ FAIL"
                all_match = False
            
            print(f"\n{status} {source}:")
            print(f"   Expected: {expected}")
            print(f"   Actual:   {actual}")
            if expected != actual:
                extra = set(actual) - set(expected)
                missing = set(expected) - set(actual)
                if extra:
                    print(f"   Extra tools being exposed: {extra}")
                if missing:
                    print(f"   Missing tools: {missing}")
        
        print("\n" + "=" * 70)
        if all_match:
            print("✅ Tool filtering is working correctly!")
        else:
            print("❌ Tool filtering is NOT working - mismatch detected!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"❌ Error connecting: {e}")
        print("\nℹ️  Troubleshooting:")
        print("   1. Check if services are running: make start-services")
        print("   2. Check tool_server logs: tail -f ./tool_server.log")
        print("   3. Look for MONGO.get_tools(), CLICKHOUSE.get_tools() messages")
        print("   4. Verify MCP server is on port 5000")
    
    finally:
        if client:
            try:
                await client.cleanup()
            except Exception:
                # Suppress cleanup errors - they're often just context manager issues
                pass


if __name__ == "__main__":
    asyncio.run(main())