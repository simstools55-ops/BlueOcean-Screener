# Blue Ocean Screener v0.12.4


## v0.12.4 — 候補0件時の終了導線をDrive Picker内でも統一

- Step 3の実候補数をCandidates上のSERP精査待ち件数から再確認します。
- SERP精査対象が0件ならStep 4ボタンを表示せず、その場で正常終了します。
- Step 2で読み込んだキーワード群からラッコキーワード再探索用の種キーワードを最大8件表示します。
- 候補0件時は内部状態もSERP_RUNNINGにせずCOMPLETEとして扱います。

Blue Ocean Screener は、ロングテール候補の一次選抜、SERP精査、カニバリ精査、aCreator依頼文生成を支援するGoogle Spreadsheet + Apps Script製品です。

## v0.12.3 — Personal Knowledge Separation

- 配布製品から実サイト名・実記事IDのサンプルを除去しました。
- サイト名の入力例は「サンプルブログ」、Article IDの入力例は明確な架空値 `A900001` に統一しました。
- 実利用者固有のブログ情報は、製品コードではなく実行時設定・Evidence・外部Personal Editorial Knowledgeで扱います。
- Claude APIは引き続き非搭載です。SERP/カニバリ精査は現行の手動Package → Claude → 回答貼付方式を維持します。
- 候補シート、Home、aCreator連携、SIMS Manager登録フローの契約・保存データは変更していません。

## 正式版

**v0.12.4**

## 配布

利用者向け配布物は `distribution/SIMS-BlueOcean-Screener-v0.12.4/` に集約しています。

## 推奨コミットメッセージ

`fix: 候補0件時はSERP精査へ進めず再探索候補を表示（Blue Ocean Screener v0.12.4）`
