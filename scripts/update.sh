#!/bin/bash

## This is a all in one updater script for the target machine
## DO NOT USE IN Dockerfile

## Use for clean up ONLY:
# docker system prune -a --volumes

cd ../

# Only build if the master branch is out-of-date
pull_output=$(git pull)
if [[ "$pull_output" != *"files changed"* ]]; then
    echo "Already up to date."
    exit 0
fi

# BUILDKIT_PROGRESS=plain
doppler run -- docker compose build
docker compose down
doppler run -- docker compose up -d