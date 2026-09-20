"""Read immutable customer archives and build an inspection cache."""

from pathlib import Path
import json
import zipfile
from pypdf import PdfReader
from docx import Document
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Данные заказчика"
OUT = ROOT / "data_derived" / "raw"
OUT.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(SOURCE / "Датасет.zip") as archive:
    for entry in archive.infolist():
        if not entry.is_dir():
            (OUT / Path(entry.filename).name).write_bytes(archive.read(entry))
for path in list(SOURCE.glob("*.pdf")) + list(OUT.glob("*.pdf")):
    reader = PdfReader(path)
    text = "\n\n".join(f"PAGE {i + 1}\n{page.extract_text() or ''}" for i, page in enumerate(reader.pages))
    (OUT / (path.stem + ".txt")).write_text(text, encoding="utf-8")
for path in SOURCE.glob("*.docx"):
    doc = Document(path)
    (OUT / (path.stem + ".txt")).write_text("\n".join(p.text for p in doc.paragraphs), encoding="utf-8")
    if path.name.startswith("СКРИНШОТ"):
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if name.startswith("word/media/"):
                    (OUT / (path.stem + "_" + Path(name).name)).write_bytes(archive.read(name))
path = next(OUT.glob("*.xlsx"))
ws = openpyxl.load_workbook(path, data_only=True).active
rows = [[str(c) if c is not None else None for c in row] for row in ws.iter_rows(values_only=True)]
(OUT / "classifier_rows.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Cached {len(list(OUT.iterdir()))} source files; classifier {ws.max_row} x {ws.max_column}")
