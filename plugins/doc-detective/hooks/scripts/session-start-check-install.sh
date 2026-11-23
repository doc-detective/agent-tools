#!/bin/bash
# Hook 4: Check for Doc Detective CLI availability at session start.
# Runs as SessionStart (both Claude Code and Gemini CLI).
# Reports availability status so the agent knows whether tests can be executed.

# Consume stdin (required by hook protocol)
cat > /dev/null

AVAILABLE="false"
STATUS=""
OLD_GLOBAL=""

# Check 1: Global CLI. Only CLI 5 or later runs CLI 5 specs, so an older
# global install falls through to the other checks.
if command -v doc-detective &>/dev/null; then
  VERSION=""
  [[ "$(doc-detective --version 2>/dev/null)" =~ ([0-9]+\.[0-9]+\.[0-9]+[^[:space:]]*) ]] && VERSION="${BASH_REMATCH[1]}"
  if [[ "$VERSION" =~ ^([5-9]|[1-9][0-9]+)\. ]]; then
    STATUS="doc-detective CLI found (version: ${VERSION})"
    AVAILABLE="true"
  else
    OLD_GLOBAL="${VERSION:-unknown}"
  fi
fi

# Check 2: npx (use --yes to suppress install prompts, tail -1 to ignore progress output)
# Skip if CI=true to avoid npm cache lock issues in parallel test runs
if [ "$AVAILABLE" = "false" ] && [ "$CI" != "true" ] && command -v npx &>/dev/null; then
  if timeout 8 npx --yes doc-detective@5 --version &>/dev/null 2>&1; then
    VERSION=$(timeout 8 npx --yes doc-detective@5 --version 2>/dev/null | tail -1 || echo "unknown")
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
  OLD_NOTE=""
  if [ -n "$OLD_GLOBAL" ]; then
    SAFE_OLD=$(printf '%s' "$OLD_GLOBAL" | sed 's#[\\"/]#\\&#g' | tr -d '\n')
    OLD_NOTE=" The global doc-detective is ${SAFE_OLD}, but these skills need Doc Detective 5 or later."
  fi
  printf '{"additionalContext": "No Doc Detective 5 runner was confirmed at session start (npx is checked only outside CI, with an 8-second limit).%s When the user asks to run tests, use the skill'"'"'s runner fallback, and suggest installing (npm i -g doc-detective@5, or docker pull docdetective/docdetective) only if none works. Spec generation and validation work without a runner."}\n' "$OLD_NOTE"
fi

exit 0
