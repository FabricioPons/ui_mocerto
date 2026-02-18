"""Operation grouping — assigns documents to import operations A/B/C."""
from typing import Any, Dict

# Known operation identifiers from DOCUMENT_MAP
OPERATION_IDENTIFIERS = {
    "A": {
        "pedimento_numero": "25 81 3645 5000103",
        "bl_numeros": [],
        "contenedores": [],
        "invoice_numbers": [],
        "filenames": ["3645_81_5000103_IP_PN_1.pdf", "278864553.pdf"],
        "importer_rfc": "SCO8007138GA",
    },
    "B": {
        "pedimento_numero": "25 81 3645 5001570",
        "bl_numeros": ["IBC1399710"],
        "contenedores": ["JAYU1098003"],
        "invoice_numbers": ["FV25/288", "FV25288"],
        "filenames": [
            "FV25288.pdf", "SES3555 FA.pdf", "BL.pdf", "BL REV.pdf",
            "CE.pdf", "CERTIFICADO PRODUCCION.pdf", "Carta 3.1.8.pdf",
            "MV SES3555.pdf", "EIR JAYU1098003.pdf",
            "DOCS FV25-288 SERVIACERO (JAYU1098003).pdf",
        ],
        "importer_rfc": "SES7402068M2",
        "permit_prefix": "1119C",
    },
    "C": {
        "pedimento_numero": None,
        "bl_numeros": ["ONEYDLCG00246800"],
        "contenedores": ["TTNU8246386"],
        "invoice_numbers": ["26EZ705"],
        "filenames": [
            "26EZ705 BL.pdf", "26EZ705 INV.pdf", "26EZ705 PL.pdf",
            "26EZ705 COA.pdf", "26EZ705 COA-F.pdf", "26EZ705 INS.pdf",
            "CARTA ENCOMIENDA ONE .pdf",
        ],
        "importer_rfc": "DSA120213M87",
    },
}


def group_by_operation(doc: Dict[str, Any]) -> str:
    """Assign a document to an operation (A, B, C) using known identifiers."""
    filename = doc.get("file", "")
    fields = doc.get("fields", {})

    # Scanned docs and shared files
    if filename.startswith("escaneo_"):
        return "shared"

    # Check filename match first
    for op_id, idents in OPERATION_IDENTIFIERS.items():
        if filename in idents.get("filenames", []):
            return op_id

    # Check by prefix pattern
    if filename.startswith("26EZ705") or filename.startswith("CARTA ENCOMIENDA ONE"):
        return "C"
    if filename.startswith("1119C"):
        return "B"

    # Check by extracted field overlap
    bl = fields.get("bl_numero", "")
    container = fields.get("contenedor", "")
    invoice = fields.get("invoice_number", "")

    for op_id, idents in OPERATION_IDENTIFIERS.items():
        if bl and bl in idents.get("bl_numeros", []):
            return op_id
        if container and container in idents.get("contenedores", []):
            return op_id
        if invoice:
            for known_inv in idents.get("invoice_numbers", []):
                if known_inv in invoice or invoice in known_inv:
                    return op_id

    return "unknown"
