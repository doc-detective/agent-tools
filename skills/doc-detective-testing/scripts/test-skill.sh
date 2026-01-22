#!/bin/bash
# Test script for doc-detective-testing skill
# Run from skill directory: ./scripts/test-skill.sh
#
# Options:
#   --quick    Skip slow execution tests (browser automation)
#   --full     Run all tests including execution (default)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
RUN_EXECUTION_TESTS=true
for arg in "$@"; do
    case $arg in
        --quick)
            RUN_EXECUTION_TESTS=false
            ;;
    esac
done

echo "========================================"
echo "Doc Detective Testing Skill - Test Suite"
echo "========================================"
if [ "$RUN_EXECUTION_TESTS" = false ]; then
    echo "(Quick mode - skipping execution tests)"
fi
echo ""

PASSED=0
FAILED=0

pass() {
    echo "✓ PASS: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo "✗ FAIL: $1"
    FAILED=$((FAILED + 1))
}

skip() {
    echo "○ SKIP: $1"
}

cd "$SKILL_DIR"

# =============================================================================
# VALIDATION TESTS (Fast)
# =============================================================================

# Test 1: SKILL.md example test spec is valid JSON
echo "--- Test 1: SKILL.md example JSON validity ---"
if cat << 'EOF' | python3 -m json.tool > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "login-flow",
      "description": "Verify login procedure from documentation",
      "steps": [
        {
          "stepId": "nav-login",
          "description": "Navigate to login page",
          "goTo": "https://example.com/login"
        },
        {
          "description": "Verify login form visible",
          "find": "Sign In"
        },
        {
          "description": "Enter username",
          "type": {
            "keys": "testuser",
            "selector": "#username"
          }
        },
        {
          "description": "Enter password",
          "type": {
            "keys": "password123",
            "selector": "#password"
          }
        },
        {
          "description": "Submit login",
          "click": "Sign In"
        },
        {
          "description": "Verify dashboard loads",
          "find": "Dashboard"
        }
      ]
    }
  ]
}
EOF
then
    pass "Test spec example is valid JSON"
else
    fail "Test spec example is invalid JSON"
fi

# Test 2: Results example JSON is valid
echo ""
echo "--- Test 2: Results example JSON validity ---"
if cat << 'EOF' | python3 -m json.tool > /dev/null 2>&1
{
  "summary": {
    "specs": { "pass": 1, "fail": 0 },
    "tests": { "pass": 2, "fail": 1 },
    "steps": { "pass": 8, "fail": 2 }
  },
  "specs": [
    {
      "id": "test-spec",
      "tests": [
        {
          "testId": "login-flow",
          "status": "PASS",
          "steps": [
            {
              "status": "PASS",
              "action": "goTo",
              "resultDescription": "Navigated to https://example.com/login"
            },
            {
              "status": "FAIL",
              "action": "find",
              "resultDescription": "Element 'Sign In' not found within timeout"
            }
          ]
        }
      ]
    }
  ]
}
EOF
then
    pass "Results example is valid JSON"
else
    fail "Results example is invalid JSON"
fi

# Test 3: validate-test.js shows usage when no args
echo ""
echo "--- Test 3: Validator shows usage with no args ---"
OUTPUT=$(node scripts/validate-test.js 2>&1 || true)
if echo "$OUTPUT" | grep -q "Usage:"; then
    pass "Validator shows usage message"
else
    fail "Validator does not show usage message"
fi

# Test 4: Valid test spec passes validation
echo ""
echo "--- Test 4: Valid test spec passes validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "simple-test",
      "steps": [
        { "goTo": "https://example.com" },
        { "find": "Welcome" },
        { "click": "Login" }
      ]
    }
  ]
}
EOF
then
    pass "Valid test spec passes validation"
else
    fail "Valid test spec should pass validation"
fi

# Test 5: Missing tests array fails validation
echo ""
echo "--- Test 5: Missing tests array fails validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "notTests": []
}
EOF
then
    fail "Missing tests array should be rejected"
else
    pass "Missing tests array correctly rejected"
fi

# Test 6: Unknown action fails validation
echo ""
echo "--- Test 6: Unknown action fails validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "test-1",
      "steps": [
        { "unknownAction": "value" }
      ]
    }
  ]
}
EOF
then
    fail "Unknown action should be rejected"
else
    pass "Unknown action correctly rejected"
fi

# Test 7: Invalid type action fails validation
echo ""
echo "--- Test 7: Invalid type action fails validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "test-1",
      "steps": [
        { "type": "should be object with keys" }
      ]
    }
  ]
}
EOF
then
    fail "Invalid type action should be rejected"
else
    pass "Invalid type action correctly rejected"
fi

# Test 8: Full SKILL.md example passes validation
echo ""
echo "--- Test 8: Full SKILL.md example passes validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "login-flow",
      "description": "Verify login procedure from documentation",
      "steps": [
        {
          "stepId": "nav-login",
          "description": "Navigate to login page",
          "goTo": "https://example.com/login"
        },
        {
          "description": "Verify login form visible",
          "find": "Sign In"
        },
        {
          "description": "Enter username",
          "type": {
            "keys": "testuser",
            "selector": "#username"
          }
        },
        {
          "description": "Enter password",
          "type": {
            "keys": "password123",
            "selector": "#password"
          }
        },
        {
          "description": "Submit login",
          "click": "Sign In"
        },
        {
          "description": "Verify dashboard loads",
          "find": "Dashboard"
        }
      ]
    }
  ]
}
EOF
then
    pass "Full SKILL.md example passes validation"
else
    fail "Full SKILL.md example should pass validation"
fi

# Test 9: Empty tests array fails validation
echo ""
echo "--- Test 9: Empty tests array fails validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": []
}
EOF
then
    fail "Empty tests array should be rejected"
else
    pass "Empty tests array correctly rejected"
fi

# Test 10: Empty steps array fails validation
echo ""
echo "--- Test 10: Empty steps array fails validation ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "test-1",
      "steps": []
    }
  ]
}
EOF
then
    fail "Empty steps array should be rejected"
else
    pass "Empty steps array correctly rejected"
fi

# Test 11: All known actions are accepted
echo ""
echo "--- Test 11: All known actions are accepted ---"
if cat << 'EOF' | node scripts/validate-test.js --stdin > /dev/null 2>&1
{
  "tests": [
    {
      "testId": "all-actions",
      "steps": [
        { "goTo": "https://example.com" },
        { "click": "Button" },
        { "find": "Text" },
        { "type": { "keys": "hello", "selector": "#input" } },
        { "wait": 1000 },
        { "screenshot": "shot.png" },
        { "checkLink": "https://example.com" },
        { "httpRequest": { "url": "https://api.example.com", "method": "GET" } },
        { "runShell": { "command": "echo hello" } },
        { "loadVariables": ".env" },
        { "loadCookie": "cookies.json" },
        { "saveCookie": "cookies.json" },
        { "record": "video.webm" },
        { "stopRecord": true }
      ]
    }
  ]
}
EOF
then
    pass "All known actions accepted"
else
    fail "All known actions should be accepted"
fi

# Test 12: Check execution method availability
echo ""
echo "--- Test 12: Execution method availability ---"
if command -v docker &> /dev/null || command -v npx &> /dev/null || command -v doc-detective &> /dev/null; then
    pass "At least one execution method available"
else
    fail "No execution method available (need docker, npx, or doc-detective)"
fi

# =============================================================================
# EXECUTION TESTS (Slow - require browser automation)
# =============================================================================

if [ "$RUN_EXECUTION_TESTS" = true ]; then
    echo ""
    echo "========================================"
    echo "Execution Tests (browser automation)"
    echo "========================================"

    # Create temp directory for test outputs
    TEST_OUTPUT_DIR=$(mktemp -d)
    trap "rm -rf $TEST_OUTPUT_DIR" EXIT

    # Test 13: Doc Detective executes passing test
    echo ""
    echo "--- Test 13: Doc Detective executes passing test ---"
    PASS_RESULT=$(npx doc-detective run --input scripts/test-real-execution.json --output "$TEST_OUTPUT_DIR/pass" 2>&1)
    if echo "$PASS_RESULT" | grep -q "All items passed"; then
        pass "Doc Detective executed passing test successfully"
    else
        fail "Doc Detective passing test did not pass"
    fi

    # Test 14: Doc Detective detects failures correctly
    echo ""
    echo "--- Test 14: Doc Detective detects failures ---"
    FAIL_RESULT=$(npx doc-detective run --input scripts/test-expected-failure.json --output "$TEST_OUTPUT_DIR/fail" 2>&1)
    if echo "$FAIL_RESULT" | grep -q "Failed: 1"; then
        pass "Doc Detective correctly detected failure"
    else
        fail "Doc Detective did not detect expected failure"
    fi

    # Test 15: Results file is valid JSON
    echo ""
    echo "--- Test 15: Results file is valid JSON ---"
    RESULTS_FILE=$(ls -t "$TEST_OUTPUT_DIR/pass"/testResults-*.json 2>/dev/null | head -1)
    if [ -f "$RESULTS_FILE" ] && python3 -m json.tool "$RESULTS_FILE" > /dev/null 2>&1; then
        pass "Results file is valid JSON"
    else
        fail "Results file missing or invalid JSON"
    fi

    # Test 16: Results contain expected structure
    echo ""
    echo "--- Test 16: Results contain expected structure ---"
    if [ -f "$RESULTS_FILE" ]; then
        if python3 -c "import json; d=json.load(open('$RESULTS_FILE')); assert 'summary' in d; assert 'specs' in d" 2>/dev/null; then
            pass "Results have expected structure (summary, specs)"
        else
            fail "Results missing expected structure"
        fi
    else
        fail "No results file to check structure"
    fi

    # Test 17: End-to-end workflow (validate then execute)
    echo ""
    echo "--- Test 17: End-to-end validate-then-execute workflow ---"
    if node scripts/validate-test.js scripts/interpreted-from-docs.json > /dev/null 2>&1; then
        E2E_RESULT=$(npx doc-detective run --input scripts/interpreted-from-docs.json --output "$TEST_OUTPUT_DIR/e2e" 2>&1)
        if echo "$E2E_RESULT" | grep -q "All items passed"; then
            pass "End-to-end workflow completed successfully"
        else
            fail "End-to-end execution failed after validation passed"
        fi
    else
        fail "End-to-end validation step failed"
    fi

else
    echo ""
    echo "========================================"
    echo "Execution Tests (skipped with --quick)"
    echo "========================================"
    skip "Doc Detective executes passing test"
    skip "Doc Detective detects failures"
    skip "Results file is valid JSON"
    skip "Results contain expected structure"
    skip "End-to-end validate-then-execute workflow"
fi

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "All tests passed!"
    exit 0
else
    echo "Some tests failed."
    exit 1
fi
