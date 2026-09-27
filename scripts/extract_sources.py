"""Read immutable customer archives and build an inspection cache."""

from pathlib import Path
import json
import zipfile

try:
    from pypdf import PdfReader
except ModuleNotFoundError:
    PdfReader = None

try:
    from docx import Document
except ModuleNotFoundError:
    Document = None

try:
    import openpyxl
except ModuleNotFoundError:
    openpyxl = None

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Данные заказчика"
OUT = ROOT / "data_derived" / "raw"
OUT.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(SOURCE / "Датасет.zip") as archive:
    for entry in archive.infolist():
        if not entry.is_dir():
            (OUT / Path(entry.filename).name).write_bytes(archive.read(entry))
if PdfReader:
    for path in list(SOURCE.glob("*.pdf")) + list(OUT.glob("*.pdf")):
        reader = PdfReader(path)
        text = "\n\n".join(f"PAGE {i + 1}\n{page.extract_text() or ''}" for i, page in enumerate(reader.pages))
        (OUT / (path.stem + ".txt")).write_text(text, encoding="utf-8")
else:
    print("Skipped PDF text extraction: install scripts/requirements-tools.txt for pypdf")
for path in SOURCE.glob("*.docx"):
    if Document:
        doc = Document(path)
        (OUT / (path.stem + ".txt")).write_text("\n".join(p.text for p in doc.paragraphs), encoding="utf-8")
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.startswith("word/media/"):
                (OUT / (path.stem + "_" + Path(name).name)).write_bytes(archive.read(name))
if openpyxl:
    path = next(OUT.glob("*.xlsx"))
    ws = openpyxl.load_workbook(path, data_only=True).active
    rows = [[str(c) if c is not None else None for c in row] for row in ws.iter_rows(values_only=True)]
    (OUT / "classifier_rows.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Cached {len(list(OUT.iterdir()))} source files; classifier {ws.max_row} x {ws.max_column}")
else:
    print("Skipped classifier extraction: install scripts/requirements-tools.txt for openpyxl")
    print(f"Cached {len(list(OUT.iterdir()))} source files")
