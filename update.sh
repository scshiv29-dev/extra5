#!/bin/bash

# Define variables
REPO_DIR="https://github.com/scshiv29-dev/extra5.git"  # Change this to your repository path
BACKUP_DIR="$HOME/backups"    # Change this to your backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create a backup of the current code
echo "Creating backup of the current code..."
mkdir -p "$BACKUP_DIR"
cp -r "$REPO_DIR" "$BACKUP_DIR/repo_backup_$TIMESTAMP"

# Navigate to the repository directory
cd "$REPO_DIR" || { echo "Failed to navigate to repository directory"; exit 1; }

# Pull the latest changes from the repository
echo "Pulling the latest changes from the repository..."
git pull origin main  # Change 'main' to your branch name if necessary

# Check for uncommitted changes
if [[ $(git status --porcelain) ]]; then
    echo "Warning: You have uncommitted changes. Please commit or stash them before running this script."
    exit 1
fi

# Run any necessary update commands (e.g., install dependencies)
echo "Running update commands..."
# Example: npm install or pip install -r requirements.txt
# Uncomment and modify the following line as needed
# npm install

# Print success message
echo "Code update completed successfully. Backup created at: $BACKUP_DIR/repo_backup_$TIMESTAMP"