# Task Queue

Updated: 2026-09-29.

## Current Final Gate

The historical integration queue below must not trigger repeated merges.

- [x] Final timing/112 field ownership/ML validation fixes; instructor reviewed JSONL export.
- [x] Real release GGUF verified and launched in separate ML environment; API local/fallback and concurrent finish passed.
- [x] Local generation produced one case; reviewed-import dry validation passed without database writes.
- [x] Backend 34 tests, Ruff, contract export, frontend build and 22 desktop/mobile tests passed. (as of 2026-09-28; current gate is 42 backend tests / 30 browser tests — see the 2026-09-29 entries below)
- [x] Native model/evaluator launcher start/stop verified; offline GIS external-request test passed.
- [x] Published application c55103c; GitHub CI 36462902808 verify + containers passed. Later report-only commit uses [skip ci].
- [x] Product-facing cleanup before submission: removed development wording from visible UI, added final delivery checklist, refreshed screenshots, reran Ruff + 34 backend tests + frontend build + 22 browser tests.
- [x] Customer-wow pass: added `/readiness` deployment/value dashboard, richer ML result explanation, updated demo route, refreshed readiness screenshot, verified Ruff + 34 backend tests + frontend build + 24 browser tests.
- [x] Instructor scenario generation loop (2026-09-29): separate `POST /v1/generate` contract with `scenario_generator` capability, gateway `generate_scenarios` + `ML_GENERATE_TIMEOUT`, staff endpoints `/instructor/scenarios/generate|import` sharing `backend/app/scenario_packages.py` validation with the CLI, React `ScenarioLab` preview/approve/import; Ruff + pytest 42 + Playwright 28 + build green; real local-model generation, Postgres import and 409 duplicate path verified.
- [x] Frozen workspace counters after session finish (2026-09-29): `workspace.tsx` stops the "Первая запись"/"Карточка открыта" fallback at `finished_at` (or `updated_at` when locked) and shows `нет` instead of a growing value; `Incident.finished_at` added to types; build + Playwright 30 green with a regression test.
- [x] Readable ARM timing SLA indicators (2026-09-29): replaced two ambiguous stopwatch chips with semantic `Открытие` and `Первая запись` SLA chips, clarified result labels, refreshed screenshots; frontend typecheck/build, targeted timer regression, Playwright 30/30, Ruff and backend pytest 42/42 passed.
- [x] Clean service dock after status save (2026-09-29): removed sticky Tooltip portals from status actions, kept active blue service tile as DDS rather than external service labels like `Полиция`, refreshed screenshots; frontend typecheck/build and Playwright 30/30 passed.
- [ ] Team: approve methodology/scenarios, prepare presentation/screencast before stop-code. The repository is public, so no separate jury access grant is required.

Residual scope and evidence: docs/FINAL_INTEGRATION_AUDIT.ru.md and docs/VERIFICATION.md.

## Implementation Pass

- [x] Source routing, priority resolution, DDS/UI reference inspection.
- [x] Classifier extraction with provenance; source inventory; synthetic scenarios.
- [x] FastAPI, auth/roles, SQLAlchemy/Alembic/PostgreSQL, core simulation APIs.
- [x] Russian React/Ant Design UI and role-specific views.
- [x] Mock/local ML boundary, DTO exports, example local service.
- [x] Docker Compose and native Windows launcher.
- [x] 15 backend tests; 8 desktop/mobile browser tests; build and dependency audits.
- [x] Persistence after full restart and local ML/fallback integration.
- [x] Bilingual README, source traceability, operations/acceptance docs, PDF and screenshots.
- [x] Physical project skills and compact memory.
- [x] Published private main; GitHub run 35509118528 passed both verify and containers.

## Next Team Integration Pass (Not An Automatic New Goal)

1. Agree evaluate v1 and pending generator/ASR contracts with Kirill/Maxim.
2. Review synthetic scenario references and conditional routing with instructor/customer (or accept TEAM_DECISION baseline: 3 scenarios, reference routing).
3. Connect the delivered model package behind the gateway; retain mock regression tests.
4. Demonstrate unified deployment on one machine, including model failure/recovery.
5. Only after approval, choose enhancements from OPEN_QUESTIONS (many now TEAM_DECISION/CLOSED).

Do not auto-implement real telephony, scoring weights, full ticket OCR, encryption,
100-user certification or unrelated UI redesign as part of the completed Danil slice.

## Active Team Integration

- [x] Danil branch `ui/danil-integration-review`: ARM-like DDS workspace layout, conflict-safe edit/reaction flow, service dock, screenshots, and browser coverage.
- [x] Sanya branch `ui/sanya-results-admin`: merged into Danil UI branch; results/admin/filter work retained; screenshots regenerated.
- [x] Nikita branch `ui/nikita-card-flow`: merged manually into Danil UI branch; ARM workspace preserved; compatible loading/Timeline/lock improvements retained.
- [x] Local verification after UI merge and offline-map pass: frontend build, 20 browser tests, 15 backend tests, diff check.
- [x] External map API/Yandex flow removed; `MapPanel` now works as local Moscow training map.
- [x] Push integrated UI branch to GitHub: `55844b8`.
- [x] GitHub CI on pushed UI integration head `b3a9fe9`: runs 35624475674 and 35624470738 passed.
- [x] Offline GIS pack: PMTiles Moscow + MapLibre + ODbL + range middleware + `map-gis.spec.ts`; preview prod-bundle fixed by copying `maplibre-gl-shared.mjs`; full suite 22 browser + 15 pytest green.
- [x] Full UI audit vs customer screenshots (2026-09-22): address grid 14 fields, classifier header/code, flag chips, caller selects, call timer, light reaction bar, Дата/Время columns, mobile service-dock fix; 22+15 green.
- [x] Gap-closure pass (2026-09-22 evening, team decision without customer): B9 actor/author names, B10 required comment on completed, C2 expected_hint + Методподсказка UI, C3 reference-only service tile copy, C4 educational-vs-combat tooltips; OPEN_QUESTIONS reclassified with TEAM_DECISION/CLOSED; DATA_CONTRACT + VERIFICATION updated; contracts regenerated; pytest 16 + Playwright 22 + typecheck/build green.
- [x] C1 DDS profile reference on Training screen (2026-09-22 late evening): connect `frontend/src/domain/ddsProfiles.ts`, Select + zone/reacton/focus panel, localStorage persistence; OPEN_QUESTIONS C1 → CLOSED; flow.spec cover; rebuild after stopping vite preview that locked dist/assets.
- [x] Codex review of opencode UI handoff (2026-09-27): build passed, backend pytest 17/17, local DB/API/UI restarted, repeated Playwright 22/22 including offline GIS map; ML branches untouched, `ML_MODE=mock` preserved.
- [x] Integrated informal customer DDS clarifications (2026-09-27): source note saved, 3-minute first status+text timing added to evaluation, UI help/edit/service copy updated for DDS vs 112 boundaries, backend pytest 18/18, frontend Playwright 22/22, build green; ML untouched.
- [x] ML/non-UI branch review started after Danil confirmed readiness: inspected `LocalAPI`, `hht`, `ml/scoring-experiment`, `ml_end`, `model`, tag/release `modelURL`; safely integrated runtime ML evaluator/generator from `ml/scoring-experiment`, documented why `LocalAPI`/`hht` are not direct runtime merges, preserved `ML_MODE=mock` and verified `local`/`fallback` gateway path.
- [x] Combined source integration into main completed before this audit; remaining final publication gate is tracked above.
