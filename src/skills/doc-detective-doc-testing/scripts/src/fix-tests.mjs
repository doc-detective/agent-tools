#!/usr/bin/env node

/**
 * fix-tests.mjs
 * 
 * Analyzes Doc Detective test failures and proposes fixes with confidence scoring.
 * Part of the doc-testing skill for iterative test improvement.
 * 
 * Usage:
 *   node fix-tests.mjs <results-file> [options]
 * 
 * Options:
 *   --spec <path>       Path to test spec file to fix
 *   --threshold <0-100> Confidence threshold for auto-apply (default: 80)
 *   --auto-fix          Apply all fixes regardless of confidence
 *   --dry-run           Show proposed fixes without applying
 *   --max-iterations    Maximum fix attempts per test (default: 3)
 *   --output <path>     Write fixed spec to path (default: overwrite input)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// Configuration
const DEFAULT_THRESHOLD = 80;
const MAX_ITERATIONS = 3;

/**
 * Error patterns and their fix strategies
 */
const ERROR_PATTERNS = [
  {
    pattern: /No elements matched|Element.*not found|selector.*not found|Cannot find/i,
    type: 'element_not_found',
    strategies: [
      { name: 'update_text', confidence: 70, description: 'Element text may have changed' },
      { name: 'add_wait', confidence: 60, description: 'Element may need more time to load' },
      { name: 'update_selector', confidence: 50, description: 'Selector may need adjustment' }
    ]
  },
  {
    pattern: /timeout|timed out|exceeded/i,
    type: 'timeout',
    strategies: [
      { name: 'increase_timeout', confidence: 85, description: 'Increase wait time' },
      { name: 'add_explicit_wait', confidence: 75, description: 'Add explicit wait for element' }
    ]
  },
  {
    pattern: /Couldn't open URL|unresolvable URL|navigation|redirect|url.*changed|net::ERR/i,
    type: 'navigation',
    strategies: [
      { name: 'update_url', confidence: 90, description: 'URL may have changed' },
      { name: 'handle_redirect', confidence: 70, description: 'Add redirect handling' }
    ]
  },
  {
    pattern: /status.*code|401|403|404|500|HTTP/i,
    type: 'http_error',
    strategies: [
      { name: 'update_expected_status', confidence: 60, description: 'Status code expectation may need update' },
      { name: 'add_auth', confidence: 45, description: 'Authentication may be required' }
    ]
  },
  {
    pattern: /text.*mismatch|expected.*but.*got|does not match/i,
    type: 'text_mismatch',
    strategies: [
      { name: 'update_expected_text', confidence: 88, description: 'Expected text has changed' }
    ]
  },
  {
    pattern: /click.*failed|not clickable|intercepted/i,
    type: 'click_failed',
    strategies: [
      { name: 'wait_for_clickable', confidence: 75, description: 'Wait for element to be clickable' },
      { name: 'scroll_into_view', confidence: 65, description: 'Element may need scrolling' }
    ]
  }
];

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    resultsFile: null,
    specFile: null,
    threshold: DEFAULT_THRESHOLD,
    autoFix: false,
    dryRun: false,
    maxIterations: MAX_ITERATIONS,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--spec' && args[i + 1]) {
      options.specFile = args[++i];
    } else if (arg === '--threshold' && args[i + 1]) {
      options.threshold = parseInt(args[++i], 10);
    } else if (arg === '--auto-fix') {
      options.autoFix = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--max-iterations' && args[i + 1]) {
      options.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (!arg.startsWith('-') && !options.resultsFile) {
      options.resultsFile = arg;
    }
  }

  return options;
}

/**
 * Load and parse a JSON file
 */
function loadJson(filePath) {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

/**
 * Analyze a single test failure and propose fixes
 */
function analyzeFailure(failure) {
  const { testId, stepId, error, step } = failure;
  const position = { testIndex: failure.testIndex, stepIndex: failure.stepIndex, contentPath: failure.contentPath };
  const proposals = [];

  // Match error against known patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(error)) {
      for (const strategy of pattern.strategies) {
        proposals.push({
          ...position,
          testId,
          stepId,
          error,
          errorType: pattern.type,
          strategy: strategy.name,
          confidence: strategy.confidence,
          description: strategy.description,
          originalStep: step,
          proposedFix: generateFix(strategy.name, step, error)
        });
      }
      break; // Use first matching pattern
    }
  }

  // If no pattern matched, provide generic low-confidence fix
  if (proposals.length === 0) {
    proposals.push({
      ...position,
      testId,
      stepId,
      errorType: 'unknown',
      strategy: 'manual_review',
      confidence: 20,
      description: 'Unknown error pattern - manual review required',
      originalStep: step,
      proposedFix: null
    });
  }

  // Return highest confidence proposal
  return proposals.sort((a, b) => b.confidence - a.confidence)[0];
}

/**
 * Generate a fix based on strategy
 */
function generateFix(strategy, originalStep, error) {
  if (!originalStep) return null;

  const fix = JSON.parse(JSON.stringify(originalStep)); // Deep clone

  switch (strategy) {
    case 'update_text': {
      // Extract potential new text from error message
      const textMatch = error.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);
      if (textMatch) {
        const newText = textMatch[1] || textMatch[2] || textMatch[3];
        if (fix.click && typeof fix.click === 'string') {
          fix.click = newText;
        } else if (fix.find && typeof fix.find === 'string') {
          fix.find = newText;
        }
      }
      break;
    }

    case 'add_wait':
      // Insert a wait before the step. `wait` takes only a duration in CLI 5.
      return { _insertBefore: true, wait: 10000 };

    case 'increase_timeout':
      if (fix.find && typeof fix.find === 'object') {
        fix.find.timeout = (fix.find.timeout || 5000) * 2;
      } else if (fix.click && typeof fix.click === 'object') {
        fix.click.timeout = (fix.click.timeout || 5000) * 2;
      } else if (fix.wait && typeof fix.wait === 'number') {
        fix.wait = fix.wait * 2;
      }
      break;

    case 'add_explicit_wait':
      return {
        _insertBefore: true,
        wait: 5000
      };

    case 'update_url': {
      // Try to extract the actual URL from error
      const urlMatch = error.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);
      if (urlMatch && fix.goTo) {
        const newUrl = urlMatch[1] || urlMatch[2] || urlMatch[3];
        if (typeof fix.goTo === 'string') {
          fix.goTo = newUrl;
        } else if (typeof fix.goTo === 'object') {
          fix.goTo.url = newUrl;
        }
      }
      break;
    }

    case 'update_expected_text': {
      const expectedMatch = error.match(/got "([^"]+)"|actual: "([^"]+)"/i);
      if (expectedMatch) {
        const actualText = expectedMatch[1] || expectedMatch[2];
        if (fix.find?.elementText) {
          fix.find.elementText = actualText;
        }
      }
      break;
    }

    case 'wait_for_clickable':
      // `click` finds its element first, so a longer timeout gives it time to
      // become clickable.
      if (fix.click && typeof fix.click === 'object') {
        fix.click.timeout = (fix.click.timeout || 5000) * 2;
      }
      break;

    case 'scroll_into_view':
      return {
        _insertBefore: true,
        runCode: {
          language: 'javascript',
          code: `document.querySelector('${extractSelector(originalStep)}')?.scrollIntoView({ behavior: 'smooth', block: 'center' });`
        }
      };

    case 'update_selector':
    case 'update_expected_status':
    case 'add_auth':
    case 'handle_redirect':
    case 'manual_review':
      // These require more context - return null to flag for manual review
      return null;
  }

  // A strategy that couldn't change anything isn't a fix
  return JSON.stringify(fix) === JSON.stringify(originalStep) ? null : fix;
}

/**
 * Extract selector from a step
 */
function extractSelector(step) {
  if (!step) return '*';
  
  if (step.click) {
    return typeof step.click === 'string' ? `text="${step.click}"` : step.click.selector || '*';
  }
  if (step.find) {
    return typeof step.find === 'string' ? `text="${step.find}"` : step.find.selector || '*';
  }
  if (step.type && step.type.selector) {
    return step.type.selector;
  }
  return '*';
}

/**
 * Extract failures from Doc Detective results
 */
function extractFailures(results) {
  if (!Array.isArray(results?.specs)) {
    throw new Error('Not a Doc Detective results file: expected a "specs" array. Write one with: doc-detective --output <file>');
  }

  const failures = [];
  const seen = new Set();

  for (const spec of results.specs) {
    (spec.tests || []).forEach((test, testIndex) => {
      for (const context of test.contexts || []) {
        (context.steps || []).forEach((resultStep, stepIndex) => {
          if (resultStep.result !== 'FAIL') return;

          // The same step can fail in several contexts, but it only needs one fix
          const key = JSON.stringify([spec.contentPath, test.testId, resultStep.stepId, stepIndex]);
          if (seen.has(key)) return;
          seen.add(key);

          // What's left after the fields the runner adds is the step as authored
          const { result, resultDescription, stepId, location, durationMs, outputs, assertions, ...step } = resultStep;
          failures.push({
            testId: test.testId,
            stepId,
            testIndex,
            stepIndex,
            contentPath: spec.contentPath,
            error: resultDescription || 'Unknown error',
            step
          });
        });
      }
    });
  }

  return failures;
}

/**
 * Apply fix to spec
 */
function applyFix(spec, proposal, specFile) {
  if (!proposal.proposedFix) return false;

  const tests = spec.tests || [];

  // Results can cover many files, and IDs only need to be unique within one.
  const sameFile = proposal.contentPath && resolve(proposal.contentPath) === resolve(specFile);
  if (proposal.contentPath && !sameFile) return false;

  // The CLI generates IDs for tests and steps that have none, and they appear
  // only in results. Fall back to position, but only within the same file.
  const positional = tests[proposal.testIndex];
  const test = tests.find(t => t.testId === proposal.testId)
    || (sameFile && positional && !positional.testId ? positional : null);
  if (!test) return false;

  const steps = test.steps || [];
  let i = steps.findIndex(s => s.stepId === proposal.stepId);
  if (i < 0) {
    const candidate = steps[proposal.stepIndex];
    // ponytail: same-action check only, a test filter that shifts positions onto the same action still mismatches
    const sameAction = candidate && !candidate.stepId
      && Object.keys(proposal.originalStep || {}).some(key => key in candidate);
    if (!sameAction) return false;
    i = proposal.stepIndex;
  }

  // Build the fix from the spec's own step. The results copy has variables
  // expanded and secrets masked, and neither belongs in the spec.
  const fix = generateFix(proposal.strategy, steps[i], proposal.error);
  if (!fix) return false;

  if (fix._insertBefore) {
    delete fix._insertBefore;
    steps.splice(i, 0, fix);
  } else {
    steps[i] = fix;
  }
  return true;
}

/**
 * Format proposal for display
 */
function formatProposal(proposal, threshold, autoFix) {
  const willApply = autoFix || proposal.confidence >= threshold;
  const status = proposal.proposedFix 
    ? (willApply ? '🔧' : '⚠️')
    : '❌';
  
  const confidenceLabel = proposal.confidence >= 80 ? 'HIGH' 
    : proposal.confidence >= 60 ? 'MEDIUM' 
    : 'LOW';

  let output = `
${status} ${proposal.testId} → Step: ${proposal.stepId}
   Error Type: ${proposal.errorType}
   Strategy: ${proposal.strategy}
   Confidence: ${proposal.confidence}% (${confidenceLabel})
   ${proposal.description}
`;

  if (proposal.proposedFix) {
    output += `
   Original: ${JSON.stringify(proposal.originalStep, null, 2).split('\n').join('\n            ')}
   Proposed: ${JSON.stringify(proposal.proposedFix, null, 2).split('\n').join('\n            ')}
`;
    if (!willApply && !autoFix) {
      output += `
   → Below threshold (${threshold}%) - flagging for user review
`;
    }
  } else {
    output += `
   → No automatic fix available - manual review required
`;
  }

  return output;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
fix-tests.mjs - Analyze and fix Doc Detective test failures

Usage:
  node fix-tests.mjs <results-file> [options]

Options:
  --spec <path>         Path to test spec file to fix
  --threshold <0-100>   Confidence threshold for auto-apply (default: 80)
  --auto-fix            Apply all fixes regardless of confidence
  --dry-run             Show proposed fixes without applying
  --max-iterations      Maximum fix attempts per test (default: 3)
  --output <path>       Write fixed spec to path (default: overwrite input)
  --help, -h            Show this help message

Examples:
  node fix-tests.mjs results.json --spec tests/login.json --dry-run
  node fix-tests.mjs results.json --spec tests/login.json --threshold 70
  node fix-tests.mjs results.json --spec tests/login.json --auto-fix
`);
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.resultsFile) {
    console.error('Error: Results file required');
    process.exit(1);
  }

  // Load results
  console.log(`\n📊 Loading results from: ${options.resultsFile}`);
  const results = loadJson(options.resultsFile);
  
  // Extract failures
  const failures = extractFailures(results);
  
  if (failures.length === 0) {
    console.log('✅ No failures found in results!');
    process.exit(0);
  }

  console.log(`\n❌ Found ${failures.length} failure(s)\n`);

  // Analyze each failure
  const proposals = failures.map(analyzeFailure);
  
  // Display proposals
  console.log('─'.repeat(60));
  console.log('PROPOSED FIXES');
  console.log('─'.repeat(60));
  
  for (const proposal of proposals) {
    console.log(formatProposal(proposal, options.threshold, options.autoFix));
  }

  // Summary
  const autoApplicable = proposals.filter(p => 
    p.proposedFix && (options.autoFix || p.confidence >= options.threshold)
  );
  const needsReview = proposals.filter(p => 
    !p.proposedFix || (!options.autoFix && p.confidence < options.threshold)
  );

  console.log('─'.repeat(60));
  console.log('SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  Total failures:     ${failures.length}`);
  console.log(`  Auto-applicable:    ${autoApplicable.length}`);
  console.log(`  Needs review:       ${needsReview.length}`);
  console.log(`  Threshold:          ${options.threshold}%`);
  console.log(`  Mode:               ${options.dryRun ? 'dry-run' : options.autoFix ? 'auto-fix' : 'threshold-based'}`);

  // Apply fixes if not dry-run and we have a spec file
  if (!options.dryRun && options.specFile && autoApplicable.length > 0) {
    console.log(`\n📝 Applying ${autoApplicable.length} fix(es) to: ${options.specFile}`);
    
    const spec = loadJson(options.specFile);
    let appliedCount = 0;
    
    // Last step first, so an inserted step can't shift a later fix's position
    for (const proposal of [...autoApplicable].sort((a, b) => b.stepIndex - a.stepIndex)) {
      if (applyFix(spec, proposal, options.specFile)) {
        appliedCount++;
      }
    }

    const outputPath = options.output || options.specFile;
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    
    console.log(`✅ Applied ${appliedCount} fix(es) to: ${outputPath}`);
    
    if (needsReview.length > 0) {
      console.log(`\n⚠️  ${needsReview.length} issue(s) require manual review`);
    }
  } else if (options.dryRun) {
    console.log('\n📋 Dry run complete - no changes made');
  } else if (!options.specFile) {
    console.log('\n💡 Provide --spec <path> to apply fixes');
  }

  // Exit with error code if there are unresolved issues
  process.exit(needsReview.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
