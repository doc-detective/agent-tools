#!/usr/bin/env node
/**
 * Doc Detective Test Specification Validator
 *
 * Validates test specifications before execution to catch errors early.
 * Uses doc-detective-common for schema validation when available,
 * falls back to structural validation otherwise.
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

const fs = require('fs');
const path = require('path');

// Known Doc Detective actions for structural validation
const KNOWN_ACTIONS = [
  'checkLink',
  'click',
  'dragAndDrop',
  'find',
  'goTo',
  'httpRequest',
  'loadCookie',
  'loadVariables',
  'record',
  'runCode',
  'runShell',
  'saveCookie',
  'screenshot',
  'stopRecord',
  'type',
  'wait'
];

// Check for doc-detective-common availability (optional)
let common = null;
let schemaValidationAvailable = false;
try {
  common = require('doc-detective-common');
  schemaValidationAvailable = true;
} catch (e) {
  // doc-detective-common not available, use structural validation only
}

/**
 * Validate a single step against known actions (structural validation)
 * @param {Object} step - The step object to validate
 * @returns {Object} - Validation result with valid flag and errors array
 */
function validateStepStructural(step) {
  // Find the action key (not description or stepId)
  const actionKey = Object.keys(step).find(key =>
    key !== 'description' && key !== 'stepId'
  );

  if (!actionKey) {
    return {
      valid: false,
      errors: [{ message: 'Step has no action defined' }],
      action: null
    };
  }

  // Check if action is known
  if (!KNOWN_ACTIONS.includes(actionKey)) {
    return {
      valid: false,
      errors: [{ message: `Unknown action: "${actionKey}". Known actions: ${KNOWN_ACTIONS.join(', ')}` }],
      action: actionKey
    };
  }

  // Basic type checking for common actions
  const actionValue = step[actionKey];
  const errors = [];

  switch (actionKey) {
    case 'goTo':
      if (typeof actionValue !== 'string' && (typeof actionValue !== 'object' || !actionValue.url)) {
        errors.push({ message: 'goTo requires a URL string or object with url property' });
      }
      break;
    case 'click':
    case 'find':
      if (typeof actionValue !== 'string' && typeof actionValue !== 'object') {
        errors.push({ message: `${actionKey} requires a string (text) or object (with selector)` });
      }
      break;
    case 'type':
      if (typeof actionValue !== 'object' || !actionValue.keys) {
        errors.push({ message: 'type requires an object with keys property' });
      }
      break;
    case 'httpRequest':
      if (typeof actionValue !== 'object' || !actionValue.url) {
        errors.push({ message: 'httpRequest requires an object with url property' });
      }
      break;
    case 'wait':
      if (typeof actionValue !== 'number' && typeof actionValue !== 'object') {
        errors.push({ message: 'wait requires a number (ms) or object (with selector/state)' });
      }
      break;
    case 'runShell':
      if (typeof actionValue !== 'object' || !actionValue.command) {
        errors.push({ message: 'runShell requires an object with command property' });
      }
      break;
    case 'screenshot':
      if (typeof actionValue !== 'string' && typeof actionValue !== 'object') {
        errors.push({ message: 'screenshot requires a string (path) or object (with path)' });
      }
      break;
    case 'checkLink':
      if (typeof actionValue !== 'string' && (typeof actionValue !== 'object' || !actionValue.url)) {
        errors.push({ message: 'checkLink requires a URL string or object with url property' });
      }
      break;
    case 'loadVariables':
    case 'loadCookie':
    case 'saveCookie':
      if (typeof actionValue !== 'string') {
        errors.push({ message: `${actionKey} requires a file path string` });
      }
      break;
    case 'record':
      if (typeof actionValue !== 'string' && typeof actionValue !== 'object') {
        errors.push({ message: 'record requires a string (path) or object' });
      }
      break;
    case 'stopRecord':
      // stopRecord can be boolean true or object
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    action: actionKey
  };
}

/**
 * Validate a single step using doc-detective-common schema (when available)
 * @param {Object} step - The step object to validate
 * @returns {Object} - Validation result with valid flag and errors array
 */
function validateStepSchema(step) {
  // Find the action key (not description or stepId)
  const actionKey = Object.keys(step).find(key =>
    key !== 'description' && key !== 'stepId'
  );

  if (!actionKey) {
    return {
      valid: false,
      errors: [{ message: 'Step has no action defined' }],
      action: null
    };
  }

  // Try schema validation with doc-detective-common
  const schemaVariants = [`${actionKey}_v2`, `${actionKey}_v1`, actionKey];

  for (const schemaKey of schemaVariants) {
    try {
      const result = common.validate(schemaKey, step);
      return {
        valid: result.valid,
        errors: result.errors || [],
        action: actionKey
      };
    } catch (e) {
      // Try next variant
    }
  }

  // Fall back to structural validation if no schema found
  return validateStepStructural(step);
}

/**
 * Validate a single step (dispatches to appropriate method)
 * @param {Object} step - The step object to validate
 * @returns {Object} - Validation result with valid flag and errors array
 */
function validateStep(step) {
  if (schemaValidationAvailable) {
    return validateStepSchema(step);
  }
  return validateStepStructural(step);
}

/**
 * Validate an entire test specification
 * @param {Object} testSpec - The test specification object
 * @returns {Object} - Validation result with valid flag, errors array, and summary
 */
function validateTestSpec(testSpec) {
  const results = {
    valid: true,
    errors: [],
    schemaValidation: schemaValidationAvailable,
    summary: {
      testsValidated: 0,
      stepsValidated: 0,
      stepsPassed: 0,
      stepsFailed: 0
    }
  };

  // Check basic structure
  if (!testSpec || typeof testSpec !== 'object') {
    results.valid = false;
    results.errors.push({ message: 'Test specification must be an object' });
    return results;
  }

  if (!testSpec.tests || !Array.isArray(testSpec.tests)) {
    results.valid = false;
    results.errors.push({ message: 'Test specification must have a "tests" array' });
    return results;
  }

  if (testSpec.tests.length === 0) {
    results.valid = false;
    results.errors.push({ message: 'Test specification must have at least one test' });
    return results;
  }

  // Validate each test
  testSpec.tests.forEach((test, testIndex) => {
    results.summary.testsValidated++;

    if (!test.steps || !Array.isArray(test.steps)) {
      results.valid = false;
      results.errors.push({
        message: `Test ${testIndex} (${test.testId || 'unnamed'}) must have a "steps" array`,
        testIndex,
        testId: test.testId
      });
      return;
    }

    if (test.steps.length === 0) {
      results.valid = false;
      results.errors.push({
        message: `Test ${testIndex} (${test.testId || 'unnamed'}) must have at least one step`,
        testIndex,
        testId: test.testId
      });
      return;
    }

    // Validate each step in the test
    test.steps.forEach((step, stepIndex) => {
      results.summary.stepsValidated++;

      const stepResult = validateStep(step);

      if (stepResult.valid) {
        results.summary.stepsPassed++;
      } else {
        results.summary.stepsFailed++;
        results.valid = false;

        stepResult.errors.forEach(error => {
          results.errors.push({
            message: error.message || String(error),
            testIndex,
            testId: test.testId,
            stepIndex,
            stepId: step.stepId,
            action: stepResult.action
          });
        });
      }
    });
  });

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

  const mode = results.schemaValidation ? 'schema' : 'structural';
  lines.push(`  Mode: ${mode} validation`);
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

  if (!results.schemaValidation) {
    lines.push('\nNote: Using structural validation only.');
    lines.push('Install doc-detective-common for full schema validation:');
    lines.push('  npm install doc-detective-common');
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
        runValidation(testSpec);
      } catch (e) {
        console.error(`Error parsing JSON from stdin: ${e.message}`);
        process.exit(2);
      }
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
      runValidation(testSpec);
    } catch (e) {
      console.error(`Error reading/parsing file: ${e.message}`);
      process.exit(2);
    }
  }
}

function runValidation(testSpec) {
  const results = validateTestSpec(testSpec);
  console.log(formatResults(results));

  // Output JSON results to stderr for programmatic use
  console.error(JSON.stringify(results, null, 2));

  process.exit(results.valid ? 0 : 1);
}

// Export for programmatic use
module.exports = { validateTestSpec, validateStep, formatResults, KNOWN_ACTIONS };

// Run if called directly
if (require.main === module) {
  main();
}
