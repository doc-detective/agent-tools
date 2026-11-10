#!/usr/bin/env node
var u=require("fs"),f=require("path"),y=80,F=3,w=[{pattern:/No elements matched|Element.*not found|selector.*not found|Cannot find/i,type:"element_not_found",strategies:[{name:"update_text",confidence:70,description:"Element text may have changed"},{name:"update_selector",confidence:50,description:"Selector may need adjustment"}]},{pattern:/timeout|timed out|exceeded/i,type:"timeout",strategies:[{name:"increase_timeout",confidence:85,description:"Increase wait time"}]},{pattern:/Couldn't open URL|unresolvable URL|navigation|redirect|url.*changed|net::ERR/i,type:"navigation",strategies:[{name:"update_url",confidence:90,description:"URL may have changed"},{name:"handle_redirect",confidence:70,description:"Add redirect handling"}]},{pattern:/status.*code|401|403|404|500|HTTP/i,type:"http_error",strategies:[{name:"update_expected_status",confidence:60,description:"Status code expectation may need update"},{name:"add_auth",confidence:45,description:"Authentication may be required"}]},{pattern:/text.*mismatch|expected.*but.*got|does not match/i,type:"text_mismatch",strategies:[{name:"update_expected_text",confidence:88,description:"Expected text has changed"}]},{pattern:/click.*failed|not clickable|intercepted/i,type:"click_failed",strategies:[{name:"wait_for_clickable",confidence:75,description:"Wait for element to be clickable"}]}];function _(n){let e={resultsFile:null,specFile:null,threshold:y,autoFix:!1,dryRun:!1,maxIterations:F,output:null};for(let s=0;s<n.length;s++){let t=n[s];t==="--spec"&&n[s+1]?e.specFile=n[++s]:t==="--threshold"&&n[s+1]?e.threshold=parseInt(n[++s],10):t==="--auto-fix"?e.autoFix=!0:t==="--dry-run"?e.dryRun=!0:t==="--max-iterations"&&n[s+1]?e.maxIterations=parseInt(n[++s],10):t==="--output"&&n[s+1]?e.output=n[++s]:!t.startsWith("-")&&!e.resultsFile&&(e.resultsFile=t)}return e}function g(n){let e=(0,f.resolve)(n);if(!(0,u.existsSync)(e))throw new Error(`File not found: ${e}`);return JSON.parse((0,u.readFileSync)(e,"utf8"))}function I(n){let{testId:e,stepId:s,error:t,step:o}=n,c={testIndex:n.testIndex,stepIndex:n.stepIndex,contentPath:n.contentPath},r=[];for(let i of w)if(i.pattern.test(t)){for(let l of i.strategies)r.push({...c,testId:e,stepId:s,error:t,errorType:i.type,strategy:l.name,confidence:l.confidence,description:l.description,originalStep:o,proposedFix:m(l.name,o,t)});break}return r.length===0&&r.push({...c,testId:e,stepId:s,errorType:"unknown",strategy:"manual_review",confidence:20,description:"Unknown error pattern - manual review required",originalStep:o,proposedFix:null}),r.sort((i,l)=>l.confidence-i.confidence)[0]}function m(n,e,s){if(!e)return null;let t=JSON.parse(JSON.stringify(e));switch(n){case"update_text":{let o=s.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2]||o[3];t.click&&typeof t.click=="string"?t.click=c:t.find&&typeof t.find=="string"&&(t.find=c)}break}case"increase_timeout":t.find&&typeof t.find=="object"?t.find.timeout=(t.find.timeout||5e3)*2:t.click&&typeof t.click=="object"?t.click.timeout=(t.click.timeout||5e3)*2:t.wait&&typeof t.wait=="number"&&(t.wait=t.wait*2);break;case"update_url":{let o=s.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);if(o&&t.goTo){let c=o[1]||o[2]||o[3];typeof t.goTo=="string"?t.goTo=c:typeof t.goTo=="object"&&(t.goTo.url=c)}break}case"update_expected_text":{let o=s.match(/got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2];t.find?.elementText&&(t.find.elementText=c)}break}case"wait_for_clickable":t.click&&typeof t.click=="object"&&(t.click.timeout=(t.click.timeout||5e3)*2);break;case"update_selector":case"update_expected_status":case"add_auth":case"handle_redirect":case"manual_review":return null}return JSON.stringify(t)===JSON.stringify(e)?null:t}function k(n){if(!Array.isArray(n?.specs))throw new Error('Not a Doc Detective results file: expected a "specs" array. Write one with: doc-detective --output <file>');let e=[],s=new Set;for(let t of n.specs)(t.tests||[]).forEach((o,c)=>{for(let r of o.contexts||[])(r.steps||[]).forEach((i,l)=>{if(i.result!=="FAIL")return;let d=JSON.stringify([t.contentPath,o.testId,i.stepId,l]);if(s.has(d))return;s.add(d);let{result:a,resultDescription:h,stepId:p,location:T,durationMs:v,outputs:A,assertions:E,...x}=i;e.push({testId:o.testId,stepId:p,testIndex:c,stepIndex:l,contentPath:t.contentPath,error:h||"Unknown error",step:x})})});return e}function b(n,e,s){if(!e.proposedFix)return!1;let t=n.tests||[],o=e.contentPath&&(0,f.resolve)(e.contentPath)===(0,f.resolve)(s);if(e.contentPath&&!o)return!1;let c=t[e.testIndex],r=t.find(a=>a.testId===e.testId)||(o&&c&&!c.testId?c:null);if(!r)return!1;let i=r.steps||[],l=i.findIndex(a=>a.stepId===e.stepId);if(l<0){let a=i[e.stepIndex];if(!(a&&!a.stepId&&Object.keys(e.originalStep||{}).some(p=>p in a)))return!1;l=e.stepIndex}let d=m(e.strategy,i[l],e.error);return d?(i[l]=d,!0):!1}function S(n,e,s){let t=s||n.confidence>=e,o=n.proposedFix?t?"\u{1F527}":"\u26A0\uFE0F":"\u274C",c=n.confidence>=80?"HIGH":n.confidence>=60?"MEDIUM":"LOW",r=`
${o} ${n.testId} \u2192 Step: ${n.stepId}
   Error Type: ${n.errorType}
   Strategy: ${n.strategy}
   Confidence: ${n.confidence}% (${c})
   ${n.description}
`;return n.proposedFix?(r+=`
   Original: ${JSON.stringify(n.originalStep,null,2).split(`
`).join(`
            `)}
   Proposed: ${JSON.stringify(n.proposedFix,null,2).split(`
`).join(`
            `)}
`,!t&&!s&&(r+=`
   \u2192 Below threshold (${e}%) - flagging for user review
`)):r+=`
   \u2192 No automatic fix available - manual review required
`,r}async function $(){let n=process.argv.slice(2);(n.includes("--help")||n.includes("-h")||n.length===0)&&(console.log(`
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
`),process.exit(0));let e=_(n);e.resultsFile||(console.error("Error: Results file required"),process.exit(1)),console.log(`
\u{1F4CA} Loading results from: ${e.resultsFile}`);let s=g(e.resultsFile),t=k(s);t.length===0&&(console.log("\u2705 No failures found in results!"),process.exit(0)),console.log(`
\u274C Found ${t.length} failure(s)
`);let o=t.map(I);console.log("\u2500".repeat(60)),console.log("PROPOSED FIXES"),console.log("\u2500".repeat(60));for(let i of o)console.log(S(i,e.threshold,e.autoFix));let c=o.filter(i=>i.proposedFix&&(e.autoFix||i.confidence>=e.threshold)),r=o.filter(i=>!i.proposedFix||!e.autoFix&&i.confidence<e.threshold);if(console.log("\u2500".repeat(60)),console.log("SUMMARY"),console.log("\u2500".repeat(60)),console.log(`  Total failures:     ${t.length}`),console.log(`  Auto-applicable:    ${c.length}`),console.log(`  Needs review:       ${r.length}`),console.log(`  Threshold:          ${e.threshold}%`),console.log(`  Mode:               ${e.dryRun?"dry-run":e.autoFix?"auto-fix":"threshold-based"}`),!e.dryRun&&e.specFile&&c.length>0){console.log(`
\u{1F4DD} Applying ${c.length} fix(es) to: ${e.specFile}`);let i=g(e.specFile),l=0;for(let a of c)b(i,a,e.specFile)&&l++;let d=e.output||e.specFile;(0,u.writeFileSync)(d,JSON.stringify(i,null,2)),console.log(`\u2705 Applied ${l} fix(es) to: ${d}`),r.length>0&&console.log(`
\u26A0\uFE0F  ${r.length} issue(s) require manual review`)}else e.dryRun?console.log(`
\u{1F4CB} Dry run complete - no changes made`):e.specFile||console.log(`
\u{1F4A1} Provide --spec <path> to apply fixes`);process.exit(r.length>0?1:0)}$().catch(n=>{console.error("Error:",n.message),process.exit(1)});
