#!/bin/bash

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "Missing Sentry Auth Token, skipping...";
    exit 0;
fi
if [ -z "$SENTRY_ORG" ]; then
    echo "Missing Sentry Organization, skipping...";
    exit 0;
fi
if [ -z "$SENTRY_PROJECT" ]; then
    echo "Missing Sentry Project, skipping...";
    exit 0;
fi

if [ -z "$ENVIRONMENT" ]; then
    echo "Warning: Missing Environment Type, assigning ???? (may impact source map lookup)";
fi
SRCENV=${ENVIRONMENT:=????}
RELSTR="${SRCENV:0:4}-$(git rev-parse --short=7 HEAD)"

npx sentry-cli sourcemaps inject ./dist
npx sentry-cli sourcemaps upload --release="$RELSTR" --dist="$(git rev-parse HEAD)" ./dist
echo Successfully Deployed Source Map
