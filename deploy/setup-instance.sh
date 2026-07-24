#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Startup script for Trikaal Netra Monolith VM
# Installs Docker, authenticates to GAR, pulls images, and starts all services
# ──────────────────────────────────────────────────────────────────────────────

echo "=== Installing Docker ==="
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "=== Installing gcloud CLI ==="
apt-get install -y apt-transport-https
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
apt-get update -y
apt-get install -y google-cloud-cli

echo "=== Authenticating to GAR ==="
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet

echo "=== Setup complete ==="
