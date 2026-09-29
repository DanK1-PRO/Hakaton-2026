import copy
import json

import httpx
from conftest import login
from test_flow import API, start
from app.ml_gateway import gateway
from app.settings import ROOT, settings

TYPE_ID = json.loads((ROOT / "data_derived/scenarios/demo.json").read_text(encoding="utf-8"))[0]["card"][
    "incident_type_id"
]
REAL_ASYNC_CLIENT = httpx.AsyncClient


def sample_item(item_id="generated_test0001", type_id=TYPE_ID, title="Утечка газа в подъезде"):
    item = copy.deepcopy(
        json.loads((ROOT / "data_derived/scenarios/demo.json").read_text(encoding="utf-8"))[0]
    )
    item.update(
        {
            "id": item_id,
            "title": title,
            "card": {**item["card"], "incident_type_id": type_id, "address": "Россия, Москва, Тестовый проезд, 5"},
            "reference": {**item["reference"], "incident_type_id": type_id},
            "source": {
                "type": "llm_generated",
                "model": "local-model",
                "status": "GENERATED",
                "note": "Требует проверки преподавателем.",
            },
            "ml_metadata": {"category": title, "features": [], "difficulty_score": 4.0},
        }
    )
    return item


def patch_ml(monkeypatch, handler):
    monkeypatch.setattr(
        gateway.httpx,
        "AsyncClient",
        lambda **kwargs: REAL_ASYNC_CLIENT(transport=httpx.MockTransport(handler), **kwargs),
    )
    monkeypatch.setattr(settings, "ml_mode", "local")


def test_generation_requires_staff(client):
    trainee = login(client)
    assert (
        client.post(
            API + "/instructor/scenarios/generate", headers=trainee, json={"incident_type_id": TYPE_ID}
        ).status_code
        == 403
    )
    assert (
        client.post(
            API + "/instructor/scenarios/import", headers=trainee, json={"items": [sample_item()]}
        ).status_code
        == 403
    )


def test_generation_rejects_unknown_type(client):
    staff = login(client, "instructor")
    response = client.post(
        API + "/instructor/scenarios/generate",
        headers=staff,
        json={"incident_type_id": 999999999, "count": 1},
    )
    assert response.status_code == 422


def test_generation_reports_mock_mode(client, monkeypatch):
    monkeypatch.setattr(settings, "ml_mode", "mock")
    staff = login(client, "instructor")
    response = client.post(
        API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID}
    )
    assert response.status_code == 503
    assert "ML_MODE=local" in response.json()["detail"]


def test_generation_returns_preview_items(client, monkeypatch):
    item = sample_item()
    patch_ml(monkeypatch, lambda request: httpx.Response(200, json={"schema_version": "1.0", "mode": "local", "model": "local-model", "items": [item]}))
    staff = login(client, "instructor")
    response = client.post(
        API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID, "count": 2}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "local"
    assert body["model"] == "local-model"
    assert [i["id"] for i in body["items"]] == ["generated_test0001"]
    assert "ml_metadata" in body["items"][0]


def test_generation_surfaces_ml_errors(client, monkeypatch):
    staff = login(client, "instructor")
    patch_ml(monkeypatch, lambda request: httpx.Response(503, json={"detail": "Локальная модель не настроена"}))
    response = client.post(API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID})
    assert response.status_code == 503
    assert response.json()["detail"] == "Локальная модель не настроена"

    patch_ml(monkeypatch, lambda request: httpx.Response(502, json={"detail": "Локальная модель не вернула ни одного валидного сценария"}))
    response = client.post(API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID})
    assert response.status_code == 503

    patch_ml(monkeypatch, lambda request: httpx.Response(200, json={"items": []}))
    response = client.post(API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID})
    assert response.status_code == 503
    assert "не вернул" in response.json()["detail"]


def test_generation_survives_unreachable_ml(client, monkeypatch):
    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    patch_ml(monkeypatch, refuse)
    staff = login(client, "instructor")
    response = client.post(API + "/instructor/scenarios/generate", headers=staff, json={"incident_type_id": TYPE_ID})
    assert response.status_code == 503
    assert "ML-сервис недоступен" in response.json()["detail"]


def test_import_publishes_reviewed_scenario(client):
    staff = login(client, "instructor")
    item = sample_item()
    response = client.post(API + "/instructor/scenarios/import", headers=staff, json={"items": [item]})
    assert response.status_code == 201, response.text
    assert response.json() == {"imported": 1, "ids": ["generated_test0001"]}

    catalog = {s["id"]: s for s in client.get(API + "/scenarios", headers=staff).json()}
    published = catalog["generated_test0001"]
    assert published["source"]["status"] == "TEAM_REVIEWED"
    assert published["source"]["reviewer"] == "instructor"
    assert published["expected_hint"] == "Принять"

    trainee = login(client)
    card = start(client, trainee, scenario="generated_test0001")
    assert card["address"] == "Россия, Москва, Тестовый проезд, 5"

    again = client.post(API + "/instructor/scenarios/import", headers=staff, json={"items": [item]})
    assert again.status_code == 409
    assert "Уже импортированы" in again.json()["detail"]


def test_import_rejects_unreviewable_packages(client):
    staff = login(client, "instructor")
    unknown_type = sample_item(item_id="generated_bad_type", type_id=999999999)
    response = client.post(API + "/instructor/scenarios/import", headers=staff, json={"items": [unknown_type]})
    assert response.status_code == 422
    assert "не найден в классификаторе" in response.json()["detail"]

    no_provenance = sample_item(item_id="generated_no_source")
    no_provenance["source"] = {}
    response = client.post(API + "/instructor/scenarios/import", headers=staff, json={"items": [no_provenance]})
    assert response.status_code == 422

    broken = sample_item(item_id="generated_broken")
    broken["card"] = {"address": ""}
    response = client.post(API + "/instructor/scenarios/import", headers=staff, json={"items": [broken]})
    assert response.status_code == 422
    assert "Некорректный сценарий" in response.json()["detail"]
