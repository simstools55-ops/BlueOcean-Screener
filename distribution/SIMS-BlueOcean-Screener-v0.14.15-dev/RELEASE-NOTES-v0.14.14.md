# SIMS Blue Ocean Screener v0.14.14

## 修正内容

SERP精査用Claude ZIPで、既存のClaude専用実行指示と返却JSON SchemaがPackageへ含まれていなかった問題を修正しました。

### 変更
- `CLAUDE-INSTRUCTIONS.txt` を追加
- `SERP_REVIEW_RESULT_V2_SCHEMA.json` を追加
- READMEで、キーワード分類・記事案・追加質問だけで終了せずSERP精査を完了することを明示
- `SIMS_BOS_SERP_REVIEW_RESULT_V2` 完全JSONの返却を明示

既存のSERP評価基準・BOS側の色判定ロジックは変更していません。
