"""VUCEM Acuse field extractor."""
import re
from typing import Any, Dict

from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # RFC
    rfc = first_match(r"RFC:\s*([A-Z0-9]+)", upper)
    if not rfc:
        rfc = first_match(r"\b([A-Z]{3}\d{6}[A-Z0-9]{3})\b", text)
    fields["importer_rfc"] = rfc

    # Company name
    company = first_match(r"(?:Estimado|ESTIMADO).*?(?:C\.|de)\s+(.+?)(?:\s*\(|,|\n)", text)
    if not company:
        company = first_match(r"^([A-Z][A-Z\s]+(?:SA DE CV|S\.?A\.?\s*DE\s*C\.?V\.?))", text, re.MULTILINE)
    fields["importer_name"] = company.strip() if company else None

    # e_document number
    edoc = first_match(r"e[_\s]?document\s+([A-Z0-9]+)", text, re.IGNORECASE)
    fields["e_document"] = edoc

    # Folio
    folio = first_match(r"(?:folio|FOLIO)[^:]*:\s*(\d+)", text)
    if not folio:
        folio = first_match(r"folio\s+(\d+)", text, re.IGNORECASE)
    fields["folio"] = folio

    return fields
