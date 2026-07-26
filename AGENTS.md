# UrbanAgent Frontend Agent Rules

## Required reading

Before analyzing or changing this repository, read:

1. `URBANAGENT_CODEX_CONTEXT.md`
2. `PLANNING.md`
3. `README.md`
4. `package.json`
5. The sibling backend repository:
   `../POI-urban-danang-BE`

The canonical project context is:

`../POI-urban-danang-BE/URBANAGENT_CODEX_CONTEXT.md`

The local context file is a mirror. Never modify either context file
unless the user explicitly approves a context update.

The master implementation state is stored in:

`../POI-urban-danang-BE/docs/rebuild/`

## Product priority

The primary user is the traveler.

Traveler pages must focus on:

- natural-language trip creation,
- personalized itinerary,
- timeline and map,
- editing and replanning,
- route feasibility,
- warnings and alternatives,
- save and share.

Business-location features belong under `/partners` and must not be mixed
into the normal traveler navigation.

## Visual rules

- Use the coastal tourism design system defined in the master context.
- Ocean blue is the primary color.
- Coral is the CTA color.
- Use sand and warm ivory backgrounds.
- Avoid generic AI gradients.
- Avoid neon, excessive glassmorphism, glowing borders, robot mascots,
  and developer-dashboard styling.
- Use Da Nang landmark visuals for the landing page.
- Keep 3D-like animation lightweight and limited mainly to the hero.
- Respect reduced-motion and mobile performance.
- Do not copy commercial template assets without permission.

## Workflow

Never redesign the frontend before the audit and Phase 0 are approved.

## Canonical data contract

- Backend canonical runtime data is `../POI-urban-danang-BE/data/canonical/urbanagent_poi_master_v1.csv`.
- The approved dataset decision is `../POI-urban-danang-BE/docs/rebuild/URBANAGENT_DATASET_DECISION.md`.
- Expected contract: `4166` rows, `4166` unique `Global_ID`, SHA-256 `5cc6ba843e6c93cb0b5403a03c5557f06a2e5d34a74340b4d0b4d6262035f7ae`.
- `Global_ID` is the canonical legacy POI key for Phase 0.
- `Alias_Global_IDs` preserves merged-row IDs and must not be rendered as extra traveler POIs.
- `RestaurantID` is a source identifier, not a verified Google `place_id`.
- Urban-void rows are excluded from traveler POIs, recommendations, itineraries, maps, and product POI counts.
- Legacy/raw input data are source inputs/backups only and must not be overwritten.
- Frontend and runtime code must not overwrite or regenerate raw/legacy CSV inputs.
- Do not invent missing coordinates, address, admin-boundary, rating, or review-count values in UI normalization.
- Do not modify the canonical CSV, manifest, or dataset decision unless the user explicitly approves a new dataset decision.
- Replacing the canonical dataset requires a decision record, manifest, SHA-256 hash, audit, and explicit user approval.

At the end of every frontend implementation batch:

1. Run build, lint, and relevant tests.
2. Record changed files.
3. Update the backend master worklog and current state.
4. Capture unresolved visual or functional problems.
5. Stop and wait for approval.
