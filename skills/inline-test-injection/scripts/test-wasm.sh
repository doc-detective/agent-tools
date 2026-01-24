#!/usr/bin/env bash
# TDD test script for inline-test-injection WASM module
# Tests WASM module and all loaders (bash, python, node)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
LOADERS_DIR="$SCRIPT_DIR/loaders"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_test() { echo -e "${YELLOW}[TEST]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; TESTS_PASSED=$((TESTS_PASSED + 1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; TESTS_FAILED=$((TESTS_FAILED + 1)); }

# Test: WASM module exists
test_wasm_exists() {
    log_test "WASM module exists"
    if [ -f "$DIST_DIR/inject-inline.wasm" ]; then
        log_pass "WASM module found"
    else
        log_fail "WASM module not found at $DIST_DIR/inject-inline.wasm"
    fi
}

# Test: At least one runtime exists
test_runtime_exists() {
    log_test "At least one wasmtime runtime exists"
    local found=0
    for runtime in "$DIST_DIR/runtime"/*/wasmtime*; do
        if [ -x "$runtime" ]; then
            found=1
            break
        fi
    done
    
    if [ "$found" -eq 1 ]; then
        log_pass "Runtime found"
    else
        log_fail "No executable runtime found in $DIST_DIR/runtime/"
    fi
}

# Test: Bash loader exists and is executable
test_bash_loader() {
    log_test "Bash loader exists and is executable"
    if [ -x "$LOADERS_DIR/run.sh" ]; then
        log_pass "Bash loader is executable"
    else
        log_fail "Bash loader not found or not executable"
    fi
}

# Test: Python loader exists
test_python_loader() {
    log_test "Python loader exists"
    if [ -f "$LOADERS_DIR/run.py" ]; then
        log_pass "Python loader found"
    else
        log_fail "Python loader not found"
    fi
}

# Test: Node loader exists
test_node_loader() {
    log_test "Node.js loader exists"
    if [ -f "$LOADERS_DIR/run.mjs" ]; then
        log_pass "Node.js loader found"
    else
        log_fail "Node.js loader not found"
    fi
}

# Test: PowerShell loader exists
test_powershell_loader() {
    log_test "PowerShell loader exists"
    if [ -f "$LOADERS_DIR/run.ps1" ]; then
        log_pass "PowerShell loader found"
    else
        log_fail "PowerShell loader not found"
    fi
}

# Test: Bash loader help
test_bash_help() {
    log_test "Bash loader shows help"
    if "$LOADERS_DIR/run.sh" --help 2>&1 | grep -q "Usage:"; then
        log_pass "Bash loader help works"
    else
        log_fail "Bash loader help failed"
    fi
}

# Test: Preview injection with bash loader
test_bash_preview() {
    log_test "Bash loader preview mode"
    
    local spec_file="$FIXTURES_DIR/specs/valid-basic.json"
    local source_file="$FIXTURES_DIR/sources/sample.md"
    
    if [ ! -f "$spec_file" ] || [ ! -f "$source_file" ]; then
        log_fail "Test fixtures not found"
        return
    fi
    
    local output
    if output=$("$LOADERS_DIR/run.sh" "$spec_file" "$source_file" 2>&1); then
        if echo "$output" | grep -q "Preview:"; then
            log_pass "Bash loader preview works"
        else
            log_fail "Bash loader preview output unexpected: $output"
        fi
    else
        log_fail "Bash loader preview failed: $output"
    fi
}

# Test: Node loader preview (if node available)
test_node_preview() {
    log_test "Node.js loader preview mode"
    
    if ! command -v node &>/dev/null; then
        echo "  [SKIP] Node.js not available"
        return
    fi
    
    local spec_file="$FIXTURES_DIR/specs/valid-basic.json"
    local source_file="$FIXTURES_DIR/sources/sample.md"
    
    if [ ! -f "$spec_file" ] || [ ! -f "$source_file" ]; then
        log_fail "Test fixtures not found"
        return
    fi
    
    local output
    if output=$(node "$LOADERS_DIR/run.mjs" "$spec_file" "$source_file" 2>&1); then
        if echo "$output" | grep -q "Preview:"; then
            log_pass "Node.js loader preview works"
        else
            log_fail "Node.js loader preview output unexpected"
        fi
    else
        log_fail "Node.js loader preview failed: $output"
    fi
}

# Test: Python loader preview (if python available)
test_python_preview() {
    log_test "Python loader preview mode"
    
    if ! command -v python3 &>/dev/null; then
        echo "  [SKIP] Python not available"
        return
    fi
    
    local spec_file="$FIXTURES_DIR/specs/valid-basic.json"
    local source_file="$FIXTURES_DIR/sources/sample.md"
    
    if [ ! -f "$spec_file" ] || [ ! -f "$source_file" ]; then
        log_fail "Test fixtures not found"
        return
    fi
    
    local output
    if output=$(python3 "$LOADERS_DIR/run.py" "$spec_file" "$source_file" 2>&1); then
        if echo "$output" | grep -q "Preview:"; then
            log_pass "Python loader preview works"
        else
            log_fail "Python loader preview output unexpected"
        fi
    else
        log_fail "Python loader preview failed: $output"
    fi
}

# Test: Apply injection and verify output
test_apply_injection() {
    log_test "Apply injection produces correct output"
    
    local spec_file="$FIXTURES_DIR/specs/valid-basic.json"
    local source_file="$FIXTURES_DIR/sources/sample.md"
    local expected_file="$FIXTURES_DIR/expected/sample-injected.md"
    local temp_file=$(mktemp)
    
    if [ ! -f "$spec_file" ] || [ ! -f "$source_file" ]; then
        log_fail "Test fixtures not found"
        return
    fi
    
    # Copy source to temp
    cp "$source_file" "$temp_file"
    
    local output
    if output=$("$LOADERS_DIR/run.sh" "$spec_file" "$temp_file" --apply 2>&1); then
        if echo "$output" | grep -q "Injected"; then
            # Check if expected file exists for comparison
            if [ -f "$expected_file" ]; then
                if diff -q "$temp_file" "$expected_file" >/dev/null 2>&1; then
                    log_pass "Apply injection output matches expected"
                else
                    log_fail "Apply injection output differs from expected"
                    echo "  Expected: $expected_file"
                    echo "  Got: $temp_file"
                fi
            else
                # No expected file, just check it ran
                log_pass "Apply injection completed (no expected file to compare)"
            fi
        else
            log_fail "Apply injection output unexpected: $output"
        fi
    else
        log_fail "Apply injection failed: $output"
    fi
    
    rm -f "$temp_file"
}

# Test: Error handling for missing file
test_error_missing_file() {
    log_test "Error handling for missing spec file"
    
    set +e
    local output
    output=$("$LOADERS_DIR/run.sh" "nonexistent.json" "$FIXTURES_DIR/sources/sample.md" 2>&1)
    set -e
    
    if echo "$output" | grep -qi "not found\|error"; then
        log_pass "Missing file error handled correctly"
    else
        log_fail "Missing file error not handled"
    fi
}

# Test: YAML spec support (if pyyaml available)
test_yaml_spec() {
    log_test "YAML spec file support"
    
    local yaml_spec="$FIXTURES_DIR/specs/valid-complex.yaml"
    local source_file="$FIXTURES_DIR/sources/sample.md"
    
    if [ ! -f "$yaml_spec" ]; then
        echo "  [SKIP] YAML spec not found"
        return
    fi
    
    # Check if YAML parsing is available
    if ! python3 -c "import yaml" 2>/dev/null && ! node -e "require('yaml')" 2>/dev/null; then
        echo "  [SKIP] Neither PyYAML nor yaml package available"
        return
    fi
    
    local output
    if output=$("$LOADERS_DIR/run.sh" "$yaml_spec" "$source_file" 2>&1); then
        if echo "$output" | grep -qE "Preview:|Injected"; then
            log_pass "YAML spec file supported"
        else
            log_fail "YAML spec handling unexpected: $output"
        fi
    else
        # YAML parsing might fail if packages not installed
        if echo "$output" | grep -qi "yaml\|pyyaml"; then
            echo "  [SKIP] YAML parsing package not available"
        else
            log_fail "YAML spec failed: $output"
        fi
    fi
}

# Run all tests
main() {
    echo "=============================================="
    echo "Inline Test Injection WASM Tests"
    echo "=============================================="
    echo ""
    
    # Infrastructure tests
    test_wasm_exists
    test_runtime_exists
    test_bash_loader
    test_python_loader
    test_node_loader
    test_powershell_loader
    
    # Skip functional tests if WASM not built
    if [ ! -f "$DIST_DIR/inject-inline.wasm" ]; then
        echo ""
        echo "Skipping functional tests - WASM module not built"
        echo "Run ./build-wasm.sh first"
    else
        echo ""
        echo "--- Functional Tests ---"
        test_bash_help
        test_bash_preview
        test_node_preview
        test_python_preview
        test_apply_injection
        test_error_missing_file
        test_yaml_spec
    fi
    
    echo ""
    echo "=============================================="
    echo "Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
    echo "=============================================="
    
    if [ "$TESTS_FAILED" -gt 0 ]; then
        exit 1
    fi
}

main "$@"
