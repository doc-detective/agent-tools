// OpenCode plugin for Doc Detective agent-tools.
// Wraps the shared hook scripts as OpenCode tool.execute.before / after hooks.
//
// Installation:
//   1. Copy this file to .opencode/plugins/ in your project
//   2. Copy the hooks/, skills/, and agents/ directories alongside it
//   OR reference the repo in opencode.json:
//     { "plugin": ["doc-detective/agent-tools"] }
//
// Hook scripts are resolved relative to this file's location.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the scripts directory. Try multiple locations so the plugin works
// whether it lives at:
//   <root>/src/hooks/opencode-plugin.mjs    → scripts at ./scripts/
//   <root>/plugins/doc-detective/opencode-plugin.mjs → scripts at ./hooks/scripts/
//   .opencode/plugins/opencode-plugin.mjs   → scripts at ../hooks/scripts/  (manual install)
const SCRIPTS_CANDIDATES = [
  resolve(__dirname, "hooks", "scripts"),
  resolve(__dirname, "scripts"),
  resolve(__dirname, "..", "hooks", "scripts"),
];
const SCRIPTS_DIR = SCRIPTS_CANDIDATES.find((d) => existsSync(d)) || SCRIPTS_CANDIDATES[0];

// OpenCode tool names that modify files
const EDIT_TOOLS = new Set(["edit", "write", "patch"]);

/**
 * Spawn a hook script with JSON piped to stdin.
 * Returns { code, stdout, stderr }.
 */
function runScript(scriptPath, stdinData, timeout = 15000) {
  return new Promise((resolve) => {
    const isBash = scriptPath.endsWith(".sh");
    const cmd = isBash ? "bash" : "node";

    const child = execFile(
      cmd,
      [scriptPath],
      { timeout },
      (err, stdout, stderr) => {
        resolve({
          code: err ? err.code || 1 : 0,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      }
    );

    child.stdin.write(JSON.stringify(stdinData));
    child.stdin.end();
  });
}

/**
 * Build the stdin payload expected by hook scripts from OpenCode tool args.
 * Scripts expect: { tool_input: { file_path, content, new_string } }
 */
function buildToolInput(args = {}, ctx = {}) {
  return {
    tool_input: {
      file_path: args?.filePath || args?.file_path || args?.path || "",
      content: args?.content || "",
      new_string: args?.new_string || args?.newString || "",
    },
    cwd: ctx?.worktree || ctx?.directory || process.cwd(),
  };
}

/**
 * Parse JSON output from a hook script. Returns null if not valid JSON.
 */
function parseHookOutput(stdout) {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}

const docDetectivePlugin = async (ctx = {}) => {
  // Run session-start check on plugin initialization
  const sessionScript = resolve(SCRIPTS_DIR, "session-start-check-install.sh");
  if (existsSync(sessionScript)) {
    try {
      const result = await runScript(sessionScript, {}, 15000);
      const parsed = parseHookOutput(result.stdout);
      if (parsed?.additionalContext) {
        console.log(`[doc-detective] ${parsed.additionalContext}`);
      }
    } catch {
      // Session start check is non-critical; proceed silently
    }
  }

  return {
    "tool.execute.before": async (input, output) => {
      const tool = input?.tool || output?.tool;
      if (!EDIT_TOOLS.has(tool)) return;

      const scriptPath = resolve(
        SCRIPTS_DIR,
        "pre-edit-block-action-antipattern.js"
      );
      if (!existsSync(scriptPath)) return;

      const args = output?.args || input?.args || {};
      const stdinData = buildToolInput(args, ctx);
      const result = await runScript(scriptPath, stdinData, 10000);

      // Exit code 2 = blocking error (anti-pattern detected)
      if (result.code === 2 && result.stderr) {
        throw new Error(result.stderr.trim());
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = input?.tool || output?.tool;
      if (!EDIT_TOOLS.has(tool)) return;

      const postScripts = [
        { name: "post-edit-validate-test-spec.js", timeout: 30000 },
        { name: "post-edit-suggest-testing.js", timeout: 10000 },
        { name: "post-edit-format-test-spec.js", timeout: 15000 },
        { name: "post-edit-warn-inline-tests.js", timeout: 10000 },
      ];

      const args = input?.args || output?.args || {};
      const stdinData = buildToolInput(args, ctx);

      for (const script of postScripts) {
        const scriptPath = resolve(SCRIPTS_DIR, script.name);
        if (!existsSync(scriptPath)) continue;

        try {
          const result = await runScript(scriptPath, stdinData, script.timeout);
          const parsed = parseHookOutput(result.stdout);
          if (parsed?.additionalContext) {
            console.log(`[doc-detective] ${parsed.additionalContext}`);
          }
        } catch {
          // Post-edit hooks are informational; never block on failure
        }
      }
    },
  };
};

export default docDetectivePlugin;
