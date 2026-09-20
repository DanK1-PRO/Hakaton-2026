# Data Contract 1.0

OpenAPI: config/openapi.json. Request schemas: config/*.schema.json. Export from code with PYTHONPATH=backend python scripts/export_contracts.py; generated files must match code.

| Entity | Stable fields / storage |
|---|---|
| User | UUID id, normalized email, name, Argon2 hash, role, active |
| IncidentType | source-row id, external_code, name, features[], routes[], source(file/sheet/row/hash) |
| Scenario | schema_version, id, title, difficulty, source, card, reference, briefing[] |
| TrainingSession | UUID, owner, scenario, status, started_at, finished_at, evaluation JSON |
| Incident | owner/session, caller_number/name/address/type/comments, response_status, version, timestamps |
| Action | UUID, card, actor, kind, payload, created_at; append-only through API |
| Feedback | session, author, verdict, comment, timestamp; original evaluation retained |

Arrays:
- classifier features[] contain source strings; routes[] preserve service/variant/condition/value/column.
- action events are chronological records, not UI-only timers.
- evaluation critical_errors[], field_errors[], missing_information[] remain separate.
- instructor feedback[] is append-only history.
- scenario expected_actions[] is a TEAM_PROPOSAL educational reference; do not treat as legislation.

Card length limits (30 phone,150 name,500 address,2048 comment) are implementation limits. Caller phone is not unique. UUIDs avoid collision between clients. UTC server timestamps are displayed in the browser locale.

PATCH/reaction requires version. Unknown JSON properties are rejected. Invalid classifier FK →422; unauthorized →401/403; inaccessible object →404; conflict/terminal state →409; DB unavailable →503.

Terminal DDS states differ from training completion. A dispatcher can finish/refuse work before the user ends the learning session. The acknowledgement timer starts when the card is created/directed to the trainee; opening does not restart it.

API v1 path convention is plural /incidents; no duplicate singular aliases. Read endpoints expose source metadata but omit reference answers until evaluation.

See SOURCE_OF_TRUTH.md and REQUIREMENTS_TRACEABILITY.md for provenance. A future source revision needs explicit ID migration, not silent reseeding.

