# SIMS Blue Ocean Screener v0.13.6

Release type: Distribution Final / Freeze Audit Fix

## Changes
- Fixed a release-package inconsistency found during the final Freeze audit.
- Repository `distribution/` now contains the same five user-facing files as the external Distribution ZIP, including `WEB-MANUAL.md`.
- Updated the Personal Knowledge separation test to validate v0.13.6 instead of the obsolete v0.11.0 constant.
- Synchronized product/version metadata across runtime source, README, Web manual, VERSION and PRODUCT_IDENTITY.

## Functional impact
No screening, scoring, SERP, cannibalization, TRY rescue, aCreator routing, or decision logic was changed. Runtime behavior is unchanged from v0.13.5 except the visible version metadata.
