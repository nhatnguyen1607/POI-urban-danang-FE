# Phase 5 Stage 5D.1 - Agent and Scheduler Unification

## Result

Stage 5D.1 keeps the modern `/urban-agent` traveler experience and reconnects
the useful actions that existed before the Stage 5D frontend unification. It
does not restore the legacy visual page or introduce a second planning engine.

## Unified Flow

- `Tao lich trinh` discovers candidates and builds the active itinerary through
  the existing Traveler API v2 recommendation and trip-preview contracts.
- `Goi y them dia diem` presents additional candidates after a trip exists.
- Adding or removing a POI immediately submits the updated include/exclude
  constraints to the same trip-preview scheduler.
- Manual reorder and input changes mark the itinerary as needing recalculation;
  `Cap nhat lich trinh` rebuilds it from the current traveler state.
- Dates, per-day windows, pace, transport, maximum stops, itinerary, and map all
  share one active state model.

## Restored Historical Capabilities

- Google Maps navigation links with the selected POI coordinates.
- The historical Grab booking deep link with destination context and optional
  browser-GPS pickup context.
- The authenticated `/api/route` road-route action and expert warnings.
- Contextual POI feedback that never interrupts planning.

The old page, duplicated legacy itinerary state, and disconnected multimodal
result list were not restored.

## Routing Truthfulness

The day map continues to label straight connections as illustrative and travel
times as estimates. The route modal labels `/api/route` output as a road-route
reference and offers Google Maps for active navigation. Missing browser origin
or POI coordinates remain unknown; no Da Nang-center coordinate is substituted.

## Remaining Limitations

- Authenticated route and saved-trip persistence require a real user session;
  automated guest validation must not claim Firebase persistence success.
- External apps still require the user's browser/device to allow Google Maps or
  the Grab URI scheme.
- No explicit pre-Stage 5D replace-stop action was found, so none was invented;
  remove plus add uses the current scheduler instead.
