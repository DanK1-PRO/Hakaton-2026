"""Record source identities without editing or publishing original customer files."""

import csv
import hashlib
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
rows = []
for directory in ("Данные заказчика", "ТЗ для хакатона"):
    for path in sorted((ROOT / directory).rglob("*")):
        if not path.is_file():
            continue
        data = path.read_bytes()
        relative = path.relative_to(ROOT).as_posix()
        rows.append((relative, len(data), hashlib.sha256(data).hexdigest(), "original"))
        if path.suffix.lower() == ".zip":
            with zipfile.ZipFile(path) as archive:
                for entry in archive.infolist():
                    if not entry.is_dir():
                        content = archive.read(entry)
                        rows.append(
                            (
                                relative + "::" + entry.filename,
                                len(content),
                                hashlib.sha256(content).hexdigest(),
                                "archive_member",
                            )
                        )
out = ROOT / "docs" / "FILE_MANIFEST.csv"
with out.open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.writer(stream)
    writer.writerow(["source", "size_bytes", "sha256", "kind"])
    writer.writerows(rows)
print(f"Recorded {len(rows)} source identities; originals unchanged")
