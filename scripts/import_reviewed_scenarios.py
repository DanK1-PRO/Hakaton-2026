"""Validate generated cases; explicitly import reviewed cases without overwrites."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Literal

from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.schemas import IncidentInput  # noqa: E402


class Reference(BaseModel):
    version: str = Field(min_length=1)
    address: str = Field(min_length=1)
    incident_type_id: int
    expected_actions: list[
        Literal["accepted", "rejected", "responding", "arrived", "working", "completed", "refused"]
    ] = Field(min_length=1)


class ScenarioPackage(BaseModel):
    schema_version: Literal["1.0"]
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=300)
    difficulty: Literal["easy", "medium", "hard"]
    service: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    briefing: list[str]
    card: IncidentInput
    reference: Reference
    source: dict


def validate_packages(items, classifier_ids):
    if not isinstance(items, list) or not items:
        raise ValueError("Expected a nonempty scenario array")
    ids = set()
    for item in items:
        case = ScenarioPackage.model_validate(item)
        if case.id in ids:
            raise ValueError("Duplicate scenario ID: " + case.id)
        ids.add(case.id)
        if case.card.incident_type_id not in classifier_ids or case.reference.incident_type_id not in classifier_ids:
            raise ValueError("Unknown classifier row: " + case.id)
        if not case.source.get("type") or not case.source.get("status"):
            raise ValueError("Missing source provenance: " + case.id)
    return items


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--reviewer", help="Named instructor; omitted means validation only")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    classifier = json.loads((root / "data_derived/classifier/incident_types.json").read_text(encoding="utf-8"))
    cases = validate_packages(json.loads(args.file.read_text(encoding="utf-8")), {x["id"] for x in classifier})
    if not args.reviewer or not args.reviewer.strip():
        print(f"Validated {len(cases)} cases. No database changes; instructor review required.")
        return
    from app.db import SessionLocal
    from app.models import Scenario

    with SessionLocal() as db:
        for item in cases:
            if db.get(Scenario, item["id"]):
                raise ValueError("Existing scenario is immutable; use a new ID: " + item["id"])
            item["source"] = {
                **item["source"],
                "status": "TEAM_REVIEWED",
                "reviewer": args.reviewer,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
            db.add(Scenario(id=item["id"], title=item["title"], difficulty=item["difficulty"], data=item))
        db.commit()
    print(f"Imported {len(cases)} instructor-reviewed scenarios")


if __name__ == "__main__":
    main()
