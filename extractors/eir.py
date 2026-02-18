"""Equipment Interchange Receipt field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Container number
    cont = first_match(r"([A-Z]{4}\d{7})", text)
    fields["contenedor"] = cont

    # VGM weight
    vgm = first_match(r"VGM[\s.:]*(\d[\d,.]+)", upper)
    fields["vgm_weight"] = normalize_amount(vgm) if vgm else None

    # Size/type
    size = first_match(r"(?:TAMA[ÑN]O|SIZE)[\s.:]*(\d+)", upper)
    tipo = first_match(r"(?:TIPO|TYPE)[\s.:]*(\w+)", upper)
    if size and tipo:
        fields["size_type"] = f"{size} {tipo}"
    elif size:
        fields["size_type"] = size

    # Seal
    seal = first_match(r"SELLOS?[\s.:]*([A-Z0-9]+)", upper)
    fields["seal"] = seal

    # Cliente
    cliente = first_match(r"CLIENTE[\s.:]*(.+?)(?:\n|$)", text)
    fields["cliente"] = cliente.strip() if cliente else None

    # Linea naviera / shipping line
    linea = first_match(r"(?:LINEA\s*NAVIERA|NAVIERA|SHIPPING\s*LINE)[\s.:]*(.+?)(?:\n|BUQUE|$)", text, re.IGNORECASE)
    fields["linea_naviera"] = linea.strip() if linea else None

    return fields
