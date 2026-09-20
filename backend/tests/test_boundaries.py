import httpx
import pytest
from conftest import login
from test_flow import start, reaction, API
from app.ml_gateway import gateway
from app.settings import settings


@pytest.mark.parametrize("kind", ["valid", "wrong_session", "invalid_shape", "timeout", "http_error"])
def test_local_adapter_contract(client, monkeypatch, kind):
    headers = login(client)
    card = start(client, headers)
    original_client = httpx.AsyncClient

    def handler(request):
        if kind == "timeout":
            raise httpx.ReadTimeout("test", request=request)
        if kind == "http_error":
            return httpx.Response(503)
        if kind == "invalid_shape":
            return httpx.Response(200, json={"unexpected": True})
        return httpx.Response(
            200,
            json={
                "schema_version": "1.0",
                "session_id": card["session_id"] if kind == "valid" else "other",
                "model_version": "contract-test-1",
                "reference_version": "1.0",
                "mode": "local",
                "explanation": "Contract test",
                "timing": {"elapsed_seconds": 1, "acknowledgement_seconds": None},
            },
        )

    monkeypatch.setattr(
        gateway.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs)
    )
    monkeypatch.setattr(settings, "ml_mode", "local")
    result = client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=headers)
    assert result.status_code == 200
    assert result.json()["mode"] == ("local" if kind == "valid" else "fallback")
    assert result.json()["session_id"] == card["session_id"]


def test_terminal_reaction_hangs_up_call(client):
    headers = login(client)
    card = start(client, headers)
    card = reaction(client, headers, card, "accepted").json()
    for action in ("ring", "answer"):
        card = client.post(
            API + f"/incidents/{card['id']}/communication", headers=headers, json={"action": action}
        ).json()
    card = reaction(client, headers, card, "completed").json()
    phone = [e for e in card["events"] if e["kind"] == "communication"]
    assert phone[-1]["payload"]["action"] == "hangup"


def test_staff_reads_do_not_acknowledge_or_edit(client):
    headers = login(client)
    card = start(client, headers)
    staff = login(client, "instructor")
    assert client.get(API + f"/incidents/{card['id']}", headers=staff).json()["status"] == "added"
    assert client.post(API + f"/incidents/{card['id']}/open", headers=staff).status_code == 403
    assert reaction(client, staff, card, "accepted").status_code == 403


def test_database_outage_returns_health_503(client, monkeypatch):
    from sqlalchemy.exc import OperationalError
    from app import main

    def fail():
        raise OperationalError("test", {}, Exception("unavailable"))

    monkeypatch.setattr(main.engine, "connect", fail)
    assert client.get("/health").status_code == 503
