# SIMS Blue Ocean Screener v0.14.1

Release type: Development / Operational Test

## Changes

- Candidate Pool is now filtered by the currently selected target site.
- When a target site is selected, only that site's saved candidates are visible.
- When no target site is selected, only candidates created without a target site are visible.
- New-site discovery candidates remain separated from ordinary unassigned candidates.
- Candidates belonging to other sites remain stored but are hidden and excluded from re-evaluation selection.
- Any checked state on hidden cross-site rows is cleared automatically.
- Home shows the Candidate Pool count for the current site context.
- SERP four-tier judgment, BLOCK gate, candidate history, and re-evaluation logic from v0.14.0 are unchanged.

## Operational test focus

1. Switch among two or more target sites and confirm Candidate Pool shows only the active site's candidates.
2. Clear the target site / use unassigned search and confirm named-site candidates are not shown.
3. Confirm a hidden candidate from another site cannot be re-evaluated.
4. Confirm switching back restores the corresponding site's saved candidates.
