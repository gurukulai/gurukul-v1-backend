#!/bin/bash
# Replace YOUR_USERNAME with your actual GitHub username
GITHUB_USERNAME="raghavg93"
REPO_NAME="gurukul-v1-frontend"

echo "Connecting to remote repository..."
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
echo "Pushing code to remote..."
git push -u origin master
echo "Done! Frontend is now on GitHub." 