# SIMS Blue Ocean Screener v0.14.11 Release Notes

## SERP回答登録の高速化
- SERP回答登録時のCandidate Pool二重同期を解消。
- SERP登録時は変更のないKeywords / Settingsのセッション再保存を省略し、Candidates / State / SERP Resultsだけを保存。
- Candidate Pool同期を行単位のdeleteRow/appendRowから一括再構築へ変更。
- SERP履歴5件をappendRow連打ではなく一括setValuesで保存。
- SERP登録時のCandidates書式更新を軽量化し、列表示・列幅・ノート・全行再描画・二重ソートを省略。
- RED / BLOCK / 既存記事の除外をメモリ上で行い、Candidates全体の書込み回数を削減。

判定ロジック、5候補/サイクル、最低5件の実在証拠、GREEN+YELLOW 10件または5サイクル停止条件は変更していません。
