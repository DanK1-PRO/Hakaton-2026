# Task Queue

Updated: 2026-09-22.

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
2. Review synthetic scenario references and conditional routing with instructor/customer.
3. Connect the delivered model package behind the gateway; retain mock regression tests.
4. Demonstrate unified deployment on one machine, including model failure/recovery.
5. Only after approval, choose enhancements from OPEN_QUESTIONS.

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
- [ ] Review Maxim `ml/scoring-experiment` after UI branches are stable; preserve `ML_MODE=mock` as regression path.
