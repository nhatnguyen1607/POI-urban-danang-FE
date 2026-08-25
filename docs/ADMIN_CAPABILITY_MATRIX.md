# UrbanAgent Admin Capability Matrix

Status: trusted read-only Admin foundation implemented.

`ADMIN_AUTH_BACKEND_REQUIRED: CLOSED`

The browser is not authoritative for Admin access. The centralized frontend
guard requires Firebase authentication and a successful `/api/admin/me` response.
The backend verifies the Firebase ID token and requires the trusted custom claim
`admin: true` before any `/api/admin/*` route can return data.

| Feature | Current UI Support | Current Data Source | Read Supported? | Write Supported? | Backend/Admin API Required? | Security Note |
| --- | --- | --- | --- | --- | --- | --- |
| Admin identity | Yes | `/api/admin/me` | Yes | No | Implemented | Returns only verified UID, email, and `admin: true`. |
| Capabilities | Yes | `/api/admin/capabilities` | Yes | No | Implemented | The UI can distinguish supported read operations from unavailable features. |
| Overview | Yes | `/api/admin/pois/summary`, `/api/admin/health`, `/api/admin/capabilities` | Partial | No | Implemented for current aggregates | Values without a verified source render as `—`; no metrics are fabricated. |
| Users | Yes, paginated | `/api/admin/users` | Yes | No | Implemented | Firebase Auth users are filtered server-side; tokens and raw claims are never returned. |
| Canonical POI summary | Yes | `/api/admin/pois/summary` | Yes, aggregate only | No | Implemented | Canonical count, schema state, repository mode, and quality totals are read-only. |
| Candidate POI | Safe unavailable state | None used | No | No | Yes | Candidate/review data requires an approved, server-authorized Admin API. |
| Temporary/external places | Safe unavailable state | None used | No | No | Yes | User-scoped or provider-restricted payloads must not be exposed globally. |
| Data sync | Disabled | None used | No | No | Yes | No client-only sync action is provided. |
| Trips and saved trips | Safe unavailable state | None used | No global read | No | Yes | Existing saved-trip contracts are owner-scoped and are not reused for global admin access. |
| Route status | Safe unavailable state | None used | No | No | Yes | A safe aggregate route-status contract is required. |
| Analytics | Safe unavailable state | None used | No | No | Yes | No fake charts or counts are rendered. |
| AI and Agent activity | Safe unavailable state | None used | No | No | Yes | Request, token, cost, and failure telemetry require a filtered Admin API. |
| Google Maps integration | Yes | `/api/admin/health` | Status only | No | Implemented | Truthful state remains `GOOGLE_LIVE_CONFIGURATION_PENDING`; no key is shown. |
| Photon integration | Yes | `/api/admin/health` | Configuration state | No | Implemented | The UI does not claim a live check that the backend did not perform. |
| OSRM integration | Yes | `/api/admin/health` | Unknown only | No | Yes, for live health | The UI does not claim road-routing health without a trusted live contract. |
| Firebase integration | Yes | `/api/admin/health` | Readiness flags only | No | Implemented | Project IDs, environment values, keys, and tokens are not rendered. |
| System health | Yes | `/api/admin/health` | Partial | No | Implemented for known states | No uptime percentage is invented. |
| Logs | Safe unavailable state | None used | No | No | Yes | Console output, credentials, authorization headers, and internal payloads are not exposed. |
| Settings | Yes, browser language only | Existing language context/local preference | Yes | Safe local setting only | Yes, for server settings | Server configuration remains read-only and secret values are never sent to the browser. |

## Authorization Boundary

All Admin routes pass through strict Firebase ID-token verification,
`requireAdmin`, and Admin rate limiting. Local storage, frontend roles, URL
manipulation, hardcoded identities, and user-editable Firestore profile roles do
not grant access.

The current backend namespace is intentionally read-only. User mutation, POI
mutation, global trip inspection, analytics, Agent telemetry, logs, and server
configuration remain unsupported until separately designed and approved.
