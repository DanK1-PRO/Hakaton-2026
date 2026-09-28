from datetime import datetime, timedelta, timezone

from conftest import login
from test_flow import API, reaction, start
from app.models import Incident


def test_open_freezes_ack_timer_independently_of_first_reaction(client):
    headers = login(client)
    card = start(client, headers)
    with client.test_sessions() as db:
        incident = db.get(Incident, card["id"])
        incident.created_at -= timedelta(seconds=10)
        db.commit()
    opened = client.post(API + f"/incidents/{card['id']}/open", headers=headers).json()
    assert opened["acknowledged_at"]
    assert 10 <= opened["acknowledgement_seconds"] < 30
    repeated = client.post(API + f"/incidents/{card['id']}/open", headers=headers).json()
    assert repeated["version"] == opened["version"]
    accepted = reaction(client, headers, opened, "accepted").json()
    assert datetime.fromisoformat(accepted["acknowledged_at"]).replace(tzinfo=timezone.utc) == datetime.fromisoformat(
        opened["acknowledged_at"]
    )
    result = client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=headers).json()
    assert result["timing"]["acknowledgement_seconds"] < 30
    assert result["timing"]["first_response_seconds"] is not None


def test_dds_cannot_rewrite_upstream_112_fields(client):
    headers = login(client)
    card = start(client, headers)
    payload = {k: card[k] for k in ("caller_number", "name", "address", "incident_type_id", "comments", "version")}
    for key, value in (
        ("name", "Other"),
        ("address", "Other"),
        ("caller_number", "+70000000009"),
        ("incident_type_id", -1),
    ):
        response = client.patch(API + f"/incidents/{card['id']}", headers=headers, json={**payload, key: value})
        assert response.status_code == 403
    response = client.patch(
        API + f"/incidents/{card['id']}", headers=headers, json={**payload, "comments": "Дополнение ДДС"}
    )
    assert response.status_code == 200
    assert response.json()["scenario"]["prompt"] == card["scenario"]["prompt"]
