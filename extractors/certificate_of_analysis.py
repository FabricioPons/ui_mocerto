"""Certificate of Analysis field extractor."""
import re
from typing import Any, Dict

from extractors.common import first_match


def extract(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Supplier / shipper
    supplier = first_match(r"(?:FROM|SHIPPER|SELLER|MANUFACTURER)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    if not supplier:
        supplier = first_match(r"(?:COMPANY|PRODUCER)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["supplier_name"] = supplier.strip() if supplier else None

    return fields
