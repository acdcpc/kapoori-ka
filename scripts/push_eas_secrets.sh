#!/bin/bash
# Kapoori Ka — Push environment variables to EAS
# Run this once to migrate secrets from .env to EAS environment variables.
# After running this, eas.json no longer needs env blocks — they're injected at build time.
#
# Prerequisites:
#   1. npx eas-cli login (if not already logged in)
#   2. A local .env file with your actual Firebase values

set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Create it from .env.example with your real values."
  exit 1
fi

echo "Pushing environment variables from .env to EAS..."

# Read .env and push each EXPO_PUBLIC_ variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  # Remove surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  if [[ "$key" == EXPO_PUBLIC_* ]]; then
    echo "  Pushing $key..."
    npx eas-cli env:push --name "$key" --value "$value" --environment preview,production --type string --non-interactive 2>&1 || \
      echo "  Warning: Failed to push $key (may already exist or need login)"
  fi
done < .env

echo ""
echo "Done. Verify with: npx eas-cli env:list"
echo ""
echo "Now run an EAS build — env vars will be auto-injected:"
echo "  npx eas-cli build --profile preview --platform android --non-interactive"
