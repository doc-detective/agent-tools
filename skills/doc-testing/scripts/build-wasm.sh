#!/bin/bash
# Build script for WASM-based validation
#
# Compiles JavaScript to WASM using Javy and downloads bundled runtimes.
#
# Prerequisites:
#   - Node.js (for esbuild bundling)
#   - Javy CLI (for JS -> WASM compilation)
#   - curl (for downloading runtimes)
#
# Usage:
#   ./build-wasm.sh              # Full build
#   ./build-wasm.sh --no-runtime # Skip runtime download
#   ./build-wasm.sh --runtime-only # Only download runtimes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
DIST_DIR="$SCRIPT_DIR/dist"
RUNTIME_DIR="$DIST_DIR/runtime"

# Parse arguments
DOWNLOAD_RUNTIME=true
BUILD_WASM=true

for arg in "$@"; do
    case $arg in
        --no-runtime)
            DOWNLOAD_RUNTIME=false
            ;;
        --runtime-only)
            BUILD_WASM=false
            ;;
    esac
done

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Create dist directory
mkdir -p "$DIST_DIR"

# =============================================================================
# WASM COMPILATION
# =============================================================================

if [ "$BUILD_WASM" = true ]; then
    log "Building WASM module..."
    
    # Check for javy
    if ! command -v javy &> /dev/null; then
        echo "Error: Javy CLI not found. Install from: https://github.com/bytecodealliance/javy"
        echo "  curl -L https://github.com/bytecodealliance/javy/releases/download/v8.0.0/javy-x86_64-linux-v8.0.0.gz | gunzip > /usr/local/bin/javy && chmod +x /usr/local/bin/javy"
        exit 1
    fi
    
    log "Javy version: $(javy --version)"
    
    # Bundle with esbuild if there are dependencies
    # For this module, we don't have external deps in the WASM version, so we skip bundling
    # If needed: npx esbuild src/validate-test-wasm.js --bundle --platform=neutral --format=esm --outfile=dist/bundled.js
    
    # Compile to WASM
    log "Compiling validate-test-wasm.js to WASM..."
    javy build "$SRC_DIR/validate-test-wasm.js" -o "$DIST_DIR/validate-test.wasm"
    
    # Check size
    WASM_SIZE=$(ls -lh "$DIST_DIR/validate-test.wasm" | awk '{print $5}')
    log "WASM module created: $DIST_DIR/validate-test.wasm ($WASM_SIZE)"
fi

# =============================================================================
# RUNTIME DOWNLOAD
# =============================================================================

if [ "$DOWNLOAD_RUNTIME" = true ]; then
    log "Downloading wasmtime runtimes..."
    
    # Get latest wasmtime version
    WASMTIME_VERSION="v41.0.0"
    log "Using wasmtime $WASMTIME_VERSION"
    
    # Platform configurations: name, archive_suffix, binary_name, extract_command
    declare -A PLATFORMS=(
        ["linux-x64"]="x86_64-linux|.tar.xz|wasmtime|tar -xJf"
        ["linux-arm64"]="aarch64-linux|.tar.xz|wasmtime|tar -xJf"
        ["darwin-x64"]="x86_64-macos|.tar.xz|wasmtime|tar -xJf"
        ["darwin-arm64"]="aarch64-macos|.tar.xz|wasmtime|tar -xJf"
        ["windows-x64"]="x86_64-windows|.zip|wasmtime.exe|unzip -o"
        ["windows-arm64"]="aarch64-windows|.zip|wasmtime.exe|unzip -o"
    )
    
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    for platform in "${!PLATFORMS[@]}"; do
        IFS='|' read -r arch_name archive_suffix binary_name extract_cmd <<< "${PLATFORMS[$platform]}"
        
        PLATFORM_DIR="$RUNTIME_DIR/$platform"
        mkdir -p "$PLATFORM_DIR"
        
        # Skip if already exists
        if [ -f "$PLATFORM_DIR/$binary_name" ]; then
            log "  $platform: already exists, skipping"
            continue
        fi
        
        ARCHIVE_NAME="wasmtime-${WASMTIME_VERSION}-${arch_name}${archive_suffix}"
        URL="https://github.com/bytecodealliance/wasmtime/releases/download/${WASMTIME_VERSION}/${ARCHIVE_NAME}"
        
        log "  $platform: downloading $ARCHIVE_NAME..."
        
        # Download
        if ! curl -sL "$URL" -o "$TEMP_DIR/$ARCHIVE_NAME"; then
            warn "    Failed to download $platform"
            continue
        fi
        
        # Extract
        cd "$TEMP_DIR"
        if [[ "$archive_suffix" == ".tar.xz" ]]; then
            tar -xJf "$ARCHIVE_NAME"
        else
            unzip -o -q "$ARCHIVE_NAME"
        fi
        
        # Find and copy binary
        EXTRACTED_DIR=$(ls -d wasmtime-${WASMTIME_VERSION}-${arch_name}* 2>/dev/null | head -1)
        if [ -n "$EXTRACTED_DIR" ] && [ -f "$EXTRACTED_DIR/$binary_name" ]; then
            cp "$EXTRACTED_DIR/$binary_name" "$PLATFORM_DIR/$binary_name"
            chmod +x "$PLATFORM_DIR/$binary_name"
            BINARY_SIZE=$(ls -lh "$PLATFORM_DIR/$binary_name" | awk '{print $5}')
            log "    $platform: installed ($BINARY_SIZE)"
        else
            warn "    $platform: binary not found in archive"
        fi
        
        # Cleanup temp files
        rm -rf "$TEMP_DIR"/*
        cd "$SCRIPT_DIR"
    done
    
    log "Runtime download complete"
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
log "Build complete!"

if [ "$BUILD_WASM" = true ]; then
    echo "  WASM module: $DIST_DIR/validate-test.wasm"
fi

if [ "$DOWNLOAD_RUNTIME" = true ]; then
    echo "  Runtimes:"
    for platform in linux-x64 linux-arm64 darwin-x64 darwin-arm64 windows-x64 windows-arm64; do
        if [ -f "$RUNTIME_DIR/$platform/wasmtime" ] || [ -f "$RUNTIME_DIR/$platform/wasmtime.exe" ]; then
            echo "    - $platform"
        fi
    done
fi

echo ""
echo "To test: ./test-wasm.sh"
