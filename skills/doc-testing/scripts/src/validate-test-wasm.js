/**
 * Doc Detective Test Specification Validator (WASM Version)
 *
 * WASM-compatible validator that reads JSON input from stdin and writes
 * results to stdout. Designed for compilation with Javy.
 *
 * Input format (stdin JSON):
 *   { "action": "validate", "spec": { ... test spec ... } }
 *   OR
 *   { "action": "validate", "spec": { ... }, "options": { "format": "human" } }
 *
 * Output format (stdout JSON):
 *   { "valid": true/false, "errors": [...], "summary": {...}, "formatted": "..." }
 *
 * Exit codes (via WASI):
 *   0 - Validation passed
 *   1 - Validation failed
 *   2 - Usage/input error
 */

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

// Metadata keys that are not actions (should be excluded when detecting actions)
const METADATA_KEYS = [
  'description',
  'stepId',
  'unsafe',
  'outputs',
  'variables',
  'breakpoint',
  '$schema',
  'sourceLocation',
  'id',
  'contexts'
];

/**
 * Validate a single step against known actions (structural validation)
 * @param {Object} step - The step object to validate
 * @returns {Object} - Validation result with valid flag and errors array
 */
function validateStepStructural(step) {
  // Find the action key (not metadata like description, stepId, unsafe, etc.)
  const actionKey = Object.keys(step).find(key =>
    !METADATA_KEYS.includes(key)
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
 * Validate a single step
 * @param {Object} step - The step object to validate
 * @returns {Object} - Validation result with valid flag and errors array
 */
function validateStep(step) {
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
    schemaValidation: false,
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
 * Format validation results for human-readable output
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

  return lines.join('\n');
}

/**
 * Read all input from stdin using Javy I/O
 * @returns {string} Input as string
 */
function readStdin() {
  const chunks = [];
  const buffer = new Uint8Array(1024);
  
  // Read from file descriptor 0 (stdin)
  while (true) {
    const bytesRead = Javy.IO.readSync(0, buffer);
    if (bytesRead === 0) break;
    chunks.push(buffer.slice(0, bytesRead));
  }
  
  // Combine chunks and decode as UTF-8
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new TextDecoder().decode(result);
}

/**
 * Write output to stdout using Javy I/O
 * @param {string} output - String to write
 */
function writeStdout(output) {
  const encoded = new TextEncoder().encode(output);
  Javy.IO.writeSync(1, encoded);
}

/**
 * Write output to stderr using Javy I/O
 * @param {string} output - String to write
 */
function writeStderr(output) {
  const encoded = new TextEncoder().encode(output);
  Javy.IO.writeSync(2, encoded);
}

// Main execution
function main() {
  try {
    // Read input from stdin
    const inputStr = readStdin();
    
    if (!inputStr || inputStr.trim() === '') {
      const errorOutput = {
        error: 'No input provided',
        usage: 'Provide JSON input via stdin: { "action": "validate", "spec": { ... } }',
        exitCode: 2
      };
      writeStdout(JSON.stringify(errorOutput) + '\n');
      return;
    }
    
    // Parse input
    let input;
    try {
      input = JSON.parse(inputStr);
    } catch (e) {
      const errorOutput = {
        error: `Invalid JSON input: ${e.message}`,
        usage: 'Provide JSON input via stdin: { "action": "validate", "spec": { ... } }',
        exitCode: 2
      };
      writeStdout(JSON.stringify(errorOutput) + '\n');
      return;
    }
    
    // Handle different input formats
    let spec;
    let options = {};
    
    if (input.action === 'validate' && input.spec) {
      // Structured input format
      spec = input.spec;
      options = input.options || {};
    } else if (input.tests) {
      // Direct spec input
      spec = input;
    } else {
      const errorOutput = {
        error: 'Invalid input format',
        usage: 'Provide either { "action": "validate", "spec": { ... } } or a direct spec with "tests" array',
        exitCode: 2
      };
      writeStdout(JSON.stringify(errorOutput) + '\n');
      return;
    }
    
    // Validate
    const results = validateTestSpec(spec);
    
    // Add exit code based on validation result
    results.exitCode = results.valid ? 0 : 1;
    
    // Add formatted output if requested
    if (options.format === 'human') {
      results.formatted = formatResults(results);
    }
    
    // Output results
    writeStdout(JSON.stringify(results) + '\n');
    
    // Also write human-readable to stderr
    writeStderr(formatResults(results) + '\n');
    
  } catch (e) {
    const errorOutput = {
      error: `Unexpected error: ${e.message}`,
      stack: e.stack,
      exitCode: 2
    };
    writeStdout(JSON.stringify(errorOutput) + '\n');
  }
}

// Execute main
main();
