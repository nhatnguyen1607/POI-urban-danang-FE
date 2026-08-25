# UrbanAgent Admin Capability Matrix

Status: UI architecture implemented; production admin authorization is not yet available.

`ADMIN_AUTH_BACKEND_REQUIRED`

The current frontend role and local development admin session are not a trusted
authorization boundary. The new Admin UI therefore reads only safe public health
and POI-quality contracts. It does not call the existing privileged-looking
endpoints because those routes currently require authentication but do not enforce
an administrator claim or equivalent server-side policy.

| Feature | Current UI Support | Current Data Source | Read Supported? | Write Supported? | Backend/Admin API Required? | Security Note |
| --- | --- | --- | --- | --- | --- | --- |
| Overview | Yes | `/api/pois/data-quality`, `/api/health/firebase` | Partial | No | Yes, for product metrics | Values without a verified source render as `—`; no metrics are fabricated. |
| Users | Safe unavailable state | None used | No | No | Yes | Browser does not query Firebase Auth users. Owner identity and admin authorization must be server-enforced. |
| Canonical POI summary | Yes | `/api/pois/data-quality` | Yes, aggregate only | No | Yes, for row-level management | The canonical count and schema status are public quality values. Canonical data is not changed. |
| Candidate POI | Safe unavailable state | None used | No | No | Yes | Candidate/review data requires an approved, server-authorized Admin API. |
| Temporary/external places | Safe unavailable state | None used | No | No | Yes | User-scoped or provider-restricted payloads must not be exposed globally. |
| Data sync | Disabled | None used | No | No | Yes | No client-only sync action is provided. |
| Trips and saved trips | Safe unavailable state | None used | No global read | No | Yes | Existing saved-trip contracts are owner-scoped and are not reused for global admin access. |
| Route status | Safe unavailable state | None used | No | No | Yes | A safe aggregate route-status contract is required. |
| Analytics | Safe unavailable state | None used | No | No | Yes | No fake charts or counts are rendered. |
| AI and Agent activity | Safe unavailable state | None used | No | No | Yes | Request, token, cost, and failure telemetry require a filtered Admin API. |
| Google Maps integration | Yes | Approved project status constant | Status only | No | Yes, for live health | Truthful state remains `GOOGLE_LIVE_CONFIGURATION_PENDING`; no key is shown. |
| Photon integration | Yes | No dedicated health contract | Unknown only | No | Yes | UI does not probe an external provider directly. |
| OSRM integration | Yes | No dedicated health contract | Unknown only | No | Yes | UI does not claim road-routing health without a contract. |
| Firebase integration | Yes | `/api/health/firebase` | Readiness flags only | No | Yes, for secure admin auth | Project IDs, environment values, keys, and tokens are not rendered. |
| System health | Yes | Safe public health/quality endpoints | Partial | No | Yes, for jobs and uptime | No uptime percentage is invented. |
| Logs | Safe unavailable state | None used | No | No | Yes | Console output, credentials, authorization headers, and internal payloads are not exposed. |
| Settings | Yes, browser language only | Existing language context/local preference | Yes | Safe local setting only | Yes, for server settings | Server configuration remains read-only and secret values are never sent to the browser. |

## Required Backend Boundary

Before Admin can manage production data, the backend must add a trusted identity
and authorization boundary, such as Firebase custom claims verified by server
middleware or an equivalent server-owned role contract. Every Admin read and write
route must enforce that boundary; hiding navigation or storing a role in the browser
is not authorization.
