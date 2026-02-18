"""Document classification by filename patterns and content heuristics."""
import re
from typing import List, Tuple

# Patterns checked top-to-bottom; first match wins.
CLASSIFICATION_RULES: List[Tuple[str, str]] = [
    (r"^3645_", "pedimento"),
    (r"^escaneo_", "scanned_docs"),
    (r"(?i)\bPL\b", "packing_list"),
    (r"(?i)\bBL\s*REV\b", "delivery_order"),
    (r"(?i)\bBL\b", "bill_of_lading"),
    (r"(?i)\bINV\b", "commercial_invoice"),
    (r"(?i)\bCOA-F\b", "factory_coa"),
    (r"(?i)\bCOA\b", "certificate_of_analysis"),
    (r"(?i)\bINS\b", "cargo_insurance"),
    (r"(?i)\bEIR\b", "equipment_interchange_receipt"),
    (r"(?i)CARTA\s*ENCOMIENDA", "carta_encomienda"),
    (r"(?i)CE\.pdf$", "carta_encomienda"),
    (r"(?i)CERTIFICADO\s*PRODUCCION", "certificado_produccion"),
    (r"(?i)Carta\s*3[\.\s]*1[\.\s]*8", "carta_3_1_8"),
    (r"(?i)\bMV\b", "manifestacion_de_valor"),
    (r"(?i)^FV\d+", "commercial_invoice"),
    (r"(?i)^SES\d+\s*FA", "commercial_invoice"),
    (r"(?i)^DOCS\s", "document_compilation"),
    (r"(?i)^278864553", "vucem_acuse"),
    (r"(?i)^1119C", "aviso_automatico"),
]

# Content-based fallback heuristics (substring in extracted text)
CONTENT_HEURISTICS: List[Tuple[str, str]] = [
    ("BILL OF LADING", "bill_of_lading"),
    ("WAYBILL", "bill_of_lading"),
    ("CONOCIMIENTO DE EMBARQUE", "bill_of_lading"),
    ("COMMERCIAL INVOICE", "commercial_invoice"),
    ("FACTURA COMERCIAL", "commercial_invoice"),
    ("PACKING LIST", "packing_list"),
    ("LISTA DE EMPAQUE", "packing_list"),
    ("CERTIFICATE OF ANALYSIS", "certificate_of_analysis"),
    ("CARGO TRANSPORTATION INSURANCE", "cargo_insurance"),
    ("INSURANCE POLICY", "cargo_insurance"),
    ("CARTA ENCOMIENDA", "carta_encomienda"),
    ("CERTIFICADO DE PRODUCCION", "certificado_produccion"),
    ("MANIFESTACION DE VALOR", "manifestacion_de_valor"),
    ("AVISO AUTOMATICO", "aviso_automatico"),
    ("PEDIMENTO", "pedimento"),
    ("NUM. PEDIMENTO", "pedimento"),
]


def classify_document(filename: str, text_content: str = "") -> str:
    """Classify a PDF by document type using filename patterns + content heuristics."""
    for pattern, doc_type in CLASSIFICATION_RULES:
        if re.search(pattern, filename):
            return doc_type

    upper = text_content.upper()
    for anchor, doc_type in CONTENT_HEURISTICS:
        if anchor in upper:
            return doc_type

    return "unknown"
