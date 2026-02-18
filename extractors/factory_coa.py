"""Factory Certificate of Analysis field extractor."""
from typing import Any, Dict

from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Product name
    product = first_match(r"[产產]品名称[：:]\s*(.+?)(?:\n|$)", text)
    if not product:
        product = first_match(r"(?:PRODUCT|品名)[：:\s]*(.+?)(?:\n|$)", text)
    fields["product_name"] = product.strip() if product else None

    # Batch number
    batch = first_match(r"[批].*[号號][：:]\s*(\d+)", text)
    if not batch:
        batch = first_match(r"(?:BATCH|LOT)\s*(?:NO\.?)?[\s.:]*([A-Z0-9]+)", upper)
    fields["batch_number"] = batch

    # Quantity
    qty = first_match(r"[批]\s*[量][：:]\s*([\d.]+)", text)
    if not qty:
        qty = first_match(r"(?:QUANTITY|QTY)[\s.:]*(\d[\d,.]*)", upper)
    fields["quantity"] = qty

    return fields
