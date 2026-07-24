#!/bin/bash

# Load environment variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✓ Loaded .env variables"
else
    echo "✗ .env file not found"
    exit 1
fi

echo "   Pulling Ollama models..."
echo "  - Main model: $OLLAMA_MODEL_NAME"
echo "  - Embedding model: $OLLAMA_EMBED_MODEL"

# Start temporary Ollama container
docker run -d -v ./ollama_models:/root/.ollama --name ollama_temp ollama/ollama

echo " Waiting for Ollama to start..."
sleep 3

# Pull both models
echo " Pulling $OLLAMA_EMBED_MODEL..."
docker exec ollama_temp ollama pull $OLLAMA_EMBED_MODEL

echo " Pulling $OLLAMA_MODEL_NAME..."
docker exec ollama_temp ollama pull $OLLAMA_MODEL_NAME

# Cleanup
echo " Cleaning up..."
docker stop ollama_temp && docker rm ollama_temp

echo "✓ Done! Models pulled to ./ollama_models"