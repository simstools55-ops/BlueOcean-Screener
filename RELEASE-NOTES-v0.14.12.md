# SIMS Blue Ocean Screener v0.14.12 Release Notes

## 目的
SERP AI回答の検証・登録時に残っていたGoogle Sheets背景画面のちらつきを抑制する。

## 変更
- SERP登録ルートからHome全体の書式再適用を分離。
- `sbosRefreshHomeSummaryFast_()` を追加し、通常登録時はHomeの値だけを更新。
- SERP登録時のCandidatesチェックボックス全件再挿入とキーワード列wrap全件再設定を廃止。
- Homeステータスは状態保存後、軽量Home更新で1回だけ画面へ反映。
- Candidate Pool同期後にHome値を更新し、件数整合を維持。
- SERP判定ロジック、最低Evidence 5件、5候補×最大5サイクル等は変更なし。
