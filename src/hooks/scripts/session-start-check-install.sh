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

# Check 2: npx (use --yes to suppress install prompts, tail -1 to ignore progress output)
# Skip if CI=true to avoid npm cache lock issues in parallel test runs
if [ "$AVAILABLE" = "false" ] && [ "$CI" != "true" ] && command -v npx &>/dev/null; then
  if timeout 8 npx --yes doc-detective --version &>/dev/null 2>&1; then
    VERSION=$(timeout 8 npx --yes doc-detective --version 2>/dev/null | tail -1 || echo "unknown")
    STATUS="doc-detective available via npx (version: ${VERSION})"
    AVAILABLE="true"
  fi
fi

# Check 3: Docker. Only a CLI 5 or later image runs CLI 5 specs, and a cached
# `latest` can be older, so read the image's `version` label.
if [ "$AVAILABLE" = "false" ] && command -v docker &>/dev/null; then
  IMAGE_VERSION=$(docker image inspect --format '{{index .Config.Labels "version"}}' docdetective/docdetective 2>/dev/null)
  if [[ "$IMAGE_VERSION" =~ ^([5-9]|[1-9][0-9]+)\. ]]; then
    STATUS="doc-detective available via Docker image (version: ${IMAGE_VERSION})"
    AVAILABLE="true"
  fi
fi

# Output result
if [ "$AVAILABLE" = "true" ]; then
  # Sanitize STATUS to prevent JSON malformation (use # delimiter to avoid / conflicts)
  SAFE_STATUS=$(printf '%s' "$STATUS" | sed 's#[\\"/]#\\&#g' | tr -d '\n')
  printf '{"additionalContext": "Doc Detective status: %s. Tests can be executed directly."}\n' "$SAFE_STATUS"
else
  printf '{"additionalContext": "Doc Detective CLI is not installed. When the user requests test execution, suggest installation: npm i -g doc-detective, npx doc-detective, or Docker (docker pull docdetective/docdetective). Test spec generation and validation still work without the CLI."}\n'
fi

exit 0
