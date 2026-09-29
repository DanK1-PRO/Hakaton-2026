# Project State

## Current checkpoint: 2026-09-29 clean service dock after status save

Danil reported two presentation issues after the timer fix: the black tooltip `Сохранить
статус` could remain visible after saving a reaction, and a blue active service tile could
show an external route/service such as `Полиция`, which made the trainee look like they
were working inside Police instead of a DDS workplace. Frontend-only fix: removed Tooltip
portals from the reaction modal save/cancel buttons and the dock edit button; `ServiceDock`
now keeps the active blue tile as `ДДС учебного района` unless the scenario explicitly names
a DDS service, while non-DDS `scenario.service` is shown as a direction/reference recipient.
Regression coverage: ARM test asserts the active service tile is DDS; flow test asserts no
visible `Сохранить статус` tooltip remains after status save. Verification 2026-09-29:
frontend typecheck/build passed, targeted desktop/mobile flow passed, full Playwright 30/30
passed. Backend unchanged.

## Previous checkpoint: 2026-09-29 readable ARM timing SLA indicators

Bug report from Danil after the OpenCode finalization: the time block looked like two
running stopwatches and was unclear (`Карточка открыта: 0.1 с / 30 с`, `Первая запись:
14.0 с / 3 мин`, result metric `Нет`). The server timing logic from the previous fix
remains unchanged. UI fix: `frontend/src/workspace.tsx` now renders two semantic SLA
chips instead of two identical timers. `Открытие` is a fixed acknowledgement result with
the 30-second norm; `Первая запись` shows remaining time, overdue duration, completed
duration, or `не внесена` after the session is locked. `frontend/src/components.tsx`
uses explicit result labels (`получение карточки`, `первая запись статуса`, `Не
внесена`). CSS moved from `.arm-ack` to `.arm-sla`; `frontend/tests/flow.spec.ts`
covers the new copy and frozen terminal state. Verification 2026-09-29: frontend
typecheck/build passed, targeted timer regression passed, full Playwright 30/30 passed,
Ruff passed, backend pytest 42/42 passed. Screenshots in `docs/images` were refreshed.

## Previous checkpoint: 2026-09-29 workspace timer freeze after session finish

Bug report: counters kept ticking after «Завершить занятие» (chip «Первая запись» showed
240.1 s on a 02:35 session). Cause in `frontend/src/workspace.tsx`: the fallback was
`now - created_at` for any card without a comment-bearing reaction, so it ignored
`locked`/`finished_at`. Fix: freeze the fallback at `finished_at` (or at `updated_at`
when locked), render `нет` instead of a growing value after editing closes, add
`Incident.finished_at` to `frontend/src/types.ts`. Verification 2026-09-29: frontend
production build passed; Playwright 30/30 desktop+mobile including the regression test
`first record timer stops once the session is finished`; backend Ruff/pytest 42
untouched. Shipped as commits 8a271fa (fix), 2a77631 and f30ab5a (GPL-3.0 + IP notice);
CI runs 70 and 71 green, GitHub detects the repository as GPL-3.0.

## Previous checkpoint: 2026-09-29 instructor scenario generation loop

Danil chose the "full cycle inside the instructor UI" variant: preview variants from the
local model, approve only the selected ones, import them with reviewer provenance.
Implemented without touching the ML boundary — React still calls FastAPI only. New staff
endpoints `POST /api/v1/instructor/scenarios/generate` and `.../import`; shared package
validation in `backend/app/scenario_packages.py` (the CLI import script now imports it);
separate ML contract `POST /v1/generate` on `ml/evaluator_service.py` advertised as
capability `scenario_generator`; gateway `generate_scenarios` with `ML_GENERATE_TIMEOUT`
(default 400 s) and `GenerationUnavailable` → HTTP 503 with a Russian detail string.
Frontend: `frontend/src/generator.tsx` (`ScenarioLab`) in the staff «Контроль занятий»
header, RTK Query mutations plus the new `Scenarios` cache tag, difficulty/source label
fixes on the training list and the workspace scenario panel.

Verification 2026-09-29: Ruff passed; backend pytest 42/42; frontend production build
passed; Playwright 28/28 including the new `scenario-lab.spec.ts` with mocked ML routes;
contracts regenerated with `scripts/export_contracts.py`. Real local run: one scenario
generated in about 5 s through the API at `ML_MODE=local`, imported into PostgreSQL with
`source.status=TEAM_REVIEWED` and reviewer name, duplicate import returned 409 «Уже
импортированы», then the test row was removed so the demo catalogue still holds the
original 3 scenarios. Evidence: `docs/VERIFICATION.md`, `docs/ML_INTEGRATION.md`,
`docs/data/DATA_CONTRACT.md`. Published in commits 75dfd02 and bd11a23 after the
repository was made public.

## Earlier checkpoint: 2026-09-28 product delivery cleanup

New customer-wow pass added a product readiness dashboard and richer ML result explanation.
`/readiness` summarizes local deployment, API/PostgreSQL, ML mode, closed offline map,
classifier size, scenario count, completed sessions, teacher feedback and the delivery
document set. `Result` now shows the checking mode, experimental score, model version,
comment-quality explanation and strengths/improvements when provided by the local evaluator.
Browser coverage now includes the readiness dashboard and ML insight; screenshots include
`docs/images/readiness.png`. Verification for this pass: Ruff passed, backend pytest 34/34
passed, frontend build passed, Playwright 24/24 passed on desktop/mobile. This is a
demonstration-value layer and does not claim real telephony, official scoring, certified
security, exact geocoding or automatic retraining.

The product-facing cleanup pass removed development wording from visible UI labels and
tooltips: no user-visible `TEAM_PROPOSAL`, `Методподсказка`, `не подключено`,
`не передаётся API` or map `console.debug` remains in `frontend/src`. The ARM screen,
service dock, map panel, training profile and footer now describe the simulator as a
closed training product rather than unfinished wiring. Added
`docs/FINAL_DELIVERY_CHECKLIST.ru.md` and linked it from README, docs index and submission
packet so reviewers can launch the repository on Docker or a clean Windows/native VM.
Verification after this cleanup: Ruff passed, backend pytest 34/34 passed, frontend
production build passed, Playwright 22/22 desktop+mobile passed, local API health returned
`status=ok`, `database=ok`, `ml_mode=local`, and UI returned HTTP 200. Screenshots in
`docs/images` were refreshed by the browser suite. Do not reopen branch merges or ML
integration unless Danil asks for a new feature pass.

## Earlier checkpoint: 2026-09-28 final integration pass

Current branch is main. Published application revision: c55103c36751aa2a31da33bfd8a29574c3304e68.
GitHub CI 36462902808 passed both verify and containers. Final report-only commit
uses [skip ci]; the application revision remains the one above.
UI and selected ML runtime modules are already integrated; do not repeat branch merges.
Real Kirill GGUF release is downloaded, SHA-256 verified and assembled under ignored
.runtime/models. Actual llama.cpp b11223 inference on RTX4060 passed the API/DB
concurrent-finish and evaluator-outage test: docs/evidence/real-ml-integration.json.
New changes fix opening timing, upstream 112 field permissions, ML reference/mode/score
validation, authoritative timing, loopback comment LLM adapter, DDS generator prompt,
reviewed scenario import and instructor JSONL export. Map geocoding remains approximate
and is now explicitly labelled. New ML launchers use .venv-ml with no runtime installs.
Read docs/FINAL_INTEGRATION_AUDIT.ru.md and docs/LOCAL_ML_RUN.ru.md for current details.
Final local gate: 34 backend tests, Ruff, production build and 22 browser tests passed.
Real generator produced one scenario; import dry validation passed without DB changes.
Publication and integration verification are complete for this audited revision.
Native UI 5173/API 8000/evaluator 8090/LLM 8091 were restarted and health-checked.
Team follow-up: methodology/scenario review, presentation/screencast and jury access;
see docs/SUBMISSION.ru.md. Voice, fine-tuning and exact geocoding remain explicit gaps,
not automatically authorized new goals. Do not redownload weights, repeat merges or
re-extract the full customer archive on resume.
Historical notes below are evidence of earlier states, not current completion claims.

Updated: 2026-09-27. Version: 0.1.0 + Danil UI integration branch + offline GIS pack + customer DDS clarifications + local ML evaluator integration.

## Actual State

The repository now contains a working FastAPI / React 18 / PostgreSQL 15 application,
not only source folders. Git origin: https://github.com/DanK1-PRO/Hakaton-2026.git (public).
Main is published. GitHub run 35509118528 passed verify and containers
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

Additional non-UI branches seen on origin: `LocalAPI`, `hht`, updated `ml/scoring-experiment`. Treat them as unreviewed until inspected. When Danil asks to start ML branch review, inspect all non-UI branches, not only `ml/scoring-experiment`, because Kirill may create extra working branches for convenience. Current snapshot on 2026-09-27: `origin/LocalAPI`, `origin/hht`, `origin/ml/scoring-experiment`, plus `origin/main`; UI branches are already separate and should not be re-reviewed as ML work.

Nikita branch `origin/ui/nikita-card-flow` has been integrated manually into Danil's UI branch. The ARM workspace remains the source-like base; compatible loading/empty states, Timeline colors and locked-state tests were carried forward. Old card visual styles were rejected.

Offline GIS pack is live in `MapPanel`: local `frontend/public/maps/moscow.pmtiles` (75.9 MB, planetiler bounds Moscow, ODbL attribution), MapLibre + pmtiles protocol, Vite range middleware for dev/preview, glyphs under `public/maps/fonts`. Verified 2026-09-22: preview prod-bundle green after copying `maplibre-gl-shared.mjs` alongside worker (missing shared made worker import HTML via SPA fallback and tiles stuck in loading). `map-gis.spec.ts` covers OSM/PMTiles tag, ODbL and large 206 tile response on both 5173 and 4173. Evidence: docs/VERIFICATION.md, docs/images/map-gis-check.png, docs/maps/OFFLINE_MAP_PLAN.ru.md.

Before ML, useful non-ML work is tracked in `docs/team/PRE_ML_WORKLIST.ru.md`: UI branch cleanup is complete for Danil/Sanya/Nikita; gap-closure B9/B10/C2/C3/C4 and C1 profile reference complete; remaining pre-ML items are ML input/output contracts. Local map pack is done.

## Important Boundaries

Do not claim full general customer-spec acceptance. Customer materials are exhausted;
remaining gaps are closed as `TEAM_DECISION` (see `docs/OPEN_QUESTIONS.md`), not as
official rules. Real ASR/SIP, groups,
advanced analytics, field encryption and large-scale load acceptance are not implemented;
real local ML weights are integrated behind the gateway (docs/ML_INTEGRATION.md).
No official numeric scoring rubric; the shown score is experimental. Scenario references require review.
Tickets PDF remains scanned and not a completed scenario corpus.
Standalone EDDS manual absent; direct DDS memo/screenshots used.
Conditional classifier routing is preserved as reference data, not silently interpreted.

## Continue

Read TASK_QUEUE, DECISIONS and docs/ML_INTEGRATION.md. Preserve working APIs.
Only inspect relevant source pages and files. Do not re-scaffold or rebuild the architecture.
OPEN_QUESTIONS is now mostly TEAM_DECISION/CLOSED; do not reopen gaps without new customer materials.

If Danil mentions opencode / UI part, start from HANDOFF_OPENCODE_UI.md (scope, commits, file map, evidence).

Codex follow-up on 2026-09-27 reviewed the opencode UI handoff without touching ML branches. Local verification on the current `ui/danil-integration-review` head: `npm run build` passed, backend pytest 17/17 passed, `scripts/windows/start-app.ps1` brought up DB/API/UI, repeated frontend `npm test` passed 22/22 including `map-gis.spec.ts`, and `git diff --check` passed. The first Playwright attempt failed only because local API/UI were stopped (`ECONNREFUSED 127.0.0.1:5173`). Fresh screenshots were regenerated in `docs/images/*`; `ML_MODE=mock` remains the regression path until Kirill/Maxim ML branches are ready.

New informal customer clarifications from Danil on 2026-09-27 are captured in `docs/customer/CUSTOMER_INFORMAL_ANSWERS_2026_09_27.ru.md`. Applied to the UI/backend slice: 30s from message/card appearance to open/acknowledge remains; 3 minutes to first status record with text is now tracked as `first_response_seconds` / `first_response_deadline_seconds=180` and scored by mock/fallback evaluator; DDS status cycle and help copy are updated; edit modal now clarifies that DDS does not validate the original 112 applicant card; service reference copy now says DDS brigades are selected manually by service area/subordination. Verification: backend pytest 18/18, frontend `npm test` 22/22, build passed, contracts exported. ML branches were not touched.

ML branch review started after Danil confirmed ML branches are ready. Fetched `origin/ml_end`, `origin/model`, tag/release `modelURL`; confirmed `origin/ml_end` duplicates `origin/ml/scoring-experiment` at `37ef873`, while `origin/model`/tag `modelURL` point at old `main` `e5294d3`. Release `vModel` contains 7 external GGUF parts (`GigaChat3.1-10B-A1.8B-q4_K_M.part01..part07.gguf`, about 6.03 GB total) and is documented, not downloaded into Git. `LocalAPI` and `hht` were inspected but not runtime-merged because they are separate stub/minimal trees that would delete current UI/API files if merged directly; see `docs/team/ML_BRANCH_REVIEW.ru.md`. Runtime integration now includes `ml.evaluator_service:app`, generator scripts and classifier-derived scenarios from `ml/scoring-experiment`, adapted to current evaluation contract and the 3-minute first-response rule. Verification so far: Ruff backend/ml/scripts passed, backend pytest 20/20 passed, new ML evaluator contract tests 2/2 passed, `scripts/verify_local_ml.py` passed with observed modes `local` then `fallback`.
