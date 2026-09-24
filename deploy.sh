#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Cypress is Electron-based; prevent shells configured to run Electron as Node
# from breaking the browser test runner.
unset ELECTRON_RUN_AS_NODE || true

trap 'echo "Deploy aborted - a previous step failed, nothing was deployed." >&2' ERR

echo "Running Image Creator production hosting deploy"
echo "Firebase project context: taliferrotech"
firebase use taliferrotech

echo "Building the production Image Creator bundle..."
npm run build

echo "Running Image Creator unit tests..."
npm run test:ci

echo "Running Image Creator Cypress tests..."
npm run e2e

echo "Running TypeScript validation..."
npm run typecheck

if [ -n "$(git status --porcelain)" ]; then
  echo "Build and tests passed - committing changes before deploy..."
  VERSION="$(node -p "require('./package.json').version")"
  git add -A
  git commit -m "Deploy: v${VERSION}"
else
  echo "No changes to commit - working tree already clean."
fi

echo "Deploying Image Creator to Firebase Hosting site todd-image-creator..."
firebase deploy --project taliferrotech --only hosting:todd-image-creator

echo "Image Creator hosting deploy complete - version $(node -p "require('./package.json').version")."
