# SIMS Blue Ocean Screener v0.14.10 Release Notes

## 変更点

ClaudeのSERP回答で `checked_count` と `serp_evidence` の件数が一致しない場合でも、BOS自身が `serp_evidence.length` を実確認件数として再計算するよう変更しました。

- 最低品質ゲートは `serp_evidence >= 5` を維持します。
- `checked_count=7` / `serp_evidence=6` のような単純な数え間違いは6件として登録します。
- 実証拠が5件未満の場合は従来どおり登録を拒否します。
- Candidate Pool再評価にも同じルールを適用します。
- 5候補1サイクル、GREEN+YELLOW 10件または最大5サイクル、既存記事自動除外、Claude専用SERP精査は変更ありません。
