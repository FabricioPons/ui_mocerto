"""Packing List field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Gross weight
    wt = first_match(r"(?:TOTAL\s*)?(?:GROSS\s*WEIGHT|PESO\s*BRUTO)[^0-9]*([\d,]+\.?\d*)\s*(?:KGS?|KG)?", upper)
    if not wt:
        wt = first_match(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Packages
    pkg = first_match(r"(?:TOTAL\s*)?(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BAGS?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Consignee
    cons = first_match(r"CONSIGNEE[^:\n]*[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    if not cons:
        cons = first_match(r"(?:TO|BUYER|DESTINATARIO)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["consignee"] = cons.strip() if cons else None

    return fields
