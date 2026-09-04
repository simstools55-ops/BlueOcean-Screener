## v0.13.3
- Rebuilt SERP workflow dialog as dedicated HTML.
- Replaced inline onclick handlers with explicit event listeners.
- Retained Package processing optimization and diagnostics.
- No scoring/decision changes.

## v0.13.2
- Optimized SERP Package creation.
- Added stage diagnostics, elapsed-time reporting, batch status updates and visible processing overlay.
- No scoring/decision changes.

## v0.13.1
- Improved Claude response JSON extraction and diagnostics.
- Added explicit NEW_SITE required-field validation.
- Added dedicated NEW_SITE Home layout without TRY/cannibal/aCreator artifacts.
- Existing-site workflow unchanged.

## v0.13.0
- Added dedicated NEW_SITE keyword discovery mode.
- Added new-site suitability scoring and deterministic GREEN/YELLOW/BLOCK gates.
- NEW_SITE skips target-site identity, Evidence cannibal review, TRY rescue, and aCreator routing.
- Added new-site evaluation columns to Candidates.
- Existing-site workflow and decision logic remain unchanged.

## v0.12.8
- Freeze Candidate after v0.12.1-v0.12.7 operational-test accumulation.
- Unified all user-facing workflow numbering to the current 7-step menu.
- Corrected legacy Step 8/10/12 labels and cannibal Step 6 label.
- Unified user-facing SBM wording to SIMS Manager.
- Unified target-blog wording to target-site wording.
- No change to screening, SERP, cannibal, TRY rescue, Keyword Planner, or aCreator decision logic.
- Rebuilt current distribution.

## v0.12.7-dev
- ダイアログの処理完了後、完了済みの実行ボタンを非表示化。
- カニバリ回答登録後に「7. 候補・進捗を確認」を表示。
- SERP Package作成後に作成ボタンを非表示化し、回答貼付欄へ誘導。


## v0.12.6-dev
- GREEN最終0件時の救済枠 `TRY` を追加。
- SERP YELLOW上位ロングテールをカニバリ精査Packageへ同梱し、GREENが0件の場合のみLOW/MEDIUMかつ非BLOCKをTRY候補として提示。
- TRYはGREENと明確に分離し、需要・SERP競争・データ不足等のリスクを明示。
- TRY候補からも利用者判断でaCreator依頼文を生成・処理可能。

## v0.12.5
- Google Ads Keyword PlannerのUTF-16/TSV・説明行付きエクスポートに対応。
- 月間検索数、3か月推移、前年比、広告競合性、競合性指数を需要Signalとして一次選抜とSERP精査Packageへ反映。
- Ads競合性はSEO難易度とは扱わず補助Signalに限定。
# Changelog

## v0.12.3 - 2026-09-02
- SERP精査画面を開く時点でPackage保存先を確認するよう変更。
- 保存先未設定でも、Step 2のキーワード読込フォルダーが設定済みならそのフォルダーを自動的にPackage保存先として採用。
- 入力フォルダーも保存先も未設定の場合は保存先Pickerへ誘導し、設定後に「SERP精査へ戻る」で元のフローへ復帰可能にした。
- Package作成ボタンを押した後に保存先未設定で作業が中断されるUXを解消。

# CHANGELOG

## v0.10.3 - 2026-08-29
- Removed the discontinued Claude/Anthropic API integration, API-key storage, metered SERP action, and API-specific settings.
- The supported workflow is manual Claude Package creation and response paste only.
- Removed the Apps Script external-request OAuth scope because BOS no longer performs external API requests.


## v0.10.1 - 2026-08-26
- Fixed the 3 -> 4 transition so all screening paths open the unified SERP workflow.
- Fixed the 4 -> 5 transition by revealing a direct cannibal-review button after successful SERP registration.
- Added a direct candidate/progress route when SERP review produces no GREEN candidates.
- Preserved in-button processing feedback during next-step transitions.


## v0.10.0 - 2026-08-26
- Simplified the user menu to seven operational steps.
- Consolidated maintenance actions under one submenu.
- Removed redundant target-blog confirmation from keyword import.
- Combined SERP package creation and response registration.
- Combined cannibal evidence/package/response registration.
- Replaced explicit Creator queue registration with one-case Creator workflow.
- Combined Creator referral, Creator response storage, and SBM result recording in one dialog.
- Standardized processing indicators on major action buttons.


## v0.9.10 - 2026-08-26
- Fixed maintenance reinitialization so Home is forcibly rebuilt with the current layout.
- Cleared legacy Home cells/formats over A1:Z60 before rebuilding to remove duplicate old-version values.
- Preserved Keywords, Candidates, session, Creator, and SBM data during UI reinitialization.


## v0.9.9 - 2026-08-26
- Reworked Home into a cleaner 10-column dashboard without merged cells.
- Prevented title clipping by separating the version cell from the product title.
- Gave URL/status fields significantly more usable width.
- Reorganized the standard workflow into two readable rows.
- Removed blank colored bands and reduced awkward vertical text wrapping.
- Preserved lightweight startup behavior and the recovery-safe non-merged UI.


## v0.9.8 - 2026-08-26
- Redesigned Home as a readable color-coded dashboard without merged cells.
- Increased column widths and row heights to prevent clipped information.
- Added wrapping for long URL, filename, and status fields.
- Added clearer visual grouping for judgments, Creator progress, workflow, legend, and notes.
- Preserved lightweight startup behavior to avoid the previous loading-stall issue.


## v0.9.7 - 2026-08-26
- Added an in-button spinner and `処理中…` state to blog switch/start actions.
- Disabled duplicate actions while a blog save/restore operation is running.
- Restored button state automatically after errors.


## v0.9.6 - 2026-08-26
- Recover missing blog names by URL from BlogArchive/GreenArchive.
- Persist repaired identity back to Settings and session metadata.
- Synchronize Home version display on open without heavy sheet initialization.


## v0.9.5 - 2026-08-26
- Added self-healing restoration for missing blog name / URL from `_BlogSessions`.
- Re-saves repaired blog session identity after restoration.
- Unified session counts with the 18-column Candidates schema.
- Forced all non-user sheets, including recovery archives, to remain hidden.
- Changed SBM result registration to one checked Candidate at a time.
- Corrected several workflow numbering labels.
- Unified source header/version references to v0.9.5.


## v0.9.4 - 2026-08-26
- Recovery build for the rebuilt BOS spreadsheet.
- Replaced merge-heavy Home reconstruction with a lightweight unmerged Home.
- Stopped full Home rebuild on every sbosEnsureSheets_ call.
- Updated Home summary coordinates for the lightweight layout.
- Preserved 18-column Candidates internal schema and blog session workflow.


## v0.9.3 - 2026-08-26
- Made `onOpen()` lightweight: it now builds only the BOS menu.
- Removed automatic full Home rebuild and Candidates sort/format from spreadsheet-open time.
- Removed one duplicate Home summary refresh from `sbosEnsureSheets_()`.
- Added a maintenance-only manual UI/sheet reinitialization command.
- Intended to prevent Google Sheets from remaining on the loading spinner when opening BOS.


## v0.9.2 - 2026-08-25
- Split Home into final SEO judgment and GREEN-case work progress.
- Added progress states: unqueued, Creator queue, Creator completed, SBM registered.
- Added explicit checkbox action to mark selected queued cases as Creator completed.
- Renumbered SBM result recording to step 12.


## v0.9.1 - 2026-08-25
- Moved the selection checkbox to the leftmost Candidates column.
- Moved Rank to hidden internal column R while preserving ranking data.
- Reduced default Candidates view to seven operational columns.
- Hid long evidence, raw/internal and SBM management columns by default without deleting data.
- Added migration from the v0.9.0 Rank-left / checkbox-right layout.
- Froze the first three columns for easier candidate selection.
- Preserved status-priority sorting and max-10 Creator queue selection.


## v0.9.0 - 2026-08-25
- Added target-blog setup as standard step 1 and renumbered the workflow.
- Added Candidates checkbox selection without shifting existing processing columns.
- Added automatic status-priority sorting after candidate updates.
- Added persistent Creator request queue; up to 10 cases can be queued/handled per operation and unfinished cases remain for later sessions.
- Added Home visibility for the Creator request queue.
- Added multi-case Creator referral output with independent CASE sections.
- Added Drive Picker filtering: keyword CSV/TSV and `SIMS-Evidence` ZIP for cannibal evidence.
- Preserved Package + full Claude response paste as the standard AI workflow.


## v0.8.5 - 2026-08-25
- Required Claude to include the complete result JSON inline in the chat response for both SERP and cannibal review Packages.
- Explicitly prohibited file-only JSON delivery for the standard copy/paste workflow.
- Improved paste error guidance when Claude says the JSON was stored in an attached/generated file instead of including it in the response.


## v0.8.4 - 2026-08-25
- Added a hard confirmation guard between the active target blog and selected keyword file.
- Added a direct target-blog switch action from the keyword file picker.
- Rejects import if the active blog changes while the picker is open.
- Resets Candidates, SERP review data, run state, request IDs, and prior decisions when a new keyword file is imported.
- Preserves the active blog identity and normal Settings while starting the new keyword exploration run.
- Prevents cross-blog and cross-CSV result contamination.


## v0.8.3 - 2026-08-25
- Audited all standard-flow dialogs, menus, Home guidance, Drive Picker guidance, and next-step actions.
- Added direct next-step buttons: SERP Package -> SERP answer paste, SERP paste -> cannibal Package, cannibal Package -> cannibal answer paste, cannibal paste -> GREEN candidates.
- Marked legacy Drive JSON result import as maintenance-only.
- Corrected SERP evaluator documentation to state `CLAUDE_PACKAGE` is the standard provider.
- Rewrote README-FIRST around the current Package + full-response paste workflow.


## v0.8.2 - 2026-08-25
- Fixed Home workflow row-count mismatch (`5 data rows` vs `4 range rows`).
- Simplified Home standard flow to three rows covering steps 1-9.
- Changed default SERP provider to `CLAUDE_PACKAGE`.
- Fixed initialization migration that still forced `CLAUDE_API`.


## v0.8.1 - 2026-08-25
- Changed standard Claude result registration from Google Drive JSON selection to full-response copy/paste.
- Added robust extraction of `SIMS_BOS_SERP_REVIEW_RESULT_V1` and `SIMS_BOS_CANNIBAL_REVIEW_RESULT_V1` JSON from Claude response text.
- Fixed remaining v0.7.x API-standard next-step buttons after screening/resume.
- Fixed Package completion guidance and workflow numbering.
- Updated Home standard flow to Package -> response paste -> cannibal Package -> response paste.


## v0.8.0 - 2026-08-25
- Restored standard menu actions for SERP Package creation and result import.
- Standardized manual AI review destination on Claude.


## v0.7.1 - 2026-08-25
- Fixed Claude Web Search `pause_turn` handling during automatic SERP review.
- Continue paused server-tool turns by returning Claude's previous content as an assistant message.
- Added diagnostic details (`stop_reason` / content block types) when no final JSON text is returned.


## v0.7.0
- Added Anthropic Web Search based SERP verification.
- Added batched SERP processing to reduce Apps Script timeout risk.
- Deferred Intent clustering until all SERP batches finish, preventing unreviewed candidates from being clustered early.
- Appended per-batch SERP audit rows instead of overwriting the previous batch archive.
- Reused `SIMS_BOS_SERP_REVIEW_RESULT_V1` validation/import logic for both API and manual results.
- Kept manual Claude SERP Package import/export as a fallback.
- Renamed SERP and cannibal review Package destinations from ChatGPT to Claude.
- Updated menu numbering and Drive Picker guidance for the Claude-first workflow.
- Added explicit Apps Script OAuth scopes including external requests.

## v0.6.2
- Restored menu creation before sheet initialization.
- Simplified user-visible Keywords and Candidates columns.
- Kept internal operation sheets hidden.

## v0.4.0
- Added safe cleanup of blank default `シート1` / `Sheet1`.
- Moved Home to the first sheet tab.
- Rebuilt Home as a product-style dashboard.
- Added product header, site/runtime information, keyword/candidate cards and standard workflow guide.
- Preserved existing keyword, SERP, cannibalization and Creator handoff logic.

## v0.12.2
- SERP候補0件時の終了導線を追加し、空のSERP精査画面への遷移を防止。
- 入力キーワード由来のラッコキーワード再探索候補を表示。

## v0.12.2
- SERP候補0件時の終了導線を追加。
- 入力キーワード由来のラッコキーワード再探索候補を表示。

## v0.12.4
- Drive Picker経由のStep 3で候補0件でもStep 4ボタンが表示される経路を修正。
- 候補0件時は正常終了し、ラッコキーワード再探索候補を表示。
