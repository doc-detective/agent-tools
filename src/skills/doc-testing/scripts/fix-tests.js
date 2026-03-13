#!/usr/bin/env node
var l=require("fs"),p=require("path"),m=80,g=3,x=[{pattern:/Element.*not found|selector.*not found|Cannot find/i,type:"element_not_found",strategies:[{name:"update_text",confidence:70,description:"Element text may have changed"},{name:"add_wait",confidence:60,description:"Element may need more time to load"},{name:"update_selector",confidence:50,description:"Selector may need adjustment"}]},{pattern:/timeout|timed out|exceeded/i,type:"timeout",strategies:[{name:"increase_timeout",confidence:85,description:"Increase wait time"},{name:"add_explicit_wait",confidence:75,description:"Add explicit wait for element"}]},{pattern:/navigation|redirect|url.*changed|net::ERR/i,type:"navigation",strategies:[{name:"update_url",confidence:90,description:"URL may have changed"},{name:"handle_redirect",confidence:70,description:"Add redirect handling"}]},{pattern:/status.*code|401|403|404|500|HTTP/i,type:"http_error",strategies:[{name:"update_expected_status",confidence:60,description:"Status code expectation may need update"},{name:"add_auth",confidence:45,description:"Authentication may be required"}]},{pattern:/text.*mismatch|expected.*but.*got|does not match/i,type:"text_mismatch",strategies:[{name:"update_expected_text",confidence:88,description:"Expected text has changed"}]},{pattern:/click.*failed|not clickable|intercepted/i,type:"click_failed",strategies:[{name:"wait_for_clickable",confidence:75,description:"Wait for element to be clickable"},{name:"scroll_into_view",confidence:65,description:"Element may need scrolling"}]}];function y(n){let t={resultsFile:null,specFile:null,threshold:m,autoFix:!1,dryRun:!1,maxIterations:g,output:null};for(let s=0;s<n.length;s++){let e=n[s];e==="--spec"&&n[s+1]?t.specFile=n[++s]:e==="--threshold"&&n[s+1]?t.threshold=parseInt(n[++s],10):e==="--auto-fix"?t.autoFix=!0:e==="--dry-run"?t.dryRun=!0:e==="--max-iterations"&&n[s+1]?t.maxIterations=parseInt(n[++s],10):e==="--output"&&n[s+1]?t.output=n[++s]:!e.startsWith("-")&&!t.resultsFile&&(t.resultsFile=e)}return t}function f(n){let t=(0,p.resolve)(n);if(!(0,l.existsSync)(t))throw new Error(`File not found: ${t}`);return JSON.parse((0,l.readFileSync)(t,"utf8"))}function _(n){let{testId:t,stepId:s,error:e,step:i}=n,o=[];for(let r of x)if(r.pattern.test(e)){for(let c of r.strategies)o.push({testId:t,stepId:s,errorType:r.type,strategy:c.name,confidence:c.confidence,description:c.description,originalStep:i,proposedFix:w(c.name,i,e)});break}return o.length===0&&o.push({testId:t,stepId:s,errorType:"unknown",strategy:"manual_review",confidence:20,description:"Unknown error pattern - manual review required",originalStep:i,proposedFix:null}),o.sort((r,c)=>c.confidence-r.confidence)[0]}function w(n,t,s){if(!t)return null;let e=JSON.parse(JSON.stringify(t));switch(n){case"update_text":{let i=s.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);if(i){let o=i[1]||i[2]||i[3];e.click&&typeof e.click=="string"?e.click=o:e.find&&typeof e.find=="string"&&(e.find=o)}break}case"add_wait":return{_insertBefore:!0,wait:{selector:u(t),state:"visible",timeout:1e4}};case"increase_timeout":e.find&&typeof e.find=="object"?e.find.timeout=(e.find.timeout||5e3)*2:e.click&&typeof e.click=="object"?e.click.timeout=(e.click.timeout||5e3)*2:e.wait&&typeof e.wait=="number"&&(e.wait=e.wait*2);break;case"add_explicit_wait":return{_insertBefore:!0,wait:5e3};case"update_url":{let i=s.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);if(i&&e.goTo){let o=i[1]||i[2]||i[3];typeof e.goTo=="string"?e.goTo=o:typeof e.goTo=="object"&&(e.goTo.url=o)}break}case"update_expected_text":{let i=s.match(/got "([^"]+)"|actual: "([^"]+)"/i);if(i){let o=i[1]||i[2];e.find&&typeof e.find=="object"&&e.find.matchText&&(e.find.matchText=o)}break}case"wait_for_clickable":e.click&&typeof e.click=="object"&&(e.click.waitForClickable=!0);break;case"scroll_into_view":return{_insertBefore:!0,runCode:{language:"javascript",code:`document.querySelector('${u(t)}')?.scrollIntoView({ behavior: 'smooth', block: 'center' });`}};case"update_selector":case"update_expected_status":case"add_auth":case"handle_redirect":case"manual_review":return null}return e}function u(n){return n?n.click?typeof n.click=="string"?`text="${n.click}"`:n.click.selector||"*":n.find?typeof n.find=="string"?`text="${n.find}"`:n.find.selector||"*":n.type&&n.type.selector?n.type.selector:"*":"*"}function F(n){let t=[],s=n.tests||n.results?.tests||[];for(let e of s)if(e.status==="FAIL"||e.status==="failed"){let i=e.steps||[];for(let o of i)(o.status==="FAIL"||o.status==="failed")&&t.push({testId:e.testId||e.id,stepId:o.stepId||o.id,error:o.error||o.message||"Unknown error",step:o.step||o.action})}return t}function k(n,t){if(!t.proposedFix)return!1;let s=n.tests||[];for(let e of s)if(e.testId===t.testId){let i=e.steps||[];for(let o=0;o<i.length;o++)if(i[o].stepId===t.stepId||o===parseInt(t.stepId,10)){if(t.proposedFix._insertBefore){let r={...t.proposedFix};delete r._insertBefore,i.splice(o,0,r)}else i[o]={...i[o],...t.proposedFix};return!0}}return!1}function b(n,t,s){let e=s||n.confidence>=t,i=n.proposedFix?e?"\u{1F527}":"\u26A0\uFE0F":"\u274C",o=n.confidence>=80?"HIGH":n.confidence>=60?"MEDIUM":"LOW",r=`
${i} ${n.testId} \u2192 Step: ${n.stepId}
   Error Type: ${n.errorType}
   Strategy: ${n.strategy}
   Confidence: ${n.confidence}% (${o})
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
`,r}async function I(){let n=process.argv.slice(2);(n.includes("--help")||n.includes("-h")||n.length===0)&&(console.log(`
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
`),process.exit(0));let t=y(n);t.resultsFile||(console.error("Error: Results file required"),process.exit(1)),console.log(`
\u{1F4CA} Loading results from: ${t.resultsFile}`);let s=f(t.resultsFile),e=F(s);e.length===0&&(console.log("\u2705 No failures found in results!"),process.exit(0)),console.log(`
\u274C Found ${e.length} failure(s)
`);let i=e.map(_);console.log("\u2500".repeat(60)),console.log("PROPOSED FIXES"),console.log("\u2500".repeat(60));for(let c of i)console.log(b(c,t.threshold,t.autoFix));let o=i.filter(c=>c.proposedFix&&(t.autoFix||c.confidence>=t.threshold)),r=i.filter(c=>!c.proposedFix||!t.autoFix&&c.confidence<t.threshold);if(console.log("\u2500".repeat(60)),console.log("SUMMARY"),console.log("\u2500".repeat(60)),console.log(`  Total failures:     ${e.length}`),console.log(`  Auto-applicable:    ${o.length}`),console.log(`  Needs review:       ${r.length}`),console.log(`  Threshold:          ${t.threshold}%`),console.log(`  Mode:               ${t.dryRun?"dry-run":t.autoFix?"auto-fix":"threshold-based"}`),!t.dryRun&&t.specFile&&o.length>0){console.log(`
\u{1F4DD} Applying ${o.length} fix(es) to: ${t.specFile}`);let c=f(t.specFile),a=0;for(let h of o)k(c,h)&&a++;let d=t.output||t.specFile;(0,l.writeFileSync)(d,JSON.stringify(c,null,2)),console.log(`\u2705 Applied ${a} fix(es) to: ${d}`),r.length>0&&console.log(`
\u26A0\uFE0F  ${r.length} issue(s) require manual review`)}else t.dryRun?console.log(`
\u{1F4CB} Dry run complete - no changes made`):t.specFile||console.log(`
\u{1F4A1} Provide --spec <path> to apply fixes`);process.exit(r.length>0?1:0)}I().catch(n=>{console.error("Error:",n.message),process.exit(1)});
