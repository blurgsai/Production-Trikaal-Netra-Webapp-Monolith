# Trident Chatbot API - Deployment Guide

This guide provides step-by-step instructions for deploying the Trident Chatbot API to a new GCP instance.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker installed locally
- Access to the project repository
- MongoDB instance (external or managed)
- Google API Key for Gemini

---

## Deployment Architecture

**Components:**
- GCE Instance (e2-medium or higher)
- Artifact Registry (Docker image repository)
- External MongoDB (for chat data)
- Network: `host` mode for all containers
- Firewall: Open ports 8000, 8501, 5000, 8502

**Services Deployed:**
- API (Port 8000) - FastAPI backend
- Chat UI (Port 8501) - Streamlit interface
- Tool Server (Port 5000) - MCP server
- Config Generator (Port 8502) - Configuration UI
- Ollama (Port 11434) - Local LLM service
- ClickHouse (Ports 8123, 9000) - Analytics database

---

## Step 1: Configure Environment Variables

Create or update `.env` file with your configuration:

```bash
# MongoDB Configuration (External)
MONGO_HOST=YOUR_MONGO_HOST
MONGO_PORT=27017
MONGO_USERNAME=YOUR_MONGO_USER
MONGO_PASSWORD=YOUR_MONGO_PASSWORD
MONGO_AUTH_SOURCE=admin
MONGO_DB_NAME=dev

# Google API Configuration
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GEMINI_MODEL_NAME=gemini-2.5-flash-lite

# Ollama Configuration
OLLAMA_MODEL_NAME=qwen3-vl:2b
OLLAMA_BASE_URL=http://localhost:11434

# ClickHouse Configuration
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=YOUR_CLICKHOUSE_PASSWORD

# JWT Configuration
JWT_SECRET=YOUR_JWT_SECRET_KEY
JWT_ALGORITHM=HS256

# Memory Configuration
MEMORY_WINDOW_SIZE=8
MEMORY_SUMMARY_MODEL=gemini-2.5-flash-lite
```

---

## Step 2: Set GCP Project Variables

```bash
# Set your GCP project ID
export PROJECT_ID="your-project-id"
export REGION="asia-south1"
export ZONE="asia-south1-c"
export INSTANCE_NAME="trident-chatbot-instance"
export REPO_NAME="trident-chatbot-api"
```

---

## Step 3: Create Artifact Registry Repository

```bash
# Create Docker repository in Artifact Registry
gcloud artifacts repositories create ${REPO_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Docker repository for Trident Chatbot API"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## Step 4: Build and Push Docker Images

```bash
# Set registry URL
export REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# Build images
echo "Building Docker images..."
docker build -f dockerfiles/Dockerfile.tool-server -t ${REGISTRY_URL}/tool-server:latest .
docker build -f dockerfiles/Dockerfile.api -t ${REGISTRY_URL}/api:latest .
docker build -f dockerfiles/Dockerfile.chat-app -t ${REGISTRY_URL}/chat-app:latest .
docker build -f dockerfiles/Dockerfile.config-generation -t ${REGISTRY_URL}/config-app:latest .

# Push images to Artifact Registry
echo "Pushing images to Artifact Registry..."
docker push ${REGISTRY_URL}/tool-server:latest
docker push ${REGISTRY_URL}/api:latest
docker push ${REGISTRY_URL}/chat-app:latest
docker push ${REGISTRY_URL}/config-app:latest

echo "Images successfully pushed to Artifact Registry"
```

---

## Step 5: Create Firewall Rules

```bash
# Create firewall rule for application ports
gcloud compute firewall-rules create trident-chatbot-allow-http \
  --allow=tcp:8000,tcp:8501,tcp:5000,tcp:8502,tcp:8080 \
  --source-ranges=0.0.0.0/0 \
  --description="Allow HTTP traffic for Trident Chatbot API services" \
  --direction=INGRESS
```

---

## Step 6: Create GCE Instance

```bash
# Create compute instance
gcloud compute instances create ${INSTANCE_NAME} \
  --zone=${ZONE} \
  --machine-type=e2-medium \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-standard \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker
systemctl enable docker
usermod -aG docker $USER'

echo "Instance created successfully"
```

---

## Step 7: Grant Artifact Registry Permissions

```bash
# Get the service account email
SERVICE_ACCOUNT=$(gcloud compute instances describe ${INSTANCE_NAME} \
  --zone=${ZONE} \
  --format='get(serviceAccounts[0].email)')

# Grant Artifact Registry reader role to the instance
gcloud artifacts repositories add-iam-policy-binding ${REPO_NAME} \
  --location=${REGION} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.reader"

echo "Permissions granted to instance service account"
```

---

## Step 8: Prepare Production Docker Compose File

Update `docker-compose.prod.yaml` with your configuration:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-csv-ingest
    network_mode: host
    environment:
      CLICKHOUSE_USER: default
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
    volumes:
      - ./docker_volumes/clickhouse/init_db:/docker-entrypoint-initdb.d
      - ./docker_volumes/clickhouse/sensor_data.csv:/var/lib/clickhouse/user_files/sensor_data.csv
    restart: unless-stopped

  ollama:
    image: ollama/ollama
    container_name: rag_ollama_service
    network_mode: host
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    volumes:
      - ./docker_volumes/ollama:/root/.ollama
    restart: unless-stopped
  
  tool-server:
    image: ${REGISTRY_URL}/tool-server:latest
    container_name: mcp-tool-server
    network_mode: host
    environment:
      MCP_SERVER_PORT: 5000
      CONFIG_YAML_PATH: /app/proper_config.yaml
      MONGO_HOST: ${MONGO_HOST}
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      MONGO_DB_NAME: dev
      CLICKHOUSE_HOST: http://localhost:8123
      CLICKHOUSE_USER: default
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
      CHROMA_HOST: localhost
      CHROMA_PORT: 8080
      OLLAMA_BASE_URL: http://localhost:11434
    volumes:
      - ./docker_volumes/logs:/app/logs
      - ./rag_configs/page_nav.yaml:/app/proper_config.yaml
      - ./docker_volumes/clickhouse:/app/clickhouse_data
    restart: unless-stopped

  api:
    image: ${REGISTRY_URL}/api:latest
    container_name: chat-api
    network_mode: host
    environment:
      MCP_SERVER_URL: http://localhost:5000/mcp
      SERVICE_API_URL: http://localhost:8000
      MONGO_HOST: ${MONGO_HOST}
      MONGO_PORT: 27017
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      MONGO_AUTH_SOURCE: admin
      MONGO_DB_NAME: dev
      MONGO_URI: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:27017
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      GEMINI_MODEL_NAME: ${GEMINI_MODEL_NAME}
      OLLAMA_MODEL_NAME: ${OLLAMA_MODEL_NAME}
      OLLAMA_BASE_URL: http://localhost:11434
      MEMORY_WINDOW_SIZE: ${MEMORY_WINDOW_SIZE}
      MEMORY_SUMMARY_MODEL: ${MEMORY_SUMMARY_MODEL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_ALGORITHM: ${JWT_ALGORITHM}
    volumes:
      - ./docker_volumes/logs:/app/logs
    restart: unless-stopped

  chat-app:
    image: ${REGISTRY_URL}/chat-app:latest
    container_name: chat-ui
    network_mode: host
    environment:
      SERVICE_API_URL: http://localhost:8000
      MONGO_HOST: ${MONGO_HOST}
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      MONGO_DB_NAME: dev
    volumes:
      - ./docker_volumes/logs:/app/logs
    restart: unless-stopped

  config-app:
    image: ${REGISTRY_URL}/config-app:latest
    container_name: config-generator
    network_mode: host
    environment:
      CHROMA_HOST: localhost
      CHROMA_PORT: 8080
      OLLAMA_BASE_URL: http://localhost:11434
      MONGO_HOST: ${MONGO_HOST}
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      MONGO_DB_NAME: dev
    volumes:
      - ./docker_volumes/logs:/app/logs
    restart: unless-stopped
```

---

## Step 9: Deploy to GCE Instance

```bash
# Wait for instance to be ready
sleep 30

# Copy deployment files to instance
echo "Copying files to instance..."
gcloud compute scp --zone=${ZONE} docker-compose.prod.yaml ${INSTANCE_NAME}:~/
gcloud compute scp --zone=${ZONE} .env ${INSTANCE_NAME}:~/
gcloud compute scp --zone=${ZONE} --recurse docker_volumes/rag_configs ${INSTANCE_NAME}:~/docker_volumes/

# SSH into instance and deploy
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command="
  # Configure Docker for Artifact Registry
  gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
  
  # Create necessary directories
  mkdir -p docker_volumes/{logs,ollama,clickhouse/init_db,rag_configs}
  
  # Pull images
  sudo -E docker pull ${REGISTRY_URL}/tool-server:latest
  sudo -E docker pull ${REGISTRY_URL}/api:latest
  sudo -E docker pull ${REGISTRY_URL}/chat-app:latest
  sudo -E docker pull ${REGISTRY_URL}/config-app:latest
  sudo docker pull mongo:7
  sudo docker pull ollama/ollama
  sudo docker pull clickhouse/clickhouse-server:latest
  
  # Start services
  sudo -E docker compose -f docker-compose.prod.yaml up -d
  
  # Wait for services to start
  sleep 15
  
  # Show status
  sudo docker compose -f docker-compose.prod.yaml ps
"
```

---

## Step 10: Verify Deployment

```bash
# Get instance external IP
INSTANCE_IP=$(gcloud compute instances describe ${INSTANCE_NAME} \
  --zone=${ZONE} \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Instance IP: ${INSTANCE_IP}"

# Test health endpoint
curl -s http://${INSTANCE_IP}:8000/health | jq .

# Expected output:
# {
#   "status": "ok",
#   "llm_client_connected": true
# }
```

---

## Step 11: Post-Deployment Configuration

### Create Initial Collections (if needed)

```bash
# SSH into instance
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}

# Access MongoDB and create indexes
sudo docker exec chat-api python -c "
from core.clients.chat_db_client import ChatMongoClient
client = ChatMongoClient()
print('MongoDB connected successfully')
print('Collections:', client.db.list_collection_names())
"
```

### Download Ollama Models (if using local LLM)

```bash
# SSH into instance
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}

# Pull Ollama model
sudo docker exec rag_ollama_service ollama pull qwen3-vl:2b
```

---

## Management Commands

### View Logs

```bash
# SSH into instance
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}

# View all logs
sudo docker compose -f docker-compose.prod.yaml logs -f

# View specific service logs
sudo docker logs chat-api -f
sudo docker logs chat-ui -f
sudo docker logs mcp-tool-server -f
```

### Restart Services

```bash
# Restart all services
sudo docker compose -f docker-compose.prod.yaml restart

# Restart specific service
sudo docker compose -f docker-compose.prod.yaml restart api
```

### Update Deployment

```bash
# 1. Build and push new images locally
docker build -f dockerfiles/Dockerfile.api -t ${REGISTRY_URL}/api:latest .
docker push ${REGISTRY_URL}/api:latest

# 2. SSH into instance and update
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command="
  sudo -E docker pull ${REGISTRY_URL}/api:latest
  sudo docker compose -f docker-compose.prod.yaml up -d --force-recreate api
"
```

### Stop Services

```bash
# Stop all services
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command="
  sudo docker compose -f docker-compose.prod.yaml down
"
```

### Clean Up Resources

```bash
# Delete instance
gcloud compute instances delete ${INSTANCE_NAME} --zone=${ZONE}

# Delete firewall rule
gcloud compute firewall-rules delete trident-chatbot-allow-http

# Delete Artifact Registry repository
gcloud artifacts repositories delete ${REPO_NAME} --location=${REGION}
```

---

## Troubleshooting

### Port Conflicts

If you encounter "address already in use" errors:

```bash
# Check what's using the port
sudo ss -tlnp | grep :8000

# Stop the conflicting service
sudo docker stop <container-name>

# Or remove orphan containers
sudo docker compose -f docker-compose.prod.yaml down --remove-orphans
```

### Container Restart Loop

```bash
# Check container logs
sudo docker logs <container-name> --tail 50

# Common issues:
# - Missing environment variables
# - MongoDB connection failure
# - Port conflicts
# - Missing volume directories
```

### MongoDB Connection Issues

```bash
# Test MongoDB connection from instance
sudo docker exec chat-api python -c "
from pymongo import MongoClient
import os
uri = os.getenv('MONGO_URI')
client = MongoClient(uri)
print(client.admin.command('ping'))
"
```

### API Not Responding

```bash
# Check if API is running
sudo docker ps | grep chat-api

# Check API logs
sudo docker logs chat-api --tail 50

# Test health endpoint locally
curl http://localhost:8000/health

# Check firewall rules
gcloud compute firewall-rules list | grep trident
```

---

## Security Considerations

1. **JWT Secret**: Use a strong, random JWT secret in production
2. **MongoDB**: Use strong passwords and enable authentication
3. **Firewall**: Restrict source IP ranges if possible
4. **HTTPS**: Consider adding a reverse proxy (nginx) with SSL/TLS
5. **API Keys**: Never commit API keys to version control
6. **Service Account**: Use least-privilege IAM roles

---

## Monitoring

### Check Service Health

```bash
# API Health
curl http://${INSTANCE_IP}:8000/health

# Check all container statuses
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command="
  sudo docker compose -f docker-compose.prod.yaml ps
"
```

### Monitor Resource Usage

```bash
# SSH into instance
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}

# Check Docker stats
sudo docker stats

# Check disk usage
df -h

# Check memory usage
free -h
```

---

## Backup and Recovery

### Backup MongoDB Data

```bash
# Backup from external MongoDB
mongodump --uri="mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:27017/dev" \
  --out=/backup/$(date +%Y%m%d)
```

### Backup Docker Volumes

```bash
# SSH into instance
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}

# Backup volumes
sudo tar -czf /tmp/docker_volumes_backup.tar.gz docker_volumes/

# Download backup
exit
gcloud compute scp ${INSTANCE_NAME}:/tmp/docker_volumes_backup.tar.gz . --zone=${ZONE}
```

---

## Cost Optimization

1. **Instance Type**: Use `e2-medium` for development, `e2-standard-2` for production
2. **Preemptible Instances**: Consider for non-critical workloads (60-90% cost savings)
3. **Disk Type**: Use `pd-standard` instead of `pd-ssd` for logs and non-critical data
4. **Auto-shutdown**: Implement scheduled shutdown for dev environments
5. **Monitoring**: Use GCP monitoring to track costs

---

## Production Checklist

- [ ] Environment variables configured in `.env`
- [ ] MongoDB instance accessible and secured
- [ ] Google API key obtained and configured
- [ ] Artifact Registry repository created
- [ ] Docker images built and pushed
- [ ] GCE instance created with appropriate machine type
- [ ] Firewall rules configured
- [ ] IAM permissions granted to service account
- [ ] Docker Compose file updated with correct image URLs
- [ ] Services deployed and running
- [ ] Health endpoints responding
- [ ] SSL/TLS configured (if using HTTPS)
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Documentation updated with instance details

---

## Support

For issues or questions:
- Check logs: `sudo docker compose -f docker-compose.prod.yaml logs -f`
- Review this deployment guide
- Contact the development team
- Refer to API documentation: `API_DOCUMENTATION.md`

---

## Appendix: Quick Reference

### Instance Details Template

```
Instance Name: trident-chatbot-instance
Region: asia-south1
Zone: asia-south1-c
Machine Type: e2-medium
External IP: <INSTANCE_IP>
Internal IP: <INTERNAL_IP>

Endpoints:
- API: http://<INSTANCE_IP>:8000
- Chat UI: http://<INSTANCE_IP>:8501
- Config Generator: http://<INSTANCE_IP>:8502
- Tool Server: http://<INSTANCE_IP>:5000

Database:
- MongoDB: <MONGO_HOST>:27017
- Database: dev
- Collections: chat_sessions, chat_messages, users
```

### Environment Variables Template

```bash
# Copy this template and fill in your values
export PROJECT_ID="your-project-id"
export REGION="asia-south1"
export ZONE="asia-south1-c"
export INSTANCE_NAME="trident-chatbot-instance"
export REPO_NAME="trident-chatbot-api"
export MONGO_HOST="your-mongo-host"
export MONGO_USERNAME="your-mongo-user"
export MONGO_PASSWORD="your-mongo-password"
export GOOGLE_API_KEY="your-google-api-key"
export CLICKHOUSE_PASSWORD="your-clickhouse-password"
export JWT_SECRET="your-jwt-secret"
```
