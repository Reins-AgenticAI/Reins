from pathlib import Path

import build_prd_docx as builder


builder.SOURCE = builder.ROOT / "docs" / "Reins_PRD_Revision_1.md"
builder.OUTPUT = builder.ROOT / "output" / "docx" / "Reins_PRD_Revision_1.docx"
builder.TEMPLATE_SOURCE = Path(r"C:\Users\saipr\OneDrive\Documents\Lek\PRD\Reins_PRD_v1_0.docx")
builder.VERSION = "1"
builder.SUBTITLE = "Independent Policy Enforcement and Evidence for AI Agent Spend"
builder.DOCUMENT_CONTROL_LABEL = "Revision"
builder.DOCUMENT_CONTROL_VALUE = "1"
builder.FOOTER_DOCUMENT_LABEL = "Revision 1"
builder.STATUS = "Under review"
builder.DOCUMENT_DATE = "17 September 2026"
builder.TARGET_LAUNCH = "MVP demonstration within 12 weeks of PRD approval"
builder.DECISION_REQUEST = (
    "Approve the user problem, MVP scope, evidence-based launch gates, and local-first zero-cost constraint."
)


if __name__ == "__main__":
    builder.build()
