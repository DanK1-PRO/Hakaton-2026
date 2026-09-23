# Project State

Updated: 2026-09-22 (late evening). Version: 0.1.0 + Danil UI integration branch + offline GIS pack + gap-closure B9/B10/C2/C3/C4 + C1 profile reference.

## Actual State

The repository now contains a working FastAPI / React 18 / PostgreSQL 15 application,
not only source folders. Git origin: https://github.com/DanK1-PRO/Hakaton-2026.git (private).
Private main is published. GitHub run 35509118528 passed verify and containers
for application commit 9d0227c. Evidence: docs/VERIFICATION.md.

Implemented: role-aware JWT/Argon2 login, incidents/search/filter/create/edit,
source-derived classifier (1283 rows), DDS service states and 30-second acknowledgement,
version conflicts, append-only actions, simulated phone, 3 synthetic scenarios,
persistent evaluations, instructor feedback/CSV, admin user creation,
ML mock/local gateway with validated fallback and a separate example service.

Runtime: Docker Compose api/ui/db with migrations and seed. Local Windows alternative
uses real portable PostgreSQL 15 at 55432, UI 5173, API 8000. Data and secrets are ignored.
Python 3.12 was used locally; Docker/CI targets 3.11.

## Evidence

15 pytest cases passed. 8 real-browser tests passed at 1440/390px. After gap-closure: 16 pytest + 22 Playwright.
The browser suite includes a delayed-response regression for the phone/edit version race.
Build/typecheck, Ruff, Python/npm audits passed. Restart preserved saved evaluations.
Separate local ML and failed-ML fallback passed. See docs/VERIFICATION.md and docs/evidence.
Original customer files unchanged and excluded from Git. Source hash manifest exists.
Skills and memory files physically exist, not merely described in a chat.
Skill list includes hackathon-orchestrator, integration-gate, ml-boundary, source-router, vertical-slice-builder. Team handoff specs and a reusable AI-agent start prompt are published under docs/team.
Branch ownership is tracked in docs/team/TEAM_BRANCH_REGISTRY.ru.md: main is Danil's stable base, ml/scoring-experiment is Maxim's ML test branch, ui/sanya-results-admin is Sanya's UI test branch.

Danil branch `ui/danil-integration-review` is the active integrated UI branch. It now combines Danil ARM workspace, Sanya results/admin/filter work and Nikita compatible card-flow improvements. Verification on 2026-09-21 after the UI merge/offline-map pass: frontend build passed, `npx playwright test tests/arm.spec.ts` 8/8 passed, full `npm test` 20/20 passed, backend pytest 15/15 passed, `git diff --check` passed. Pushed UI integration head `b3a9fe9`; GitHub runs 35624475674 and 35624470738 passed.

Latest visual pass on 2026-09-21 tightened fidelity to `Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf`, `СКРИНШОТ ДДСГСИ.docx`, `СКРИНШОТ КАРТОЧКИ 112ГСИ.docx`, plus new `КАРТОЧКА 112.docx` and `СЛУЖБЫ 112.docx`: flatter ARM panels, denser address grid, route/reference service tiles, Card-112 orange action/service bar, bottom blue reaction editor, fully local Moscow `MapPanel`, and training help moved behind `?`. External map APIs/Yandex key flow were removed per closed-contour requirement; the future accurate GIS path is a local OSM/PMTiles/MBTiles package documented in `docs/maps/OFFLINE_MAP_PLAN.ru.md`. Details: `docs/ui/ARM_VISUAL_REFERENCE_PASS.md`.

Full UI audit on 2026-09-22 compared every screen to customer screenshots and fixed: 14-field Card-112 address grid, classifier code in type header, `Класс.: … ;`, trailing feature dots, grey flag chips + amber ЧП + pencil, caller status/result selects, call/overdue timer box, light reaction bar (was dark blue) without operator field, Дата/Время list columns, `оп. ДДС ·` history prefix, mobile service-dock tile collapse, desktop lock-note letter wrap. Console clean; 22 Playwright + 15 pytest green. Evidence: `docs/VERIFICATION.md`, `docs/images/ui-audit-*.png`.

Gap-closure pass on 2026-09-22 evening (team decision, customer will not answer): B9 actor/author names in events+feedback API and UI; B10 non-empty comment required for `completed` (422); C2 `expected_hint` on scenario list + «Методподсказка» UI block; C3 reference-only service tiles with tooltips/aria; C4 educational-vs-combat tooltips on disabled ЧС/ЧП and caller status selects. All A/B/C/D/E gaps reclassified in `docs/OPEN_QUESTIONS.md` with new labels `TEAM_DECISION` (team closed, no official confirmation) and `CLOSED` (closed by implementation). Contracts regenerated: `config/openapi.json`, Action/Feedback resolved names, Scenario `expected_hint`. Evidence: pytest 16/16, Playwright 22/22, typecheck+build, `scripts/export_contracts.py`; `docs/VERIFICATION.md`, `docs/data/DATA_CONTRACT.md`.

Follow-up on 2026-09-22 late evening closed C1: wired previously orphaned `frontend/src/domain/ddsProfiles.ts` into the Training screen as «Профиль моей ДДС» (`data-testid="dds-profile-band"`: Select profile, zone/reacton/reject/focus panel, localStorage `dds_profile_id`). `docs/OPEN_QUESTIONS.md` C1 → `CLOSED`, matching `docs/SIMULATION_PLAYBOOK.ru.md`. Cover assertions in `frontend/tests/flow.spec.ts`. TEAM_PROPOSAL catalog, not a customer order.

Sanya branch `origin/ui/sanya-results-admin` has been integrated into Danil's UI branch. Its results/admin/filter work is included; screenshots were regenerated after the common merge.

Branch integration stitches are tracked in `docs/team/INTEGRATION_STITCHES.ru.md` (all stitches resolved).

Additional non-UI branches seen on origin: `LocalAPI`, `hht`, updated `ml/scoring-experiment`. Treat them as unreviewed until inspected.

Nikita branch `origin/ui/nikita-card-flow` has been integrated manually into Danil's UI branch. The ARM workspace remains the source-like base; compatible loading/empty states, Timeline colors and locked-state tests were carried forward. Old card visual styles were rejected.

Offline GIS pack is live in `MapPanel`: local `frontend/public/maps/moscow.pmtiles` (75.9 MB, planetiler bounds Moscow, ODbL attribution), MapLibre + pmtiles protocol, Vite range middleware for dev/preview, glyphs under `public/maps/fonts`. Verified 2026-09-22: preview prod-bundle green after copying `maplibre-gl-shared.mjs` alongside worker (missing shared made worker import HTML via SPA fallback and tiles stuck in loading). `map-gis.spec.ts` covers OSM/PMTiles tag, ODbL and large 206 tile response on both 5173 and 4173. Evidence: docs/VERIFICATION.md, docs/images/map-gis-check.png, docs/maps/OFFLINE_MAP_PLAN.ru.md.

Before ML, useful non-ML work is tracked in `docs/team/PRE_ML_WORKLIST.ru.md`: UI branch cleanup is complete for Danil/Sanya/Nikita; gap-closure B9/B10/C2/C3/C4 and C1 profile reference complete; remaining pre-ML items are ML input/output contracts. Local map pack is done.

## Important Boundaries

Do not claim full general customer-spec acceptance. Customer materials are exhausted;
remaining gaps are closed as `TEAM_DECISION` (see `docs/OPEN_QUESTIONS.md`), not as
official rules. Real ASR/SIP/ML weights, groups,
advanced analytics, field encryption and large-scale load acceptance are not implemented.
No official numeric scoring rubric; result score=null. Scenario references require review.
Tickets PDF remains scanned and not a completed scenario corpus.
Standalone EDDS manual absent; direct DDS memo/screenshots used.
Conditional classifier routing is preserved as reference data, not silently interpreted.

## Continue

Read TASK_QUEUE, DECISIONS and docs/ML_INTEGRATION.md. Preserve working APIs.
Only inspect relevant source pages and files. Do not re-scaffold or rebuild the architecture.
OPEN_QUESTIONS is now mostly TEAM_DECISION/CLOSED; do not reopen gaps without new customer materials.

If Danil mentions opencode / UI part, start from HANDOFF_OPENCODE_UI.md (scope, commits, file map, evidence).
