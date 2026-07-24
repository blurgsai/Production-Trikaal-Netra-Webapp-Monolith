#!/bin/bash
set -e

# Configuration
PROJECT_ID="pivotal-sonar-462710-d2"
REGION="asia-south1"
REPO_NAME="trident-chatbot-api"
INSTANCE_NAME="trident-chatbot-instance"
ZONE="asia-south1-c"
REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "=== Building and Pushing Docker Images to Artifact Registry ==="

# Build and tag images
echo "Building chroma image..."
docker build -f dockerfiles/Dockerfile.chroma -t ${REGISTRY_URL}/chroma:latest .

echo "Building tool-server image..."
docker build -f dockerfiles/Dockerfile.tool-server -t ${REGISTRY_URL}/tool-server:latest .

echo "Building api image..."
docker build -f dockerfiles/Dockerfile.api -t ${REGISTRY_URL}/api:latest .

echo "Building chat-app image..."
docker build -f dockerfiles/Dockerfile.chat-app -t ${REGISTRY_URL}/chat-app:latest .

echo "Building config-app image..."
docker build -f dockerfiles/Dockerfile.config-generation -t ${REGISTRY_URL}/config-app:latest .

# Push images to Artifact Registry
echo "Pushing images to Artifact Registry..."
docker push ${REGISTRY_URL}/chroma:latest
docker push ${REGISTRY_URL}/tool-server:latest
docker push ${REGISTRY_URL}/api:latest
docker push ${REGISTRY_URL}/chat-app:latest
docker push ${REGISTRY_URL}/config-app:latest

echo "=== Deploying to GCE Instance ==="

# Copy necessary files to instance
echo "Copying deployment files to instance..."
gcloud compute scp --zone=${ZONE} \
  docker-compose.prod.yaml \
  .env \
  ${INSTANCE_NAME}:~/

gcloud compute scp --zone=${ZONE} --recurse \
  docker_volumes \
  ${INSTANCE_NAME}:~/

# Deploy on instance
echo "Deploying on GCE instance..."
gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command="
  # Configure Docker for Artifact Registry
  gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
  
  # Create necessary directories
  mkdir -p docker_volumes/{logs,chroma,mongo,ollama,clickhouse,rag_configs}
  
  # Pull images
  docker pull ${REGISTRY_URL}/chroma:latest
  docker pull ${REGISTRY_URL}/tool-server:latest
  docker pull ${REGISTRY_URL}/api:latest
  docker pull ${REGISTRY_URL}/chat-app:latest
  docker pull ${REGISTRY_URL}/config-app:latest
  docker pull mongo:7
  docker pull ollama/ollama
  docker pull clickhouse/clickhouse-server:latest
  
  # Stop existing containers
  docker compose -f docker-compose.prod.yaml down || true
  
  # Start services
  docker compose -f docker-compose.prod.yaml up -d
  
  # Show status
  docker compose -f docker-compose.prod.yaml ps
"

# Get instance IP
INSTANCE_IP=$(gcloud compute instances describe ${INSTANCE_NAME} --zone=${ZONE} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "=== Deployment Complete ==="
echo "Instance IP: ${INSTANCE_IP}"
echo "API: http://${INSTANCE_IP}:8000"
echo "Chat UI: http://${INSTANCE_IP}:8501"
echo "Config Generator: http://${INSTANCE_IP}:8502"
echo "Tool Server: http://${INSTANCE_IP}:5000"
echo ""
echo "To check logs: gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command='docker compose -f docker-compose.prod.yaml logs -f'"
