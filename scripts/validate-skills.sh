#!/usr/bin/env bash
# validate-skills.sh — Run strict skill-validator checks on all skills in skills/
#
# Usage:
#   ./scripts/doc-detective-validate-skills.sh [skills-dir]
#
# Dependencies:
#   skill-validator must be on PATH.
#   Install: go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@latest
#
# Exit codes:
#   0  All skills passed (no errors, no warnings)
#   1  One or more skills have validation errors
#   2  One or more skills have warnings (only when --strict is NOT set)
#   3  CLI/usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="${1:-"$REPO_ROOT/skills"}"

if ! command -v skill-validator &>/dev/null; then
    echo "ERROR: skill-validator not found on PATH." >&2
    echo "Install it with: go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@latest" >&2
    exit 3
fi

if [ ! -d "$SKILLS_DIR" ]; then
    echo "ERROR: skills directory not found: $SKILLS_DIR" >&2
    exit 3
fi

echo "Validating skills in: $SKILLS_DIR"
echo "skill-validator $(skill-validator --version 2>/dev/null || echo '(version unknown)')"
echo ""

skill-validator check --strict "$SKILLS_DIR"
