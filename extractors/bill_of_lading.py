"""Bill of Lading field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # BL number
    bl = first_match(r"B/L\s*NO\.?\s*:?\s*([A-Z0-9]+)", upper)
    if not bl:
        bl = first_match(r"(?:BILL OF LADING|WAYBILL)\s*(?:NO|NUMBER|NUM|N[°ºo.]?)[\s.:]*([A-Z0-9]+)", upper)
    if not bl:
        bl = first_match(r"(?:DOCUMENT|DOC)[\s.]?(?:NO|NUMBER)[\s.:]*([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    # Gross weight
    wt = first_match(r"GROSS\s*WEIGHT[^0-9]*?([\d,]+\.?\d*)\s*(?:KGS?|KG)", upper)
    if not wt:
        wt = first_match(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Container
    bl_value = (bl or "").upper()
    containers = re.findall(r"\b([A-Z]{4}\d{7})\b", text)
    cont = None
    for c in containers:
        if bl_value and c in bl_value:
            continue
        cont = c
        break
    fields["contenedor"] = cont

    # Packages
    pkg = first_match(r"(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BAGS?|BUNDLES?|PALLETS?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Vessel + voyage
    vessel = first_match(r"VESSEL\s*(?:VOYAGE)?[\s.:]*([A-Z][A-Z0-9\s\-]+?)\s+\d{3}[EW]", upper)
    if not vessel:
        vessel = first_match(r"(?:VESSEL|OCEAN\s*VESSEL|BUQUE)[\s.:]*([A-Z0-9\s\-]+?)(?:\s+V\.?\s*\d|\n)", upper)
    if vessel:
        vessel = vessel.strip()
    fields["vessel"] = vessel

    text_lines = text.split("\n")

    # Port of discharge
    pod = None
    for i, line in enumerate(text_lines):
        up_line = line.upper().strip()
        if not (up_line.startswith("PORT OF DISCHARGE") or up_line.startswith("PUERTO DE DESCARGA")):
            continue
        if " OR PLACE OF DELIVERY" in up_line:
            continue
        if i + 1 < len(text_lines):
            next_line = text_lines[i + 1].strip()
            port_match = re.match(r"([A-Z][A-Za-z\s]+?)(?:\s*,|\s{2,})", next_line)
            if port_match:
                pod = port_match.group(1).strip().upper()
            elif next_line:
                pod = next_line.split(",")[0].strip().upper()
        break
    fields["port_discharge"] = pod

    # Shipper / supplier
    shipper = None
    skip_words = {"BOOKING", "BILL OF LADING", "EXPORT", "FORWARDING", "FMC", "RECEIVED", "DOCUMENT"}
    for i, line in enumerate(text_lines):
        if re.search(r"SHIPPER", line, re.IGNORECASE):
            for j in range(i + 1, min(i + 5, len(text_lines))):
                candidate = text_lines[j].strip()
                if not candidate or len(candidate) < 4:
                    continue
                if any(w in candidate.upper() for w in skip_words):
                    continue
                if re.match(r"^[A-Z0-9]{5,20}$", candidate):
                    continue
                if re.match(r"^[A-Z0-9]+\s+[A-Z0-9]+$", candidate) and not re.search(r"[a-z]", candidate):
                    continue
                shipper = candidate
                break
            break
    fields["supplier_name"] = shipper

    # Consignee
    cons = None
    skip_cons = {"FORWARDING", "FMC", "RECEIVED", "NOTIFY", "BOOKING"}
    for i, line in enumerate(text_lines):
        if re.search(r"CONSIGNEE", line, re.IGNORECASE):
            for j in range(i + 1, min(i + 5, len(text_lines))):
                candidate = text_lines[j].strip()
                if not candidate or len(candidate) < 4:
                    continue
                if any(w in candidate.upper() for w in skip_cons):
                    continue
                if re.match(r"^[A-Z0-9]{5,20}$", candidate):
                    continue
                cons = candidate
                break
            break
    fields["consignee"] = cons

    return fields
