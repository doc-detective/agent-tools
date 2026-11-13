#!/usr/bin/env node
var d=require("fs"),p=require("path"),F=80,_=3,w=[{pattern:/No elements matched|Element.*not found|selector.*not found|Cannot find/i,type:"element_not_found",strategies:[{name:"update_text",confidence:70,description:"Element text may have changed"},{name:"update_selector",confidence:50,description:"Selector may need adjustment"}]},{pattern:/timeout|timed out|exceeded/i,type:"timeout",strategies:[{name:"increase_timeout",confidence:85,description:"Increase wait time"}]},{pattern:/Couldn't open URL|unresolvable URL|navigation|redirect|url.*changed|net::ERR/i,type:"navigation",strategies:[{name:"update_url",confidence:90,description:"URL may have changed"},{name:"handle_redirect",confidence:70,description:"Add redirect handling"}]},{pattern:/status.*code|401|403|404|500|HTTP/i,type:"http_error",strategies:[{name:"update_expected_status",confidence:60,description:"Status code expectation may need update"},{name:"add_auth",confidence:45,description:"Authentication may be required"}]},{pattern:/text.*mismatch|expected.*but.*got|does not match/i,type:"text_mismatch",strategies:[{name:"update_expected_text",confidence:88,description:"Expected text has changed"}]},{pattern:/click.*failed|not clickable|intercepted/i,type:"click_failed",strategies:[{name:"wait_for_clickable",confidence:75,description:"Wait for element to be clickable"}]}];function I(n){let t={resultsFile:null,specFile:null,threshold:F,autoFix:!1,dryRun:!1,maxIterations:_,output:null};for(let s=0;s<n.length;s++){let e=n[s];e==="--spec"&&n[s+1]?t.specFile=n[++s]:e==="--threshold"&&n[s+1]?t.threshold=parseInt(n[++s],10):e==="--auto-fix"?t.autoFix=!0:e==="--dry-run"?t.dryRun=!0:e==="--max-iterations"&&n[s+1]?t.maxIterations=parseInt(n[++s],10):e==="--output"&&n[s+1]?t.output=n[++s]:!e.startsWith("-")&&!t.resultsFile&&(t.resultsFile=e)}return t}function g(n){let t=(0,p.resolve)(n);if(!(0,d.existsSync)(t))throw new Error(`File not found: ${t}`);return JSON.parse((0,d.readFileSync)(t,"utf8"))}function k(n){let{testId:t,stepId:s,error:e,step:o}=n,c={testIndex:n.testIndex,stepIndex:n.stepIndex,contentPath:n.contentPath},r=[];for(let i of w)if(i.pattern.test(e)){for(let l of i.strategies)r.push({...c,testId:t,stepId:s,error:e,errorType:i.type,strategy:l.name,confidence:l.confidence,description:l.description,originalStep:o,proposedFix:m(l.name,o,e)});break}return r.length===0&&r.push({...c,testId:t,stepId:s,errorType:"unknown",strategy:"manual_review",confidence:20,description:"Unknown error pattern - manual review required",originalStep:o,proposedFix:null}),r.sort((i,l)=>l.confidence-i.confidence)[0]}var f=n=>typeof n=="string"&&/\$[A-Za-z_]/.test(n);function m(n,t,s){if(!t)return null;let e=JSON.parse(JSON.stringify(t));switch(n){case"update_text":{let o=s.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2]||o[3];e.click&&typeof e.click=="string"?f(e.click)||(e.click=c):e.find&&typeof e.find=="string"&&(f(e.find)||(e.find=c))}break}case"increase_timeout":e.find&&typeof e.find=="object"?e.find.timeout=(e.find.timeout||5e3)*2:e.click&&typeof e.click=="object"?e.click.timeout=(e.click.timeout||5e3)*2:e.wait&&typeof e.wait=="number"&&(e.wait=e.wait*2);break;case"update_url":{let o=s.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);if(o&&e.goTo){let c=o[1]||o[2]||o[3];typeof e.goTo=="string"?f(e.goTo)||(e.goTo=c):typeof e.goTo=="object"&&(f(e.goTo.url)||(e.goTo.url=c))}break}case"update_expected_text":{let o=s.match(/got "([^"]+)"|actual: "([^"]+)"/i);if(o){let c=o[1]||o[2];e.find?.elementText&&!f(e.find.elementText)&&(e.find.elementText=c)}break}case"wait_for_clickable":e.click&&typeof e.click=="object"&&(e.click.timeout=(e.click.timeout||5e3)*2);break;case"update_selector":case"update_expected_status":case"add_auth":case"handle_redirect":case"manual_review":return null}return JSON.stringify(e)===JSON.stringify(t)?null:e}function b(n){if(!Array.isArray(n?.specs))throw new Error('Not a Doc Detective results file: expected a "specs" array. Write one with: doc-detective --output <file>');let t=[],s=new Set;for(let e of n.specs)(e.tests||[]).forEach((o,c)=>{for(let r of o.contexts||[])(r.steps||[]).forEach((i,l)=>{if(i.result!=="FAIL")return;let a=JSON.stringify([e.contentPath,o.testId,i.stepId,l]);if(s.has(a))return;s.add(a);let{result:u,resultDescription:h,resultCode:A,resultHint:v,stepId:x,location:E,startedAt:R,durationMs:j,attempts:O,outputs:P,assertions:N,autoScreenshotPath:M,...y}=i;t.push({testId:o.testId,stepId:x,testIndex:c,stepIndex:l,contentPath:e.contentPath,error:h||"Unknown error",step:y})})});return t}function S(n,t,s){if(!t.proposedFix)return!1;let e=n.tests||[];if(!t.contentPath||(0,p.resolve)(t.contentPath)!==(0,p.resolve)(s))return!1;let o=e[t.testIndex],c=e.find(a=>a.testId===t.testId)||(o&&!o.testId?o:null);if(!c)return!1;let r=c.steps||[],i=r.findIndex(a=>a.stepId===t.stepId);if(i<0){let a=r[t.stepIndex];if(!(a&&!a.stepId&&Object.keys(t.originalStep||{}).some(h=>h in a)))return!1;i=t.stepIndex}let l=m(t.strategy,r[i],t.error);return l?(r[i]=l,!0):!1}function T(n,t,s){let e=s||n.confidence>=t,o=n.proposedFix?e?"\u{1F527}":"\u26A0\uFE0F":"\u274C",c=n.confidence>=80?"HIGH":n.confidence>=60?"MEDIUM":"LOW",r=`
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
`,!e&&!s&&(r+=`
   \u2192 Below threshold (${t}%) - flagging for user review
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
`),process.exit(0));let t=I(n);t.resultsFile||(console.error("Error: Results file required"),process.exit(1)),console.log(`
\u{1F4CA} Loading results from: ${t.resultsFile}`);let s=g(t.resultsFile),e=b(s);e.length===0&&(console.log("\u2705 No failures found in results!"),process.exit(0)),console.log(`
\u274C Found ${e.length} failure(s)
`);let o=e.map(k);console.log("\u2500".repeat(60)),console.log("PROPOSED FIXES"),console.log("\u2500".repeat(60));for(let i of o)console.log(T(i,t.threshold,t.autoFix));let c=o.filter(i=>i.proposedFix&&(t.autoFix||i.confidence>=t.threshold)),r=o.filter(i=>!i.proposedFix||!t.autoFix&&i.confidence<t.threshold);if(console.log("\u2500".repeat(60)),console.log("SUMMARY"),console.log("\u2500".repeat(60)),console.log(`  Total failures:     ${e.length}`),console.log(`  Auto-applicable:    ${c.length}`),console.log(`  Needs review:       ${r.length}`),console.log(`  Threshold:          ${t.threshold}%`),console.log(`  Mode:               ${t.dryRun?"dry-run":t.autoFix?"auto-fix":"threshold-based"}`),!t.dryRun&&t.specFile&&c.length>0){console.log(`
\u{1F4DD} Applying ${c.length} fix(es) to: ${t.specFile}`);let i=g(t.specFile),l=0;for(let u of c)S(i,u,t.specFile)?l++:r.push(u);let a=t.output||t.specFile;(0,d.writeFileSync)(a,JSON.stringify(i,null,2)),console.log(`\u2705 Applied ${l} fix(es) to: ${a}`),r.length>0&&console.log(`
\u26A0\uFE0F  ${r.length} issue(s) require manual review`)}else t.dryRun?console.log(`
\u{1F4CB} Dry run complete - no changes made`):t.specFile||console.log(`
\u{1F4A1} Provide --spec <path> to apply fixes`);process.exit(r.length>0?1:0)}$().catch(n=>{console.error("Error:",n.message),process.exit(1)});
