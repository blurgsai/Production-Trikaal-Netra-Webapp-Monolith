import clickhouse_connect
import os

# ClickHouse connection
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USERNAME = os.getenv("CLICKHOUSE_USERNAME", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")
CLICKHOUSE_DATABASE = os.getenv("CLICKHOUSE_DATABASE", "default")
CLICKHOUSE_TABLE = os.getenv("CLICKHOUSE_TABLE", "ais_processed_flat")

# Column mappings
TIMESTAMP_COLUMN = os.getenv("TIMESTAMP_COLUMN", "metadata_timestamp")
ID_COLUMN = os.getenv("ID_COLUMN", "vessel_id")
LAT_COLUMN = os.getenv("LAT_COLUMN", "lat")
LON_COLUMN = os.getenv("LON_COLUMN", "lon")
HEADING_COLUMN = os.getenv("HEADING_COLUMN", "heading")

# Connect with password from ClickHouse config
client = clickhouse_connect.get_client(
    host=CLICKHOUSE_HOST,
    port=CLICKHOUSE_PORT,
    username=CLICKHOUSE_USERNAME,
    password=CLICKHOUSE_PASSWORD
)

def get_client():
    """Get a new ClickHouse client instance for concurrent queries"""
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USERNAME,
        password=CLICKHOUSE_PASSWORD
    )

table_name = f"{CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}"