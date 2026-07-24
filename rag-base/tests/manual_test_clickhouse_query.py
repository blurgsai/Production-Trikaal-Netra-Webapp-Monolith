#!/usr/bin/env python
"""Test script for ClickHouse run_select_query tool"""

import asyncio
import sys
import os
from tool_server.rag_sources.clickhouse import ClickhouseRAGSource
from core.utils.logger import Logger

logger = Logger("test-clickhouse-query").get_logger()


async def test_clickhouse_query():
    """Test ClickHouse connection and run_select_query"""
    logger.info("=" * 60)
    logger.info("ClickHouse Query Test")
    logger.info("=" * 60)
    
    try:
        # Set config path to proper_config.yaml
        os.environ["CONFIG_YAML_PATH"] = "./proper_config.yaml"
        logger.info(f"CONFIG_YAML_PATH set to: {os.getenv('CONFIG_YAML_PATH')}")
        
        # Initialize ClickHouse RAG source
        logger.info("Initializing ClickhouseRAGSource...")
        source = ClickhouseRAGSource()
        
        if not source.client:
            logger.error("ClickHouse client is None - connection failed during init")
            return False
        
        logger.info("ClickHouse client initialized successfully")
        
        # Test query
        test_query = "select * from dlrl_ew.sensor_data"
        logger.info(f"Executing test query: {test_query}")
        
        result = await source.run_select_query_tool(query=test_query)
        
        logger.info(f"Query result type: {type(result)}")
        logger.info(f"Query result: {result}")
        
        if "error" in result:
            logger.error(f"Query returned error: {result['error']}")
            return False
        
        if "results" in result:
            logger.info(f"Query successful!")
            logger.info(f"Rows returned: {result.get('row_count', 0)}")
            logger.info(f"Columns: {result.get('columns', [])}")
            if result.get('results'):
                logger.info(f"First row: {result['results'][0]}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Test failed with exception: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    logger.info("Starting ClickHouse query test")
    success = asyncio.run(test_clickhouse_query())
    
    if success:
        logger.info("✓ Test PASSED")
        sys.exit(0)
    else:
        logger.error("✗ Test FAILED")
        sys.exit(1)
