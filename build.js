#!/usr/bin/env node

// build.js — Build agent-tools from src/ into downstream artifact directories.
//
// Source of truth:
//   src/agents/                           → agent definitions
//   src/skills/                           → skill implementations (SKILL.md, references/, scripts/)
//   package.json                          → version
//
// Generated/synced artifact directories (do not edit directly):
//   agents/                                          ← copied from src/agents/
//   skills/                                          ← copied from src/skills/
//   commands/*.md                                    ← generated from src/skills/*/SKILL.md (user-invocable: true)
//   commands/*.toml                                  ← generated from commands/*.md
//   plugins/doc-detective/{agents,skills}/           ← copied from agents/, skills/
//   .claude-plugin/marketplace.json                  ← version from package.json
//   plugins/doc-detective/.claude-plugin/plugin.json ← version from package.json
//   gemini-extension.json                            ← version from package.json
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
    "commands",
    "plugins/doc-detective/agents",
    "plugins/doc-detective/skills",
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

// ─── 5. Copy content to plugin directory ─────────────────────

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
syncMetadataInSourceFiles();
buildSkillScripts();
syncSourceToArtifacts();
generateCommands();
generateTomls();
syncPluginDir();

log("\nBuild complete!");
