# NaviGo branch cleanup preparation — FE

No remote or local branch, tag, release, or repository was deleted. No history
was rewritten. SAFE_TO_DELETE: **0**. All 21 original branches retained.

Ancestry proves 19 FE / 45 BE non-main branches fully merged (64 total).
One BE demo branch is patch-equivalent (3 commits); one FE demo branch has
superseded unique UI; BE OSRM has 2 valuable unmerged commits; BE clean has
3 unrelated commits. Main branches are protected by maintenance policy.
Raw unique ancestry exists on 4 non-main branches; only OSRM has confirmed
missing runtime fixes. Counts exclude the new integration branches.

All merged/equivalent branches are only cleanup candidates. External deployment
branch bindings, webhooks, open work and owner intent are not fully observable.
The local workflow files were inspected; BE main triggers Hugging Face deploy,
and FE has Vercel status. No candidate is asserted safe while these checks are
incomplete. Existing commit refs remain the backup references; tags preserved.

| Repository | Branch | Current SHA | Merge status | Evidence | Backup reference | Proposed action | Risk |
|---|---|---|---|---|---|---|---|
| FE | `demo/2026-08-07-end-to-end` | `791fa7e3f81718a0dd2bd4f3395603603d3f2152` | UNMERGED_OBSOLETE | see repository audit; unresolved or protected | Existing branch at SHA | KEEP | High / protected |
| FE | `docs/multi-source-poi-governance` | `3fba7cce8823fef63b1b8e42a93ee46120948ab3` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `feat/complete-demo-web` | `b7b212e2367badb5cf9444bc4dd9f3f830845d0f` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `feat/phase6-p1-partner-readiness` | `a06aa3642e9d156808c739e5ae0275000b3cf96c` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `feat/phase6-trust-freshness-resilience` | `a6bd806f3ebca3f833f709b57171ef35e58f9fc9` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `feat/urban-agent-productization` | `c579ae848102488476f6b92c1f61307d1df71d2b` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `fix/code-native-entry-preloader` | `6d9d1b1bd99cada9d553fdc6d82313fe571f100e` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `fix/feedback-image-upload-performance` | `c4e02b2d29e61408c91d17ea75399d0bd7c921d8` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `fix/full-route-external-place-search-ui-cleanup` | `14845334e04500755d70bba2a9a4825c0c40d2d8` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `fix/production-demo-auth-search-validation` | `4cbbad721df39a5088e3aca24f0a2a9b87877608` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `main` | `3914e1c7b335deccb3d7c2c8162cac2dacb9864e` | PROTECTED | see repository audit; unresolved or protected | Existing branch at SHA | KEEP | High / protected |
| FE | `phase0/canonical-baseline` | `f42c937382818d066264c103e41da8452b884f6b` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase2/batch4-itinerary-editing` | `44e8ddfeee40a661408581734c3fc16bdd20cbb6` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase2/batch5-trip-persistence` | `63605560cf6bdb7d99ebc1e9ba3c67761a188d30` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase2/batch6-trip-lifecycle` | `07fed5efe08ae90e5ec4d9c3e310dd57981cc43d` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase3/traveler-frontend-rebuild` | `80e0677b34b6a197e5a88438735aa1a1126f0e83` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase5/base44-ui-integration` | `a173043393076fdbefe70f5135664e454d59124c` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase5/stage5a-product-e2e` | `6ced6d4ddc133dea77123016ceed329d029371b2` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase5/stage5d1-agent-scheduler-unification` | `c7d87678ddaf781f08a7c596ed69ca7b30bd611e` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `phase5/stage5d-frontend-unification` | `2c50b87fdc011d2e410b78846a8c48e6aea3c0fb` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |
| FE | `release/integrated-demo-2026-08` | `33836094146816e881d8737d83b0a5fb5dddbe29` | FULLY_MERGED | ancestor of main | Existing branch at SHA | KEEP | Medium: deployment use unknown |

Per-branch changed-file lists, raw unique commits, patch equivalence and tags
at each tip are recorded in `NAVIGO_BRANCH_EVIDENCE.json`. This is public Git
evidence only; deployment bindings remain NOT VERIFIED and every action is KEEP.

Final remote state: original FE 21 / BE 49 branches retained. Both publication attempts were denied before any ref mutation. No remote branch deleted; SAFE_TO_DELETE remains zero. New integration branches exist only locally.
