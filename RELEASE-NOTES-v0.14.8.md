# SIMS Blue Ocean Screener v0.14.8

## Changes

- SERP精査をClaude専用に統一しました。Gemini用SERP依頼ファイル生成と画面ボタンは削除しました。
- SERP証拠の最低件数を8件から5件へ変更しました。Claudeが実際に確認できた範囲を正直に返す運用に合わせた調整です。
- 対象サイト自身の記事URLが `serp_evidence` に含まれる候補は `EXISTING_ARTICLE` として扱い、新規記事候補・Candidate Pool・aCreatorルートから除外します。
- `EXISTING_ARTICLE` はSERP履歴には保存され、GREEN＋YELLOWの10件目標には含まれません。
- 1サイクル最大5候補、GREEN＋YELLOW 10件または5サイクルで停止するルールは維持します。
