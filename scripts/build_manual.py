"""Build the reviewable Russian delivery PDF from versioned Markdown sources."""

from pathlib import Path
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
import pypdfium2

ROOT = Path(__file__).resolve().parents[1]
FONT = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Arial", str(FONT / "arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialBold", str(FONT / "arialbd.ttf")))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="ArialBold", italic="Arial", boldItalic="ArialBold")
body = ParagraphStyle("Body", fontName="Arial", fontSize=9.5, leading=14, spaceAfter=7, wordWrap="CJK")
heading = ParagraphStyle(
    "Heading",
    parent=body,
    fontName="ArialBold",
    fontSize=16,
    leading=21,
    spaceBefore=14,
    spaceAfter=12,
    keepWithNext=True,
)
subheading = ParagraphStyle("Subheading", parent=heading, fontSize=12, leading=17)
cell = ParagraphStyle("Cell", parent=body, fontSize=8, leading=11, spaceAfter=0)
story = []


def inline(text):
    text = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)
    text = escape(text).replace("`", "")
    return re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)


def paragraph(text, style=body):
    return Paragraph(inline(text), style)


def add_markdown(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    index = 0
    code = False
    while index < len(lines):
        line = lines[index].strip()
        if line.startswith("```"):
            code = not code
            index += 1
            continue
        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                values = [v.strip() for v in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[: -]+", v) for v in values):
                    rows.append([paragraph(v, cell) for v in values])
                index += 1
            table = Table(rows, colWidths=[495 / len(rows[0])] * len(rows[0]), repeatRows=1, hAlign="LEFT")
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5eded")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#c8d1d3")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            story.extend([table, Spacer(1, 10)])
            continue
        if line.startswith("# "):
            story.append(paragraph(line[2:], heading))
        elif line.startswith("## "):
            story.append(paragraph(line[3:], subheading))
        elif line and not line.startswith("!["):
            story.append(paragraph(line))
        index += 1


story.extend(
    [
        Spacer(1, 100),
        paragraph("ДДС · Учебный комплекс", heading),
        paragraph("DDS-2026 / версия 0.1.0", subheading),
        paragraph("Комплект эксплуатационных и технических материалов программы-минимум"),
        Spacer(1, 20),
        paragraph("Разработчик командной части: Даниил"),
        paragraph("Дата редакции: 20 сентября 2026 г."),
        paragraph("Статус: рабочая редакция для проверки и согласования командой."),
        paragraph(
            "Исходные редактируемые документы находятся в каталоге docs репозитория. Официальное подтверждение соответствия ГОСТ и акт приёмки не подменяются этим комплектом."
        ),
        PageBreak(),
    ]
)
for name in ("DOCUMENT_REGISTER.md", "USER_GUIDE.md", "DEPLOYMENT.md", "ACCEPTANCE.md", "OPEN_QUESTIONS.md"):
    add_markdown(ROOT / "docs" / name)
    story.append(PageBreak())
story.append(paragraph("Рабочее место: фактический снимок", heading))
screenshot = ROOT / "docs/images/workspace-desktop.png"
from PIL import Image as PILImage

with PILImage.open(screenshot) as img:
    width, height = img.size
scale = min(495 / width, 660 / height)
story.append(Image(str(screenshot), width=width * scale, height=height * scale))
out = ROOT / "docs/delivery"
out.mkdir(parents=True, exist_ok=True)
path = out / "DDS-2026-Manual.pdf"


def footer(canvas, doc):
    canvas.setFont("Arial", 8)
    canvas.setFillColor(colors.HexColor("#53696e"))
    canvas.drawString(50, 28, "DDS-2026 · Учебный комплекс · Рабочая редакция 0.1.0")
    canvas.drawRightString(A4[0] - 50, 28, str(doc.page))


SimpleDocTemplate(
    str(path),
    pagesize=A4,
    rightMargin=50,
    leftMargin=50,
    topMargin=45,
    bottomMargin=48,
    title="ДДС: эксплуатационный комплект 0.1.0",
    author="Даниил",
).build(story, onFirstPage=footer, onLaterPages=footer)
preview = ROOT / ".runtime/pdf-preview"
preview.mkdir(parents=True, exist_ok=True)
pdf = pypdfium2.PdfDocument(path)
for i in range(len(pdf)):
    pdf[i].render(scale=1).to_pil().save(preview / f"page-{i + 1}.png")
print(f"Built and rendered {len(pdf)} pages: {path.name}")
