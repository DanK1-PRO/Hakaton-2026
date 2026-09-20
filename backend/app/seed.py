import json
from sqlalchemy import select
from .db import SessionLocal
from .models import User, IncidentType, Scenario
from .auth import passwords
from .settings import ROOT, settings


def seed():
    with SessionLocal() as db:
        if not db.scalar(select(IncidentType.id).limit(1)):
            items = json.loads((ROOT / "data_derived/classifier/incident_types.json").read_text(encoding="utf-8"))
            db.add_all(
                [IncidentType(id=x["id"], external_code=x["external_code"], name=x["name"], data=x) for x in items]
            )
        for role, name in (
            ("trainee", "Даниил · учебное АРМ"),
            ("instructor", "Преподаватель"),
            ("administrator", "Администратор"),
        ):
            email = role + "@dds.local"
            if not db.scalar(select(User).where(User.email == email)):
                db.add(User(email=email, name=name, role=role, password_hash=passwords.hash(settings.demo_password)))
        for item in json.loads((ROOT / "data_derived/scenarios/demo.json").read_text(encoding="utf-8")):
            if not db.get(Scenario, item["id"]):
                db.add(Scenario(id=item["id"], title=item["title"], difficulty=item["difficulty"], data=item))
        db.commit()


if __name__ == "__main__":
    seed()
