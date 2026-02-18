"""GPT-based extraction for image PDFs using OpenAI vision API."""
import base64
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

GPT_FIELD_DEFS: Dict[str, List[Tuple[str, str]]] = {
    "bill_of_lading": [
        ("bl_numero", "Bill of lading number (e.g. ONEYDLCG00246800)"),
        ("peso_bruto", "Gross weight in KG, plain number"),
        ("contenedor", "Container number in ISO format XXXX1234567"),
        ("bultos", "Number of packages/bags/cases, integer"),
        ("supplier_name", "Shipper/seller company name"),
        ("consignee", "Consignee/buyer company name"),
        ("vessel", "Vessel/ship name"),
        ("port_discharge", "Port of discharge/destination"),
    ],
    "commercial_invoice": [
        ("invoice_number", "Invoice number"),
        ("valor_usd", "Total value in USD, plain number"),
        ("peso_bruto", "Gross weight in KG, plain number"),
        ("bultos", "Number of packages, integer"),
        ("supplier_name", "Seller/exporter company name"),
        ("consignee", "Buyer/importer company name"),
        ("importer_rfc", "Mexican RFC tax ID of importer"),
    ],
    "packing_list": [
        ("peso_bruto", "Total gross weight in KG, plain number"),
        ("bultos", "Total number of packages, integer"),
        ("consignee", "Consignee/buyer company name"),
    ],
    "cargo_insurance": [
        ("valor_usd", "Insured amount in USD, plain number"),
        ("bl_numero", "Bill of lading number"),
        ("bultos", "Number of packages, integer"),
        ("vessel", "Vessel/conveyance name"),
        ("policy_number", "Insurance policy number"),
        ("insured_name", "Name of insured party"),
    ],
    "certificate_of_analysis": [
        ("supplier_name", "Manufacturer/producer company name"),
        ("product_name", "Product description"),
        ("batch_number", "Batch or lot number"),
    ],
    "delivery_order": [
        ("bl_numero", "Bill of lading number"),
        ("contenedor", "Container number XXXX1234567"),
        ("vessel", "Vessel name"),
        ("peso_bruto", "Gross weight in KG, plain number"),
        ("bultos", "Number of packages, integer"),
        ("supplier_name", "Shipper company name"),
        ("consignee", "Consignee company name"),
        ("port_discharge", "Port of discharge"),
    ],
    "carta_encomienda": [
        ("bl_numero", "Bill of lading number"),
        ("importer_rfc", "RFC of importer"),
        ("importer_name", "Importer company name"),
        ("agente_aduanal", "Customs agent name"),
        ("patente", "Customs patent number"),
    ],
    "manifestacion_de_valor": [
        ("importer_rfc", "RFC of importer"),
        ("supplier_name", "Seller/exporter name"),
        ("valor_usd", "Declared value in USD, plain number"),
        ("invoice_number", "Invoice number referenced"),
    ],
    "certificado_produccion": [
        ("supplier_name", "Producer/manufacturer name"),
        ("product_name", "Product description"),
    ],
    "carta_3_1_8": [
        ("importer_rfc", "RFC of importer"),
        ("importer_name", "Importer company name"),
        ("supplier_name", "Supplier/exporter name"),
    ],
}


def build_gpt_prompt(doc_type: str, taxonomy: Dict[str, Any]) -> str:
    """Build a structured extraction prompt with hardcoded field definitions."""
    field_defs = GPT_FIELD_DEFS.get(doc_type, [])

    if field_defs:
        field_instructions = []
        for name, desc in field_defs:
            field_instructions.append(f'  "{name}": <{desc}, or null if not found>')
        fields_block = "\n".join(field_instructions)
    else:
        fields_block = (
            '  "peso_bruto": <gross weight in kg, number or null>\n'
            '  "valor_usd": <total value in USD, number or null>\n'
            '  "contenedor": <container number like XXXX1234567 or null>\n'
            '  "bl_numero": <bill of lading number or null>\n'
            '  "bultos": <number of packages, integer or null>\n'
            '  "supplier_name": <seller/shipper name or null>\n'
            '  "consignee": <buyer/consignee name or null>'
        )

    label = doc_type.replace("_", " ").title()

    return f"""Analyze this {label} document image.

Extract ONLY the following fields as JSON. Use null for fields not found.
For numeric fields, return plain numbers (no commas, no currency symbols).
For peso_bruto, return weight in KG.
For valor_usd, return value in USD.
For container numbers, use format XXXX1234567.

Return ONLY valid JSON, no markdown, no explanation:
{{
{fields_block}
}}"""


def extract_image_pdf(pdf_path: Path, doc_type: str, client, taxonomy: Dict[str, Any]) -> Dict[str, Any]:
    """Extract fields from an image PDF using OpenAI GPT-4.1-mini vision API."""
    prompt = build_gpt_prompt(doc_type, taxonomy)

    images = _pdf_to_base64_images(pdf_path)
    if not images:
        return {}

    content: List[Dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    for img_b64 in images[:4]:
        content.append({
            "type": "input_image",
            "image_url": f"data:image/png;base64,{img_b64}",
        })

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=[{"role": "user", "content": content}],
        )
        raw = response.output_text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"  GPT extraction error for {pdf_path.name}: {e}", file=sys.stderr)
        return {}


def _pdf_to_base64_images(pdf_path: Path) -> List[str]:
    """Convert PDF pages to base64-encoded PNG images."""
    images = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        for page_num in range(min(len(doc), 4)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            images.append(base64.b64encode(img_bytes).decode("utf-8"))
        doc.close()
    except ImportError:
        try:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            images.append(base64.b64encode(pdf_bytes).decode("utf-8"))
        except Exception:
            pass
    except Exception as e:
        print(f"  Image conversion error for {pdf_path.name}: {e}", file=sys.stderr)
    return images


def extract_image_pdf_file_upload(pdf_path: Path, doc_type: str, client, taxonomy: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback: upload PDF as file to OpenAI and extract with GPT."""
    prompt = build_gpt_prompt(doc_type, taxonomy)

    try:
        with open(pdf_path, "rb") as fh:
            uploaded = client.files.create(file=fh, purpose="assistants")

        response = client.responses.create(
            model="gpt-4.1-mini",
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_file", "file_id": uploaded.id},
                ],
            }],
        )
        raw = response.output_text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"  GPT file-upload extraction error for {pdf_path.name}: {e}", file=sys.stderr)
        return {}
