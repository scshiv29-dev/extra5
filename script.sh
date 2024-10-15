#!/bin/bash

# Update the system and install required packages
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git

# Set up Traefik as a standalone container
sudo docker network create traefik_network
sudo docker run -d \
  --name traefik \
  --network traefik_network \
  -p 80:80 \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  traefik:v2.9 \
  --api.insecure=true \
  --providers.docker=true \
  --entrypoints.web.address=:80

# Clone the repository
git clone https://github.com/scshiv29-dev/extra5.git

# Extract repository name from URL
REPO_NAME=$(basename "https://github.com/scshiv29-dev/extra5.git" .git)

# Change directory to the cloned repository
cd extra5 || { echo "Failed to change directory to cloned repository"; exit 1; }

# Get the server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}')

# Set the NEXT_PUBLIC_API_BASE_URL environment variable
export NEXT_PUBLIC_API_BASE_URL="http://${SERVER_IP}:8000"
echo "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}" >> .env

# Copy .env to the web-app folder
cp .env web-app/

# Run Docker Compose
sudo docker-compose up --build -d

# Print success message
echo "Setup complete. FlexiDB is running at  http://${SERVER_IP}:3000, Backend server is running at  http://${SERVER_IP}:8000/docs"
echo "Access Traefik dashboard at: http://${SERVER_IP}:8080"
