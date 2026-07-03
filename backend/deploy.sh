#!/bin/bash
set -e

VM_ZONE="us-central1-a"
VM_NAME="trikaal-vm"
PROJECT="pivotal-sonar-462710-d2"
ARTIFACT_REGISTRY="us-central1-docker.pkg.dev"
REPO="${ARTIFACT_REGISTRY}/${PROJECT}/trikaal"
IMAGE_NAME="trbackend"
IMAGE_TAG="latest"
FULL_IMAGE="${REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
ENV_FILE="$(pwd)/.env"
VM_ENV_PATH="/home/ansil/.env"

# ── Usage ──────────────────────────────────────────────────────────────────────
# ./deploy.sh              → full deploy (build image + push to registry + restart container)
# ./deploy.sh update-env   → copy .env to VM and restart container only (no rebuild)

if [ "${1}" = "update-env" ]; then
    echo "Copying .env to VM..."
    gcloud compute scp "$ENV_FILE" ${VM_NAME}:${VM_ENV_PATH} \
        --zone=${VM_ZONE} --project=${PROJECT}

    echo "Restarting container to apply new env vars..."
    gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} --project=${PROJECT} \
        --command="sudo docker restart trbackend"

    echo "Environment updated and container restarted."
    exit 0
fi

# ── Full deploy ────────────────────────────────────────────────────────────────

# Configure Docker authentication for Artifact Registry
echo "Configuring Docker authentication for Artifact Registry..."
gcloud auth configure-docker ${ARTIFACT_REGISTRY} --quiet

# Build the Docker image locally
echo "Building Docker image locally..."
docker build -t ${FULL_IMAGE} .

# Push image to Artifact Registry
echo "Pushing image to Artifact Registry..."
docker push ${FULL_IMAGE}

# Configure Docker on VM for Artifact Registry (run as root)
echo "Configuring Docker on VM for Artifact Registry..."
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} --project=${PROJECT} \
    --command="sudo gcloud auth configure-docker ${ARTIFACT_REGISTRY} --quiet"

# Pull image and restart container on VM
echo "Pulling image and restarting container on VM..."
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} --project=${PROJECT} --command="
    set -e

    sudo -E docker pull ${FULL_IMAGE}

    sudo docker stop trbackend 2>/dev/null || true
    sudo docker rm   trbackend 2>/dev/null || true
    sudo docker run -d \
        --name trbackend \
        --restart unless-stopped \
        -p 5000:5000 \
        --env-file ${VM_ENV_PATH} \
        ${FULL_IMAGE}

    sudo docker image prune -f
"

echo "Backend deployment completed."