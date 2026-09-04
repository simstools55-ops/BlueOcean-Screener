# Blue Ocean Screener v0.13.0

## New Site Keyword Discovery Mode

Adds a dedicated NEW_SITE workflow without changing the existing-site workflow.

- No target site name or URL required.
- No Site Collector Evidence required.
- No cannibalization review.
- TRY rescue disabled.
- Reuses keyword import, preliminary screening, 3/4-word long-tail generation, Keyword Planner demand signals, and Claude SERP review.
- Adds structured new-site suitability dimensions: entry ease, demand, SERP gap, expansion, cluster potential, continuity, and risk.
- Final GREEN is determined at SERP stage for NEW_SITE using deterministic gates:
  - Blue Ocean Score >= 80
  - New Site Fit >= 80
  - Cluster Potential >= 70
  - Risk <= 60
- YELLOW gate: Blue Ocean Score >= 65, New Site Fit >= 65, Risk <= 75.
- Candidates sheet adds new-site evaluation columns while preserving the existing 18-column compatibility surface.
- Existing-site mode, cannibalization, TRY rescue, aCreator and SIMS Manager routing remain unchanged.
