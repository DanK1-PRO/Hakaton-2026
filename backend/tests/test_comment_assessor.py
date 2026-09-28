import json
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ml import comment_assessor  # noqa: E402
from ml.evaluator_service import app  # noqa: E402
from test_ml_evaluator_service import request_payload  # noqa: E402


@pytest.mark.parametrize("kind", ["valid", "malformed", "unavailable", "truncated"])
def test_llm_comments_keep_formula_and_truthful_mode(monkeypatch, kind):
    monkeypatch.setenv("DDS_LLM_URL", "http://127.0.0.1:8091/v1")
    original = httpx.AsyncClient

    def handler(request):
        assert request.url.host == "127.0.0.1"
        schema = json.loads(request.content)["response_format"]["schema"]
        assert schema["additionalProperties"] is False
        assert schema["properties"]["strengths"]["maxItems"] == 3
        if kind == "unavailable":
            return httpx.Response(503)
        content = (
            '{"explanation":"Ясно описано действие", "strengths":[], "improvements":[]}'
            if kind in {"valid", "truncated"}
            else "bad json"
        )
        return httpx.Response(200, json={"choices": [{
            "message": {"content": content}, "finish_reason": "length" if kind == "truncated" else "stop",
        }]})

    monkeypatch.setattr(
        comment_assessor.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(handler), **kw)
    )
    result = TestClient(app).post("/v1/evaluate", json=request_payload()).json()
    assert result["mode"] == ("local" if kind == "valid" else "fallback")
    assert result["score"] == 10
    assert result["comment_quality"]["status"] == ("model_assessed" if kind == "valid" else "unavailable")
    assert result["routing_assessment"]["status"] == "not_scored"


@pytest.mark.parametrize(
    "url", ["https://example.com/v1", "http://127.0.0.1.example.com/v1", "http://user@localhost/v1"]
)
def test_external_model_endpoint_rejected(url):
    with pytest.raises(ValueError):
        comment_assessor.local_url(url)
