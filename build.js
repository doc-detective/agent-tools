#!/usr/bin/env node

// build.js — Sync content from repo root into all downstream targets.
//
// Source of truth (repo root):
//   package.json           → version
//   commands/*.md           → command prompts (generate TOML files)
//   agents/                 → agent definitions
//   skills/                 → skill implementations
//
// Generated/synced targets:
//   commands/doc-detective/*.toml                    ← from commands/*.md
//   plugins/doc-detective/{agents,commands,skills}/  ← copied from root
//   .claude-plugin/marketplace.json                  ← version from package.json
//   plugins/doc-detective/.claude-plugin/plugin.json ← version from package.json
//   gemini-extension.json                            ← version from package.json
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
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (COPY_EXCLUDES.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
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
}

// ─── 2. Generate TOML command files from Markdown sources ────

function generateTomls() {
  log("\nGenerating command TOML files...");

  const cmdDir = path.join(ROOT, "commands");
  const tomlDir = path.join(cmdDir, "doc-detective");

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

    // Strip the YAML frontmatter header and trailing whitespace from the body.
    // Everything after the frontmatter becomes the TOML prompt value.
    const trimmedBody = body.trim();

    // Build TOML with an auto-generated header comment
    const toml = [
      `# AUTO-GENERATED — DO NOT EDIT`,
      `# Source: commands/${mdFile}`,
      `# Regenerate: npm run build`,
      ``,
      `prompt = """${trimmedBody}`,
      `"""`,
      `description="""${description}"""`,
      ``,
    ].join("\n");

    const tomlPath = path.join(tomlDir, `${name}.toml`);
    fs.writeFileSync(tomlPath, toml);
    log(`  commands/${mdFile} -> commands/doc-detective/${name}.toml`);
  }
}

// ─── 3. Copy content to plugin directory ─────────────────────

function syncPluginDir() {
  log("\nSyncing plugin directory...");

  const pluginDir = path.join(ROOT, "plugins/doc-detective");

  for (const dir of ["agents", "commands", "skills"]) {
    const target = path.join(pluginDir, dir);

    // Remove existing entry (symlink file, real directory, etc.)
    if (fs.existsSync(target)) {
      const stat = fs.lstatSync(target);
      if (stat.isDirectory()) {
        fs.rmSync(target, { recursive: true });
      } else {
        // Symlink stored as a text file (common on WSL/Windows) or actual symlink
        fs.unlinkSync(target);
      }
    }

    // Copy from root
    copyDirRecursive(path.join(ROOT, dir), target);
    log(`  ${dir}/ -> plugins/doc-detective/${dir}/`);
  }
}

// ─── 4. Build skill scripts ──────────────────────────────────

function buildSkillScripts() {
  if (SKIP_SCRIPTS) {
    log("\nSkipping script builds (--no-scripts)");
    return;
  }

  log("\nBuilding skill scripts...");

  const skills = [
    { name: "doc-testing", dir: "skills/doc-testing/scripts/src" },
    {
      name: "inline-test-injection",
      dir: "skills/inline-test-injection/scripts/src",
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

syncVersions();
generateTomls();
syncPluginDir();
buildSkillScripts();

log("\nBuild complete!");
