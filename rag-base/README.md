# POC-Omnisense-RAG-Base

## Quick Start

1. **Package Management**: Uses UV for Python dependency management
2. **Create Configuration**: Generate a config file using the Streamlit app
3. **Deployment Steps**:
   - Run ClickHouse and Chroma DB servers
   - Start MCP Server
   - Start Chat API
   - Test via Streamlit UI

## Documentation

### View Documentation Server

The project uses Zensical for documentation. To run the documentation server:

```bash
# Ensure you're in the virtual environment
source .venv/bin/activate

# Run the Zensical development server
zensical serve
```
