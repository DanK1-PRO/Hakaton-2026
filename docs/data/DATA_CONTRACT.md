# Data Contract 1.0

OpenAPI: config/openapi.json. Request schemas: config/*.schema.json. Export from code with PYTHONPATH=backend python scripts/export_contracts.py; generated files must match code. Regenerated 2026-09-29 after the instructor scenario generation endpoints.

| Entity | Stable fields / storage |
|---|---|
| User | UUID id, normalized email, name, Argon2 hash, role, active |
| IncidentType | source-row id, external_code, name, features[], routes[], source(file/sheet/row/hash) |
| Scenario | schema_version, id, title, difficulty, source, card, reference, briefing[], expected_hint (list only, `Принять`/`Не принимать`) |
| TrainingSession | UUID, owner, scenario, status, started_at, finished_at, evaluation JSON |
| Incident | owner/session, caller_number/name/address/type/comments, response_status, version, timestamps |
| Action | UUID, card, actor, actor_name (resolved), kind, payload, created_at; append-only through API |
| Feedback | session, author, author_name (resolved), verdict, comment, timestamp; original evaluation retained |

Arrays:
- classifier features[] contain source strings; routes[] preserve service/variant/condition/value/column.
- action events are chronological records, not UI-only timers.
- evaluation critical_errors[], field_errors[], missing_information[] remain separate.
- evaluation timing includes `acknowledgement_seconds` / `acknowledgement_deadline_seconds=30` and `first_response_seconds` / `first_response_deadline_seconds=180`. The 180-second rule comes from the 2026-09-27 informal customer clarification: first status record with text should be added within 3 minutes.
- instructor feedback[] is append-only history.
- scenario expected_actions[] is a TEAM_PROPOSAL educational reference; do not treat as legislation. expected_hint is list-only UI guidance (C2), never shown in scenario card view.

Card length limits (30 phone,150 name,500 address,2048 comment) are implementation limits. Caller phone is not unique. UUIDs avoid collision between clients. UTC server timestamps are displayed in the browser locale.

PATCH/reaction requires version. Unknown JSON properties are rejected. Invalid classifier FK →422; unauthorized →401/403; inaccessible object →404; conflict/terminal state →409; DB unavailable →503. Completing (`completed`) requires non-empty comment →422 «Укажите итог выполненных работ» (B10).

Scenario generation is staff-only and two-step: POST `/api/v1/instructor/scenarios/generate`
`{incident_type_id, count 1..3, difficulty?}` previews ML output without writing, POST
`/api/v1/instructor/scenarios/import` `{items[1..10]}` commits the reviewed selection
→201 `{imported, ids}`. Both sides share `backend/app/scenario_packages.py` with
`scripts/import_reviewed_scenarios.py`: same scenario package shape, same classifier and
provenance checks. Import never overwrites an existing id (→409), rejects unknown
classifier rows (→422) and stamps `source.status=TEAM_REVIEWED` with `reviewer`/`reviewed_at`.
Generation with `ML_MODE=mock`, a stopped ML service or an empty model answer →503 with a
Russian detail string. Extra ML fields (`difficulty_score`, `ml_metadata`,
`difficulty_factors`) pass through and are stored inside the scenario `data` JSON.

Terminal DDS states differ from training completion. A dispatcher can finish/refuse work before the user ends the learning session. The acknowledgement timer starts when the card is created/directed to the trainee; opening does not restart it.

API v1 path convention is plural /incidents; no duplicate singular aliases. Read endpoints expose source metadata but omit reference answers until evaluation.

See SOURCE_OF_TRUTH.md and REQUIREMENTS_TRACEABILITY.md for provenance. A future source revision needs explicit ID migration, not silent reseeding.

