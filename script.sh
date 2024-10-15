#!/bin/bash

# Update the system and install required packages
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git


REPO_URL="https://github.com/scshiv29-dev/extra5.git"
git clone $REPO_URL

# Extract repository name from URL
REPO_NAME=$(basename "$REPO_URL" .git)

# Change directory to the cloned repository
cd $REPO_NAME || { echo "Failed to change directory to cloned repository"; exit 1; }

# Run Docker Compose
sudo docker-compose up --build -d

# Print success message
echo "Setup complete. Docker containers are up and running."