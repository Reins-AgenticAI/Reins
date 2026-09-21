from pathlib import Path

import build_prd_docx as builder


builder.SOURCE = builder.ROOT / "docs" / "Reins_PRD_v1_2_compact.md"
builder.OUTPUT = builder.ROOT / "output" / "docx" / "Reins_PRD_v1_2_compact.docx"
builder.VERSION = "1.2"
builder.STATUS = "Decision draft"
builder.DOCUMENT_DATE = "16 September 2026"
builder.DECISION_REQUEST = (
    "Approve the B2B platform wedge, the enforcement model, and a sandbox MVP built on one authoritative "
    "issuer path plus UCP and AP2 evidence handling."
)


if __name__ == "__main__":
    builder.build()
