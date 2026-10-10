# Blue Ocean Screener v0.14.36

- aCreator回答JSONをキーワードごとにGoogle Driveファイルへ保存し、Stateシートの1セル50,000文字制限を回避。
- 既存のcreator_response_json集約データは削除・上書きせず、従来回答の読み込みに使用。
- 新方式では保存後に全文照合し、DriveファイルIDとキーワードをDocument Propertiesに記録。
- 学習記録の誤登録防止、BLOCKED判定、Manager連携は維持。
- Driveへの書き込み権限が必要。初回利用時にGoogle認可が求められる場合があります。
