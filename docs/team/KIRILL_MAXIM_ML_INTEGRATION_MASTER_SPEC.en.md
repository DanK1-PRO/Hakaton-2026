# Master Specification for the ML Team: Kirill and Maxim

Version: 2026-09-20. Repository: https://github.com/DanK1-PRO/Hakaton-2026.git, public (since 2026-09-29).

This document explains how to connect local ML models to the existing DDS dispatcher simulator without breaking the UI, backend, database, or demo build.

## 1. Current Baseline

The repository already contains working version `v0.1.0`:

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL 15, JWT/Argon2.
- Frontend: React 18, TypeScript, Ant Design, Redux Toolkit.
- Runtime: Docker Compose with `api`, `ui`, and `db`; Windows local launch scripts.
- Data: incident classifier, three demo scenarios, source provenance.
- ML boundary: mock/local/fallback gateway.
- Verification: backend pytest, frontend Playwright, GitHub Actions.

GitHub repository: https://github.com/DanK1-PRO/Hakaton-2026.git

Before starting ML integration, read:

1. `AGENTS.md`
2. `docs/ai/PROJECT_STATE.md`
3. `docs/ML_INTEGRATION.md`
4. `config/data_contract.json`
5. `config/evaluation_request.schema.json`
6. `config/evaluation_result.schema.json`
7. `ml/example_service.py`
8. `scripts/verify_local_ml.py`

## 2. Main Objective

Connect real local ML models as a separate service implementing the `POST /v1/evaluate` contract. Do not require a React rewrite or a rewrite of the main FastAPI application.

Correct architecture:

```text
React UI
  -> FastAPI API
    -> PostgreSQL
    -> backend/app/ml_gateway/gateway.py
      -> local ML HTTP service
```

Incorrect architecture:

```text
React UI -> ML model
FastAPI imports torch/whisper/model weights directly
ML service writes directly to PostgreSQL
ML service changes session state
```

## 3. Ownership Zones

### Green Zone

The ML team may edit or add:

- `ml/*`
- `docs/ML_INTEGRATION.md`
- `docs/team/KIRILL_MAXIM_ML_INTEGRATION_MASTER_SPEC.ru.md`
- `docs/team/KIRILL_MAXIM_ML_INTEGRATION_MASTER_SPEC.en.md`
- `scripts/verify_local_ml.py`
- new `ml/requirements*.txt` files
- new `ml/Dockerfile`, if the model runs as a separate container
- new backend contract tests, as long as mock mode remains intact
- JSON examples under `docs/evidence/*`

### Yellow Zone

Edit only after coordination with Danil:

- `backend/app/ml_gateway/gateway.py`
- `backend/app/schemas.py`
- `config/evaluation_request.schema.json`
- `config/evaluation_result.schema.json`
- `config/data_contract.json`
- `docker-compose.yml`
- `.github/workflows/*`
- `frontend/src/types.ts`
- `frontend/src/results.tsx`

### Red Zone

Do not edit without an explicit team decision:

- `frontend/src/workspace.tsx`, if the change is only for model convenience.
- `backend/app/domain.py`, if ML is trying to change incident lifecycle rules.
- `backend/app/models.py` and migrations.
- `backend/app/auth.py`.
- `data_derived/classifier/incident_types.json`.
- `Данные заказчика/*`.
- `.env`, `.runtime`, `.venv`, `node_modules`.

## 4. Evaluator Contract v1

The ML service must implement:

```text
GET /health
POST /v1/evaluate
```

The request must validate against `config/evaluation_request.schema.json`.

Important request fields:

- `schema_version`: contract version, currently `1.0`.
- `session_id`: training session ID.
- `card`: incident card.
- `actions`: ordered action history.
- `reference`: scenario reference and expected actions.
- `timing`: authoritative timing metrics from the backend.

The response must validate against `config/evaluation_result.schema.json`.

Important response fields:

- `schema_version`: `1.0`.
- `session_id`: must match the request.
- `model_version`: model or package version.
- `reference_version`: reference/gold data version.
- `mode`: must be `local` for a real local model.
- `score`: number or `null`. Use `null` if no official scoring rubric exists.
- `critical_errors`: list of critical mistakes.
- `field_errors`: card field-level issues.
- `missing_information`: missing facts or questions.
- `timing`: timing assessment.
- `routing_assessment`: routing assessment.
- `comment_quality`: comment quality assessment.
- `explanation`: short Russian explanation shown to the user.

## 5. Hard Constraints

ML must not:

- Change training session state.
- Modify the incident card.
- Change user roles or permissions.
- Write directly to PostgreSQL.
- Expose hidden reference data to the trainee.
- Require React to call the ML service directly.
- Break `ML_MODE=mock`.
- Make the main backend depend on heavy model libraries.

The backend must:

- Validate the response schema.
- Verify matching `session_id`.
- Enforce a timeout.
- Return a deterministic fallback result and preserve training data when the model fails.

## 6. Integration Steps

Minimal path:

1. Replace or extend the logic in `ml/example_service.py`, or create a new adjacent service such as `ml/evaluator_service.py`.
2. Run the model as a separate process.
3. Make sure `GET /health` returns readiness.
4. Set in `.env`:

```env
ML_MODE=local
ML_URL=http://127.0.0.1:8090
```

5. Restart the API.
6. Complete one full scenario in the UI.
7. Run:

```powershell
.\.venv\Scripts\python.exe scripts\verify_local_ml.py
```

For Docker, the model should be a separate service, for example `ml-evaluator`, with `ML_URL=http://ml-evaluator:8090`.

## 7. Likely UI Integration Conflicts

Potential conflicts:

- The model needs fields that are not present in the current incident card.
- The model returns detailed assessment sections that the UI does not yet display.
- The model uses a different scoring scale.
- The model needs audio/ASR, while the current simulator uses a training phone without real audio.
- The model wants to influence routing, but routing is currently stored as reference data.

Resolution process:

- If the model needs a new card field, propose changes to `config/evaluation_request.schema.json` and `backend/app/schemas.py` first.
- If the model returns new result fields, propose changes to `config/evaluation_result.schema.json` and provide a sample JSON result.
- If the UI must display new data, open a UI task and attach the sample JSON.
- If a new capability is needed, such as `asr` or `scenario_generator`, define a separate v1 contract. Do not mix it into evaluator v1.

## 8. What Not To Do Now

Do not:

- Rewrite the whole backend for ML.
- Replace PostgreSQL.
- Put model weights into the main API Docker image.
- Break mock mode.
- Claim model accuracy without a gold set and an evaluation method.
- Introduce an official numeric score without a team/customer decision.
- Make scenario generation mandatory for the program-minimum.

## 9. GitHub Workflow

Main branch: `main`.

Recommended branches:

- `ml/evaluator-local-service`
- `ml/scoring-experiment`
- `ml/asr-contract-proposal`
- `ml/docker-service`

Before opening a PR:

1. Sync with `origin/main`.
2. Verify that mock mode still works.
3. Verify the local model.
4. Attach request/response examples.
5. Update `docs/ML_INTEGRATION.md` if contract or startup behavior changed.

Minimum checks:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests
.\.venv\Scripts\python.exe scripts\verify_local_ml.py
```

If the frontend changed:

```powershell
cd frontend
npm run build
npx playwright test
```

Do not merge while GitHub Actions is red.

## 10. Definition of Done

An ML integration task is done when:

- The model runs as a separate service.
- `GET /health` works.
- `POST /v1/evaluate` passes the JSON schema.
- `session_id` matches the request.
- The UI receives results through FastAPI, never directly.
- If the model fails, the training flow finishes through fallback.
- `ML_MODE=mock` still works.
- A sample result exists in docs or evidence.
- Startup instructions are documented.
- Tests pass locally and in GitHub Actions.

