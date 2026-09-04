# Blue Ocean Screener v0.13.1

## New-site operational fixes

- More tolerant Claude response JSON extraction:
  - fenced JSON
  - whole-response JSON
  - balanced JSON objects embedded in prose
- Better diagnostics when the expected contract is absent or malformed.
- NEW_SITE validation reports missing new-site fields explicitly.
- NEW_SITE Home now uses dedicated labels and workflow:
  - no TRY
  - no cannibal review
  - no aCreator queue
  - no existing-site workflow labels
- Existing-site behavior is unchanged.
