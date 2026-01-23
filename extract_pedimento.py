#!/usr/bin/env python
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

import pdfplumber


def normalize_date(value: str) -> Optional[str]:
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", value)
    if not m:
        return None
    d, mth, y = m.groups()
    return f"{y}-{int(mth):02d}-{int(d):02d}"


def normalize_amount(value: str) -> Optional[float]:
    value = value.replace(",", "").replace("$", "").strip()
    m = re.search(r"\d+(?:\.\d+)?", value)
    if not m:
        return None
    return float(m.group(0))


def first_match(pattern: str, text: str, flags=0) -> Optional[str]:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def collect_lines(pdf_path: Path) -> List[str]:
    lines: List[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = re.sub(r"\s+", " ", line).strip()
                if line:
                    lines.append(line)
    return lines


def find_line_after(lines: List[str], anchor: str, pattern: str, max_lookahead: int = 6) -> Optional[str]:
    for i, line in enumerate(lines):
        if anchor in line:
            for j in range(i + 1, min(i + 1 + max_lookahead, len(lines))):
                if re.search(pattern, lines[j]):
                    return lines[j]
            return None
    return None


def extract_fields(lines: List[str]) -> Dict:
    text = "\n".join(lines)

    out: Dict = {
        "source_pdf": None,
        "extraction_version": "v2",
        "pedimento": {},
        "importador": {},
        "agente_aduanal": {},
        "fechas": {},
        "liquidacion": {},
        "pago_electronico": {},
        "transporte": {},
        "bultos": {},
        "seguro": {},
        "documentos": {},
        "usuario": {},
        "observaciones": None,
        "e_documents": [],
        "raw_text": text,
    }

    # Header line with multiple fields
    header_line = next((l for l in lines if "NUM. PEDIMENTO" in l), "")
    out["pedimento"]["numero_raw"] = first_match(r"NUM\. PEDIMENTO:\s*([0-9 ]+)", header_line)
    out["pedimento"]["operacion"] = first_match(r"T\.OPER:\s*([A-Z]+)", header_line)
    out["pedimento"]["clave"] = first_match(r"CVE\.PEDIMENTO:\s*([A-Z0-9]+)", header_line)
    out["pedimento"]["patente"] = first_match(r"PATENTE:\s*(\d+)", text)
    out["pedimento"]["aduana"] = first_match(r"ADUANA E/S:\s*(\d+)", text) or first_match(r"ADUANA:\s*(\d+)", text)
    out["pedimento"]["destino"] = first_match(r"DESTINO:\s*(\d+)", text)
    out["pedimento"]["peso_bruto"] = normalize_amount(first_match(r"PESO BRUTO:\s*([0-9.]+)", text) or "")
    out["pedimento"]["ref"] = first_match(r"REF:\s*([A-Z0-9]+)", text)
    # Find codigo de aceptacion - it appears a few lines after the header
    codigo_idx = next((i for i, l in enumerate(lines) if "CODIGO DE ACEPTACION" in l or "CODIGO DE ACEPTACIÓN" in l), -1)
    if codigo_idx >= 0 and codigo_idx + 5 < len(lines):
        # Look for the code in the next few lines
        for j in range(codigo_idx + 1, min(codigo_idx + 6, len(lines))):
            match = first_match(r"^([A-Z0-9]{6,})\b", lines[j])
            if match and match not in ["CODIGO", "BARRAS", "ALTAMIRA", "CLAVE", "SECCION", "ADUANERA", "DESPACHO"]:
                out["pedimento"]["codigo_aceptacion"] = match
                break
    else:
        out["pedimento"]["codigo_aceptacion"] = None
    out["pedimento"]["marcas_numeros"] = first_match(r"MARCAS,NUMEROS Y TOTAL DE BULTOS:\s*([^\d]+)", text)

    importer_line = find_line_after(lines, "DATOS DEL IMPORTADOR", r"Clave en el RFC")
    out["importador"]["rfc"] = first_match(r"Clave en el RFC:\s*([A-Z0-9]{12,13})", importer_line or "") or first_match(r"Clave en el RFC:\s*([A-Z0-9]{12,13})", text)
    out["importador"]["curp"] = first_match(r"CURP:\s*([A-Z0-9]{18})", importer_line or "")

    # Agente aduanal block
    nombre_match = first_match(r"NOMBRE O RAZ\. SOC\.\s*:\s*([A-Z\s]+?)(?:\s+[A-Z0-9]{12,13}|$)", text)
    out["agente_aduanal"]["nombre"] = nombre_match.strip() if nombre_match else None
    out["agente_aduanal"]["rfc"] = first_match(r"NOMBRE O RAZ\. SOC\.:.*?\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b", text)
    out["agente_aduanal"]["curp"] = first_match(r"Clave en el RFC:\s*[A-Z0-9]{12,13}\s+CURP:\s*([A-Z0-9]{18})", text)
    out["agente_aduanal"]["numero_certificado"] = first_match(r"NUMERO DE SERIE DEL CERTIFICADO:\s*([0-9]+)", text)
    out["agente_aduanal"]["efirma"] = first_match(r"e\.firma:\s*([A-Za-z0-9+/=]+)", text)

    # Fechas
    entrada_line = next((l for l in lines if "ENTRADA" in l), "")
    pago_line = next((l for l in lines if re.search(r"\bPAGO\b", l)), "")
    out["fechas"]["entrada"] = normalize_date(entrada_line)
    out["fechas"]["pago"] = normalize_date(pago_line)

    # Liquidacion - search line by line to avoid confusion between similar patterns
    dta_line = next((l for l in lines if l.startswith("DTA ")), "")
    prv_line = next((l for l in lines if l.startswith("PRV ")), "")
    iva_line = next((l for l in lines if l.startswith("IVA ") and not l.startswith("IVA PRV")), "")

    out["liquidacion"]["dta"] = normalize_amount(first_match(r"DTA\s+\d+\s+([0-9.,]+)", dta_line) or "")
    out["liquidacion"]["prv"] = normalize_amount(first_match(r"PRV\s+\d+\s+([0-9.,]+)", prv_line) or "")
    out["liquidacion"]["iva"] = normalize_amount(first_match(r"IVA\s+\d+\s+([0-9.,]+)", iva_line) or "")
    out["liquidacion"]["iva_prv"] = normalize_amount(first_match(r"IVA PRV\s+\d+\s+([0-9.,]+)", text) or "")
    out["liquidacion"]["otros"] = normalize_amount(first_match(r"OTROS\s+(\d+)", text) or "0") if "OTROS" in text else 0.0
    out["liquidacion"]["efectivo"] = normalize_amount(first_match(r"EFECTIVO\s+([0-9.,]+)", text) or "")
    out["liquidacion"]["total"] = normalize_amount(first_match(r"TOTAL\s+([0-9.,]+)", text) or "")

    # Pago electronico
    out["pago_electronico"]["banco"] = first_match(r"NOMBRE DE LA INSTITUCION BANCARIA:\s*(.+)", text)
    out["pago_electronico"]["linea_captura"] = first_match(r"LINEA DE CAPTURA:\s*([A-Z0-9]+)", text)
    out["pago_electronico"]["importe"] = normalize_amount(first_match(r"IMPORTE PAGADO:\s*\$?\s*([0-9.,]+)", text) or "")
    out["pago_electronico"]["fecha"] = normalize_date(first_match(r"FECHA DE PAGO:\s*([0-9/]+)", text) or "")
    out["pago_electronico"]["operacion_bancaria"] = first_match(r"NUMERO DE OPERACION BANCARIA:\s*([0-9]+)", text)
    out["pago_electronico"]["transaccion_sat"] = first_match(r"NUMERO DE TRANSACCIÓN SAT:\s*([0-9]+)", text)

    # Transporte / Anexo
    out["transporte"]["identificacion"] = first_match(r"TRANSPORTE IDENTIFICACION:\s*([A-Z0-9]+)", text) or first_match(r"IDENTIFICACION:\s*([A-Z0-9]+)", text)
    out["transporte"]["pais"] = first_match(r"PAIS:\s*([A-Z]{3})", text)
    out["transporte"]["guia_bl"] = first_match(r"NUMERO\(GUIA/ORDEN EMBARQUE\)/ID:\s*([A-Z0-9]+)", text)
    out["transporte"]["contenedor"] = first_match(r"(?:DEL )?CONTENEDOR:\s*([A-Z0-9]+)", text)
    out["transporte"]["transportista_rfc"] = first_match(r"TRANSPORTISTA\s+Clave en el RFC:\s*([A-Z0-9]{12,13})", text)
    out["transporte"]["medio_presentacion"] = first_match(r"MEDIO DE PRESENTACI[OÓ]N:\s*([^\n]+)", text, re.IGNORECASE)
    out["transporte"]["medio_recepcion"] = first_match(r"MEDIO DE RECEPCI[OÓ]N/ COBRO:\s*([^\n]+)", text, re.IGNORECASE)

    bultos = first_match(r"TOTAL DE BULTOS:\s*(\d+)", text)
    if not bultos:
        bultos = first_match(r"TOTAL DE BULTOS:.*?(\d+)", text)
    out["bultos"]["total"] = int(bultos) if bultos else None

    seguro = first_match(r"SEGURO:\s*\$?\s*([0-9.,]+)\s*([A-Z]{3})", text)
    if seguro:
        amount = first_match(r"SEGURO:\s*\$?\s*([0-9.,]+)", text)
        currency = first_match(r"SEGURO:\s*\$?\s*[0-9.,]+\s*([A-Z]{3})", text)
        out["seguro"]["monto"] = normalize_amount(amount or "")
        out["seguro"]["moneda"] = currency

    # Documento / prevalidacion / partidas
    out["documentos"]["cove"] = first_match(r"NUMERO DE ACUSE DE VALOR:\s*([A-Z0-9]+)", text)
    out["documentos"]["total_partidas"] = first_match(r"NUM\. TOTAL DE PARTIDAS:\s*(\d+)", text)
    out["documentos"]["clave_prevalidador"] = first_match(r"NUM\. CLAVE PREVALIDADOR:\s*(\d+)", text)
    out["documentos"]["exportador_autorizado"] = first_match(r"NUMERO DE EXPORTADOR AUTORIZADO:\s*([A-Z0-9]+)", text)

    # Usuario - look for lines containing "Usuario:"
    usuario_idx = next((i for i, l in enumerate(lines) if "Usuario:" in l), -1)
    if usuario_idx >= 0:
        usuario_line = lines[usuario_idx]
        out["usuario"]["nombre"] = first_match(r"Usuario:\s*([A-Za-z\s]+)", usuario_line)
    else:
        out["usuario"]["nombre"] = None

    # Usuario RFC - extract from "Clave en el RFC: XXX" that's not the importador or agente
    # Find all RFCs mentioned with "Clave en el RFC:" pattern
    all_rfc_matches = []
    for line in lines:
        rfc = first_match(r"Clave en el RFC:\s*([A-Z]{3,4}\d{6}[A-Z0-9]{2,3})", line)
        if rfc:
            all_rfc_matches.append(rfc)
    # Filter out the importador and agente aduanal RFCs
    usuario_rfc_candidates = [r for r in all_rfc_matches if r not in [
        out["importador"]["rfc"],
        out["agente_aduanal"]["rfc"]
    ]]
    out["usuario"]["rfc"] = usuario_rfc_candidates[0] if usuario_rfc_candidates else None

    # Observaciones block
    obs_line = find_line_after(lines, "OBSERVACIONES", r".+")
    if obs_line and "TOTAL DE BULTOS" not in obs_line:
        out["observaciones"] = obs_line

    # E-docs
    for line in lines:
        if "NUMERO DE E-DOCUMENT" in line:
            tail = line.split(":", 1)[-1].strip()
            tokens = [t for t in tail.split() if t]
            out["e_documents"].extend(tokens)

    return out


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: extract_pedimento.py <pdf_path>")
        return 2
    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return 2

    lines = collect_lines(pdf_path)
    data = extract_fields(lines)
    data["source_pdf"] = str(pdf_path)

    print(json.dumps(data, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
