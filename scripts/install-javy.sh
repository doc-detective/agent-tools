#!/usr/bin/env bash
# Install or download a Javy CLI binary for common platforms (best-effort).
# This helper is intended to run as a non-fatal `postinstall` step.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$SCRIPT_DIR/../bin"
mkdir -p "$BIN_DIR"

JAVY_VERSION="v5.0.0"

info() { printf "[javy-helper] %s\n" "$1"; }
warn() { printf "[javy-helper] WARN: %s\n" "$1"; }
err() { printf "[javy-helper] ERROR: %s\n" "$1"; }

if command -v javy >/dev/null 2>&1; then
  info "javy already installed: $(command -v javy)"
  exit 0
fi

info "javy not found in PATH — attempting best-effort install into $BIN_DIR"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  linux) os_label="linux" ;;
  darwin) os_label="macos" ;;
  msys*|mingw*|cygwin*) os_label="windows" ;;
  *) os_label="unknown" ;;
esac

case "$ARCH" in
  x86_64|amd64) arch_label="x86_64" ;;
  aarch64|arm64) arch_label="aarch64" ;;
  *) arch_label="unknown" ;;
esac

if [ "$os_label" = "unknown" ] || [ "$arch_label" = "unknown" ]; then
  warn "Unsupported platform: OS=$OS ARCH=$ARCH"
  err "Please install Javy manually: https://github.com/Shopify/javy/releases"
  exit 0
fi

asset_name="javy-${arch_label}-${os_label}-${JAVY_VERSION}"
download_url="https://github.com/Shopify/javy/releases/download/${JAVY_VERSION}/${asset_name}.gz"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

info "Attempting to download $download_url"

if command -v curl >/dev/null 2>&1; then
  if ! curl -fsSL "$download_url" -o "$tmpdir/asset.gz"; then
    warn "Download failed (curl)"
  else
    gunzip -c "$tmpdir/asset.gz" > "$BIN_DIR/javy" || true
    chmod +x "$BIN_DIR/javy" || true
    if [ -x "$BIN_DIR/javy" ]; then
      info "Installed javy to $BIN_DIR/javy"
      info "Add $BIN_DIR to your PATH, or move the binary to /usr/local/bin"
      exit 0
    fi
  fi
elif command -v wget >/dev/null 2>&1; then
  if ! wget -qO "$tmpdir/asset.gz" "$download_url"; then
    warn "Download failed (wget)"
  else
    gunzip -c "$tmpdir/asset.gz" > "$BIN_DIR/javy" || true
    chmod +x "$BIN_DIR/javy" || true
    if [ -x "$BIN_DIR/javy" ]; then
      info "Installed javy to $BIN_DIR/javy"
      info "Add $BIN_DIR to your PATH, or move the binary to /usr/local/bin"
      exit 0
    fi
  fi
else
  warn "Neither curl nor wget available to download Javy"
fi

warn "Automatic download/install failed or is not available for your platform."
info "Manual install instructions:"
cat <<EOF
  1) Visit: https://github.com/Shopify/javy/releases (or https://github.com/bytecodealliance/javy if project moved)
  2) Download the prebuilt binary for your platform (example: javy-x86_64-linux-${JAVY_VERSION}.gz)
  3) Extract and place the binary in a directory on your PATH, e.g. /usr/local/bin
     Example (Linux/macOS):
       curl -L <asset-url> | gunzip > /usr/local/bin/javy && chmod +x /usr/local/bin/javy
  4) Verify: javy --version
EOF

exit 0
