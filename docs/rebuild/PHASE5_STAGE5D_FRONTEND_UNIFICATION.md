# Phase 5 Stage 5D - Frontend Product Unification

## Result

The `/urban-agent` traveler journey now uses one product flow:

preferences -> suitable places -> include/exclude -> trip preview -> timeline and map -> edit/replan -> save.

## Legacy UI Removed

- Removed the separate `Lịch trình agent đề xuất` presentation.
- Removed the old `Tìm thêm điểm phù hợp` handler and its calls to legacy agent, image-model, and multimodal endpoints.
- Removed the second POI list, duplicated itinerary rendering, model selector, image upload, Agent Learning panel, and unreachable live-route controls associated with that presentation.
- Preserved compatibility with previously saved trips by normalizing their stored stops into the current trip-preview shape. Missing coordinates remain unknown and are not replaced with Da Nang center coordinates.

## Functionality Retained

- `POST /api/v2/recommendations` is the single candidate-discovery API and returns up to 12 candidates.
- Existing include/exclude constraints feed the current `POST /api/v2/trips/preview` request.
- Remove, reorder, saved-trip lifecycle, and replan behavior continue to use the existing v2 endpoints.
- Save and open-saved-trip behavior remains in the current itinerary panel.
- Leaflet day maps and the large map remain available. Their polylines are explicitly described as illustrative rather than road routing.

## UX Decisions

- Trip creation/update is the primary action; recommendations are secondary; save and large map are tertiary actions.
- Candidate cards expose add, inspect-on-map, skip, and restore actions with selected/scheduled/excluded labels.
- Recommendation lists show six candidates initially and can expand without discarding results.
- Feasibility, warning, and reason codes are mapped to traveler-facing Vietnamese labels.
- Loading, empty, validation, recommendation-error, preview-error, dirty, and save states remain inside the same visual system.
- The traveler surface uses light cards, teal accents, restrained state colors, and responsive timeline/map controls.

## Remaining Limitations

- The large-map line is a straight illustrative connection between POI coordinates, not road-network routing.
- Opening hours, travel time, visit duration, ratings, and distances remain unknown or estimated when the approved backend data does not provide them.
- Authenticated save/open persistence requires a real Firebase user session; guest users receive the sign-in gate without losing the current trip.
- The deployed backend CORS allowlist accepts the production Vercel origin but not localhost. Local browser validation used the real deployed responses through a test-only Origin-stripping relay; no mock POI data was used.
