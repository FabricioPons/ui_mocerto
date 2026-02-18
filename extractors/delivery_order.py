"""Delivery Order field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    bl = first_match(r"(?:B/L|BL|BILL\s*OF\s*LADING)\s*(?:NO|NUMBER|N[°ºo.]?)[\s.:]*([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    cont = first_match(r"([A-Z]{4}\d{7})", text)
    fields["contenedor"] = cont

    vessel = first_match(r"(?:VESSEL|BUQUE)[\s.:]*([A-Z0-9\s\-]+?)(?:\n|$)", upper)
    if vessel:
        vessel = vessel.strip()
    fields["vessel"] = vessel

    # Gross weight
    wt = first_match(r"([\d,]+\.\d{3})\s*$", text, re.MULTILINE)
    if not wt:
        wt = first_match(r"(?:TOTAL|GROSS)[^0-9]*([\d,]+\.?\d*)\s*(?:KGM?|KG|KGS)?", upper)
    if not wt:
        wt = first_match(r"([\d,]+\.?\d*)\s*(?:KGM|KG|KGS)\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Packages
    pkg = first_match(r"[A-Z]{4}\d{7}\s+\d+\s*\w+\.?\s+[A-Z0-9]+\s+(\d+)\s+[\d,]+", text)
    if not pkg:
        pkg = first_match(r"(\d+)\s*(?:STEEL|PACKAGES?|PKGS?|CASES?|BAGS?|BUNDLES?|PALLETS?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Seal
    seal = first_match(r"[A-Z]{4}\d{7}\s+\d+\s*\w+\.?\s+([A-Z][A-Z0-9]+)\s+\d+\s+[\d,]", text)
    if not seal:
        seal = first_match(r"SEAL[\s.:]+([A-Z0-9]+)", upper)
    fields["seal"] = seal

    # Port of discharge
    pod = first_match(r"POD\s+([A-Z][A-Za-z]+)", text)
    if not pod:
        pod = first_match(r"PORT\s*OF\s*DISCHARGE[\s.:]*([A-Z][A-Za-z\s]+?)(?:\s{2,}|\n|$)", upper)
    fields["port_discharge"] = pod.strip().upper() if pod else None

    # Shipper / supplier
    text_lines = text.split("\n")
    shipper = None
    for i, line in enumerate(text_lines):
        if re.match(r"^Shipper\b", line, re.IGNORECASE):
            for j in range(i + 1, min(i + 3, len(text_lines))):
                candidate = text_lines[j].strip()
                if candidate and len(candidate) > 3:
                    m = re.match(r"([A-Z][A-Z\s]+?(?:SA|SL|LLC|LTD|INC|S\.?A\.?)(?:\s*DE\s*C\.?V\.?)?)\b", candidate)
                    if m:
                        shipper = m.group(1).strip()
                    else:
                        shipper = candidate.split("  ")[0].strip()
                    break
            break
    fields["supplier_name"] = shipper

    # Consignee
    cons = None
    for i, line in enumerate(text_lines):
        if re.match(r"^Consignee\b", line, re.IGNORECASE):
            for j in range(i + 1, min(i + 3, len(text_lines))):
                candidate = text_lines[j].strip()
                if candidate and len(candidate) > 3:
                    m = re.match(r"([A-Z][A-Z\s]+?(?:SA|SL|LLC|LTD|INC|S\.?A\.?)(?:\s*DE\s*C\.?V\.?)?)\b", candidate)
                    if m:
                        cons = m.group(1).strip()
                    else:
                        cons = candidate.split("  ")[0].strip()
                    break
            break
    fields["consignee"] = cons

    # ETA
    eta = first_match(r"ETA[\s.:]+(\d{2}/\d{2}/\d{4})", text)
    fields["eta"] = eta

    return fields
