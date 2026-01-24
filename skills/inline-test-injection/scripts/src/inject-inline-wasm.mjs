/**
 * WASM-compatible Inline Test Injection Script
 * 
 * Compiled with Javy to WebAssembly. Reads JSON input from stdin,
 * writes JSON result to stdout.
 * 
 * Input (stdin): {
 *   "action": "inject",
 *   "spec": { ... },           // Parsed test spec (already JSON)
 *   "sourceContent": "...",    // Source file content
 *   "sourcePath": "file.md",   // Path (for extension detection)
 *   "options": {
 *     "apply": true|false,
 *     "syntax": "json"|"yaml"|"xml"
 *   }
 * }
 * 
 * Output (stdout): {
 *   "success": true|false,
 *   "result": "updated content" | "preview",
 *   "applied": true|false,
 *   "stepCount": number,
 *   "unmatchedSteps": [...],
 *   "errors": [...]
 * }
 */

import {
  getCommentFormat,
  getExtname,
  serializeStepToInline,
  serializeTestToInline,
  serializeTestEnd,
  batchUpdateContent,
  generatePreview,
  COMMENT_FORMATS,
} from './format-utils-wasm.mjs';

// Default markup patterns for semantic matching
const DEFAULT_MARKUP_PATTERNS = {
  markdown: [
    {
      name: 'checkHyperlink',
      regex: /(?<!!)\[[^\]]+\]\(\s*(https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\s*\)/g,
      actions: ['checkLink'],
      captureGroups: { url: 1 },
    },
    {
      name: 'clickOnscreenText',
      regex: /\b(?:[Cc]lick|[Tt]ap|[Ll]eft-click|[Cc]hoose|[Ss]elect|[Cc]heck)\b\s+\*\*((?:(?!\*\*).)+)\*\*/g,
      actions: ['click'],
      captureGroups: { text: 1 },
    },
    {
      name: 'findOnscreenText',
      regex: /\*\*((?:(?!\*\*).)+)\*\*/g,
      actions: ['find'],
      captureGroups: { text: 1 },
    },
    {
      name: 'goToUrl',
      regex: /\b(?:[Gg]o\s+to|[Oo]pen|[Nn]avigate\s+to|[Vv]isit|[Aa]ccess|[Pp]roceed\s+to|[Ll]aunch)\b\s+\[[^\]]+\]\(\s*(https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\s*\)/g,
      actions: ['goTo'],
      captureGroups: { url: 1 },
    },
    {
      name: 'typeText',
      regex: /\b(?:[Pp]ress|[Ee]nter|[Tt]ype)\b\s+"([^"]+)"/g,
      actions: ['type'],
      captureGroups: { keys: 1 },
    },
    {
      name: 'screenshotImage',
      regex: /!\[[^\]]*\]\(\s*([^\s)]+)(?:\s+"[^"]*")?\s*\)/g,
      actions: ['screenshot'],
      captureGroups: { path: 1 },
    },
  ],
  html: [
    {
      name: 'checkHyperlink',
      regex: /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g,
      actions: ['checkLink'],
      captureGroups: { url: 1 },
    },
    {
      name: 'clickOnscreenText',
      regex: /\b(?:[Cc]lick|[Tt]ap)\b\s+<(?:strong|b)>((?:(?!<\/(?:strong|b)>).)+)<\/(?:strong|b)>/g,
      actions: ['click'],
      captureGroups: { text: 1 },
    },
    {
      name: 'findOnscreenText',
      regex: /<(?:strong|b)>((?:(?!<\/(?:strong|b)>).)+)<\/(?:strong|b)>/g,
      actions: ['find'],
      captureGroups: { text: 1 },
    },
  ],
  asciidoc: [
    {
      name: 'checkHyperlink',
      regex: /https?:\/\/[^\s\[]+\[[^\]]*\]/g,
      actions: ['checkLink'],
      captureGroups: { url: 0 },
    },
    {
      name: 'clickOnscreenText',
      regex: /\b(?:[Cc]lick|[Tt]ap)\b\s+\*([^*]+)\*/g,
      actions: ['click'],
      captureGroups: { text: 1 },
    },
    {
      name: 'findOnscreenText',
      regex: /\*([^*]+)\*/g,
      actions: ['find'],
      captureGroups: { text: 1 },
    },
  ],
  xml: [
    {
      name: 'checkHyperlink',
      regex: /<xref\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g,
      actions: ['checkLink'],
      captureGroups: { url: 1 },
    },
    {
      name: 'clickUiControl',
      regex: /(?:[Cc]lick|[Tt]ap|[Ss]elect)\s+(?:the\s+)?<uicontrol>([^<]+)<\/uicontrol>/g,
      actions: ['click'],
      captureGroups: { text: 1 },
    },
    {
      name: 'findUiControl',
      regex: /<uicontrol>([^<]+)<\/uicontrol>/g,
      actions: ['find'],
      captureGroups: { text: 1 },
    },
  ],
};

/**
 * Get file type from extension
 */
function getFileType(filePath) {
  const ext = getExtname(filePath).toLowerCase();
  
  if (['.md', '.markdown', '.mdx'].includes(ext)) return 'markdown';
  if (['.html', '.htm'].includes(ext)) return 'html';
  if (['.adoc', '.asciidoc', '.asc'].includes(ext)) return 'asciidoc';
  if (['.xml', '.dita', '.ditamap'].includes(ext)) return 'xml';
  
  return 'markdown';
}

/**
 * Get markup patterns for file type
 */
function getMarkupPatterns(fileType, config) {
  let patterns = DEFAULT_MARKUP_PATTERNS[fileType] || DEFAULT_MARKUP_PATTERNS.markdown;
  
  if (config?.customPatterns?.[fileType]) {
    const customPatterns = config.customPatterns[fileType].map(p => ({
      ...p,
      regex: new RegExp(p.regex, 'g'),
      actions: [p.action],
      captureGroups: p.valueGroup ? { value: p.valueGroup } : { value: 1 },
    }));
    patterns = [...patterns, ...customPatterns];
  }
  
  return patterns;
}

/**
 * Find all content matches in source file
 */
function findContentMatches(content, patterns) {
  const matches = [];
  
  for (const pattern of patterns) {
    const regexes = Array.isArray(pattern.regex) ? pattern.regex : [pattern.regex];
    
    for (const regex of regexes) {
      regex.lastIndex = 0;
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          patternName: pattern.name,
          actions: pattern.actions,
          captureGroups: pattern.captureGroups,
          matchText: match[0],
          captures: match.slice(1),
          offset: match.index,
          endOffset: match.index + match[0].length,
          lineNumber: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }
  
  matches.sort((a, b) => a.offset - b.offset);
  
  // Deduplicate overlapping matches - keep longer/more specific matches
  const deduplicated = [];
  for (const match of matches) {
    // Check if this match is contained within an existing match
    const containedInExisting = deduplicated.some(existing => 
      existing.offset <= match.offset && existing.endOffset >= match.endOffset
    );
    
    // Check if this match contains any existing matches (and should replace them)
    if (!containedInExisting) {
      // Remove any existing matches that are contained within this one
      const filtered = deduplicated.filter(existing =>
        !(match.offset <= existing.offset && match.endOffset >= existing.endOffset)
      );
      filtered.push(match);
      deduplicated.length = 0;
      deduplicated.push(...filtered);
    }
  }
  
  return deduplicated;
}

/**
 * Calculate similarity between step and content match
 */
function calculateSimilarity(step, match) {
  const stepAction = Object.keys(step).find(k => 
    !['stepId', 'description', 'sourceLocation'].includes(k)
  );
  
  const matchAction = match.actions[0];
  const matchActionName = typeof matchAction === 'string' ? matchAction : Object.keys(matchAction)[0];
  
  if (stepAction === matchActionName) {
    const stepValue = step[stepAction];
    const matchValue = match.captures[0] || match.matchText;
    
    if (typeof stepValue === 'string' && typeof matchValue === 'string') {
      if (stepValue === matchValue) return 1.0;
      if (stepValue.includes(matchValue) || matchValue.includes(stepValue)) return 0.8;
      
      const stepWords = stepValue.toLowerCase().split(/\s+/);
      const matchWords = matchValue.toLowerCase().split(/\s+/);
      const commonWords = stepWords.filter(w => matchWords.includes(w));
      if (commonWords.length > 0) {
        return 0.5 * (commonWords.length / Math.max(stepWords.length, matchWords.length));
      }
    }
    
    return 0.3;
  }
  
  return 0;
}

/**
 * Match steps to content
 */
function matchStepsToContent(steps, contentMatches) {
  const matchedSteps = [];
  const usedMatches = new Set();
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let bestMatch = null;
    let bestScore = 0;
    
    for (let j = 0; j < contentMatches.length; j++) {
      if (usedMatches.has(j)) continue;
      
      const match = contentMatches[j];
      let score = calculateSimilarity(step, match);
      
      if (matchedSteps.length > 0) {
        const lastMatchedOffset = matchedSteps[matchedSteps.length - 1].contentMatch?.offset ?? -1;
        if (match.offset > lastMatchedOffset) {
          score += 0.2;
        } else {
          score -= 0.1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { matchIndex: j, ...match };
      }
    }
    
    if (bestMatch && bestScore >= 0.3) {
      usedMatches.add(bestMatch.matchIndex);
      matchedSteps.push({
        step,
        stepIndex: i,
        contentMatch: bestMatch,
        score: bestScore,
      });
    } else {
      let suggestedOffset = 0;
      if (matchedSteps.length > 0) {
        const lastMatched = matchedSteps[matchedSteps.length - 1];
        suggestedOffset = lastMatched.contentMatch?.endOffset ?? 0;
      }
      
      matchedSteps.push({
        step,
        stepIndex: i,
        contentMatch: null,
        suggestedOffset,
        unmatched: true,
      });
    }
  }
  
  return matchedSteps;
}

/**
 * Generate update operations
 */
function generateUpdates(matchedSteps, test, commentFormat, syntaxFormat) {
  const updates = [];
  
  if (test.testId || test.description) {
    const firstStep = matchedSteps[0];
    const offset = firstStep?.contentMatch?.offset ?? firstStep?.suggestedOffset ?? 0;
    
    updates.push({
      offset,
      newContent: serializeTestToInline({
        test,
        commentFormat,
        syntaxFormat,
      }),
      insertAfter: false,
      type: 'testStart',
    });
  }
  
  for (const matched of matchedSteps) {
    const { step, contentMatch, suggestedOffset, unmatched } = matched;
    const offset = contentMatch?.endOffset ?? suggestedOffset ?? 0;
    
    updates.push({
      offset,
      newContent: serializeStepToInline({
        step,
        commentFormat,
        syntaxFormat,
      }),
      insertAfter: !!contentMatch,
      type: 'step',
      unmatched,
      matchedTo: contentMatch?.matchText,
    });
  }
  
  if (test.testId || test.description) {
    const lastStep = matchedSteps[matchedSteps.length - 1];
    const offset = lastStep?.contentMatch?.endOffset ?? lastStep?.suggestedOffset ?? 0;
    
    updates.push({
      offset: offset + 1,
      newContent: serializeTestEnd(commentFormat),
      insertAfter: true,
      type: 'testEnd',
    });
  }
  
  return updates;
}

/**
 * Main injection function
 */
function injectInlineTests(input) {
  const { spec, sourceContent, sourcePath, options = {}, config } = input;
  const { apply = false, syntax = 'json' } = options;
  
  const fileType = getFileType(sourcePath);
  const commentFormat = getCommentFormat(getExtname(sourcePath));
  const syntaxFormat = syntax;
  
  const patterns = getMarkupPatterns(fileType, config);
  const contentMatches = findContentMatches(sourceContent, patterns);
  
  const allUpdates = [];
  const unmatchedSteps = [];
  
  const tests = spec.tests || [spec];
  
  for (const test of tests) {
    const steps = test.steps || [];
    if (steps.length === 0) continue;
    
    const matchedSteps = matchStepsToContent(steps, contentMatches);
    
    const testUnmatched = matchedSteps.filter(m => m.unmatched);
    if (testUnmatched.length > 0) {
      unmatchedSteps.push({
        testId: test.testId,
        steps: testUnmatched.map(m => ({
          stepIndex: m.stepIndex,
          action: Object.keys(m.step).find(k => !['stepId', 'description'].includes(k)),
          suggestedLine: sourceContent.substring(0, m.suggestedOffset).split('\n').length,
        })),
      });
    }
    
    const updates = generateUpdates(matchedSteps, test, commentFormat, syntaxFormat);
    allUpdates.push(...updates);
  }
  
  const stepCount = allUpdates.filter(u => u.type === 'step').length;
  
  if (apply) {
    const updatedContent = batchUpdateContent({
      content: sourceContent,
      updates: allUpdates,
    });
    
    return {
      success: true,
      result: updatedContent,
      applied: true,
      stepCount,
      unmatchedSteps,
    };
  } else {
    const preview = generatePreview(sourceContent, allUpdates, sourcePath);
    
    return {
      success: true,
      result: preview,
      applied: false,
      stepCount,
      unmatchedSteps,
    };
  }
}

// WASI I/O: Read from stdin, write to stdout
function readStdin() {
  const chunks = [];
  const buffer = new Uint8Array(1024);
  
  // Javy provides Javy.IO for WASI I/O
  if (typeof Javy !== 'undefined' && Javy.IO) {
    while (true) {
      const bytesRead = Javy.IO.readSync(0, buffer);
      if (bytesRead === 0) break;
      chunks.push(buffer.slice(0, bytesRead));
    }
  } else {
    // Fallback for testing in Node.js (synchronous read not available)
    // This path is mainly for development testing
    return '';
  }
  
  // Combine chunks and decode
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Decode UTF-8
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(combined);
}

function writeStdout(str) {
  if (typeof Javy !== 'undefined' && Javy.IO) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    Javy.IO.writeSync(1, bytes);
  } else {
    // Fallback for testing
    console.log(str);
  }
}

function writeStderr(str) {
  if (typeof Javy !== 'undefined' && Javy.IO) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    Javy.IO.writeSync(2, bytes);
  } else {
    console.error(str);
  }
}

// Main entry point
function wasmMain() {
  try {
    const inputStr = readStdin();
    
    if (!inputStr || inputStr.trim() === '') {
      writeStderr('Error: No input provided\n');
      writeStdout(JSON.stringify({ success: false, error: 'No input provided', exitCode: 2 }));
      return;
    }
    
    let input;
    try {
      input = JSON.parse(inputStr);
    } catch (e) {
      writeStderr('Error: Invalid JSON input\n');
      writeStdout(JSON.stringify({ success: false, error: 'Invalid JSON input', exitCode: 2 }));
      return;
    }
    
    if (!input.action) {
      writeStderr('Error: Missing action field\n');
      writeStdout(JSON.stringify({ success: false, error: 'Missing action field', exitCode: 2 }));
      return;
    }
    
    if (input.action === 'inject') {
      if (!input.spec || !input.sourceContent || !input.sourcePath) {
        writeStderr('Error: Missing required fields (spec, sourceContent, sourcePath)\n');
        writeStdout(JSON.stringify({ 
          success: false, 
          error: 'Missing required fields (spec, sourceContent, sourcePath)',
          exitCode: 2
        }));
        return;
      }
      
      const result = injectInlineTests(input);
      result.exitCode = result.success ? 0 : 1;
      writeStdout(JSON.stringify(result));
      return;
    } else {
      writeStderr(`Error: Unknown action: ${input.action}\n`);
      writeStdout(JSON.stringify({ success: false, error: `Unknown action: ${input.action}`, exitCode: 2 }));
      return;
    }
  } catch (error) {
    writeStderr(`Error: ${error.message}\n`);
    writeStdout(JSON.stringify({ success: false, error: error.message, exitCode: 1 }));
  }
}

wasmMain();
