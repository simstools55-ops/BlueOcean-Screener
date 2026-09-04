# Blue Ocean Screener v0.12.8

## v0.12.8 — Freeze Candidate / UI consistency

v0.12.7までの実運用試験で確認した探索・SERP・カニバリ・TRY救済・aCreator処理のロジックを維持したまま、正式Freeze前の利用者向けUI整合を完了しました。

- メニューは現行の7ステップに統一。
- 旧 `8 / 10 / 12` ステップ表記を現行 `6 / 7` の導線へ統一。
- カニバリ精査ダイアログの旧Step 6表記をStep 5へ修正。
- 利用者向け `SBM` 表記を **SIMS Manager** に統一。
- `対象ブログ` / `ブログ切替` を **対象サイト** / **サイト切替** に統一。
- GREEN 0件時のTRY救済ロジック、Keyword Planner対応、SERP判定、カニバリ判定、aCreator処理ロジックは変更していません。
- 内部互換用 `SBM_*`、既存データ列名、保存キー等は変更していません。
- `distribution/` をv0.12.8の現行Code.gs / DrivePicker.html / README / appsscript.jsonで再構築しました。

## v0.12.7-dev — ダイアログの完了後導線を統一

- 完了した処理のボタンは消し、同じ操作を誤って再実行できないようにしました。
- カニバリ回答登録後は「7. 候補・進捗を確認」を表示します。
- SERP Package作成後は作成ボタンを消し、次の回答貼付作業へ誘導します。

Blue Ocean Screener は、ロングテール候補の一次選抜、SERP精査、カニバリ精査、aCreator依頼文生成を支援する Google Spreadsheet + Apps Script 製品です。

## v0.12.6-dev — GREEN 0件時のTRY救済ルート

通常のGREEN品質ゲートは維持したまま、最終GREENが0件の場合だけ、カニバリ確認済みのロングテールを `TRY` として最大5件提示できるようにしました。

- TRYはGREENではなく、利用者判断による実験候補です。
- SERP YELLOW上位候補をカニバリ精査Packageへ救済候補として同梱します。
- 最終GREENが0件の場合のみ、カニバリLOW/MEDIUMかつ非BLOCKの候補をTRY化します。
- カニバリHIGHはTRYにしません。
- TRYには需要規模・SERP競争・データ不足等のリスクを明示します。
- TRYからもaCreator依頼文を生成し、通常のaCreator処理へ進めます。
- aCreator依頼文には「通常GREENではない実験候補」であることと、カニバリ境界を明記します。

## v0.12.5から継続する機能

- Keyword PlannerのUTF-16LE / タブ区切り / 先頭説明行を自動認識。
- 月間検索数、3か月推移、前年比、広告競合性を需要Signalとして利用。
- Google Ads競合性はSEO難易度と同一視しません。
- 候補0件時は無意味に次工程へ進めず、再探索候補を表示します。

## 配布について

v0.12.8 Freeze Candidateでは、実運用試験で蓄積した変更を現行distributionへ同期しています。

## 推奨コミットメッセージ

`fix: 完了済みボタンを消して次工程ボタンへ切り替える（Blue Ocean Screener v0.12.7）`
