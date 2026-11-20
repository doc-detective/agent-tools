import assert from 'node:assert/strict';
import { failedSteps } from '../../evals/spec-generation/grade.mjs';

const results = steps => ({ specs: [{ tests: [{ testId: 't1', contexts: [{ steps }] }] }] });

describe('failedSteps', () => {
  it('names each failing step with its test, action, and result description', () => {
    const r = results([
      { stepId: 'a', runShell: { command: 'manni meta validate' }, result: 'PASS', resultDescription: 'ok' },
      { stepId: 'b', runShell: { command: 'manni meta get x' }, result: 'FAIL', resultDescription: 'Returned exit code 2. Expected one of [0]' },
    ]);
    assert.deepEqual(failedSteps(r), ['t1 b runShell: Returned exit code 2. Expected one of [0]']);
  });

  it('keeps the first five failures, each cut to 300 characters', () => {
    const r = results(Array.from({ length: 7 }, (_, i) => ({ stepId: `s${i}`, find: 'x', result: 'FAIL', resultDescription: 'y'.repeat(400) })));
    const f = failedSteps(r);
    assert.equal(f.length, 5);
    assert.ok(f.every(x => x.length <= 300));
  });

  it('returns an empty list for missing or malformed results', () => {
    assert.deepEqual(failedSteps(null), []);
    assert.deepEqual(failedSteps({ specs: 'x' }), []);
  });
});
