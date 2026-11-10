## Current final-integration status - 2026-11-10

Integration branches are published. GitHub CLI 2.103.3 is now securely authenticated via Windows keyring; PR creation and remote checks are in progress. Earlier local-only/permission verdicts below are historical. See [final integration record](NAVIGO_FINAL_INTEGRATION.md) for current tests, technology preservation, backups and deployment gates. No merge or cleanup performed.

---

## Historical audit record (superseded where noted above)

# NaviGo repository audit — FE

Audit date: 2026-11-10 (Asia/Saigon). Scope: the two explicitly named repositories only.

- Frontend: https://github.com/nhatnguyen1607/POI-urban-danang-FE (main 3914e1c7b335deccb3d7c2c8162cac2dacb9864e).
- Backend: https://github.com/nhatnguyen1607/POI-urban-danang-BE (main be6d21ae31dfc9c74f7e4b56e87a23e4df10342a).
- Default branch: main in both; connector reports pull/push true, admin/maintain false.
- Fresh full Git clones with remote branches and tags; integration branch:
  `integration/navigo-audit-2026-11-10`. Main is never checked out for edits.
- Original workspace is unrelated `Vuz14/CD1_finance`, main with existing research
  changes/untracked files. Those files were not changed or committed.
- All branch and PR pages have fewer than 100 records: FE 21 branches / 20 PRs;
  BE 49 branches / 43 PRs. All 63 historical PRs merged; zero open or closed-unmerged.
- Branch protected flags false; main retained as PROTECTED by maintenance policy.
  Repository rulesets read returned empty. Administrative protection details unavailable.
- Tags: integrated-demo-2026-08, phase0/canonical-baseline.
- GitHub releases: none on either repository. FE Vercel main status success;
  BE main validate-and-deploy check success. These are historical checks, not new PR checks.

## Branch inventory

Ahead/behind is relative to the fetched main. Unique commits are raw ancestry
counts, not proof of missing content. Patch IDs and file-level differences were
checked separately. Full branch tips, merge-base and commit evidence follow.

| Repository | Branch | SHA | Ahead/Behind | Unique commits | PR status | Classification | Action |
|---|---|---|---|---|---|---|---|
| FE | `demo/2026-08-07-end-to-end` | `791fa7e3f81718a0dd2bd4f3395603603d3f2152` | 1/57 | 1 | none | UNMERGED_OBSOLETE | Keep; superseded by current traveler UI |
| FE | `docs/multi-source-poi-governance` | `3fba7cce8823fef63b1b8e42a93ee46120948ab3` | 0/58 | 0 | #2 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `feat/complete-demo-web` | `b7b212e2367badb5cf9444bc4dd9f3f830845d0f` | 0/14 | 0 | #15 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `feat/phase6-p1-partner-readiness` | `a06aa3642e9d156808c739e5ae0275000b3cf96c` | 0/1 | 0 | #20 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `feat/phase6-trust-freshness-resilience` | `a6bd806f3ebca3f833f709b57171ef35e58f9fc9` | 0/5 | 0 | #18 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `feat/urban-agent-productization` | `c579ae848102488476f6b92c1f61307d1df71d2b` | 0/52 | 0 | #4 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `fix/code-native-entry-preloader` | `6d9d1b1bd99cada9d553fdc6d82313fe571f100e` | 0/12 | 0 | #16 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `fix/feedback-image-upload-performance` | `c4e02b2d29e61408c91d17ea75399d0bd7c921d8` | 0/3 | 0 | #19 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `fix/full-route-external-place-search-ui-cleanup` | `14845334e04500755d70bba2a9a4825c0c40d2d8` | 0/25 | 0 | #14 merged, #13 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `fix/production-demo-auth-search-validation` | `4cbbad721df39a5088e3aca24f0a2a9b87877608` | 0/10 | 0 | #17 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `main` | `3914e1c7b335deccb3d7c2c8162cac2dacb9864e` | 0/0 | 0 | none | PROTECTED | Keep; deployment use not fully verified |
| FE | `phase0/canonical-baseline` | `f42c937382818d066264c103e41da8452b884f6b` | 0/60 | 0 | #1 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase2/batch4-itinerary-editing` | `44e8ddfeee40a661408581734c3fc16bdd20cbb6` | 0/50 | 0 | #5 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase2/batch5-trip-persistence` | `63605560cf6bdb7d99ebc1e9ba3c67761a188d30` | 0/48 | 0 | #6 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase2/batch6-trip-lifecycle` | `07fed5efe08ae90e5ec4d9c3e310dd57981cc43d` | 0/46 | 0 | #7 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase3/traveler-frontend-rebuild` | `80e0677b34b6a197e5a88438735aa1a1126f0e83` | 0/44 | 0 | #8 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase5/base44-ui-integration` | `a173043393076fdbefe70f5135664e454d59124c` | 0/19 | 0 | none | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase5/stage5a-product-e2e` | `6ced6d4ddc133dea77123016ceed329d029371b2` | 0/40 | 0 | #9 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase5/stage5d1-agent-scheduler-unification` | `c7d87678ddaf781f08a7c596ed69ca7b30bd611e` | 0/31 | 0 | #12 merged, #11 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `phase5/stage5d-frontend-unification` | `2c50b87fdc011d2e410b78846a8c48e6aea3c0fb` | 0/38 | 0 | #10 merged | FULLY_MERGED | Keep; deployment use not fully verified |
| FE | `release/integrated-demo-2026-08` | `33836094146816e881d8737d83b0a5fb5dddbe29` | 0/55 | 0 | #3 merged | FULLY_MERGED | Keep; deployment use not fully verified |

## Unique-commit evidence and content decisions

### demo/2026-08-07-end-to-end

Merge base: `7127e662c3d0077a46121dadb69ed2527aecded9`.

- `791fa7e3f81718a0dd2bd4f3395603603d3f2152 feat(demo): add traveler planning interface`

Patch comparison (`-` means equivalent patch already on main):

- `+ 791fa7e3f81718a0dd2bd4f3395603603d3f2152`

Unique files: .env.example, src/App.tsx, src/pages/demo/DemoTripPlannerPage.tsx. Current App redirects /demo to /urban-agent; current planner supports the same day-window flow plus saving, maps, replan and temporary places. Old route tree would regress current entry/auth design. Retain branch as superseded historical work.

## Complete PR history

| PR | Head branch | Head SHA | State | Merge commit |
|---|---|---|---|---|
| [#1](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/1) | `phase0/canonical-baseline` | `f42c937382818d066264c103e41da8452b884f6b` | MERGED | `71778b9d20d38c489dee9c334d254257c01f9897` |
| [#2](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/2) | `docs/multi-source-poi-governance` | `3fba7cce8823fef63b1b8e42a93ee46120948ab3` | MERGED | `7127e662c3d0077a46121dadb69ed2527aecded9` |
| [#3](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/3) | `release/integrated-demo-2026-08` | `33836094146816e881d8737d83b0a5fb5dddbe29` | MERGED | `f18da52f0215a291079480be0d507588f2a8d9d1` |
| [#4](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/4) | `feat/urban-agent-productization` | `c579ae848102488476f6b92c1f61307d1df71d2b` | MERGED | `31fc059bdc6eb8da95d76227b56c76ba0349786b` |
| [#5](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/5) | `phase2/batch4-itinerary-editing` | `44e8ddfeee40a661408581734c3fc16bdd20cbb6` | MERGED | `fc4553ac794668ddca26c55059a5919e93cdc53a` |
| [#6](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/6) | `phase2/batch5-trip-persistence` | `63605560cf6bdb7d99ebc1e9ba3c67761a188d30` | MERGED | `5db0d8dacc2ee22dd18606a7f95c35ed09715671` |
| [#7](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/7) | `phase2/batch6-trip-lifecycle` | `07fed5efe08ae90e5ec4d9c3e310dd57981cc43d` | MERGED | `e0c75bed038befbc53dd35a9ba26b447eafd6649` |
| [#8](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/8) | `phase3/traveler-frontend-rebuild` | `80e0677b34b6a197e5a88438735aa1a1126f0e83` | MERGED | `cee27be8eca27f4edcbcc3a7ef09e0b73c0f05e1` |
| [#9](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/9) | `phase5/stage5a-product-e2e` | `6ced6d4ddc133dea77123016ceed329d029371b2` | MERGED | `44ba7a323a966cba034df47ede1a57cfcf620c1a` |
| [#10](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/10) | `phase5/stage5d-frontend-unification` | `2c50b87fdc011d2e410b78846a8c48e6aea3c0fb` | MERGED | `63696081bcc55957d10a891ecef0f0aefd46c372` |
| [#11](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/11) | `phase5/stage5d1-agent-scheduler-unification` | `9e409157fa27c85c0b953459258b0a09641b8da2` | MERGED | `b97d2da9b18a27d5b9f9d4b302af10fad8f97c46` |
| [#12](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/12) | `phase5/stage5d1-agent-scheduler-unification` | `c7d87678ddaf781f08a7c596ed69ca7b30bd611e` | MERGED | `5040c0e3a886946a59705d625bd7958487a56999` |
| [#13](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/13) | `fix/full-route-external-place-search-ui-cleanup` | `b3334fd01f1b0f713c80d4b5c226b5d8b01725da` | MERGED | `b3294879ce68e321913f59756b7cf8672963be7b` |
| [#14](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/14) | `fix/full-route-external-place-search-ui-cleanup` | `9289409fad59c25eea0b2dd781469cabe2511cc3` | MERGED | `0c2380ecfa8ada6f496038e82813e9a37601541d` |
| [#15](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/15) | `feat/complete-demo-web` | `b7b212e2367badb5cf9444bc4dd9f3f830845d0f` | MERGED | `62ef21e966b0943b3359b42cf83fbbb3e0acaf1a` |
| [#16](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/16) | `fix/code-native-entry-preloader` | `6d9d1b1bd99cada9d553fdc6d82313fe571f100e` | MERGED | `570e661a4c76a0f5168925eaa805745a66167432` |
| [#17](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/17) | `fix/production-demo-auth-search-validation` | `4cbbad721df39a5088e3aca24f0a2a9b87877608` | MERGED | `a14c852640c97d13dac04d866f5887e9509e3ff7` |
| [#18](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/18) | `feat/phase6-trust-freshness-resilience` | `a6bd806f3ebca3f833f709b57171ef35e58f9fc9` | MERGED | `c02b7492736cc4a80ea6d69e650287cd463e5c28` |
| [#19](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/19) | `fix/feedback-image-upload-performance` | `c4e02b2d29e61408c91d17ea75399d0bd7c921d8` | MERGED | `e0f2d5e800eb4fd9361e62ef4a7f3812c758565e` |
| [#20](https://github.com/nhatnguyen1607/POI-urban-danang-FE/pull/20) | `feat/phase6-p1-partner-readiness` | `a06aa3642e9d156808c739e5ae0275000b3cf96c` | MERGED | `3914e1c7b335deccb3d7c2c8162cac2dacb9864e` |


## Remote publication blocked — verified connector response

Final verdict: **BLOCKED_BY_PERMISSIONS**.

- FE GitHub Git Trees create call returned HTTP 403: Resource not accessible by integration.
- BE GitHub Git Blobs create call returned HTTP 403: Resource not accessible by integration.
- Repository metadata advertised push=true, but the actual object-write operations
  are denied. No inference is made that repository-owner permission is missing;
  the connected integration's effective write capability is insufficient.
- No remote branch or commit was created; no push, PR creation, merge, workflow
  dispatch, production deployment or deletion occurred. No PR URL exists.
- Two local integration branches contain the reviewable changes. Patch files and
  prepared PR descriptions are available in the enclosing navigo-audit directory.
- FE main remains 3914e1c7b335deccb3d7c2c8162cac2dacb9864e;
  BE main remains be6d21ae31dfc9c74f7e4b56e87a23e4df10342a.
- To publish, restore effective Contents write and Pull requests write access for
  the GitHub integration to both named repositories. Do not bypass repository
  protection or use force push. Recheck current main before publishing.
- Even after access is restored, main merge would trigger deployment. This task
  prohibits automatic production deploy; no automatic merge is proposed.
