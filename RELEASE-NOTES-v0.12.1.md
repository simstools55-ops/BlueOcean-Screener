# Blue Ocean Screener v0.12.1

## Changes
- Drive Picker のファイル表示を更新日時の新しい順へ変更。
- フォルダーは先頭にまとめ、フォルダー内は名前順を維持。
- ファイル/フォルダー走査件数に上限を設け、Drive 一覧取得時の DEADLINE_EXCEEDED リスクを低減。
- 既存の onOpen / sbosBuildMenu_ を維持し、メニュー表示を保持。

## Verification
- Apps Script 構文確認済み。
- onOpen / sbosBuildMenu_ 存在確認済み。
- DrivePicker.html / appsscript.json 同梱確認済み。
