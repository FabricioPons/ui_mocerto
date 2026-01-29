#!/usr/bin/env python
"""
Comprehensive Pedimento Simplificado PDF extraction script.
Extracts ALL fields from Mexican customs declaration forms (except QR codes and barcodes).
"""
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber


def normalize_date(value: str) -> Optional[str]:
    """Convert DD/MM/YYYY to ISO format YYYY-MM-DD."""
    if not value:
        return None
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", value)
    if not m:
        return None
    d, mth, y = m.groups()
    return f"{y}-{int(mth):02d}-{int(d):02d}"


def normalize_amount(value: str) -> Optional[float]:
    """Parse amount string to float, handling commas and currency symbols."""
    if not value:
        return None
    value = value.replace(",", "").replace("$", "").strip()
    m = re.search(r"-?\d+(?:\.\d+)?", value)
    if not m:
        return None
    return float(m.group(0))


def first_match(pattern: str, text: str, flags: int = 0) -> Optional[str]:
    """Return first capture group from regex match."""
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def all_matches(pattern: str, text: str, flags: int = 0) -> List[str]:
    """Return all capture groups from regex matches."""
    return [m.group(1).strip() for m in re.finditer(pattern, text, flags)]


def collect_lines(pdf_path: Path) -> List[str]:
    """Extract and normalize text lines from all PDF pages."""
    lines: List[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = re.sub(r"\s+", " ", line).strip()
                if line:
                    lines.append(line)
    return lines


def find_line_containing(lines: List[str], anchor: str) -> Optional[str]:
    """Find first line containing anchor text."""
    for line in lines:
        if anchor in line:
            return line
    return None


def find_lines_between(lines: List[str], start_anchor: str, end_anchor: str) -> List[str]:
    """Find all lines between two anchors (exclusive)."""
    result = []
    capturing = False
    for line in lines:
        if end_anchor in line:
            capturing = False
        if capturing:
            result.append(line)
        if start_anchor in line:
            capturing = True
    return result


def find_line_after(lines: List[str], anchor: str, pattern: str, max_lookahead: int = 6) -> Optional[str]:
    """Find line matching pattern after anchor line."""
    for i, line in enumerate(lines):
        if anchor in line:
            for j in range(i + 1, min(i + 1 + max_lookahead, len(lines))):
                if re.search(pattern, lines[j]):
                    return lines[j]
            return None
    return None


def extract_observaciones(lines: List[str]) -> Dict[str, Any]:
    """Extract all observation text from the OBSERVACIONES section."""
    obs: Dict[str, Any] = {
        "textos": [],
        "subdivision_bl": None,
        "articulo_referencia": None,
        "acuse_valor": None,
        "mercancia_desconsolidada": None,
    }

    obs_idx = -1
    for i, line in enumerate(lines):
        if "OBSERVACIONES" in line and "NUMERO" not in line:
            obs_idx = i
            break

    if obs_idx < 0:
        return obs

    # End markers that definitively end the observaciones section
    end_markers = ["FIN DE PEDIMENTO", "AGENTE ADUANAL", "NOMBRE O RAZ. SOC"]

    # Lines to skip (these are separate fields, not observation text)
    skip_patterns = ["TOTAL DE BULTOS", "SEGURO:", "NUMERO DE EXPORTADOR AUTORIZADO"]

    for j in range(obs_idx + 1, len(lines)):
        line = lines[j]
        if any(marker in line for marker in end_markers):
            break

        # Skip certain lines that are separate fields
        if any(skip in line for skip in skip_patterns):
            continue

        # Skip empty or transport-related lines
        if not line or line.startswith("TRANSPORTE") or "CURP DOMICILIO" in line:
            continue

        # This is observation text
        obs["textos"].append(line)

        if "ACUSE DE VALOR" in line:
            obs["acuse_valor"] = line
        if "ARTICULO" in line and "REGLAMENTO" in line:
            obs["articulo_referencia"] = line
        if "MERCANCIA DESCONSOLIDADA" in line:
            obs["mercancia_desconsolidada"] = line
        if "SUBDIVIDE" in line or "SUBDIVISION" in line:
            bl_match = first_match(r"BL\s+([A-Z0-9]+)", line)
            kg_match = first_match(r"([\d,.]+)\s*KG", line, re.IGNORECASE)
            obs["subdivision_bl"] = {
                "bl_numero": bl_match,
                "peso_kg": normalize_amount(kg_match) if kg_match else None,
                "descripcion": line,
            }

    return obs


def extract_fields(lines: List[str]) -> Dict[str, Any]:
    """Extract all fields from pedimento PDF text."""
    text = "\n".join(lines)

    out: Dict[str, Any] = {
        "source_pdf": None,
        "extraction_version": "v3_full",
        "metadata": {},
        "pedimento": {},
        "importador": {},
        "agente_aduanal": {},
        "fechas": {},
        "liquidacion": {},
        "deposito_referenciado": {},
        "pago_electronico": {},
        "transporte": {},
        "transportista": {},
        "bultos": {},
        "seguro": {},
        "documentos": {},
        "usuario": {},
        "observaciones": {},
        "e_documents": [],
        "partidas": [],
        "raw_text": text,
    }

    # Metadata
    pagina_match = first_match(r"[Pp][aá]gina\s+(\d+\s*de\s*\d+)", text)
    out["metadata"]["paginas"] = pagina_match
    out["metadata"]["tiene_pago_electronico"] = "***PAGO ELECTRÓNICO***" in text or "PAGO ELECTRONICO" in text
    out["metadata"]["fin_pedimento"] = "FIN DE PEDIMENTO" in text
    out["metadata"]["destino_origen"] = first_match(r"DESTINO/ORIGEN[.\s]*([^\n]+)", text)
    out["metadata"]["forma"] = "SIMPLIFICADA" if "SIMPLIFICADA" in text or "SIMPLIFICADO" in text else "NORMAL"

    # Pedimento header
    header_line = find_line_containing(lines, "NUM. PEDIMENTO") or ""
    out["pedimento"]["numero_raw"] = first_match(r"NUM\.\s*PEDIMENTO:\s*([0-9 ]+)", header_line)
    out["pedimento"]["operacion"] = first_match(r"T\.?\s*OPER:?\s*([A-Z]+)", header_line) or first_match(r"TIPO\s*OPER:?\s*([A-Z]+)", text)
    out["pedimento"]["clave"] = first_match(r"CVE\.?\s*PEDIM(?:ENTO)?:?\s*([A-Z0-9]+)", header_line) or first_match(r"CVE\.?\s*PEDIM(?:ENTO)?:?\s*([A-Z0-9]+)", text)

    out["pedimento"]["patente"] = first_match(r"PATENTE:\s*(\d+)", text)
    # pedimento_numero appears in pago electronico section after PATENTE
    out["pedimento"]["pedimento_numero"] = first_match(r"PATENTE:\s*\d+\s+PEDIMENTO:\s*(\d+)", text)
    out["pedimento"]["aduana_codigo"] = first_match(r"ADUANA(?:\s*E/S)?:\s*(\d+)", text)
    out["pedimento"]["destino"] = first_match(r"DESTINO:\s*(\d+)", text)
    out["pedimento"]["peso_bruto"] = normalize_amount(first_match(r"PESO\s*BRUTO:\s*([0-9.,]+)", text) or "")
    out["pedimento"]["ref"] = first_match(r"REF:\s*([A-Z0-9]+)", text)

    # Seccion aduanera
    seccion_line = find_line_containing(lines, "CLAVE DE LA SECCION")
    if seccion_line:
        seccion_idx = lines.index(seccion_line)
        if seccion_idx > 0:
            prev_line = lines[seccion_idx - 1]
            aduana_nombre = first_match(r"\d+\s+([A-Z]+)", prev_line)
            out["pedimento"]["seccion_aduanera_codigo"] = first_match(r"(\d+)", prev_line)
            out["pedimento"]["seccion_aduanera_nombre"] = aduana_nombre

    # Codigo de aceptacion
    codigo_idx = next((i for i, l in enumerate(lines) if "CODIGO DE ACEPTACION" in l or "CODIGO DE ACEPTACIÓN" in l), -1)
    if codigo_idx >= 0 and codigo_idx + 5 < len(lines):
        for j in range(codigo_idx + 1, min(codigo_idx + 6, len(lines))):
            match = first_match(r"^([A-Z0-9]{6,10})\b", lines[j])
            if match and match not in ["CODIGO", "BARRAS", "ALTAMIRA", "CLAVE", "SECCION", "ADUANERA", "DESPACHO"]:
                out["pedimento"]["codigo_aceptacion"] = match
                break

    # Marcas, numeros y total de bultos
    marcas_line = find_line_containing(lines, "MARCAS,NUMEROS Y TOTAL DE BULTOS")
    if marcas_line:
        # Extract the marks/numbers part (before the count number at the end)
        marcas_match = first_match(r"MARCAS,?\s*NUMEROS\s+Y\s+TOTAL\s+DE\s+BULTOS:\s*(.+?)\s+\d+$", marcas_line)
        out["pedimento"]["marcas_numeros"] = marcas_match.strip() if marcas_match else None
    else:
        out["pedimento"]["marcas_numeros"] = None

    # Importador/Exportador
    importer_section_idx = next((i for i, l in enumerate(lines) if "DATOS DEL IMPORTADOR" in l), -1)
    out["importador"]["rfc"] = None
    out["importador"]["curp"] = None
    if importer_section_idx >= 0:
        for j in range(importer_section_idx, min(importer_section_idx + 5, len(lines))):
            line = lines[j]
            # Only extract from lines that are clearly in importador section (not agente section)
            if "AGENTE ADUANAL" in line or "NOMBRE O RAZ" in line:
                break
            rfc = first_match(r"Clave en el RFC:\s*([A-Z0-9]{12,13})", line)
            # CURP for importador appears on the same line after RFC, empty means no CURP
            # Format: "Clave en el RFC: XXX CURP:" means CURP is empty
            if rfc:
                out["importador"]["rfc"] = rfc
                # Check if CURP is on same line and has value
                curp_match = re.search(r"CURP:\s*([A-Z0-9]{18})?", line)
                if curp_match and curp_match.group(1):
                    out["importador"]["curp"] = curp_match.group(1)
                else:
                    out["importador"]["curp"] = None

    # Agente aduanal
    nombre_match = first_match(r"NOMBRE\s+O\s+RAZ\.\s*SOC\.:\s*([A-Z\s]+?)(?:\s+[A-Z]{4}\d{6}[A-Z0-9]{3})", text)
    out["agente_aduanal"]["nombre"] = nombre_match.strip() if nombre_match else None
    out["agente_aduanal"]["rfc"] = first_match(r"NOMBRE\s+O\s+RAZ\.\s*SOC\.:[^A-Z]*[A-Z\s]+\s+([A-Z]{4}\d{6}[A-Z0-9]{3})", text)

    # Find CURP for agente (appears after their RFC line)
    agente_curp_match = first_match(r"Clave en el RFC:\s*[A-Z0-9]{12,13}\s+CURP:\s*([A-Z0-9]{18})", text)
    out["agente_aduanal"]["curp"] = agente_curp_match

    out["agente_aduanal"]["patente_autorizacion"] = first_match(r"PATENTE\s+O\s+AUTORIZACION:\s*(\d+)", text)
    if not out["agente_aduanal"]["patente_autorizacion"]:
        # The value often appears on its own line after the label
        pat_idx = next((i for i, l in enumerate(lines) if "PATENTE O AUTORIZACION" in l), -1)
        if pat_idx >= 0:
            # Search next few lines for a 4-digit number
            for k in range(pat_idx + 1, min(pat_idx + 4, len(lines))):
                pat_val = first_match(r"^(\d{4})$", lines[k])
                if pat_val:
                    out["agente_aduanal"]["patente_autorizacion"] = pat_val
                    break

    out["agente_aduanal"]["numero_certificado"] = first_match(r"NUMERO\s+DE\s+SERIE\s+DEL\s+CERTIFICADO:\s*(\d+)", text)

    # e.firma - get the main signature
    efirma_match = first_match(r"e\.firma:\s*([A-Za-z0-9+/=]+)", text)
    out["agente_aduanal"]["efirma"] = efirma_match

    # Additional signature block (the base64-like block before e.firma)
    firma_adicional = None
    for i, line in enumerate(lines):
        # Look for base64-like strings that are not the e.firma line
        if re.match(r"^[A-Za-z0-9+/]{40,}[A-Za-z0-9+/=]*$", line):
            if "e.firma" not in line and "LINEA DE CAPTURA" not in line:
                # Check previous line doesn't contain e.firma
                if i == 0 or "e.firma" not in lines[i-1]:
                    firma_adicional = line
                    break
    out["agente_aduanal"]["firma_adicional"] = firma_adicional

    # Fechas
    out["fechas"]["entrada"] = normalize_date(first_match(r"ENTRADA\s+(\d{1,2}/\d{1,2}/\d{4})", text) or "")
    out["fechas"]["pago"] = normalize_date(first_match(r"PAGO\s+(\d{1,2}/\d{1,2}/\d{4})", text) or "")

    # Liquidacion - line by line search for accuracy
    dta_line = find_line_containing(lines, "DTA ") or ""
    prv_line = next((l for l in lines if l.startswith("PRV ") or " PRV " in l and "IVA PRV" not in l), "")
    iva_line = next((l for l in lines if (l.startswith("IVA ") or " IVA " in l) and "IVA PRV" not in l), "")
    iva_prv_line = find_line_containing(lines, "IVA PRV") or ""

    out["liquidacion"]["dta"] = normalize_amount(first_match(r"DTA\s+\d+\s+([0-9.,]+)", dta_line) or "")
    out["liquidacion"]["prv"] = normalize_amount(first_match(r"PRV\s+\d+\s+([0-9.,]+)", prv_line) or "")
    out["liquidacion"]["iva"] = normalize_amount(first_match(r"IVA\s+\d+\s+([0-9.,]+)", iva_line) or "")
    out["liquidacion"]["iva_prv"] = normalize_amount(first_match(r"IVA\s+PRV\s+\d+\s+([0-9.,]+)", iva_prv_line) or "")
    out["liquidacion"]["otros"] = normalize_amount(first_match(r"OTROS\s+(\d+)", text) or "0")
    out["liquidacion"]["efectivo"] = normalize_amount(first_match(r"EFECTIVO\s+([0-9.,]+)", text) or "")
    out["liquidacion"]["total"] = normalize_amount(first_match(r"TOTAL\s+([0-9.,]+)", text) or "")

    # Cuadro de liquidacion - get all concepts with F.P and amounts
    cuadro_line = find_line_containing(lines, "CUADRO DE LIQUIDACION")
    if cuadro_line:
        out["liquidacion"]["tiene_cuadro"] = True

    # Deposito referenciado
    deposito_line = find_line_containing(lines, "DEPOSITO REFERENCIADO")
    if deposito_line:
        deposito_idx = lines.index(deposito_line)
        if deposito_idx + 1 < len(lines):
            next_line = lines[deposito_idx + 1]
            linea_captura = first_match(r"([A-Z0-9]{15,})", next_line)
            importe = first_match(r"([0-9.,]+)$", next_line)
            out["deposito_referenciado"]["linea_captura"] = linea_captura
            out["deposito_referenciado"]["importe"] = normalize_amount(importe or "")

    # Pago electronico
    out["pago_electronico"]["banco"] = first_match(r"NOMBRE\s+DE\s+LA\s+INSTITUCION\s+BANCARIA:\s*(.+?)(?:\n|$)", text)
    out["pago_electronico"]["linea_captura"] = first_match(r"LINEA\s+DE\s+CAPTURA:\s*([A-Z0-9]+)", text)
    out["pago_electronico"]["importe"] = normalize_amount(first_match(r"IMPORTE\s+PAGADO:\s*\$?\s*([0-9.,]+)", text) or "")
    out["pago_electronico"]["fecha"] = normalize_date(first_match(r"FECHA\s+DE\s+PAGO:\s*(\d{1,2}/\d{1,2}/\d{4})", text) or "")
    out["pago_electronico"]["operacion_bancaria"] = first_match(r"NUMERO\s+DE\s+OPERACION\s+BANCARIA:\s*(\d+)", text)
    out["pago_electronico"]["transaccion_sat"] = first_match(r"NUMERO\s+DE\s+TRANSACCI[OÓ]N\s+SAT:\s*(\d+)", text)

    # Transporte
    out["transporte"]["identificacion"] = first_match(r"(?:TRANSPORTE\s+)?IDENTIFICACION:\s*([A-Z0-9]+)", text)
    out["transporte"]["pais"] = first_match(r"PAIS:\s*([A-Z]{2,3})", text)

    guia_line = find_line_containing(lines, "NUMERO(GUIA/ORDEN EMBARQUE)") or find_line_containing(lines, "GUIA/ORDEN")
    if guia_line:
        out["transporte"]["guia_bl"] = first_match(r"(?:NUMERO\(GUIA/ORDEN EMBARQUE\)/ID:|ID:)\s*([A-Z0-9]+)", guia_line)
        out["transporte"]["guia_bl_tipo"] = first_match(r"[A-Z0-9]+\s+([A-Z])$", guia_line)

    out["transporte"]["contenedor"] = first_match(r"(?:DEL\s+)?CONTENEDOR:\s*([A-Z0-9]+)", text)
    out["transporte"]["medio_presentacion"] = first_match(r"MEDIO\s+DE\s+PRESENTACI[OÓ]N:\s*([^\n]+)", text, re.IGNORECASE)
    out["transporte"]["medio_recepcion"] = first_match(r"MEDIO\s+DE\s+RECEPCI[OÓ]N/?\s*COBRO:\s*([^\n]+)", text, re.IGNORECASE)

    # Transportista
    transportista_rfc = first_match(r"TRANSPORTISTA\s+Clave\s+en\s+el\s+RFC:\s*([A-Z0-9]{12,13})", text)
    out["transportista"]["rfc"] = transportista_rfc

    # Find transportista CURP and domicilio
    transportista_idx = next((i for i, l in enumerate(lines) if "TRANSPORTISTA" in l and "Clave en el RFC" in l), -1)
    if transportista_idx >= 0:
        for j in range(transportista_idx, min(transportista_idx + 3, len(lines))):
            curp = first_match(r"CURP\s+([A-Z0-9]{18})", lines[j])
            if curp:
                out["transportista"]["curp"] = curp
            domicilio = first_match(r"DOMICILIO/CIUDAD/ESTADO\s*(.+)", lines[j])
            if domicilio:
                out["transportista"]["domicilio"] = domicilio

    # Bultos
    bultos = first_match(r"TOTAL\s+DE\s+BULTOS:\s*(\d+)", text)
    out["bultos"]["total"] = int(bultos) if bultos else None
    bultos_tipo = first_match(r"TOTAL\s+DE\s+BULTOS:\s*\d+\s+([A-Z]+)", text)
    out["bultos"]["tipo"] = bultos_tipo

    # Seguro
    seguro_monto = first_match(r"SEGURO:\s*\$?\s*([0-9.,]+)", text)
    seguro_moneda = first_match(r"SEGURO:\s*\$?\s*[0-9.,]+\s*([A-Z]{3})", text)
    out["seguro"]["monto"] = normalize_amount(seguro_monto or "")
    out["seguro"]["moneda"] = seguro_moneda

    # Documentos
    out["documentos"]["cove"] = first_match(r"NUMERO\s+DE\s+ACUSE\s+DE\s+VALOR:\s*([A-Z0-9]+)", text)
    out["documentos"]["total_partidas"] = first_match(r"NUM\.\s*TOTAL\s+DE\s+PARTIDAS:\s*(\d+)", text)
    out["documentos"]["clave_prevalidador"] = first_match(r"NUM\.\s*CLAVE\s+PREVALIDADOR:\s*(\d+)", text)
    out["documentos"]["exportador_autorizado"] = first_match(r"NUMERO\s+DE\s+EXPORTADOR\s+AUTORIZADO:\s*([A-Z0-9]+)", text)

    # Usuario
    usuario_line = find_line_containing(lines, "Usuario:")
    if usuario_line:
        out["usuario"]["nombre"] = first_match(r"Usuario:\s*([A-Za-zÀ-ÿ\s]+)", usuario_line)

    # Find usuario RFC - the one that's not importador or agente
    all_rfcs = all_matches(r"Clave en el RFC:\s*([A-Z0-9]{12,13})", text)
    known_rfcs = [out["importador"].get("rfc"), out["agente_aduanal"].get("rfc")]
    usuario_rfcs = [r for r in all_rfcs if r and r not in known_rfcs]
    out["usuario"]["rfc"] = usuario_rfcs[0] if usuario_rfcs else None

    # Observaciones
    out["observaciones"] = extract_observaciones(lines)

    # E-documents
    for line in lines:
        if "NUMERO DE E-DOCUMENT" in line:
            tail = line.split(":", 1)[-1].strip()
            tokens = [t for t in tail.split() if t and re.match(r"^[A-Z0-9]+$", t)]
            out["e_documents"].extend(tokens)

    # Certificaciones
    cert_line = find_line_containing(lines, "CERTIFICACIONES")
    out["documentos"]["tiene_certificaciones"] = cert_line is not None

    # Declaracion legal - search for key phrase (may be split across lines)
    text_normalized = text.replace("\n", " ")
    tiene_declaracion = "DECLARO BAJO PROTESTA DE DECIR VERDAD" in text_normalized
    out["agente_aduanal"]["tiene_declaracion"] = tiene_declaracion
    out["agente_aduanal"]["articulo_ley"] = first_match(r"ARTICULO\s+(\d+)\s+DE\s+LA\s+LEY", text)

    return out


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: extract_pedimento_full.py <pdf_path>")
        return 2

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return 2

    lines = collect_lines(pdf_path)
    data = extract_fields(lines)
    data["source_pdf"] = str(pdf_path)

    print(json.dumps(data, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
