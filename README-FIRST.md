# Blue Ocean Screener v0.12.6-dev

Blue Ocean Screener は、ロングテール候補の一次選抜、SERP精査、カニバリ精査、aCreator依頼文生成を支援する Google Spreadsheet + Apps Script 製品です。

## v0.12.6-dev — GREEN 0件時のTRY救済ルート

通常のGREEN品質ゲートは維持したまま、最終GREENが0件の場合だけ、カニバリ確認済みのロングテールを `TRY` として最大5件提示できるようにしました。

- TRYはGREENではなく、利用者判断による実験候補です。
- SERP YELLOW上位候補をカニバリ精査Packageへ救済候補として同梱します。
- 最終GREENが0件の場合のみ、カニバリLOW/MEDIUMかつ非BLOCKの候補をTRY化します。
- カニバリHIGHはTRYにしません。
- TRYには需要規模・SERP競争・データ不足等のリスクを明示します。
- TRYからもaCreator依頼文を生成し、通常のaCreator処理へ進めます。
- aCreator依頼文には「通常GREENではない実験候補」であることと、カニバリ境界を明記します。

## v0.12.5から継続する機能

- Keyword PlannerのUTF-16LE / タブ区切り / 先頭説明行を自動認識。
- 月間検索数、3か月推移、前年比、広告競合性を需要Signalとして利用。
- Google Ads競合性はSEO難易度と同一視しません。
- 候補0件時は無意味に次工程へ進めず、再探索候補を表示します。

## 配布について

現在は実運用試験中です。`distribution/` の正式配布物は自動更新せず、開発正本側へ変更を蓄積します。

## 推奨コミットメッセージ

`feat: GREEN 0件時のTRY救済候補とaCreator依頼導線を追加（Blue Ocean Screener v0.12.6）`
