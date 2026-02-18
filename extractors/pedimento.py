"""Pedimento field extractor — wraps extract_pedimento.py for cross-referencing."""
import re
from pathlib import Path
from typing import Any, Dict, Optional

from extract_pedimento import collect_lines, extract_fields


def extract(pdf_path: Path) -> Dict[str, Any]:
    """Extract cross-ref fields from a secondary pedimento using existing extractor."""
    lines = collect_lines(pdf_path)
    data = extract_fields(lines)
    return pedimento_to_crossref(data)


def pedimento_to_crossref(data: Dict[str, Any]) -> Dict[str, Any]:
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
        "valor_usd": seguro.get("monto"),
    }


def _obs_contenedor(obs: Dict[str, Any]) -> Optional[str]:
    """Pull container from observaciones if present."""
    md = obs.get("mercancia_desconsolidada") or ""
    m = re.search(r"([A-Z]{4}\d{7})", md)
    return m.group(1) if m else None
