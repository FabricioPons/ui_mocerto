# Pedimento PDF Parser

Extracts data from Mexican customs declaration PDFs (Pedimento Simplificado).

## Usage

```bash
python extract_pedimento.py "your_pedimento.pdf"
```

Output is JSON with all extracted fields.

## Requirements

```bash
pip install pdfplumber
```

## What it extracts

- Pedimento header (numero, operacion, clave, patente, aduana, etc.)
- Importador (RFC, CURP)
- Agente aduanal (nombre, RFC, CURP, e.firma, certificado)
- Fechas (entrada, pago)
- Liquidacion (DTA, PRV, IVA, IVA PRV, total)
- Pago electronico (banco, linea captura, importe, fecha)
- Transporte (identificacion, pais, guia/BL, contenedor)
- Bultos, seguro, documentos
- Observaciones
- E-documents list

## Output

See `extracted_data.json` for example output.
