"""Shared utilities for text-based PDF extractors."""
import re
from pathlib import Path
from typing import Optional

import pdfplumber


def first_match(pattern: str, text: str, flags: int = 0) -> Optional[str]:
    """Return first capture group from regex match."""
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def get_pdf_text(pdf_path: Path) -> str:
    """Extract all text from a PDF using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
    except Exception:
        pass
    return text


def is_image_pdf(pdf_path: Path) -> bool:
    """Check if PDF needs OCR/GPT (extractable text < 100 chars)."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_text = ""
            for page in pdf.pages:
                total_text += page.extract_text() or ""
                if len(total_text) >= 100:
                    return False
        return len(total_text.strip()) < 100
    except Exception:
        return True
