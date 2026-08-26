# UrbanAgent Base44 design asset inventory

The Base44 export is the authoritative layout source. Its ZIP contains URL
references but no generated image binaries. On 2026-08-25, all eight referenced
`media.db.com` assets were unavailable because the export host did not resolve.
UrbanAgent therefore uses the existing licensed Da Nang WebP set as the bounded
local fallback. This does not change canonical POI data or runtime place records.

| Base44 component | Exported source URL | Local presentation asset | Source pixels | Render behavior |
| --- | --- | --- | ---: | --- |
| `Hero.jsx` | `daf2e86ae_generated_0f214d6d.png` | `my-khe-coastline.webp` | 1920x1440 | Right 58%, full-height cover with left fade |
| `ExploreSection.jsx` | `24272617d_generated_fdc3b2d5.png` | `my-khe-coastline.webp` | 1920x1440 | 4:5 responsive cover |
| `ExploreSection.jsx` | `e902e8226_generated_cd8424a4.png` | `son-tra-peninsula.webp` | 1920x1440 | 4:5 responsive cover |
| `ExploreSection.jsx` | `2f61d6cf9_generated_06032dc0.png` | `dragon-bridge.webp` | 1920x1440 | 4:5 responsive cover |
| `ExploreSection.jsx` | `7eaed5d86_generated_64a3eb9a.png` | `golden-bridge.webp` | 1920x1242 | 4:5 responsive cover |
| `PlanDemo.jsx`, `MapSection.jsx` | `269b34986_generated_921d4a03.png` | Real Leaflet/OSM map already used by UrbanAgent | Responsive | 130px mini map and 420/520px map; route is explicitly illustrative |
| `MoodSection.jsx` coffee cards | `1c0ae9ab6_generated_59ea4cb2.png` unavailable | `coffee-phin.jpg`, `coffee-beach-bar.jpg`, `coffee-garden.jpg` | 1200px thumbnails | Three distinct 4:3 licensed local covers |
| `MoodSection.jsx` local-food cards | `1c0ae9ab6_generated_59ea4cb2.png` unavailable | `food-mi-quang.jpg`, `food-bun-cha-ca.jpg`, `food-banh-trang-cuon.jpg` | 1200px thumbnails | Three distinct 4:3 licensed local covers |
| `MoodSection.jsx` beach cards | `1c0ae9ab6_generated_59ea4cb2.png` unavailable | `my-khe-coastline.webp`, `beach-non-nuoc.jpg`, `beach-nam-o.jpg` | 1200–1920px | Three distinct 4:3 licensed local covers |
| `MoodSection.jsx` nature cards | `1c0ae9ab6_generated_59ea4cb2.png` unavailable | `son-tra-peninsula.webp`, `nature-hai-van.jpg`, `golden-bridge-sunset.webp` | 1200–1920px | Three distinct 4:3 licensed local covers |
| `MoodSection.jsx` nightlife cards | `1c0ae9ab6_generated_59ea4cb2.png` unavailable | `night-fireworks.jpg`, `night-han-river.jpg`, `night-riverwalk.jpg` | 1200px thumbnails | Three distinct 4:3 licensed local covers |
| `CtaSection.jsx` | `4abb58fd6_generated_e35d0ea6.png` | `golden-bridge-sunset.webp` | 1920x2688 | 380/420px cover with dark left fade |

License and source attribution for the local files is recorded in
`ATTRIBUTION.md`. The unavailable Base44 images are not claimed as migrated or
redistributed.
