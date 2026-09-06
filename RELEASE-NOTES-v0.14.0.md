# SIMS Blue Ocean Screener v0.14.0

## 変更概要

- SERP最終色判定をSIMS Managerと共通思想へ変更。AIは上位30件の証拠収集と `estimated_reachable_rank` 推定を担当し、BOSが色を機械判定。
- GREEN: 1–10位、YELLOW: 11–20位、PALE PINK: 21–30位、RED: 31位以下。
- カニバリ・検索意図不成立等の強制停止は4色とは別に BLOCK。
- GREEN / YELLOW / PALE PINK はカニバリ確認後、利用者判断で aCreator 依頼可能。
- 旧TRY救済を新規判定では廃止（既存データ互換のみ維持）。
- `Candidate Pool` を追加。未処理およびBLOCK以外の過去候補をサイト別に継続保存。
- 保存済み候補を1件選択して最新SERP上位30件で再評価可能。再評価前に現在の既存記事データでカニバリHIGHを確認。
- `_CandidateHistory` にSERP評価・再評価履歴を保存。旧判定を消さず追跡可能。
- SERP結果契約に `checked_count`, `serp_top30`, `estimated_reachable_rank`, `confidence_percent`, `hard_block`, `block_reason` を追加。

## 運用上の注意

- v0.14.0は実運用試験用。旧v0.13.x形式のSERP回答JSONは新しい上位30件契約を満たさないため、そのままでは登録できません。
- 新規サイト探索モードは従来どおりaCreator処理を行わず、候補探索用途として維持します。
