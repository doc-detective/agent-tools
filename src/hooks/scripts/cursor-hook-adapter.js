#!/usr/bin/env node
'use strict';

// Cursor hook adapter.
//
// Cursor's hook protocol differs from the Claude/Gemini protocol the other
// Doc Detective hook scripts speak. Rather than fork every script, this adapter
// translates between the two so the scripts stay single-source:
//
//   Cursor stdin  ──normalize──▶  { tool_input: { file_path, content, new_string } }
//                                  (the shape the existing scripts read)
//        │
//        ▼  spawn target script, pipe normalized JSON to its stdin
//   target script (post-edit-validate-test-spec.js, session-start-check-install.sh, …)
//        │  emits either { additionalContext } on stdout + exit 0 (informational)
//        │  or a message on stderr + exit 2 (block)
//        ▼  translate
//   Cursor stdout: { agent_message | additional_context | permission, … }
//
// Usage (from cursor-hooks.json):
//   node "${CURSOR_PLUGIN_ROOT}/hooks/scripts/cursor-hook-adapter.js" <target-script>
//
// Reference:
//   Cursor hooks: https://cursor.com/docs/agent/hooks
//   - afterFileEdit stdin: { file_path, edits: [{ old_string, new_string }] }
//   - preToolUse   stdin: { tool_name, tool_input: { … } }
//   - sessionStart stdin: { session_id, … }
//   - output: { permission: "allow"|"deny"|"ask", user_message, agent_message }
//             sessionStart may inject { additional_context }
//   - exit code 2 blocks the action (fail-closed); other non-zero fails open.

const path = require('path');
const { spawn } = require('child_process');

// Cursor events that gate an action *before* it happens — only these can block.
const PRE_GATE_EVENTS = new Set([
  'preToolUse',
  'beforeReadFile',
  'beforeShellExecution',
  'beforeMCPExecution',
  'beforeSubmitPrompt',
]);

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(chunks.join('') || '{}')); }
      catch { resolve({}); }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

/** Translate a Cursor hook payload into the legacy { tool_input } shape. */
function normalize(cursor) {
  const filePath =
    cursor.file_path ||
    (cursor.tool_input && (cursor.tool_input.file_path || cursor.tool_input.filePath)) ||
    null;

  // afterFileEdit carries the applied edits; join their new text so the
  // content-scanning scripts (antipattern blocker) see what was written.
  let content = '';
  let newString = '';
  if (Array.isArray(cursor.edits)) {
    newString = cursor.edits.map((e) => e && e.new_string ? e.new_string : '').join('\n');
    content = newString;
  } else if (cursor.tool_input) {
    content = cursor.tool_input.content || cursor.tool_input.new_string || '';
    newString = cursor.tool_input.new_string || '';
  }

  return {
    hook_event_name: cursor.hook_event_name,
    tool_input: {
      file_path: filePath,
      content,
      new_string: newString,
    },
  };
}

function runTarget(targetScript, legacyInput) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, targetScript);
    const runner = targetScript.endsWith('.sh') ? 'bash' : 'node';
    const child = spawn(runner, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', () => resolve({ code: 0, stdout: '', stderr: '' })); // fail open
    child.on('close', (code) => resolve({ code: code == null ? 0 : code, stdout, stderr }));

    child.stdin.write(JSON.stringify(legacyInput));
    child.stdin.end();
  });
}

function emit(obj) {
  if (obj && Object.keys(obj).length) process.stdout.write(JSON.stringify(obj) + '\n');
}

async function main() {
  const targetScript = process.argv[2];
  if (!targetScript) process.exit(0); // misconfigured — fail open

  // The target script must resolve inside this directory. The hooks config is
  // bundled and trusted, but a local install can edit it and the adapter can be
  // invoked directly, so reject path traversal (e.g. "../../evil.js"). Exit 1
  // (fail open), not 2, so a misconfiguration doesn't hard-block Cursor.
  const resolvedTarget = path.resolve(__dirname, targetScript);
  if (resolvedTarget !== __dirname && !resolvedTarget.startsWith(__dirname + path.sep)) {
    process.stderr.write(`cursor-hook-adapter: invalid target script "${targetScript}"\n`);
    process.exit(1);
  }

  const cursor = await readStdin();
  const event = cursor.hook_event_name || '';
  const legacy = normalize(cursor);

  const { code, stdout, stderr } = await runTarget(targetScript, legacy);

  // Block signal from the target (stderr + exit 2).
  if (code === 2) {
    const msg = (stderr.trim() || stdout.trim() || 'Blocked by a Doc Detective hook.');
    if (PRE_GATE_EVENTS.has(event)) {
      emit({ permission: 'deny', agent_message: msg, user_message: msg });
      process.exit(2);
    }
    // Post-hoc events (e.g. afterFileEdit) can't undo the write — surface a
    // corrective instruction to the agent instead of a hard block.
    emit({ agent_message: `Doc Detective flagged a problem with this change:\n${msg}` });
    process.exit(0);
  }

  // Informational path: target prints { additionalContext } on stdout.
  let ctx = null;
  try {
    const parsed = JSON.parse(stdout.trim());
    if (parsed && typeof parsed.additionalContext === 'string') ctx = parsed.additionalContext;
  } catch { /* no JSON — nothing to surface */ }

  if (ctx) {
    // sessionStart injects into the session's initial context; other events
    // feed the agent directly.
    emit(event === 'sessionStart' ? { additional_context: ctx } : { agent_message: ctx });
  }
  process.exit(0);
}

main();
