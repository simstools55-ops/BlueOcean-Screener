# SIMS Blue Ocean Screener v0.14.4

SIMS Blue Ocean Screener は、ロングテールキーワード候補を選別し、ClaudeによるSERP精査、必要に応じたカニバリ確認、新規記事候補の確定、aCreator向け依頼文作成までを支援する Google Spreadsheet + Apps Script 製品です。

## v0.14.4 の選抜方針

- キーワード読込完了画面に **2語 / 3語 / 4語** の件数を表示します。
- 2語・3語・4語を同一の一次評価へ載せ、固定閾値で早期に絞りすぎず、**Pre Score上位30件まで**をSERP精査対象にします。
- SERP精査ではAIが上位30件を確認し、`estimated_reachable_rank` を返します。
- BOSは **GREEN=1〜10位 / YELLOW=11〜20位 / PALE PINK=21〜30位** を記事候補として保持します。
- **RED=31位以下 / BLOCK** はSERP履歴には保存しますが、CandidatesとCandidate Poolから除外します。
- 同一検索意図として統合された重複候補も、SERP完了後の実運用候補一覧から除外します。


## 1. このバージョンについて

v0.14.4 は、2語・3語・4語を一次選抜対象とし、一次評価の上位30件までをSERP精査へ送り、最終的にGREEN / YELLOW / PALE PINKだけを記事候補として残す実運用試験版です。aCreator依頼は引き続き1件ずつ処理します。

- AIは各候補について現在の自然検索上位30件を確認し、`estimated_reachable_rank` を返します。
- 最終色はBOS側で固定判定します。GREEN=1〜10位、YELLOW=11〜20位、PALE PINK=21〜30位、RED=31位以下。
- 検索意図不成立、需要Signal不在、カニバリ等の強制停止は4色とは別にBLOCKとして扱います。
- GREEN / YELLOW / PALE PINKは、カニバリ確認後に利用者判断でaCreator依頼文を生成できます。
- `Candidate Pool` にはGREEN / YELLOW / PALE PINKの未処理候補だけをサイト別に保存します。RED / BLOCKは履歴には残しますが候補プールから除外します。
- Candidate Poolから1件を選び、最新SERP30件で再評価できます。
- 再評価履歴は内部シート `_CandidateHistory` に蓄積します。
- Candidate Poolは、現在選択している対象サイトと一致する候補だけを表示します。
- 主要ダイアログの実行ボタンは、押下直後に「処理中…」「登録中…」「コピー中…」へ変わり、スピナーを表示します。
- 対象サイト未指定時は、対象サイト未指定で探索した候補だけを表示し、他サイト候補は表示・再評価対象から除外します。
- aCreator依頼は利用者が候補を1件だけチェックして、1案件ずつ処理します。
- aCreator作成済み / SIMS Manager登録済み候補はCandidate Poolから卒業し、再評価対象に残しません。
- Candidate Poolの判定根拠は折り返し表示します。
- 通常メニューは 1〜7 の運用フローと、番号なしの「保存済み候補・再評価」に分離しました。
- サイト切替時も候補データ自体は削除せず、表示と再評価対象だけを現在サイトへ限定します。

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
7. GREEN／YELLOW／PALE PINK候補を確認し、利用者が1件だけ選択してaCreator依頼文を作成

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

新規サイト探索でも最終色は推定到達順位からBOSが4段階で判定し、新規サイト適性は補助評価として保持します。

## 4. Claude Packageの使い方

SERP精査やカニバリ精査では、画面からPackageを作成します。

- 「Package作成」を押すと、直ちに処理中表示とスピナーが出ます。
- 完了するまで同じボタンを繰り返し押さないでください。
- 完了後、生成されたZIPをClaudeへ渡します。
- Claudeから返された回答全文を、指定された回答欄へそのまま貼り付けて登録します。

公開用の操作例・入力例には実在する利用者サイトや記事を使用せず、架空の例を使用してください。

## 5. 判定の意味

- **GREEN**: 推定到達順位 1〜10位。
- **YELLOW**: 推定到達順位 11〜20位。
- **PALE PINK**: 推定到達順位 21〜30位。
- **RED**: 推定到達順位 31位以下。通常はaCreator対象外です。
- **BLOCK**: SERP競争力とは別の強制停止。検索意図不成立、需要Signal不在、カニバリ等で新規記事化を止める案件です。

AIは色を決めません。上位30件の証拠と到達見込み順位を返し、BOSが色を決定します。

## 6. aCreator / SIMS Manager連携

GREEN / YELLOW / PALE PINK候補から、利用者判断でaCreator向け新記事作成依頼文を生成できます。既存サイト探索では、検索意図、SERP Gap、既存記事との境界、カニバリ条件を含めて引き継ぎます。

新規サイト探索では既存記事との境界情報が存在しないため、新規サイト適性とクラスター展開を中心に引き継ぎます。

## 7. 配布ファイル

利用者配布ZIPには次の5ファイルを収録しています。

- `Code.gs`
- `DrivePicker.html`
- `appsscript.json`
- `README-FIRST.md`
- `WEB-MANUAL.md`

開発用CHANGELOG、旧Release Notes、テストコード、コミットメッセージ、個人固有情報は利用者配布ZIPには含めません。

## 8. 注意事項

- SIMSの標準AIはClaudeです。
- 実在サイト固有の情報は、実行時設定・Evidence・Personal Knowledge側で管理してください。
- システム本体へ利用者固有のサイト名、URL、記事ID、運用履歴を埋め込まないでください。
- Package生成や回答登録中にエラーが出た場合は、表示された停止工程・エラーメッセージを確認してください。

---

Product: SIMS Blue Ocean Screener  
Version: 0.14.4  
Release type: Development / Operational Test
