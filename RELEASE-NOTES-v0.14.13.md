# SIMS Blue Ocean Screener v0.14.13 Release Notes

## 目的
aCreatorでの新記事作成からSIMS Manager登録までの実運用手順を、ダイアログの状態遷移に一致させる。

## 変更
- ② aCreator回答を登録するまで③ SIMS Manager登録結果を非表示。
- ②登録成功後にSIMS Managerへ新記事を登録し、Article ID（Axxxxxx）を取得するよう案内。
- ③見出しを「SIMS Managerへの登録結果を記録」に変更。
- Article IDは必須、公開URLは任意。
- Article IDは A + 6桁形式をクライアント／サーバー双方で検証。
- すでにaCreator回答保存済みの案件を再開した場合は③を表示して続行可能。

## 判定ロジック
SERP判定、カニバリ判定、候補抽出条件には変更なし。
