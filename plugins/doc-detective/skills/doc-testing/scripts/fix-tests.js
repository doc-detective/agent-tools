#!/usr/bin/env node
var l=require("fs"),a=require("path"),m=require("url"),S={},g=(0,m.fileURLToPath)(S.url),T=(0,a.dirname)(g),x=80,y=3,_=[{pattern:/Element.*not found|selector.*not found|Cannot find/i,type:"element_not_found",strategies:[{name:"update_text",confidence:70,description:"Element text may have changed"},{name:"add_wait",confidence:60,description:"Element may need more time to load"},{name:"update_selector",confidence:50,description:"Selector may need adjustment"}]},{pattern:/timeout|timed out|exceeded/i,type:"timeout",strategies:[{name:"increase_timeout",confidence:85,description:"Increase wait time"},{name:"add_explicit_wait",confidence:75,description:"Add explicit wait for element"}]},{pattern:/navigation|redirect|url.*changed|net::ERR/i,type:"navigation",strategies:[{name:"update_url",confidence:90,description:"URL may have changed"},{name:"handle_redirect",confidence:70,description:"Add redirect handling"}]},{pattern:/status.*code|401|403|404|500|HTTP/i,type:"http_error",strategies:[{name:"update_expected_status",confidence:60,description:"Status code expectation may need update"},{name:"add_auth",confidence:45,description:"Authentication may be required"}]},{pattern:/text.*mismatch|expected.*but.*got|does not match/i,type:"text_mismatch",strategies:[{name:"update_expected_text",confidence:88,description:"Expected text has changed"}]},{pattern:/click.*failed|not clickable|intercepted/i,type:"click_failed",strategies:[{name:"wait_for_clickable",confidence:75,description:"Wait for element to be clickable"},{name:"scroll_into_view",confidence:65,description:"Element may need scrolling"}]}];function w(o){let t={resultsFile:null,specFile:null,threshold:x,autoFix:!1,dryRun:!1,maxIterations:y,output:null};for(let i=0;i<o.length;i++){let e=o[i];e==="--spec"&&o[i+1]?t.specFile=o[++i]:e==="--threshold"&&o[i+1]?t.threshold=parseInt(o[++i],10):e==="--auto-fix"?t.autoFix=!0:e==="--dry-run"?t.dryRun=!0:e==="--max-iterations"&&o[i+1]?t.maxIterations=parseInt(o[++i],10):e==="--output"&&o[i+1]?t.output=o[++i]:!e.startsWith("-")&&!t.resultsFile&&(t.resultsFile=e)}return t}function u(o){let t=(0,a.resolve)(o);if(!(0,l.existsSync)(t))throw new Error(`File not found: ${t}`);return JSON.parse((0,l.readFileSync)(t,"utf8"))}function F(o){let{testId:t,stepId:i,error:e,step:r}=o,n=[];for(let c of _)if(c.pattern.test(e)){for(let s of c.strategies)n.push({testId:t,stepId:i,errorType:c.type,strategy:s.name,confidence:s.confidence,description:s.description,originalStep:r,proposedFix:k(s.name,r,e)});break}return n.length===0&&n.push({testId:t,stepId:i,errorType:"unknown",strategy:"manual_review",confidence:20,description:"Unknown error pattern - manual review required",originalStep:r,proposedFix:null}),n.sort((c,s)=>s.confidence-c.confidence)[0]}function k(o,t,i){if(!t)return null;let e=JSON.parse(JSON.stringify(t));switch(o){case"update_text":let r=i.match(/found "([^"]+)"|got "([^"]+)"|actual: "([^"]+)"/i);if(r){let s=r[1]||r[2]||r[3];e.click&&typeof e.click=="string"?e.click=s:e.find&&typeof e.find=="string"&&(e.find=s)}break;case"add_wait":return{_insertBefore:!0,wait:{selector:p(t),state:"visible",timeout:1e4}};case"increase_timeout":e.find&&typeof e.find=="object"?e.find.timeout=(e.find.timeout||5e3)*2:e.click&&typeof e.click=="object"?e.click.timeout=(e.click.timeout||5e3)*2:e.wait&&typeof e.wait=="number"&&(e.wait=e.wait*2);break;case"add_explicit_wait":return{_insertBefore:!0,wait:5e3};case"update_url":let n=i.match(/redirected to "([^"]+)"|actual: "([^"]+)"|got "(https?:\/\/[^"]+)"/i);if(n&&e.goTo){let s=n[1]||n[2]||n[3];typeof e.goTo=="string"?e.goTo=s:typeof e.goTo=="object"&&(e.goTo.url=s)}break;case"update_expected_text":let c=i.match(/got "([^"]+)"|actual: "([^"]+)"/i);if(c){let s=c[1]||c[2];e.find&&typeof e.find=="object"&&e.find.matchText&&(e.find.matchText=s)}break;case"wait_for_clickable":e.click&&typeof e.click=="object"&&(e.click.waitForClickable=!0);break;case"scroll_into_view":return{_insertBefore:!0,runCode:{language:"javascript",code:`document.querySelector('${p(t)}')?.scrollIntoView({ behavior: 'smooth', block: 'center' });`}};case"update_selector":case"update_expected_status":case"add_auth":case"handle_redirect":case"manual_review":return null}return e}function p(o){return o?o.click?typeof o.click=="string"?`text="${o.click}"`:o.click.selector||"*":o.find?typeof o.find=="string"?`text="${o.find}"`:o.find.selector||"*":o.type&&o.type.selector?o.type.selector:"*":"*"}function b(o){let t=[],i=o.tests||o.results?.tests||[];for(let e of i)if(e.status==="FAIL"||e.status==="failed"){let r=e.steps||[];for(let n of r)(n.status==="FAIL"||n.status==="failed")&&t.push({testId:e.testId||e.id,stepId:n.stepId||n.id,error:n.error||n.message||"Unknown error",step:n.step||n.action})}return t}function I(o,t){if(!t.proposedFix)return!1;let i=o.tests||[];for(let e of i)if(e.testId===t.testId){let r=e.steps||[];for(let n=0;n<r.length;n++)if(r[n].stepId===t.stepId||n===parseInt(t.stepId,10)){if(t.proposedFix._insertBefore){let c={...t.proposedFix};delete c._insertBefore,r.splice(n,0,c)}else r[n]={...r[n],...t.proposedFix};return!0}}return!1}function $(o,t,i){let e=i||o.confidence>=t,r=o.proposedFix?e?"\u{1F527}":"\u26A0\uFE0F":"\u274C",n=o.confidence>=80?"HIGH":o.confidence>=60?"MEDIUM":"LOW",c=`
${r} ${o.testId} \u2192 Step: ${o.stepId}
   Error Type: ${o.errorType}
   Strategy: ${o.strategy}
   Confidence: ${o.confidence}% (${n})
   ${o.description}
`;return o.proposedFix?(c+=`
   Original: ${JSON.stringify(o.originalStep,null,2).split(`
`).join(`
            `)}
   Proposed: ${JSON.stringify(o.proposedFix,null,2).split(`
`).join(`
            `)}
`,!e&&!i&&(c+=`
   \u2192 Below threshold (${t}%) - flagging for user review
`)):c+=`
   \u2192 No automatic fix available - manual review required
`,c}async function v(){let o=process.argv.slice(2);(o.includes("--help")||o.includes("-h")||o.length===0)&&(console.log(`
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
`),process.exit(0));let t=w(o);t.resultsFile||(console.error("Error: Results file required"),process.exit(1)),console.log(`
\u{1F4CA} Loading results from: ${t.resultsFile}`);let i=u(t.resultsFile),e=b(i);e.length===0&&(console.log("\u2705 No failures found in results!"),process.exit(0)),console.log(`
\u274C Found ${e.length} failure(s)
`);let r=e.map(F);console.log("\u2500".repeat(60)),console.log("PROPOSED FIXES"),console.log("\u2500".repeat(60));for(let s of r)console.log($(s,t.threshold,t.autoFix));let n=r.filter(s=>s.proposedFix&&(t.autoFix||s.confidence>=t.threshold)),c=r.filter(s=>!s.proposedFix||!t.autoFix&&s.confidence<t.threshold);if(console.log("\u2500".repeat(60)),console.log("SUMMARY"),console.log("\u2500".repeat(60)),console.log(`  Total failures:     ${e.length}`),console.log(`  Auto-applicable:    ${n.length}`),console.log(`  Needs review:       ${c.length}`),console.log(`  Threshold:          ${t.threshold}%`),console.log(`  Mode:               ${t.dryRun?"dry-run":t.autoFix?"auto-fix":"threshold-based"}`),!t.dryRun&&t.specFile&&n.length>0){console.log(`
\u{1F4DD} Applying ${n.length} fix(es) to: ${t.specFile}`);let s=u(t.specFile),d=0;for(let h of n)I(s,h)&&d++;let f=t.output||t.specFile;(0,l.writeFileSync)(f,JSON.stringify(s,null,2)),console.log(`\u2705 Applied ${d} fix(es) to: ${f}`),c.length>0&&console.log(`
\u26A0\uFE0F  ${c.length} issue(s) require manual review`)}else t.dryRun?console.log(`
\u{1F4CB} Dry run complete - no changes made`):t.specFile||console.log(`
\u{1F4A1} Provide --spec <path> to apply fixes`);process.exit(c.length>0?1:0)}v().catch(o=>{console.error("Error:",o.message),process.exit(1)});
