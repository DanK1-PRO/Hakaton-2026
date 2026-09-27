# Local ML integration / Подключение ML

The main API has no PyTorch/Whisper dependency. Model packages run in separate local processes/containers. The React app calls only FastAPI.

## Executable evaluator contract v1

- GET /health returns service availability.
- POST /v1/evaluate accepts config/evaluation_request.schema.json.
- Response must validate against config/evaluation_result.schema.json.
- session_id must match the request; schema_version is "1.0".
- Include model_version and reference_version. Return mode "local".
- The server passes card, ordered action events, scenario reference and authoritative timing.
- Reference data is for evaluation only. Never expose it through trainee scenario endpoints.
- ML cannot change session state, routing, roles or stored actions.
- Timeout/HTTP error/invalid JSON/schema/mismatched session triggers deterministic fallback with mode "fallback".

## Run the integrated local evaluator

From the project root, with backend dependencies installed:

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python.exe -m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8090
```

In `.env` set `ML_MODE=local` and `ML_URL=http://127.0.0.1:8090`; restart the API. The service is a local contract implementation from the ML branch: formula-based evaluation, difficulty scoring and optional generator tooling. The real GGUF weights are external release artifacts, not a required dependency for normal API/UI startup.

The previous deterministic sample remains available as `ml.example_service:app` for minimal contract smoke checks.

For Compose, use a local service name on the Compose network or host.docker.internal for a service on the Docker Desktop host.

## Capability map

| Capability | Current implementation | Team integration |
|---|---|---|
| evaluator | mock / local HTTP / fallback | `ml.evaluator_service:app`, validated by backend contract tests |
| scenario catalogue | source-labelled synthetic fixtures + classifier-derived ML scenarios | Review/import validated generator output into versioned scenarios |
| ASR / dialogue / difficulty model | Not enabled | New DTO + adapter + contract test before UI controls |

Scenario seed structure: data_derived/scenarios/demo.json. Preserve schema_version, source, reference version, incident_type_id and expected action arrays. Do not independently recreate incident categories: share the classifier codes/provenance. The current integer ID is a source row locator for this snapshot, not a universal code across XLSX revisions.

## Integration handoff

1. Teammate supplies supported capability, model/package version, startup command and hardware requirements.
2. Validate JSON examples against the checked-in schemas.
3. Run the service outside the API environment; do not install model weights into backend.
4. Run a full training session through the gateway.
5. Test service unavailable, timeout, malformed result and wrong session_id.
6. Preserve instructor feedback separately from automatic results.

## Model release

Kirill's GitHub release `vModel` / tag `modelURL` is a pre-release named "Подгрузка модели". It contains seven external GGUF parts:

- `GigaChat3.1-10B-A1.8B-q4_K_M.part01.gguf` ... `part06.gguf`, 1 GiB each;
- `GigaChat3.1-10B-A1.8B-q4_K_M.part07.gguf`, about 30.8 MiB.

Do not commit model weights into the repository. Download and assemble/run them only on the local ML machine or release storage. The main backend must still run with `ML_MODE=mock` when weights are absent.

Actual model quality, training/gold-set methodology and scoring rubric are team/customer work. No model accuracy is claimed by this repository.

