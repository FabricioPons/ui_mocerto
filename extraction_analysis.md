# Pedimento Extraction Script Analysis

## Summary
The script successfully extracts most fields from the pedimento PDF, but there are several issues that need to be fixed.

## Issues Found

### 1. **PRV Amount Incorrect** ❌
**Current behavior:** Extracts `46.0` as PRV
**Expected:** Should extract `290.0` as PRV and `46.0` as IVA_PRV (separate field)

**PDF shows:**
```
DTA     0    445
PRV     0    290
IVA     0  79146
IVA PRV 0     46
```

**Problem:** The regex pattern `r"\bPRV\s+\d+\s+([0-9.,]+)"` matches "IVA PRV" instead of just "PRV"

**Fix needed:** Use word boundary or more specific pattern like `r"\bPRV\s+0\s+([0-9.,]+)"` or `r"^PRV\s+\d+\s+([0-9.,]+)"` with multiline flag

### 2. **Missing IVA PRV field** ❌
**Current:** Not extracted
**Expected:** Should extract `46.0`

**Fix needed:** Add extraction for IVA PRV:
```python
out["liquidacion"]["iva_prv"] = normalize_amount(first_match(r"\bIVA PRV\s+\d+\s+([0-9.,]+)", text) or "")
```

### 3. **Contenedor pattern doesn't match** ❌
**Current pattern:** `r"CONTENEDOR:\s*([A-Z0-9]+)"`
**Actual text in PDF:** "MERCANCIA DESCONSOLIDADA DEL CONTENEDOR: GLDU3540997"

**Fix needed:** Update pattern to:
```python
out["transporte"]["contenedor"] = first_match(r"CONTENEDOR:\s*([A-Z0-9]+)", text)
```

### 4. **Missing fields** ⚠️
The following fields exist in the PDF but are not extracted:

- **Codigo de Aceptacion:** `5UMV4G14`
- **Numero de Exportador Autorizado:** `ESEAOR17000186`
- **Usuario:** `Laura Guadalupe` (RFC: `BMA991220B15`)
- **Tipo de cambio/Clave de Seccion Aduanera**

### 5. **Agente Aduanal nombre extraction** ⚠️
**Current extraction:** "GUILLERMO ORTEGA HURTADO DE MENDOZA OEHG580722HB7 DISPUESTO POR EL ARTICULO 81 DE LA LEY,"

**Issue:** The regex captures too much text including unrelated content

**Fix needed:** Make the pattern more specific to stop at RFC or end of line

## What Works Correctly ✅

1. **Pedimento number** - Correctly extracts "25 81 3645 5001495"
2. **Operacion** - "IMP" ✓
3. **Clave** - "A1" ✓
4. **Patente** - "3645" ✓
5. **Aduana** - "810" ✓
6. **Destino** - "9" ✓
7. **Peso bruto** - 25458.0 ✓
8. **RFC Importador** - "SES7402068M2" ✓
9. **CURP Importador** - null (correctly empty) ✓
10. **Fechas** - entrada and pago dates ✓
11. **DTA** - 445.0 ✓
12. **IVA** - 79146.0 ✓
13. **Total** - 79927.0 ✓
14. **Pago electronico** - All fields correct ✓
15. **Transporte identificacion** - "MSCEVERESTVIII" ✓
16. **Pais** - "LBR" ✓
17. **Guia/BL** - "MEDUE1503261" ✓
18. **Bultos** - 25 ✓
19. **Seguro** - 92.98 USD ✓
20. **E-documents** - All 14 documents extracted ✓
21. **COVE** - "COVE257QXUEB8" ✓
22. **Total partidas** - "1" ✓
23. **Clave prevalidador** - "010" ✓

## Recommendations

### High Priority
1. Fix PRV extraction pattern to avoid matching "IVA PRV"
2. Add IVA_PRV field extraction
3. Fix contenedor pattern to match actual text

### Medium Priority
4. Add codigo_aceptacion field
5. Add exportador_autorizado field
6. Improve agente_aduanal nombre extraction to avoid capturing extra text

### Low Priority
7. Add usuario field if needed for your use case
8. Consider adding validation to ensure all numeric fields are positive
