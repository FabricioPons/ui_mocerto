"""Carta Encomienda field extractor."""
import re
from typing import Any, Dict

from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # BL number
    bl = first_match(r"(?:embarque|conocimiento)\s*(?:n[uú]mero|no\.?)[\s.:]*([A-Z0-9]+)", text, re.IGNORECASE)
    if not bl:
        bl = first_match(r"(?:B/L|BL)\s*(?:NO|N[°ºo.]?)[\s.:]*([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    # Company / importer
    company = first_match(r"representaci[oó]n\s+de\s+(.+?)\s+con\s+RFC", text, re.IGNORECASE)
    fields["importer_name"] = company.strip() if company else None

    # RFC
    rfc = first_match(r"RFC\s+([A-Z]{3}\d{6}[A-Z0-9]{3})", text)
    if not rfc:
        rfc = first_match(r"RFC:\s*([A-Z0-9]+)", upper)
    fields["importer_rfc"] = rfc

    # Agente aduanal
    agente = first_match(r"(?:agente\s*aduanal|apoderado\s*aduanal)[\s.:]*(.+?)(?:\s+Patente|\s+patente|,|\n)", text, re.IGNORECASE)
    fields["agente_aduanal"] = agente.strip() if agente else None

    # Patente
    patente = first_match(r"[Pp]atente[\s.:]*(\d+)", text)
    fields["patente"] = patente

    # Aduana
    aduana = first_match(r"aduana\s+de\s+([A-Za-z\s,]+?)(?:\.|,|\n)", text, re.IGNORECASE)
    fields["aduana"] = aduana.strip() if aduana else None

    return fields
