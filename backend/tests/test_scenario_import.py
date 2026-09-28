import copy
import json
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from import_reviewed_scenarios import validate_packages  # noqa: E402


def test_import_validates_foreign_keys_and_preserves_provenance():
    cases = json.loads((ROOT / "data_derived/scenarios/demo.json").read_text(encoding="utf-8"))
    ids = {case["card"]["incident_type_id"] for case in cases}
    assert validate_packages(cases, ids) == cases
    invalid = copy.deepcopy(cases)
    invalid[0]["card"]["incident_type_id"] = -1
    with pytest.raises(ValueError):
        validate_packages(invalid, ids)
    with pytest.raises(ValueError):
        validate_packages(cases + cases[:1], ids)
