"""Commercial Invoice field extractor."""
import re
from typing import Any, Dict

from extract_pedimento import normalize_amount
from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Invoice number
    inv = first_match(r"(?:INVOICE|FACTURA)\s*(?:NO|NUMBER|NUM|N[°ºo.]?)[\s.:]*([A-Z0-9/\-]+)", upper)
    if not inv:
        inv = first_match(r"(?:N[°ºo.]\s*FACTURA|NUESTRA\s*REF)[\s.:]*([A-Z0-9/\-]+)", upper)
    fields["invoice_number"] = inv

    # Total USD
    val = first_match(r"(?:TOTAL|IMPORTE\s*TOTAL|AMOUNT|CIF)[^0-9]*([\d,]+\.?\d*)\s*(?:USD|U\.S\.D|DOLARES)?", upper)
    if not val:
        all_amounts = re.findall(r"([\d,]+\.\d{2})", text)
        if all_amounts:
            val = all_amounts[-1]
    fields["valor_usd"] = normalize_amount(val) if val else None

    # Gross weight
    wt = first_match(r"(?:PESO\s*BRUTO|GROSS\s*WEIGHT|PESO\s*TOTAL)[^0-9]*([\d,]+\.?\d*)\s*(?:KGS?|KG)", upper)
    if not wt:
        wt = first_match(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Packages
    pkg = first_match(r"(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BULTOS?|BAGS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Supplier
    seller = first_match(r"(?:SELLER|SHIPPER|EXPORTER|PROVEEDOR|VENDEDOR)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["supplier_name"] = seller.strip() if seller else None

    # Consignee / buyer
    buyer = first_match(r"(?:BUYER|CONSIGNEE|COMPRADOR|IMPORTADOR|DESTINATARIO)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["consignee"] = buyer.strip() if buyer else None

    # Importer RFC
    rfc = first_match(r"RFC[\s.:]*([A-Z]{3,4}\d{6}[A-Z0-9]{3})", upper)
    fields["importer_rfc"] = rfc

    return fields
