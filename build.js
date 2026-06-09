#!/usr/bin/env node

// build.js — Build agent-tools from src/ into downstream artifact directories.
//
// Source of truth:
//   src/agents/                           → agent definitions
//   src/skills/                           → skill implementations (SKILL.md, references/, scripts/)
//   src/mcp-servers.json                  → canonical MCP server registry (fanned out per host)
//   package.json                          → version
//
// Generated/synced artifact directories (do not edit directly):
//   agents/                                          ← copied from src/agents/
//   skills/                                          ← copied from src/skills/
//   commands/*.md                                    ← generated from src/skills/*/SKILL.md (user-invocable: true)
//   commands/*.toml                                  ← generated from commands/*.md
//   hooks/                                           ← copied from src/hooks/ (cursor-hooks.json removed; lives only in the plugin)
//   plugins/doc-detective/hooks/cursor-hooks.json    ← Cursor hooks (routed through cursor-hook-adapter.js)
//   plugins/doc-detective/{agents,skills}/           ← copied from agents/, skills/
//   plugins/doc-detective/hooks/                     ← copied from src/hooks/ (claude-hooks.json renamed to hooks.json)
//   plugins/doc-detective/opencode-plugin.mjs        ← copied from src/hooks/opencode-plugin.mjs
//   .claude-plugin/marketplace.json                  ← version from package.json
//   .cursor-plugin/marketplace.json                  ← version from package.json (custom "Import from Repo" marketplace)
//   plugins/doc-detective/.claude-plugin/plugin.json ← version + mcpServers from package.json + src/mcp-servers.json
//   plugins/doc-detective/.codex-plugin/plugin.json  ← version from package.json + mcpServers pointer
//   plugins/doc-detective/.mcp.json                  ← Codex MCP registration from src/mcp-servers.json
//   plugins/doc-detective/README.md                  ← generated from plugin.json + skill/agent frontmatter (functionality only)
//   plugins/doc-detective/LICENSE                     ← copied from repo-root LICENSE
//   plugins/doc-detective/.cursor-plugin/plugin.json ← version + inline mcpServers from package.json + src/mcp-servers.json
//   plugins/doc-detective/rules/*.mdc                ← rendered from src/rules/*.md (Cursor rules)
//   gemini-extension.json                            ← version + mcpServers from package.json + src/mcp-servers.json
//   qwen-extension.json                              ← version + mcpServers from package.json + src/mcp-servers.json
//
// user-invocable field pattern:
//   src/skills/*/SKILL.md stores `user-invocable` nested under `metadata:` (e.g.
//   `metadata.user-invocable: true`). This is the canonical source of truth.
//
//   Two consumers read this field:
//     1. generateCommands() — reads it via getMetadataUserInvocable() to decide
//        whether to emit a commands/*.md file for the skill.
//     2. syncPluginDir() — after copying skills into plugins/doc-detective/skills/,
//        calls injectRootUserInvocable() to write a root-level `user-invocable:`
//        line into each plugin SKILL.md. Claude reads the root frontmatter level,
//        so this injection is required for the plugin to honour the flag.
//
//   skills/ (root artifact) and src/skills/ do NOT get the injected root field —
//   the metadata-nested form is intentional there.
//
// Usage:
//   node build.js           # full build (sync + copy + build scripts)
//   node build.js --no-scripts  # skip JS bundle builds

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const SKIP_SCRIPTS = process.argv.includes("--no-scripts");

// Directories to exclude when copying to the plugin directory
const COPY_EXCLUDES = new Set([
  "node_modules",
  ".git",
  "bun.lock",
  ".DS_Store",
]);

// Subdirectories to exclude when inside a scripts/ directory
// (build sources and test fixtures belong in src/, not in output artifacts)
const SCRIPTS_DIR_EXCLUDES = new Set(["src", "dist"]);

// ─── Helpers ─────────────────────────────────────────────────

function log(msg) {
  console.log(msg);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/** Parse YAML frontmatter from a Markdown file. */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const metaStr = match[1];
  const body = match[2];

  // Simple single-line key: value parser (sufficient for our frontmatter)
  const meta = {};
  for (const line of metaStr.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }

  return { meta, body };
}

/** Recursively copy a directory, skipping excluded names. */
function copyDirRecursive(src, dest, insideScripts = false) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (COPY_EXCLUDES.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (insideScripts && SCRIPTS_DIR_EXCLUDES.has(entry.name)) continue;
      copyDirRecursive(srcPath, destPath, insideScripts || entry.name === "scripts");
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Extract user-invocable from the metadata: block in raw frontmatter. Defaults to true. */
function getMetadataUserInvocable(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return true;
  const m = fmMatch[1].match(/^\s+user-invocable:\s*['"]?(true|false)['"]?\s*$/m);
  return m ? m[1] === "true" : true;
}

/**
 * Extract an indented (metadata-block) single-line field from raw frontmatter,
 * e.g. `abstract`. Returns the trimmed value with surrounding YAML quotes
 * stripped, or "" if absent. parseFrontmatter() only captures top-level keys,
 * so nested metadata fields need this.
 */
function getMetadataField(content, field) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return "";
  const re = new RegExp(`^\\s+${field}:\\s*(.+)$`, "m");
  const m = fmMatch[1].match(re);
  if (!m) return "";
  return m[1].trim().replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
}

/** Returns the current build date as "Month YYYY" (e.g., "March 2026"). */
function getCurrentDate() {
  const d = new Date();
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Updates (or inserts) version: and date: lines within the metadata: block
 * of a YAML frontmatter string. If no metadata: block exists, injects one
 * before the closing ---.
 */
function updateFrontmatterMetadata(content, version, date, organization) {
  let updated = content
    .replace(/^(\s+version:\s*)(['"]?)[^\n]*\2\s*$/m, `$1'${version}'`)
    .replace(/^(\s+date:\s*)[^\n]*$/m, `$1${date}`);

  // Upsert organization: within existing metadata block
  if (/^metadata:/m.test(updated)) {
    if (/^\s+organization:/m.test(updated)) {
      updated = updated.replace(/^(\s+organization:\s*)[^\n]*$/m, `$1${organization}`);
    } else {
      updated = updated.replace(/^(metadata:)/m, `$1\n  organization: ${organization}`);
    }
  } else {
    // Inject full metadata block before closing ---
    updated = updated.replace(
      /^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/,
      `$1\nmetadata:\n  version: '${version}'\n  organization: ${organization}\n  date: ${date}$2`
    );
  }

  return updated;
}

/** Inject root-level user-invocable into frontmatter, derived from metadata block. */
function injectRootUserInvocable(content) {
  const m = content.match(/^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/);
  if (!m) return content;
  const value = getMetadataUserInvocable(content);
  return m[1] + "\nuser-invocable: " + value + m[2] + content.slice(m[0].length);
}

// ─── 0. Clean output directories ─────────────────────────────

function cleanOutputDirs() {
  log("Cleaning output directories...");

  const dirs = [
    "agents",
    "skills",
    "hooks",
    "commands",
    "plugins/doc-detective/agents",
    "plugins/doc-detective/skills",
    "plugins/doc-detective/hooks",
    "plugins/doc-detective/rules",
  ];

  for (const dir of dirs) {
    const target = path.join(ROOT, dir);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true });
    }
    fs.mkdirSync(target, { recursive: true });
    log(`  cleared ${dir}/`);
  }
}

// ─── 1. Sync version across config files ─────────────────────

function syncVersions() {
  const pkg = readJSON(path.join(ROOT, "package.json"));
  const version = pkg.version;
  log(`Version: ${version}`);

  // .claude-plugin/marketplace.json
  const mpPath = path.join(ROOT, ".claude-plugin/marketplace.json");
  const mp = readJSON(mpPath);
  mp.metadata.version = version;
  writeJSON(mpPath, mp);
  log("  .claude-plugin/marketplace.json");

  // .cursor-plugin/marketplace.json (enables "Import from Repo" custom marketplace)
  const cursorMpPath = path.join(ROOT, ".cursor-plugin/marketplace.json");
  if (fs.existsSync(cursorMpPath)) {
    const cursorMp = readJSON(cursorMpPath);
    if (cursorMp.metadata) cursorMp.metadata.version = version;
    writeJSON(cursorMpPath, cursorMp);
    log("  .cursor-plugin/marketplace.json");
  }

  // plugins/doc-detective/.claude-plugin/plugin.json
  const pjPath = path.join(
    ROOT,
    "plugins/doc-detective/.claude-plugin/plugin.json"
  );
  const pj = readJSON(pjPath);
  pj.version = version;
  writeJSON(pjPath, pj);
  log("  plugins/doc-detective/.claude-plugin/plugin.json");

  // gemini-extension.json
  const gePath = path.join(ROOT, "gemini-extension.json");
  const ge = readJSON(gePath);
  ge.version = version;
  writeJSON(gePath, ge);
  log("  gemini-extension.json");

  // qwen-extension.json (optional — created if present)
  const qePath = path.join(ROOT, "qwen-extension.json");
  if (fs.existsSync(qePath)) {
    const qe = readJSON(qePath);
    qe.version = version;
    writeJSON(qePath, qe);
    log("  qwen-extension.json");
  }

  // plugins/doc-detective/.codex-plugin/plugin.json
  const codexPath = path.join(
    ROOT,
    "plugins/doc-detective/.codex-plugin/plugin.json"
  );
  const codex = readJSON(codexPath);
  codex.version = version;
  writeJSON(codexPath, codex);
  log("  plugins/doc-detective/.codex-plugin/plugin.json");

  // plugins/doc-detective/.cursor-plugin/plugin.json
  const cursorPath = path.join(
    ROOT,
    "plugins/doc-detective/.cursor-plugin/plugin.json"
  );
  const cursor = readJSON(cursorPath);
  cursor.version = version;
  writeJSON(cursorPath, cursor);
  log("  plugins/doc-detective/.cursor-plugin/plugin.json");
}

// ─── 1b. Sync MCP server registrations across host configs ───

/**
 * Reads src/mcp-servers.json and writes the host-specific registration shape
 * into each host config that ships in this repo. Idempotent: re-running
 * re-stamps the entries; never duplicates.
 *
 * Host shapes:
 *   Claude Code  → mcpServers: { name: { type: "http", url, headers } }
 *   Gemini CLI   → mcpServers: { name: { httpUrl, headers } }
 *   Qwen Code    → mcpServers: { name: { httpUrl, headers } }   (mirrors Gemini)
 *   Codex        → bundled plugins/doc-detective/.mcp.json
 *                  ({ mcpServers: { name: { type, url, headers } } }) referenced
 *                  by `mcpServers: "./.mcp.json"` in .codex-plugin/plugin.json.
 *
 * OpenCode is hand-edited rather than templated — see the `mcp` block in
 * the default export of `src/hooks/opencode-plugin.mjs` (the source of truth;
 * `syncHooks()` copies it to `plugins/doc-detective/opencode-plugin.mjs` on
 * build, so editing the artifact directly will be overwritten).
 */
function syncMcpServers() {
  const registryPath = path.join(ROOT, "src/mcp-servers.json");
  if (!fs.existsSync(registryPath)) {
    throw new Error(
      "Missing required file: src/mcp-servers.json (canonical MCP server registry)"
    );
  }

  log("\nSyncing MCP server registrations...");
  const registry = readJSON(registryPath);

  // Build per-host mcpServers blocks.
  const claudeBlock = {};
  const geminiBlock = {};
  const qwenBlock = {};
  const codexBlock = {};
  const cursorBlock = {};

  for (const [name, spec] of Object.entries(registry)) {
    // Validate registry entry shape so a malformed entry can't silently
    // produce broken host manifests.
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
      throw new Error(`Invalid MCP entry "${name}": expected an object`);
    }
    if (spec.enabled === false) continue;
    if (typeof spec.url !== "string" || spec.url.trim() === "") {
      throw new Error(
        `Invalid MCP entry "${name}": "url" must be a non-empty string`
      );
    }
    if (
      spec.clientNames !== undefined &&
      (typeof spec.clientNames !== "object" || Array.isArray(spec.clientNames))
    ) {
      throw new Error(
        `Invalid MCP entry "${name}": "clientNames" must be an object when present`
      );
    }

    const cn = spec.clientNames || {};
    const claudeClient = cn["claude-code"] || "claude-code";
    const geminiClient = cn["gemini-cli"] || "gemini-cli";
    const qwenClient = cn["qwen-code"] || "qwen-code";
    const codexClient = cn["codex"] || "codex";
    const cursorClient = cn["cursor"] || "cursor";

    claudeBlock[name] = {
      type: "http",
      url: spec.url,
      headers: { "X-DD-Client": claudeClient },
    };
    geminiBlock[name] = {
      httpUrl: spec.url,
      headers: { "X-DD-Client": geminiClient },
    };
    qwenBlock[name] = {
      httpUrl: spec.url,
      headers: { "X-DD-Client": qwenClient },
    };
    // Codex's bundled .mcp.json uses the same remote-MCP JSON shape as Claude
    // (type/url/headers). HTTP servers REQUIRE an explicit `type: "http"`, or
    // Codex rejects the entry with "invalid transport".
    codexBlock[name] = {
      type: "http",
      url: spec.url,
      headers: { "X-DD-Client": codexClient },
    };
    // Cursor's plugin manifest accepts an inline mcpServers map using the same
    // remote-MCP shape (type/url/headers). HTTP servers REQUIRE `type: "http"`.
    cursorBlock[name] = {
      type: "http",
      url: spec.url,
      headers: { "X-DD-Client": cursorClient },
    };
  }

  // Claude Code plugin manifest
  const claudePath = path.join(
    ROOT,
    "plugins/doc-detective/.claude-plugin/plugin.json"
  );
  if (fs.existsSync(claudePath)) {
    const claude = readJSON(claudePath);
    if (Object.keys(claudeBlock).length > 0) {
      claude.mcpServers = claudeBlock;
    } else {
      delete claude.mcpServers;
    }
    writeJSON(claudePath, claude);
    log("  plugins/doc-detective/.claude-plugin/plugin.json (mcpServers)");
  }

  // Gemini extension
  const geminiPath = path.join(ROOT, "gemini-extension.json");
  if (fs.existsSync(geminiPath)) {
    const gemini = readJSON(geminiPath);
    if (Object.keys(geminiBlock).length > 0) {
      gemini.mcpServers = geminiBlock;
    } else {
      delete gemini.mcpServers;
    }
    writeJSON(geminiPath, gemini);
    log("  gemini-extension.json (mcpServers)");
  }

  // Qwen extension (mirrors Gemini shape)
  const qwenPath = path.join(ROOT, "qwen-extension.json");
  if (fs.existsSync(qwenPath)) {
    const qwen = readJSON(qwenPath);
    if (Object.keys(qwenBlock).length > 0) {
      qwen.mcpServers = qwenBlock;
    } else {
      delete qwen.mcpServers;
    }
    writeJSON(qwenPath, qwen);
    log("  qwen-extension.json (mcpServers)");
  }

  // Codex: bundle a .mcp.json at the plugin root and point the manifest at it.
  // Codex consumes the `mcpServers` manifest field (a relative path to a
  // .mcp.json) so the server auto-registers on install — matching the
  // auto-registration the other hosts get, instead of manual config.toml edits.
  const codexMcpPath = path.join(ROOT, "plugins/doc-detective/.mcp.json");
  const codexManifestPath = path.join(
    ROOT,
    "plugins/doc-detective/.codex-plugin/plugin.json"
  );
  if (fs.existsSync(codexManifestPath)) {
    const codexManifest = readJSON(codexManifestPath);
    if (Object.keys(codexBlock).length > 0) {
      // The wrapper key must be camelCase `mcpServers`; Codex treats any other
      // top-level key (e.g. snake_case `mcp_servers`) as a server name.
      writeJSON(codexMcpPath, { mcpServers: codexBlock });
      codexManifest.mcpServers = "./.mcp.json";
      log("  plugins/doc-detective/.mcp.json (mcpServers)");
    } else {
      fs.rmSync(codexMcpPath, { force: true });
      delete codexManifest.mcpServers;
    }
    writeJSON(codexManifestPath, codexManifest);
    log("  plugins/doc-detective/.codex-plugin/plugin.json (mcpServers)");
  }

  // Cursor plugin manifest: inline mcpServers map (server auto-registers on install).
  const cursorManifestPath = path.join(
    ROOT,
    "plugins/doc-detective/.cursor-plugin/plugin.json"
  );
  if (fs.existsSync(cursorManifestPath)) {
    const cursorManifest = readJSON(cursorManifestPath);
    if (Object.keys(cursorBlock).length > 0) {
      cursorManifest.mcpServers = cursorBlock;
    } else {
      delete cursorManifest.mcpServers;
    }
    writeJSON(cursorManifestPath, cursorManifest);
    log("  plugins/doc-detective/.cursor-plugin/plugin.json (mcpServers)");
  }
}

// ─── 2. Sync metadata (version + date) in source files ───────

function syncMetadataInSourceFiles() {
  const pkg = readJSON(path.join(ROOT, "package.json"));
  const version = pkg.version;
  const date = getCurrentDate();
  const organization = "Doc Detective";
  log(`\nSyncing metadata in source files (version: ${version}, date: ${date})...`);

  // Update skills
  const skillsDir = path.join(ROOT, "src/skills");
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    const original = fs.readFileSync(skillMdPath, "utf8");
    const updated = updateFrontmatterMetadata(original, version, date, organization);
    if (updated !== original) {
      fs.writeFileSync(skillMdPath, updated);
      log(`  updated src/skills/${entry.name}/SKILL.md`);
    }
  }

  // Update agents
  const agentsDir = path.join(ROOT, "src/agents");
  for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const agentPath = path.join(agentsDir, entry.name);
    const original = fs.readFileSync(agentPath, "utf8");
    const updated = updateFrontmatterMetadata(original, version, date, organization);
    if (updated !== original) {
      fs.writeFileSync(agentPath, updated);
      log(`  updated src/agents/${entry.name}`);
    }
  }
}

// ─── 4. Copy src/ to artifact directories ───────────────────

function syncSourceToArtifacts() {
  log("\nSyncing src/ to artifact directories...");

  for (const dir of ["agents", "skills"]) {
    copyDirRecursive(path.join(ROOT, "src", dir), path.join(ROOT, dir));
    log(`  src/${dir}/ -> ${dir}/`);
  }
}

// ─── 5. Generate command Markdown files from user-invocable skills ──────────

/**
 * Derive command filename from a skill name.
 * "generate" → "generate"
 * Falls back to stripping a colon prefix if present.
 */
function skillNameToCommandFile(skillName) {
  const colon = skillName.lastIndexOf(":");
  return colon >= 0 ? skillName.slice(colon + 1) : skillName;
}

function generateCommands() {
  log("\nGenerating command Markdown files from skills...");

  const skillsDir = path.join(ROOT, "src/skills");
  const cmdDir = path.join(ROOT, "commands");
  fs.mkdirSync(cmdDir, { recursive: true });

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, "utf8");
    const { meta, body } = parseFrontmatter(content);

    if (!getMetadataUserInvocable(content)) continue;

    const skillName = meta["name"] || entry.name;
    // Strip surrounding YAML quotes (single or double) from description
    const rawDesc = meta["description"] || "";
    const description = rawDesc.replace(/^(['"])(.*)\1$/, "$2");
    const cmdFile = skillNameToCommandFile(skillName) + ".md";

    const commandMd = [
      `---`,
      `description: ${description}`,
      `skill: ${skillName}`,
      `---`,
      ``,
      body.trim(),
      ``,
    ].join("\n");

    const cmdPath = path.join(cmdDir, cmdFile);
    fs.writeFileSync(cmdPath, commandMd);
    log(`  skills/${entry.name}/SKILL.md -> commands/${cmdFile}`);
  }
}

// ─── 4. Generate TOML command files from Markdown sources ────

function generateTomls() {
  log("\nGenerating command TOML files...");

  const cmdDir = path.join(ROOT, "commands");
  const tomlDir = cmdDir;

  fs.mkdirSync(tomlDir, { recursive: true });

  const mdFiles = fs
    .readdirSync(cmdDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const mdFile of mdFiles) {
    const name = path.basename(mdFile, ".md");
    const content = fs.readFileSync(path.join(cmdDir, mdFile), "utf8");
    const { meta, body } = parseFrontmatter(content);

    const description = meta.description || name;
    const skillName = meta.skill || name;

    // Strip the YAML frontmatter header and trailing whitespace from the body.
    // Everything after the frontmatter becomes the TOML prompt value.
    const trimmedBody = body.trim();

    // Build TOML with an auto-generated header comment
    const toml = [
      `# AUTO-GENERATED — DO NOT EDIT`,
      `# Source: src/skills/${skillNameToCommandFile(skillName)}/SKILL.md`,
      `# Regenerate: npm run build`,
      ``,
      `prompt = """${trimmedBody}`,
      `"""`,
      `description="""${description}"""`,
      ``,
    ].join("\n");

    const tomlPath = path.join(tomlDir, `${name}.toml`);
    fs.writeFileSync(tomlPath, toml);
    log(`  commands/${mdFile} -> commands/${name}.toml`);
  }
}

// ─── 5. Sync hooks to artifact directories ──────────────────

function syncHooks() {
  log("\nSyncing hooks...");

  const srcHooksDir = path.join(ROOT, "src/hooks");
  if (!fs.existsSync(srcHooksDir)) {
    throw new Error("Missing required directory: src/hooks");
  }

  // Copy to root-level hooks/ artifact (Gemini extension reads hooks/hooks.json here)
  const rootHooksDir = path.join(ROOT, "hooks");
  copyDirRecursive(srcHooksDir, rootHooksDir);

  // Root hooks/: rename gemini-hooks.json -> hooks.json, remove claude-hooks.json
  const rootGemini = path.join(rootHooksDir, "gemini-hooks.json");
  const rootHooksDest = path.join(rootHooksDir, "hooks.json");
  if (!fs.existsSync(rootGemini)) {
    throw new Error("Missing required file: src/hooks/gemini-hooks.json");
  }
  fs.rmSync(rootHooksDest, { force: true });
  fs.renameSync(rootGemini, rootHooksDest);
  const rootClaude = path.join(rootHooksDir, "claude-hooks.json");
  if (fs.existsSync(rootClaude)) {
    fs.unlinkSync(rootClaude);
  }
  // The Cursor hooks config and its adapter belong only to the Cursor plugin,
  // not the Gemini root artifact. Remove both so they aren't shipped to Gemini.
  const rootCursor = path.join(rootHooksDir, "cursor-hooks.json");
  if (fs.existsSync(rootCursor)) {
    fs.unlinkSync(rootCursor);
  }
  const rootCursorAdapter = path.join(rootHooksDir, "scripts", "cursor-hook-adapter.js");
  if (fs.existsSync(rootCursorAdapter)) {
    fs.unlinkSync(rootCursorAdapter);
  }

  log("  src/hooks/ -> hooks/ (gemini-hooks.json -> hooks.json)");

  // Copy to Claude Code plugin directory
  const pluginHooksDir = path.join(ROOT, "plugins/doc-detective/hooks");
  copyDirRecursive(srcHooksDir, pluginHooksDir);

  // Plugin hooks/: rename claude-hooks.json -> hooks.json, remove gemini-hooks.json
  const pluginClaude = path.join(pluginHooksDir, "claude-hooks.json");
  const pluginHooksDest = path.join(pluginHooksDir, "hooks.json");
  if (!fs.existsSync(pluginClaude)) {
    throw new Error("Missing required file: src/hooks/claude-hooks.json");
  }
  fs.rmSync(pluginHooksDest, { force: true });
  fs.renameSync(pluginClaude, pluginHooksDest);
  const pluginGemini = path.join(pluginHooksDir, "gemini-hooks.json");
  if (fs.existsSync(pluginGemini)) {
    fs.unlinkSync(pluginGemini);
  }

  // cursor-hooks.json stays in the plugin hooks dir; the Cursor manifest
  // references it via "hooks": "./hooks/cursor-hooks.json". The adapter script
  // (cursor-hook-adapter.js) was copied with the rest of scripts/.
  // The Cursor manifest references ./hooks/cursor-hooks.json, so a missing copy
  // would silently ship a broken hooks reference. Fail the build instead
  // (parallel to the claude-hooks.json check above).
  const pluginCursorHooks = path.join(pluginHooksDir, "cursor-hooks.json");
  if (!fs.existsSync(pluginCursorHooks)) {
    throw new Error(
      "Missing required file: src/hooks/cursor-hooks.json (Cursor plugin hooks config)"
    );
  }
  log("  src/hooks/cursor-hooks.json -> plugins/doc-detective/hooks/cursor-hooks.json");

  log("  src/hooks/ -> plugins/doc-detective/hooks/ (claude-hooks.json -> hooks.json)");

  // Remove OpenCode plugin from platform-specific hook directories
  // (it lives at plugins/doc-detective/opencode-plugin.mjs, not inside hooks/)
  for (const dir of [rootHooksDir, pluginHooksDir]) {
    const ocPlugin = path.join(dir, "opencode-plugin.mjs");
    if (fs.existsSync(ocPlugin)) {
      fs.unlinkSync(ocPlugin);
    }
  }

  // Copy OpenCode plugin to plugin directory root (next to agents/, skills/, hooks/)
  const ocSrc = path.join(srcHooksDir, "opencode-plugin.mjs");
  const ocDest = path.join(ROOT, "plugins/doc-detective/opencode-plugin.mjs");
  fs.rmSync(ocDest, { force: true });
  if (fs.existsSync(ocSrc)) {
    fs.copyFileSync(ocSrc, ocDest);
    log("  src/hooks/opencode-plugin.mjs -> plugins/doc-detective/opencode-plugin.mjs");
  }

  // Make .sh files executable in both output locations
  for (const dir of [path.join(ROOT, "hooks/scripts"), path.join(pluginHooksDir, "scripts")]) {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".sh")) {
          fs.chmodSync(path.join(dir, f), 0o755);
        }
      }
    }
  }
}

// ─── 6. Copy content to plugin directory ─────────────────────

function syncPluginDir() {
  log("\nSyncing plugin directory...");

  const pluginDir = path.join(ROOT, "plugins/doc-detective");

  // commands/ is intentionally excluded — commands are accessed via skills/
  for (const dir of ["agents", "skills"]) {
    copyDirRecursive(path.join(ROOT, dir), path.join(pluginDir, dir));
    log(`  ${dir}/ -> plugins/doc-detective/${dir}/`);
  }

  // Inject root-level user-invocable into each plugin SKILL.md
  const pluginSkillsDir = path.join(pluginDir, "skills");
  for (const entry of fs.readdirSync(pluginSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(pluginSkillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    const updated = injectRootUserInvocable(fs.readFileSync(skillMdPath, "utf8"));
    fs.writeFileSync(skillMdPath, updated);
    log(`  Injected user-invocable into plugins/doc-detective/skills/${entry.name}/SKILL.md`);
  }
}

// ─── 6b. Generate plugin README + LICENSE ────────────────────

/**
 * Generate plugins/doc-detective/README.md from the source of truth
 * (plugin.json + skill/agent frontmatter) and copy the repo LICENSE into the
 * plugin directory. The README documents *functionality* only — it omits
 * plugin- and harness-specific installation instructions on purpose, since
 * those live in the repo-root README and vary per host.
 */
function generatePluginDocs() {
  log("\nGenerating plugin README + LICENSE...");

  const pluginDir = path.join(ROOT, "plugins/doc-detective");
  const pj = readJSON(path.join(pluginDir, ".claude-plugin/plugin.json"));

  // Collect skills (from source of truth), split user-invocable vs. internal.
  const skillsDir = path.join(ROOT, "src/skills");
  const userSkills = [];
  const internalSkills = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    const content = fs.readFileSync(skillMdPath, "utf8");
    const { meta } = parseFrontmatter(content);
    const name = meta["name"] || entry.name;
    // Prefer the human-readable abstract; fall back to the trigger description.
    const summary =
      getMetadataField(content, "abstract") ||
      (meta["description"] || "").replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
    const target = getMetadataUserInvocable(content) ? userSkills : internalSkills;
    target.push({ name, summary });
  }

  // Collect agents.
  const agentsDir = path.join(ROOT, "src/agents");
  const agents = [];
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const content = fs.readFileSync(path.join(agentsDir, entry.name), "utf8");
      const { meta } = parseFrontmatter(content);
      const name = meta["name"] || path.basename(entry.name, ".md");
      // Agent descriptions embed long example blocks; keep only the lead-in.
      // The frontmatter is single-line YAML with escaped "\n" sequences (two
      // characters: backslash + n), not real newlines — so split on either
      // form to be robust to both representations.
      const rawDesc = (meta["description"] || "").replace(/^(['"])([\s\S]*)\1$/, "$2");
      const summary = rawDesc.split(/\r?\n|\\n/)[0].trim();
      agents.push({ name, summary });
    }
  }

  const lines = [];
  lines.push(`# ${pj.name || "plugin"}`, "");
  if (pj.description) lines.push(pj.description, "");
  if (pj.homepage) {
    lines.push(`Learn more at [${pj.homepage}](${pj.homepage}).`, "");
  }

  if (userSkills.length) {
    lines.push("## Commands", "");
    lines.push("Invoke these slash commands directly:", "");
    for (const s of userSkills) lines.push(`- **\`/${s.name}\`** — ${s.summary}`);
    lines.push("");
  }

  if (internalSkills.length) {
    lines.push("## Supporting skills", "");
    lines.push(
      "Invoked automatically when relevant, not run directly:",
      ""
    );
    for (const s of internalSkills) lines.push(`- **${s.name}** — ${s.summary}`);
    lines.push("");
  }

  if (agents.length) {
    lines.push("## Agents", "");
    for (const a of agents) lines.push(`- **${a.name}** — ${a.summary}`);
    lines.push("");
  }

  const mcpNames = pj.mcpServers ? Object.keys(pj.mcpServers) : [];
  if (mcpNames.length) {
    const label = mcpNames.length === 1 ? "server" : "servers";
    const names = mcpNames.map((n) => `\`${n}\``).join(", ");
    lines.push(`## MCP ${label}`, "");
    lines.push(
      `Bundles the ${names} MCP ${label}, giving the agent direct access to Doc Detective's documentation-testing engine.`,
      ""
    );
  }

  if (pj.license) {
    lines.push("## License", "");
    lines.push(`Licensed under ${pj.license}. See [LICENSE](./LICENSE).`, "");
  }

  const readmePath = path.join(pluginDir, "README.md");
  fs.writeFileSync(readmePath, lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
  log("  plugins/doc-detective/README.md");

  // Copy the repo LICENSE into the plugin directory. Required: a plugin
  // package shipped without its license is invalid, so fail the build loudly
  // rather than emit an undocumented package.
  const srcLicense = path.join(ROOT, "LICENSE");
  if (!fs.existsSync(srcLicense)) {
    throw new Error(
      "Missing required file: LICENSE (repo-root license needed to package the plugin)"
    );
  }
  fs.copyFileSync(srcLicense, path.join(pluginDir, "LICENSE"));
  log("  plugins/doc-detective/LICENSE");
}

// ─── 6c. Render rules to per-host formats ────────────────────

/**
 * Renders the canonical, harness-neutral rule sources in src/rules/*.md into
 * each host's native "persistent rules" format. Today this emits Cursor `.mdc`
 * rules (frontmatter keys description/globs/alwaysApply are already
 * .mdc-compatible, so the render is a copy with the extension changed).
 *
 * Single source of truth: src/rules/. The follow-up task fans the same sources
 * out to Gemini (GEMINI.md), Codex/OpenCode (AGENTS.md), and a Claude skill.
 */
function renderRules() {
  const srcRulesDir = path.join(ROOT, "src/rules");
  if (!fs.existsSync(srcRulesDir)) {
    log("\nNo src/rules/ — skipping rules render.");
    return;
  }

  log("\nRendering rules...");

  // Cursor: src/rules/<name>.md -> plugins/doc-detective/rules/<name>.mdc
  const cursorRulesDir = path.join(ROOT, "plugins/doc-detective/rules");
  fs.mkdirSync(cursorRulesDir, { recursive: true });
  for (const entry of fs.readdirSync(srcRulesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const base = path.basename(entry.name, ".md");
    const content = fs.readFileSync(path.join(srcRulesDir, entry.name), "utf8");

    // Validate Cursor .mdc frontmatter so a malformed rule fails the build
    // rather than silently shipping a rule Cursor can't apply. Cursor rules
    // require `description`; `globs` + `alwaysApply` govern when they attach.
    const { meta } = parseFrontmatter(content);
    const missing = ["description", "alwaysApply"].filter((k) => !(k in meta));
    if (missing.length) {
      throw new Error(
        `Invalid rule src/rules/${entry.name}: missing frontmatter key(s): ${missing.join(", ")}`
      );
    }

    fs.writeFileSync(path.join(cursorRulesDir, `${base}.mdc`), content);
    log(`  src/rules/${entry.name} -> plugins/doc-detective/rules/${base}.mdc`);
  }
}

// ─── 6. Build skill scripts ──────────────────────────────────

function buildSkillScripts() {
  if (SKIP_SCRIPTS) {
    log("\nSkipping script builds (--no-scripts)");
    return;
  }

  log("\nBuilding skill scripts...");

  const skills = [
    { name: "doc-testing", dir: "src/skills/doc-detective-doc-testing/scripts/src" },
    {
      name: "inline-test-injection",
      dir: "src/skills/doc-detective-inline-test-injection/scripts/src",
    },
  ];

  for (const skill of skills) {
    const dir = path.join(ROOT, skill.dir);
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, "package.json"))) {
      try {
        execSync("npm install && npm run build", {
          cwd: dir,
          stdio: "inherit",
        });
        log(`  ${skill.name} built`);
      } catch (e) {
        log(`  WARNING: ${skill.name} build failed: ${e.message}`);
      }
    } else {
      log(`  ${skill.name}: src/ not found, skipping`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────

log("Building agent-tools...\n");

cleanOutputDirs();
syncVersions();
syncMcpServers();
syncMetadataInSourceFiles();
buildSkillScripts();
syncSourceToArtifacts();
syncHooks();
generateCommands();
generateTomls();
syncPluginDir();
generatePluginDocs();
renderRules();

log("\nBuild complete!");
