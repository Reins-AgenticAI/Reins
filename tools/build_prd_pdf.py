from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "Reins_PRD_v1_1.md"
OUTPUT = ROOT / "output" / "pdf" / "Reins_PRD_v1_1.pdf"

NAVY = colors.HexColor("#17365D")
BLUE = colors.HexColor("#24527A")
TEAL = colors.HexColor("#1F7A8C")
INK = colors.HexColor("#17212B")
MUTED = colors.HexColor("#5B6573")
PALE = colors.HexColor("#EAF1F7")
PALE_TEAL = colors.HexColor("#E8F4F5")
GRID = colors.HexColor("#B8C4D0")
WHITE = colors.white


def inline_markup(value: str) -> str:
    """Convert a small, safe Markdown subset to ReportLab paragraph markup."""
    placeholders: dict[str, str] = {}

    def hold(markup: str) -> str:
        key = f"@@H{len(placeholders)}@@"
        placeholders[key] = markup
        return key

    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        lambda m: hold(
            f'<link href="{html.escape(m.group(2), quote=True)}" color="#24527A">'
            f'<u>{html.escape(m.group(1))}</u></link>'
        ),
        value,
    )
    value = re.sub(
        r"`([^`]+)`", lambda m: hold(f'<font name="Courier">{html.escape(m.group(1))}</font>'), value
    )
    value = re.sub(r"\*\*([^*]+)\*\*", lambda m: hold(f"<b>{html.escape(m.group(1))}</b>"), value)
    value = html.escape(value)
    for key, markup in placeholders.items():
        value = value.replace(key, markup)
    return value


class ReinsDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="body",
        )
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=self._draw_page))

    def _draw_page(self, canvas, doc):
        canvas.saveState()
        width, height = letter
        if doc.page > 1:
            canvas.setStrokeColor(GRID)
            canvas.setLineWidth(0.5)
            canvas.line(self.leftMargin, height - 0.43 * inch, width - self.rightMargin, height - 0.43 * inch)
            canvas.setFont("Helvetica-Bold", 7.5)
            canvas.setFillColor(NAVY)
            canvas.drawString(self.leftMargin, height - 0.32 * inch, "REINS - PRODUCT REQUIREMENTS DOCUMENT")
            canvas.setFont("Helvetica", 7.5)
            canvas.setFillColor(MUTED)
            canvas.drawRightString(width - self.rightMargin, height - 0.32 * inch, "v1.1 | 16 Sep 2026")
            canvas.line(self.leftMargin, 0.43 * inch, width - self.rightMargin, 0.43 * inch)
            canvas.drawString(self.leftMargin, 0.28 * inch, "Independent policy enforcement and authorization evidence")
            canvas.drawRightString(width - self.rightMargin, 0.28 * inch, f"Page {doc.page}")
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            if style in {"H1", "H2", "H3"}:
                level = {"H1": 0, "H2": 0, "H3": 1}[style]
                text = flowable.getPlainText()
                key = f"heading-{self.seq.nextf('heading')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=level, closed=False)
                self.notify("TOCEntry", (level, text, self.page, key))


def make_styles():
    sample = getSampleStyleSheet()
    styles = {
        "CoverKicker": ParagraphStyle(
            "CoverKicker",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=TEAL,
            alignment=TA_CENTER,
            spaceAfter=13,
            tracking=1.2,
        ),
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=sample["Title"],
            fontName="Helvetica-Bold",
            fontSize=31,
            leading=34,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "CoverSub": ParagraphStyle(
            "CoverSub",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=19,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "CoverMeta": ParagraphStyle(
            "CoverMeta",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=INK,
        ),
        "CoverDecision": ParagraphStyle(
            "CoverDecision",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            textColor=INK,
            borderColor=TEAL,
            borderWidth=0.8,
            borderPadding=12,
            backColor=PALE_TEAL,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=sample["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=20,
            textColor=NAVY,
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=sample["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.6,
            leading=15,
            textColor=NAVY,
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "H3": ParagraphStyle(
            "H3",
            parent=sample["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10.4,
            leading=13,
            textColor=BLUE,
            spaceBefore=9,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=8.25,
            leading=11.2,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=5.5,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=sample["BodyText"],
            fontName="Helvetica",
            fontSize=8.15,
            leading=10.8,
            textColor=INK,
            leftIndent=3,
            firstLineIndent=0,
            spaceAfter=2.5,
        ),
        "Quote": ParagraphStyle(
            "Quote",
            parent=sample["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=14,
            textColor=NAVY,
            leftIndent=12,
            rightIndent=12,
            borderColor=TEAL,
            borderWidth=1,
            borderPadding=10,
            backColor=PALE_TEAL,
            spaceBefore=6,
            spaceAfter=9,
        ),
        "Code": ParagraphStyle(
            "Code",
            parent=sample["Code"],
            fontName="Courier",
            fontSize=6.7,
            leading=8.4,
            textColor=INK,
            leftIndent=8,
            rightIndent=8,
            borderColor=GRID,
            borderWidth=0.5,
            borderPadding=7,
            backColor=colors.HexColor("#F5F7F9"),
            spaceBefore=5,
            spaceAfter=7,
        ),
        "TableHead": ParagraphStyle(
            "TableHead",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.9,
            leading=8.3,
            textColor=WHITE,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=6.7,
            leading=8.3,
            textColor=INK,
        ),
        "TOCHead": ParagraphStyle(
            "TOCHead",
            parent=sample["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=21,
            textColor=NAVY,
            spaceAfter=12,
        ),
    }
    return styles


def parse_table(lines: list[str], styles, available_width: float):
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c or "") for c in cells):
            continue
        rows.append(cells)
    if not rows:
        return Spacer(1, 1)

    cols = max(len(row) for row in rows)
    for row in rows:
        row.extend([""] * (cols - len(row)))

    if cols == 4:
        proportions = [0.10, 0.30, 0.10, 0.50]
    elif cols == 3:
        proportions = [0.20, 0.39, 0.41]
    elif cols == 2:
        proportions = [0.28, 0.72]
    else:
        proportions = [1 / cols] * cols
    widths = [available_width * p for p in proportions]

    formatted = []
    for r_index, row in enumerate(rows):
        style = styles["TableHead"] if r_index == 0 else styles["TableCell"]
        formatted.append([Paragraph(inline_markup(cell), style) for cell in row])

    table = Table(formatted, colWidths=widths, repeatRows=1, hAlign="LEFT", splitByRow=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("GRID", (0, 0), (-1, -1), 0.35, GRID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
            + [
                ("BACKGROUND", (0, r), (-1, r), PALE if r % 2 == 0 else WHITE)
                for r in range(1, len(rows))
            ]
        )
    )
    return table


def build_story(markdown_text: str, styles, doc_width: float):
    story = []

    # Purpose-built cover keeps the long document easy to scan and present.
    story.extend(
        [
            Spacer(1, 1.0 * inch),
            Paragraph("PRODUCT REQUIREMENTS DOCUMENT", styles["CoverKicker"]),
            Paragraph("Reins", styles["CoverTitle"]),
            Paragraph(
                "Independent Policy Enforcement and Authorization Evidence for AI-Agent Spend",
                styles["CoverSub"],
            ),
            Spacer(1, 0.28 * inch),
            HRFlowable(width="72%", thickness=2, color=TEAL, hAlign="CENTER"),
            Spacer(1, 0.34 * inch),
        ]
    )

    metadata = [
        ["Version", "1.1"],
        ["Status", "Evidence-based revision for validation"],
        ["Date", "16 September 2026"],
        ["Authors", "Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy"],
        ["Ownership", "Shared product requirements document"],
        ["Audience", "Product, Engineering, Security, Payments Risk, Legal/Compliance, Partnerships"],
    ]
    meta_table = Table(
        [[Paragraph(f"<b>{k}</b>", styles["CoverMeta"]), Paragraph(v, styles["CoverMeta"])] for k, v in metadata],
        colWidths=[1.15 * inch, 4.65 * inch],
        hAlign="CENTER",
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), PALE),
                ("GRID", (0, 0), (-1, -1), 0.5, GRID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([meta_table, Spacer(1, 0.32 * inch)])
    story.append(
        Paragraph(
            "<b>Decision requested:</b> Approve the revised wedge, enforcement model, validation gates, "
            "and sandbox MVP. Production money movement and broad all-rails claims remain gated on partner, "
            "security, PCI, and legal review.",
            styles["CoverDecision"],
        )
    )
    story.append(PageBreak())

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "TOC0",
            fontName="Helvetica",
            fontSize=8.8,
            leading=12,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
            spaceAfter=2,
        ),
        ParagraphStyle(
            "TOC1",
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            leftIndent=14,
            firstLineIndent=0,
            textColor=MUTED,
            spaceAfter=1,
        ),
    ]
    story.extend([Paragraph("Contents", styles["TOCHead"]), toc, PageBreak()])

    parts = markdown_text.split("---", 1)
    body = parts[1] if len(parts) == 2 else markdown_text
    lines = body.splitlines()
    i = 0
    paragraph_buffer: list[str] = []
    bullet_buffer: list[str] = []
    number_buffer: list[str] = []

    def flush_paragraph():
        nonlocal paragraph_buffer
        if paragraph_buffer:
            text = " ".join(s.strip() for s in paragraph_buffer)
            story.append(Paragraph(inline_markup(text), styles["Body"]))
            paragraph_buffer = []

    def flush_bullets():
        nonlocal bullet_buffer
        if bullet_buffer:
            items = [
                ListItem(Paragraph(inline_markup(item), styles["Bullet"]), leftIndent=10)
                for item in bullet_buffer
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    start="circle",
                    leftIndent=15,
                    bulletFontName="Helvetica",
                    bulletFontSize=6,
                    spaceAfter=5,
                )
            )
            bullet_buffer = []

    def flush_numbers():
        nonlocal number_buffer
        if number_buffer:
            items = [
                ListItem(Paragraph(inline_markup(item), styles["Bullet"]), leftIndent=14)
                for item in number_buffer
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="1",
                    leftIndent=20,
                    bulletFontName="Helvetica-Bold",
                    bulletFontSize=7,
                    spaceAfter=5,
                )
            )
            number_buffer = []

    def flush_all():
        flush_paragraph()
        flush_bullets()
        flush_numbers()

    while i < len(lines):
        raw = lines[i].rstrip()
        stripped = raw.strip()
        if not stripped:
            flush_all()
            i += 1
            continue

        if stripped.startswith("```"):
            flush_all()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i].rstrip())
                i += 1
            story.append(Preformatted("\n".join(code_lines), styles["Code"])); i += 1
            continue

        if stripped.startswith("|"):
            flush_all()
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            story.append(parse_table(table_lines, styles, doc_width))
            story.append(Spacer(1, 7))
            continue

        if stripped.startswith("# "):
            # Title is already represented on the cover.
            flush_all(); i += 1; continue
        if stripped.startswith("## "):
            flush_all()
            story.append(Paragraph(inline_markup(stripped[3:]), styles["H2"])); i += 1; continue
        if stripped.startswith("### "):
            flush_all()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["H3"])); i += 1; continue
        if stripped == "---":
            flush_all(); story.append(Spacer(1, 3)); i += 1; continue
        if stripped.startswith("> "):
            flush_all()
            quote_lines = [stripped[2:]]
            i += 1
            while i < len(lines) and lines[i].strip().startswith("> "):
                quote_lines.append(lines[i].strip()[2:]); i += 1
            story.append(Paragraph(inline_markup(" ".join(quote_lines)), styles["Quote"]))
            continue
        if re.match(r"^-\s+", stripped):
            flush_paragraph(); flush_numbers()
            bullet_buffer.append(re.sub(r"^-\s+", "", stripped)); i += 1; continue
        if re.match(r"^\d+\.\s+", stripped):
            flush_paragraph(); flush_bullets()
            number_buffer.append(re.sub(r"^\d+\.\s+", "", stripped)); i += 1; continue

        paragraph_buffer.append(stripped)
        i += 1

    flush_all()
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    doc = ReinsDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        leftMargin=0.62 * inch,
        rightMargin=0.62 * inch,
        topMargin=0.58 * inch,
        bottomMargin=0.58 * inch,
        title="Reins PRD v1.1",
        author="Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy",
        subject="Independent policy enforcement and authorization evidence for AI-agent spend",
        creator="Codex with ReportLab",
    )
    story = build_story(SOURCE.read_text(encoding="utf-8"), styles, doc.width)
    doc.multiBuild(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
