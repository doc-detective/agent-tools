#!/bin/bash
# Hook 4: Check for Doc Detective CLI availability at session start.
# Runs as SessionStart (both Claude Code and Gemini CLI).
# Reports availability status so the agent knows whether tests can be executed.

# Consume stdin (required by hook protocol)
cat > /dev/null

AVAILABLE="false"
STATUS=""

# Check 1: Global CLI
if command -v doc-detective &>/dev/null; then
  VERSION=$(doc-detective --version 2>/dev/null || echo "unknown")
  STATUS="doc-detective CLI found (version: ${VERSION})"
  AVAILABLE="true"
fi

# Check 2: npx
if [ "$AVAILABLE" = "false" ] && command -v npx &>/dev/null; then
  if timeout 8 npx doc-detective --version &>/dev/null 2>&1; then
    VERSION=$(timeout 8 npx doc-detective --version 2>/dev/null || echo "unknown")
    STATUS="doc-detective available via npx (version: ${VERSION})"
    AVAILABLE="true"
  fi
fi

# Check 3: Docker
if [ "$AVAILABLE" = "false" ] && command -v docker &>/dev/null; then
  if docker image inspect docdetective/doc-detective-latest &>/dev/null 2>&1; then
    STATUS="doc-detective available via Docker image"
    AVAILABLE="true"
  fi
fi

# Output result
if [ "$AVAILABLE" = "true" ]; then
  # Sanitize STATUS to prevent JSON malformation
  SAFE_STATUS=$(printf '%s' "$STATUS" | sed 's/[\\"/]/\\&/g' | tr -d '\n')
  printf '{"additionalContext": "Doc Detective status: %s. Tests can be executed directly."}\n' "$SAFE_STATUS"
else
  printf '{"additionalContext": "Doc Detective CLI is not installed. When the user requests test execution, suggest installation: npm i -g doc-detective, npx doc-detective, or Docker (docker pull docdetective/doc-detective-latest). Test spec generation and validation still work without the CLI."}\n'
fi

exit 0
