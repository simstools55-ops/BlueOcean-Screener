# Blue Ocean Screener v0.12.5

## 変更内容

- Google Ads Keyword PlannerのCSV/TSVエクスポートをキーワード入力として読めるようにしました。
- UTF-16LE/UTF-16BE/UTF-8を自動判定し、先頭に説明行がある場合も `Keyword` / `キーワード` ヘッダー行を探索して読み込みます。
- `Avg. monthly searches`、`3 か月の推移`、`前年比の推移`、`Competition`、`Competition (indexed value)` を取り込みます。
- 月間検索数・3か月推移・前年比を一次選抜の需要SignalとしてPre Scoreへ加味します。
- Google Adsの競合性はSEO難易度とはみなさず、広告主需要の補助Signalとして最大3点だけ加味します。
- Keyword Planner由来の需要SignalをSERP精査Packageへ渡し、Claudeの実SERP判定でも参照できるようにしました。
- 従来のラッコキーワードCSV/TSV読込は維持します。

## 分析方針

Keyword Planner数値だけでGREENを確定しません。一次選抜では需要の強さ・伸びを補助評価し、最終的なBlue Ocean判定は従来どおり実SERPとカニバリ精査を優先します。
