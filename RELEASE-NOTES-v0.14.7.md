# SIMS Blue Ocean Screener v0.14.7

## SERP精査の信頼性改善

AIがGoogleの厳密な順位を取得できない環境で、20件を埋めるために推測・創作する問題を避けるため、SERP契約をV2へ変更しました。

- 1サイクル: 最大5候補
- 各候補: 実在確認できた検索証拠を最低8件目安で収集
- `checked_count`: 実際の確認件数
- `serp_evidence`: 実在確認済みページのみ
- `reachable_band`: TOP10 / TOP20 / TOP30 / OUT
- BOS色変換: GREEN / YELLOW / PALE PINK / RED
- hard_block=true は従来どおりBLOCK
- GREEN＋YELLOW 10件、または5サイクルで停止

サイト内検索URLを個別SERP結果として埋めること、架空URL、未確認順位の補完は禁止し、登録時にも検証します。
