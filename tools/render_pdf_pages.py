from __future__ import annotations

import sys
from pathlib import Path

import pypdfium2 as pdfium


def main() -> None:
    pdf_path = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    document = pdfium.PdfDocument(pdf_path)
    for index in range(len(document)):
        page = document[index]
        target = output_dir / f"page-{index + 1:03d}.png"
        page.render(scale=2.0).to_pil().save(target)
    print(f"Rendered {len(document)} pages to {output_dir}")


if __name__ == "__main__":
    main()
