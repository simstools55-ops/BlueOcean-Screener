# SIMS Blue Ocean Screener v0.13.5

SIMS Blue Ocean Screener は、ロングテールキーワード候補を選別し、ClaudeによるSERP精査、必要に応じたカニバリ確認、新規記事候補の確定、aCreator向け依頼文作成までを支援する Google Spreadsheet + Apps Script 製品です。

## 1. このバージョンについて

v0.13.5 は利用者配布版の整合を完了した Distribution Final です。

- `Code.gs`、`DrivePicker.html`、README、配布ZIPの版数を v0.13.5 に統一。
- Package作成ボタン押下直後に「Package作成中…」とスピナーを表示。
- SERPダイアログは `Code.gs` 内で生成し、追加HTMLファイルへの依存をなくしています。
- 新規サイト立ち上げ向けの専用探索モードを搭載。
- 新規サイト探索では、既存サイトのカニバリ判定を行わず、新規サイト適性を含めて評価します。
- 判定ロジックは v0.13.4 から変更していません。

## 2. 導入

1. 新しい Google スプレッドシートを用意します。
2. 「拡張機能」→「Apps Script」を開きます。
3. `Code.gs` の内容を既存コードと置き換えます。
4. `DrivePicker.html` をHTMLファイルとして追加します。
5. `appsscript.json` をマニフェストへ反映します。
6. 保存後、スプレッドシートを再読み込みします。
7. 表示された「SIMS Blue Ocean Screener」メニューから初期設定を行います。

初回実行時はGoogleの認可画面が表示されます。スプレッドシートとGoogle Driveを利用するために必要な権限を承認してください。

## 3. 探索モード

### 既存サイト探索

既存サイトへ追加する新規記事候補を探します。対象サイトを設定し、必要に応じてSite Collector Evidenceを利用します。

基本フロー：

1. 対象サイト・入力条件を設定
2. キーワードを読み込み
3. 一次選抜・3語／4語候補を生成
4. Claude向けSERP精査Packageを作成
5. Claude回答を登録
6. 必要な候補をカニバリ精査
7. GREEN／YELLOW／BLOCKを確認し、GREEN候補からaCreator依頼文を作成

### 新規サイト探索

これから立ち上げるサイト向けに、サイト名や既存記事を前提とせずキーワードを探索します。

- Site Collector Evidenceは不要です。
- カニバリ判定は行いません。
- TRY救済は使用しません。
- SERP評価に加えて「新規サイト適性」を評価します。

新規サイト適性の主な評価軸：

- 参入性
- 需要
- SERP空白
- 展開性
- クラスター形成力
- 継続性
- リスク

GREENの基本品質ゲートは、Blue Ocean Score、新規サイト適性、クラスター形成力、リスクを組み合わせて判定します。

## 4. Claude Packageの使い方

SERP精査やカニバリ精査では、画面からPackageを作成します。

- 「Package作成」を押すと、直ちに処理中表示とスピナーが出ます。
- 完了するまで同じボタンを繰り返し押さないでください。
- 完了後、生成されたZIPをClaudeへ渡します。
- Claudeから返された回答全文を、指定された回答欄へそのまま貼り付けて登録します。

公開用の操作例・入力例には実在する利用者サイトや記事を使用せず、架空の例を使用してください。

## 5. 判定の意味

- **GREEN**: 次工程へ進める有力候補。
- **YELLOW**: 条件不足や競合、需要、境界などに注意が必要な候補。
- **BLOCK**: 現状では新規記事候補として進めない候補。
- **TRY**: 既存サイト探索で最終GREENが0件の場合にのみ提示される実験候補。GREENとは別扱いです。

## 6. aCreator / SIMS Manager連携

最終GREEN候補からaCreator向け新記事作成依頼文を生成できます。既存サイト探索では、検索意図、SERP Gap、既存記事との境界、カニバリ条件を含めて引き継ぎます。

新規サイト探索では既存記事との境界情報が存在しないため、新規サイト適性とクラスター展開を中心に引き継ぎます。

## 7. 配布ファイル

利用者配布ZIPには次の4ファイルを収録しています。

- `Code.gs`
- `DrivePicker.html`
- `appsscript.json`
- `README-FIRST.md`

開発用CHANGELOG、旧Release Notes、テストコード、コミットメッセージ、個人固有情報は利用者配布ZIPには含めません。

## 8. 注意事項

- SIMSの標準AIはClaudeです。
- 実在サイト固有の情報は、実行時設定・Evidence・Personal Knowledge側で管理してください。
- システム本体へ利用者固有のサイト名、URL、記事ID、運用履歴を埋め込まないでください。
- Package生成や回答登録中にエラーが出た場合は、表示された停止工程・エラーメッセージを確認してください。

---

Product: SIMS Blue Ocean Screener  
Version: 0.13.5  
Release type: Distribution Final
