"""Validate generated cases; explicitly import reviewed cases without overwrites."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.scenario_packages import validate_packages  # noqa: E402


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
