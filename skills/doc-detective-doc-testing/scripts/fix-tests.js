#!/usr/bin/env node
var f=require("fs"),h=require("path"),y=80,_=3,w=[{pattern:/No elements matched|Element.*not found|selector.*not found|Cannot find/i,type:"element_not_found",strategies:[{name:"update_text",confidence:70,description:"Element text may have changed"},{name:"add_wait",confidence:60,description:"Element may need more time to load"},{name:"update_selector",confidence:50,description:"Selector may need adjustment"}]},{pattern:/timeout|timed out|exceeded/i,type:"timeout",strategies:[{name:"increase_timeout",confidence:85,description:"Increase wait time"},{name:"add_explicit_wait",confidence:75,description:"Add explicit wait for element"}]},{pattern:/Couldn't open URL|unresolvable URL|navigation|redirect|url.*changed|net::ERR/i,type:"navigation",strategies:[{name:"update_url",confidence:90,description:"URL may have changed"},{name:"handle_redirect",confidence:70,description:"Add redirect handling"}]},{pattern:/status.*code|401|403|404|500|HTTP/i,type:"http_error",strategies:[{name:"update_expected_status",confidence:60,description:"Status code expectation may need update"},{name:"add_auth",confidence:45,description:"Authentication may be required"}]},{pattern:/text.*mismatch|expected.*but.*got|does not match/i,type:"text_mismatch",strategies:[{name:"update_expected_text",confidence:88,description:"Expected text has changed"}]},{pattern:/click.*failed|not clickable|intercepted/i,type:"click_failed",strategies:[{name:"wait_for_clickable",confidence:75,description:"Wait for element to be clickable"},{name:"scroll_into_view",confidence:65,description:"Element may need scrolling"}]}];function F(n){let e={resultsFile:null,specFile:null,threshold:y,autoFix:!1,dryRun:!1,maxIterations:_,output:null};for(let i=0;i<n.length;i++){let t=n[i];t==="--spec"&&n[i+1]?e.specFile=n[++i]:t==="--threshold"&&n[i+1]?e.threshold=parseInt(n[++i],10):t==="--auto-fix"?e.autoFix=!0:t==="--dry-run"?e.dryRun=!0:t==="--max-iterations"&&n[i+1]?e.maxIterations=parseInt(n[++i],10):t==="--output"&&n[i+1]?e.output=n[++i]:!t.startsWith("-")&&!e.resultsFile&&(e.resultsFile=t)}return e}function m(n){let e=(0,h.resolve)(n);if(!(0,f.existsSync)(e))throw new Error(`File not found: ${e}`);return JSON.parse((0,f.readFileSync)(e,"utf8"))}function I(n){let{testId:e,stepId:i,error:t,step:o}=n,c={testIndex:n.testIndex,stepIndex:n.stepIndex,contentPath:n.contentPath},r=[];for(let s of w)if(s.pattern.test(t)){for(let l of s.strategies)r.push({...c,testId:e,stepId:i,error:t,errorType:s.type,strategy:l.name,confidence:l.confidence,description:l.description,originalStep:o,proposedFix:g(l.name,o,t)});break}return r.length===0&&r.push({...c,testId:e,stepId:i,errorType:"unknown",strategy:"manual_review",confidence:20,description:"Unknown error pattern - manual review required",originalStep:o,proposedFix:null}),r.sort((s,l)=>l.confidence-s.confidence)[0]}function g(n,e,i){if(!e)return null;let t=JSON.parse(JSON.stringify(e));switch(n){case"update_text":{let o=i.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2]||o[3];t.click&&typeof t.click=="string"?t.click=c:t.find&&typeof t.find=="string"&&(t.find=c)}break}case"add_wait":return{_insertBefore:!0,wait:1e4};case"increase_timeout":t.find&&typeof t.find=="object"?t.find.timeout=(t.find.timeout||5e3)*2:t.click&&typeof t.click=="object"?t.click.timeout=(t.click.timeout||5e3)*2:t.wait&&typeof t.wait=="number"&&(t.wait=t.wait*2);break;case"add_explicit_wait":return{_insertBefore:!0,wait:5e3};case"update_url":{let o=i.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);if(o&&t.goTo){let c=o[1]||o[2]||o[3];typeof t.goTo=="string"?t.goTo=c:typeof t.goTo=="object"&&(t.goTo.url=c)}break}case"update_expected_text":{let o=i.match(/got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2];t.find?.elementText&&(t.find.elementText=c)}break}case"wait_for_clickable":t.click&&typeof t.click=="object"&&(t.click.timeout=(t.click.timeout||5e3)*2);break;case"scroll_into_view":return{_insertBefore:!0,runCode:{language:"javascript",code:`document.querySelector('${k(e)}')?.scrollIntoView({ behavior: 'smooth', block: 'center' });`}};case"update_selector":case"update_expected_status":case"add_auth":case"handle_redirect":case"manual_review":return null}return JSON.stringify(t)===JSON.stringify(e)?null:t}function k(n){return n?n.click?typeof n.click=="string"?`text="${n.click}"`:n.click.selector||"*":n.find?typeof n.find=="string"?`text="${n.find}"`:n.find.selector||"*":n.type&&n.type.selector?n.type.selector:"*":"*"}function b(n){if(!Array.isArray(n?.specs))throw new Error('Not a Doc Detective results file: expected a "specs" array. Write one with: doc-detective --output <file>');let e=[],i=new Set;for(let t of n.specs)(t.tests||[]).forEach((o,c)=>{for(let r of o.contexts||[])(r.steps||[]).forEach((s,l)=>{if(s.result!=="FAIL")return;let a=JSON.stringify([t.contentPath,o.testId,s.stepId,l]);if(i.has(a))return;i.add(a);let{result:d,resultDescription:p,stepId:u,location:T,durationMs:E,outputs:A,assertions:j,...x}=s;e.push({testId:o.testId,stepId:u,testIndex:c,stepIndex:l,contentPath:t.contentPath,error:p||"Unknown error",step:x})})});return e}function $(n,e,i){if(!e.proposedFix)return!1;let t=n.tests||[],o=e.contentPath&&(0,h.resolve)(e.contentPath)===(0,h.resolve)(i);if(e.contentPath&&!o)return!1;let c=t[e.testIndex],r=t.find(d=>d.testId===e.testId)||(o&&c&&!c.testId?c:null);if(!r)return!1;let s=r.steps||[],l=s.findIndex(d=>d.stepId===e.stepId);if(l<0){let d=s[e.stepIndex];if(!(d&&!d.stepId&&Object.keys(e.originalStep||{}).some(u=>u in d)))return!1;l=e.stepIndex}let a=g(e.strategy,s[l],e.error);return a?(a._insertBefore?(delete a._insertBefore,s.splice(l,0,a)):s[l]=a,!0):!1}function v(n,e,i){let t=i||n.confidence>=e,o=n.proposedFix?t?"\u{1F527}":"\u26A0\uFE0F":"\u274C",c=n.confidence>=80?"HIGH":n.confidence>=60?"MEDIUM":"LOW",r=`
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
`,!t&&!i&&(r+=`
   \u2192 Below threshold (${e}%) - flagging for user review
`)):r+=`
   \u2192 No automatic fix available - manual review required
`,r}async function S(){let n=process.argv.slice(2);(n.includes("--help")||n.includes("-h")||n.length===0)&&(console.log(`
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
`),process.exit(0));let e=F(n);e.resultsFile||(console.error("Error: Results file required"),process.exit(1)),console.log(`
\u{1F4CA} Loading results from: ${e.resultsFile}`);let i=m(e.resultsFile),t=b(i);t.length===0&&(console.log("\u2705 No failures found in results!"),process.exit(0)),console.log(`
\u274C Found ${t.length} failure(s)
`);let o=t.map(I);console.log("\u2500".repeat(60)),console.log("PROPOSED FIXES"),console.log("\u2500".repeat(60));for(let s of o)console.log(v(s,e.threshold,e.autoFix));let c=o.filter(s=>s.proposedFix&&(e.autoFix||s.confidence>=e.threshold)),r=o.filter(s=>!s.proposedFix||!e.autoFix&&s.confidence<e.threshold);if(console.log("\u2500".repeat(60)),console.log("SUMMARY"),console.log("\u2500".repeat(60)),console.log(`  Total failures:     ${t.length}`),console.log(`  Auto-applicable:    ${c.length}`),console.log(`  Needs review:       ${r.length}`),console.log(`  Threshold:          ${e.threshold}%`),console.log(`  Mode:               ${e.dryRun?"dry-run":e.autoFix?"auto-fix":"threshold-based"}`),!e.dryRun&&e.specFile&&c.length>0){console.log(`
\u{1F4DD} Applying ${c.length} fix(es) to: ${e.specFile}`);let s=m(e.specFile),l=0;for(let d of[...c].sort((p,u)=>u.stepIndex-p.stepIndex))$(s,d,e.specFile)&&l++;let a=e.output||e.specFile;(0,f.writeFileSync)(a,JSON.stringify(s,null,2)),console.log(`\u2705 Applied ${l} fix(es) to: ${a}`),r.length>0&&console.log(`
\u26A0\uFE0F  ${r.length} issue(s) require manual review`)}else e.dryRun?console.log(`
\u{1F4CB} Dry run complete - no changes made`):e.specFile||console.log(`
\u{1F4A1} Provide --spec <path> to apply fixes`);process.exit(r.length>0?1:0)}S().catch(n=>{console.error("Error:",n.message),process.exit(1)});
