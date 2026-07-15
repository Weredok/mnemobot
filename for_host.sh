#!/bin/bash

cd /home/nxdreaming/Desktop/projects/mnemobot

git fetch --all
git reset --hard origin/main
git pull origin main

COMMIT_HASH=$(git rev-parse --short HEAD)
CURRENT_DATE=$(date +'%Y%m%d')
export BOT_VERSION="dev-${COMMIT_HASH}.${CURRENT_DATE}"

echo "Current Version: $BOT_VERSION"

npm install
npm run start -w discord