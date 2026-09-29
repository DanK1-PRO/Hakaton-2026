# Handoff

## 2026-09-29 update

Instructor scenario generation loop is implemented (Danil chose variant 1, full cycle in
the UI): staff button «Генерация сценариев» on `/results` → local model preview → approve
selected → import with reviewer provenance. Entry points: `frontend/src/generator.tsx`,
`backend/app/routers/api.py` (`POST /instructor/scenarios/generate|import`),
`backend/app/scenario_packages.py` (validation shared with
`scripts/import_reviewed_scenarios.py`), `ml/evaluator_service.py` (`POST /v1/generate`,
capability `scenario_generator`), `backend/app/ml_gateway/gateway.py`
(`generate_scenarios`, `ML_GENERATE_TIMEOUT`). Verification is in docs/VERIFICATION.md
(Ruff, pytest 42/42, frontend build, Playwright 28/28, real local generation and
Postgres import/409 with cleanup). Start from the 2026-09-29 checkpoint in PROJECT_STATE;
changes are not committed yet.

## 2026-09-28 update

The Astra integration pass has been performed on main. Start with the current
checkpoint in PROJECT_STATE and docs/FINAL_INTEGRATION_AUDIT.ru.md, not the old
implementation-pass tasks below. Real GGUF inference evidence is in
docs/evidence/real-ml-integration.json. Model files and runtime stay in .runtime.
Submission material index: docs/SUBMISSION.ru.md. Do not claim real voice/ASR/TTS,
automatic fine-tuning, exact address geocoding or full customer load acceptance.
Published code: c55103c, both jobs green in CI 36462902808. No repeat integration
is required. Remaining acceptance/submission actions and limits are in the documents above.

Updated: 2026-09-20. The implementation pass has already built the application.
Do not treat this repository as an empty scaffold.

Read PROJECT_STATE.md, TASK_QUEUE.md and DECISIONS.md first. For current evidence read
docs/VERIFICATION.md. For a team package integration read docs/ML_INTEGRATION.md and
config/evaluation_request.schema.json + evaluation_result.schema.json.

## Delivered Loop

Login -> training case -> simulated incoming DDS card -> receive/acknowledge ->
edit/classify/react -> finish -> persistent evaluation -> instructor feedback.
React calls only FastAPI. Domain rules are not delegated to ML.
ML_MODE=mock works without network services. Local adapter and fallback are tested.

## Entry Points

- backend/app/routers/api.py: HTTP boundary and transactions.
- backend/app/domain.py: transitions, timing, ownership and audit.
- backend/app/ml_gateway/gateway.py: model isolation and fallback.
- frontend/src/workspace.tsx: main dispatcher screen.
- docs/ui/UI_SOURCE_MAP.md: references and adaptations.
- scripts/windows/start-app.ps1: current machine launch.
- docker-compose.yml: portable api/ui/db runtime.

## Source Rules

Customer domain truth and captain implementation truth are separate.
Read sources selectively through SOURCE_INDEX.yaml. Preserve originals.
Q&A file confirms the VoIP/log promise, not unknown SIP/network specifics.
The direct DDS memo pp.21-26 defines core statuses; terminal states lock editing.
Official score weights, special-service 103/104 policies and model DTOs beyond evaluate
remain unresolved. Never invent official rules to make the demo look complete.

## Acceptance Boundary

Danil's program-minimum slice is distinct from the entire team's final customer system.
Future improvements start only after Danil approves the next integration objective.
No need for additional plugins to run the local app. Subagents were not used because
no callable subagent tool was exposed; never imply that parallel reviews occurred.
