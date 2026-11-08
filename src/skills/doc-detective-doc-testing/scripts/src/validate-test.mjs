#!/usr/bin/env node
/**
 * Doc Detective Test Specification Validator
 *
 * Validates test specifications against the `spec_v3` schema from
 * doc-detective-common, the same schema the Doc Detective CLI uses.
 *
 * There's no hand-written fallback: if doc-detective-common can't load, the
 * script fails instead of passing specs against a stale action list.
 *
 * Usage:
 *   node validate-test.js <test-file.json>
 *   node validate-test.js --stdin < test-spec.json
 *
 * Exit codes:
 *   0 - Validation passed
 *   1 - Validation failed
 *   2 - Usage/input error
 */

import fs from 'fs';
import path from 'path';
import { validate, stepActions } from 'doc-detective-common';

/**
 * A step's oneOf reports every other action as a missing required property.
 * A step never needs a second action, so those errors are noise.
 */
function isOtherActionNoise(error) {
  return error.keyword === 'required' &&
    stepActions.includes(error.params && error.params.missingProperty);
}

/**
 * Validate an entire test specification
 * @param {Object} testSpec - The test specification object
 * @returns {Object} - Validation result with valid flag, errors array, and summary
 */
function validateTestSpec(testSpec) {
  const tests = Array.isArray(testSpec && testSpec.tests) ? testSpec.tests : [];
  const stepsValidated = tests.reduce(
    (n, test) => n + (Array.isArray(test && test.steps) ? test.steps.length : 0), 0
  );
  const results = {
    valid: true,
    errors: [],
    summary: {
      testsValidated: tests.length,
      stepsValidated,
      stepsPassed: stepsValidated,
      stepsFailed: 0
    }
  };

  if (!testSpec || typeof testSpec !== 'object' || Array.isArray(testSpec)) {
    results.valid = false;
    results.errors.push({ message: 'Test specification must be an object' });
    return results;
  }

  const { valid, errorObjects = [] } = validate({
    schemaKey: 'spec_v3',
    object: testSpec,
    structuredErrors: true
  });
  if (valid) return results;

  results.valid = false;
  const relevant = errorObjects.filter(e => !isOtherActionNoise(e));
  const failedSteps = new Set();

  for (const error of relevant.length ? relevant : errorObjects) {
    const params = error.params && Object.keys(error.params).length
      ? ` (${JSON.stringify(error.params)})`
      : '';
    const entry = { message: `${error.instancePath || '/'} ${error.message}${params}` };

    const match = /^\/tests\/(\d+)(?:\/steps\/(\d+))?/.exec(error.instancePath || '');
    if (match) {
      const test = tests[Number(match[1])] || {};
      entry.testIndex = Number(match[1]);
      entry.testId = test.testId;
      if (match[2] !== undefined) {
        const step = (test.steps || [])[Number(match[2])] || {};
        entry.stepIndex = Number(match[2]);
        entry.stepId = step.stepId;
        entry.action = Object.keys(step).find(key => stepActions.includes(key));
        failedSteps.add(`${match[1]}/${match[2]}`);
      }
    }
    results.errors.push(entry);
  }

  results.summary.stepsFailed = failedSteps.size;
  results.summary.stepsPassed = stepsValidated - failedSteps.size;
  return results;
}

/**
 * Format validation results for console output
 * @param {Object} results - Validation results from validateTestSpec
 * @returns {string} - Formatted output string
 */
function formatResults(results) {
  const lines = [];

  if (results.valid) {
    lines.push('✓ Validation PASSED');
  } else {
    lines.push('✗ Validation FAILED');
  }

  lines.push(`  Tests validated: ${results.summary.testsValidated}`);
  lines.push(`  Steps validated: ${results.summary.stepsValidated}`);
  lines.push(`  Steps passed: ${results.summary.stepsPassed}`);
  lines.push(`  Steps failed: ${results.summary.stepsFailed}`);

  if (results.errors.length > 0) {
    lines.push('\nErrors:');
    results.errors.forEach((error, i) => {
      lines.push(`\n  ${i + 1}. ${error.message}`);
      if (error.testId) lines.push(`     Test: ${error.testId}`);
      if (error.stepId) lines.push(`     Step: ${error.stepId}`);
      if (error.action) lines.push(`     Action: ${error.action}`);
    });
  }

  return lines.join('\n');
}

// CLI handling
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node validate-test.js <test-file.json>');
    console.error('       node validate-test.js --stdin < test-spec.json');
    process.exit(2);
  }

  let testSpec;

  if (args[0] === '--stdin') {
    // Read from stdin
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      try {
        testSpec = JSON.parse(chunks.join(''));
      } catch (e) {
        console.error(`Error parsing JSON from stdin: ${e.message}`);
        process.exit(2);
      }
      runValidation(testSpec);
    });
  } else {
    // Read from file
    const filePath = path.resolve(args[0]);

    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(2);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      testSpec = JSON.parse(content);
    } catch (e) {
      console.error(`Error reading/parsing file: ${e.message}`);
      process.exit(2);
    }
    runValidation(testSpec);
  }
}

function runValidation(testSpec) {
  const results = validateTestSpec(testSpec);
  console.log(formatResults(results));

  // Output JSON results to stderr for programmatic use
  console.error(JSON.stringify(results, null, 2));

  process.exit(results.valid ? 0 : 1);
}

main();
