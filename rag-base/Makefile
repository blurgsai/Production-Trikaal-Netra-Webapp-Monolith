# Define variables for repeated commands
VENV = ./.venv/bin/activate
PYTHON = ./.venv/bin/python
DC_CMD = docker compose -f docker-compose.source.yaml -f docker-compose.yaml

# ============================================================================
# CONFIG SELECTION - Single source of truth for all deployment methods
# ============================================================================
# Usage: make tool-server CONFIG_YAML_PATH=page_nav.yaml
# Default: page_nav.yaml
# Path is automatically prepended with rag_configs/
CONFIG_YAML_NAME = new_compose_config.yaml
CONFIG_YAML_PATH_FULL := ./rag_configs/$(CONFIG_YAML_NAME)

.PHONY: infra tool-server api test-ui config docs stop \
        docker-infra docker-tool-server docker-api docker-test-ui docker-config \
        docker-stop docker-logs docker-logs-service docker-health docker-clean build-all help

# ============================================================================
# DEPENDENCY EXPORT LOGIC (Automatic Sync)
# ============================================================================

# Pattern rule: Automatically exports requirements if pyproject.toml changes or if the .txt is missing.
requirements/requirements-%.txt: pyproject.toml
	@mkdir -p requirements
	@echo "Updating dependencies for $*..."
	uv export --group $* --no-hashes --no-emit-project -o $@

# Master list of all requirement files needed for full Docker builds
REQ_FILES = requirements/requirements-tool-server.txt \
            requirements/requirements-api.txt \
            requirements/requirements-chat-app.txt \
            requirements/requirements-config-generation.txt

# ============================================================================
# NATIVE DEVELOPMENT WORKFLOW (Local Python environment)
# ============================================================================

# 1. Start infrastructure only (mongo, clickhouse, chroma, ollama)

OLLAMA_MODEL_NAME ?= qwen3-vl:2b
OLLAMA_EMBED_MODEL ?= qwen3-embedding:0.6b


# ADD THIS: Detect current User and Group ID
USER_ID := $(shell id -u)
GROUP_ID := $(shell id -g)
DOCKER_VOLUMES_DIR := ./docker_volumes

# ============================================================================
# PRE-FLIGHT SANITIZATION
# ============================================================================

# This ensures folders exist, have correct permissions, and ports are clear
sanitize:
	@echo "Fixing permissions for $(DOCKER_VOLUMES_DIR)..."
	@mkdir -p $(DOCKER_VOLUMES_DIR)
	@sudo chown -R $(USER_ID):$(GROUP_ID) $(DOCKER_VOLUMES_DIR)
	@sudo chmod -R 775 $(DOCKER_VOLUMES_DIR)
	@echo "Sanitization complete."



infra: sanitize
	$(DC_CMD) --profile infra up -d
	@echo "Waiting for Ollama to be ready..."
	@until docker exec rag_ollama_service ollama list > /dev/null 2>&1; do \
		echo "Ollama is booting up..."; \
		sleep 2; \
	done
	@echo "Pulling LLM: $(OLLAMA_MODEL_NAME)..."
	@docker exec rag_ollama_service ollama pull $(OLLAMA_MODEL_NAME)
	@echo "Pulling Embedding Model: $(OLLAMA_EMBED_MODEL)..."
	@docker exec rag_ollama_service ollama pull $(OLLAMA_EMBED_MODEL)
	@echo "Infrastructure is ready and models are loaded."


# 2. Start tool server (requires infra + synced requirements)
tool-server: requirements/requirements-tool-server.txt infra
	@echo "Starting tool-server locally with CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL)..."
	@sleep 5
	. $(VENV) && export CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL) && $(PYTHON) ./run_server.py &
	@sleep 2

# 3. Start API (requires tool-server + synced requirements)
api: requirements/requirements-api.txt tool-server
	@echo "Starting API locally..."
	. $(VENV) && $(PYTHON) ./api.py &
	@sleep 3

# 4. Start chat UI (requires api + synced requirements, runs in foreground)
test-ui: requirements/requirements-chat-app.txt api
	@echo "Starting Streamlit chat app..."
	. $(VENV) && streamlit run chat_app.py

# 5. Config generation app (requires infra + synced requirements)
config: requirements/requirements-config-generation.txt infra
	@echo "Starting config generation app..."
	. $(VENV) && streamlit run config_app.py

# 6. Documentation server
docs:
	@echo "Starting Zensical documentation server..."
	. $(VENV) && zensical serve

# 7. Clean up
stop:
	$(DC_CMD) --profile infra --profile tool-server --profile api --profile test-ui --profile config down
	pkill -f "python ./run_server.py" || true
	pkill -f "python ./api.py" || true
	pkill -f "streamlit" || true

# ============================================================================
# CONTAINERIZED WORKFLOW (Docker-based)
# ============================================================================

# Build all Docker images (requires all requirement files to be synced first)
build-all: $(REQ_FILES)
	$(DC_CMD) build tool-server api chat-app config-app

# Stage 1: Start infrastructure only (mongo, clickhouse, chroma, ollama)
docker-infra: sanitize
	$(DC_CMD) --profile infra up -d
	@echo "Waiting for infrastructure to be healthy..."
	@sleep 5

# Stage 2: Start tool server (includes infra + synced requirements)
docker-tool-server: requirements/requirements-tool-server.txt sanitize
	@echo "Starting tool-server with CONFIG_YAML_PATH=$(CONFIG_YAML_PATH)..."
	# Passing the variable BEFORE the command ensures it's in the environment
	CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL) $(DC_CMD) --profile tool-server up -d
	@echo "Waiting for tool-server to be ready..."
	@sleep 3
    
# Stage 3: Start API (includes tool-server + synced requirements)
docker-api: requirements/requirements-api.txt
	@echo "Starting API container with CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL)..."
	CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL) $(DC_CMD) --profile api up -d
	@echo "Waiting for API to be ready..."
	@sleep 3

# Stage 4: Start full stack with chat UI (includes api + synced requirements)
docker-test-ui: requirements/requirements-chat-app.txt
	@echo "Starting full stack with CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL)..."
	CONFIG_YAML_PATH=$(CONFIG_YAML_PATH_FULL) $(DC_CMD) --profile test-ui up chat-app

# Stage 5: Start config app (minimal: ollama + chroma + config-app + synced requirements)
docker-config: requirements/requirements-config-generation.txt
	$(DC_CMD) --profile config up config-app

# Stop all containers
docker-stop:
	$(DC_CMD) --profile infra --profile tool-server --profile api --profile test-ui --profile config down

# Clean up all containers, images, and volumes
docker-clean: docker-stop
	$(DC_CMD) down -v
	docker rmi $$(docker images --filter=reference='**/mcp-tool-server' -q) 2>/dev/null || true
	docker rmi $$(docker images --filter=reference='**/chat-api' -q) 2>/dev/null || true
	docker rmi $$(docker images --filter=reference='**/chat-ui' -q) 2>/dev/null || true
	docker rmi $$(docker images --filter=reference='**/config-generator' -q) 2>/dev/null || true

# View logs from all services
docker-logs:
	$(DC_CMD) logs -f

# View logs from specific service (usage: make docker-logs-service SERVICE=tool-server)
docker-logs-service:
	$(DC_CMD) logs -f $(SERVICE)

# Health check - verify all services are running
docker-health:
	@echo "Checking infrastructure..."
	@$(DC_CMD) ps | grep -E "chroma|clickhouse|mongo|ollama"
	@echo "\nChecking services..."
	@$(DC_CMD) ps | grep -E "tool-server|api"
	@echo "\nChecking UIs..."
	@$(DC_CMD) ps | grep -E "chat-app|config-app"

# ============================================================================
# QUICK REFERENCE
# ============================================================================
help:
	@echo ""
	@echo "==============================================="
	@echo "NATIVE DEVELOPMENT (Local Python + Docker infra)"
	@echo "==============================================="
	@echo "  make infra       - Start infrastructure (mongo, clickhouse, chroma, ollama)"
	@echo "  make tool-server - Start tool-server locally (requires infra)"
	@echo "  make api         - Start API locally (requires tool-server)"
	@echo "  make test-ui     - Start chat UI locally (requires api, interactive)"
	@echo "  make config      - Start config app locally (requires infra)"
	@echo "  make docs        - Start Zensical documentation server"
	@echo "  make stop        - Stop all services"
	@echo ""
	@echo "==============================================="
	@echo "FULL DOCKER (All containerized)"
	@echo "==============================================="
	@echo "  make docker-infra       - Start infrastructure (mongo, clickhouse, chroma, ollama)"
	@echo "  make docker-tool-server - Start tool-server container (includes infra)"
	@echo "  make docker-api         - Start API container (includes tool-server)"
	@echo "  make docker-test-ui     - Start full stack with chat UI (interactive)"
	@echo "  make docker-config      - Start config app container (ollama + chroma only)"
	@echo "  make docker-stop        - Stop all containers"
	@echo ""
	@echo "==============================================="
	@echo "CONFIG SELECTION"
	@echo "==============================================="
	@echo "  All targets support CONFIG_YAML_PATH parameter (default: page_nav.yaml)"
	@echo "  Path is relative to rag_configs/"
	@echo ""
	@echo "  Examples:"
	@echo "    make tool-server                              # Uses page_nav.yaml"
	@echo "    make tool-server CONFIG_YAML_PATH=analytics.yaml"
	@echo "    make docker-test-ui CONFIG_YAML_PATH=full-stack.yaml"
	@echo ""
	@echo "==============================================="
	@echo "UTILITIES"
	@echo "==============================================="
	@echo "  make build-all          - Build all Docker images"
	@echo "  make docker-logs        - View logs from all services"
	@echo "  make docker-logs-service SERVICE=<name> - View specific service logs"
	@echo "  make docker-health      - Check service health"
	@echo "  make docker-clean       - Remove containers, images, volumes"
	@echo ""