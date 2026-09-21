from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
CP = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
DC = "http://purl.org/dc/elements/1.1/"
NS = {"w": W, "r": R, "cp": CP, "dc": DC}


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]).resolve()
    if not path.exists():
        fail(f"missing file: {path}")

    with zipfile.ZipFile(path) as package:
        xml_parts = {
            name: package.read(name)
            for name in package.namelist()
            if name.endswith(".xml")
        }

    for name, data in xml_parts.items():
        if "\u2014".encode("utf-8") in data:
            fail(f"em dash found in {name}")

    document_xml = ET.fromstring(xml_parts["word/document.xml"])
    bookmarks = {
        node.attrib[f"{{{W}}}name"]
        for node in document_xml.findall(".//w:bookmarkStart", NS)
        if not node.attrib.get(f"{{{W}}}name", "").startswith("_")
    }
    anchors = [
        node.attrib[f"{{{W}}}anchor"]
        for node in document_xml.findall(".//w:hyperlink[@w:anchor]", NS)
    ]
    missing = sorted(set(anchors) - bookmarks)
    if missing:
        fail(f"internal links target missing bookmarks: {missing}")
    if "Contents" not in bookmarks:
        fail("Contents bookmark is missing")
    if len(anchors) < 14:
        fail(f"expected a linked contents index, found only {len(anchors)} internal links")

    core = ET.fromstring(xml_parts["docProps/core.xml"])
    author_node = core.find("dc:creator", NS)
    authors = author_node.text if author_node is not None else ""
    expected_authors = "Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy"
    if authors != expected_authors:
        fail(f"unexpected document authors: {authors!r}")

    doc = Document(path)
    body_started = False
    justified = 0
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        style = paragraph.style.name if paragraph.style else ""
        if text.startswith("1 Problem Statement and Context") and style.startswith("Heading"):
            body_started = True
            continue
        if not body_started or not text:
            continue
        if style.startswith("Heading") or style in {"Title", "Code Block"}:
            continue
        if paragraph.alignment != WD_ALIGN_PARAGRAPH.JUSTIFY:
            fail(f"body paragraph is not justified: {text[:80]!r}; style={style!r}")
        justified += 1
        text_runs = [run for run in paragraph.runs if run.text.strip()]
        bold_runs = [run.text for run in text_runs if run.bold is True]
        if bold_runs:
            fail(f"bold run found in body paragraph: {bold_runs[0][:80]!r}")

    for table_index, table in enumerate(doc.tables):
        for row_index, row in enumerate(table.rows):
            allow_bold = table_index > 0 and row_index == 0
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        if run.text.strip() and run.bold is True and not allow_bold:
                            fail(
                                "bold run found outside a table header: "
                                f"table={table_index}; row={row_index}; text={run.text[:80]!r}"
                            )

    if justified < 20:
        fail(f"unexpectedly few justified body paragraphs: {justified}")

    sections = doc.sections
    if not sections:
        fail("document has no sections")
    letter_width = round(sections[0].page_width.inches, 2)
    letter_height = round(sections[0].page_height.inches, 2)
    if (letter_width, letter_height) != (8.5, 11.0):
        fail(f"expected US Letter portrait, got {letter_width} by {letter_height}")

    print(f"PASS: {path}")
    print(f"Internal links: {len(anchors)}; bookmarks: {len(bookmarks)}")
    print(f"Justified body paragraphs: {justified}; body bold runs: 0")
    print("Authors, navy document structure, US Letter layout, and em dash rule verified")


if __name__ == "__main__":
    main()
