#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Function to display error messages
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

# Prompt for Let's Encrypt email
read -p "Enter your email for Let's Encrypt notifications: " email || error_exit "Failed to read email."

# Define variables
REPO_URL="https://github.com/scshiv29-dev/extra5.git"
REPO_NAME=$(basename "$REPO_URL" .git)
CLONE_DIR="$HOME/extra5"  # Adjust as needed
DOCKER_COMPOSE_DIR="$CLONE_DIR"  # Adjust if docker-compose.yml is in a subdirectory

# Update the system and install required packages
echo "Updating system and installing required packages..."
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git || error_exit "Failed to install packages."

# Set up Traefik as a standalone container
echo "Setting up Traefik..."
docker network ls | grep traefik_network || sudo docker network create traefik_network || error_exit "Failed to create traefik_network."

sudo docker run -d \
  --name traefik \
  --network traefik_network \
  -p 80:80 \
  -p 443:443 \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "/letsencrypt:/letsencrypt" \
  traefik:v2.9 \
  --api.insecure=true \
  --providers.docker=true \
  --entrypoints.web.address=:80 \
  --entrypoints.websecure.address=:443 \
  --certificatesresolvers.le.acme.tlschallenge=true \
  --certificatesresolvers.le.acme.email="$email" \
  --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json || error_exit "Failed to run Traefik."

# Clone the repository if it doesn't exist
if [ ! -d "$CLONE_DIR" ]; then
    echo "Cloning repository..."
    git clone "$REPO_URL" "$CLONE_DIR" || error_exit "Failed to clone repository."
else
    echo "Repository already exists. Pulling latest changes..."
    cd "$CLONE_DIR" || error_exit "Failed to navigate to repository directory."
    git pull origin main || error_exit "Failed to pull latest changes."
fi

# Navigate to the repository directory
cd "$CLONE_DIR" || error_exit "Failed to navigate to cloned repository."

# Ensure web-app directory exists
echo "Ensuring web-app directory exists..."
mkdir -p web-app || error_exit "Failed to create web-app directory."

# Get the server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}') || error_exit "Failed to retrieve server IP."

# Set the NEXT_PUBLIC_API_BASE_URL environment variable
echo "Setting NEXT_PUBLIC_API_BASE_URL..."
echo "NEXT_PUBLIC_API_BASE_URL=http://${SERVER_IP}:8000" > .env || error_exit "Failed to write to .env."

# Copy .env to the web-app folder
echo "Copying .env to web-app directory..."
cp .env web-app/ || error_exit "Failed to copy .env to web-app directory."

# Verify docker-compose.yml exists
if [ ! -f "$DOCKER_COMPOSE_DIR/docker-compose.yml" ] && [ ! -f "$DOCKER_COMPOSE_DIR/docker-compose.yaml" ] && [ ! -f "$DOCKER_COMPOSE_DIR/compose.yml" ] && [ ! -f "$DOCKER_COMPOSE_DIR/compose.yaml" ]; then
    error_exit "docker-compose.yml not found in $DOCKER_COMPOSE_DIR."
fi

# Navigate to the directory with docker-compose.yml
cd "$DOCKER_COMPOSE_DIR" || error_exit "Failed to navigate to Docker Compose directory."

# Run Docker Compose
echo "Running Docker Compose..."
sudo docker-compose up --build -d || error_exit "Docker Compose failed to start services."

# Verify that containers are running
echo "Verifying Docker containers..."
sleep 10  # Wait for containers to initialize
if sudo docker-compose ps | grep "Up"; then
    echo "Setup complete. FlexiDB is running at http://${SERVER_IP}:3000, Backend server is running at http://${SERVER_IP}:8000/docs"
    echo "Access Traefik dashboard at: http://${SERVER_IP}:8080"
else
    error_exit "Containers are not running as expected."
fi