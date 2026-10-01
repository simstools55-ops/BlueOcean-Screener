# SIMS Blue Ocean Screener v0.14.20

## 保存済み探索の再開ボタン回帰修正

- v0.14.19で「この探索を再開」ボタンが反応しなくなる回帰不具合を修正。
- 原因は復元完了UI用インラインJavaScriptの引用符競合。
- 復元完了画面ではSERP進捗、GREEN+YELLOW件数、未依頼件数、Claude ZIP状態を引き続き表示。
- 「4. SERP・新規サイト適性を精査」への導線も維持。
