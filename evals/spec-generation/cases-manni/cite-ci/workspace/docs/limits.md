---
title: Limits
citations:
  - id: fetch-timeout
    claim:
      lines: 3
      integrity: sha256-921b21cccab21a4577f224ec4171aa56a3414bb3a5a4704ab8b6f314c46aa094
    source:
      file: lib/limits.ts
      lines: 2
      integrity: sha256-78af1d3321f9cbb177a7e4c958e39be56fd14cb93c1e441778bc4232e0fe4b1f
      commit-sha: 49bd0416564c8b212878491871d0aee32bcfba7e
  - id: retries
    claim:
      lines: 5
      integrity: sha256-3049e93e72873542aac2c1c4778fa655e70656f03c08f202444062f404a3315d
    source:
      file: lib/limits.ts
      lines: 3
      integrity: sha256-e9f5bdf94a12c610b54573d2b66347592887805e59c69b64803a8c0d30edaea3
      commit-sha: 49bd0416564c8b212878491871d0aee32bcfba7e
---
# Limits

The fetch timeout is 10 seconds.

A failed fetch is retried.

Retries default to 3.
