// Run from the repo root: node evals/spec-generation/check-fields.mjs
import assert from 'node:assert';
import { coverage } from './grade.mjs';
import { readFileSync } from 'node:fs';
const exp = f => JSON.parse(readFileSync(`evals/inline/cases/${f}/expected.json`, 'utf8')).steps;
const invite = exp('md-gen-manage-users')[1];
const req = role => ({ httpRequest: { url: 'http://localhost:8093/api/invites', method: 'post', request: { body: { email: 'ada@example.com', role } }, response: { body: { role: 'editor' } } } });
assert.equal(coverage([invite], [req('editor')]).score, 1);
assert.equal(coverage([invite], [req('viewer')]).score, 0);
assert.equal(coverage([invite], [req('not-editor')]).score, 0);
const tabs = exp('mdx-gen-two-tabs');
const find = (text, tab) => ({ find: { elementText: text, ...(tab === undefined ? {} : { surface: { tab } }) } });
for (const t of [-1, 1, { url: 'page=linked' }, { title: 'Child linked' }]) assert.equal(coverage([tabs[3]], [find('PAGE linked', t)]).score, 1, JSON.stringify(t));
for (const t of [0, undefined, { url: 'http://localhost:8092/multi-tab.html' }]) assert.equal(coverage([tabs[3]], [find('PAGE linked', t)]).score, 0, JSON.stringify(t));
assert.equal(coverage([tabs[6]], [find('MULTI-TAB HOME', 0)]).score, 1);
assert.equal(coverage([tabs[6]], [find('MULTI-TAB HOME', -1)]).score, 0);
console.log('fields checks pass');
