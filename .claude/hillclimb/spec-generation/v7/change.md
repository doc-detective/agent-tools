# Round 7: write the spec with the file-writing tool

Builds on round 5. Round 6 was reverted. The maintainer approved a seventh round past the six-round limit.

Diagnosed from round 5's failing train runs only. Seven of them passed when regraded from the spec text in their traces. Each of those sessions wrote its spec with a Bash heredoc (`cat > tests/<name>.spec.json <<'EOF'`). On Windows, the Bash tool turns `\\` into `\`, even inside a quoted heredoc, so the file on disk differs from the trace. A `\n` inside a `node -e` string becomes a raw newline, Node fails with a SyntaxError, and the step exits 1. The spec still validates, so the session never sees it. Graded in workspaces rebuilt by replaying each session's commands, all seven fail with the eval's exact step counts.

Across round 5, 17 of 33 failing runs (train and test) wrote the spec through a heredoc that holds `\\`. Some passing runs did too, so not all 17 fail for this reason.

Change: one guardrail in generate's SKILL.md. Write the spec file with the file-writing tool, not through the shell.
