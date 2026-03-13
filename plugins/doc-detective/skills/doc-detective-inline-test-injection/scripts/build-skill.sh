#!/bin/bash
# Build script for inline-test-injection skill
# Requires source files in src/ directory
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR/src" ]; then
    echo "Warning: src/ directory not found. Bundled inline-test-injection.js may already exist."
    if [ -f "$SCRIPT_DIR/inline-test-injection.js" ]; then
        echo "Using existing inline-test-injection.js"
        exit 0
    else
        echo "Error: Neither src/ nor inline-test-injection.js found."
        exit 1
    fi
fi

cd "$SCRIPT_DIR/src"
npm install
npm run build
