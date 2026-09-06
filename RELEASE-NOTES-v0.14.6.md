# SIMS Blue Ocean Screener v0.14.6

## Purpose

Make manual SERP review reliable enough for Gemini/Claude by reducing one review unit from 30 candidates × 30 results to a controlled 5 candidates × top 20 results.

## Changes

- Keep up to 30 first-stage candidates.
- Review at most 5 candidates per cycle.
- Require top 20 organic SERP evidence for every reviewed candidate.
- Stop when cumulative GREEN+YELLOW reaches 10, or after 5 cycles.
- Keep PALE PINK as an article candidate without counting it toward the 10-item target.
- Remove RED/BLOCK from operational candidate lists while preserving history.
- Show cycle progress and provide a “next 5 candidates” action.
- Gemini/Claude result importer validates the actual SERP list length, not only `checked_count`.
- Backward compatibility: importer can still read a v0.14.5 `serp_top30` array as long as at least 20 entries are present.

## Operational test focus

Verify that Gemini reliably returns 20 real SERP entries for each of five candidates, and that the cycle stops correctly at either 10 GREEN+YELLOW or five completed cycles.
