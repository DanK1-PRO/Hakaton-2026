from datetime import timedelta
from sqlalchemy import select
from conftest import login
from app.models import Incident, TrainingSession
from app.settings import settings

API = "/api/v1"


def start(client, headers, scenario="water"):
    response = client.post(API + "/simulation/sessions", json={"scenario_id": scenario}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def reaction(client, headers, card, status, comment="Учебная бригада направлена"):
    return client.post(
        API + f"/incidents/{card['id']}/reaction",
        headers=headers,
        json={"version": card["version"], "status": status, "comment": comment},
    )


def test_complete_training_and_instructor_correction(client):
    headers = login(client)
    card = start(client, headers)
    assert card["status"] == "added"
    assert "reference" not in card["scenario"]
    card = client.post(API + f"/incidents/{card['id']}/open", headers=headers).json()
    assert card["status"] == "received"
    for status in ["accepted", "responding", "completed"]:
        response = reaction(client, headers, card, status)
        assert response.status_code == 200, response.text
        card = response.json()
    r = client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=headers)
    assert r.status_code == 200, r.text
    result = r.json()
    assert not result["critical_errors"] and not result["missing_information"]
    assert result["score"] is None
    assert client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=headers).json() == result
    teacher = login(client, "instructor")
    endpoint = API + f"/instructor/sessions/{card['session_id']}/feedback"
    assert client.post(endpoint, headers=headers, json={"comment": "test", "verdict": "confirmed"}).status_code == 403
    reviewed = client.post(
        endpoint, headers=teacher, json={"comment": "Уточните результаты работ", "verdict": "corrected"}
    )
    assert reviewed.status_code == 201
    assert reviewed.json()["evaluation"] == result
    assert reviewed.json()["feedback"][0]["verdict"] == "corrected"
    assert client.get(API + "/instructor/report.csv", headers=teacher).status_code == 200


def test_auth_and_ownership(client):
    assert client.get(API + "/incidents").status_code == 401
    assert (
        client.post(API + "/auth/login", data={"username": "trainee@dds.local", "password": "wrong"}).status_code == 401
    )
    headers = login(client)
    card = start(client, headers)
    other = login(client, "other")
    assert client.get(API + f"/incidents/{card['id']}", headers=other).status_code == 404
    assert client.get(API + "/incidents", headers=other).json()["total"] == 0
    assert client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=other).status_code == 404
    assert client.get(API + "/admin/users", headers=headers).status_code == 403


def test_refusal_comment_and_recovery(client):
    headers = login(client)
    card = start(client, headers, "elevator")
    assert reaction(client, headers, card, "rejected", "   ").status_code == 422
    assert reaction(client, headers, card, "completed").status_code == 409
    card = reaction(client, headers, card, "rejected", "Дом обслуживает другая организация; информация передана").json()
    assert card["allowed_statuses"] == ["accepted"]
    card = reaction(client, headers, card, "accepted").json()
    assert reaction(client, headers, card, "rejected", "reason").status_code == 409


def test_optimistic_lock_and_final_state(client):
    headers = login(client)
    card = start(client, headers)
    accepted = reaction(client, headers, card, "accepted").json()
    assert reaction(client, headers, card, "responding").status_code == 409
    completed = reaction(client, headers, accepted, "completed").json()
    assert completed["allowed_statuses"] == []
    payload = {k: completed[k] for k in ("caller_number", "name", "address", "incident_type_id", "comments", "version")}
    assert client.patch(API + f"/incidents/{card['id']}", headers=headers, json=payload).status_code == 409


def test_late_acknowledgement_and_ml_failure(client, monkeypatch):
    headers = login(client)
    card = start(client, headers)
    with client.test_sessions() as db:
        stored = db.get(Incident, card["id"])
        stored.created_at -= timedelta(seconds=40)
        db.commit()
    card = reaction(client, headers, card, "accepted").json()
    monkeypatch.setattr(settings, "ml_mode", "local")
    monkeypatch.setattr(settings, "ml_url", "http://127.0.0.1:1")
    monkeypatch.setattr(settings, "ml_timeout", 0.1)
    result = client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=headers).json()
    assert result["mode"] == "fallback"
    assert result["critical_errors"]
    assert result["timing"]["acknowledgement_seconds"] >= 40
    assert client.get(API + "/incidents", headers=headers).status_code == 200


def test_manual_crud_and_classifier_validation(client):
    headers = login(client)
    kind = client.get(API + "/incident-types", headers=headers).json()[0]["id"]
    payload = {"address": "Учебный адрес", "incident_type_id": kind, "comments": "Описание"}
    bad = client.post(API + "/incidents", headers=headers, json={**payload, "incident_type_id": -1})
    assert bad.status_code == 422
    card = client.post(API + "/incidents", headers=headers, json=payload).json()
    payload["comments"] = "Уточнённое описание"
    changed = client.patch(
        API + f"/incidents/{card['id']}", headers=headers, json={**payload, "version": card["version"]}
    )
    assert changed.status_code == 200
    assert client.get(API + "/incidents?q=Уточнённое", headers=headers).json()["total"] == 1
    assert client.delete(API + f"/incidents/{card['id']}", headers=headers).status_code == 204
    assert client.get(API + f"/incidents/{card['id']}", headers=headers).status_code == 404


def test_start_is_idempotent_and_communication_order(client):
    headers = login(client)
    card = start(client, headers)
    assert start(client, headers)["id"] == card["id"]
    endpoint = API + f"/incidents/{card['id']}/communication"
    assert client.post(endpoint, headers=headers, json={"action": "answer"}).status_code == 409
    for action in ("ring", "answer", "hangup"):
        assert client.post(endpoint, headers=headers, json={"action": action}).status_code == 200
    with client.test_sessions() as db:
        assert len(db.scalars(select(TrainingSession)).all()) == 1
