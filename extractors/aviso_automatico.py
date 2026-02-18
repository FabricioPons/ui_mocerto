"""Aviso Automatico field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # RFC
    rfc = first_match(r"\b([A-Z]{3}\d{6}[A-Z0-9]{3})\b", text)
    fields["importer_rfc"] = rfc

    # Company name
    company = first_match(r"^([A-Z][A-Z\s]+(?:SA DE CV|S\.?A\.?\s*DE\s*C\.?V\.?))", text, re.MULTILINE)
    fields["importer_name"] = company.strip() if company else None

    # Clave aviso automatico
    clave = first_match(r"(1119C\d+)", text)
    fields["clave_aviso"] = clave

    # Certificado number
    cert = first_match(r"Certificado\s*No\.?\s*([A-Z0-9/]+)", text)
    fields["certificado"] = cert

    # Fraccion arancelaria
    frac = first_match(r"(\d{8})\s+\d+\s+", text)
    fields["fraccion_arancelaria"] = frac

    # Pais de origen
    pais = first_match(r"\d{8}\s+\d+\s+(\S+)\s+\d+", text)
    fields["pais_origen"] = pais

    # Cantidad (KG)
    cant = first_match(r"\d{8}\s+\d+\s+\S+\s+(\d+)\s+Kilogramo", text)
    fields["peso_bruto"] = float(cant) if cant else None

    # Valor USD
    val = first_match(r"Valor USD\s*\n?\s*([\d,.]+)", text)
    if not val:
        val = first_match(r"\d+\s+Kilogramo\s*\(KG\)\s+([\d,.]+)", text)
    fields["valor_usd"] = normalize_amount(val) if val else None

    # Aduana de entrada
    aduana = first_match(r"Aduana\s*de\s*entrada:\s*(.+?)(?:\n|$)", text)
    fields["aduana"] = aduana.strip() if aduana else None

    return fields
