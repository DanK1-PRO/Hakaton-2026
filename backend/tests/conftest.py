import os

os.environ.setdefault("JWT_SECRET", "test-only-secret-that-is-long-enough-for-hs256")
os.environ.setdefault("DATABASE_URL", "sqlite://")
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.db import Base, get_db
from app.main import app
from app.models import User, IncidentType, Scenario
from app.auth import passwords
from app.settings import ROOT
import json


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        for role in ("trainee", "instructor", "administrator"):
            db.add(
                User(
                    id=role,
                    email=role + "@dds.local",
                    name=role,
                    role=role,
                    password_hash=passwords.hash("DdsDemo2026!"),
                )
            )
        db.add(
            User(
                id="other",
                email="other@dds.local",
                name="other",
                role="trainee",
                password_hash=passwords.hash("DdsDemo2026!"),
            )
        )
        cases = json.loads((ROOT / "data_derived/scenarios/demo.json").read_text(encoding="utf-8"))
        types = json.loads((ROOT / "data_derived/classifier/incident_types.json").read_text(encoding="utf-8"))
        used = {s["card"]["incident_type_id"] for s in cases}
        for kind in types:
            if kind["id"] in used:
                db.add(IncidentType(id=kind["id"], name=kind["name"], external_code=kind["external_code"], data=kind))
        for s in cases:
            db.add(Scenario(id=s["id"], title=s["title"], difficulty=s["difficulty"], data=s))
        db.commit()

    def override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        c.test_sessions = sessions
        yield c
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, role="trainee"):
    r = client.post("/api/v1/auth/login", data={"username": role + "@dds.local", "password": "DdsDemo2026!"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["access_token"]}
