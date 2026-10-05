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
BUILD_LOG="$(mktemp)"
trap 'rm -f "${BUILD_LOG}"' EXIT
npm run build 2>&1 | tee "${BUILD_LOG}"

# Angular reports template diagnostics and budget overruns as warnings and still
# exits 0, so treat any build warning as a failed build.
if grep -q "WARNING" "${BUILD_LOG}"; then
  echo "Build produced warnings - fix them before deploying:" >&2
  grep "WARNING" "${BUILD_LOG}" >&2
  echo "Deploy aborted - nothing was deployed." >&2
  exit 1
fi

# Firebase serves whatever is in the public folder, so a missing or placeholder
# index page shows up as the Firebase default page. Check the output first.
PUBLIC_DIR="dist/image-creator/browser"
for page in index.html index.csr.html; do
  file="${PUBLIC_DIR}/${page}"
  if [ ! -s "${file}" ]; then
    echo "Build output is missing ${file} - deploy aborted, nothing was deployed." >&2
    exit 1
  fi
  if ! grep -q "TODD Image Creator" "${file}" || ! grep -qE 'src="main-[A-Za-z0-9]+\.js"' "${file}"; then
    echo "${file} is not the app page (no title or main script) - deploy aborted, nothing was deployed." >&2
    exit 1
  fi
  if grep -qi "firebase hosting setup complete" "${file}"; then
    echo "${file} is the Firebase placeholder page - deploy aborted, nothing was deployed." >&2
    exit 1
  fi
done
MAIN_JS="$(grep -oE 'main-[A-Za-z0-9]+\.js' "${PUBLIC_DIR}/index.csr.html" | head -n 1)"
if [ ! -s "${PUBLIC_DIR}/${MAIN_JS}" ]; then
  echo "index.csr.html points to ${MAIN_JS}, which was not built - deploy aborted, nothing was deployed." >&2
  exit 1
fi

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

echo "Checking the live site..."
LIVE_URL="https://todd-image-creator.web.app/"
if ! curl -fsSL --retry 3 --retry-delay 5 "${LIVE_URL}" | grep -q "${MAIN_JS}"; then
  echo "The live site at ${LIVE_URL} is not serving this build (${MAIN_JS})." >&2
  echo "Roll back from the Firebase console: Hosting > todd-image-creator > Release history." >&2
  exit 1
fi

echo "Image Creator hosting deploy complete - version $(node -p "require('./package.json').version")."
