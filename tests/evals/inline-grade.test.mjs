import assert from 'node:assert/strict';
import { stripComments, commentOnly, canon, specCoverage, placement, testsOf, declared } from '../../evals/inline/grade.mjs';

const doc = '# Guide\n\n1. Go to [the app](https://example.com).\n2. Click **Save**.\n';

describe('stripComments', () => {
  it('removes each format\'s comments and nothing else', () => {
    assert.equal(stripComments('a <!-- step {"find":"x"} --> b', '.md'), 'a  b');
    assert.equal(stripComments('a\n{/* step {"find":"x"} */}\nb', '.mdx'), 'a\n\nb');
    assert.equal(stripComments('a\n// (step {"find":"x"})\nb', '.adoc'), 'a\n\nb');
    assert.equal(stripComments('a\n<?doc-detective step {"find":"x"} ?>\nb', '.dita'), 'a\n\nb');
    assert.equal(stripComments('a\n\n.. step {"find":"x"}\n   more\n\nb', '.rst'), 'a\n\n\n\nb');
  });

  it('keeps rst directives and MDX comments cut short by */', () => {
    assert.equal(stripComments('.. code-block:: bash', '.rst'), '.. code-block:: bash');
    assert.equal(stripComments('{/* step {"runShell":"ls a/**/*.md"} */}', '.mdx'), '{/* step {"runShell":"ls a/**/*.md"} */}');
    assert.equal(stripComments('{/* step {"runShell":"ls a/**\\/*.md"} */}', '.mdx'), '');
  });
});

describe('commentOnly', () => {
  it('accepts added comment lines and blank lines', () => {
    const out = '# Guide\n\n<!-- test {"testId":"t"} -->\n1. Go to [the app](https://example.com).\n<!-- step {"goTo":"https://example.com"} -->\n2. Click **Save**.\n\n<!-- test end -->\n';
    const r = commentOnly(doc, out, '.md');
    assert.equal(r.ok, true, r.reason);
    assert.deepEqual(r.added, [false, false, true, false, true, false, true, true]);
    assert.deepEqual(r.anchor, [1, 2, 2, 3, 3, 4, 4, 4]);
  });

  it('accepts a comment added inside a line, and CRLF line endings', () => {
    const out = '# Guide\r\n\r\n1. Go to [the app](https://example.com). <!-- step {"goTo":"https://example.com"} -->\r\n2. Click **Save**.\r\n';
    assert.equal(commentOnly(doc, out, '.md').ok, true);
  });

  it('rejects a reworded line', () => {
    const r = commentOnly(doc, doc.replace('Click **Save**', 'Select **Save**'), '.md');
    assert.equal(r.ok, false);
    assert.match(r.reason, /line 4 changed/);
  });

  it('rejects added text that isn\'t a comment, and a deleted line', () => {
    assert.equal(commentOnly(doc, `${doc}\nNew paragraph.\n`, '.md').ok, false);
    assert.equal(commentOnly(doc, doc.replace('# Guide\n\n', ''), '.md').ok, false);
    assert.equal(commentOnly(doc, doc.replace('\n\n', '\n'), '.md').ok, false);
  });

  it('rejects the wrong comment syntax for the format', () => {
    assert.equal(commentOnly(doc, doc.replace('# Guide\n', '# Guide\n{/* step {"find":"x"} */}\n'), '.md').ok, false);
    assert.equal(commentOnly('a\n', 'a\n<!-- step {"find":"x"} -->\n', '.mdx').ok, false);
  });

  it('rejects a comment inside a code block', () => {
    const md = 'Run:\n\n```bash\nls docs\n```\n';
    assert.equal(commentOnly(md, md.replace('ls docs\n', 'ls docs\n<!-- step {"runShell":"ls docs"} -->\n'), '.md').ok, false);
    assert.equal(commentOnly(md, `${md}<!-- step {"runShell":"ls docs"} -->\n`, '.md').ok, true);
    const rst = 'Run:\n\n.. code-block:: bash\n\n   ls docs\n\nDone.\n';
    assert.equal(commentOnly(rst, rst.replace('   ls docs\n', '   ls docs\n   .. step {"runShell":"ls docs"}\n'), '.rst').ok, false);
    assert.equal(commentOnly(rst, rst.replace('   ls docs\n\n', '   ls docs\n\n.. step {"runShell":"ls docs"}\n\n'), '.rst').ok, true);
  });
});

describe('specCoverage', () => {
  const spec = { tests: [{ testId: 't', steps: [{ goTo: 'https://example.com' }, { type: { keys: 'a', selector: '#s' } }, { click: 'Save' }] }] };

  it('matches steps by action and values in order, ignoring location, stepId, description, and key order', () => {
    const got = [{ testId: 't', steps: [
      { goTo: 'https://example.com', location: { line: 3 } },
      { stepId: 'x', description: 'd', type: { selector: '#s', keys: 'a' } },
      { find: 'extra' },
      { click: 'Save' },
    ] }];
    assert.deepEqual(specCoverage(spec, got), { score: 1, misses: [] });
  });

  it('gives partial credit for steps out of order, changed, or in another test', () => {
    const swapped = [{ testId: 't', steps: [{ click: 'Save' }, { goTo: 'https://example.com' }, { type: { keys: 'a', selector: '#s' } }] }];
    assert.equal(specCoverage(spec, swapped).score, 2 / 3);
    const changed = [{ testId: 't', steps: [{ goTo: 'https://example.com' }, { type: { keys: 'b', selector: '#s' } }, { click: 'Save' }] }];
    assert.equal(specCoverage(spec, changed).score, 2 / 3);
    const elsewhere = [{ testId: 'doc.md~1', steps: spec.tests[0].steps }];
    assert.deepEqual(specCoverage(spec, elsewhere), { score: 0, misses: ['t: 0 of 3 steps (no test with this testId)'] });
  });

  it('treats ./path and path as the same value', () => {
    assert.equal(canon({ loadVariables: './secrets.env' }), canon({ loadVariables: 'secrets.env' }));
  });
});

describe('declared', () => {
  it('drops the test Doc Detective makes for steps outside every test marker', () => {
    const tests = [{ testId: 'guide.md~905149d7', steps: [] }, { testId: 'getting-started', steps: [] }];
    assert.deepEqual(declared(tests).map(t => t.testId), ['getting-started']);
  });
});

describe('testsOf', () => {
  it('reads each test\'s first context and makes paths under the file\'s folder relative', () => {
    const dir = process.platform === 'win32' ? 'C:\\tmp\\g' : '/tmp/g';
    const sep = process.platform === 'win32' ? '\\' : '/';
    const plan = { specs: [{ tests: [{ testId: 't', contexts: [{ steps: [{ screenshot: `${dir}${sep}img${sep}a.png` }, { find: 'x' }] }] }] }] };
    assert.deepEqual(testsOf(plan, dir), [{ testId: 't', steps: [{ screenshot: 'img/a.png' }, { find: 'x' }] }]);
    assert.deepEqual(testsOf(null, dir), []);
  });
});

describe('placement', () => {
  const out = '# Guide\n\n<!-- test {"testId":"t"} -->\n1. Go to [the app](https://example.com).\n<!-- step {"goTo":"https://example.com"} -->\n2. Click **Save**.\n<!-- step {"click":"Save"} -->\n<!-- test end -->\n';
  const cmp = commentOnly(doc, out, '.md');
  const steps = lines => [{ testId: 't', steps: [{ goTo: 'https://example.com', location: { line: lines[0] } }, { click: 'Save', location: { line: lines[1] } }] }];

  it('scores 1 when each step comment follows its text', () => {
    assert.equal(placement(doc, cmp, steps([5, 7])).score, 1);
  });

  it('scores 0 when the comments sit before their text', () => {
    const top = '<!-- step {"goTo":"https://example.com"} -->\n<!-- step {"click":"Save"} -->\n' + doc;
    assert.equal(placement(doc, commentOnly(doc, top, '.md'), steps([1, 2])).score, 0);
  });

  it('skips steps whose value isn\'t in the doc, and steps the session didn\'t add', () => {
    const r = placement(doc, cmp, [{ testId: 't', steps: [{ type: { keys: '$ENTER$' }, location: { line: 5 } }, { find: 'Guide', location: { line: 1 } }] }]);
    assert.equal(r.score, 1);
    assert.equal(placement(doc, commentOnly(doc, doc, '.md'), []).score, 0);
  });
});
