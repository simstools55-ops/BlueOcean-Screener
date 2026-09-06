# SIMS Blue Ocean Screener v0.14.9

## 修正
- SERP精査ダイアログの「Claude用ZIPを作成」ボタンが反応しない不具合を修正。
- 原因は、HtmlServiceへ渡すクライアントJavaScriptの改行文字が不正に展開され、script全体が構文エラーになっていたこと。
- 改行を `\\n` として正しくエスケープし、ZIP作成・回答登録・次工程ボタンのイベント登録を復旧。
- SERP判定仕様（Claude専用、最低5件の実在証拠、reachable_band、既存記事検知）はv0.14.8を継承。
