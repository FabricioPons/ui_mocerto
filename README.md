# Pedimento PDF Parser

Extracts structured data from Mexican customs declaration PDFs (Pedimento Simplificado).

## Repo layout

```text
.
├── extract_pedimento.py
├── check.py
├── data/
│   ├── raw/         # input/source docs and downloaded batches
│   ├── output/      # extracted JSON samples/results
│   └── reference/   # taxonomy/reference files
└── README.md
```

## Requirements

```bash
pip install pdfplumber openai
```

## Extract fields from a PDF

```bash
python extract_pedimento.py "data/raw/PED. SIMPLIFICADO AT2501392.pdf" > data/output/extracted_data.json
```

## Test OpenAI file parsing

1. Create `.env`:
```bash
OPENAI_API_KEY=your_api_key_here
# optional:
# PDF_FILE=data/raw/drive-download-20260205T220732Z-1-001/26EZ705 COA-F.pdf
```
2. Run:
```bash
python check.py
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
