# Pedimento Extraction Script - Updated (v2)

## Summary
The script has been completely updated to extract all fields correctly from the pedimento PDF.

## What Was Fixed

### Critical Fixes
1. **PRV Amount** ✅
   - Was extracting: `46.0` (incorrect - was matching "IVA PRV")
   - Now extracts: `290.0` (correct)
   - Fixed by searching line-by-line for "PRV " at start of line

2. **IVA PRV Field** ✅
   - Was: Not extracted
   - Now: Correctly extracts `46.0` as separate field `liquidacion.iva_prv`

3. **Contenedor** ✅
   - Was: Not extracting (pattern mismatch)
   - Now: Correctly extracts `GLDU3540997`
   - Fixed pattern to match "DEL CONTENEDOR:"

4. **Codigo de Aceptacion** ✅
   - Was extracting: `"CODIGO"` (just the header word)
   - Now extracts: `"5UMV4G14"` (the actual code)
   - Fixed by searching lines after the header

5. **Usuario RFC** ✅
   - Was: `null`
   - Now: `"BMA991220B15"`
   - Fixed by extracting all "Clave en el RFC:" entries and filtering out importador/agente

### New Fields Added
- `pedimento.ref`: "AT2501392"
- `pedimento.codigo_aceptacion`: "5UMV4G14"
- `pedimento.marcas_numeros`: "S/M S/N"
- `liquidacion.iva_prv`: 46.0
- `liquidacion.efectivo`: 79927.0
- `liquidacion.otros`: 0.0
- `transporte.medio_presentacion`: "Otros Medios Electrónicos: (Pago Electrónico)"
- `transporte.medio_recepcion`: "Efectivo (cargo a cuenta)"
- `transporte.transportista_rfc`: null (not present in this PDF)
- `documentos.exportador_autorizado`: "ESEAOR17000186"
- `usuario.nombre`: "Laura Guadalupe"
- `usuario.rfc`: "BMA991220B15"

## Complete Extraction Results

```json
{
  "extraction_version": "v2",
  "pedimento": {
    "numero_raw": "25 81 3645 5001495",
    "operacion": "IMP",
    "clave": "A1",
    "patente": "3645",
    "aduana": "810",
    "destino": "9",
    "peso_bruto": 25458.0,
    "ref": "AT2501392",
    "codigo_aceptacion": "5UMV4G14",
    "marcas_numeros": "S/M S/N"
  },
  "importador": {
    "rfc": "SES7402068M2",
    "curp": null
  },
  "agente_aduanal": {
    "nombre": "GUILLERMO ORTEGA HURTADO DE MENDOZA",
    "rfc": "OEHG580722HB7",
    "curp": "OEHG580722HTSRRL06",
    "numero_certificado": "00001000000515525747",
    "efirma": "ssVAIj2XE8NDyZHu+34Xe9KgwUyoNzvhTIN935ze6Hbedvcf..."
  },
  "fechas": {
    "entrada": "2025-10-10",
    "pago": "2025-10-16"
  },
  "liquidacion": {
    "dta": 445.0,
    "prv": 290.0,
    "iva": 79146.0,
    "iva_prv": 46.0,
    "otros": 0.0,
    "efectivo": 79927.0,
    "total": 79927.0
  },
  "pago_electronico": {
    "banco": "BBVA BANCOMER",
    "linea_captura": "032504FHP6P147588221",
    "importe": 79927.0,
    "fecha": "2025-10-16",
    "operacion_bancaria": "01225289561121",
    "transaccion_sat": "40012161020251759141"
  },
  "transporte": {
    "identificacion": "MSCEVERESTVIII",
    "pais": "LBR",
    "guia_bl": "MEDUE1503261",
    "contenedor": "GLDU3540997",
    "transportista_rfc": null,
    "medio_presentacion": "Otros Medios Electrónicos: (Pago Electrónico)",
    "medio_recepcion": "Efectivo (cargo a cuenta)"
  },
  "bultos": {
    "total": 25
  },
  "seguro": {
    "monto": 92.98,
    "moneda": "USD"
  },
  "documentos": {
    "cove": "COVE257QXUEB8",
    "total_partidas": "1",
    "clave_prevalidador": "010",
    "exportador_autorizado": "ESEAOR17000186"
  },
  "usuario": {
    "nombre": "Laura Guadalupe",
    "rfc": "BMA991220B15"
  },
  "e_documents": [14 documents total]
}
```

## Key Improvements

1. **More robust pattern matching** - Uses line-by-line search instead of global regex where needed
2. **Better field disambiguation** - Properly distinguishes between similar fields (PRV vs IVA PRV)
3. **Comprehensive extraction** - Now extracts 70+ data points from the PDF
4. **Clean agente_aduanal nombre** - No longer captures extra text
5. **All amounts validated** - PRV, IVA, DTA, etc. all correct

## Usage

```bash
python extract_pedimento.py "PED. SIMPLIFICADO AT2501392.pdf"
```

Output is JSON with all extracted fields.
