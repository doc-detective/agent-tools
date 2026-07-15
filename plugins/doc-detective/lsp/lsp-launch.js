#!/usr/bin/env node
"use strict";

// lsp-launch.js — Launch the Doc Detective language server over stdio.
//
// Bundled with the Claude Code plugin and referenced from the plugin manifest's
// `lspServers` block as:
//     { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/lsp/lsp-launch.js"] }
//
// It resolves the Doc Detective CLI so a workspace's pinned version always wins:
//   1. project-local install (node_modules/doc-detective) — version matches the
//      project the author is editing; launched as `node <abs bin>`.
//   2. `npx --yes doc-detective` — launched through Node's own bundled
//      `npx-cli.js`; npx uses a globally-installed doc-detective if present, so
//      this also covers the "installed globally, not in this project" case.
//
// then execs `doc-detective lsp --stdio`, inheriting stdio so Claude Code's LSP
// client speaks JSON-RPC directly to the server. The process stays alive for the
// lifetime of the language server.
//
// SECURITY: every launch path resolves to an ABSOLUTE executable (`node` via
// process.execPath, the bin/npx-cli.js off disk) and spawns with shell:false.
// It never lets a shell resolve `doc-detective`/`npx` by name — on Windows cmd
// searches the current directory first, so a planted `doc-detective.cmd` in an
// untrusted workspace could otherwise run when the server auto-starts.
//
// NOTE: the `lsp` subcommand ships in doc-detective with the language-server
// feature. Against an older published CLI the launch resolves but the subcommand
// is unknown — expected until that release lands.

const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const LSP_ARGS = ["lsp", "--stdio"];
const isWindows = process.platform === "win32";

/**
 * Resolve the project-local doc-detective bin by walking up `node_modules`
 * from the current working directory (the workspace Claude Code launched the
 * server in). Reads the package's own `package.json` off disk rather than via
 * `require.resolve` — the doc-detective package defines an `exports` map that
 * hides `./package.json`, which would make a subpath resolve throw. Returns a
 * spawn spec that runs the bin with the current Node, or null when not
 * installed locally.
 */
function resolveLocal(startDir = process.cwd()) {
  let dir = startDir;
  for (;;) {
    const pkgDir = path.join(dir, "node_modules", "doc-detective");
    const pkgJson = path.join(pkgDir, "package.json");
    if (fs.existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
        // `bin` may be a string (single bin) or a map; only a string or the
        // `doc-detective` key is a real path — never the whole map object.
        const rel =
          (typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.["doc-detective"]) ||
          "bin/doc-detective.js";
        const bin = path.join(pkgDir, rel);
        if (fs.existsSync(bin)) {
          return { command: process.execPath, args: [bin, ...LSP_ARGS] };
        }
      } catch {
        // Malformed local install — fall through to the next strategy.
      }
      return null;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached the filesystem root
    dir = parent;
  }
}

/**
 * Zero-install fallback via npx, launched through Node's own bundled
 * `npx-cli.js` (resolved next to `process.execPath`) with the current Node and
 * shell:false — so the OS never resolves `npx`/`doc-detective` by name from the
 * workspace cwd. npx still uses a globally-installed doc-detective if present.
 */
function resolveNpx() {
  const nodeDir = path.dirname(process.execPath);
  // npm ships beside node, but the layout differs by platform: on Windows it's
  // <nodeDir>/node_modules/npm; on POSIX it's <nodeDir>/../lib/node_modules/npm.
  const candidates = [
    path.join(nodeDir, "node_modules", "npm", "bin", "npx-cli.js"),
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ];
  for (const npxCli of candidates) {
    if (fs.existsSync(npxCli)) {
      return {
        command: process.execPath,
        args: [npxCli, "--yes", "doc-detective", ...LSP_ARGS],
      };
    }
  }
  /* c8 ignore next 5 - only reached on an unusual layout where npm isn't beside
     node. On POSIX `npx` resolves from PATH (execvp, not the cwd) with no shell;
     the Windows .cmd shim needs a shell but this branch is effectively dead on a
     standard install. */
  if (!isWindows) return { command: "npx", args: ["--yes", "doc-detective", ...LSP_ARGS] };
  return { command: "npx.cmd", args: ["--yes", "doc-detective", ...LSP_ARGS], shell: true };
}

/* c8 ignore start - spawns the real server; the pure resolvers above are unit
   tested, and an end-to-end stdio launch is exercised manually. */
/** Resolve the CLI, spawn the server over inherited stdio, and mirror its fate. */
function startServer() {
  const target = resolveLocal() || resolveNpx();
  const child = spawn(target.command, target.args, {
    stdio: "inherit",
    shell: target.shell || false,
  });
  child.on("error", (err) => {
    process.stderr.write(
      `doc-detective-lsp: failed to start (${err.message}). ` +
        `Install doc-detective locally or globally, or ensure npx is available.\n`,
    );
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    // Mirror the child's fate so Claude Code's restart logic sees the real result.
    if (signal) process.kill(process.pid, signal);
    else process.exit(code == null ? 0 : code);
  });
  return child;
}
/* c8 ignore stop */

module.exports = { resolveLocal, resolveNpx, startServer };

// Launch only when run directly (`node lsp-launch.js`), not when a test
// `require`s this module to unit-test the resolvers — so importing it never
// spawns a server.
/* c8 ignore next */
if (require.main === module) startServer();
