/**
 * Blue Ocean Screener v0.13.4
 * Single-Code Apps Script distribution.
 * UI / operational completion baseline.
 *
 * Apps Script runtime modules are consolidated into this Code.gs.
 * DrivePicker.html remains a dedicated UI component and supports both file and folder selection.
 */

// ============================================================================
// Product / Version / Entry
// Source consolidated from: Code.gs
// ============================================================================
/**
 * Blue Ocean Screener v0.13.4
 * Prototype baseline.
 */
const SBOS_PRODUCT_NAME = 'Blue Ocean Screener';
const SBOS_VERSION = '0.13.4';

const SBOS_MODE = {
  EXISTING_SITE: 'EXISTING_SITE',
  NEW_SITE: 'NEW_SITE'
};

function sbosGetOperationMode_() {
  return sbosGetSetting_('operation_mode') || SBOS_MODE.EXISTING_SITE;
}

function sbosIsNewSiteMode_() {
  return sbosGetOperationMode_() === SBOS_MODE.NEW_SITE;
}

function sbosSetOperationMode_(mode) {
  sbosSetSetting_('operation_mode', mode === SBOS_MODE.NEW_SITE ? SBOS_MODE.NEW_SITE : SBOS_MODE.EXISTING_SITE);
}

function sbosStartNewSiteDiscoveryMode() {
  sbosEnsureSheets_();
  // Preserve the currently active existing-site session before switching.
  if (!sbosIsNewSiteMode_()) {
    try { sbosSaveCurrentBlogSession_(); } catch(e) { console.error(e); }
  }

  const ss = SpreadsheetApp.getActive();
  const outputId = sbosGetSetting_('output_folder_id') || '';
  const outputName = sbosGetSetting_('output_folder_name') || '';
  const inputId = sbosGetSetting_('input_folder_id') || '';
  const inputName = sbosGetSetting_('input_folder_name') || '';

  sbosClearSbosDocumentProperties_();
  [SBOS_SHEETS.KEYWORDS, SBOS_SHEETS.CANDIDATES, SBOS_SHEETS.STATE, SBOS_SHEETS.SERP_RESULTS].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) sh.clearContents();
  });
  const settings = ss.getSheetByName(SBOS_SHEETS.SETTINGS);
  if (settings) settings.clearContents();

  sbosInitSettings_();
  sbosSetOperationMode_(SBOS_MODE.NEW_SITE);
  sbosSetSetting_('site_name', '');
  sbosSetSetting_('site_url', '');
  if (outputId || outputName) {
    sbosSetSetting_('output_folder_id', outputId);
    sbosSetSetting_('output_folder_name', outputName);
  }
  if (inputId || inputName) {
    sbosSetSetting_('input_folder_id', inputId);
    sbosSetSetting_('input_folder_name', inputName);
  }
  sbosInitKeywords_();
  sbosInitCandidates_();
  sbosSetState_('status', '');
  sbosSetState_('home_status_text', '新規サイト探索：キーワード読込待ち');
  sbosEnsureLightweightHome_(true);
  sbosRefreshHomeSummary_();

  sbosShowWorkflowResult_(
    '新規サイト用キーワード探索モードを開始しました',
    '対象サイト・カニバリ判定・TRY救済を使用せず、キーワード候補 → SERP精査 → 新規サイト適性評価 → GREEN判定まで進めます。<br><br>' +
    '<b>GREEN条件:</b> Blue Ocean Score、新規サイト適性、クラスター形成力、リスクを総合判定します。',
    '2. キーワードを読み込む',
    'sbosShowDrivePicker'
  );
  return {ok:true, mode:SBOS_MODE.NEW_SITE};
}

function sbosOpenNewSiteGreenCandidates() {
  if (!sbosIsNewSiteMode_()) throw new Error('新規サイト用キーワード探索モードではありません。');
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh) throw new Error('Candidatesシートがありません。');
  SpreadsheetApp.getActive().setActiveSheet(sh);
  sbosApplyCandidateFormatting_();
  sh.setActiveSelection('A1');
}


function onOpen() {
  // v0.9.9: 起動時は重い再構築を行わず、メニューと版数表示だけを更新する。
  sbosBuildMenu_();
  try { sbosSyncHomeVersionOnly_(); } catch(e) { console.error(e); }
}

function onInstall() {
  onOpen();
}

function sbosSyncHomeVersionOnly_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.HOME);
  if (!sh) return;
  sh.getRange('D1').setValue('Version ' + SBOS_VERSION);
}


function sbosAbout() {
  SpreadsheetApp.getUi().alert(
    SBOS_PRODUCT_NAME,
    'Version: ' + SBOS_VERSION + '\n\n3語・4語のロングテール候補を選別し、Blue Ocean判定・カニバリ判定・aCreator依頼文生成までを支援します。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// Configuration
// Source consolidated from: Config.gs
// ============================================================================
const SBOS_SHEETS = {
  HOME: 'Home',
  KEYWORDS: 'Keywords',
  CANDIDATES: 'Candidates',
  SETTINGS: 'Settings',
  STATE: '_State',
  ARTICLES: '_ExistingArticles',
  SERP_RESULTS: '_SerpReview',
  BLOG_SESSIONS: '_BlogSessions',
  SESSION_KEYWORDS: '_SessionKeywords',
  SESSION_CANDIDATES: '_SessionCandidates',
  SESSION_SETTINGS: '_SessionSettings',
  SESSION_STATE: '_SessionState',
  SESSION_SERP: '_SessionSerpReview'
};

const SBOS_STATUS = {
  IMPORT_DONE: 'IMPORT_DONE',
  NORMALIZE_RUNNING: 'NORMALIZE_RUNNING',
  SCREENING_RUNNING: 'SCREENING_RUNNING',
  SERP_RUNNING: 'SERP_RUNNING',
  FOUR_WORD_RUNNING: 'FOUR_WORD_RUNNING',
  CANNIBAL_RUNNING: 'CANNIBAL_RUNNING',
  SERP_REVIEW_IMPORTED: 'SERP_REVIEW_IMPORTED',
  COMPLETE: 'COMPLETE'
};

const SBOS_THRESHOLDS = {
  SERP_QUEUE_MIN: 45,
  GREEN_SCORE: 80,
  YELLOW_SCORE: 65,
  MAX_SERP_QUEUE: 80,
  FOUR_WORD_BASE_MIN: 50,
  FOUR_WORD_BASE_MAX: 79,
  MAX_GENERATED_4WORD: 20,
  MAX_GENERATED_PER_BASE: 2
};

const SBOS_TROUBLE_TERMS = [
  'できない','出来ない','しない','進まない','繋がらない','つながらない','反応しない','表示されない',
  '消えた','ない','遅い','重い','切れる','落ちる','暗くならない','読み取れない','使えない','充電できない',
  'エラー','不具合','直らない','復帰しない','開かない','動かない','認識しない'
];


function sbosStatusLabel_(code) {
  const map = {
    'PENDING':'SERP精査待ち',
    'CANNIBAL_PENDING':'カニバリ精査待ち',
    'CLUSTERED':'類似候補へ統合',
    'NOT_RUN':'未実施'
  };
  return map[String(code || '')] || String(code || '');
}

function sbosStatusCode_(value) {
  const map = {
    'SERP精査待ち':'PENDING',
    'カニバリ精査待ち':'CANNIBAL_PENDING',
    '類似候補へ統合':'CLUSTERED',
    '未実施':'NOT_RUN'
  };
  return map[String(value || '')] || String(value || '');
}

function sbosSetHomeStatus_(text) {
  sbosSetState_('home_status_text', String(text || ''));
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.HOME);
  if (sh) sh.getRange('E3').setValue(text || '未実行');
}

function sbosTidyDefaultSheets_() {
  const ss = SpreadsheetApp.getActive();
  const names = ['シート1','Sheet1'];
  names.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh || ss.getSheets().length <= 1) return;
    const hasValue = sh.getLastRow() > 0 && sh.getDataRange().getDisplayValues()
      .some(row => row.some(v => String(v || '').trim() !== ''));
    if (!hasValue) ss.deleteSheet(sh);
  });
}

function sbosRefreshHomeSummary_() {
  const ss = SpreadsheetApp.getActive();
  const home = ss.getSheetByName(SBOS_SHEETS.HOME);
  const kw = ss.getSheetByName(SBOS_SHEETS.KEYWORDS);
  const cand = ss.getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!home) return;

  let total=0, three=0, existing4=0;
  if (kw && kw.getLastRow() >= 2) {
    const vals = kw.getRange(2,1,kw.getLastRow()-1,13).getDisplayValues();
    total=vals.length; three=vals.filter(r=>Number(r[5])===3).length; existing4=vals.filter(r=>Number(r[5])===4).length;
  }
  let generated4=0,serpWait=0,cannibalWait=0,green=0,tryCount=0,yellow=0,block=0,clustered=0,creatorUnqueued=0,creatorQueued=0,creatorDone=0,sbmLinked=0;
  if (cand && cand.getLastRow() >= 2) {
    cand.getRange(2,1,cand.getLastRow()-1,18).getDisplayValues().forEach(r=>{
      const st=sbosStatusCode_(r[1]), serp=sbosStatusCode_(r[12]), src=String(r[9]||''), creator=String(r[10]||''), articleId=String(r[13]||'');
      if(src==='GENERATED_4WORD') generated4++;
      if(st==='PENDING'||serp==='PENDING'||serp==='REQUESTED') serpWait++;
      if(st==='CANNIBAL_PENDING') cannibalWait++;
      if(st==='GREEN'||st==='TRY'){
        if(st==='GREEN') green++; else tryCount++;
        if(articleId||creator==='SIMS Manager登録済み') sbmLinked++;
        else if(creator==='依頼待ち') creatorQueued++;
        else if(creator==='作成済み') creatorDone++;
        else creatorUnqueued++;
      }
      if(st==='YELLOW') yellow++;
      if(st==='BLOCK') block++;
      if(st==='CLUSTERED'||serp==='CLUSTERED') clustered++;
    });
  }

  sbosEnsureLightweightHome_();
  if (sbosIsNewSiteMode_()) {
    home.getRange('B2').setValue('新規サイト探索モード').setWrap(true);
    home.getRange('E2').setValue('対象サイト指定なし').setWrap(true);
  } else {
    home.getRange('B2').setValue(sbosGetSetting_('site_name')||'未設定').setWrap(true);
    home.getRange('E2').setValue(sbosGetSetting_('site_url')||'').setWrap(true);
  }
  home.getRange('B3').setValue(sbosGetState_('input_file_name')||'未選択').setWrap(true);
  home.getRange('E3').setValue(sbosGetState_('home_status_text')||'未実行').setWrap(true);
  home.getRange('B5').setValue(total); home.getRange('D5').setValue(three); home.getRange('F5').setValue(existing4); home.getRange('H5').setValue(generated4);
  home.getRange('B7').setValue(serpWait);
  if (sbosIsNewSiteMode_()) {
    home.getRange('C7').setValue('新規サイト適性評価');
    home.getRange('D7').setValue(green + yellow + block);
    home.getRange('G7').setValue('最終GREEN');
    home.getRange('H7').setValue(green);
  } else {
    home.getRange('C7').setValue('カニバリ精査待ち');
    home.getRange('D7').setValue(cannibalWait);
    home.getRange('G7').setValue('aCreator依頼可能');
    home.getRange('H7').setValue(creatorUnqueued);
  }
  home.getRange('B9').setValue(green); home.getRange('D9').setValue(tryCount); home.getRange('F9').setValue(yellow); home.getRange('H9').setValue(block);
  if (sbosIsNewSiteMode_()) {
    home.getRange('A9').setValue('GREEN');
    home.getRange('C9').setValue('YELLOW');
    home.getRange('E9').setValue('BLOCK');
    home.getRange('G9').setValue('評価済み');
    home.getRange('D9').setValue(yellow);
    home.getRange('F9').setValue(block);
    home.getRange('H9').setValue(green + yellow + block);

    home.getRange('A10').setValue('新規サイト探索の進捗');
    home.getRange('A11').setValue('キーワード読込');
    home.getRange('B11').setValue(total);
    home.getRange('C11').setValue('SERP精査待ち');
    home.getRange('D11').setValue(serpWait);
    home.getRange('E11').setValue('最終GREEN');
    home.getRange('F11').setValue(green);
    home.getRange('G11').setValue('カニバリ');
    home.getRange('H11').setValue('実施しない');

    home.getRange('A12').setValue('新規サイト用フロー');
    home.getRange('A13:H13').setValues([[
      '1 新規サイト探索開始','2 キーワード読込','3 候補探索','4 SERP・適性精査','5 GREEN候補確認','','',''
    ]]);
    home.getRange('A16').setValue('判定の見方');
    home.getRange('A17:H17').setValues([[
      'GREEN：新規サイトの初期クラスター候補','','YELLOW：追加確認・保留','','BLOCK：新規サイトの核として弱い','','',''
    ]]);
    home.getRange('A19').setValue('新規サイト探索メモ');
    home.getRange('A20').setValue('・対象サイト指定、カニバリ精査、TRY救済、aCreator処理はこのモードでは使用しません。');
    home.getRange('A21').setValue('・GREENはBlue Ocean Score、新規サイト適性、クラスター形成力、リスクの品質ゲートで最終確定します。');
    home.getRange('A22').setValue('・GREEN候補を、新規サイトのテーマ設計・初期記事クラスター作成に利用します。');
  } else {
    home.getRange('B11').setValue(creatorUnqueued); home.getRange('D11').setValue(creatorQueued); home.getRange('F11').setValue(creatorDone); home.getRange('H11').setValue(sbmLinked);
  }
}
// ============================================================================
// Menu
// Source consolidated from: Menu.gs
// ============================================================================
function sbosBuildMenu_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Blue Ocean Screener')
    .addItem('1. 対象サイトを設定・切り替える', 'sbosShowSiteSettings')
    .addItem('2. キーワードを読み込む', 'sbosShowDrivePicker')
    .addItem('3. ブルーオーシャン候補を探す', 'sbosStartScreening')
    .addItem('4. SERP精査を進める', 'sbosShowSerpWorkflowDialog')
    .addItem('5. カニバリ精査を進める', 'sbosShowCannibalEvidencePicker')
    .addItem('6. GREEN / TRY候補をaCreatorで処理', 'sbosShowCreatorWorkflowDialog')
    .addItem('7. 候補・進捗を確認', 'sbosOpenCandidates')
    .addSeparator()
    .addSubMenu(
      ui.createMenu('新規サイト用キーワード探索')
        .addItem('1. 新規サイト探索を開始', 'sbosStartNewSiteDiscoveryMode')
        .addItem('2. キーワードを読み込む', 'sbosShowDrivePicker')
        .addItem('3. 候補を探す', 'sbosStartScreening')
        .addItem('4. SERP・新規サイト適性を精査', 'sbosShowSerpWorkflowDialog')
        .addItem('5. GREEN候補を確認', 'sbosOpenNewSiteGreenCandidates')
    )
    .addSubMenu(
      ui.createMenu('途中から再開・特別操作')
        .addItem('現在のサイトを保存する', 'sbosSaveCurrentBlogSessionManual')
        .addItem('処理状態を確認する', 'sbosShowStatus')
        .addItem('処理を再開する', 'sbosResumeBatch')
    )
    .addSubMenu(
      ui.createMenu('設定・メンテナンス')
        .addItem('保存先を設定する', 'sbosShowOutputSettings')
        .addItem('画面・シートを再初期化する', 'sbosReinitializeUiManual')
    )
    .addSeparator()
    .addItem('この製品について', 'sbosAbout')
    .addToUi();
}

// ============================================================================
// Setup / Settings
// Source consolidated from: Setup.gs
// ============================================================================
function sbosShowSiteSettings() {
  sbosEnsureSheets_();
  sbosRepairCurrentBlogIdentity_();
  sbosSaveCurrentBlogSession_();

  const sessions = sbosListBlogSessions_();
  const currentKey = sbosCurrentSiteKey_();
  const options = sessions.map(s => {
    const selected = s.siteKey === currentKey ? ' selected' : '';
    const label = s.siteName + ' — ' + s.siteUrl +
      (s.siteKey === currentKey ? '（現在）' : '') +
      ' / GREEN ' + s.green + ' / 未処理 ' + s.creatorPending;
    return '<option value="' + sbosEscapeHtml_(s.siteKey) + '"' + selected + '>' +
      sbosEscapeHtml_(label) + '</option>';
  }).join('');

  const currentName = sbosGetSetting_('site_name') || '';
  const currentUrl = sbosGetSetting_('site_url') || '';

  const html = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;color:#202124;background:#fff}' +
    '.wrap{padding:20px}.title{font-size:20px;font-weight:700;margin-bottom:8px}' +
    '.lead{font-size:13px;color:#5f6368;line-height:1.6;margin-bottom:16px}' +
    '.box{border:1px solid #dadce0;border-radius:9px;padding:14px;margin-bottom:14px}' +
    '.box h3{font-size:15px;margin:0 0 10px;color:#174ea6}' +
    'select,input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #dadce0;border-radius:6px;margin:5px 0 10px;font-size:13px}' +
    'label{font-size:12px;font-weight:700;color:#3c4043}' +
    '.actions{display:flex;justify-content:flex-end;gap:9px}.subactions{display:flex;justify-content:flex-end;gap:9px;margin-top:5px}' +
    'button{border:0;border-radius:6px;padding:9px 15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:130px}' +
    'button:disabled{opacity:.75;cursor:default}' +
    '.primary{background:#1a73e8;color:#fff}.secondary{background:#f1f3f4;color:#3c4043}' +
    '.busy{display:none;color:#5f6368;font-size:12px;margin-right:auto;align-self:center}' +
    '.btnspin{display:none;width:14px;height:14px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:sbosSpin .75s linear infinite}' +
    '.working .btnspin{display:inline-block}.working .btnlabel{display:inline-block}@keyframes sbosSpin{to{transform:rotate(360deg)}}' +
    '.note{background:#f8fbff;border:1px solid #d2e3fc;border-radius:7px;padding:9px 11px;font-size:12px;line-height:1.5;margin-bottom:14px}' +
    '</style></head><body><div class="wrap">' +
    '<div class="title">対象サイトを切り替える・再開する</div>' +
    '<div class="lead">サイトを切り替える前に、現在の Keywords・Candidates・SERP結果・aCreator/SIMS Manager進捗・処理状態を自動保存します。以前のサイトへ戻ると、保存地点から復元します。</div>' +
    '<div class="note">現在: <b>' + sbosEscapeHtml_(currentName || '未設定') + '</b>' +
      (currentUrl ? ' — ' + sbosEscapeHtml_(currentUrl) : '') + '</div>' +
    '<div class="box"><h3>保存済みサイトを再開</h3>' +
      (sessions.length
        ? '<label>サイト</label><select id="saved">' + options + '</select>' +
          '<div class="subactions"><button id="openSavedBtn" class="primary" onclick="openSaved(this)"><span class="btnspin"></span><span class="btnlabel">このサイトを開く</span></button></div>'
        : '<div style="font-size:13px;color:#5f6368">保存済みサイトはまだありません。</div>') +
    '</div>' +
    '<div class="box"><h3>新しいサイトを開始</h3>' +
      '<label>サイト名</label><input id="newName" placeholder="例：サンプルサイト">' +
      '<label>サイトURL</label><input id="newUrl" placeholder="https://example.com/">' +
      '<div class="subactions"><button id="startNewBtn" class="primary" onclick="startNew(this)"><span class="btnspin"></span><span class="btnlabel">新しいサイトを開始</span></button></div>' +
    '</div>' +
    '<div class="actions"><span id="busy" class="busy">保存・復元中…</span><button class="secondary" onclick="google.script.host.close()">閉じる</button></div>' +
    '<script>' +
    'let activeBtn=null;function busy(v){document.getElementById("busy").style.display=v?"inline":"none";}' +
    'function setWorking(btn,on){if(!btn)return;const label=btn.querySelector(".btnlabel");if(on){activeBtn=btn;btn.dataset.oldLabel=label?label.textContent:"";if(label)label.textContent="処理中…";btn.classList.add("working");btn.disabled=true;}else{if(label)label.textContent=btn.dataset.oldLabel||"実行";btn.classList.remove("working");btn.disabled=false;if(activeBtn===btn)activeBtn=null;}}' +
    'function lockOtherButtons(on){["openSavedBtn","startNewBtn"].forEach(id=>{const b=document.getElementById(id);if(b&&b!==activeBtn)b.disabled=on;});}' +
    'function fail(e){busy(false);setWorking(activeBtn,false);lockOtherButtons(false);alert(e&&e.message?e.message:e);}' +
    'function done(m){busy(false);google.script.host.close();google.script.run.sbosShowBlogSwitchResult_(m);}' +
    'function openSaved(btn){const e=document.getElementById("saved");if(!e||!e.value)return;setWorking(btn,true);lockOtherButtons(true);busy(true);google.script.run.withSuccessHandler(done).withFailureHandler(fail).sbosSwitchToSavedBlog(e.value);}' +
    'function startNew(btn){const n=document.getElementById("newName").value.trim(),u=document.getElementById("newUrl").value.trim();if(!n||!u){alert("サイト名とサイトURLを入力してください。");return;}setWorking(btn,true);lockOtherButtons(true);busy(true);google.script.run.withSuccessHandler(done).withFailureHandler(fail).sbosStartOrResumeBlog(n,u);}' +
    '</script></div></body></html>'
  ).setWidth(720).setHeight(620);

  SpreadsheetApp.getUi().showModalDialog(html, '対象サイトを切り替える・再開する');
}


function sbosShowBlogSwitchResult_(result) {
  const r = result || {};
  const isNew = r.mode === 'NEW';
  const title = isNew ? '新しいサイトを開始しました' : 'サイトを復元しました';
  const body = isNew
    ? '<b>サイト:</b> ' + sbosEscapeHtml_(r.siteName || '') + '<br>' +
      '<b>URL:</b> ' + sbosEscapeHtml_(r.siteUrl || '') + '<br><br>' +
      '新しいサイトの作業領域を準備しました。<br>次はキーワードファイルを読み込んでください。'
    : '<b>サイト:</b> ' + sbosEscapeHtml_(r.siteName || '') + '<br>' +
      '<b>URL:</b> ' + sbosEscapeHtml_(r.siteUrl || '') + '<br>' +
      '<b>GREEN:</b> ' + Number(r.green || 0) + '件<br>' +
      '<b>aCreator/SIMS Manager未処理:</b> ' + Number(r.creatorPending || 0) + '件<br>' +
      '<b>SIMS Manager登録済み:</b> ' + Number(r.sbmLinked || 0) + '件<br><br>' +
      '保存地点から作業を再開できます。';

  sbosShowWorkflowResult_(
    title,
    body,
    isNew ? '2. キーワードを読み込む' : '7. 候補・進捗を確認',
    isNew ? 'sbosShowDrivePicker' : 'sbosOpenCandidates'
  );
}

function sbosShowOutputSettings() {
  sbosShowDriveFolderPicker_();
}

function sbosGetSetting_(key) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.SETTINGS);
  const vals = sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),2).getDisplayValues();
  const hit = vals.find(r => r[0] === key);
  return hit ? hit[1] : '';
}

function sbosSetSetting_(key, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.SETTINGS);
  const vals = sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),2).getDisplayValues();
  const i = vals.findIndex(r => r[0] === key);
  if (i >= 0) sh.getRange(i+2,2).setValue(value);
  else sh.appendRow([key,value]);
}


// ============================================================================
// Multi-Blog Session Store v0.7.0
// ============================================================================
function sbosNormalizeSiteUrl_(url) {
  let s = String(url || '').trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');
  return s;
}

function sbosSiteKey_(siteName, siteUrl) {
  const u = sbosNormalizeSiteUrl_(siteUrl);
  if (u) return u;
  return String(siteName || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function sbosCurrentSiteKey_() {
  return sbosSiteKey_(sbosGetSetting_('site_name'), sbosGetSetting_('site_url'));
}

function sbosSessionStoreNames_() {
  return [
    SBOS_SHEETS.SESSION_KEYWORDS,
    SBOS_SHEETS.SESSION_CANDIDATES,
    SBOS_SHEETS.SESSION_SETTINGS,
    SBOS_SHEETS.SESSION_STATE,
    SBOS_SHEETS.SESSION_SERP
  ];
}

function sbosInitSessionStoreSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (!sh.isSheetHidden()) sh.hideSheet();
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,3).setValues([['SiteKey','RowIndex','RowJson']]).setFontWeight('bold');
  }
  return sh;
}

function sbosInitBlogSessionsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SBOS_SHEETS.BLOG_SESSIONS);
  if (!sh) sh = ss.insertSheet(SBOS_SHEETS.BLOG_SESSIONS);
  if (!sh.isSheetHidden()) sh.hideSheet();
  const headers = [
    'SiteKey','SiteName','SiteURL','SavedAt','Status','InputFile',
    'KeywordCount','CandidateCount','GreenCount','CreatorPending','SbmLinked'
  ];
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  } else {
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  }
  return sh;
}

function sbosReplaceSessionSnapshot_(storeName, siteKey, sourceSheetName) {
  const ss = SpreadsheetApp.getActive();
  const store = sbosInitSessionStoreSheet_(storeName);
  const source = ss.getSheetByName(sourceSheetName);
  const keep = [];

  if (store.getLastRow() >= 2) {
    const existing = store.getRange(2,1,store.getLastRow()-1,3).getValues();
    existing.forEach(r => {
      if (String(r[0] || '') !== siteKey) keep.push(r);
    });
  }

  const add = [];
  if (source && source.getLastRow() > 0 && source.getLastColumn() > 0) {
    const vals = source.getRange(1,1,source.getLastRow(),source.getLastColumn()).getDisplayValues();
    vals.forEach((row, i) => add.push([siteKey, i + 1, JSON.stringify(row)]));
  }

  store.clearContents();
  store.getRange(1,1,1,3).setValues([['SiteKey','RowIndex','RowJson']]).setFontWeight('bold');
  const all = keep.concat(add);
  if (all.length) store.getRange(2,1,all.length,3).setValues(all);
}

function sbosRestoreSessionSnapshot_(storeName, siteKey, targetSheetName) {
  const ss = SpreadsheetApp.getActive();
  const store = sbosInitSessionStoreSheet_(storeName);
  let target = ss.getSheetByName(targetSheetName);
  if (!target) target = ss.insertSheet(targetSheetName);

  const rows = [];
  if (store.getLastRow() >= 2) {
    const vals = store.getRange(2,1,store.getLastRow()-1,3).getValues();
    vals.forEach(r => {
      if (String(r[0] || '') !== siteKey) return;
      try {
        const parsed = JSON.parse(String(r[2] || '[]'));
        rows.push({index:Number(r[1]) || 0, values:Array.isArray(parsed) ? parsed : []});
      } catch(e) {}
    });
  }
  rows.sort((a,b) => a.index - b.index);

  target.clearContents();
  if (!rows.length) return false;

  let width = 1;
  rows.forEach(r => width = Math.max(width, r.values.length));
  const out = rows.map(r => {
    const x = r.values.slice();
    while (x.length < width) x.push('');
    return x;
  });
  target.getRange(1,1,out.length,width).setValues(out);
  return true;
}

function sbosClearSbosDocumentProperties_() {
  const props = PropertiesService.getDocumentProperties();
  const all = props.getProperties();
  Object.keys(all).forEach(k => {
    if (k.indexOf('SBOS_') === 0) props.deleteProperty(k);
  });
}

function sbosSyncStatePropertiesFromSheet_() {
  sbosClearSbosDocumentProperties_();
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.STATE);
  if (!sh || sh.getLastRow() < 2) return;
  const vals = sh.getRange(2,1,sh.getLastRow()-1,2).getDisplayValues();
  const props = PropertiesService.getDocumentProperties();
  vals.forEach(r => {
    const key = String(r[0] || '').trim();
    if (key) props.setProperty('SBOS_' + key, String(r[1] || ''));
  });
}

function sbosSessionCounts_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  let candidateCount=0, green=0, creatorPending=0, creatorDone=0, sbmLinked=0;
  if (sh && sh.getLastRow() >= 2) {
    const vals = sh.getRange(2,1,sh.getLastRow()-1,18).getDisplayValues();
    candidateCount = vals.length;
    vals.forEach(r => {
      if (sbosStatusCode_(r[1]) !== 'GREEN') return;
      green++;
      const creator = String(r[10] || '');
      const articleId = String(r[13] || '');
      if (articleId || creator === 'SIMS Manager登録済み') {
        sbmLinked++;
      } else if (creator === '作成済み') {
        creatorDone++;
      } else {
        // 未依頼/依頼待ちのどちらも「SBM未登録GREEN」として未処理扱い。
        creatorPending++;
      }
    });
  }
  const kw = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  const keywordCount = kw && kw.getLastRow() >= 2 ? kw.getLastRow()-1 : 0;
  return {keywordCount,candidateCount,green,creatorPending,creatorDone,sbmLinked};
}

function sbosUpsertBlogSessionMeta_(siteKey) {
  const sh = sbosInitBlogSessionsSheet_();
  const name = sbosGetSetting_('site_name') || '';
  const url = sbosGetSetting_('site_url') || '';
  const c = sbosSessionCounts_();
  const row = [
    siteKey,name,url,sbosNow_(),sbosGetState_('status') || '',
    sbosGetState_('input_file_name') || '',
    c.keywordCount,c.candidateCount,c.green,c.creatorPending,c.sbmLinked
  ];

  let hit = -1;
  if (sh.getLastRow() >= 2) {
    const keys = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat();
    hit = keys.findIndex(x => String(x || '') === siteKey);
  }
  if (hit >= 0) sh.getRange(hit+2,1,1,row.length).setValues([row]);
  else sh.appendRow(row);
}

function sbosSaveCurrentBlogSession_() {
  const siteName = sbosGetSetting_('site_name') || '';
  const siteUrl = sbosGetSetting_('site_url') || '';
  const siteKey = sbosSiteKey_(siteName, siteUrl);
  if (!siteKey || (!siteName && !siteUrl)) return {saved:false};

  sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_KEYWORDS, siteKey, SBOS_SHEETS.KEYWORDS);
  sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_CANDIDATES, siteKey, SBOS_SHEETS.CANDIDATES);
  sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_SETTINGS, siteKey, SBOS_SHEETS.SETTINGS);
  sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_STATE, siteKey, SBOS_SHEETS.STATE);
  sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_SERP, siteKey, SBOS_SHEETS.SERP_RESULTS);
  sbosUpsertBlogSessionMeta_(siteKey);
  sbosSetState_('active_site_key', siteKey);
  return {saved:true,siteKey:siteKey,siteName:siteName,siteUrl:siteUrl};
}

function sbosFindRecoveredBlogNameByUrl_(siteUrl) {
  const ss = SpreadsheetApp.getActive();
  const key = sbosSiteKey_('', siteUrl);
  if (!key) return '';

  const sessions = sbosListBlogSessions_();
  const hit = sessions.find(x => sbosSiteKey_(x.siteName, x.siteUrl) === key && String(x.siteName || '').trim());
  if (hit) return String(hit.siteName || '').trim();

  const blogArchive = ss.getSheetByName('BlogArchive');
  if (blogArchive && blogArchive.getLastRow() >= 2) {
    const vals = blogArchive.getRange(2,1,blogArchive.getLastRow()-1,Math.min(12,blogArchive.getLastColumn())).getDisplayValues();
    for (const r of vals) {
      const name=String(r[1]||'').trim(), url=String(r[2]||'');
      if (name && sbosSiteKey_('',url)===key) return name;
    }
  }

  const greenArchive = ss.getSheetByName('GreenArchive');
  if (greenArchive && greenArchive.getLastRow() >= 2) {
    const vals = greenArchive.getRange(2,1,greenArchive.getLastRow()-1,Math.min(9,greenArchive.getLastColumn())).getDisplayValues();
    for (const r of vals) {
      const name=String(r[0]||'').trim(), url=String(r[1]||'');
      if (name && sbosSiteKey_('',url)===key) return name;
    }
  }
  return '';
}

function sbosRepairSessionMetaIdentity_(siteKey, siteName, siteUrl) {
  const sh=sbosInitBlogSessionsSheet_();
  if (sh.getLastRow()<2) return;
  const vals=sh.getRange(2,1,sh.getLastRow()-1,11).getDisplayValues();
  const i=vals.findIndex(r=>String(r[0]||'')===String(siteKey||''));
  if(i<0) return;
  if(siteName) sh.getRange(i+2,2).setValue(siteName);
  if(siteUrl) sh.getRange(i+2,3).setValue(siteUrl);
}

function sbosRepairCurrentBlogIdentity_() {
  const currentUrl=sbosGetSetting_('site_url')||'';
  let currentName=sbosGetSetting_('site_name')||'';
  if(!currentUrl) return false;
  const key=sbosSiteKey_('',currentUrl);
  let repaired=false;

  if(!currentName){
    currentName=sbosFindRecoveredBlogNameByUrl_(currentUrl);
    if(currentName){
      sbosSetSetting_('site_name',currentName);
      repaired=true;
    }
  }

  if(currentName){
    sbosRepairSessionMetaIdentity_(key,currentName,currentUrl);
    if(repaired){
      sbosReplaceSessionSnapshot_(SBOS_SHEETS.SESSION_SETTINGS,key,SBOS_SHEETS.SETTINGS);
      sbosUpsertBlogSessionMeta_(key);
    }
  }
  return repaired;
}

function sbosSaveCurrentBlogSessionManual() {
  const r = sbosSaveCurrentBlogSession_();
  if (!r.saved) {
    SpreadsheetApp.getUi().alert('対象サイトが未設定です。');
    return;
  }
  sbosShowWorkflowResult_(
    '現在のサイトを保存しました',
    '<b>サイト:</b> ' + sbosEscapeHtml_(r.siteName) + '<br>' +
    '<b>URL:</b> ' + sbosEscapeHtml_(r.siteUrl) + '<br><br>' +
    'Keywords・Candidates・SERP結果・aCreator/SIMS Manager進捗・処理状態を保存しました。',
    '',
    ''
  );
}

function sbosListBlogSessions_() {
  const sh = sbosInitBlogSessionsSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,11).getDisplayValues()
    .filter(r => String(r[0] || '').trim())
    .map(r => ({
      siteKey:r[0], siteName:r[1], siteUrl:r[2], savedAt:r[3], status:r[4], inputFile:r[5],
      keywordCount:Number(r[6])||0, candidateCount:Number(r[7])||0,
      green:Number(r[8])||0, creatorPending:Number(r[9])||0, sbmLinked:Number(r[10])||0
    }))
    .sort((a,b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

function sbosRestoreBlogSession_(siteKey) {
  const sessions = sbosListBlogSessions_();
  const meta = sessions.find(x => x.siteKey === siteKey);
  if (!meta) throw new Error('保存済みサイトが見つかりません: ' + siteKey);

  const okSettings = sbosRestoreSessionSnapshot_(SBOS_SHEETS.SESSION_SETTINGS, siteKey, SBOS_SHEETS.SETTINGS);
  const okState = sbosRestoreSessionSnapshot_(SBOS_SHEETS.SESSION_STATE, siteKey, SBOS_SHEETS.STATE);
  sbosRestoreSessionSnapshot_(SBOS_SHEETS.SESSION_KEYWORDS, siteKey, SBOS_SHEETS.KEYWORDS);
  sbosRestoreSessionSnapshot_(SBOS_SHEETS.SESSION_CANDIDATES, siteKey, SBOS_SHEETS.CANDIDATES);
  sbosRestoreSessionSnapshot_(SBOS_SHEETS.SESSION_SERP, siteKey, SBOS_SHEETS.SERP_RESULTS);

  // v0.9.5: Settings snapshot自体が存在しても、site_name / site_url の一部だけ
  // 欠落しているケースがある。_BlogSessionsのメタ情報を正として自己修復する。
  const restoredName = sbosGetSetting_('site_name') || '';
  const restoredUrl = sbosGetSetting_('site_url') || '';
  const fallbackUrl = restoredUrl || meta.siteUrl || '';
  const fallbackName = meta.siteName || sbosFindRecoveredBlogNameByUrl_(fallbackUrl) || '';
  if (!okSettings || !restoredName) sbosSetSetting_('site_name', fallbackName);
  if (!okSettings || !restoredUrl) sbosSetSetting_('site_url', meta.siteUrl || restoredUrl || '');
  if (fallbackName) sbosRepairSessionMetaIdentity_(siteKey, fallbackName, meta.siteUrl || restoredUrl || '');

  if (okState) sbosSyncStatePropertiesFromSheet_();
  else sbosClearSbosDocumentProperties_();

  PropertiesService.getDocumentProperties().setProperty('SBOS_active_site_key', siteKey);

  sbosInitKeywords_();
  sbosInitCandidates_();
  sbosInitHome_();
  sbosApplyCandidateFormatting_();
  sbosRefreshHomeSummary_();

  const cand = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (cand) SpreadsheetApp.getActive().setActiveSheet(cand);

  const c = sbosSessionCounts_();

  // 欠損していたサイト名/URLを補完した場合、その修復後状態を保存し直す。
  sbosSaveCurrentBlogSession_();

  return {
    siteKey:siteKey, siteName:sbosGetSetting_('site_name') || meta.siteName,
    siteUrl:sbosGetSetting_('site_url') || meta.siteUrl,
    green:c.green, creatorPending:c.creatorPending, sbmLinked:c.sbmLinked
  };
}

function sbosSwitchToSavedBlog(siteKey) {
  sbosSetOperationMode_(SBOS_MODE.EXISTING_SITE);
  const current = sbosCurrentSiteKey_();
  if (current && current !== siteKey) sbosSaveCurrentBlogSession_();
  const r = sbosRestoreBlogSession_(String(siteKey || ''));
  return {
    ok:true, mode:'RESTORE',
    siteName:r.siteName, siteUrl:r.siteUrl,
    green:r.green, creatorPending:r.creatorPending, sbmLinked:r.sbmLinked
  };
}

function sbosResetForNewBlog_(siteName, siteUrl) {
  const ss = SpreadsheetApp.getActive();

  const outputId = sbosGetSetting_('output_folder_id') || '';
  const outputName = sbosGetSetting_('output_folder_name') || '';
  const inputId = sbosGetSetting_('input_folder_id') || '';
  const inputName = sbosGetSetting_('input_folder_name') || '';

  sbosClearSbosDocumentProperties_();

  [SBOS_SHEETS.KEYWORDS, SBOS_SHEETS.CANDIDATES, SBOS_SHEETS.STATE, SBOS_SHEETS.SERP_RESULTS].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) sh.clearContents();
  });

  const settings = ss.getSheetByName(SBOS_SHEETS.SETTINGS);
  if (settings) settings.clearContents();

  sbosInitSettings_();
  sbosSetSetting_('site_name', siteName);
  sbosSetSetting_('site_url', siteUrl);
  if (outputId || outputName) {
    sbosSetSetting_('output_folder_id', outputId);
    sbosSetSetting_('output_folder_name', outputName);
  }
  if (inputId || inputName) {
    sbosSetSetting_('input_folder_id', inputId);
    sbosSetSetting_('input_folder_name', inputName);
  }

  sbosInitKeywords_();
  sbosInitCandidates_();
  sbosSetState_('status', '');
  sbosSetState_('home_status_text', '新しいサイト：キーワード読込待ち');
  sbosSetState_('active_site_key', sbosSiteKey_(siteName, siteUrl));
  sbosInitHome_();
  sbosRefreshHomeSummary_();
}

function sbosStartOrResumeBlog(siteName, siteUrl) {
  sbosSetOperationMode_(SBOS_MODE.EXISTING_SITE);
  const name = String(siteName || '').trim();
  const url = String(siteUrl || '').trim();
  if (!name || !url) throw new Error('サイト名とサイトURLを入力してください。');

  const targetKey = sbosSiteKey_(name, url);
  if (!targetKey) throw new Error('サイトURLを認識できません。');

  const current = sbosCurrentSiteKey_();
  if (current && current !== targetKey) sbosSaveCurrentBlogSession_();

  const existing = sbosListBlogSessions_().find(x => x.siteKey === targetKey);
  if (existing) {
    const r = sbosRestoreBlogSession_(targetKey);
    return {
      ok:true, mode:'RESTORE',
      siteName:r.siteName, siteUrl:r.siteUrl,
      green:r.green, creatorPending:r.creatorPending, sbmLinked:r.sbmLinked
    };
  }

  sbosResetForNewBlog_(name, url);
  sbosSaveCurrentBlogSession_();
  return {
    ok:true, mode:'NEW',
    siteName:name, siteUrl:url,
    green:0, creatorPending:0, sbmLinked:0
  };
}

// ============================================================================
// Google Drive Picker Server
// Source consolidated from: DrivePicker.gs
// ============================================================================
function sbosShowDrivePicker() {
  sbosEnsureSheets_();
  const isNewSite = sbosIsNewSiteMode_();
  const siteName = isNewSite ? '新規サイト探索' : (sbosGetSetting_('site_name') || '');
  const siteUrl = isNewSite ? '' : (sbosGetSetting_('site_url') || '');
  if (!isNewSite && (!siteName || !siteUrl)) {
    SpreadsheetApp.getUi().alert(
      '対象サイトを先に設定してください',
      '先に「1. 対象サイトを設定・切り替える」で対象サイトを設定してください。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    sbosShowSiteSettings();
    return;
  }

  const template = HtmlService.createTemplateFromFile('DrivePicker');
  template.pickerMode = 'file';
  template.startFolderId = sbosGetSetting_('input_folder_id') || sbosGetSetting_('output_folder_id') || '';
  template.currentSiteName = siteName;
  template.currentSiteUrl = siteUrl;
  template.currentSiteKey = isNewSite ? 'NEW_SITE' : sbosCurrentSiteKey_();
  template.filePrefix = '';
  template.fileExtensions = '.csv,.tsv';
  template.returnAction = '';
  const html = template.evaluate().setWidth(800).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, '2. キーワードを読み込む');
}

function sbosShowDriveFolderPicker_(returnAction) {
  sbosEnsureSheets_();
  const template = HtmlService.createTemplateFromFile('DrivePicker');
  template.currentSiteName = sbosGetSetting_('site_name') || '';
  template.currentSiteUrl = sbosGetSetting_('site_url') || '';
  template.currentSiteKey = sbosCurrentSiteKey_() || '';
  template.filePrefix = '';
  template.fileExtensions = '';
  template.pickerMode = 'folder';
  // 保存先が未設定なら、キーワード読込で使ったフォルダーを開始位置にする。
  template.startFolderId = sbosGetSetting_('output_folder_id') || sbosGetSetting_('input_folder_id') || '';
  template.returnAction = String(returnAction || '');
  const html = template.evaluate().setWidth(800).setHeight(590);
  SpreadsheetApp.getUi().showModalDialog(html, '保存先フォルダーを選ぶ');
}

function sbosShowSerpResultPicker() {
  sbosEnsureSheets_();
  const template = HtmlService.createTemplateFromFile('DrivePicker');
  template.currentSiteName = sbosGetSetting_('site_name') || '';
  template.currentSiteUrl = sbosGetSetting_('site_url') || '';
  template.currentSiteKey = sbosCurrentSiteKey_() || '';
  template.filePrefix = '';
  template.fileExtensions = '';
  template.returnAction = '';
  template.pickerMode = 'serp_result';
  template.startFolderId = sbosGetSetting_('output_folder_id') || '';
  const html = template.evaluate().setWidth(800).setHeight(590);
  SpreadsheetApp.getUi().showModalDialog(html, '保守用: SERP結果JSONファイルを登録する');
}


function sbosShowCannibalEvidencePicker() {
  sbosEnsureSheets_();
  if (sbosIsNewSiteMode_()) {
    SpreadsheetApp.getUi().alert('新規サイト探索ではカニバリ精査を行いません', 'Step 4のSERP・新規サイト適性評価でGREENを確定します。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 2) throw new Error('Candidatesがありません。');
  const vals = sh.getRange(2,1,sh.getLastRow()-1,13).getDisplayValues();
  const greens = vals.filter(r => r[12] === 'GREEN' && sbosStatusCode_(r[1]) === 'CANNIBAL_PENDING');
  const tryMetricMap = sbosTryRescueSignalMap_();
  const rescueYellows = vals.filter(r => r[12] === 'YELLOW').sort((a,b)=>sbosTryRescuePriority_(b,tryMetricMap)-sbosTryRescuePriority_(a,tryMetricMap)).slice(0,5);
  if (!greens.length && !rescueYellows.length) {
    SpreadsheetApp.getUi().alert('カニバリ精査対象がありません', 'SERP GREEN候補も、GREEN 0件時にTRY候補として検討できるYELLOWロングテールもありません。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const template = HtmlService.createTemplateFromFile('DrivePicker');
  template.currentSiteName = sbosGetSetting_('site_name') || '';
  template.currentSiteUrl = sbosGetSetting_('site_url') || '';
  template.currentSiteKey = sbosCurrentSiteKey_() || '';
  template.filePrefix = 'SIMS-Evidence';
  template.fileExtensions = '.zip';
  template.returnAction = '';
  template.pickerMode = 'cannibal_evidence';
  template.startFolderId = sbosGetSetting_('output_folder_id') || '';
  const html = template.evaluate().setWidth(800).setHeight(590);
  SpreadsheetApp.getUi().showModalDialog(html, '5. カニバリ精査Package用Evidenceを選ぶ');
}


function sbosShowCannibalResultPicker() {
  sbosEnsureSheets_();
  const template = HtmlService.createTemplateFromFile('DrivePicker');
  template.currentSiteName = sbosGetSetting_('site_name') || '';
  template.currentSiteUrl = sbosGetSetting_('site_url') || '';
  template.currentSiteKey = sbosCurrentSiteKey_() || '';
  template.filePrefix = '';
  template.fileExtensions = '';
  template.returnAction = '';
  template.pickerMode = 'cannibal_result';
  template.startFolderId = sbosGetSetting_('output_folder_id') || '';
  const html = template.evaluate().setWidth(800).setHeight(590);
  SpreadsheetApp.getUi().showModalDialog(html, '保守用: カニバリ結果JSONファイルを登録する');
}

function sbosSetOutputFolder(folderId, folderName) {
  const id = String(folderId || '');
  const name = String(folderName || 'マイドライブ');
  if (id) DriveApp.getFolderById(id).getName(); // access validation
  sbosSetSetting_('output_folder_id', id);
  sbosSetSetting_('output_folder_name', name);
  // 初回は同じフォルダーをキーワード読込開始位置にも使う。
  if (!sbosGetSetting_('input_folder_id')) {
    sbosSetSetting_('input_folder_id', id);
    sbosSetSetting_('input_folder_name', name);
  }
  return {folderId:id, folderName:name};
}

function sbosEnsureOutputFolderForWorkflow_() {
  const outputId = String(sbosGetSetting_('output_folder_id') || '');
  const outputName = String(sbosGetSetting_('output_folder_name') || '');
  if (outputId || outputName === 'マイドライブ') {
    return {configured:true, autoSet:false, id:outputId, name:outputName || 'マイドライブ'};
  }

  // 初回は、Step 2でキーワードを読み込んだフォルダーをPackage保存先として自動採用する。
  // BOSの通常運用では入力元とPackage保存先を同じEvidenceフォルダーにするため、
  // 追加の保存先確認で作業を中断しない。
  const inputId = String(sbosGetSetting_('input_folder_id') || '');
  const inputName = String(sbosGetSetting_('input_folder_name') || '');
  if (inputId) {
    const folder = DriveApp.getFolderById(inputId);
    const name = folder.getName();
    sbosSetSetting_('output_folder_id', inputId);
    sbosSetSetting_('output_folder_name', name);
    return {configured:true, autoSet:true, id:inputId, name:name};
  }
  if (inputName === 'マイドライブ') {
    sbosSetSetting_('output_folder_id', '');
    sbosSetSetting_('output_folder_name', 'マイドライブ');
    return {configured:true, autoSet:true, id:'', name:'マイドライブ'};
  }
  return {configured:false, autoSet:false, id:'', name:''};
}

function sbosGetOutputFolder_() {
  const id = String(sbosGetSetting_('output_folder_id') || '');
  const name = String(sbosGetSetting_('output_folder_name') || '');
  if (id) {
    const folder = DriveApp.getFolderById(id);
    return {folder:folder, id:id, name:folder.getName()};
  }
  if (name === 'マイドライブ') {
    return {folder:DriveApp.getRootFolder(), id:'', name:'マイドライブ'};
  }
  throw new Error('保存先フォルダーが未設定です。「追加の操作 → 保存先を設定する」から設定してください。');
}

function sbosListDriveFiles(folderId, pickerMode) {
  const result = [];
  const root = DriveApp.getRootFolder();
  const folder = folderId ? DriveApp.getFolderById(folderId) : root;
  const MAX_FOLDERS = 100;
  const MAX_FILES = 300;

  const folders = folder.getFolders();
  let folderCount = 0;
  while (folders.hasNext() && folderCount < MAX_FOLDERS) {
    const f = folders.next();
    result.push({type:'folder', id:f.getId(), name:f.getName(), modifiedTime:0});
    folderCount++;
  }

  const files = folder.getFiles();
  let scannedFiles = 0;
  while (files.hasNext() && scannedFiles < MAX_FILES) {
    const f = files.next();
    scannedFiles++;
    const name = f.getName();
    if (!sbosDrivePickerFileAllowed_(name, pickerMode)) continue;
    let modifiedTime = 0;
    try { modifiedTime = f.getLastUpdated().getTime(); } catch (e) {}
    result.push({
      type:'file',
      id:f.getId(),
      name:name,
      mime:f.getMimeType(),
      modifiedTime:modifiedTime
    });
  }

  result.sort((a,b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (a.type === 'folder') return a.name.localeCompare(b.name, 'ja');
    const timeDiff = Number(b.modifiedTime || 0) - Number(a.modifiedTime || 0);
    return timeDiff || a.name.localeCompare(b.name, 'ja');
  });

  let parentId = '';
  if (folderId) {
    const parents = folder.getParents();
    if (parents.hasNext()) parentId = parents.next().getId();
  }
  return {
    folderId: folderId || '',
    folderName: folderId ? folder.getName() : 'マイドライブ',
    parentId: parentId,
    items: result
  };
}

function sbosDrivePickerFileAllowed_(name, pickerMode) {
  const isSerpResult = pickerMode === 'serp_result';
  const isCannibalEvidence = pickerMode === 'cannibal_evidence';
  const isCannibalResult = pickerMode === 'cannibal_result';
  if (isSerpResult || isCannibalResult) return /\.json$/i.test(name);
  if (isCannibalEvidence) return /\.(zip|csv|tsv|json)$/i.test(name);
  return /\.(csv|tsv)$/i.test(name);
}


function sbosImportDriveFileForSite(fileId, expectedSiteKey) {
  sbosEnsureSheets_();

  const isNewSite = sbosIsNewSiteMode_();
  const currentKey = isNewSite ? 'NEW_SITE' : sbosCurrentSiteKey_();
  const siteName = isNewSite ? '新規サイト探索' : (sbosGetSetting_('site_name') || '');
  const siteUrl = isNewSite ? '' : (sbosGetSetting_('site_url') || '');

  if (!isNewSite && (!siteName || !siteUrl || !currentKey)) {
    throw new Error('対象サイトが未設定です。先に対象サイトを設定してください。');
  }
  if (String(expectedSiteKey || '') !== String(currentKey || '')) {
    throw new Error(
      'ファイル選択中に対象サイトが変更されました。\n' +
      '現在の対象サイト: ' + siteName + '\n' +
      'キーワードファイル選択を開き直してください。'
    );
  }

  return sbosImportDriveFile(fileId);
}


function sbosImportDriveFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const name = file.getName();
  if (!/\.(csv|tsv)$/i.test(name)) {
    throw new Error('入力ファイルはCSVまたはTSVを選択してください。');
  }
    const blob = file.getBlob();
  const bytes = blob.getBytes();
  let text;
  if (bytes.length >= 2 && (bytes[0] & 255) === 255 && (bytes[1] & 255) === 254) {
    text = blob.getDataAsString('UTF-16LE').replace(/^\uFEFF/, '');
  } else if (bytes.length >= 2 && (bytes[0] & 255) === 254 && (bytes[1] & 255) === 255) {
    text = blob.getDataAsString('UTF-16BE').replace(/^\uFEFF/, '');
  } else {
    text = blob.getDataAsString('UTF-8').replace(/^\uFEFF/, '');
  }
  const result = sbosParseKeywordText_(text, name);
  const parents = file.getParents();
  if (parents.hasNext()) {
    const p = parents.next();
    sbosSetSetting_('input_folder_id', p.getId());
    sbosSetSetting_('input_folder_name', p.getName());
    result.meta.folderName = p.getName();
  } else {
    sbosSetSetting_('input_folder_id', '');
    sbosSetSetting_('input_folder_name', 'マイドライブ');
    result.meta.folderName = 'マイドライブ';
  }
  sbosWriteImportedKeywords_(result.rows, result.meta);
  return result.meta;
}

// ============================================================================
// Keyword Import
// Source consolidated from: Import.gs
// ============================================================================
function sbosParseKeywordText_(text, filename) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  if (!lines.length) throw new Error('キーワードファイルが空です。');

  // v0.12.5: ラッコCSVだけでなく、Google Ads Keyword Plannerの
  // UTF-16LE / TSV・先頭説明行付きエクスポートも自動認識する。
  let headerLineIndex = -1;
  let delimiter = ',';
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = String(lines[i] || '').replace(/^\uFEFF/, '');
    const d = line.indexOf('\t') >= 0 ? '\t' : ',';
    const cells = line.split(d).map(x => String(x || '').trim().toLowerCase());
    if (cells.some(x => ['keyword','キーワード','query','検索キーワード'].includes(x))) {
      headerLineIndex = i;
      delimiter = d;
      break;
    }
  }
  if (headerLineIndex < 0) {
    const firstLine = lines[0] || '';
    delimiter = firstLine.indexOf('\t') >= 0 ? '\t' : ',';
    headerLineIndex = 0;
  }

  const body = lines.slice(headerLineIndex).join('\n');
  const data = Utilities.parseCsv(body, delimiter);
  if (!data.length) throw new Error('キーワードファイルが空です。');
  const headers = data[0].map(h => String(h).replace(/^\uFEFF/, '').trim());
  const idx = sbosResolveColumns_(headers);
  if (idx.keyword < 0) throw new Error('キーワード列を認識できませんでした。');
  const rows = [];
  for (let r=1; r<data.length; r++) {
    const row = data[r];
    const kw = String(row[idx.keyword] || '').trim();
    if (!kw) continue;
    rows.push({
      no: idx.no >= 0 ? (row[idx.no] || r) : r,
      source: filename || 'IMPORT',
      sourceWordCount: idx.wordCount >= 0 ? Number(row[idx.wordCount]) || '' : '',
      keyword: kw,
      seoDifficulty: idx.seoDifficulty >= 0 ? row[idx.seoDifficulty] : '',
      volume: idx.volume >= 0 ? row[idx.volume] : '',
      cpc: idx.cpc >= 0 ? row[idx.cpc] : '',
      competition: idx.competition >= 0 ? row[idx.competition] : '',
      occurrence: idx.occurrence >= 0 ? row[idx.occurrence] : '',
      trend3m: idx.trend3m >= 0 ? row[idx.trend3m] : '',
      trendYoy: idx.trendYoy >= 0 ? row[idx.trendYoy] : '',
      competitionIndex: idx.competitionIndex >= 0 ? row[idx.competitionIndex] : ''
    });
  }
  const countWords = x => Number(x.sourceWordCount) || sbosDetectWordCount_(x.keyword);
  const sourceType = idx.trend3m >= 0 || idx.trendYoy >= 0 || idx.competitionIndex >= 0 || headers.some(h => /avg\. monthly searches/i.test(h))
    ? 'GOOGLE_KEYWORD_PLANNER' : 'KEYWORD_CSV';
  const meta = {
    filename: filename || 'IMPORT',
    sourceType: sourceType,
    headerLine: headerLineIndex + 1,
    total: rows.length,
    three: rows.filter(x => countWords(x) === 3).length,
    four: rows.filter(x => countWords(x) === 4).length
  };
  return {rows, meta};
}

function sbosResolveColumns_(headers) {
  const norm = s => String(s || '').replace(/^\uFEFF/, '').trim().toLowerCase();
  const find = names => headers.findIndex(h => names.some(n => norm(h) === norm(n)));
  return {
    no: find(['No','番号']),
    wordCount: find(['単語数','語数','word count','words']),
    keyword: find(['キーワード','keyword','query','検索キーワード']),
    seoDifficulty: find(['SEO難易度','seo difficulty','difficulty']),
    volume: find(['月間検索数','平均月間検索数','search volume','volume','monthly searches','avg. monthly searches','average monthly searches']),
    cpc: find(['CPC ($)','cpc','CPC']),
    competition: find(['競合性','competition']),
    occurrence: find(['出現時期','occurrence']),
    trend3m: find(['3 か月の推移','3か月の推移','3 month change','three month change']),
    trendYoy: find(['前年比の推移','前年比','year over year change','yoy change']),
    competitionIndex: find(['Competition (indexed value)','competition indexed value','競合性（インデックス値）','競合性指数'])
  };
}

function sbosResetKeywordRunState_() {
  const ss = SpreadsheetApp.getActive();
  const siteKey = sbosCurrentSiteKey_();

  // Keywords is overwritten by the import itself. Downstream artifacts must be cleared.
  [SBOS_SHEETS.CANDIDATES, SBOS_SHEETS.SERP_RESULTS].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) sh.clearContents();
  });

  const state = ss.getSheetByName(SBOS_SHEETS.STATE);
  if (state) state.clearContents();

  // State is run-specific. Preserve only the active blog identity in document properties.
  sbosClearSbosDocumentProperties_();
  if (siteKey) {
    PropertiesService.getDocumentProperties().setProperty('SBOS_active_site_key', siteKey);
  }

  sbosInitCandidates_();
  const serp = ss.getSheetByName(SBOS_SHEETS.SERP_RESULTS);
  if (serp && serp.getLastRow() === 0) {
    serp.getRange(1,1,1,6).setValues([[
      'ReviewedAt','RequestId','MainKeyword','Decision','Score','RawJson'
    ]]).setFontWeight('bold');
    serp.hideSheet();
  }

  // Home will be refreshed after import.
}


function sbosWriteImportedKeywords_(rows, meta) {
  sbosEnsureSheets_();

  // 新しいキーワードファイルは新しい探索ランとして扱う。
  // 対象ブログ設定は保持しつつ、前回ランの候補・SERP・request_id等を混在させない。
  sbosResetKeywordRunState_();

  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getMaxColumns()).clearContent();
  const values = rows.map(x => {
    const norm = sbosNormalizeKeyword_(x.keyword);
    const words = x.sourceWordCount || sbosDetectWordCount_(x.keyword);
    const intent = sbosIntentKey_(norm);
    return [x.no,x.source, x.sourceWordCount, x.keyword,norm,words,x.seoDifficulty,x.volume,x.cpc,x.competition,x.occurrence,intent,'',x.trend3m||'',x.trendYoy||'',x.competitionIndex||''];
  });
  if (values.length) sh.getRange(2,1,values.length,values[0].length).setValues(values);
  sbosMarkPrimaryCandidates_();
  const home = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.HOME);
  sbosSetState_('input_file_name', meta.filename);
  sbosSetHomeStatus_('キーワード読込完了');
  sbosSetState_('status', SBOS_STATUS.IMPORT_DONE);
  sbosRefreshHomeSummary_();
  sbosSaveCurrentBlogSession_();
}

// ============================================================================
// Normalization / Intent Cluster
// Source consolidated from: KeywordNormalizer.gs
// ============================================================================
function sbosNormalizeKeyword_(keyword) {
  let s = String(keyword || '').normalize('NFKC').toLowerCase().trim();
  s = s.replace(/iphone\s*17/g, 'iphone17');
  s = s.replace(/0\s*パーセント/g, '0%');
  s = s.replace(/ゼロ\s*パーセント/g, '0%');
  // 充電文脈の単独「0」は「0%」と同一Intentとして扱う。
  if (/(充電|バッテリー|電池|完全放電)/.test(s)) s = s.replace(/(^|\s)0(?=\s|$)/g, '$10%');
  s = s.replace(/出来ない/g, 'できない');
  s = s.replace(/繋がらない/g, 'つながらない');
  s = s.replace(/\s+/g, ' ');
  return s;
}

function sbosDetectWordCount_(keyword) {
  const s = String(keyword || '').trim();
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
}

function sbosKeywordMatchKey_(keyword) {
  // SERP返却結果の行照合専用。意味を変える正規化は行わない。
  // 同一Intentの別表現（例: 0 / 0パーセント）が互いを上書きしないことが目的。
  let s = String(keyword || '').normalize('NFKC').toLowerCase().trim();
  s = s.replace(/iphone\s*17/g, 'iphone17');
  s = s.replace(/\s+/g, ' ');
  return s;
}

function sbosIntentKey_(normalized) {
  let s = String(normalized || '');
  const repl = [
    [/0%|完全放電/g,'ZERO_BATTERY'],
    [/充電できない|充電しない|復帰しない/g,'CHARGE_FAIL'],
    [/つながらない|接続できない/g,'CONNECT_FAIL'],
    [/表示\s*されない/g,'DISPLAY_MISSING'],
    [/反応\s*しない/g,'NO_RESPONSE'],
    [/読み込めない/g,'CANNOT_LOAD'],
    [/読み取れない|認識しない/g,'READ_FAIL'],
    [/音が出ない/g,'NO_SOUND'],
    [/在庫(?:が)?ない/g,'OUT_OF_STOCK'],
    [/人気(?:が)?ない/g,'UNPOPULAR'],
    [/切れる|切断/g,'DISCONNECT'],
    [/進まない/g,'STUCK'],
    [/設定\s*どこ|どこ\s*設定|どこ/g,'LOCATION']
  ];
  repl.forEach(([re,to]) => s = s.replace(re,to));
  // 一般的な「ない」は意味が多様なので共通トークンへ潰さない。
  return s.replace(/[^a-z0-9%一-龠ぁ-んァ-ヶー_]+/gi,'_').replace(/^_+|_+$/g,'');
}

function sbosMarkPrimaryCandidates_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  const last = sh.getLastRow();
  if (last < 2) return;
  const data = sh.getRange(2,1,last-1,13).getValues();
  const seen = {};
  data.forEach((r,i) => {
    const words = Number(r[5]);
    const key = String(r[11] || r[4]);
    const eligible = words === 3 || words === 4;
    const primary = eligible && !seen[key];
    if (primary) seen[key] = true;
    data[i][12] = primary ? 'YES' : (eligible ? 'CLUSTERED' : 'NO');
  });
  sh.getRange(2,1,data.length,13).setValues(data);
}

// ============================================================================
// Screening
// Source consolidated from: Screening.gs
// ============================================================================
function sbosStartScreening() {
  const meta = sbosStartScreeningFromDialog();
  sbosShowScreeningResult_(meta);
  return meta;
}

function sbosShowScreeningResult_(meta) {
  meta = meta || {};
  const count = Number(meta.serpCount || 0);
  if (count > 0) {
    sbosShowWorkflowResult_(
      '一次選抜・4語深掘り完了',
      '<b>SERP精査対象:</b> ' + count + '件<br>' +
      '<b>新規4語深掘り候補:</b> ' + Number(meta.generated4 || 0) + '件<br><br>' +
      'GENERATED_4WORDは需要未確認です。SERP精査で実在需要と競合を確認するまでGREENにはしません。',
      '4. SERP精査へ', 'sbosShowSerpWorkflowDialog'
    );
    return;
  }
  const seeds = sbosSuggestRakkoRescanSeeds_(8);
  const seedHtml = seeds.length ? '<br><br><b>別の切り口で再探索する場合</b><br>' +
    'Step 2で読み込んだキーワードから、ラッコキーワードへ再投入しやすい種キーワードを抽出しました。<br>' +
    '<div style="margin-top:8px;background:#fff;border:1px solid #dadce0;border-radius:6px;padding:10px;line-height:1.8">' +
    seeds.map(x => sbosEscapeHtml_(x)).join('<br>') + '</div><br>' +
    '必要な語をラッコキーワードで調べ、新しいCSVを取得して「2. キーワードを読み込む」から再探索してください。' : '';
  sbosSetHomeStatus_('今回の探索候補なし');
  sbosShowWorkflowResult_(
    '今回の探索は終了です',
    '<b>SERP精査へ進める候補: 0件</b><br>今回の条件では、SERP精査へ進める有望候補は見つかりませんでした。これはエラーではありません。' + seedHtml,
    '', ''
  );
}

function sbosSuggestRakkoRescanSeeds_(limit) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2,1,sh.getLastRow()-1,13).getValues();
  const stats = {};
  rows.forEach(r => {
    const kw = String(r[3] || '').normalize('NFKC').trim().replace(/\s+/g,' ');
    if (!kw) return;
    const parts = kw.split(' ').filter(Boolean);
    if (!parts.length) return;
    const candidates = [];
    if (parts.length >= 2) candidates.push(parts.slice(0,2).join(' '));
    candidates.push(parts[0]);
    candidates.forEach(seed => {
      if (!seed || seed.length < 2) return;
      if (!stats[seed]) stats[seed] = 0;
      stats[seed]++;
    });
  });
  const ranked = Object.keys(stats).sort((a,b) => stats[b]-stats[a] || b.split(' ').length-a.split(' ').length || a.localeCompare(b,'ja'));
  const out = [];
  ranked.forEach(seed => {
    if (out.length >= (Number(limit)||8)) return;
    if (seed.split(' ').length === 1 && out.some(x => x.indexOf(seed+' ') === 0)) return;
    out.push(seed);
  });
  return out;
}

function sbosStartScreeningFromDialog() {
  sbosEnsureSheets_();
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  if (sh.getLastRow() < 2) throw new Error('先に「2. キーワードを読み込む」を実行してください。');
  sbosSetState_('status', SBOS_STATUS.SCREENING_RUNNING);
  return sbosRunScreening_(true);
}

function sbosRunScreening_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  const rows = sh.getRange(2,1,sh.getLastRow()-1,16).getValues();
  const out = [];
  const existingKeys = new Set();

  // まず入力ファイルに実在する3語・4語候補を収集する。
  rows.forEach(r => {
    const words = Number(r[5]);
    if ((words !== 3 && words !== 4) || r[12] !== 'YES') return;
    const kw = String(r[3] || '').trim();
    if (!kw) return;
    const matchKey = sbosKeywordMatchKey_(kw);
    if (matchKey) existingKeys.add(matchKey);
    const metrics = {volume:r[7], trend3m:r[13], trendYoy:r[14], competition:r[9], competitionIndex:r[15]};
    const score = sbosPreScore_(kw, words, metrics);
    if (score < SBOS_THRESHOLDS.SERP_QUEUE_MIN) return;
    const source = words === 4 ? 'EXISTING_4WORD' : 'EXISTING_3WORD';
    out.push({
      kw:kw, words:words, score:score, source:source,
      intent:sbosIntentKey_(sbosNormalizeKeyword_(kw)),
      baseKeyword:'', generatedReason:'', demandMetrics:metrics
    });
  });

  // 3語で需要・意図はありそうだが競合余地をもう一段掘りたい候補だけ4語化する。
  const bases = out
    .filter(x => x.words === 3 &&
      x.score >= SBOS_THRESHOLDS.FOUR_WORD_BASE_MIN &&
      x.score <= SBOS_THRESHOLDS.FOUR_WORD_BASE_MAX)
    .sort((a,b) => b.score - a.score);

  const generated = [];
  const generatedKeys = new Set();
  bases.forEach(base => {
    if (generated.length >= SBOS_THRESHOLDS.MAX_GENERATED_4WORD) return;
    const ideas = sbosGenerateFourWordIdeas_(base.kw)
      .slice(0, SBOS_THRESHOLDS.MAX_GENERATED_PER_BASE);
    ideas.forEach(idea => {
      if (generated.length >= SBOS_THRESHOLDS.MAX_GENERATED_4WORD) return;
      const kw = String(idea.keyword || '').trim();
      const key = sbosKeywordMatchKey_(kw);
      if (!kw || !key || existingKeys.has(key) || generatedKeys.has(key)) return;
      if (sbosDetectWordCount_(kw) !== 4) return;

      generatedKeys.add(key);
      // AI/ルール生成語なので「実在需要未確認」のペナルティを与える。
      const rawScore = sbosPreScore_(kw, 4, {});
      const score = Math.max(SBOS_THRESHOLDS.SERP_QUEUE_MIN, Math.min(79, rawScore - 10));
      generated.push({
        kw:kw, words:4, score:score, source:'GENERATED_4WORD',
        intent:sbosIntentKey_(sbosNormalizeKeyword_(kw)),
        baseKeyword:base.kw,
        generatedReason:idea.reason || '3語候補の検索意図を具体化', demandMetrics:{}
      });
    });
  });

  const combined = out.concat(generated);
  combined.sort((a,b) => b.score - a.score || (a.source === 'GENERATED_4WORD' ? 1 : -1));
  const limited = combined.slice(0, SBOS_THRESHOLDS.MAX_SERP_QUEUE);

  sbosWriteCandidates_(limited);
  sbosSetState_('generated_4word_count', generated.length);

  // v0.12.4: 候補0件をSERP工程へ流さない。探索結果として正常終了し、
  // 次回のラッコキーワード再探索に使える種キーワードを返す。
  const actualPending = sbosGetSerpPendingCandidates_().length;
  const noCandidates = actualPending === 0;
  if (noCandidates) {
    sbosSetState_('status', SBOS_STATUS.COMPLETE);
    sbosSetHomeStatus_('今回の探索候補なし');
  } else {
    sbosSetState_('status', SBOS_STATUS.SERP_RUNNING);
    sbosSetHomeStatus_('SERP精査待ち');
  }
  sbosSaveCurrentBlogSession_();

  return {
    serpCount: actualPending,
    generated4: generated.length,
    noCandidates: noCandidates,
    rescanSeeds: noCandidates ? sbosSuggestRakkoRescanSeeds_(8) : []
  };
}


function sbosParseTrendPercent_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;
  if (raw === '∞' || /^inf(?:inity)?$/i.test(raw)) return Infinity;
  const n = Number(raw.replace(/,/g,'').replace(/％/g,'%').replace(/%/g,''));
  return isFinite(n) ? n : null;
}

function sbosTrendScore_(value, maxAbs) {
  const n = sbosParseTrendPercent_(value);
  if (n === null) return 0;
  if (n === Infinity) return maxAbs;
  if (n >= 100) return maxAbs;
  if (n >= 20) return Math.max(2, Math.round(maxAbs * 0.65));
  if (n > 0) return Math.max(1, Math.round(maxAbs * 0.35));
  if (n <= -100) return -maxAbs;
  if (n <= -20) return -Math.max(2, Math.round(maxAbs * 0.65));
  if (n < 0) return -Math.max(1, Math.round(maxAbs * 0.35));
  return 0;
}

function sbosAdsCompetitionSignal_(competition, competitionIndex) {
  // Google Adsの競合性はSEO難易度ではないため、減点材料には使わない。
  // 広告主需要の補助Signalとして最大3点だけ加点する。
  let score = 0;
  const c = String(competition || '').trim().toLowerCase();
  if (['高','high'].includes(c)) score += 2;
  else if (['中','medium'].includes(c)) score += 1;
  const idx = Number(String(competitionIndex || '').replace(/,/g,''));
  if (isFinite(idx) && idx >= 70) score += 1;
  else if (isFinite(idx) && idx >= 30) score += 0.5;
  return Math.min(3, score);
}

function sbosDemandMetricsText_(m) {
  m = m || {};
  const parts = [];
  if (String(m.volume || '').trim()) parts.push('月間検索数 ' + String(m.volume).trim());
  if (String(m.trend3m || '').trim()) parts.push('3か月推移 ' + String(m.trend3m).trim());
  if (String(m.trendYoy || '').trim()) parts.push('前年比 ' + String(m.trendYoy).trim());
  if (String(m.competition || '').trim()) parts.push('広告競合性 ' + String(m.competition).trim());
  if (String(m.competitionIndex || '').trim()) parts.push('競合性指数 ' + String(m.competitionIndex).trim());
  return parts.length ? parts.join(' / ') : '';
}

function sbosPreScore_(kw, words, metrics) {
  metrics = metrics || {};
  let score = 20;
  const s = String(kw).toLowerCase();
  const hit = SBOS_TROUBLE_TERMS.some(t => s.indexOf(t) >= 0);
  if (hit) score += 30;
  if (words === 4) score += 12;
  if (/(方法|やり方|原因|対処|設定|解除|どこ|いつ|なぜ)/.test(s)) score += 15;
  if (/(pro max|plus|air|ios|wifi|nfc|usb|bluetooth|マイナンバー|ロック画面|バッテリー|充電)/.test(s)) score += 10;
  const v = Number(String(metrics.volume || '').replace(/,/g,''));
  if (!isNaN(v) && v > 0) score += Math.min(13, Math.log10(v + 1) * 5);
  score += sbosTrendScore_(metrics.trend3m, 8);
  score += sbosTrendScore_(metrics.trendYoy, 6);
  score += sbosAdsCompetitionSignal_(metrics.competition, metrics.competitionIndex);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function sbosWriteCandidates_(items) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,27).clearContent();
  const vals = items.map((x,i) => {
    const metricText = sbosDemandMetricsText_(x.demandMetrics || {});
    const evidence = x.source === 'GENERATED_4WORD'
      ? '3語候補「' + x.baseKeyword + '」から4語へ深掘り生成。理由: ' + x.generatedReason + '。需要Signalは未確認のため、実SERP・サジェスト等で確認するまでBlue Ocean確定不可。'
      : '入力ファイルに実在する候補。一次選抜通過。Pre Scoreです。' + (metricText ? ' Keyword Planner需要Signal: ' + metricText + '。' : '') + ' 実SERP確認前のためBlue Ocean Scoreは未確定です。';
    return [
      false,sbosStatusLabel_('PENDING'),x.kw,x.words,x.score,'PENDING','PENDING',sbosDescribeIntent_(x.kw),
      evidence,x.source,'未作成',x.intent,sbosStatusLabel_('PENDING'),
      '','','','',i+1
    ];
  });
  if (vals.length) sh.getRange(2,1,vals.length,18).setValues(vals);
  sbosApplyCandidateFormatting_();
}

function sbosDescribeIntent_(kw) {
  return '「' + kw + '」で検索する利用者の具体的な疑問・困りごとを解決する';
}

function sbosApplyCandidateFormatting_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh) return;

  // 内部データは保持し、モードに応じて日常操作に必要な列だけ表示する。
  const maxVisibleCols = Math.min(27, sh.getMaxColumns());
  try { sh.showColumns(1, maxVisibleCols); } catch(e) {}
  const newSite = sbosIsNewSiteMode_();
  const visible = new Set(newSite ? [1,2,3,4,6,19,20,21,22,23,24,25,26] : [1,2,3,4,6,7,11]);
  for (let c=1; c<=maxVisibleCols; c++) {
    if (!visible.has(c)) {
      try { sh.hideColumns(c); } catch(e) {}
    }
  }
  Array.from(visible).forEach(c => { try { sh.showColumns(c); } catch(e) {} });

  const widths = newSite
    ? {1:62,2:105,3:300,4:58,6:100,19:105,20:78,21:78,22:78,23:78,24:95,25:78,26:78}
    : {1:62,2:110,3:330,4:58,6:100,7:90,11:115};
  Object.keys(widths).forEach(k => sh.setColumnWidth(Number(k), widths[k]));

  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
  sh.getRange(1,1,1,27)
    .setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#174ea6');

  sh.getRange(1,1).setNote('処理する候補にチェックします。1回最大10件です。');
  sh.getRange(1,2).setNote('現在の判定・処理状態です。');
  sh.getRange(1,6).setNote('SERP精査によるBlue Ocean Scoreです。');
  sh.getRange(1,7).setNote('既存記事とのカニバリ判定です。新規サイト探索モードでは使用しません。');
  sh.getRange(1,11).setNote('aCreator依頼キューの状態です。新規サイト探索モードでは使用しません。');
  sh.getRange(1,19).setNote('新規サイト立ち上げ向けの総合適性スコアです。');
  sh.getRange(1,24).setNote('10～30記事程度の専門クラスターへ展開できる力です。');
  sh.getRange(1,26).setNote('YMYL・公式独占・ブランド依存・短命トレンド等のリスクです。高いほど危険です。');

  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2,1,last-1,27).getDisplayValues();
    vals.forEach((r,i) => {
      const row=i+2, st=sbosStatusCode_(r[1]), creator=String(r[10]||''), articleId=String(r[13]||'');
      if (creator === 'SIMS Manager登録済み' || articleId) {
        sh.getRange(row,1,1,27).setBackground('#eeeeee').setFontColor('#777777');
        return;
      }
      sh.getRange(row,1,1,27).setFontColor('#202124').setBackground(null);
      let bg='#f1f3f4';
      if (st === 'CANNIBAL_PENDING' || st === 'YELLOW') bg='#fff2cc';
      if (st === 'BLOCK' || st === 'CLUSTERED') bg='#e6e6e6';
      if (st === 'GREEN') bg='#d9ead3';
      if (st === 'TRY') bg='#d9eaf7';
      sh.getRange(row,2).setBackground(bg);
    });
    sh.getRange(2,3,last-1,1).setWrap(true);
    sh.getRange(2,1,last-1,1).insertCheckboxes();
  }

  if (!sh.getFilter() && sh.getLastRow() >= 1) {
    try { sh.getRange(1,1,Math.max(1,sh.getLastRow()),27).createFilter(); } catch(e) {}
  }
  sbosSortCandidatesByStatus_();
  sbosRefreshHomeSummary_();
}
function sbosCandidateSortPriority_(row) {
  const st = sbosStatusCode_(row[1]);
  const creator = String(row[10] || '');
  const articleId = String(row[13] || '');
  if (articleId || creator === 'SIMS Manager登録済み') return 80;
  if ((st === 'GREEN' || st === 'TRY') && creator === '依頼待ち') return 10;
  if ((st === 'GREEN' || st === 'TRY') && creator === '作成済み') return 20;
  if (st === 'GREEN') return 5;
  if (st === 'TRY') return 8;
  if (st === 'CANNIBAL_PENDING') return 30;
  if (st === 'PENDING') return 40;
  if (st === 'YELLOW') return 50;
  if (st === 'BLOCK') return 60;
  if (st === 'CLUSTERED') return 70;
  return 75;
}

function sbosSortCandidatesByStatus_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 3) return;
  const n = sh.getLastRow()-1;
  const vals = sh.getRange(2,1,n,18).getValues();
  vals.sort((a,b) => {
    const p = sbosCandidateSortPriority_(a)-sbosCandidateSortPriority_(b);
    if (p) return p;
    return Number(b[5]||b[4]||0)-Number(a[5]||a[4]||0);
  });
  vals.forEach((r,i)=>r[17]=i+1);
  sh.getRange(2,1,n,18).setValues(vals);
  sh.getRange(2,1,n,1).insertCheckboxes();
}

// ============================================================================
// SERP Review Package
// ============================================================================
function sbosCreateSerpReviewPackage(options) {
  options = options || {};
  const suppressDialog = options.suppressDialog === true;
  const ui = SpreadsheetApp.getUi();
  const startedAt = new Date().getTime();
  const timing = {};
  let stage = '開始';

  try {
    stage = 'Candidates確認';
    // Package作成では全シート再初期化は不要。
    // sbosEnsureSheets_() はHome再描画・Candidates再書式化を伴うため呼ばない。
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(SBOS_SHEETS.CANDIDATES);
    if (!sh || sh.getLastRow() < 2) {
      if (suppressDialog) throw new Error('SERP精査対象がありません。先に「3. ブルーオーシャン候補を探す」を実行してください。');
      ui.alert('SERP精査対象がありません', '先に「3. ブルーオーシャン候補を探す」を実行してください。', ui.ButtonSet.OK);
      return;
    }
    timing.candidatesCheckMs = new Date().getTime() - startedAt;

    stage = 'モード・対象確認';
    const isNewSite = sbosIsNewSiteMode_();
    let siteName = isNewSite ? '' : sbosGetSetting_('site_name');
    let siteUrl = isNewSite ? '' : sbosGetSetting_('site_url');
    if (!isNewSite && (!siteName || !siteUrl)) {
      if (suppressDialog) throw new Error('対象サイトが未設定です。');
      const r = ui.alert(
        '対象サイトが未設定です',
        'SERP精査では対象サイトとの適合性も評価します。今ここで対象サイトを設定しますか？',
        ui.ButtonSet.YES_NO
      );
      if (r !== ui.Button.YES) return;
      sbosShowSiteSettings();
      return;
    }

    stage = '保存先確認';
    const tOutput = new Date().getTime();
    const ensuredOutput = sbosEnsureOutputFolderForWorkflow_();
    timing.outputFolderMs = new Date().getTime() - tOutput;
    if (!ensuredOutput.configured) {
      if (suppressDialog) throw new Error('保存先フォルダーが未設定です。SERP精査画面から保存先を設定してください。');
      sbosShowDriveFolderPicker_('serp_workflow');
      return;
    }
    const folderName = ensuredOutput.name;

    stage = '候補読込';
    const tRead = new Date().getTime();
    const values = sh.getRange(2,1,sh.getLastRow()-1,18).getDisplayValues();
    const candidates = values
      .filter(r => sbosStatusCode_(r[12]) === 'PENDING' || r[12] === 'REQUESTED')
      .map(r => ({
        rank: Number(r[17]) || 0,
        main_keyword: r[2],
        words: Number(r[3]) || 0,
        pre_score: Number(r[4]) || 0,
        search_intent: r[7],
        source: r[9],
        intent_key: r[11],
        source_metrics: r[8] || ''
      }));
    timing.candidateReadMs = new Date().getTime() - tRead;

    if (!candidates.length) {
      if (suppressDialog) throw new Error('PENDINGのSERP候補がありません。');
      ui.alert('Package対象がありません', 'PENDINGのSERP候補がありません。', ui.ButtonSet.OK);
      return;
    }

    stage = '依頼データ生成';
    const tBuild = new Date().getTime();
    const requestId = 'SBOS-SERP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
    const inputFile = sbosGetState_('input_file_name') || '未選択';
    const payload = {
      format: 'SIMS_BOS_SERP_REVIEW_REQUEST_V1',
      contract_version: '1.0',
      product: SBOS_PRODUCT_NAME,
      product_version: SBOS_VERSION,
      request_id: requestId,
      generated_at: sbosNow_(),
      mode: isNewSite ? SBOS_MODE.NEW_SITE : SBOS_MODE.EXISTING_SITE,
      site: {name: siteName, url: siteUrl},
      input_file: inputFile,
      candidate_count: candidates.length,
      evaluation_policy: isNewSite ? {
        purpose: '対象サイトを前提にせず、新規サイト立ち上げ向けのBlue Oceanキーワードを実SERPで精査する',
        do_not_assume_volume_zero_means_no_demand: true,
        require_web_verification: true,
        skip_cannibalization_check: true,
        disable_try_rescue: true,
        final_green_in_serp_stage: true,
        new_site_dimensions: ['entry_ease','demand','serp_gap','expansion','cluster_potential','continuity','risk'],
        green_gate: 'blue_ocean_score>=80 AND new_site_fit_score>=80 AND cluster_potential>=70 AND risk<=60',
        yellow_gate: 'blue_ocean_score>=65 AND new_site_fit_score>=65 AND risk<=75',
        keyword_planner_metrics_policy: '月間検索数・3か月推移・前年比は需要Signalとして利用する。Google Ads競合性はSEO難易度と同一視せず、広告主需要の補助情報としてのみ扱う'
      } : {
        purpose: '個人ブログが上位表示を狙える3語・4語ロングテールのBlue Ocean候補を実SERPで精査する',
        do_not_assume_volume_zero_means_no_demand: true,
        require_web_verification: true,
        do_not_finalize_article_green_before_cannibalization_check: true,
        keyword_planner_metrics_policy: '月間検索数・3か月推移・前年比は需要Signalとして利用する。Google Ads競合性はSEO難易度と同一視せず、広告主需要の補助情報としてのみ扱う'
      },
      candidates: candidates
    };
    const md = sbosBuildSerpReviewRequestMarkdown_(payload);
    const jsonText = JSON.stringify(payload, null, 2);
    const readme = sbosBuildSerpPackageReadme_(payload);
    timing.payloadBuildMs = new Date().getTime() - tBuild;

    stage = 'ZIP生成';
    const tZip = new Date().getTime();
    const blobs = [
      Utilities.newBlob(readme, 'text/markdown', 'README-FIRST.md'),
      Utilities.newBlob(md, 'text/markdown', 'SERP-REVIEW-REQUEST.md'),
      Utilities.newBlob(jsonText, 'application/json', 'SERP_REVIEW_REQUEST_V1.json')
    ];
    const safeSite = sbosSafeFilename_(isNewSite ? 'New-Site' : (siteName || 'Unassigned-Site'));
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
    const zipName = 'SIMS-BOS-' + safeSite + '-Claude-SERP-Review-' + stamp + '.zip';
    const zipBlob = Utilities.zip(blobs, zipName);
    timing.zipBuildMs = new Date().getTime() - tZip;

    stage = 'Google Drive保存';
    const tDrive = new Date().getTime();
    const outFolder = sbosGetOutputFolder_();
    const folder = outFolder.folder;
    const file = folder.createFile(zipBlob);
    timing.driveSaveMs = new Date().getTime() - tDrive;

    stage = '候補状態更新';
    const tStatus = new Date().getTime();
    const statusValues = values.map(r => [
      sbosStatusCode_(r[12]) === 'PENDING' ? 'REQUESTED' : r[12]
    ]);
    sh.getRange(2,13,statusValues.length,1).setValues(statusValues);
    timing.statusUpdateMs = new Date().getTime() - tStatus;

    stage = '状態保存';
    const tState = new Date().getTime();
    sbosSetState_('serp_request_id', requestId);
    sbosSetState_('serp_package_file_id', file.getId());
    sbosSetState_('serp_package_file_name', zipName);
    sbosSetHomeStatus_('SERP精査依頼Package作成済み');
    timing.stateSaveMs = new Date().getTime() - tState;
    timing.totalMs = new Date().getTime() - startedAt;

    if (!suppressDialog) {
      sbosShowWorkflowResult_(
        'SERP精査依頼Packageを作成しました',
        '<b>候補:</b> ' + candidates.length + '件<br>' +
        '<b>ファイル名:</b> ' + sbosEscapeHtml_(zipName) + '<br>' +
        '<b>保存先:</b> ' + sbosEscapeHtml_(folderName || folder.getName() || 'マイドライブ') + '<br>' +
        '<b>処理時間:</b> ' + (timing.totalMs / 1000).toFixed(1) + '秒<br><br>' +
        'このZIPをClaude.aiへアップロードしてSERP精査を依頼してください。',
        '',
        ''
      );
    }
    return {
      count:candidates.length,
      fileName:zipName,
      folderName:(folderName || folder.getName() || 'マイドライブ'),
      requestId:requestId,
      elapsedMs:timing.totalMs,
      timing:timing
    };
  } catch (e) {
    const elapsed = new Date().getTime() - startedAt;
    throw new Error(
      'SERP Package作成に失敗しました。\n' +
      '停止工程: ' + stage + '\n' +
      '経過時間: ' + (elapsed / 1000).toFixed(1) + '秒\n' +
      '詳細: ' + (e && e.message ? e.message : e)
    );
  }
}

function sbosCreateSerpReviewPackageForWorkflow() {
  const r = sbosCreateSerpReviewPackage({suppressDialog:true});
  if (!r) throw new Error('SERP精査Packageを作成できませんでした。');
  return r;
}

function sbosShowSerpWorkflowDialog() {
  sbosEnsureSheets_();
  const isNewSite = sbosIsNewSiteMode_();
  const siteName = isNewSite ? '新規サイト探索' : (sbosGetSetting_('site_name') || '');

  if (!isNewSite && !siteName) {
    SpreadsheetApp.getUi().alert('先に「1. 対象サイトを設定・切り替える」を実行してください。');
    return;
  }

  const pending = sbosGetSerpPendingCandidates_().length;
  if (pending === 0) {
    const seeds = sbosSuggestRakkoRescanSeeds_(8);
    const seedHtml = seeds.length
      ? '<br><br><b>再探索候補</b><br>' + seeds.map(x => sbosEscapeHtml_(x)).join('<br>')
      : '';
    sbosShowWorkflowResult_(
      'SERP精査対象はありません',
      '現在、SERP精査待ちの候補は0件です。Step 4の操作は不要です。' + seedHtml,
      '',
      ''
    );
    return;
  }

  const output = sbosEnsureOutputFolderForWorkflow_();
  if (!output.configured) {
    sbosShowDriveFolderPicker_('serp_workflow');
    return;
  }

  const html = HtmlService.createHtmlOutput(
    sbosBuildSerpWorkflowHtml_(isNewSite, siteName, pending)
  ).setWidth(780).setHeight(720);

  SpreadsheetApp.getUi().showModalDialog(html, '4. SERP精査');
}

function sbosBuildSerpWorkflowHtml_(isNewSite, siteName, pending) {
  const modeInfo = isNewSite
    ? 'モード: <b>新規サイト用キーワード探索</b><br>カニバリ判定: <b>実施しない</b><br>'
    : '対象サイト: <b>' + sbosEscapeHtml_(siteName) + '</b><br>';
  const newSiteJs = isNewSite ? 'true' : 'false';

  return '<!doctype html>' +
    '<html><head><base target="_top"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;color:#202124;background:#fff}' +
    '.w{padding:20px}.t{font-size:20px;font-weight:700}' +
    '.g{background:#e8f0fe;padding:11px;border-radius:8px;margin:10px 0;line-height:1.6}' +
    '.b{border:1px solid #dadce0;border-radius:8px;padding:13px;margin-top:12px}' +
    '.l{font-weight:700;margin-bottom:7px}' +
    'textarea{width:100%;height:235px;box-sizing:border-box;border:1px solid #dadce0;border-radius:7px;padding:10px;font-family:monospace;font-size:12px}' +
    '.st{background:#f8fafd;border-radius:6px;padding:9px;margin-top:8px;font-size:12px;white-space:pre-wrap;line-height:1.5}' +
    '.a{display:flex;justify-content:flex-end;gap:8px;margin-top:9px}' +
    'button{border:0;border-radius:6px;padding:9px 14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}' +
    '.p{background:#1a73e8;color:#fff}.s{background:#f1f3f4}' +
    'button:disabled{opacity:.75;cursor:default}' +
    '.sp{display:none;width:14px;height:14px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:r .75s linear infinite}' +
    '.working .sp{display:inline-block}@keyframes r{to{transform:rotate(360deg)}}' +
    '.ov{display:none;position:fixed;inset:0;background:rgba(255,255,255,.92);z-index:9999;align-items:center;justify-content:center}' +
    '.ov.on{display:flex}.ovbox{text-align:center;font-weight:700;font-size:17px;color:#174ea6;padding:24px}' +
    '.bigsp{width:48px;height:48px;border:5px solid #d2e3fc;border-top-color:#1a73e8;border-radius:50%;animation:r .75s linear infinite;margin:0 auto 16px}' +
    '.ovsub{font-size:12px;font-weight:400;color:#5f6368;margin-top:8px;white-space:pre-wrap}' +
    '.debug{font-size:11px;color:#5f6368;margin-top:6px}' +
    '</style></head><body>' +

    '<div id="pkgOverlay" class="ov"><div class="ovbox"><div class="bigsp"></div>' +
    '<div>Packageを作成しています…</div>' +
    '<div id="overlaySub" class="ovsub">画面表示を更新しています。</div></div></div>' +

    '<div class="w"><div class="t">4. SERP精査</div>' +
    '<div class="g">' + modeInfo +
    'SERP精査待ち: <b>' + Number(pending || 0) + '件</b><br>' +
    'Package作成から回答登録まで、この画面で続けて処理できます。</div>' +

    '<div class="b"><div class="l">① SERP精査Packageを作成</div>' +
    '<div id="pkg" class="st">未作成</div>' +
    '<div class="a"><button id="serpPackageBtn" type="button" class="p">' +
    '<span class="sp"></span><span class="tx">Packageを作成</span></button></div></div>' +

    '<div class="b"><div class="l">② Claude回答全文を貼り付け</div>' +
    '<textarea id="ans" placeholder="Claude回答全文をここへ貼り付け"></textarea>' +
    '<div id="rst" class="st">回答待ち</div><div class="a">' +
    '<button id="closeBtn" type="button" class="s">閉じる</button>' +
    '<button id="nextCandidates" type="button" class="p" style="display:none"><span class="sp"></span><span class="tx">7. 候補・進捗を確認</span></button>' +
    '<button id="nextCannibal" type="button" class="p" style="display:none"><span class="sp"></span><span class="tx">5. カニバリ精査へ</span></button>' +
    '<button id="regSerp" type="button" class="p"><span class="sp"></span><span class="tx">回答を登録</span></button>' +
    '</div></div><div class="debug">Blue Ocean Screener v' + SBOS_VERSION + '</div></div>' +

    '<script>(function(){"use strict";' +
    'var newSiteMode=' + newSiteJs + ';' +
    'function q(id){return document.getElementById(id)}' +
    'function busy(b,on,text){if(!b)return;var t=b.querySelector(".tx");if(on){b.dataset.oldLabel=t?t.textContent:"";if(t)t.textContent=text||"処理中…";b.classList.add("working");b.disabled=true}else{if(t)t.textContent=b.dataset.oldLabel||"実行";b.classList.remove("working");b.disabled=false}}' +
    'function showOv(msg){q("overlaySub").textContent=msg||"しばらくお待ちください。";q("pkgOverlay").classList.add("on")}' +
    'function hideOv(){q("pkgOverlay").classList.remove("on")}' +

    'function createPackage(){' +
      'var b=q("serpPackageBtn"),s=q("pkg");' +
      'busy(b,true,"Package作成中…");' +
      's.textContent="Packageを作成しています…";' +
      'showOv("候補を確認してZIPを準備しています。\\nGoogle Driveへの保存完了までお待ちください。");' +
      'setTimeout(function(){' +
        'google.script.run.withSuccessHandler(function(r){' +
          'hideOv();' +
          's.textContent="作成完了\\nファイル: "+r.fileName+"\\n保存先: "+r.folderName+"\\n候補: "+r.count+"件\\n処理時間: "+((r.elapsedMs||0)/1000).toFixed(1)+"秒\\n\\nこのZIPをClaude.aiへアップロードしてください。";' +
          'b.style.display="none";' +
        '}).withFailureHandler(function(e){' +
          'hideOv();busy(b,false);' +
          's.textContent="エラー\\n"+(e&&e.message?e.message:String(e));' +
        '}).sbosCreateSerpReviewPackageForWorkflow();' +
      '},150);' +
    '}' +

    'function registerSerp(){' +
      'var b=q("regSerp"),ans=q("ans").value,s=q("rst");' +
      'if(!ans.trim()){s.textContent="Claude回答全文を貼り付けてください。";return}' +
      'busy(b,true,"処理中…");s.textContent="回答を検証・登録しています…";' +
      'google.script.run.withSuccessHandler(function(r){' +
        'busy(b,false);' +
        's.textContent="登録完了\\n反映: "+r.applied+"件\\nGREEN: "+r.green+" / YELLOW: "+r.yellow+" / BLOCK: "+r.block+(r.newSiteMode?"\\n新規サイト適性評価を反映済み":"");' +
        'b.style.display="none";' +
        'if(newSiteMode){q("nextCandidates").style.display="inline-flex"}else if(r.green>0||r.yellow>0){q("nextCannibal").style.display="inline-flex"}else{q("nextCandidates").style.display="inline-flex"}' +
      '}).withFailureHandler(function(e){' +
        'busy(b,false);s.textContent="エラー: "+(e&&e.message?e.message:String(e))+(newSiteMode?"\\n\\n新規サイト探索では new_site_fit_score / new_site_dimensions / new_site_assessment を含む完全JSONが必要です。":"");' +
      '}).sbosImportSerpReviewText(ans);' +
    '}' +

    'function goCandidates(){var b=q("nextCandidates");busy(b,true,"処理中…");google.script.run.withSuccessHandler(function(){google.script.host.close()}).withFailureHandler(function(e){busy(b,false);q("rst").textContent="エラー: "+(e&&e.message?e.message:String(e))}).sbosOpenCandidates()}' +
    'function goCannibal(){var b=q("nextCannibal");busy(b,true,"処理中…");google.script.run.withSuccessHandler(function(){google.script.host.close()}).withFailureHandler(function(e){busy(b,false);q("rst").textContent="エラー: "+(e&&e.message?e.message:String(e))}).sbosShowCannibalEvidencePicker()}' +

    'function bind(){' +
      'q("serpPackageBtn").addEventListener("click",createPackage);' +
      'q("regSerp").addEventListener("click",registerSerp);' +
      'q("nextCandidates").addEventListener("click",goCandidates);' +
      'q("nextCannibal").addEventListener("click",goCannibal);' +
      'q("closeBtn").addEventListener("click",function(){google.script.host.close()});' +
    '}' +
    'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",bind)}else{bind()}' +
    '})();</script></body></html>';
}

function sbosBuildSerpPackageReadme_(p) {
  if (p && p.mode === SBOS_MODE.NEW_SITE) {
    return [
      '# Blue Ocean Screener New Site Discovery Package','',
      '- Request ID: ' + p.request_id,
      '- Mode: NEW_SITE',
      '- Target Site: 指定なし',
      '- Candidates: ' + p.candidate_count,'',
      '## 利用方法','',
      'このZIPをClaudeへそのままアップロードし、Web検索で全候補を検証してください。',
      '通常のSERP競争評価に加え、新規サイトの立ち上げテーマとしての参入性・需要・SERP空白・展開性・クラスター形成力・継続性・リスクを評価します。',
      'このモードではカニバリ判定とTRY救済は行いません。GREENはSERP・新規サイト適性精査で最終確定します。'
    ].join('\n');
  }
  return [
    '# Blue Ocean Screener SERP Review Package',
    '',
    '- Request ID: ' + p.request_id,
    '- Site: ' + p.site.name,
    '- Candidates: ' + p.candidate_count,
    '',
    '## 利用方法',
    '',
    'このZIPをClaudeへそのままアップロードし、次のように依頼してください。',
    '',
    '「Blue Ocean ScreenerのSERP精査依頼Packageです。Web検索で全候補を検証し、依頼書の契約に従って判定してください。」',
    '',
    'ClaudeはWeb検索を行い、読みやすい診断結果と SIMS_BOS_SERP_REVIEW_RESULT_V1 JSON を返します。',
    '新記事の最終GREENは、このSERP精査だけでは確定しません。後段のカニバリ検査を通過して確定します。'
  ].join('\n');
}

function sbosBuildSerpReviewRequestMarkdown_(p) {
  if (p && p.mode === SBOS_MODE.NEW_SITE) {
    const lines = [
      '# Blue Ocean Screener 新規サイト用SERP・適性精査依頼','',
      '## Request','',
      '- request_id: `' + p.request_id + '`',
      '- mode: NEW_SITE',
      '- target_site: 指定なし',
      '- candidates: ' + p.candidate_count,'',
      '## 目的','',
      '対象サイトや既存記事を前提にせず、新しく立ち上げるサイトの入口として有望な3語・4語ロングテールをWeb検索で精査してください。',
      '単発記事として弱くないかだけでなく、周辺キーワードへ展開し、10～30記事程度の専門クラスターを形成できるかを重視してください。','',
      '## 新規サイト向け評価軸','',
      '- entry_ease (0-100): 新規ドメイン・小規模サイトでもSERPへ参入できる余地',
      '- demand (0-100): 月間検索数・3か月推移・前年比・実SERP需要Signal',
      '- serp_gap (0-100): 検索意図を十分満たしていないSERP空白',
      '- expansion (0-100): 関連する3語・4語テーマへ自然に展開できる余地',
      '- cluster_potential (0-100): 10～30記事程度の専門クラスター形成力',
      '- continuity (0-100): 一過性ニュースに依存しない中長期継続性',
      '- risk (0-100): YMYL、公式独占、ブランド依存、短命トレンド等のリスク。高いほど危険','',
      '## 新規サイト適性スコア','',
      'new_site_fit_score は次の重みを目安に総合してください。',
      'entry_ease 20% / demand 15% / serp_gap 15% / expansion 15% / cluster_potential 20% / continuity 10% / (100-risk) 5%','',
      '## 最終判定','',
      '- GREEN: blue_ocean_score>=80、new_site_fit_score>=80、cluster_potential>=70、risk<=60 をすべて満たす',
      '- YELLOW: GREEN未満だが blue_ocean_score>=65、new_site_fit_score>=65、risk<=75',
      '- BLOCK: 上記以外、または新規サイトの核として不適切',
      '- このモードではカニバリ判定を行わず、TRY救済も使用しない',
      '- GREENはこのSERP・新規サイト適性精査で最終確定する','',
      '## 追加確認','',
      '- 大手・公式・EC・高権威サイトだけで上位が固定されていないか',
      '- 個人ブログ、Q&A、フォーラム等が上位に混在するか',
      '- source=GENERATED_4WORD は実需要Signalが確認できない限りGREENにしない',
      '- 1キーワードだけで終わらず、サイトの初期記事群へ展開できるか',
      '- 特定商品・ブランド・一過性トレンドへの依存が強すぎないか','',
      '## 返却JSON','',
      '回答末尾に `SIMS_BOS_SERP_REVIEW_RESULT_V1` の完全JSONを ```json コードブロックでインライン出力してください。','',
      'results[] 必須フィールド:',
      '- rank',
      '- main_keyword',
      '- serp_decision (GREEN / YELLOW / BLOCK)',
      '- blue_ocean_score (0-100)',
      '- new_site_fit_score (0-100)',
      '- new_site_dimensions {entry_ease,demand,serp_gap,expansion,cluster_potential,continuity,risk}',
      '- new_site_assessment',
      '- evidence_summary',
      '- exact_or_near_exact_competitors',
      '- big_site_pressure (LOW / MEDIUM / HIGH)',
      '- intent_gap (LOW / MEDIUM / HIGH)',
      '- personal_blog_chance (LOW / MEDIUM / HIGH)',
      '- suggested_four_word_queries[]',
      '- sources[]','',
      '## Candidates',''
    ];
    p.candidates.forEach(c => {
      lines.push('### #' + c.rank + ' ' + c.main_keyword);
      lines.push('- words: ' + c.words);
      lines.push('- pre_score: ' + c.pre_score);
      lines.push('- source: ' + c.source);
      lines.push('- intent: ' + c.search_intent);
      if (c.source_metrics) lines.push('- source_metrics: ' + c.source_metrics);
      lines.push('');
    });
    return lines.join('\n');
  }
  const lines = [
    '# Blue Ocean Screener SERP精査依頼',
    '',
    '## Request',
    '',
    '- request_id: `' + p.request_id + '`',
    '- site: ' + p.site.name,
    '- site_url: ' + p.site.url,
    '- candidates: ' + p.candidate_count,
    '',
    '## 目的',
    '',
    '各候補を実際にWeb検索し、個人ブログが狙えるBlue Oceanかを評価してください。検索ボリュームだけで判断せず、実SERPの競合状況と検索意図の空白を重視してください。',
    '',
    '## 各候補で確認する項目',
    '',
    '- 検索意図が明確か',
    '- 上位結果にその検索意図専用の記事が何件あるか',
    '- 企業・公式・大手メディアによる占有度',
    '- 個人ブログ、Q&A、フォーラム等が上位に混在するか',
    '- 古い情報や検索意図ズレが残っているか',
    '- 対象サイトとのテーマ適合性',
    '- 3語が強い場合、自然な4語深掘り候補があるか',
    '- source=GENERATED_4WORD はシステム生成候補。サジェスト、実検索結果、Q&A等で需要Signalを確認できない限りGREENにしない',
    '',
    '## 判定',
    '',
    '- GREEN: SERP上は有望。後段のカニバリ検査へ送る',
    '- YELLOW: 需要はあるが競合・意図・Evidenceに不確実性がある',
    '- BLOCK: SERP競合が強い、検索意図が成立しにくい、または新記事候補として弱い',
    '',
    '注意: GREENは「SERP段階のGREEN」です。既存記事とのカニバリ検査前なので、新記事作成を最終確定しないでください。',
    '',
    '## 返却JSON',
    '',
    '最後に次の契約名のJSONを、**このチャット回答本文の末尾へ完全な形でインライン出力**してください。',
    '',
    '`SIMS_BOS_SERP_REVIEW_RESULT_V1`',
    '',
    '**重要:** JSONを別ファイルだけに保存・添付して終わらせないでください。BOSではClaudeの回答全文をコピー＆ペーストして登録します。説明文の後に、必ず完全なJSON本体を ```json コードブロックで回答本文へ含めてください。',
    '**重要:** 「上のファイルに格納しました」「JSONファイルを作成しました」だけでは登録できません。ファイルを作る場合でも、同じ完全JSONを回答本文にも必ず再掲してください。',
    '',
    '必須フィールド:',
    '',
    '- format',
    '- contract_version',
    '- request_id',
    '- reviewed_at',
    '- results[]',
    '  - rank',
    '  - main_keyword',
    '  - serp_decision (GREEN / YELLOW / BLOCK)',
    '  - blue_ocean_score (0-100)',
    '  - evidence_summary',
    '  - exact_or_near_exact_competitors',
    '  - big_site_pressure (LOW / MEDIUM / HIGH)',
    '  - intent_gap (LOW / MEDIUM / HIGH)',
    '  - personal_blog_chance (LOW / MEDIUM / HIGH)',
    '  - suggested_four_word_queries[]',
    '  - sources[]',
    '',
    '## Candidates',
    ''
  ];
  p.candidates.forEach(c => {
    lines.push('### #' + c.rank + ' ' + c.main_keyword);
    lines.push('- words: ' + c.words);
    lines.push('- pre_score: ' + c.pre_score);
    lines.push('- source: ' + c.source);
    lines.push('- intent: ' + c.search_intent);
    lines.push('- intent_key: ' + c.intent_key);
    if (c.source_metrics) lines.push('- source_metrics: ' + c.source_metrics);
    lines.push('');
  });
  return lines.join('\n');
}

function sbosSafeFilename_(s) {
  return String(s || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Site';
}


function sbosExtractContractJsonFromText_(rawText, expectedFormat) {
  const text = String(rawText || '').trim();
  if (!text) throw new Error('Claude回答が空です。');

  const candidates = [];

  // 1) ```json ... ``` / ``` ... ``` code blocks
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fm;
  while ((fm = fenceRe.exec(text)) !== null) {
    const s = String(fm[1] || '').trim();
    if (s) candidates.push({source:'code_block', text:s});
  }

  // 2) Whole text when it is itself JSON-ish.
  if (/^[\s\r\n]*[\{\[]/.test(text)) {
    candidates.push({source:'whole_text', text:text});
  }

  // 3) Scan every balanced {...} object in the answer.
  // This tolerates prose before/after JSON and Claude responses without code fences.
  const starts = [];
  let inString = false, escape = false, depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        starts.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  starts.forEach(s => candidates.push({source:'balanced_object', text:s}));

  const parsed = [];
  const parseErrors = [];
  candidates.forEach(c => {
    try {
      const obj = JSON.parse(c.text);
      parsed.push({source:c.source, obj:obj});
    } catch(e) {
      parseErrors.push(c.source + ': ' + (e && e.message ? e.message : e));
    }
  });

  // Prefer the exact expected contract regardless of where it appeared.
  for (let i = parsed.length - 1; i >= 0; i--) {
    const obj = parsed[i].obj;
    if (obj && typeof obj === 'object' && String(obj.format || '') === String(expectedFormat || '')) {
      return obj;
    }
  }

  // If JSON was found but the expected contract is absent, explain what was found.
  if (parsed.length) {
    const formats = parsed
      .map(x => x.obj && typeof x.obj === 'object' ? String(x.obj.format || '') : '')
      .filter(Boolean);
    throw new Error(
      expectedFormat + ' のJSONは見つかりませんでした。\n' +
      (formats.length ? '検出したformat: ' + Array.from(new Set(formats)).join(', ') + '\n' : '') +
      'Claude回答末尾に format="' + expectedFormat + '" を含む完全JSONを出力してください。'
    );
  }

  // No valid JSON at all.
  throw new Error(
    expectedFormat + ' のJSONをClaude回答全文から見つけられませんでした。\n' +
    'JSONコードブロック、または回答本文中の完全なJSONオブジェクトを貼り付けてください。\n' +
    (parseErrors.length ? '検出候補はありましたがJSONとして解析できませんでした。例: ' + parseErrors[0] : 'JSONオブジェクト自体を検出できませんでした。')
  );
}

function sbosShowResultPasteDialog_(kind) {
  const isSerp = kind === 'serp';
  const title = isSerp ? '4. SERP精査結果を貼り付け・登録する' : '5. カニバリ精査結果を貼り付け・登録する';
  const serverFn = isSerp ? 'sbosImportSerpReviewText' : 'sbosImportCannibalReviewText';
  const nextFn = isSerp ? 'sbosShowCannibalEvidencePicker' : 'sbosOpenCandidates';
  const nextLabel = isSerp ? '5. カニバリ精査へ' : '7. 候補・進捗を確認';
  const guide = isSerp
    ? 'ClaudeのSERP精査回答を、説明文を含めて全文そのまま貼り付けてください。JSON部分だけを抜き出す必要はありません。'
    : 'Claudeのカニバリ精査回答を、説明文を含めて全文そのまま貼り付けてください。JSON部分だけを抜き出す必要はありません。';

  const html = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;color:#202124}.wrap{padding:22px}' +
    'h2{font-size:20px;margin:0 0 10px}.guide{background:#e8f0fe;border-radius:8px;padding:12px;line-height:1.6;margin-bottom:12px}' +
    'textarea{width:100%;height:330px;box-sizing:border-box;border:1px solid #dadce0;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;resize:vertical}' +
    '.msg{min-height:20px;margin-top:8px;color:#5f6368;white-space:pre-wrap}.foot{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}' +
    'button{border:0;border-radius:6px;padding:10px 16px;font-weight:600;cursor:pointer}.primary{background:#1a73e8;color:#fff}.secondary{background:#f1f3f4}' +
    '</style></head><body><div class="wrap"><h2>' + sbosEscapeHtml_(title) + '</h2>' +
    '<div class="guide">' + sbosEscapeHtml_(guide) + '</div>' +
    '<textarea id="answer" placeholder="ここへClaudeの回答全文を貼り付け"></textarea><div id="msg" class="msg"></div>' +
    '<div class="foot"><button class="secondary" onclick="google.script.host.close()">閉じる</button><button id="next" class="primary" style="display:none" onclick="nextStep()">' + nextLabel + '</button><button id="go" class="primary" onclick="submitAnswer()">登録する</button></div></div>' +
    '<script>function submitAnswer(){var t=document.getElementById("answer").value;if(!t.trim()){document.getElementById("msg").textContent="Claudeの回答全文を貼り付けてください。";return;}document.getElementById("go").disabled=true;document.getElementById("msg").textContent="検証・登録中…";google.script.run.withSuccessHandler(function(r){document.getElementById("msg").textContent="登録完了\\n反映: "+r.applied+"件\\nGREEN: "+r.green+" / YELLOW: "+r.yellow+" / BLOCK: "+r.block+(r.clustered!==undefined?"\\nIntent統合: "+r.clustered+"件":"");document.getElementById("go").style.display="none";var n=document.getElementById("next");if(' + (isSerp ? '(r.green>0||r.yellow>0)' : 'true') + '){n.style.display="inline-block";}else{n.textContent="7. 候補を確認";n.style.display="inline-block";}}).withFailureHandler(function(e){document.getElementById("go").disabled=false;document.getElementById("msg").textContent="エラー: "+(e&&e.message?e.message:e);}).' + serverFn + '(t);}function nextStep(){document.getElementById("next").disabled=true;google.script.run.withSuccessHandler(function(){google.script.host.close();}).withFailureHandler(function(e){document.getElementById("next").disabled=false;document.getElementById("msg").textContent="エラー: "+(e&&e.message?e.message:e);}).' + nextFn + '();}</script>' +
    '</body></html>'
  ).setWidth(760).setHeight(570);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

function sbosShowSerpResultPasteDialog() {
  sbosEnsureSheets_();
  sbosShowResultPasteDialog_('serp');
}

function sbosShowCannibalResultPasteDialog() {
  sbosEnsureSheets_();
  sbosShowResultPasteDialog_('cannibal');
}

function sbosImportSerpReviewText(rawText) {
  const payload = sbosExtractContractJsonFromText_(rawText, 'SIMS_BOS_SERP_REVIEW_RESULT_V1');
  if (sbosIsNewSiteMode_()) sbosValidateNewSiteSerpPayload_(payload);
  return sbosApplySerpReviewPayload_(payload, {
    sourceName: 'Claude回答全文貼り付け',
    sourceType: 'CLAUDE_PASTE'
  });
}


function sbosValidateNewSiteSerpPayload_(payload) {
  if (!payload || !Array.isArray(payload.results) || !payload.results.length) {
    throw new Error('新規サイト適性評価のresults[]がありません。');
  }
  const requiredDims = ['entry_ease','demand','serp_gap','expansion','cluster_potential','continuity','risk'];
  const problems = [];
  payload.results.forEach((r, idx) => {
    const label = String(r.main_keyword || ('#' + (idx + 1)));
    if (r.new_site_fit_score === undefined || r.new_site_fit_score === null || r.new_site_fit_score === '') {
      problems.push(label + ': new_site_fit_score');
    }
    if (!r.new_site_dimensions || typeof r.new_site_dimensions !== 'object') {
      problems.push(label + ': new_site_dimensions');
    } else {
      requiredDims.forEach(k => {
        if (r.new_site_dimensions[k] === undefined || r.new_site_dimensions[k] === null || r.new_site_dimensions[k] === '') {
          problems.push(label + ': new_site_dimensions.' + k);
        }
      });
    }
    if (r.new_site_assessment === undefined || r.new_site_assessment === null || String(r.new_site_assessment).trim() === '') {
      problems.push(label + ': new_site_assessment');
    }
  });
  if (problems.length) {
    const shown = problems.slice(0, 12);
    throw new Error(
      '新規サイト適性評価の必須項目が不足しています。\n' +
      shown.join('\n') +
      (problems.length > shown.length ? '\nほか ' + (problems.length - shown.length) + '件' : '') +
      '\n\nClaudeへ、Packageの返却JSON仕様どおり完全JSONを再出力するよう依頼してください。'
    );
  }
}

// ============================================================================
// SERP Review Result Import
// ============================================================================
function sbosImportSerpReviewResult(fileId) {
  sbosEnsureSheets_();
  const file = DriveApp.getFileById(fileId);
  if (!/\.json$/i.test(file.getName())) throw new Error('SERP精査結果はJSONファイルを選択してください。');
  let payload;
  try {
    payload = JSON.parse(file.getBlob().getDataAsString('UTF-8').replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error('JSONを解析できませんでした: ' + e.message);
  }
  return sbosApplySerpReviewPayload_(payload, {
    sourceName: file.getName(),
    sourceId: file.getId(),
    sourceType: 'MANUAL_JSON'
  });
}

function sbosApplySerpReviewPayload_(payload, source) {
  source = source || {};
  if (!payload || payload.format !== 'SIMS_BOS_SERP_REVIEW_RESULT_V1') {
    throw new Error('SIMS_BOS_SERP_REVIEW_RESULT_V1 形式のSERP結果ではありません。');
  }
  if (!Array.isArray(payload.results) || !payload.results.length) {
    throw new Error('results[] が空です。');
  }
  const expectedRequestId = sbosGetState_('serp_request_id') || '';
  if (expectedRequestId && String(payload.request_id || '') !== expectedRequestId) {
    throw new Error('request_idが一致しません。\n期待値: ' + expectedRequestId + '\n受信値: ' + String(payload.request_id || '未設定'));
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 2) throw new Error('CandidatesシートにSERP候補がありません。');
  const data = sh.getRange(2,1,sh.getLastRow()-1,13).getValues();
  const resultMap = new Map();
  payload.results.forEach(r => {
    const key = sbosKeywordMatchKey_(r.main_keyword || '');
    if (!key) return;
    if (resultMap.has(key)) {
      throw new Error('SERP結果に同一main_keywordが重複しています: ' + String(r.main_keyword || ''));
    }
    resultMap.set(key, r);
  });

  let applied = 0;
  const counts = {GREEN:0, YELLOW:0, BLOCK:0};
  data.forEach((row, i) => {
    const key = sbosKeywordMatchKey_(row[2]);
    const r = resultMap.get(key);
    if (!r) return;
    const d = String(r.serp_decision || '').toUpperCase();
    if (!['GREEN','YELLOW','BLOCK'].includes(d)) throw new Error('不正なserp_decision: ' + d + ' / ' + r.main_keyword);
    const score = Number(r.blue_ocean_score);
    if (!isFinite(score) || score < 0 || score > 100) throw new Error('不正なblue_ocean_score: ' + r.blue_ocean_score + ' / ' + r.main_keyword);
    let finalDecision = d;
    const isNewSite = sbosIsNewSiteMode_();
    if (isNewSite) {
      const ns = Number(r.new_site_fit_score);
      const dims = r.new_site_dimensions || {};
      const entryEase = Number(dims.entry_ease);
      const demand = Number(dims.demand);
      const serpGap = Number(dims.serp_gap);
      const expansion = Number(dims.expansion);
      const cluster = Number(dims.cluster_potential);
      const continuity = Number(dims.continuity);
      const risk = Number(dims.risk);
      const nums = [ns,entryEase,demand,serpGap,expansion,cluster,continuity,risk];
      if (nums.some(v => !isFinite(v) || v < 0 || v > 100)) {
        throw new Error('新規サイト適性評価が不足または不正です: ' + r.main_keyword);
      }
      if (score >= 80 && ns >= 80 && cluster >= 70 && risk <= 60) finalDecision = 'GREEN';
      else if (score >= 65 && ns >= 65 && risk <= 75) finalDecision = 'YELLOW';
      else finalDecision = 'BLOCK';

      // Append new-site evaluation columns S:AA.
      const rr = i + 2;
      sh.getRange(rr,19,1,9).setValues([[
        Math.round(ns),Math.round(entryEase),Math.round(demand),Math.round(serpGap),
        Math.round(expansion),Math.round(cluster),Math.round(continuity),Math.round(risk),
        String(r.new_site_assessment || '')
      ]]);
    }
    counts[finalDecision]++;
    row[5] = Math.round(score);
    row[6] = isNewSite ? 'NOT_RUN' : (finalDecision === 'GREEN' ? 'PENDING' : 'NOT_RUN');
    row[8] = String(r.evidence_summary || '');
    row[11] = sbosIntentKey_(sbosNormalizeKeyword_(row[2]));
    row[12] = finalDecision;
    row[1] = isNewSite ? finalDecision : (finalDecision === 'GREEN' ? sbosStatusLabel_('CANNIBAL_PENDING') : finalDecision);
    applied++;
  });
  if (!applied) throw new Error('Candidatesのキーワードと一致するSERP結果がありませんでした。');
  sh.getRange(2,1,data.length,13).setValues(data);

  const sourceName = source.sourceName || 'Claude Manual Review';
  sbosWriteSerpReviewArchive_(payload, sourceName);
  // 未精査候補が残っている間はIntent統合を行わない。
  // 全候補のSERP結果が揃ってから統合し、未精査候補を誤ってCLUSTEREDにしない。
  const pendingAfter = sbosGetSerpPendingCandidates_().length;
  const clustered = pendingAfter === 0 ? sbosCollapseCandidateIntentDuplicates_() : 0;
  sbosApplyCandidateFormatting_();
  sbosSetState_('status', SBOS_STATUS.SERP_REVIEW_IMPORTED);
  sbosSetState_('serp_result_source', source.sourceType || 'UNKNOWN');
  if (source.sourceId) sbosSetState_('serp_result_file_id', source.sourceId);
  sbosSetState_('serp_result_file_name', sourceName);
  const summary = (sbosIsNewSiteMode_() ? '新規サイト適性評価登録済み' : 'SERP精査結果登録済み') +
    '（GREEN ' + counts.GREEN + ' / YELLOW ' + counts.YELLOW + ' / BLOCK ' + counts.BLOCK + '）';
  sbosSetHomeStatus_(summary);
  sbosSaveCurrentBlogSession_();
  return {
    applied: applied,
    green: counts.GREEN,
    yellow: counts.YELLOW,
    block: counts.BLOCK,
    clustered: clustered,
    requestId: String(payload.request_id || ''),
    newSiteMode: sbosIsNewSiteMode_()
  };
}

function sbosWriteSerpReviewArchive_(payload, filename) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.SERP_RESULTS);
  const headers = [[
    'Request ID','Reviewed At','Rank','Main Keyword','SERP Decision','Blue Ocean Score',
    'Exact/Near Exact Competitors','Big Site Pressure','Intent Gap','Personal Blog Chance',
    'Suggested 4-Word Queries','Sources','Evidence Summary','Imported File'
  ]];
  if (sh.getLastRow() === 0 || String(sh.getRange('A1').getValue()) !== 'Request ID') {
    sh.clear();
    sh.getRange(1,1,1,headers[0].length).setValues(headers).setFontWeight('bold');
  }
  const vals = payload.results.map(r => [
    payload.request_id || '', payload.reviewed_at || '', r.rank || '', r.main_keyword || '',
    r.serp_decision || '', r.blue_ocean_score || '', r.exact_or_near_exact_competitors || 0,
    r.big_site_pressure || '', r.intent_gap || '', r.personal_blog_chance || '',
    (r.suggested_four_word_queries || []).join(' | '), (r.sources || []).join(' | '),
    r.evidence_summary || '', filename || ''
  ]);
  if (vals.length) sh.getRange(sh.getLastRow()+1,1,vals.length,headers[0].length).setValues(vals);
  sh.setFrozenRows(1);
  if (!sh.isSheetHidden()) sh.hideSheet();
}

function sbosCollapseCandidateIntentDuplicates_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const last = sh.getLastRow();
  if (last < 3) return 0;
  const data = sh.getRange(2,1,last-1,13).getValues();
  const groups = {};
  data.forEach((r,i) => {
    const key = sbosIntentKey_(sbosNormalizeKeyword_(r[2]));
    r[11] = key;
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  });
  let clustered = 0;
  Object.keys(groups).forEach(key => {
    const idxs = groups[key];
    if (idxs.length < 2) return;
    // SERP評価が高い行をPrimaryとし、同一Intentの残りは別記事候補から除外する。
    idxs.sort((a,b) => Number(data[b][5] || data[b][4] || 0) - Number(data[a][5] || data[a][4] || 0));
    const primary = idxs[0];
    idxs.slice(1).forEach(i => {
      data[i][1] = sbosStatusLabel_('CLUSTERED');
      data[i][6] = 'NOT_RUN';
      data[i][12] = sbosStatusLabel_('CLUSTERED');
      data[i][8] = '同一Intent Clusterのため「' + data[primary][2] + '」へ統合。別記事候補にはしません。 ' + String(data[i][8] || '');
      clustered++;
    });
  });
  sh.getRange(2,1,data.length,13).setValues(data);
  return clustered;
}

// ============================================================================
// SERP Evaluation Adapter
// Source consolidated from: SerpEvaluator.gs
// ============================================================================
/**
 * SERP evaluator adapter.
 * Standard provider is the manual Claude Package review workflow.
 */
function sbosEvaluateSerpCandidate_(candidate) {
  return {status:'PENDING', score:null, evidence:'SERP精査結果待ち'};
}

function sbosGetSerpPendingCandidates_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(2,1,sh.getLastRow()-1,18).getDisplayValues();
  return values.filter(r => {
    const st = sbosStatusCode_(r[12]);
    return st === 'PENDING' || r[12] === 'REQUESTED';
  }).map(r => ({
    rank:Number(r[17]) || 0,
    main_keyword:r[2],
    words:Number(r[3]) || 0,
    pre_score:Number(r[4]) || 0,
    search_intent:r[7],
    source:r[9],
    intent_key:r[11]
  }));
}

function sbosBuildSerpReviewPayload_(requestId, candidates, siteName, siteUrl) {
  return {
    format:'SIMS_BOS_SERP_REVIEW_REQUEST_V1',
    contract_version:'1.0',
    product:SBOS_PRODUCT_NAME,
    product_version:SBOS_VERSION,
    request_id:requestId,
    generated_at:sbosNow_(),
    site:{name:siteName, url:siteUrl},
    input_file:sbosGetState_('input_file_name') || '未選択',
    candidate_count:candidates.length,
    evaluation_policy:{
      purpose:'個人ブログが上位表示を狙える3語・4語ロングテールのBlue Ocean候補をWeb検索で精査する',
      do_not_assume_volume_zero_means_no_demand:true,
      require_web_verification:true,
      do_not_finalize_article_green_before_cannibalization_check:true
    },
    candidates:candidates
  };
}

function sbosParseJsonFromClaudeText_(text) {
  let s = String(text || '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(s); } catch(e) {}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch(e) {}
  }
  throw new Error('Claudeの結果をSIMS_BOS_SERP_REVIEW_RESULT_V1 JSONとして解析できませんでした。');
}

function sbosBuildClaudeSerpPrompt_(p) {
  return [
    'Current date/timezone: ' + sbosNow_() + ' / Asia/Tokyo',
    '',
    'Task: Review every candidate using real, current web search results. Judge whether a personal blog can realistically target the query.',
    'Prioritize search-intent fit and SERP gaps over nominal search volume.',
    'For source=GENERATED_4WORD, do not mark GREEN unless you can confirm a demand signal from web results, suggestions, Q&A, forums, or equivalent evidence.',
    'GREEN means SERP-stage GREEN only; cannibalization is checked later.',
    'The sources array must contain source URLs used for the judgment when available.',
    '',
    'Decision guide:',
    '- GREEN: clear intent, meaningful demand signal, exploitable SERP gap, and realistic personal-blog opportunity.',
    '- YELLOW: demand exists but competition, intent, freshness, or evidence remains uncertain.',
    '- BLOCK: dominant strong competitors, weak/nonexistent intent, no convincing demand signal, or poor fit for a new article.',
    '',
    'Return contract: SIMS_BOS_SERP_REVIEW_RESULT_V1.',
    'request_id must exactly equal: ' + p.request_id,
    '',
    'REQUEST JSON:',
    JSON.stringify(p, null, 2)
  ].join('\n');
}

function sbosSerpResultJsonSchema_() {
  const result = {
    type:'object',
    properties:{
      rank:{type:'number'},
      main_keyword:{type:'string'},
      serp_decision:{type:'string', enum:['GREEN','YELLOW','BLOCK']},
      blue_ocean_score:{type:'number'},
      evidence_summary:{type:'string'},
      exact_or_near_exact_competitors:{type:'number'},
      big_site_pressure:{type:'string', enum:['LOW','MEDIUM','HIGH']},
      intent_gap:{type:'string', enum:['LOW','MEDIUM','HIGH']},
      personal_blog_chance:{type:'string', enum:['LOW','MEDIUM','HIGH']},
      suggested_four_word_queries:{type:'array', items:{type:'string'}},
      sources:{type:'array', items:{type:'string'}}
    },
    required:['rank','main_keyword','serp_decision','blue_ocean_score','evidence_summary','exact_or_near_exact_competitors','big_site_pressure','intent_gap','personal_blog_chance','suggested_four_word_queries','sources'],
    additionalProperties:false
  };
  return {
    type:'object',
    properties:{
      format:{type:'string', const:'SIMS_BOS_SERP_REVIEW_RESULT_V1'},
      contract_version:{type:'string'},
      request_id:{type:'string'},
      reviewed_at:{type:'string'},
      results:{type:'array', items:result}
    },
    required:['format','contract_version','request_id','reviewed_at','results'],
    additionalProperties:false
  };
}

// ============================================================================
// Four-word Explorer
// Source consolidated from: FourWordExplorer.gs
// ============================================================================
function sbosGenerateFourWordIdeas_(keyword) {
  const base = String(keyword || '').trim();
  if (!base || sbosDetectWordCount_(base) !== 3) return [];
  const s = base.toLowerCase();
  const ideas = [];

  function add(modifier, reason) {
    const kw = base + ' ' + modifier;
    if (sbosDetectWordCount_(kw) === 4) ideas.push({keyword:kw, reason:reason});
  }

  // 症状・利用場面に合わせた第4語。単なる「原因」「対処」の乱造を避ける。
  if (/wifi/.test(s) && /(繋がらない|つながらない|接続できない)/.test(s)) {
    add('データ移行後', 'Wi-Fi不通が起きる場面を具体化');
    add('ios更新後', 'OS更新後という発生条件を具体化');
  } else if (/ゲーム/.test(s) && /(音が出ない|無音)/.test(s)) {
    add('特定アプリ', 'ゲームだけ無音になる対象を具体化');
    add('bluetooth', '音声出力先の条件を具体化');
  } else if (/ゲーム/.test(s) && /(重い|遅い|カクつく)/.test(s)) {
    add('発熱', '処理低下と関連しやすい状況を具体化');
    add('fps', 'ゲーム性能低下の現象を具体化');
  } else if (/モバイルバッテリー/.test(s) && /(使えない|充電できない)/.test(s)) {
    add('usb-c', '接続方式を具体化');
    add('充電開始しない', '症状を具体化');
  } else if (/(0|0%|0％|0パーセント)/.test(s) && /充電できない/.test(s)) {
    add('usb-c', '完全放電後の有線充電条件を具体化');
    add('完全放電', '0%状態の検索意図を明確化');
  } else if (/近くのデバイス/.test(s) && /進まない/.test(s)) {
    add('クイックスタート', '発生機能を具体化');
    add('データ移行', '発生場面を具体化');
  } else if (/\bx\b/.test(s) && /読み込めない/.test(s)) {
    add('タイムライン', 'Xで読み込めない対象を具体化');
    add('画像', 'Xで読み込めない対象を具体化');
  } else if (/(人気ない|人気がない|不人気)/.test(s)) {
    add('理由', '購入判断の疑問を具体化');
    add('後悔', '購入後の不安・比較意図を具体化');
  } else if (/nfc/.test(s) && /(反応しない|使えない)/.test(s)) {
    add('マイナンバー', 'NFC利用場面を具体化');
    add('タッチ決済', 'NFC利用場面を具体化');
  } else {
    // 汎用フォールバックは具体性の高い語だけに限定。
    if (/(できない|しない|進まない|繋がらない|つながらない|重い|遅い|切れる)/.test(s)) {
      add('特定条件', '症状の発生条件を追加して検索意図を細分化');
    }
    if (/(設定|どこ|方法|やり方)/.test(s)) {
      add('見つからない', '設定・場所の困りごとを具体化');
    }
  }

  return ideas.slice(0, SBOS_THRESHOLDS.MAX_GENERATED_PER_BASE);
}

// ============================================================================
// Cannibalization
// Source consolidated from: Cannibalization.gs
// ============================================================================
function sbosCannibalRisk_(keyword) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.ARTICLES);
  if (!sh || sh.getLastRow() < 2) return {risk:'PENDING', matched:[]};
  const values = sh.getDataRange().getDisplayValues();
  const target = sbosNormalizeKeyword_(keyword);
  const targetTokens = new Set(target.split(/\s+/));
  const matched = [];
  for (let i=1;i<values.length;i++) {
    const hay = sbosNormalizeKeyword_(values[i].join(' '));
    let common = 0;
    targetTokens.forEach(t => { if (t && hay.indexOf(t) >= 0) common++; });
    const ratio = targetTokens.size ? common / targetTokens.size : 0;
    if (ratio >= .67) matched.push({row:i+1, ratio:ratio, title:values[i][1] || values[i][0]});
  }
  if (!matched.length) return {risk:'LOW', matched:[]};
  const max = Math.max.apply(null, matched.map(x=>x.ratio));
  return {risk:max >= .9 ? 'HIGH' : 'MEDIUM', matched:matched.slice(0,5)};
}



function sbosImportCannibalReviewResult(fileId) {
  sbosEnsureSheets_();
  const file = DriveApp.getFileById(fileId);
  if (!/\.json$/i.test(file.getName())) throw new Error('カニバリ精査結果はJSONファイルを選択してください。');
  let payload;
  try {
    payload = JSON.parse(file.getBlob().getDataAsString('UTF-8').replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error('JSONを解析できませんでした: ' + e.message);
  }
  return sbosApplyCannibalReviewPayload_(payload, {sourceName:file.getName(), sourceId:file.getId(), sourceType:'MANUAL_JSON'});
}

function sbosImportCannibalReviewText(rawText) {
  const payload = sbosExtractContractJsonFromText_(rawText, 'SIMS_BOS_CANNIBAL_REVIEW_RESULT_V1');
  return sbosApplyCannibalReviewPayload_(payload, {sourceName:'Claude回答全文貼り付け', sourceType:'CLAUDE_PASTE'});
}

function sbosApplyCannibalReviewPayload_(payload, source) {
  source = source || {};
  if (!payload || payload.format !== 'SIMS_BOS_CANNIBAL_REVIEW_RESULT_V1') {
    throw new Error('SIMS_BOS_CANNIBAL_REVIEW_RESULT_V1 形式の結果JSONではありません。');
  }
  if (!Array.isArray(payload.results) || !payload.results.length) throw new Error('results[] が空です。');

  const expectedRequestId = sbosGetState_('cannibal_request_id') || '';
  if (expectedRequestId && String(payload.request_id || '') !== expectedRequestId) {
    throw new Error('request_idが一致しません。\n期待値: ' + expectedRequestId + '\n受信値: ' + String(payload.request_id || '未設定'));
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 2) throw new Error('Candidatesシートに候補がありません。');
  const data = sh.getRange(2,1,sh.getLastRow()-1,13).getValues();
  const resultMap = new Map();
  payload.results.forEach(r => {
    const key = sbosKeywordMatchKey_(r.main_keyword || '');
    if (!key) return;
    if (resultMap.has(key)) throw new Error('結果に同一main_keywordが重複しています: ' + r.main_keyword);
    resultMap.set(key, r);
  });

  let applied=0;
  const detail = {};
  const normalResults = [];
  const rescueResults = [];

  data.forEach(row => {
    const key = sbosKeywordMatchKey_(row[2]);
    const r = resultMap.get(key);
    if (!r) return;
    const d = String(r.decision || '').toUpperCase();
    const can = String(r.cannibalization || '').toUpperCase();
    if (!['GREEN','YELLOW','BLOCK'].includes(d)) throw new Error('不正なdecision: ' + d + ' / ' + r.main_keyword);
    if (!['LOW','MEDIUM','HIGH'].includes(can)) throw new Error('不正なcannibalization: ' + can + ' / ' + r.main_keyword);

    const originalSerp = String(row[12] || '').toUpperCase();
    row[6] = can;
    const add = String(r.evidence_summary || '');
    if (add) row[8] = String(row[8] || '') + (row[8] ? '\n\n[Cannibal Review] ' : '[Cannibal Review] ') + add;
    applied++; detail[key] = r;

    if (originalSerp === 'YELLOW') {
      rescueResults.push({row:row, decision:d, cannibalization:can, detail:r});
    } else {
      row[1] = d;
      normalResults.push({row:row, decision:d, cannibalization:can, detail:r});
    }
  });
  if (!applied) throw new Error('Candidatesと一致するカニバリ精査結果がありませんでした。');

  // 通常GREEN候補の最終GREEN数を先に確定する。
  const finalGreenCount = normalResults.filter(x => x.decision === 'GREEN').length;
  let tryCount = 0;
  if (finalGreenCount === 0) {
    // v0.12.6: GREENが最終0件の場合だけ、SERP YELLOWのうちカニバリLOW/MEDIUMで
    // BLOCK判定されなかった上位候補をTRYへ。HIGHは安全側で除外する。
    rescueResults
      .sort((a,b)=>Number(b.row[5]||0)-Number(a.row[5]||0))
      .forEach(x => {
        if (tryCount >= 5) { x.row[1] = 'YELLOW'; return; }
        if (x.decision !== 'BLOCK' && (x.cannibalization === 'LOW' || x.cannibalization === 'MEDIUM')) {
          x.row[1] = 'TRY';
          const tryMetrics = sbosTryRescueSignalMap_()[sbosKeywordMatchKey_(x.row[2])] || {};
          const metricText = sbosDemandMetricsText_(tryMetrics);
          x.row[8] = String(x.row[8] || '') +
            '\n\n[TRY Rescue] 通常GREENが0件のため、利用者判断で試せるロングテール実験候補として提示。' +
            'GREENではなく、需要規模・SERP競争・データ不足等の不確実性があります。カニバリ確認: ' + x.cannibalization + '。' +
            (metricText ? ' 需要Signal: ' + metricText + '。' : '');
          tryCount++;
        } else {
          x.row[1] = x.decision === 'BLOCK' || x.cannibalization === 'HIGH' ? 'BLOCK' : 'YELLOW';
        }
      });
  } else {
    // GREENが1件以上ある場合は救済枠を発動しない。
    rescueResults.forEach(x => { x.row[1] = 'YELLOW'; });
  }

  const counts={GREEN:0,TRY:0,YELLOW:0,BLOCK:0};
  data.forEach(row => {
    const st = sbosStatusCode_(row[1]);
    if (Object.prototype.hasOwnProperty.call(counts, st)) counts[st]++;
  });

  sh.getRange(2,1,data.length,13).setValues(data);
  sbosApplyCandidateFormatting_();

  if (source.sourceId) sbosSetState_('cannibal_result_file_id', source.sourceId);
  sbosSetState_('cannibal_result_source', source.sourceType || 'UNKNOWN');
  sbosSetState_('cannibal_result_source_name', source.sourceName || '');
  sbosSetState_('cannibal_review_result_json', JSON.stringify(detail));
  sbosSetState_('status', counts.GREEN || counts.TRY ? 'CANNIBAL_REVIEW_IMPORTED' : SBOS_STATUS.COMPLETE);
  const homeText = counts.GREEN
    ? 'カニバリ精査結果登録済み（GREEN ' + counts.GREEN + '件）'
    : counts.TRY
      ? 'GREEN 0件 / TRY ' + counts.TRY + '件（利用者判断）'
      : 'カニバリ精査完了（GREEN / TRY候補なし）';
  sbosSetHomeStatus_(homeText);
  sbosSaveCurrentBlogSession_();
  return {applied:applied,green:counts.GREEN,tryCount:counts.TRY,yellow:counts.YELLOW,block:counts.BLOCK};
}

function sbosGetCannibalDetail_(keyword) {
  const raw = sbosGetState_('cannibal_review_result_json') || '{}';
  try {
    const obj = JSON.parse(raw);
    return obj[sbosKeywordMatchKey_(keyword)] || null;
  } catch(e) {
    return null;
  }
}

function sbosTryRescueSignalMap_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = sh.getRange(2,1,sh.getLastRow()-1,16).getDisplayValues();
  rows.forEach(r => {
    const key = sbosKeywordMatchKey_(r[3]);
    if (!key) return;
    out[key] = {volume:r[7], trend3m:r[13], trendYoy:r[14], competition:r[9], competitionIndex:r[15]};
  });
  return out;
}

function sbosTryRescuePriority_(candidateRow, metricMap) {
  const kw = String(candidateRow[2] || '').toLowerCase();
  const m = (metricMap || {})[sbosKeywordMatchKey_(candidateRow[2])] || {};
  let score = Number(candidateRow[5] || candidateRow[4] || 0);
  const vol = Number(String(m.volume || '').replace(/,/g,''));
  const idx = Number(String(m.competitionIndex || '').replace(/,/g,''));
  if (isFinite(vol) && vol >= 50 && vol <= 1000) score += 12;
  else if (isFinite(vol) && vol > 0 && vol < 50) score += 3;
  if (sbosParseTrendPercent_(m.trend3m) > 0) score += 5;
  if (sbosParseTrendPercent_(m.trendYoy) > 0) score += 4;
  // Ads競合指数はSEO難易度ではないため、TRY探索の弱い補助Signalに限定。
  if (isFinite(idx) && idx <= 30) score += 4;
  if (/(できない|重い|でかい|ダサい|後悔|比較|違い|できること|使い方|原因|対処|なぜ|いつ|どこ)/.test(kw)) score += 8;
  if (Number(candidateRow[3] || 0) >= 4) score += 3;
  return score;
}

// ============================================================================
// Cannibal Review Package
// ============================================================================
function sbosCreateCannibalReviewPackageFromEvidence(fileId) {
  let stage = '開始';
  try {
    sbosEnsureSheets_();
    stage = 'Evidenceファイル取得';
    const evidenceFile = DriveApp.getFileById(fileId);
    const evidenceName = evidenceFile.getName();
    if (!/\.(zip|csv|tsv|json)$/i.test(evidenceName)) {
      throw new Error('対応していないEvidence形式です: ' + evidenceName);
    }

    stage = 'GREEN候補・TRY救済候補抽出';
    const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
    if (!sh || sh.getLastRow() < 2) throw new Error('Candidatesシートに候補がありません。');
    const vals = sh.getRange(2,1,sh.getLastRow()-1,18).getDisplayValues();
    const greenCandidates = vals.filter(r => r[12] === 'GREEN' && sbosStatusCode_(r[1]) === 'CANNIBAL_PENDING').map(r => ({
      rank:Number(r[17])||0, main_keyword:r[2], words:Number(r[3])||0,
      blue_ocean_score:Number(r[5])||0, search_intent:r[7],
      evidence_summary:r[8], intent_key:r[11], review_mode:'GREEN_FINAL'
    }));
    // v0.12.6: 最終GREENが0件になった場合に備え、SERP YELLOWの上位ロングテールも
    // 同じEvidenceでカニバリ確認しておく。TRYとして出すのは最終GREENが0件の場合だけ。
    const tryMetricMap = sbosTryRescueSignalMap_();
    const rescueCandidates = vals.filter(r => r[12] === 'YELLOW')
      .sort((a,b)=>sbosTryRescuePriority_(b,tryMetricMap)-sbosTryRescuePriority_(a,tryMetricMap))
      .slice(0,5)
      .map(r => ({
        rank:Number(r[17])||0, main_keyword:r[2], words:Number(r[3])||0,
        blue_ocean_score:Number(r[5])||0, search_intent:r[7],
        evidence_summary:r[8], intent_key:r[11], review_mode:'TRY_RESCUE_IF_NO_GREEN',
        demand_metrics:tryMetricMap[sbosKeywordMatchKey_(r[2])] || {}
      }));
    const candidates = greenCandidates.concat(rescueCandidates);
    if (!candidates.length) throw new Error('カニバリ精査できるGREEN候補またはTRY救済候補がありません。');

    stage = '保存先確認';
    const siteName = sbosGetSetting_('site_name') || 'Unknown-Site';
    const siteUrl = sbosGetSetting_('site_url') || '';
    const outFolder = sbosGetOutputFolder_();
    const folder = outFolder.folder;

    stage = '依頼データ作成';
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
    const requestId = 'SBOS-CANNIBAL-' + ts;
    const payload = {
      format:'SIMS_BOS_CANNIBAL_REVIEW_REQUEST_V1', contract_version:'1.0',
      request_id:requestId, created_at:new Date().toISOString(),
      site:{name:siteName,url:siteUrl}, candidate_count:candidates.length,
      evidence_file:{name:evidenceName}, candidates:candidates
    };
    const md = [
      '# Blue Ocean Screener カニバリ精査依頼','',
      '## 目的','',
      'SERP GREEN候補に加え、GREENが最終0件になった場合のTRY救済候補も、対象サイトの既存記事と検索意図を食い合わず新規記事として独立できるか判定してください。review_mode=TRY_RESCUE_IF_NO_GREEN はGREENへ格上げするためではなく、利用者判断で試せる候補のカニバリ安全性確認です。','',
      '## 判定','',
      '- GREEN: 既存記事との役割が明確に分離でき、新規記事として独立可能',
      '- YELLOW: 一部重複。記事境界・内部リンク・担当範囲の設計が必要',
      '- BLOCK: 既存記事と同一または近接Intentで、新規記事化するとカニバリの可能性が高い','',
      '## 必須確認','',
      '- 既存記事タイトルだけでなく、メインクエリ・本文の担当範囲・検索意図を比較する',
      '- 単語が重なるだけではBLOCKにしない',
      '- GREEN/TRY救済候補とも、aCreatorへ渡せる「新記事が担当する範囲」「既存記事へ任せる範囲」「内部リンク候補」を返す',
      '- TRY救済候補は、カニバリがHIGHなら必ずBLOCK相当として扱える根拠を明示する','',
      '## 返却JSON','',
      '`SIMS_BOS_CANNIBAL_REVIEW_RESULT_V1`','',
      '**重要:** 最終JSONは、必ずこのチャット回答本文の末尾へ完全な形でインライン出力してください。BOSではClaudeの回答全文をコピー＆ペーストして登録します。JSONを別ファイルだけに格納・添付して終わらせないでください。','',
      '**重要:** 「上のファイルに格納しました」「JSONファイルを作成しました」だけでは登録できません。ファイルを作る場合でも、同じ完全JSONを回答本文の ```json コードブロックにも必ず再掲してください。','',
      'results[]: main_keyword, decision(GREEN/YELLOW/BLOCK), cannibalization(LOW/MEDIUM/HIGH), matched_articles[], article_scope, existing_article_boundary, internal_link_candidates[], evidence_summary'
    ].join('\n');

    stage = 'Evidence読込';
    const evidenceBlob = evidenceFile.getBlob();
    evidenceBlob.setName(evidenceName);

    stage = 'ZIP生成';
    const blobs = [
      Utilities.newBlob(md,'text/plain','CANNIBAL-REVIEW-REQUEST.md'),
      Utilities.newBlob(JSON.stringify(payload,null,2),'application/json','CANNIBAL_REVIEW_REQUEST_V1.json'),
      evidenceBlob
    ];
    const safeSite = sbosSafeFilePart_(siteName);
    const zipName = 'SIMS-BOS-' + safeSite + '-Claude-Cannibal-Review-' + ts + '.zip';
    const zipBlob = Utilities.zip(blobs, zipName);

    stage = 'Google Drive保存';
    const out = folder.createFile(zipBlob);

    stage = '状態保存';
    sbosSetState_('cannibal_request_id', requestId);
    sbosSetState_('cannibal_package_file_id', out.getId());
    sbosSetHomeStatus_('カニバリ精査Package作成済み');

    // HTMLダイアログから呼ばれるため、ここではSpreadsheet UI alertを開かない。
    return {
      ok:true, count:candidates.length, fileName:zipName,
      evidenceName:evidenceName, folderName:folder.getName(), requestId:requestId
    };
  } catch (e) {
    throw new Error('カニバリ精査Package作成に失敗しました。\n処理段階: ' + stage + '\n詳細: ' + (e && e.message ? e.message : e));
  }
}

// ============================================================================
// Creator Referral
// Source consolidated from: CreatorReferral.gs
// ============================================================================
const SBOS_CREATOR_BATCH_MAX = 10;

function sbosIsCreatorEligibleStatus_(value) {
  const st = sbosStatusCode_(value);
  return st === 'GREEN' || st === 'TRY';
}

function sbosGetCheckedCandidateRows_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(2,1,sh.getLastRow()-1,18).getValues();
  return vals.map((r,i)=>({row:i+2, values:r})).filter(x=>x.values[0] === true);
}

function sbosQueueSelectedCreatorCases() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const selected = sbosGetCheckedCandidateRows_();
  if (!selected.length) throw new Error('CandidatesシートでaCreatorへ送るGREEN候補にチェックを入れてください。');
  if (selected.length > SBOS_CREATOR_BATCH_MAX) throw new Error('1回にaCreator依頼待ちへ登録できるのは最大10件です。現在 ' + selected.length + '件選択されています。');

  selected.forEach(x=>{
    if (!sbosIsCreatorEligibleStatus_(x.values[1])) throw new Error('GREEN / TRY以外の候補が含まれています: ' + x.values[2]);
    const state=String(x.values[10]||'');
    if (state === 'SIMS Manager登録済み') throw new Error('SIMS Manager登録済み案件が含まれています: ' + x.values[2]);
  });
  selected.forEach(x=>{
    sh.getRange(x.row,11).setValue('依頼待ち');
    sh.getRange(x.row,1).setValue(false);
  });
  sbosApplyCandidateFormatting_();
  sbosSaveCurrentBlogSession_();
  sbosShowWorkflowResult_(
    'aCreator依頼待ちへ登録しました',
    '<b>登録:</b> '+selected.length+'件<br><br>案件は保存されています。今日すべて処理する必要はありません。次回はCandidatesで「依頼待ち」の案件をチェックし、「6. GREEN / TRY候補をaCreatorで処理」から続けられます。',
    '7. 候補・進捗を確認',
    'sbosOpenCandidates'
  );
}

function sbosShowSelectedCreatorReferrals() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const selected = sbosGetCheckedCandidateRows_();
  if (!selected.length) throw new Error('Candidatesシートで表示するaCreator依頼待ち案件にチェックを入れてください。');
  if (selected.length > SBOS_CREATOR_BATCH_MAX) throw new Error('一度に表示できるaCreator依頼は最大10件です。');

  selected.forEach(x=>{
    if (!sbosIsCreatorEligibleStatus_(x.values[1])) throw new Error('GREEN / TRY以外の候補が含まれています: '+x.values[2]);
    if (!['依頼待ち','作成済み'].includes(String(x.values[10]||''))) throw new Error('aCreator依頼待ちへの登録が必要です: '+x.values[2]);
  });

  const parts=selected.map((x,i)=>[
    '============================================================',
    'CASE '+(i+1)+' / '+selected.length,
    '============================================================',
    sbosBuildCreatorReferral_(x.values)
  ].join('\n'));
  const text=parts.join('\n\n');

  const html = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><style>body{font-family:Arial;margin:0;color:#202124}.wrap{padding:18px}textarea{width:100%;height:390px;box-sizing:border-box;padding:10px;border:1px solid #dadce0;border-radius:6px;font-size:12px;line-height:1.45}.foot{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}button{border:0;border-radius:6px;padding:9px 14px;font-weight:600}.p{background:#1a73e8;color:#fff}.s{background:#f1f3f4}</style></head><body><div class="wrap"><h2>aCreator依頼文 '+selected.length+'件</h2><p>各CASEは独立案件です。必要なCASEだけaCreatorで処理しても構いません。</p><textarea id="t">'+sbosEscapeHtml_(text)+'</textarea><div class="foot"><button class="p" onclick="copy()">全文をコピー</button><button class="p" onclick="done()">選択案件をaCreator処置済みにする</button><button class="s" onclick="google.script.host.close()">閉じる</button></div></div><script>async function copy(){const t=document.getElementById("t");try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}}function done(){google.script.run.withSuccessHandler(()=>google.script.host.close()).withFailureHandler(e=>alert(e.message||e)).sbosMarkSelectedCreatorCasesDone();}</script></body></html>'
  ).setWidth(820).setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html,'6. aCreator依頼文を表示する');
}

function sbosMarkSelectedCreatorCasesDoneFromMenu() {
  const selected = sbosGetCheckedCandidateRows_();
  if (!selected.length) throw new Error('CandidatesシートでaCreator処置が完了した案件にチェックを入れてください。');
  if (selected.length > SBOS_CREATOR_BATCH_MAX) throw new Error('一度にaCreator処置済みにできるのは最大10件です。');
  selected.forEach(x => {
    if (!sbosIsCreatorEligibleStatus_(x.values[1])) throw new Error('GREEN / TRY以外の候補が含まれています: ' + x.values[2]);
    if (String(x.values[10] || '') !== '依頼待ち') throw new Error('aCreator依頼キューに入っていない案件が含まれています: ' + x.values[2]);
  });
  const r = sbosMarkSelectedCreatorCasesDone();
  sbosShowWorkflowResult_(
    'aCreator処置済みとして記録しました',
    '<b>処置済み:</b> ' + r.done + '件<br><br>HomeのaCreator依頼キューから減算し、aCreator処置済みへ反映しました。',
    '7. 候補・進捗を確認',
    'sbosOpenCandidates'
  );
  return r;
}

function sbosMarkSelectedCreatorCasesDone() {
  const sh=SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const selected=sbosGetCheckedCandidateRows_();
  selected.forEach(x=>{
    if (String(x.values[10]||'')==='依頼待ち') sh.getRange(x.row,11).setValue('作成済み');
    sh.getRange(x.row,1).setValue(false);
  });
  sbosApplyCandidateFormatting_();
  sbosSaveCurrentBlogSession_();
  return {done:selected.length};
}

// Compatibility entry point.
function sbosCreateCreatorReferral() {
  return sbosShowSelectedCreatorReferrals();
}

function sbosBuildCreatorReferral_(v) {
  const d = sbosGetCannibalDetail_(v[2]) || {};
  const matched = Array.isArray(d.matched_articles) ? d.matched_articles : [];
  const links = Array.isArray(d.internal_link_candidates) ? d.internal_link_candidates : [];
  const matchedText = matched.length ? matched.map(x => {
    if (typeof x === 'string') return '- ' + x;
    return '- ' + (x.url || '') + (x.role ? ' — ' + x.role : '');
  }).join('\n') : '- 直接競合する既存記事なし';
  const linkText = links.length ? links.map(x => '- ' + x).join('\n') : '- 必須候補なし';

  const isTry = sbosStatusCode_(v[1]) === 'TRY';
  const tryRisk = isTry ? [
    '## TRY案件について（重要）',
    'この案件は通常のGREENではありません。最終GREENが0件だったため、カニバリ確認を通過したロングテールから利用者判断で試す実験候補として選ばれました。',
    '上位表示は保証されません。検索需要が小さい、SERP競争が強い、需要データが不十分・変動する等のリスクがあります。検索意図を広げず、このロングテール固有の疑問へ深く答えてください。',''
  ] : [];
  return [
    '# aCreator 新記事作成依頼','',
    '## メインキーワード', v[2],'',
    '## キーワード構成', v[3] + '語ロングテール','',
    '## Blue Ocean Score', v[5],'',
    '## 最終判定', v[1] + ' / Cannibalization: ' + v[6],'',
    '## 検索意図', v[7],'',
    '## Blue Ocean / Cannibal Evidence', v[8],'',
    '## 新記事が担当する範囲',
    d.article_scope || 'このキーワード固有の検索意図に限定して新規記事として独立させてください.','',
    '## 既存記事との検索意図の境界',
    d.existing_article_boundary || '既存記事の担当検索意図を侵食しないでください.','',
    '## 近接する既存記事', matchedText,'',
    '## 内部リンク候補', linkText,'',
    '## カニバリ防止条件',
    '上記の担当境界を守り、既存記事が担当する検索意図を奪わないでください。重複する一般説明は必要最小限とし、近接記事とは内部リンクで役割分担してください。','',
    '## 事実確認',
    '仕様・不具合・手順・価格・発売状況などは執筆時点の一次情報を優先してWeb確認し、未確認情報を断定しないでください。','',
    '## aCreatorへの指示',
    'これは新規記事作成案件です。既存記事のリライト案件として処理しないでください。'
  ].concat(tryRisk).join('\n');
}


function sbosGetCreatorResponseMap_() {
  const raw = sbosGetState_('creator_response_json') || '{}';
  try { return JSON.parse(raw) || {}; } catch(e) { return {}; }
}
function sbosGetCreatorResponse_(keyword) {
  return sbosGetCreatorResponseMap_()[sbosKeywordMatchKey_(keyword)] || null;
}
function sbosSaveCreatorResponse_(keyword, responseText) {
  const m = sbosGetCreatorResponseMap_();
  m[sbosKeywordMatchKey_(keyword)] = {response:String(responseText||''), saved_at:sbosNow_()};
  sbosSetState_('creator_response_json', JSON.stringify(m));
}
function sbosFindCandidateRowByKeyword_(keyword) {
  const sh=SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  if(!sh||sh.getLastRow()<2)return null;
  const vals=sh.getRange(2,1,sh.getLastRow()-1,18).getValues(), key=sbosKeywordMatchKey_(keyword);
  for(let i=0;i<vals.length;i++) if(sbosKeywordMatchKey_(vals[i][2])===key) return {row:i+2,values:vals[i]};
  return null;
}
function sbosSaveCreatorResponseFromDialog(keyword,responseText) {
  const h=sbosFindCandidateRowByKeyword_(keyword);
  if(!h)throw new Error('対象候補が見つかりません。');
  if(!sbosIsCreatorEligibleStatus_(h.values[1]))throw new Error('aCreator処理はGREEN / TRY候補のみ対象です。');
  const t=String(responseText||'').trim(); if(!t)throw new Error('aCreator回答全文を貼り付けてください。');
  const sh=SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  sbosSaveCreatorResponse_(keyword,t); sh.getRange(h.row,11).setValue('作成済み'); sh.getRange(h.row,1).setValue(false);
  sbosApplyCandidateFormatting_(); sbosSaveCurrentBlogSession_();
  return {ok:true,state:'作成済み'};
}
function sbosRegisterSbmResultFromCreatorDialog(keyword,articleId,publicUrl) {
  const h=sbosFindCandidateRowByKeyword_(keyword);
  if(!h)throw new Error('対象候補が見つかりません。');
  if(!sbosIsCreatorEligibleStatus_(h.values[1]))throw new Error('SIMS Manager登録はGREEN / TRY候補のみ対象です。');
  const cs=String(h.values[10]||'');
  if(cs!=='作成済み'&&cs!=='SIMS Manager登録済み')throw new Error('先にaCreator回答を登録してください。');
  const aid=String(articleId||'').trim(); if(!aid)throw new Error('SIMS Manager Article IDを入力してください。');
  const url=String(publicUrl||'').trim(), sh=SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  sh.getRange(h.row,11).setValue('SIMS Manager登録済み'); sh.getRange(h.row,14).setValue(aid); sh.getRange(h.row,15).setValue(url); sh.getRange(h.row,16).setValue('MONITORING'); sh.getRange(h.row,17).setValue(sbosNow_()); sh.getRange(h.row,1).setValue(false);
  sbosSetHomeStatus_('SIMS Manager登録済み: '+aid); sbosApplyCandidateFormatting_(); sbosSaveCurrentBlogSession_();
  return {ok:true,articleId:aid,url:url};
}
function sbosShowCreatorWorkflowDialog() {
  sbosEnsureSheets_();
  if (sbosIsNewSiteMode_()) {
    SpreadsheetApp.getUi().alert('新規サイト探索モードはGREENキーワードの発見までです', 'このモードではaCreator処理を行いません。GREEN候補を確認して、新規サイト設計に利用してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const s=sbosGetCheckedCandidateRows_();
  if(!s.length)throw new Error('CandidatesでaCreator処理するGREEN / TRY候補を1件チェックしてください。');
  if(s.length!==1)throw new Error('aCreator処理は1件ずつ行います。チェックは1件だけにしてください。');
  const x=s[0];
  if(!sbosIsCreatorEligibleStatus_(x.values[1]))throw new Error('aCreator処理はGREEN / TRY候補のみ対象です。');
  const kw=String(x.values[2]||''), sh=SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  let cs=String(x.values[10]||'');
  if(!cs||cs==='未作成'){sh.getRange(x.row,11).setValue('依頼待ち');cs='依頼待ち';sbosSaveCurrentBlogSession_();}
  const ref=sbosBuildCreatorReferral_(x.values), saved=sbosGetCreatorResponse_(kw), resp=saved&&saved.response?saved.response:'', aid=String(x.values[13]||''), url=String(x.values[14]||'');
  const html=HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><style>body{font-family:Arial;margin:0;color:#202124}.w{padding:18px}.t{font-size:20px;font-weight:700}.m{background:#e8f0fe;padding:10px;border-radius:8px;line-height:1.55;margin-top:8px}.b{border:1px solid #dadce0;border-radius:8px;padding:12px;margin-top:12px}.l{font-weight:700;margin-bottom:7px}textarea{width:100%;box-sizing:border-box;border:1px solid #dadce0;border-radius:7px;padding:10px;font-family:monospace;font-size:12px}#ref{height:205px}#ans{height:180px}input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #dadce0;border-radius:6px;margin:4px 0 8px}.a{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}button{border:0;border-radius:6px;padding:9px 14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.p{background:#1a73e8;color:white}.s{background:#f1f3f4}.sp{display:none;width:14px;height:14px;border:2px solid rgba(255,255,255,.45);border-top-color:white;border-radius:50%;animation:r .75s linear infinite}.working .sp{display:inline-block}@keyframes r{to{transform:rotate(360deg)}}.st{background:#f8fafd;padding:8px;border-radius:6px;margin-top:7px;font-size:12px;white-space:pre-wrap}</style></head><body><div class="w"><div class="t">6. GREEN / TRY候補をaCreator処理</div><div class="m"><b>キーワード:</b> '+sbosEscapeHtml_(kw)+'<br><b>Score:</b> '+sbosEscapeHtml_(x.values[5])+' / <b>カニバリ:</b> '+sbosEscapeHtml_(x.values[6])+'<br><b>状態:</b> '+sbosEscapeHtml_(cs)+'</div>' +
    '<div class="b"><div class="l">① aCreator依頼文</div><textarea id="ref" readonly>'+sbosEscapeHtml_(ref)+'</textarea><div class="a"><button class="p" onclick="copyRef(this)"><span class="sp"></span><span class="tx">依頼文をコピー</span></button></div></div>' +
    '<div class="b"><div class="l">② aCreator回答全文</div><textarea id="ans" placeholder="aCreator回答全文を貼り付け">'+sbosEscapeHtml_(resp)+'</textarea><div id="cst" class="st">'+(resp?'保存済みのaCreator回答があります。':'回答待ち')+'</div><div class="a"><button class="p" onclick="saveC(this)"><span class="sp"></span><span class="tx">aCreator回答を登録</span></button></div></div>' +
    '<div class="b"><div class="l">③ SIMS Manager登録結果</div><input id="aid" placeholder="Article ID 例: A900001" value="'+sbosEscapeHtml_(aid)+'"><input id="url" placeholder="公開URL（未確定なら空欄可）" value="'+sbosEscapeHtml_(url)+'"><div id="sst" class="st">'+(aid?'SIMS Manager登録済み: '+sbosEscapeHtml_(aid):'aCreator処理後、SIMS Managerへ登録した結果をここで記録します。')+'</div><div class="a"><button class="s" onclick="google.script.host.close()">閉じる</button><button class="p" onclick="saveS(this)"><span class="sp"></span><span class="tx">SIMS Manager登録結果を記録</span></button></div></div>' +
    '<script>const kw='+JSON.stringify(kw)+';function w(b,on,x){const t=b.querySelector(".tx");if(on){b.dataset.o=t.textContent;t.textContent=x||"処理中…";b.classList.add("working");b.disabled=true}else{t.textContent=b.dataset.o||"実行";b.classList.remove("working");b.disabled=false}}async function copyRef(b){w(b,true,"コピー中…");const t=document.getElementById("ref");try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}w(b,false)}function saveC(b){const t=document.getElementById("ans").value;if(!t.trim()){document.getElementById("cst").textContent="aCreator回答全文を貼り付けてください。";return;}w(b,true,"処理中…");document.getElementById("cst").textContent="登録しています…";google.script.run.withSuccessHandler(r=>{w(b,false);document.getElementById("cst").textContent="aCreator回答を登録しました。状態: "+r.state}).withFailureHandler(e=>{w(b,false);document.getElementById("cst").textContent="エラー: "+(e&&e.message?e.message:e)}).sbosSaveCreatorResponseFromDialog(kw,t)}function saveS(b){w(b,true,"処理中…");document.getElementById("sst").textContent="記録しています…";google.script.run.withSuccessHandler(r=>{w(b,false);document.getElementById("sst").textContent="SIMS Manager登録済み: "+r.articleId}).withFailureHandler(e=>{w(b,false);document.getElementById("sst").textContent="エラー: "+(e&&e.message?e.message:e)}).sbosRegisterSbmResultFromCreatorDialog(kw,document.getElementById("aid").value,document.getElementById("url").value)}</script></div></body></html>'
  ).setWidth(820).setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html,'6. GREEN / TRY候補をaCreator処理');
}

/**
 * SIMS共通の完了・状態ダイアログ。
 * 「結果概要 → 次工程の青ボタン → 閉じる」を全工程で統一する。
 */
function sbosShowWorkflowResult_(title, bodyHtml, primaryLabel, primaryFunction) {
  const safeTitle = sbosEscapeHtml_(title || '処理完了');
  const fn = String(primaryFunction || '').replace(/[^A-Za-z0-9_]/g, '');
  const label = sbosEscapeHtml_(primaryLabel || '次へ');
  const html = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;color:#202124;background:#fff}' +
    '.wrap{padding:20px}.head{font-size:18px;font-weight:700;margin-bottom:12px}' +
    '.box{background:#e6f4ea;border:1px solid #ceead6;border-radius:8px;padding:14px;line-height:1.7}' +
    '.foot{display:flex;justify-content:flex-end;gap:10px;padding-top:18px}' +
    'button{border:0;border-radius:6px;padding:9px 16px;font-weight:600;cursor:pointer}' +
    '.primary{background:#1a73e8;color:#fff}.secondary{background:#f1f3f4;color:#3c4043}' +
    '.spin{display:none;margin-right:auto;align-items:center;gap:8px;color:#5f6368;font-size:12px}' +
    '.spinner{width:16px;height:16px;border:2px solid #dadce0;border-top-color:#1a73e8;border-radius:50%;animation:r .8s linear infinite}@keyframes r{to{transform:rotate(360deg)}}' +
    '</style></head><body><div class="wrap"><div class="head">' + safeTitle + '</div>' +
    '<div class="box">' + bodyHtml + '</div><div class="foot"><div id="spin" class="spin"><span class="spinner"></span>処理中…</div>' +
    (fn ? '<button class="primary" onclick="nextStep()">' + label + '</button>' : '') +
    '<button class="secondary" onclick="google.script.host.close()">閉じる</button></div></div>' +
    '<script>function nextStep(){document.getElementById("spin").style.display="flex";google.script.run.withSuccessHandler(function(){google.script.host.close();}).withFailureHandler(function(e){document.getElementById("spin").style.display="none";alert(e&&e.message?e.message:e);}).' + fn + '();}</script>' +
    '</body></html>'
  ).setWidth(640).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, title || '処理完了');
}


function sbosRegisterSbmArticleResult() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const selected = sbosGetCheckedCandidateRows_();

  if (!selected.length) {
    SpreadsheetApp.getUi().alert('Candidatesシートで、SIMS Manager登録結果を記録するGREEN / TRY候補にチェックを入れてください。');
    return;
  }
  if (selected.length !== 1) {
    SpreadsheetApp.getUi().alert('SIMS Manager登録結果の記録はArticle ID・URLが案件ごとに異なるため、1回につき1件だけチェックしてください。');
    return;
  }

  const row = selected[0].row;
  const v = selected[0].values;
  if (!sbosIsCreatorEligibleStatus_(v[1])) {
    SpreadsheetApp.getUi().alert('SIMS Manager登録結果はGREEN / TRY候補に記録してください。現在の判定: ' + v[1]);
    return;
  }
  if (String(v[10] || '') !== '作成済み') {
    SpreadsheetApp.getUi().alert('先にaCreator処置を完了してください。現在のaCreator状態: ' + String(v[10] || '未作成'));
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const aid = ui.prompt('6. SIMS Manager登録結果を記録する', 'SIMS Managerで発行されたArticle ID（例: A900001）を入力してください。', ui.ButtonSet.OK_CANCEL);
  if (aid.getSelectedButton() !== ui.Button.OK) return;
  const articleId = aid.getResponseText().trim();
  if (!articleId) return;

  const urlr = ui.prompt('6. SIMS Manager登録結果を記録する', '公開URLを入力してください。まだ未確定なら空欄のままOKを押してください。', ui.ButtonSet.OK_CANCEL);
  if (urlr.getSelectedButton() !== ui.Button.OK) return;
  const url = urlr.getResponseText().trim();

  sh.getRange(row,11).setValue('SIMS Manager登録済み');
  sh.getRange(row,14).setValue(articleId);
  sh.getRange(row,15).setValue(url);
  sh.getRange(row,16).setValue('MONITORING');
  sh.getRange(row,17).setValue(sbosNow_());
  sh.getRange(row,1).setValue(false);

  sbosSetState_('last_sbm_link_article_id', articleId);
  sbosSetHomeStatus_('SIMS Manager登録済み: ' + articleId);
  sbosApplyCandidateFormatting_();
  sbosSaveCurrentBlogSession_();

  sbosShowWorkflowResult_(
    'SIMS Manager登録結果をBOSへ記録しました',
    '<b>Article ID:</b> ' + sbosEscapeHtml_(articleId) + '<br>' +
    '<b>BOS記録:</b> SIMS Manager登録済み<br>' +
    (url ? '<b>公開URL:</b> ' + sbosEscapeHtml_(url) + '<br>' : '') +
    '<br>Homeとサイト切替ダイアログの進捗も更新しました。',
    '7. 候補・進捗を確認',
    'sbosOpenCandidates'
  );
}

// ============================================================================
// Batch / State
// Source consolidated from: BatchRunner.gs
// ============================================================================
function sbosResumeBatch() {
  const status = sbosGetState_('status') || '未実行';
  if (status === SBOS_STATUS.IMPORT_DONE || status === SBOS_STATUS.SCREENING_RUNNING) {
    const meta = sbosStartScreeningFromDialog();
    sbosShowScreeningResult_(meta);
    return;
  }
  sbosShowWorkflowResult_(
    '処理状態',
    '<b>現在の状態:</b> ' + sbosEscapeHtml_(status) + '<br><br>' +
    'Claude SERP回答を貼り付け・登録した後、SERP GREEN候補はカニバリ精査待ちになります。',
    '',
    ''
  );
}

function sbosSetState_(key, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.STATE);
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('SBOS_' + key, String(value));
  if (sh.getLastRow() === 0) sh.getRange('A1:B1').setValues([['Key','Value']]);
  const last = Math.max(1, sh.getLastRow());
  const vals = last > 1 ? sh.getRange(2,1,last-1,2).getDisplayValues() : [];
  const i = vals.findIndex(r => r[0] === key);
  if (i >= 0) sh.getRange(i + 2, 2).setValue(String(value));
  else sh.appendRow([key, String(value)]);
}

function sbosGetState_(key) {
  return PropertiesService.getDocumentProperties().getProperty('SBOS_' + key);
}

function sbosShowStatus() {
  const s = sbosGetState_('status') || '未実行';
  sbosShowWorkflowResult_(
    '処理状態',
    '<b>現在の状態:</b> ' + sbosEscapeHtml_(s),
    '',
    ''
  );
}

// ============================================================================
// Sheets
// Source consolidated from: Sheets.gs
// ============================================================================
function sbosReinitializeUiManual() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '画面・シートを再初期化しますか？',
    'Homeを現在版のダッシュボード表示へ作り直し、Keywords・Candidatesの表示も整えます。データ内容は削除しません。',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) return;

  // v0.9.10:
  // sbosEnsureSheets_() だけでは A1 が製品名の場合 Home 再構築を省略するため、
  // 旧レイアウトのセル値・書式が残ることがあった。
  // 保守用再初期化では Home を明示的に force=true で再構築する。
  sbosEnsureSheets_();
  sbosEnsureLightweightHome_(true);
  sbosRefreshHomeSummary_();
  sbosApplyCandidateFormatting_();
  sbosApplyUserVisibleSheets_();

  const home = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.HOME);
  if (home) SpreadsheetApp.getActive().setActiveSheet(home);

  SpreadsheetApp.flush();
  ui.alert(
    '画面・シートの再初期化が完了しました。',
    'HomeをVersion ' + SBOS_VERSION + 'のレイアウトへ更新しました。Keywords・Candidatesのデータは保持しています。',
    ui.ButtonSet.OK
  );
}


function sbosEnsureSheets_() {
  const ss = SpreadsheetApp.getActive();
  const defs = [
    [SBOS_SHEETS.HOME, false],
    [SBOS_SHEETS.KEYWORDS, false],
    [SBOS_SHEETS.CANDIDATES, false],
    [SBOS_SHEETS.SETTINGS, true],
    [SBOS_SHEETS.STATE, true],
    [SBOS_SHEETS.ARTICLES, true],
    [SBOS_SHEETS.SERP_RESULTS, true],
    [SBOS_SHEETS.BLOG_SESSIONS, true],
    [SBOS_SHEETS.SESSION_KEYWORDS, true],
    [SBOS_SHEETS.SESSION_CANDIDATES, true],
    [SBOS_SHEETS.SESSION_SETTINGS, true],
    [SBOS_SHEETS.SESSION_STATE, true],
    [SBOS_SHEETS.SESSION_SERP, true]
  ];
  defs.forEach(([name, hidden]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (hidden && !sh.isSheetHidden()) sh.hideSheet();
    if (!hidden && sh.isSheetHidden()) sh.showSheet();
  });

  sbosTidyDefaultSheets_();
  sbosInitBlogSessionsSheet_();
  sbosSessionStoreNames_().forEach(sbosInitSessionStoreSheet_);
  sbosInitSettings_();
  sbosInitKeywords_();
  sbosInitCandidates_();
  // Homeは毎操作ごとに全面再構築しない。既存レイアウトを維持して値だけ更新する。
  sbosEnsureLightweightHome_();
  sbosRefreshHomeSummary_();
  sbosApplyUserVisibleSheets_();

  const home = ss.getSheetByName(SBOS_SHEETS.HOME);
  if (home && ss.getSheets()[0].getSheetId() !== home.getSheetId()) {
    ss.setActiveSheet(home);
    ss.moveActiveSheet(1);
  }
}

function sbosApplyUserVisibleSheets_() {
  const ss = SpreadsheetApp.getActive();
  const visible = new Set([SBOS_SHEETS.HOME, SBOS_SHEETS.KEYWORDS, SBOS_SHEETS.CANDIDATES]);

  // v0.9.5: 復旧時に作成したArchive系シートも含め、
  // Home / Keywords / Candidates 以外はすべて内部シートとして非表示に固定する。
  ss.getSheets().forEach(sh => {
    const shouldShow = visible.has(sh.getName());
    try {
      if (shouldShow) {
        if (sh.isSheetHidden()) sh.showSheet();
      } else {
        if (!sh.isSheetHidden()) sh.hideSheet();
      }
    } catch(e) {}
  });

  // 念のため利用者向け3シートが先頭に並ぶよう整える。
  [SBOS_SHEETS.HOME, SBOS_SHEETS.KEYWORDS, SBOS_SHEETS.CANDIDATES].forEach((name, i) => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    try {
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(i + 1);
    } catch(e) {}
  });
  const home = ss.getSheetByName(SBOS_SHEETS.HOME);
  if (home) ss.setActiveSheet(home);
}

function sbosInitHome_() {
  sbosEnsureLightweightHome_(true);
  sbosRefreshHomeSummary_();
}

function sbosEnsureLightweightHome_(force) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.HOME);
  if (!sh) return;

  const signature = String(sh.getRange('A1').getDisplayValue() || '');
  const needsBuild = force || signature !== SBOS_PRODUCT_NAME;

  if (needsBuild) {
    // v0.9.9: 結合セルなし。情報が見切れない10列ダッシュボード。
    sh.getRange('A1:Z60').clearContent().clearFormat();
    sh.setHiddenGridlines(true);
    sh.setFrozenRows(3);
    sh.setTabColor('#1a73e8');

    const rows = [
      [SBOS_PRODUCT_NAME,'','','Version '+SBOS_VERSION,'','','','','',''],
      ['対象サイト','','','URL','','','','','',''],
      ['入力ファイル','','','現在の状態','','','','','',''],
      ['キーワード探索','','','','','','','','',''],
      ['総キーワード',0,'3語候補',0,'既存4語',0,'生成4語',0,'',''],
      ['現在の候補状況','','','','','','','','',''],
      ['SERP精査待ち',0,'カニバリ精査待ち',0,'GREEN',0,'aCreator依頼可能',0,'',''],
      ['最終判定','','','','','','','','',''],
      ['GREEN',0,'TRY',0,'YELLOW',0,'BLOCK',0,'',''],
      ['GREEN / TRY案件の進捗','','','','','','','','',''],
      ['未依頼',0,'aCreator依頼キュー',0,'aCreator処置済み',0,'SIMS Manager登録済み',0,'',''],
      ['標準フロー','','','','','','','','',''],
      ['1 対象サイト設定','2 キーワード読込','3 候補探索','4 SERP精査','5 カニバリ精査','6 aCreator処理','7 候補・進捗確認','','',''],
      ['','','','','','','','','',''],
      ['','','','','','','','','',''],
      ['色の見方','','','','','','','','',''],
      ['GREEN：新記事作成を推奨','','TRY：GREEN 0件時の利用者判断による実験候補','','YELLOW：追加確認・保留','','BLOCK：現状では狙わない','','',''],
      ['','','','','','','','','',''],
      ['メモ','','','','','','','','',''],
      ['・各ステップの詳細は上部メニューから実行してください。','','','','','','','','',''],
      ['・サイト切替時は Keywords・Candidates・SERP結果・aCreator/SIMS Manager進捗を自動保存し、再開時に復元します。','','','','','','','','',''],
      ['・TRYはGREENではありません。カニバリ確認済みでも、需要・SERP競争等の不確実性を理解した上で利用者判断で試す候補です。','','','','','','','','','']
    ];
    if (sbosIsNewSiteMode_()) {
      rows[1] = ['モード','','','対象サイト','','','','','',''];
      rows[5] = ['現在の候補状況','','','','','','','','',''];
      rows[6] = ['SERP精査待ち',0,'新規サイト適性評価',0,'最終GREEN',0,'評価済み',0,'',''];
      rows[7] = ['最終判定','','','','','','','','',''];
      rows[8] = ['GREEN',0,'YELLOW',0,'BLOCK',0,'評価済み',0,'',''];
      rows[9] = ['新規サイト探索の進捗','','','','','','','','',''];
      rows[10] = ['キーワード読込',0,'SERP精査待ち',0,'最終GREEN',0,'カニバリ','実施しない','',''];
      rows[11] = ['新規サイト用フロー','','','','','','','','',''];
      rows[12] = ['1 新規サイト探索開始','2 キーワード読込','3 候補探索','4 SERP・適性精査','5 GREEN候補確認','','','','',''];
      rows[15] = ['判定の見方','','','','','','','','',''];
      rows[16] = ['GREEN：新規サイトの初期クラスター候補','','YELLOW：追加確認・保留','','BLOCK：新規サイトの核として弱い','','','','',''];
      rows[18] = ['新規サイト探索メモ','','','','','','','','',''];
      rows[19] = ['・対象サイト指定、カニバリ精査、TRY救済、aCreator処理はこのモードでは使用しません。','','','','','','','','',''];
      rows[20] = ['・GREENはBlue Ocean Score、新規サイト適性、クラスター形成力、リスクの品質ゲートで最終確定します。','','','','','','','','',''];
      rows[21] = ['・GREEN候補を、新規サイトのテーマ設計・初期記事クラスター作成に利用します。','','','','','','','','',''];
    }
    sh.getRange(1,1,rows.length,10).setValues(rows);
  }

  // ---- 全体 ----
  sh.setHiddenGridlines(true);
  sh.setFrozenRows(3);
  sh.setTabColor('#1a73e8');
  sh.getRange('A1:J26').setFontFamily('Arial').setVerticalAlignment('middle');

  // 幅：画面上の情報密度と見切れ防止のバランス
  const widths = {
    1:190, 2:125, 3:160, 4:125, 5:175,
    6:125, 7:185, 8:125, 9:40, 10:40
  };
  Object.keys(widths).forEach(c => sh.setColumnWidth(Number(c), widths[c]));

  // 行高
  sh.setRowHeight(1,46);
  sh.setRowHeight(2,34);
  sh.setRowHeight(3,42);
  [4,6,8,10,12,16,19].forEach(r => sh.setRowHeight(r,28));
  [5,7,9,11].forEach(r => sh.setRowHeight(r,38));
  sh.setRowHeight(13,52);
  sh.setRowHeight(14,40);
  sh.setRowHeight(17,48);
  [20,21,22].forEach(r => sh.setRowHeight(r,30));

  // タイトル：B/Cを空け、A1の文字が自然にオーバーフローするようにする
  sh.getRange('A1').setFontSize(24).setFontWeight('bold').setFontColor('#174ea6');
  sh.getRange('D1').setFontSize(11).setFontWeight('bold').setFontColor('#3c4043');
  sh.getRange('A1:J1').setBackground('#eaf2ff')
    .setBorder(false,false,true,false,false,false,'#c7d7f4',SpreadsheetApp.BorderStyle.SOLID);

  // 基本情報。値は空セルへオーバーフローできるよう隣接セルを空欄維持
  sh.getRange('A2:A3').setFontWeight('bold').setBackground('#f8fafd');
  sh.getRange('D2:D3').setFontWeight('bold').setBackground('#f8fafd');
  sh.getRange('B2:C3').setBackground('#fffbea');
  sh.getRange('E2:J3').setBackground('#ffffff');
  sh.getRange('B2').setFontWeight('bold');
  sh.getRange('E2').setFontColor('#1155cc').setFontWeight('bold');
  sh.getRange('E3').setFontColor('#174ea6').setFontWeight('bold');
  sh.getRange('B2:C3').setWrap(true);
  sh.getRange('E2:J3').setWrap(true);

  // セクション見出し
  [4,6,8,10,12,16,19].forEach(r => {
    sh.getRange(r,1,1,10)
      .setBackground('#e8f0fe')
      .setFontWeight('bold')
      .setFontColor('#174ea6')
      .setFontSize(11)
      .setBorder(false,false,true,false,false,false,'#c7d7f4',SpreadsheetApp.BorderStyle.SOLID);
  });

  // 指標カード
  [5,7,9,11].forEach(r => {
    sh.getRange(r,1,1,8)
      .setBorder(true,true,true,true,true,true,'#dadce0',SpreadsheetApp.BorderStyle.SOLID);
    [1,3,5,7].forEach(c => sh.getRange(r,c).setFontWeight('bold').setFontSize(10));
    [2,4,6,8].forEach(c => sh.getRange(r,c)
      .setFontWeight('bold').setFontSize(17).setHorizontalAlignment('center'));
  });

  sh.getRange('A5:H5').setBackground('#f8fbff');
  sh.getRange('A7:B7').setBackground('#f3f0ff');
  sh.getRange('C7:D7').setBackground('#fff8e1');
  sh.getRange('E7:F7').setBackground('#e6f4ea');
  sh.getRange('G7:H7').setBackground('#e8f7fa');

  sh.getRange('A9:B9').setBackground('#e6f4ea');
  sh.getRange('C9:D9').setBackground('#fff4cc');
  sh.getRange('E9:F9').setBackground('#fde8e7');
  sh.getRange('G9:H9').setBackground('#f3e8fd');

  sh.getRange('A11:B11').setBackground('#fff1e0');
  sh.getRange('C11:D11').setBackground('#fff4cc');
  sh.getRange('E11:F11').setBackground('#ece7ff');
  sh.getRange('G11:H11').setBackground('#e1f3f1');

  // 標準フロー：1～8を1行、9～12を2行目
  sh.getRange('A13:H13')
    .setBackground('#f6f9ff')
    .setFontWeight('bold').setFontColor('#174ea6')
    .setHorizontalAlignment('center').setWrap(true)
    .setBorder(true,true,true,true,true,true,'#d2e3fc',SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('A14:D14')
    .setBackground('#f8fbff')
    .setFontWeight('bold').setFontColor('#174ea6')
    .setHorizontalAlignment('center').setWrap(true)
    .setBorder(true,true,true,true,true,true,'#d2e3fc',SpreadsheetApp.BorderStyle.SOLID);

  // 色の見方
  sh.getRange('A17:B17').setBackground('#e6f4ea').setFontColor('#137333').setFontWeight('bold');
  sh.getRange('C17:D17').setBackground('#fff4cc').setFontColor('#b06000').setFontWeight('bold');
  sh.getRange('E17:F17').setBackground('#fde8e7').setFontColor('#c5221f').setFontWeight('bold');
  sh.getRange('G17:H17').setBackground('#f3e8fd').setFontColor('#8430a6').setFontWeight('bold');
  sh.getRange('A17:H17').setWrap(true)
    .setBorder(true,true,true,true,true,true,'#dadce0',SpreadsheetApp.BorderStyle.SOLID);

  // メモ。文章はA列のみだがB:Jを空欄にして自然に横へ表示させる
  sh.getRange('A20:J22').setBackground('#f8fbff').setFontSize(10);
  sh.getRange('A20:J22').setBorder(true,true,true,true,false,false,'#d2e3fc',SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('A20:A22').setWrap(false);

  // 空白行は完全に白
  [15,18].forEach(r => sh.getRange(r,1,1,10).clearFormat().setBackground('#ffffff'));

  sh.getRange('D1').setValue('Version ' + SBOS_VERSION);
}
function sbosHomeCard_(sh, labelRange, valueRange, label, bg) {
  sh.getRange(labelRange).merge().setValue(label)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center')
    .setBackground(bg).setFontColor('#3c4043');
  sh.getRange(valueRange).merge().setValue(0)
    .setFontWeight('bold').setFontSize(18).setHorizontalAlignment('center')
    .setBackground('#ffffff').setFontColor('#202124')
    .setBorder(true,true,true,true,false,false,'#dadce0',SpreadsheetApp.BorderStyle.SOLID);
}


function sbosInitSettings_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.SETTINGS);
  if (!(sh.getLastRow() > 0 && sh.getRange('A1').getValue())) {
    sh.clear();
    sh.getRange('A1:B1').setValues([['Setting', 'Value']]);
    sh.getRange('A1:B1').setFontWeight('bold');
  }
  const defaults = [
    ['site_name', ''],
    ['site_url', ''],
    ['output_folder_id', ''],
    ['output_folder_name', ''],
    ['input_folder_id', ''],
    ['input_folder_name', ''],
    ['serp_provider', 'CLAUDE_PACKAGE']
  ];
  const existing = sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,2).getDisplayValues() : [];
  const keys = new Set(existing.map(r => r[0]));
  defaults.forEach(r => { if (!keys.has(r[0])) sh.appendRow(r); });

  // v0.11.0: product-neutral Personal Knowledge boundary is enforced; discontinued Claude API experiment remains removed.
  PropertiesService.getUserProperties().deleteProperty('SBOS_CLAUDE_API_KEY');
  const obsoleteKeys = new Set(['serp_api_key','claude_model','claude_serp_batch_size','claude_web_search_max_uses']);
  for (let r = sh.getLastRow(); r >= 2; r--) {
    if (obsoleteKeys.has(String(sh.getRange(r,1).getValue() || ''))) sh.deleteRow(r);
  }
  sbosSetSetting_('serp_provider', 'CLAUDE_PACKAGE');
}

function sbosInitKeywords_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.KEYWORDS);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,16).clear();
  }
  sh.getRange(1,1,1,16).setValues([[
    'No','Source','SourceWordCount','キーワード','Normalized Keyword','語数',
    'SEO難易度','月間検索数','CPC','競合性','出現時期','Intent Key','Primary Candidate',
    '3か月の推移','前年比の推移','競合性指数'
  ]]);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,16)
    .setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#174ea6');

  // 利用者向け表示：需要Signalも確認できるようKeyword Planner由来列を表示する。
  try { sh.showColumns(1, Math.min(16, sh.getMaxColumns())); } catch(e) {}
  [2,3,5,12,13].forEach(c => {
    if (c <= sh.getMaxColumns()) {
      try { sh.hideColumns(c); } catch(e) {}
    }
  });

  sh.setColumnWidth(1,70);
  sh.setColumnWidth(4,360);
  sh.setColumnWidth(6,70);
  sh.setColumnWidth(7,100);
  sh.setColumnWidth(8,110);
  sh.setColumnWidth(9,90);
  sh.setColumnWidth(10,90);
  sh.setColumnWidth(11,110);
  sh.setColumnWidth(14,100);
  sh.setColumnWidth(15,100);
  sh.setColumnWidth(16,90);
  if (sh.getLastRow() >= 2) {
    sh.getRange(2,4,sh.getLastRow()-1,1).setWrap(true);
  }
  if (sh.getFilter()) {
    try { sh.getFilter().remove(); } catch(e) {}
  }
  if (sh.getLastRow() >= 1) {
    try { sh.getRange(1,1,Math.max(1,sh.getLastRow()),16).createFilter(); } catch(e) {}
  }
}

function sbosInitCandidates_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  const oldA = sh.getLastColumn() >= 1 ? String(sh.getRange(1,1).getDisplayValue() || '') : '';
  const oldR = sh.getLastColumn() >= 18 ? String(sh.getRange(1,18).getDisplayValue() || '') : '';

  // v0.9.0 -> v0.9.1 migration:
  // A列のRankを内部R列へ移し、A列を利用者向けチェックボックスにする。
  if (sh.getLastRow() >= 2 && oldA === 'Rank' && oldR === '選択') {
    const n = sh.getLastRow()-1;
    const ranks = sh.getRange(2,1,n,1).getValues();
    sh.getRange(2,18,n,1).setValues(ranks);
    sh.getRange(2,1,n,1).clearContent();
  }

  sh.getRange(1,1,1,27).setValues([[
    '選択','状態','メインキーワード','語数','Pre Score','Blue Ocean Score','カニバリ','検索意図',
    '判定根拠','Source','aCreator状態','Intent Key','SERP Status',
    'SBM Article ID','公開URL','BOS Outcome','SBM Linked At','Rank',
    '新規サイト適性','参入性','需要','SERP空白','展開性','クラスター性','継続性','リスク','新規サイト評価'
  ]]);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
  sh.getRange(1,1,1,27)
    .setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#174ea6');

  if (sh.getLastRow() >= 2) {
    const vals = sh.getRange(2,1,sh.getLastRow()-1,13).getValues();
    let changed = false;
    vals.forEach(r => {
      const main = String(r[1] || '');
      if (['PENDING','CANNIBAL_PENDING','CLUSTERED'].includes(main)) {
        r[1] = sbosStatusLabel_(main); changed = true;
      }
      const serp = String(r[12] || '');
      if (['PENDING','CLUSTERED'].includes(serp)) {
        r[12] = sbosStatusLabel_(serp); changed = true;
      }
    });
    if (changed) sh.getRange(2,1,vals.length,13).setValues(vals);
  }
  sbosApplyCandidateFormatting_();
}
function sbosOpenCandidates() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SBOS_SHEETS.CANDIDATES);
  SpreadsheetApp.getActive().setActiveSheet(sh);
  sbosApplyCandidateFormatting_();
  sh.setActiveSelection('A1');
}


function sbosSafeFilePart_(value) {
  return String(value || 'Unknown-Site')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'Unknown-Site';
}

// ============================================================================
// Dialogs
// Source consolidated from: Dialogs.gs
// ============================================================================
function sbosEscapeHtml_(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================================
// Utilities
// Source consolidated from: Utils.gs
// ============================================================================
function sbosNow_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
}
