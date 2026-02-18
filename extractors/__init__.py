"""Extractors package — dispatches text PDF extraction by document type."""
from pathlib import Path
from typing import Any, Dict

from extractors import (
    aviso_automatico,
    bill_of_lading,
    cargo_insurance,
    carta_encomienda,
    certificate_of_analysis,
    commercial_invoice,
    delivery_order,
    eir,
    factory_coa,
    packing_list,
    pedimento,
    vucem_acuse,
)
from extractors.common import first_match, get_pdf_text, is_image_pdf

__all__ = [
    "extract_text_pdf",
    "first_match",
    "get_pdf_text",
    "is_image_pdf",
]


def extract_text_pdf(pdf_path: Path, doc_type: str) -> Dict[str, Any]:
    """Extract cross-referenceable fields from a text-based PDF using regex."""
    # Pedimento is a special case — works directly on the PDF file
    if doc_type == "pedimento":
        return pedimento.extract(pdf_path)

    text = get_pdf_text(pdf_path)
    upper = text.upper()

    extractors_map = {
        "bill_of_lading": bill_of_lading,
        "commercial_invoice": commercial_invoice,
        "packing_list": packing_list,
        "cargo_insurance": cargo_insurance,
        "certificate_of_analysis": certificate_of_analysis,
        "delivery_order": delivery_order,
        "aviso_automatico": aviso_automatico,
        "vucem_acuse": vucem_acuse,
        "carta_encomienda": carta_encomienda,
        "equipment_interchange_receipt": eir,
        "factory_coa": factory_coa,
    }

    extractor = extractors_map.get(doc_type)
    if extractor:
        return extractor.extract(text, upper)

    return {}
