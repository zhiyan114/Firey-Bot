#!/bin/bash

# Post-Build Script #



# Shareable Values
SRCENV=${ENVIRONMENT:=????}
RELSTR="${SRCENV:0:4}-$(git rev-parse --short=7 HEAD)"


# Sentry Deploy Ends
if [ -n "$SENTRY_AUTH_TOKEN" ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ]; then
  RELEXIST="$(npx sentry-cli releases info "$RELSTR")"
  if [ -n "$RELEXIST" ]; then
    npx sentry-cli releases finalize "$RELSTR"
    npx sentry-cli releases set-commits "$RELSTR" --auto
    echo "Sentry Release Finalized for $RELSTR..."
  else
    echo "Sentry Release Cannot be Finalized due to missing pre-published release"
  fi
else
  echo "Sentry Release Cannot be Finalized due to missing required Sentry-Cli variables";
fi