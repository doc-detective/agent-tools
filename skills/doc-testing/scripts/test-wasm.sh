#!/bin/bash
# TDD Test Script for WASM-based validation
# Tests the WASM module and loaders before implementation (red phase)
#
# Usage: ./test-wasm.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - Some tests failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
LOADERS_DIR="$SCRIPT_DIR/loaders"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    if [ -n "${2:-}" ]; then
        echo "  Details: $2"
    fi
    FAILED=$((FAILED + 1))
}

skip() {
    echo -e "${YELLOW}○ SKIP${NC}: $1"
    SKIPPED=$((SKIPPED + 1))
}

echo "========================================"
echo "WASM Loader Tests (TDD)"
echo "========================================"
echo ""

# =============================================================================
# PREREQUISITES CHECK
# =============================================================================
echo "--- Prerequisites Check ---"

WASM_EXISTS=false
if [ -f "$DIST_DIR/validate-test.wasm" ]; then
    WASM_EXISTS=true
    echo "WASM module: found"
else
    echo "WASM module: not found (expected at $DIST_DIR/validate-test.wasm)"
fi

WASMTIME_BUNDLED=false
WASMTIME_PATH=""
# Check for bundled wasmtime
if [ -f "$DIST_DIR/runtime/linux-x64/wasmtime" ] && [ "$(uname -s)" = "Linux" ] && [ "$(uname -m)" = "x86_64" ]; then
    WASMTIME_BUNDLED=true
    WASMTIME_PATH="$DIST_DIR/runtime/linux-x64/wasmtime"
elif [ -f "$DIST_DIR/runtime/darwin-arm64/wasmtime" ] && [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
    WASMTIME_BUNDLED=true
    WASMTIME_PATH="$DIST_DIR/runtime/darwin-arm64/wasmtime"
elif [ -f "$DIST_DIR/runtime/darwin-x64/wasmtime" ] && [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "x86_64" ]; then
    WASMTIME_BUNDLED=true
    WASMTIME_PATH="$DIST_DIR/runtime/darwin-x64/wasmtime"
elif command -v wasmtime &> /dev/null; then
    WASMTIME_PATH="wasmtime"
    echo "wasmtime: system install"
else
    echo "wasmtime: not found"
fi

if [ "$WASMTIME_BUNDLED" = true ]; then
    echo "wasmtime: bundled ($WASMTIME_PATH)"
fi

# Check for loaders
BASH_LOADER=false
PYTHON_LOADER=false
NODE_LOADER=false

if [ -f "$LOADERS_DIR/run.sh" ]; then
    BASH_LOADER=true
    echo "Bash loader: found"
else
    echo "Bash loader: not found"
fi

if [ -f "$LOADERS_DIR/run.py" ]; then
    PYTHON_LOADER=true
    echo "Python loader: found"
else
    echo "Python loader: not found"
fi

if [ -f "$LOADERS_DIR/run.mjs" ]; then
    NODE_LOADER=true
    echo "Node loader: found"
else
    echo "Node loader: not found"
fi

echo ""

# =============================================================================
# WASM MODULE TESTS
# =============================================================================
echo "--- WASM Module Tests ---"

# Test 1: WASM module exists
if [ "$WASM_EXISTS" = true ]; then
    pass "WASM module exists"
else
    fail "WASM module should exist at $DIST_DIR/validate-test.wasm"
fi

# Test 2: WASM module is valid
if [ "$WASM_EXISTS" = true ] && [ -n "$WASMTIME_PATH" ]; then
    if file "$DIST_DIR/validate-test.wasm" | grep -q "WebAssembly"; then
        pass "WASM module is valid WebAssembly binary"
    else
        fail "WASM module should be valid WebAssembly binary"
    fi
else
    skip "WASM module validation (module or wasmtime not available)"
fi

# Test 3: WASM module runs with wasmtime
if [ "$WASM_EXISTS" = true ] && [ -n "$WASMTIME_PATH" ]; then
    # Create input JSON for validation
    INPUT='{"action":"validate","spec":{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}}'
    
    OUTPUT=$(echo "$INPUT" | "$WASMTIME_PATH" run "$DIST_DIR/validate-test.wasm" 2>&1) || true
    
    if echo "$OUTPUT" | grep -qE '"valid"|"errors"'; then
        pass "WASM module executes and returns validation result"
    else
        fail "WASM module should return validation result" "$OUTPUT"
    fi
else
    skip "WASM module execution (module or wasmtime not available)"
fi

echo ""

# =============================================================================
# BASH LOADER TESTS
# =============================================================================
echo "--- Bash Loader Tests ---"

if [ "$BASH_LOADER" = false ]; then
    skip "Bash loader not found - skipping bash tests"
else
    # Test 4: Bash loader shows usage with no args
    OUTPUT=$("$LOADERS_DIR/run.sh" 2>&1 || true)
    if echo "$OUTPUT" | grep -qi "usage"; then
        pass "Bash loader shows usage with no args"
    else
        fail "Bash loader should show usage with no args" "$OUTPUT"
    fi

    # Test 5: Bash loader validates file input
    if [ "$WASM_EXISTS" = true ]; then
        # Create temp test spec
        TEMP_SPEC=$(mktemp)
        echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' > "$TEMP_SPEC"
        
        OUTPUT=$("$LOADERS_DIR/run.sh" "$TEMP_SPEC" 2>&1) || true
        EXIT_CODE=$?
        rm -f "$TEMP_SPEC"
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Bash loader validates valid spec with exit code 0"
        else
            fail "Bash loader should pass valid spec" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Bash loader validation (WASM not available)"
    fi

    # Test 6: Bash loader handles --stdin
    if [ "$WASM_EXISTS" = true ]; then
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' | "$LOADERS_DIR/run.sh" --stdin 2>&1) || true
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Bash loader handles --stdin input"
        else
            fail "Bash loader should handle --stdin" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Bash loader --stdin (WASM not available)"
    fi

    # Test 7: Bash loader propagates exit code for invalid spec
    if [ "$WASM_EXISTS" = true ]; then
        set +e
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"unknownAction":"value"}]}]}' | "$LOADERS_DIR/run.sh" --stdin 2>&1)
        EXIT_CODE=$?
        set -e
        
        if [ $EXIT_CODE -eq 1 ]; then
            pass "Bash loader propagates exit code 1 for invalid spec"
        else
            fail "Bash loader should exit 1 for invalid spec" "Exit: $EXIT_CODE"
        fi
    else
        skip "Bash loader exit code propagation (WASM not available)"
    fi

    # Test 8: Bash loader returns exit code 2 for usage errors
    set +e
    OUTPUT=$("$LOADERS_DIR/run.sh" --invalid-flag 2>&1)
    EXIT_CODE=$?
    set -e
    
    if [ $EXIT_CODE -eq 2 ]; then
        pass "Bash loader returns exit code 2 for usage errors"
    else
        fail "Bash loader should exit 2 for usage errors" "Exit: $EXIT_CODE"
    fi
fi

echo ""

# =============================================================================
# PYTHON LOADER TESTS
# =============================================================================
echo "--- Python Loader Tests ---"

if [ "$PYTHON_LOADER" = false ]; then
    skip "Python loader not found - skipping python tests"
elif ! command -v python3 &> /dev/null; then
    skip "python3 not available"
else
    # Test 9: Python loader shows usage with no args
    OUTPUT=$(python3 "$LOADERS_DIR/run.py" 2>&1 || true)
    if echo "$OUTPUT" | grep -qi "usage"; then
        pass "Python loader shows usage with no args"
    else
        fail "Python loader should show usage with no args" "$OUTPUT"
    fi

    # Test 10: Python loader validates file input
    if [ "$WASM_EXISTS" = true ]; then
        TEMP_SPEC=$(mktemp --suffix=.json)
        echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' > "$TEMP_SPEC"
        
        OUTPUT=$(python3 "$LOADERS_DIR/run.py" "$TEMP_SPEC" 2>&1) || true
        EXIT_CODE=$?
        rm -f "$TEMP_SPEC"
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Python loader validates valid spec with exit code 0"
        else
            fail "Python loader should pass valid spec" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Python loader validation (WASM not available)"
    fi

    # Test 11: Python loader handles --stdin
    if [ "$WASM_EXISTS" = true ]; then
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' | python3 "$LOADERS_DIR/run.py" --stdin 2>&1) || true
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Python loader handles --stdin input"
        else
            fail "Python loader should handle --stdin" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Python loader --stdin (WASM not available)"
    fi

    # Test 12: Python loader propagates exit code for invalid spec
    if [ "$WASM_EXISTS" = true ]; then
        set +e
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"unknownAction":"value"}]}]}' | python3 "$LOADERS_DIR/run.py" --stdin 2>&1)
        EXIT_CODE=$?
        set -e
        
        if [ $EXIT_CODE -eq 1 ]; then
            pass "Python loader propagates exit code 1 for invalid spec"
        else
            fail "Python loader should exit 1 for invalid spec" "Exit: $EXIT_CODE"
        fi
    else
        skip "Python loader exit code propagation (WASM not available)"
    fi
fi

echo ""

# =============================================================================
# NODE LOADER TESTS
# =============================================================================
echo "--- Node Loader Tests ---"

if [ "$NODE_LOADER" = false ]; then
    skip "Node loader not found - skipping node tests"
elif ! command -v node &> /dev/null; then
    skip "node not available"
else
    # Test 13: Node loader shows usage with no args
    OUTPUT=$(node "$LOADERS_DIR/run.mjs" 2>&1 || true)
    if echo "$OUTPUT" | grep -qi "usage"; then
        pass "Node loader shows usage with no args"
    else
        fail "Node loader should show usage with no args" "$OUTPUT"
    fi

    # Test 14: Node loader validates file input
    if [ "$WASM_EXISTS" = true ]; then
        TEMP_SPEC=$(mktemp --suffix=.json)
        echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' > "$TEMP_SPEC"
        
        OUTPUT=$(node "$LOADERS_DIR/run.mjs" "$TEMP_SPEC" 2>&1) || true
        EXIT_CODE=$?
        rm -f "$TEMP_SPEC"
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Node loader validates valid spec with exit code 0"
        else
            fail "Node loader should pass valid spec" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Node loader validation (WASM not available)"
    fi

    # Test 15: Node loader handles --stdin
    if [ "$WASM_EXISTS" = true ]; then
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"goTo":"https://example.com"}]}]}' | node "$LOADERS_DIR/run.mjs" --stdin 2>&1) || true
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qi "pass"; then
            pass "Node loader handles --stdin input"
        else
            fail "Node loader should handle --stdin" "Exit: $EXIT_CODE, Output: $OUTPUT"
        fi
    else
        skip "Node loader --stdin (WASM not available)"
    fi

    # Test 16: Node loader propagates exit code for invalid spec
    if [ "$WASM_EXISTS" = true ]; then
        set +e
        OUTPUT=$(echo '{"tests":[{"testId":"test-1","steps":[{"unknownAction":"value"}]}]}' | node "$LOADERS_DIR/run.mjs" --stdin 2>&1)
        EXIT_CODE=$?
        set -e
        
        if [ $EXIT_CODE -eq 1 ]; then
            pass "Node loader propagates exit code 1 for invalid spec"
        else
            fail "Node loader should exit 1 for invalid spec" "Exit: $EXIT_CODE"
        fi
    else
        skip "Node loader exit code propagation (WASM not available)"
    fi
fi

echo ""

# =============================================================================
# BUNDLED RUNTIME TESTS
# =============================================================================
echo "--- Bundled Runtime Tests ---"

# Test 17: Linux x64 runtime exists
if [ -f "$DIST_DIR/runtime/linux-x64/wasmtime" ]; then
    pass "Linux x64 wasmtime runtime bundled"
else
    fail "Linux x64 wasmtime runtime should be bundled"
fi

# Test 18: Linux arm64 runtime exists
if [ -f "$DIST_DIR/runtime/linux-arm64/wasmtime" ]; then
    pass "Linux arm64 wasmtime runtime bundled"
else
    fail "Linux arm64 wasmtime runtime should be bundled"
fi

# Test 19: Darwin x64 runtime exists
if [ -f "$DIST_DIR/runtime/darwin-x64/wasmtime" ]; then
    pass "Darwin x64 wasmtime runtime bundled"
else
    fail "Darwin x64 wasmtime runtime should be bundled"
fi

# Test 20: Darwin arm64 runtime exists
if [ -f "$DIST_DIR/runtime/darwin-arm64/wasmtime" ]; then
    pass "Darwin arm64 wasmtime runtime bundled"
else
    fail "Darwin arm64 wasmtime runtime should be bundled"
fi

# Test 21: Windows x64 runtime exists
if [ -f "$DIST_DIR/runtime/windows-x64/wasmtime.exe" ]; then
    pass "Windows x64 wasmtime runtime bundled"
else
    fail "Windows x64 wasmtime runtime should be bundled"
fi

# Test 22: Windows arm64 runtime exists
if [ -f "$DIST_DIR/runtime/windows-arm64/wasmtime.exe" ]; then
    pass "Windows arm64 wasmtime runtime bundled"
else
    fail "Windows arm64 wasmtime runtime should be bundled"
fi

echo ""

# =============================================================================
# CROSS-LOADER CONSISTENCY TESTS
# =============================================================================
echo "--- Cross-Loader Consistency Tests ---"

if [ "$WASM_EXISTS" = true ] && [ "$BASH_LOADER" = true ] && [ "$PYTHON_LOADER" = true ] && [ "$NODE_LOADER" = true ]; then
    TEMP_SPEC=$(mktemp --suffix=.json)
    echo '{"tests":[{"testId":"consistency-test","steps":[{"goTo":"https://example.com"},{"find":"Example Domain"}]}]}' > "$TEMP_SPEC"
    
    # Test 23: All loaders produce consistent output structure
    BASH_OUT=$("$LOADERS_DIR/run.sh" "$TEMP_SPEC" 2>&1) || true
    PYTHON_OUT=$(python3 "$LOADERS_DIR/run.py" "$TEMP_SPEC" 2>&1) || true
    NODE_OUT=$(node "$LOADERS_DIR/run.mjs" "$TEMP_SPEC" 2>&1) || true
    
    rm -f "$TEMP_SPEC"
    
    # All should mention validation passed
    CONSISTENT=true
    if ! echo "$BASH_OUT" | grep -qi "pass"; then CONSISTENT=false; fi
    if ! echo "$PYTHON_OUT" | grep -qi "pass"; then CONSISTENT=false; fi
    if ! echo "$NODE_OUT" | grep -qi "pass"; then CONSISTENT=false; fi
    
    if [ "$CONSISTENT" = true ]; then
        pass "All loaders produce consistent validation results"
    else
        fail "Loaders should produce consistent results" "Bash: $BASH_OUT, Python: $PYTHON_OUT, Node: $NODE_OUT"
    fi
else
    skip "Cross-loader consistency (not all loaders available)"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
