const fs=require('fs');
const code=fs.readFileSync('Code.gs','utf8');
function ok(c,m){if(!c){console.error('FAIL:',m);process.exitCode=1}else console.log('PASS:',m)}
ok(code.includes("const SBOS_VERSION = '0.14.10';"),'v0.14.10 version');
ok(code.includes('例：サンプルサイト'),'neutral site example');
ok(code.includes('https://example.com/'),'neutral URL example');
ok(code.includes('A900001'),'synthetic Article ID example');
ok(!/\bA000\d{3}\b/.test(code),'no low-number operational Article IDs in runtime');
ok(!/(tonbos55|ガジェット探検記|スマホ生活ナビ|風水財布|人生いろいろ|楽しいトラベルナビ|windinglife55|chiebukuro55|fusui-wallet)/i.test(code),'no known personal site identifiers in runtime');
ok(!code.includes('Anthropic API'),'no deprecated API wording restored');
ok(!code.includes('AI Gateway'),'no discontinued AI Gateway wording restored');

ok(code.includes('PALE_PINK'),'four-tier SERP status');
ok(code.includes('reachable_band'),'reachable-band SERP contract');
ok(code.includes("CANDIDATE_POOL: 'Candidate Pool'"),'candidate pool enabled');

ok(code.includes('MAX_SERP_QUEUE: 30'),'SERP first-stage queue capped at 30');
ok(code.includes("words === 2 || words === 3 || words === 4"),'2/3/4-word primary eligibility');
ok(code.includes("'EXISTING_2WORD'"),'2-word screening source');
ok(code.includes("st === 'RED' || st === 'BLOCK'"),'RED/BLOCK operational pruning');

ok(!code.includes('sbosCreateGeminiSerpReviewFileForWorkflow'),'Gemini SERP workflow removed');
ok(!code.includes('Gemini用ファイルを作成'),'Gemini SERP dialog button removed');

ok(code.includes('SERP_BATCH_SIZE: 5'),'SERP batch size 5');
ok(code.includes('SERP_CHECK_DEPTH: 5'),'SERP minimum verified evidence 5');
ok(code.includes('r.checked_count=actualChecked;'),'normalizes checked_count from actual evidence length');
ok(!code.includes('checked_count と serp_evidence 件数が一致しません'),'does not reject simple checked_count mismatch');
ok(code.includes('SERP_MAX_CYCLES: 5'),'SERP max cycles 5');
ok(code.includes('SERP_TARGET_YELLOW_PLUS: 10'),'SERP GREEN+YELLOW target 10');
ok(code.includes('serp_evidence'),'verified SERP evidence contract');

ok(code.includes("'EXISTING_ARTICLE':'既存記事確認済み'"),'existing article status label');
ok(code.includes('sbosEvidenceHasOwnSite_'),'own-site SERP evidence detection');
ok(code.includes("st === 'EXISTING_ARTICLE'"),'existing article operational pruning');
