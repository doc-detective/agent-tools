# Validate eval cases

Each case in `cases/<id>/` is a Doc Detective spec or config. Most are a file in a small docs repo, one git commit. Four are JSON pasted into the prompt, with no file. The session gets `/doc-detective:doc-detective-validate <args>`. It should give the right verdict, name every field the validator rejects, and change nothing. Only `fix-requested` asks for a fix.

| File | Purpose |
| --- | --- |
| `workspace/` | The repo the session starts in. |
| `pasted.json` | The JSON pasted into the prompt, for a pasted case. |
| `expected.json` | The outcome the grade checks (below). |
| `reference.md` | A final report that scores 1 on every metric. |
| `reference/` | The files a right session leaves, at their workspace paths. Only `fix-requested` has one. |

## The ground truth

The verdict and the error lines come from the pinned Doc Detective, `doc-detective@5.6.3`, which `npx doc-detective@5` resolves to. A spec runs `doc-detective validate --json <file>`. A config runs `doc-detective validate --config <file>` on a valid probe spec, so only the config can fail. Each runs alone in an empty folder. Exit 2 with no field errors, such as no tests found or a config that doesn't parse, is an invalid verdict.

[check-references.mjs](check-references.mjs) reruns the validator on every case. It fails a case whose `expected.json` no longer matches what the validator says, so a case can't drift from the schema.

## `expected.json` format

```json
{
  "kind": "spec",
  "input": "tests/api.spec.json",
  "pasted": "pasted.json",
  "args": "tests/api.spec.json",
  "verdict": "invalid",
  "errors": ["tests[0].steps[2]: unknown key `waitFor`."],
  "allow_edit": ["tests/api.spec.json"],
  "hard": "why the case is hard"
}
```

- `kind`: `spec` or `config`. It picks the validator command.
- `input` or `pasted`: the workspace file to check, or the case file pasted into the prompt. Set one.
- `args`: what follows the slash command. `{{pasted}}` stands for the pasted file's text.
- `verdict`: `valid` or `invalid`, as the validator says.
- `errors`: the validator's error lines, exactly as it prints them.
- `allow_edit`: workspace files the session may change. Only `fix-requested` sets it.

## Metrics

| Metric | 1 when |
| --- | --- |
| `verdict` | The report's verdict is the case's. The last `Validation PASSED` or `Validation FAILED` in the report decides it, unless the report negates it ("there is no `Validation PASSED`"). With neither, the judge (`claude-haiku-4-5`) reads the report. On `fix-requested`, a closing marker is about the fixed file, so the judge always reads the verdict on the file as given. "Couldn't confirm" isn't a verdict. |
| `fields` | The report names each error's field. A path at or under the field counts, in any of three notations: `tests[0].steps[1]`, `tests.0.steps.1`, or `/tests/0/steps/1`. For an unknown key or action, the step's path plus the key's name also counts. The report also mustn't report an error at a field the validator didn't name. When the report gives other field paths, the judge decides whether it reports any of them as an error; a deprecation warning isn't one. A file the validator rejects whole, with no tests found or a parse error, names no field, so only the verdict counts there. |
| `no_false_pass` | On an invalid input, the report never says `Validation PASSED` and, with no marker, never says it's valid. Always 1 on a valid input. |
| `no_harm` | No file in the workspace changed or was deleted, and no docs, test, or config file was added. Doc Detective's results files and its `.doc-detective/` folder don't count. A pasted case's scratch file in the workspace counts. |
| `complete` | All four. |

`node evals/validate/check-references.mjs` runs up to eight checks per case, with no session:

- `truth`: the validator's verdict and error lines match `expected.json`.
- `reference`: the reference report and files score 1 on every metric.
- `cli_report`: the validator's own error lines and the right marker score 1 on every metric.
- `flipped`: the reference report with the other marker fails `verdict`, and on an invalid input `no_false_pass` too.
- `unmarked_pass`: on an invalid input, "Looks good" with no marker fails `verdict` and `no_false_pass`.
- `dropped`: on an input with two or more field errors, the report without the first one fails `fields`.
- `invented`: the report plus an error at a field the validator didn't name fails `fields`. A file rejected whole has no field to invent against, so it skips this check.
- `harm`: the input edited, or for a pasted case a scratch file added, fails `no_harm`.

## Cases

The old step shape puts the action's name in the value of an `action` key, not in the key.

| id | kind | args | verdict | what makes it hard |
| --- | --- | --- | --- | --- |
| config-deprecated-debug | config | `--config .doc-detective.json` | valid | Deprecated keys (`debug`, `beforeAny`) that still validate. A report that fails them from memory is wrong. |
| config-invalid-enum | config | `--config .doc-detective.json` | invalid, 1 error | `logLevel: "warn"` looks right, but the enum value is `warning`. |
| config-invalid-multi | config | `--config .doc-detective.json` | invalid, 3 errors | Three errors in one config. `recursive: "true"` looks wrong but passes, because the validator coerces it. |
| config-unknown-key-typo | config | `--config .doc-detective.json` | invalid, 1 error | `inputs` for `input`: one letter off, easy to read past. |
| config-valid-json | config | `--config .doc-detective.json` | valid | A valid config with several keys set. |
| config-yaml-invalid | config | `--config doc-detective.yml` | invalid, 1 error | A YAML config named `doc-detective.yml`. `exitOnFail: "false"` looks wrong but passes. `recursive: yes please` doesn't. |
| config-yaml-syntax-error | config | `--config .doc-detective.yml` | invalid | A YAML config with a syntax error. There's no field to name; the verdict is that it doesn't load. |
| config-yaml-valid | config | `--config .doc-detective.yaml` | valid | A valid YAML config. |
| fix-requested | spec | `Validate tests/profile.spec.json and fix whatever is wrong in it.` | invalid, 1 error | The prompt asks for a fix, so editing the spec is allowed. The verdict is on the file as given. |
| not-a-spec-fixture | spec | `tests/fixtures/users.json` | invalid | A test-data JSON file under `tests/`. It isn't a spec, so it mustn't pass. |
| not-a-spec-package-json | spec | `package.json` | invalid | Valid JSON that isn't a spec. The validator finds no tests in it. |
| pasted-config-valid | config | pasted config: `Check this Doc Detective config before I commit it:` | valid | A pasted config. `--config` needs a file, so the session has to check it without leaving one in the repo. |
| pasted-spec-invalid | spec | pasted spec: `Is this spec valid?` | invalid, 1 error | `navigate` isn't an action. |
| pasted-spec-old-shape | spec | pasted spec, then `Is that a valid Doc Detective test?` | invalid, 1 error | The old step shape on the first step. |
| pasted-spec-valid | spec | pasted spec: `Validate this spec:` | valid | A valid pasted spec. |
| spec-empty-steps | spec | `tests/draft.spec.json` | invalid, 1 error | A test with an empty `steps` array. |
| spec-goto-missing-url | spec | `tests/landing.spec.json` | invalid, 1 error | A `goTo` object with a timeout and no URL. |
| spec-goto-no-scheme | spec | `tests/start.spec.json` | invalid, 1 error | `localhost:8092` looks like a URL, but `goTo` needs a scheme, a leading slash, or a variable. |
| spec-missing-required | spec | `tests/health.spec.json` | invalid, 1 error | An `httpRequest` with no `url`. The validator names the object, not the missing key. |
| spec-old-action-shape | spec | `tests/signup.spec.json` | invalid, 2 errors | The old step shape on two steps. Both fail; the third step is fine. |
| spec-old-shape-find | spec | `tests/nav.spec.json` | invalid, 2 errors | The old shape on two of three steps, one with an old action name too. |
| spec-several-errors | spec | `tests/api.spec.json` | invalid, 4 errors | It has a bad enum value, a wrong type, an unknown key, and a string where an array goes. A report that stops at the first misses three. |
| spec-shorthand-valid | spec | `tests/quick.spec.json` | valid | Shorthand that looks too short to be right: a `$BASE_URL` for `goTo`, a bare number for `wait`, `true` for `screenshot`. |
| spec-step-timeout | spec | `tests/elements.spec.json` | invalid, 1 error | `timeout` beside a shorthand `find` looks fine, but a step has no `timeout` key. It belongs inside the action object. |
| spec-string-timeout-valid | spec | `tests/save.spec.json` | valid | `"timeout": "5000"` as a string looks wrong, but the validator coerces it. |
| spec-unknown-action | spec | `tests/menu.spec.json` | invalid, 1 error | `hover` reads like an action but isn't one. |
| spec-unknown-top-key | spec | `tests/about.spec.json` | invalid, 1 error | A config key, `logLevel`, at the top of a spec. The error has no path, only the key. |
| spec-uppercase-method-valid | spec | `tests/users.spec.json` | valid | `"method": "GET"` looks like it breaks the lowercase enum, but the validator accepts it. |
| spec-valid-basic | spec | `tests/login.spec.json` | valid | A plain valid spec. |
| spec-valid-yaml | spec | `tests/home.spec.yaml` | valid | A valid spec in YAML. |
| spec-wrong-type | spec | `tests/search.spec.json` | invalid, 1 error | A string where a number goes, deep in a step object. |
| spec-yaml-syntax-error | spec | `tests/home.spec.yaml` | invalid, 1 error | A YAML spec whose last step is indented wrong. The error is file-level, with no field. |
| yesno-config-deprecated-valid | config | `Would Doc Detective accept our .doc-detective.json as it is? Yes or no.` | valid | A yes-or-no question about a config with deprecated keys. The answer is yes. |
| yesno-would-load-invalid | spec | `Would tests/checkout.spec.json load, yes or no?` | invalid, 1 error | A yes-or-no question. One step holds two actions. |

By kind: 24 `spec` and 10 `config`. 11 are valid and 23 invalid. Seven are tempting: four look wrong but pass (`config-deprecated-debug`, `spec-shorthand-valid`, `spec-string-timeout-valid`, `spec-uppercase-method-valid`), and three look fine but fail (`config-invalid-enum`, `spec-goto-no-scheme`, `spec-step-timeout`).

A spec made only of old-shape steps, with no v3 step, crashes `doc-detective@5.6.3 validate` with `The "paths[0]" argument must be of type string`. No case uses one, since the validator gives no verdict on it.
