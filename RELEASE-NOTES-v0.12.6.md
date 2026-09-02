# Blue Ocean Screener v0.12.6 (DEV)

## TRY rescue route when final GREEN is zero

- Added `TRY` as a clearly separate, user-decision experimental outcome. TRY is never treated as GREEN.
- Cannibal review packages now include up to five high-ranked SERP YELLOW long-tail candidates as rescue candidates, in addition to normal SERP GREEN candidates.
- Rescue candidates are shown as TRY only when the final GREEN count becomes zero.
- TRY requires cannibal review. HIGH cannibal risk is excluded; only LOW/MEDIUM candidates not returned as BLOCK can become TRY.
- TRY evidence explicitly warns about demand size, SERP competition, and data uncertainty.
- GREEN / TRY candidates can both generate an aCreator referral and use the existing aCreator workflow.
- aCreator referral text for TRY explicitly states that the case is an experimental user-decision candidate, not a normal GREEN recommendation.
- Home and Candidates UI distinguish TRY from GREEN.

This change preserves the existing GREEN quality gate while avoiding a dead-end result when a plausible, cannibal-checked long-tail experiment remains.
