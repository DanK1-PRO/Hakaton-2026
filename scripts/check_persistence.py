"""Snapshot/verify saved session IDs and evaluation payloads across an app/DB restart."""

import argparse
import json
from pathlib import Path
import httpx

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["before", "after"])
args = parser.parse_args()
with httpx.Client(base_url="http://127.0.0.1:8000/api/v1", timeout=15) as client:
    login = client.post("/auth/login", data={"username": "instructor@dds.local", "password": "DdsDemo2026!"})
    login.raise_for_status()
    response = client.get("/simulation/sessions", headers={"Authorization": "Bearer " + login.json()["access_token"]})
    response.raise_for_status()
    saved = {s["id"]: s["evaluation"] for s in response.json() if s["status"] == "finished"}
    assert saved, "No saved sessions available to verify"
    path = root / ".runtime/persistence-before.json"
    if args.mode == "before":
        path.write_text(json.dumps(saved), encoding="utf-8")
        print(f"Snapshot: {len(saved)} saved evaluations")
    else:
        before = json.loads(path.read_text(encoding="utf-8"))
        assert all(saved.get(k) == v for k, v in before.items()), "Persistence mismatch"
        output = root / "docs/evidence"
        output.mkdir(parents=True, exist_ok=True)
        (output / "persistence.json").write_text(
            json.dumps({"restart_preserved_evaluations": len(before), "status": "passed"}, indent=2), encoding="utf-8"
        )
        print(f"Verified: {len(before)} evaluations unchanged after restart")
