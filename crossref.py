"""Cross-reference engine — compares document fields against pedimento data."""
from typing import Any, Dict, List

from config import NUMERIC_TOLERANCE

CROSS_REF_FIELDS = {
    "bill_of_lading": [
        "bl_numero", "peso_bruto", "contenedor", "bultos",
        "supplier_name", "consignee", "vessel", "port_discharge",
    ],
    "commercial_invoice": [
        "invoice_number", "valor_usd", "peso_bruto", "bultos",
        "supplier_name", "consignee", "importer_rfc",
    ],
    "packing_list": [
        "peso_bruto", "bultos", "consignee",
    ],
    "certificate_of_analysis": [
        "supplier_name",
    ],
    "cargo_insurance": [
        "valor_usd", "bl_numero", "bultos", "vessel",
    ],
    "delivery_order": [
        "bl_numero", "contenedor", "vessel", "peso_bruto", "bultos",
        "supplier_name", "consignee", "port_discharge",
    ],
    "aviso_automatico": [
        "importer_rfc", "valor_usd", "peso_bruto",
    ],
    "vucem_acuse": [
        "importer_rfc",
    ],
    "carta_encomienda": [
        "bl_numero", "importer_rfc",
    ],
    "equipment_interchange_receipt": [
        "contenedor",
    ],
    "factory_coa": [],
}


def normalize_for_comparison(value: Any) -> Any:
    """Normalize a value for comparison."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        cleaned = s.replace(",", "").replace("$", "").replace(" ", "")
        try:
            return float(cleaned)
        except ValueError:
            pass
        return s.lower()
    return value


def compare_values(pedimento_val: Any, source_val: Any) -> str:
    """Compare two values and return status."""
    pv = normalize_for_comparison(pedimento_val)
    sv = normalize_for_comparison(source_val)

    if pv is None:
        return "missing_in_pedimento"
    if sv is None:
        return "missing_in_source"

    # Numeric comparison with tolerance
    if isinstance(pv, float) and isinstance(sv, float):
        if pv == 0 and sv == 0:
            return "match"
        if pv == 0 or sv == 0:
            return "mismatch"
        relative_diff = abs(pv - sv) / max(abs(pv), abs(sv))
        if relative_diff <= NUMERIC_TOLERANCE:
            return "match"
        return "mismatch"

    # String comparison
    if isinstance(pv, str) and isinstance(sv, str):
        if pv == sv or pv in sv or sv in pv:
            return "match"
        return "mismatch"

    # Mixed types
    if str(pv) == str(sv):
        return "match"
    return "mismatch"


def cross_reference(pedimento_fields: Dict[str, Any], documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare fields across documents against pedimento. Returns comparison list."""
    comparisons: List[Dict[str, Any]] = []

    all_fields = set()
    for doc in documents:
        doc_type = doc.get("type", "")
        for field in CROSS_REF_FIELDS.get(doc_type, []):
            if field in doc.get("fields", {}):
                all_fields.add(field)

    for field_name in sorted(all_fields):
        ped_value = pedimento_fields.get(field_name)
        sources: Dict[str, Any] = {}

        for doc in documents:
            doc_fields = doc.get("fields", {})
            if field_name in doc_fields and doc_fields[field_name] is not None:
                source_val = doc_fields[field_name]
                status = compare_values(ped_value, source_val)
                sources[doc["file"]] = {
                    "value": source_val,
                    "status": status,
                }

        if sources:
            comparisons.append({
                "field": field_name,
                "pedimento_value": ped_value,
                "sources": sources,
            })

    return comparisons
