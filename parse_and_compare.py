#!/usr/bin/env python
"""
Document Extraction & Cross-Reference Pipeline.
Parses all import operation documents, extracts structured fields,
and cross-references them against pedimento data to find discrepancies.
"""
import base64
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

# Reuse existing pedimento extractor
from extract_pedimento import collect_lines, extract_fields, normalize_amount

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DRIVE_DIR = BASE_DIR / "data" / "raw" / "drive-download-20260205T220732Z-1-001"
PED_SIMPLIFICADO = BASE_DIR / "data" / "raw" / "PED. SIMPLIFICADO AT2501392.pdf"
TAXONOMY_PATH = DRIVE_DIR / "taxonomy_fields.json"
OUTPUT_PATH = BASE_DIR / "data" / "output" / "comparison_results.json"

# Numeric comparison tolerance (0.5%)
NUMERIC_TOLERANCE = 0.005

# ---------------------------------------------------------------------------
# .env loader (same pattern as check.py)
# ---------------------------------------------------------------------------
def load_dotenv(path: str = None):
    if path is None:
        path = str(BASE_DIR / ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


# ---------------------------------------------------------------------------
# Document Classification
# ---------------------------------------------------------------------------
# Patterns checked top-to-bottom; first match wins.
CLASSIFICATION_RULES: List[Tuple[str, str]] = [
    # Filename patterns
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


# ---------------------------------------------------------------------------
# PDF text check
# ---------------------------------------------------------------------------
def is_image_pdf(pdf_path: Path) -> bool:
    """Check if PDF needs OCR/GPT (extractable text < 100 chars)."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_text = ""
            for page in pdf.pages:
                total_text += page.extract_text() or ""
                if len(total_text) >= 100:
                    return False
        return len(total_text.strip()) < 100
    except Exception:
        return True


def get_pdf_text(pdf_path: Path) -> str:
    """Extract all text from a PDF using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
    except Exception:
        pass
    return text


# ---------------------------------------------------------------------------
# Cross-referenceable fields per document type
# ---------------------------------------------------------------------------
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
        "valor_usd",
    ],
    "delivery_order": [
        "bl_numero", "contenedor", "vessel",
    ],
}


# ---------------------------------------------------------------------------
# Text PDF extraction (pdfplumber + regex)
# ---------------------------------------------------------------------------
def extract_text_pdf(pdf_path: Path, doc_type: str) -> Dict[str, Any]:
    """Extract cross-referenceable fields from a text-based PDF using regex."""
    text = get_pdf_text(pdf_path)
    upper = text.upper()
    fields: Dict[str, Any] = {}

    if doc_type == "bill_of_lading":
        fields = _extract_bl(text, upper)
    elif doc_type == "commercial_invoice":
        fields = _extract_invoice(text, upper)
    elif doc_type == "packing_list":
        fields = _extract_packing_list(text, upper)
    elif doc_type == "cargo_insurance":
        fields = _extract_insurance(text, upper)
    elif doc_type == "certificate_of_analysis":
        fields = _extract_coa(text, upper)
    elif doc_type == "delivery_order":
        fields = _extract_delivery_order(text, upper)
    elif doc_type == "pedimento":
        fields = _extract_pedimento_fields(pdf_path)

    return fields


def _first(pattern: str, text: str, flags: int = 0) -> Optional[str]:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def _extract_bl(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # BL number — try specific "B/L NO.:" pattern first, then general
    bl = _first(r"B/L\s*NO\.?\s*:?\s*([A-Z0-9]+)", upper)
    if not bl:
        bl = _first(r"(?:BILL OF LADING|WAYBILL)\s*(?:NO|NUMBER|NUM|N[°ºo.]?)[\s.:]*([A-Z0-9]+)", upper)
    if not bl:
        bl = _first(r"(?:DOCUMENT|DOC)[\s.]?(?:NO|NUMBER)[\s.:]*([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    # Gross weight
    wt = _first(r"GROSS\s*WEIGHT[^0-9]*?([\d,]+\.?\d*)\s*(?:KGS?|KG)", upper)
    if not wt:
        wt = _first(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Container — must match standard ISO 6346 format (4 letters + 7 digits)
    # Exclude BL number substrings by checking context
    bl_value = (bl or "").upper()
    containers = re.findall(r"\b([A-Z]{4}\d{7})\b", text)
    cont = None
    for c in containers:
        # Skip if this is part of the BL number
        if bl_value and c in bl_value:
            continue
        cont = c
        break
    fields["contenedor"] = cont

    # Packages
    pkg = _first(r"(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BAGS?|BUNDLES?|PALLETS?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Vessel + voyage — try "VESSEL VOYAGE:" pattern (ONE format)
    vessel = _first(r"VESSEL\s*(?:VOYAGE)?[\s.:]*([A-Z][A-Z0-9\s\-]+?)\s+\d{3}[EW]", upper)
    if not vessel:
        vessel = _first(r"(?:VESSEL|OCEAN\s*VESSEL|BUQUE)[\s.:]*([A-Z0-9\s\-]+?)(?:\s+V\.?\s*\d|\n)", upper)
    if vessel:
        vessel = vessel.strip()
    fields["vessel"] = vessel

    # Split text into lines for line-by-line extraction
    text_lines = text.split("\n")

    # Port of discharge — look for the structured header (not boilerplate clause text)
    # Boilerplate says "Port of Discharge or Place of Delivery, as applicable..."
    # Structured header says "PORT OF DISCHARGE PLACE OF DELIVERY TYPE OF MOVEMENT..."
    pod = None
    for i, line in enumerate(text_lines):
        up_line = line.upper().strip()
        if not (up_line.startswith("PORT OF DISCHARGE") or up_line.startswith("PUERTO DE DESCARGA")):
            continue
        # Skip boilerplate lines that contain "or Place of Delivery" (clause text)
        if " OR PLACE OF DELIVERY" in up_line:
            continue
        # This is the structured header — value is on the next line
        if i + 1 < len(text_lines):
            next_line = text_lines[i + 1].strip()
            port_match = re.match(r"([A-Z][A-Za-z\s]+?)(?:\s*,|\s{2,})", next_line)
            if port_match:
                pod = port_match.group(1).strip().upper()
            elif next_line:
                pod = next_line.split(",")[0].strip().upper()
        break
    fields["port_discharge"] = pod

    # Shipper / supplier — find the company name after SHIPPER header
    # The layout varies: sometimes SHIPPER is followed by header columns on the same line,
    # with the actual company name on the next non-header line.
    shipper = None
    skip_words = {"BOOKING", "BILL OF LADING", "EXPORT", "FORWARDING", "FMC", "RECEIVED", "DOCUMENT"}
    for i, line in enumerate(text_lines):
        if re.search(r"SHIPPER", line, re.IGNORECASE):
            # Scan next lines for company name
            for j in range(i + 1, min(i + 5, len(text_lines))):
                candidate = text_lines[j].strip()
                if not candidate or len(candidate) < 4:
                    continue
                # Skip header/label lines
                if any(w in candidate.upper() for w in skip_words):
                    continue
                # Skip lines that are just alphanumeric codes or reference numbers
                if re.match(r"^[A-Z0-9]{5,20}$", candidate):
                    continue
                # Skip lines that look like pairs of reference numbers (e.g. "DLCG00246800 ONEYDLCG00246800")
                if re.match(r"^[A-Z0-9]+\s+[A-Z0-9]+$", candidate) and not re.search(r"[a-z]", candidate):
                    continue
                shipper = candidate
                break
            break
    fields["supplier_name"] = shipper

    # Consignee — find company name after CONSIGNEE header
    cons = None
    skip_cons = {"FORWARDING", "FMC", "RECEIVED", "NOTIFY", "BOOKING"}
    for i, line in enumerate(text_lines):
        if re.search(r"CONSIGNEE", line, re.IGNORECASE):
            for j in range(i + 1, min(i + 5, len(text_lines))):
                candidate = text_lines[j].strip()
                if not candidate or len(candidate) < 4:
                    continue
                if any(w in candidate.upper() for w in skip_cons):
                    continue
                if re.match(r"^[A-Z0-9]{5,20}$", candidate):
                    continue
                cons = candidate
                break
            break
    fields["consignee"] = cons

    return fields


def _extract_invoice(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Invoice number
    inv = _first(r"(?:INVOICE|FACTURA)\s*(?:NO|NUMBER|NUM|N[°ºo.]?)[\s.:]*([A-Z0-9/\-]+)", upper)
    if not inv:
        inv = _first(r"(?:N[°ºo.]\s*FACTURA|NUESTRA\s*REF)[\s.:]*([A-Z0-9/\-]+)", upper)
    fields["invoice_number"] = inv

    # Total USD — look for CIF total or total amount
    val = _first(r"(?:TOTAL|IMPORTE\s*TOTAL|AMOUNT|CIF)[^0-9]*([\d,]+\.?\d*)\s*(?:USD|U\.S\.D|DOLARES)?", upper)
    if not val:
        # Try a broader match for the last big USD number
        all_amounts = re.findall(r"([\d,]+\.\d{2})", text)
        if all_amounts:
            val = all_amounts[-1]
    fields["valor_usd"] = normalize_amount(val) if val else None

    # Gross weight
    wt = _first(r"(?:PESO\s*BRUTO|GROSS\s*WEIGHT|PESO\s*TOTAL)[^0-9]*([\d,]+\.?\d*)\s*(?:KGS?|KG)", upper)
    if not wt:
        wt = _first(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Packages
    pkg = _first(r"(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BULTOS?|BAGS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Supplier
    seller = _first(r"(?:SELLER|SHIPPER|EXPORTER|PROVEEDOR|VENDEDOR)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["supplier_name"] = seller.strip() if seller else None

    # Consignee / buyer
    buyer = _first(r"(?:BUYER|CONSIGNEE|COMPRADOR|IMPORTADOR|DESTINATARIO)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["consignee"] = buyer.strip() if buyer else None

    # Importer RFC
    rfc = _first(r"RFC[\s.:]*([A-Z]{3,4}\d{6}[A-Z0-9]{3})", upper)
    fields["importer_rfc"] = rfc

    return fields


def _extract_packing_list(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Gross weight
    wt = _first(r"(?:TOTAL\s*)?(?:GROSS\s*WEIGHT|PESO\s*BRUTO)[^0-9]*([\d,]+\.?\d*)\s*(?:KGS?|KG)?", upper)
    if not wt:
        wt = _first(r"([\d,]+\.?\d*)\s*KGS?\b", upper)
    fields["peso_bruto"] = normalize_amount(wt) if wt else None

    # Packages
    pkg = _first(r"(?:TOTAL\s*)?(\d+)\s*(?:CASES?|PACKAGES?|PKGS?|BAGS?|BULTOS?)", upper)
    fields["bultos"] = int(pkg) if pkg else None

    # Consignee
    cons = _first(r"CONSIGNEE[^:\n]*[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    if not cons:
        cons = _first(r"(?:TO|BUYER|DESTINATARIO)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["consignee"] = cons.strip() if cons else None

    return fields


def _extract_insurance(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Amount insured — look for "USD XX,XXX.XX" near AMOUNT INSURED
    # First try explicit USD amount after the goods description line
    val = _first(r"USD\s+([\d,]+\.\d{2})\b", upper)
    if not val:
        # Try AMOUNT INSURED with USD prefix
        val = _first(r"(?:AMOUNT\s*INSURED|SUMA\s*ASEGURADA)[^U]*USD\s*([\d,]+\.?\d*)", upper)
    if not val:
        val = _first(r"(?:TOTAL\s*AMOUNT\s*INSURED)[^U]*USD\s*([\d,]+\.?\d*)", upper)
    fields["valor_usd"] = normalize_amount(val) if val else None

    return fields


def _extract_coa(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    # Supplier / shipper
    supplier = _first(r"(?:FROM|SHIPPER|SELLER|MANUFACTURER)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    if not supplier:
        supplier = _first(r"(?:COMPANY|PRODUCER)[\s.:]*\n?\s*([^\n]+)", text, re.IGNORECASE)
    fields["supplier_name"] = supplier.strip() if supplier else None

    return fields


def _extract_delivery_order(text: str, upper: str) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}

    bl = _first(r"(?:B/L|BL|BILL\s*OF\s*LADING)\s*(?:NO|NUMBER|N[°ºo.]?)[\s.:]*([A-Z0-9]+)", upper)
    fields["bl_numero"] = bl

    cont = _first(r"([A-Z]{4}\d{7})", text)
    fields["contenedor"] = cont

    vessel = _first(r"(?:VESSEL|BUQUE)[\s.:]*([A-Z0-9\s\-]+?)(?:\n|$)", upper)
    if vessel:
        vessel = vessel.strip()
    fields["vessel"] = vessel

    return fields


def _extract_pedimento_fields(pdf_path: Path) -> Dict[str, Any]:
    """Extract cross-ref fields from a secondary pedimento using existing extractor."""
    lines = collect_lines(pdf_path)
    data = extract_fields(lines)
    return _pedimento_to_crossref(data)


def _pedimento_to_crossref(data: Dict[str, Any]) -> Dict[str, Any]:
    """Map extract_pedimento output to cross-ref field names."""
    ped = data.get("pedimento", {})
    transport = data.get("transporte", {})
    bultos = data.get("bultos", {})
    seguro = data.get("seguro", {})
    importador = data.get("importador", {})
    obs = data.get("observaciones", {})

    return {
        "pedimento_numero": ped.get("numero_raw"),
        "peso_bruto": ped.get("peso_bruto"),
        "contenedor": transport.get("contenedor") or _obs_contenedor(obs),
        "bl_numero": transport.get("guia_bl"),
        "bultos": bultos.get("total"),
        "importer_rfc": importador.get("rfc"),
        "vessel": transport.get("identificacion"),
        "port_discharge": ped.get("seccion_aduanera_nombre"),
        "valor_usd": seguro.get("monto"),  # seguro amount; full value comes from partidas
    }


def _obs_contenedor(obs: Dict[str, Any]) -> Optional[str]:
    """Pull container from observaciones if present."""
    md = obs.get("mercancia_desconsolidada") or ""
    m = re.search(r"([A-Z]{4}\d{7})", md)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# GPT-based extraction for image PDFs
# ---------------------------------------------------------------------------
def build_gpt_prompt(doc_type: str, taxonomy: Dict[str, Any]) -> str:
    """Build a structured extraction prompt from taxonomy field definitions."""
    # Map our internal doc_type to taxonomy key
    type_map = {
        "bill_of_lading": "bill_of_lading",
        "commercial_invoice": "commercial_invoice",
        "packing_list": "packing_list",
        "cargo_insurance": "cargo_insurance",
        "certificate_of_analysis": "certificate_of_analysis",
        "factory_coa": "factory_coa",
        "delivery_order": "delivery_order",
        "carta_encomienda": "carta_encomienda",
        "carta_3_1_8": "carta_3_1_8",
        "manifestacion_de_valor": "manifestacion_de_valor",
        "certificado_produccion": "certificado_produccion",
        "pedimento": "pedimento",
        "equipment_interchange_receipt": "equipment_interchange_receipt",
        "aviso_automatico": "aviso_automatico_importacion",
        "vucem_acuse": "vucem_acuse_digitalizacion",
    }

    cross_ref = CROSS_REF_FIELDS.get(doc_type, [])
    taxonomy_key = type_map.get(doc_type, doc_type)
    doc_def = taxonomy.get("document_types", {}).get(taxonomy_key, {})
    label = doc_def.get("label", doc_type)
    description = doc_def.get("description", "")

    # Build a list of fields to extract
    field_instructions = []
    for field_name in cross_ref:
        field_instructions.append(f'  "{field_name}": <extracted value or null>')

    if not field_instructions:
        # Fallback: ask for common fields
        field_instructions = [
            '  "peso_bruto": <gross weight in kg, number or null>',
            '  "valor_usd": <total value in USD, number or null>',
            '  "contenedor": <container number like XXXX1234567 or null>',
            '  "bl_numero": <bill of lading number or null>',
            '  "bultos": <number of packages, integer or null>',
            '  "supplier_name": <seller/shipper name or null>',
            '  "consignee": <buyer/consignee name or null>',
        ]

    fields_block = "\n".join(field_instructions)

    return f"""Analyze this {label} document image.
{description}

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

    # Convert PDF pages to images via base64
    images = _pdf_to_base64_images(pdf_path)
    if not images:
        return {}

    content: List[Dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    # Send up to 4 pages (to stay within token limits)
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
        # Clean markdown fences if present
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
        # Fallback: send PDF directly as file upload
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


# ---------------------------------------------------------------------------
# Operation grouping
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Cross-Reference Engine
# ---------------------------------------------------------------------------
def normalize_for_comparison(value: Any) -> Any:
    """Normalize a value for comparison."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        # Try to parse as number
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
        # Fuzzy: check if one contains the other
        if pv == sv or pv in sv or sv in pv:
            return "match"
        return "mismatch"

    # Mixed types — try string comparison
    if str(pv) == str(sv):
        return "match"
    return "mismatch"


def cross_reference(pedimento_fields: Dict[str, Any], documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare fields across documents against pedimento. Returns comparison list."""
    comparisons: List[Dict[str, Any]] = []

    # Collect all cross-ref field names from documents
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


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------
def main() -> int:
    load_dotenv()

    print("=" * 60)
    print("Document Extraction & Cross-Reference Pipeline")
    print("=" * 60)

    # Load taxonomy
    taxonomy: Dict[str, Any] = {}
    if TAXONOMY_PATH.exists():
        with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
            taxonomy = json.load(f)
        print(f"Loaded taxonomy: {taxonomy.get('metadata', {}).get('total_document_types', '?')} document types")

    # Step 1: Extract PED SIMPLIFICADO (main reference)
    print(f"\n--- Extracting PED SIMPLIFICADO ---")
    if not PED_SIMPLIFICADO.exists():
        print(f"ERROR: PED SIMPLIFICADO not found at {PED_SIMPLIFICADO}", file=sys.stderr)
        return 1

    ped_lines = collect_lines(PED_SIMPLIFICADO)
    ped_data = extract_fields(ped_lines)
    ped_data["source_pdf"] = str(PED_SIMPLIFICADO)
    ped_crossref = _pedimento_to_crossref(ped_data)
    print(f"  Pedimento: {ped_crossref.get('pedimento_numero')}")
    print(f"  BL: {ped_crossref.get('bl_numero')}, Container: {ped_crossref.get('contenedor')}")
    print(f"  Weight: {ped_crossref.get('peso_bruto')} kg")

    # Step 2: Discover and classify all PDFs
    print(f"\n--- Discovering documents in {DRIVE_DIR.name} ---")
    if not DRIVE_DIR.exists():
        print(f"ERROR: Drive directory not found at {DRIVE_DIR}", file=sys.stderr)
        return 1

    pdf_files = sorted(DRIVE_DIR.glob("*.pdf"))
    print(f"  Found {len(pdf_files)} PDF files")

    # Classify and extract
    documents: List[Dict[str, Any]] = []
    image_pdfs: List[Tuple[Path, str]] = []

    for pdf_path in pdf_files:
        filename = pdf_path.name

        # Skip non-crossreferenceable types early
        text_preview = get_pdf_text(pdf_path)[:500]
        doc_type = classify_document(filename, text_preview)

        is_img = is_image_pdf(pdf_path)
        method = "gpt-4.1-mini" if is_img else "pdfplumber"

        doc_entry = {
            "file": filename,
            "type": doc_type,
            "extraction_method": method,
            "fields": {},
        }

        print(f"  {filename}: type={doc_type}, method={method}")

        if not is_img:
            doc_entry["fields"] = extract_text_pdf(pdf_path, doc_type)
        else:
            image_pdfs.append((pdf_path, doc_type))

        documents.append(doc_entry)

    # Step 3: Process image PDFs with GPT (parallel)
    if image_pdfs:
        print(f"\n--- Extracting {len(image_pdfs)} image PDFs via GPT ---")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("WARNING: OPENAI_API_KEY not set. Skipping image PDF extraction.", file=sys.stderr)
        else:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            def process_image(args):
                pdf_path, doc_type = args
                return pdf_path.name, extract_image_pdf_file_upload(pdf_path, doc_type, client, taxonomy)

            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {executor.submit(process_image, item): item for item in image_pdfs}
                for future in as_completed(futures):
                    try:
                        fname, fields = future.result()
                        # Update the document entry
                        for doc in documents:
                            if doc["file"] == fname:
                                doc["fields"] = fields
                                break
                        print(f"  GPT extracted: {fname} -> {len(fields)} fields")
                    except Exception as e:
                        pdf_path, _ = futures[future]
                        print(f"  GPT error for {pdf_path.name}: {e}", file=sys.stderr)

    # Step 4: Group by operation
    print(f"\n--- Grouping documents by operation ---")
    operations: Dict[str, Dict[str, Any]] = {}

    for doc in documents:
        op_id = group_by_operation(doc)
        doc["operation"] = op_id

        if op_id not in operations:
            operations[op_id] = {
                "operation_id": op_id,
                "documents": [],
                "comparisons": [],
            }
        operations[op_id]["documents"].append(doc)

    for op_id, op in sorted(operations.items()):
        print(f"  Operation {op_id}: {len(op['documents'])} documents")

    # Step 5: Cross-reference against PED SIMPLIFICADO
    print(f"\n--- Cross-referencing against PED SIMPLIFICADO ---")

    ped_simplificado_entry = {
        "numero": ped_crossref.get("pedimento_numero"),
        "peso_bruto": ped_crossref.get("peso_bruto"),
        "bl_numero": ped_crossref.get("bl_numero"),
        "contenedor": ped_crossref.get("contenedor"),
        "bultos": ped_crossref.get("bultos"),
        "importer_rfc": ped_crossref.get("importer_rfc"),
        "vessel": ped_crossref.get("vessel"),
        "port_discharge": ped_crossref.get("port_discharge"),
        "valor_usd": ped_crossref.get("valor_usd"),
    }

    # Cross-reference each operation's docs against the best available pedimento.
    # PED SIMPLIFICADO is used as reference for all operations — this highlights
    # both real discrepancies and expected differences across operations.
    total_compared = 0
    total_matches = 0
    total_mismatches = 0
    total_missing = 0

    for op_id, op in operations.items():
        # Find pedimento fields for this operation
        op_pedimento = {}

        # Check if operation has its own pedimento document
        for doc in op["documents"]:
            if doc["type"] == "pedimento" and doc["fields"]:
                op_pedimento = doc["fields"]
                break

        # Always use PED SIMPLIFICADO as the reference (per plan requirement)
        # Operations with their own pedimento will use that instead
        if not op_pedimento:
            op_pedimento = ped_crossref

        op["pedimento"] = ped_simplificado_entry

        # Determine reference for cross-reference
        ref = op_pedimento if op_pedimento else ped_crossref
        comparisons = cross_reference(ref, op["documents"])
        op["comparisons"] = comparisons

        for comp in comparisons:
            for source_info in comp["sources"].values():
                total_compared += 1
                status = source_info["status"]
                if status == "match":
                    total_matches += 1
                elif status == "mismatch":
                    total_mismatches += 1
                else:
                    total_missing += 1

    # Step 6: Build output
    output = {
        "ped_simplificado": {
            "source_pdf": str(PED_SIMPLIFICADO.name),
            "fields": ped_simplificado_entry,
        },
        "operations": [op for _, op in sorted(operations.items())],
        "summary": {
            "total_documents": len(documents),
            "total_fields_compared": total_compared,
            "matches": total_matches,
            "mismatches": total_mismatches,
            "missing": total_missing,
        },
    }

    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n--- Results ---")
    print(f"  Output: {OUTPUT_PATH}")
    print(f"  Total documents: {len(documents)}")
    print(f"  Fields compared: {total_compared}")
    print(f"  Matches: {total_matches}")
    print(f"  Mismatches: {total_mismatches}")
    print(f"  Missing: {total_missing}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
