const fs=require('fs');
const code=fs.readFileSync('Code.gs','utf8');
function ok(c,m){if(!c){console.error('FAIL:',m);process.exitCode=1}else console.log('PASS:',m)}
ok(code.includes("const SBOS_VERSION = '0.14.4';"),'v0.14.4 version');
ok(code.includes('例：サンプルサイト'),'neutral site example');
ok(code.includes('https://example.com/'),'neutral URL example');
ok(code.includes('A900001'),'synthetic Article ID example');
ok(!/\bA000\d{3}\b/.test(code),'no low-number operational Article IDs in runtime');
ok(!/(tonbos55|ガジェット探検記|スマホ生活ナビ|風水財布|人生いろいろ|楽しいトラベルナビ|windinglife55|chiebukuro55|fusui-wallet)/i.test(code),'no known personal site identifiers in runtime');
ok(!code.includes('Anthropic API'),'no deprecated API wording restored');
ok(!code.includes('AI Gateway'),'no discontinued AI Gateway wording restored');

ok(code.includes('PALE_PINK'),'four-tier SERP status');
ok(code.includes('estimated_reachable_rank'),'rank-based SERP contract');
ok(code.includes("CANDIDATE_POOL: 'Candidate Pool'"),'candidate pool enabled');

ok(code.includes('MAX_SERP_QUEUE: 30'),'SERP first-stage queue capped at 30');
ok(code.includes("words === 2 || words === 3 || words === 4"),'2/3/4-word primary eligibility');
ok(code.includes("'EXISTING_2WORD'"),'2-word screening source');
ok(code.includes("st === 'RED' || st === 'BLOCK'"),'RED/BLOCK operational pruning');
