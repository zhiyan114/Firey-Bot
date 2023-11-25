#!/bin/bash

if [ -z "$SENTRY_AUTH_TOKEN" ] || [ -z "$SENTRY_ORG" ] || [ -z "$SENTRY_PROJECT" ]; then
    echo "Missing Sentry Source Map Upload Env Variables, skipping...";
    exit 0;
fi

npx sentry-cli sourcemaps inject ./dist
npx sentry-cli sourcemaps upload --release="$(git rev-parse HEAD)" ./dist