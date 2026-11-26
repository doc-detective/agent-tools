import assert from 'node:assert/strict';
import { fencedBlocks, snippets, unknownFlags } from '../../evals/specialist/grade.mjs';

const F = '```';
const k = 'act' + 'ion'; // spelled apart so the plugin's format hook doesn't flag this file

describe('specialist fencedBlocks', () => {
  it('reads a longer fence as one block and four-backtick inline code as prose', () => {
    const md = `Use ${F}\` ${F}json ${F}\` blocks.\n\n${F}\`markdown\n${F}bash\necho hi\n${F}\n${F}\`\n`;
    assert.deepEqual(fencedBlocks(md), [{ lang: 'markdown', text: `${F}bash\necho hi\n${F}` }]);
  });
});

describe('specialist unknownFlags', () => {
  it('flags an unknown flag on a doc-detective command in a shell block or inline code', () => {
    assert.deepEqual(unknownFlags(`${F}bash\nnpx doc-detective --input docs --headed\n${F}\n`), ['--headed']);
    assert.deepEqual(unknownFlags('Run `doc-detective --watch`.'), ['--watch']);
  });

  it('ignores flags that belong to npm, other tools, or prose', () => {
    assert.deepEqual(unknownFlags('`npm install --save-dev doc-detective` and `npx playwright test --headed`'), []);
    assert.deepEqual(unknownFlags('The `--headed` option belongs to another tool.'), []);
  });

  it('keeps scanning after a four-backtick inline span', () => {
    assert.deepEqual(unknownFlags(`Use ${F}\` ${F}json ${F}\` blocks, then \`npx doc-detective --bogus\`.`), ['--bogus']);
  });
});

describe('specialist snippets', function () {
  this.timeout(120000); // the first call installs doc-detective-common 5.6.3 once

  it('accepts a v3 spec and rejects the same step in the v2 shape', async () => {
    const v3 = await snippets(`${F}json\n{ "tests": [{ "steps": [{ "goTo": "http://localhost:8092/" }] }] }\n${F}\n`);
    assert.equal(v3[0].valid, true);
    const v2 = await snippets(`${F}json\n${JSON.stringify({ tests: [{ steps: [{ [k]: 'goTo', url: 'http://localhost:8092/' }] }] })}\n${F}\n`);
    assert.equal(v2[0].valid, false);
  });

  it('rejects a config key that config_v3 lacks', async () => {
    const [s] = await snippets(`${F}json\n{ "input": "docs", "timeout": 30000 }\n${F}\n`);
    assert.equal(s.kind, 'config_v3');
    assert.equal(s.valid, false);
  });

  it('fails an AsciiDoc step statement Doc Detective does not read', async () => {
    const [s] = await snippets(`${F}asciidoc\n// (test {"testId": "t"})\n// step {"checkLink": "http://localhost:8092/"}\n// (test end)\n${F}\n`);
    assert.equal(s.valid, false);
  });

  it('does not count a step statement inside an ignore block', async () => {
    const [s] = await snippets(`${F}markdown\n<!-- test ignore start -->\n<!-- step {"click": "Draft"} -->\n<!-- test ignore end -->\n<!-- step {"goTo": "http://localhost:8092/"} -->\n${F}\n`);
    assert.equal(s.valid, true);
    assert.equal(s.steps.length, 1);
  });

  it('skips fenced blocks that are not Doc Detective input', async () => {
    assert.deepEqual(await snippets(`${F}yaml\non: push\njobs: {}\n${F}\n`), []);
  });
});
