const fs=require('fs');
const code=fs.readFileSync('Code.gs','utf8');
function ok(c,m){if(!c){console.error('FAIL:',m);process.exitCode=1}else console.log('PASS:',m)}
ok(code.includes("const SBOS_VERSION = '0.11.0';"),'v0.11.0 version');
ok(code.includes('例：サンプルブログ'),'neutral blog example');
ok(code.includes('A900001'),'synthetic Article ID example');
ok(!/\bA000\d{3}\b/.test(code),'no low-number operational Article IDs in runtime');
ok(!code.includes('Anthropic API'),'no deprecated API wording restored');
