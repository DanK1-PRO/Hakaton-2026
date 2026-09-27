import sys
from pathlib import Path

from fastapi.testclient import TestClient

from app.schemas import EvaluationResult

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from ml.evaluator_service import app  # noqa: E402


def request_payload(**timing_overrides):
    timing = {
        "elapsed_seconds": 240.0,
        "acknowledgement_seconds": 12.0,
        "acknowledgement_deadline_seconds": 30,
        "first_response_seconds": 60.0,
        "first_response_deadline_seconds": 180,
    }
    timing.update(timing_overrides)
    return {
        "schema_version": "1.0",
        "session_id": "session-contract-test",
        "card": {
            "address": "Россия, Москва, Ясный проезд, 10",
            "incident_type_id": 1,
            "comments": "Открытое пламя на балконе",
        },
        "actions": [
            {"kind": "reaction", "payload": {"status": "accepted", "comment": "Принято"}},
            {"kind": "reaction", "payload": {"status": "responding", "comment": "Бригада направлена"}},
            {"kind": "reaction", "payload": {"status": "completed", "comment": "Работы завершены"}},
        ],
        "reference": {
            "version": "1.0-test",
            "address": "Россия, Москва, Ясный проезд, 10",
            "incident_type_id": 1,
            "expected_actions": ["accepted", "responding", "completed"],
        },
        "timing": timing,
    }


def test_ml_evaluator_service_matches_gateway_contract():
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "ok"

    response = client.post("/v1/evaluate", json=request_payload())
    assert response.status_code == 200, response.text
    result = EvaluationResult.model_validate(response.json())

    assert result.schema_version == "1.0"
    assert result.session_id == "session-contract-test"
    assert result.mode == "local"
    assert result.score is not None
    assert not result.critical_errors
    assert result.timing["first_response_deadline_seconds"] == 180


def test_ml_evaluator_service_reports_first_response_deadline():
    client = TestClient(app)
    response = client.post("/v1/evaluate", json=request_payload(first_response_seconds=181.0))
    assert response.status_code == 200, response.text
    result = EvaluationResult.model_validate(response.json())

    assert "Превышено время первой записи статуса: 3 минуты" in result.critical_errors
    assert result.score is not None and result.score < 10
