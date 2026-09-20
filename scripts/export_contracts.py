"""Export machine contracts directly from the API/Pydantic definitions."""

import json
from pathlib import Path
from app.main import app
from app.schemas import EvaluationRequest, EvaluationResult, IncidentInput, ReactionInput

root = Path(__file__).resolve().parents[1]
out = root / "config"
out.mkdir(exist_ok=True)
(out / "openapi.json").write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2), encoding="utf-8")
for name, model in {
    "evaluation_request": EvaluationRequest,
    "evaluation_result": EvaluationResult,
    "incident": IncidentInput,
    "reaction": ReactionInput,
}.items():
    (out / (name + ".schema.json")).write_text(
        json.dumps(model.model_json_schema(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
(out / "data_contract.json").write_text(
    json.dumps(
        {
            "schema_version": "1.0",
            "api_prefix": "/api/v1",
            "schemas": [
                "incident.schema.json",
                "reaction.schema.json",
                "evaluation_request.schema.json",
                "evaluation_result.schema.json",
            ],
            "source_status": "TEAM_PROPOSAL",
            "authority": "HACKATHON_2026_MASTER_SPEC_CODEX.md sections 10,13,18",
        },
        indent=2,
    ),
    encoding="utf-8",
)
print("Exported OpenAPI and four JSON schemas")
