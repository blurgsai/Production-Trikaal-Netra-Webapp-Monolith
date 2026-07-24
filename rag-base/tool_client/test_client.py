"""Test client for running all MCP tool tests"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime

from client import MCPClient


class MCPTestRunner:
    """Run comprehensive tests against MCP tools"""

    def __init__(self):
        self.client = MCPClient()
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "tests": []
        }
        self.failed_tests = {"failures": []}
        self.test_params_dir = Path(__file__).parent.parent / "tests" / "mcp_test_params"

    async def run_tests(self):
        """Run all tests by loading JSON and calling tools directly"""
        print("\n" + "="*80)
        print("MCP TOOLS TEST SUITE")
        print("="*80)
        
        # Load MCP server configuration
        config_path = Path(__file__).parent.parent / "mcp_server_entry.json"
        with open(config_path, "r") as f:
            config = json.load(f)
        
        mcp_server_url = config.get("url")
        print(f"\nConnecting to MCP server at {mcp_server_url}...")
        
        try:
            await self.client.connect_to_streamable_http_server(mcp_server_url)
            print("✓ Connected!\n")
        except Exception as e:
            print(f"✗ Failed to connect: {e}")
            return
        
        # Load and list available tools
        print("Loading available tools...")
        tools = await self.client.list_tools()
        print(f"✓ Loaded {len(self.client.tools_cache)} tools\n")
        
        # Load all tests from single JSON file
        all_tests = self._load_test_file("all_tests.json")
        if all_tests:
            # Separate MongoDB and ClickHouse tests
            mongo_tests = {k: v for k, v in all_tests.items() if k.startswith("mongo_")}
            clickhouse_tests = {k: v for k, v in all_tests.items() if k.startswith("clickhouse_")}
            
            if mongo_tests:
                await self._run_tests_from_json(mongo_tests, "MongoDB")
            
            if clickhouse_tests:
                await self._run_tests_from_json(clickhouse_tests, "ClickHouse")
        
        # Print summary
        self._print_summary()
        
        await self.client.cleanup()

    def _load_test_file(self, filename: str) -> dict:
        """Load test parameters from JSON file"""
        file_path = self.test_params_dir / filename
        if not file_path.exists():
            print(f"✗ Test file not found: {file_path}")
            return None
        
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"✗ Error loading {filename}: {e}")
            return None

    async def _run_tests_from_json(self, tests: dict, db_type: str):
        """Run tests by iterating through JSON structure"""
        print("\n" + "="*80)
        print(f"{db_type.upper()} TESTS")
        print("="*80)
        
        # Iterate through test categories using keys directly as tool names
        for tool_name, test_cases in tests.items():
            print(f"\n--- Tool: {tool_name} ---")
            
            # Run each test case for this tool
            for test in test_cases:
                await self._execute_test(tool_name, test)
        
        print(f"\n{db_type}: Completed")

    async def _execute_test(self, tool_name: str, test_case: dict):
        """Execute a single test case by calling the tool"""
        test_id = test_case.get("test_id", "unknown")
        test_name = test_case.get("name", "Unnamed test")
        description = test_case.get("description", "")
        
        # Extract tool parameters (exclude metadata fields)
        tool_args = {k: v for k, v in test_case.items() 
                     if k not in ("name", "description", "note", "expected_is_error", "test_id")}
        
        try:
            # Call the tool directly
            result = await self.client.call_tool(tool_name, tool_args)
            
            # Check if call was successful using isError attribute
            expected_error = test_case.get("expected_is_error", False)
            actual_error = result.get("isError") is True
            
            # Also check if content contains error-like information even if isError=False
            content = result.get("content", [])
            has_error_content = False
            if isinstance(content, list) and len(content) > 0:
                text_content = content[0].get("text", "") if isinstance(content[0], dict) else str(content[0])
                has_error_content = "error" in text_content.lower() or "exception" in text_content.lower()
            
            # Determine actual error state - consider both isError flag and error content
            if actual_error or has_error_content:
                actual_error = True
            
            if actual_error != expected_error:
                # Test failed - print details
                print(f"\n  ▶ {test_name}")
                if description:
                    print(f"    Description: {description}")
                
                self.results["failed"] += 1
                
                # Extract error message from content
                error_msg = "Unknown error"
                if isinstance(content, list) and len(content) > 0:
                    content_item = content[0]
                    if isinstance(content_item, dict):
                        error_msg = content_item.get("text", error_msg)
                    else:
                        error_msg = str(content_item)
                
                # Check if error originated from client side (safely handle None meta)
                meta = result.get("meta")
                if meta is None or not isinstance(meta, dict):
                    meta = {}
                origin = meta.get("origin", "server")
                origin_str = f" (origin: {origin})" if origin else ""
                
                status = "✗ FAIL"
                
                failure_entry = {
                    "test_id": test_id,
                    "tool": tool_name,
                    "test": test_name,
                    "description": description,
                    "status": "failed",
                    "expected_is_error": expected_error,
                    "actual_is_error": actual_error,
                    "error_message": error_msg,
                    "origin": origin,
                    "timestamp": datetime.now().isoformat()
                }
                
                self.results["tests"].append(failure_entry)
                self.failed_tests["failures"].append(failure_entry)
                
                print(f"    {status}{origin_str}")
                print(f"    Expected isError: {expected_error}, Got: {actual_error}")
                print(f"    Error: {error_msg}")
            else:
                # Test passed - no output, just record
                self.results["passed"] += 1
                
                self.results["tests"].append({
                    "test_id": test_id,
                    "tool": tool_name,
                    "test": test_name,
                    "status": "passed",
                    "timestamp": datetime.now().isoformat()
                })
        
        except Exception as e:
            # Print error details
            print(f"\n  ▶ {test_name}")
            if description:
                print(f"    Description: {description}")
            
            self.results["errors"] += 1
            error_msg = str(e)
            
            self.results["tests"].append({
                "test_id": test_id,
                "tool": tool_name,
                "test": test_name,
                "status": "error",
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            })
            
            print(f"    ⚠ ERROR: {error_msg}")

    def _print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total = self.results["passed"] + self.results["failed"] + self.results["errors"]
        
        print(f"\nTotal Tests:    {total}")
        print(f"Passed:         {self.results['passed']} ✓")
        print(f"Failed:         {self.results['failed']} ✗")
        print(f"Errors:         {self.results['errors']} ⚠")
        
        if total > 0:
            pass_rate = (self.results["passed"] / total) * 100
            print(f"\nPass Rate:      {pass_rate:.1f}%")
        
        # Save results to files
        results_file = Path(__file__).parent / "test_results.json"
        with open(results_file, "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nDetailed results saved to: {results_file}")
        
        # Save failed tests to separate file
        if self.failed_tests["failures"]:
            failures_file = Path(__file__).parent / "test_failures.json"
            with open(failures_file, "w") as f:
                json.dump(self.failed_tests, f, indent=2)
            print(f"Failed tests saved to: {failures_file}")
        
        print("="*80 + "\n")


async def main():
    """Main entry point"""
    runner = MCPTestRunner()
    try:
        await runner.run_tests()
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
