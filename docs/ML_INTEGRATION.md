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

## Run the included contract example

From the project root, with backend dependencies installed:

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python.exe -m uvicorn ml.example_service:app --host 127.0.0.1 --port 8090
```

In .env set ML_MODE=local and ML_URL=http://127.0.0.1:8090; restart the API. This sample uses deterministic logic, not a trained model. Its purpose is to prove package synchronization.

For Compose, use a local service name on the Compose network or host.docker.internal for a service on the Docker Desktop host.

## ML Evaluator Service v1

### Запуск

```powershell
.\.venv\Scripts\python.exe -m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8091
```

### Формулы сложности сценария

Сложность рассчитывается на основе взвешенных факторов из классификатора:

| Фактор | Вес | Пример |
|--------|-----|--------|
| Тип: пожар | +2.5 | пожар: мусор |
| Тип: взрыв | +3.0 | взрыв в здании |
| Признак: пострадавшие | +2.5 | ДТП с пострадавшими |
| Признак: опасный груз | +2.0 | перевозка АХОВ |
| Место: метро | +2.5 | пожар в метро |
| Место: жилой дом | +2.0 | пожар в квартире |

**Шкала:**
- 1.0 - 3.0: easy (лёгкая)
- 3.1 - 6.0: medium (нормальная)
- 6.1 - 10.0: hard (сложная)

### Импорт сценариев из Excel

```powershell
.\.venv\Scripts\python.exe ml\import_from_excel.py
```

Результат: `data_derived/scenarios/classifier_scenarios.json` (1283 сценария)

## Capability map

| Capability | Current implementation | Team integration |
|---|---|---|
| evaluator | mock / local HTTP / fallback | Replace example_service evaluation body |
| scenario catalogue | source-labelled synthetic fixtures | Import validated generator output into versioned scenarios |
| ASR / dialogue / difficulty model | Not enabled | New DTO + adapter + contract test before UI controls |

Scenario seed structure: data_derived/scenarios/demo.json. Preserve schema_version, source, reference version, incident_type_id and expected action arrays. Do not independently recreate incident categories: share the classifier codes/provenance. The current integer ID is a source row locator for this snapshot, not a universal code across XLSX revisions.

## Integration handoff

1. Teammate supplies supported capability, model/package version, startup command and hardware requirements.
2. Validate JSON examples against the checked-in schemas.
3. Run the service outside the API environment; do not install model weights into backend.
4. Run a full training session through the gateway.
5. Test service unavailable, timeout, malformed result and wrong session_id.
6. Preserve instructor feedback separately from automatic results.

Actual model quality, training/gold-set methodology and scoring rubric are team/customer work. No model accuracy is claimed by this repository.

