"""Cargo Insurance field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Amount insured
    val = first_match(r"USD\s+([\d,]+\.\d{2})\b", upper)
    if not val:
        val = first_match(r"(?:AMOUNT\s*INSURED|SUMA\s*ASEGURADA)[^U]*USD\s*([\d,]+\.?\d*)", upper)
    if not val:
        val = first_match(r"(?:TOTAL\s*AMOUNT\s*INSURED)[^U]*USD\s*([\d,]+\.?\d*)", upper)
    fields["valor_usd"] = normalize_amount(val) if val else None

    # Policy number
    policy = first_match(r"POLICY\s*NO\.?\)?[：:.]*\s*([A-Z0-9]+)", upper)
    fields["policy_number"] = policy

    # Insured name
    insured = first_match(r"(?:THE\s*INSURED|INSURED)\)?[：:.]*\s*([A-Z][^\n]+)", text)
    fields["insured_name"] = insured.strip() if insured else None

    # Invoice number
    inv = first_match(r"INVOICE\s*NO\.?\)?\s+([A-Z0-9/\-]+)", upper)
    fields["invoice_number"] = inv

    # BL number
    bl = first_match(r"B/L\s*NO\.?\)?\s+([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    # Vessel / conveyance
    vessel = first_match(r"(?:PER\s*CONVEYANCE|CONVEYANCE)\)?[：:.]*\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    fields["vessel"] = vessel.strip() if vessel else None

    # Packages
    pkg = first_match(r"(\d+)\s*(?:BAGS?|PACKAGES?|PKGS?|CASES?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Origin / destination
    origin = first_match(r"FROM\)?[：:.]*\s*([A-Z][A-Z\s,]+?)(?:\s+(?:VIA|经)|\n)", text, re.IGNORECASE)
    fields["origin"] = origin.strip() if origin else None

    dest = first_match(r"至\s*\(TO\)\s*[：:.]*\s*([A-Z][A-Z\s,]+?)(?:\n|$)", text)
    if not dest:
        dest = first_match(r"TO\)?[：:.]\s*([A-Z][A-Z\s]+(?:MEXICO|CHINA|USA|JAPAN|KOREA|INDIA|BRAZIL))", text, re.IGNORECASE)
    fields["destination"] = dest.strip() if dest else None

    return fields
