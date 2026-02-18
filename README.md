# Mocerto App MVP — Document Extraction & Cross-Reference Pipeline

Parses PDF documents from Mexican customs import operations, extracts structured fields, and cross-references them against the main pedimento (customs declaration) to find discrepancies.

Handles three import operations (A, B, C) from a shared customs agent, each with different importers, suppliers, and goods.

## Repo layout

```text
.
├── pipeline.py                  # Main entry point — orchestrates the full pipeline
├── parse_and_compare.py         # Thin wrapper (delegates to pipeline.main())
├── config.py                    # Paths, constants, load_dotenv()
├── classifier.py                # Document classification by filename/content
├── extractors/                  # Text-based PDF field extraction
│   ├── __init__.py              # extract_text_pdf() dispatcher
│   ├── common.py                # first_match(), get_pdf_text(), is_image_pdf()
│   ├── bill_of_lading.py
│   ├── commercial_invoice.py
│   ├── packing_list.py
│   ├── cargo_insurance.py
│   ├── certificate_of_analysis.py
│   ├── delivery_order.py
│   ├── aviso_automatico.py
│   ├── vucem_acuse.py
│   ├── carta_encomienda.py
│   ├── eir.py
│   ├── factory_coa.py
│   └── pedimento.py             # pedimento_to_crossref()
├── gpt_extraction.py            # GPT-4.1-mini vision extraction for image PDFs
├── operations.py                # Group documents into operations A/B/C
├── crossref.py                  # Cross-reference engine (compare_values, tolerances)
├── extract_pedimento.py         # Core pedimento parser (standalone)
├── check.py                     # OpenAI API smoke test
├── data/
│   ├── raw/                     # Input PDFs and downloaded batches
│   ├── output/                  # Pipeline results (comparison_results.json)
│   └── reference/               # Taxonomy/reference files
└── README.md
```

## Requirements

```bash
pip install pdfplumber openai PyMuPDF
```

## Environment Setup

Create `.env` in the project root:

```bash
OPENAI_API_KEY=your_api_key_here
```

The key is required for image-PDF extraction via GPT. Text-based PDFs work without it.

## Usage

### Run the full pipeline

```bash
python pipeline.py
# or equivalently:
python parse_and_compare.py
```

Output: `data/output/comparison_results.json`

The pipeline:
1. Extracts the main pedimento (PED SIMPLIFICADO) as the reference document
2. Discovers and classifies all PDFs using filename patterns + content heuristics
3. Extracts fields from text PDFs via regex, or from image PDFs via GPT-4.1-mini vision
4. Groups documents into operations (A/B/C)
5. Cross-references extracted fields against pedimento data

### Extract a single pedimento

```bash
python extract_pedimento.py "data/raw/PED. SIMPLIFICADO AT2501392.pdf" > data/output/extracted_data.json
```

### Test OpenAI connectivity

```bash
python check.py
```

## What it extracts

### From pedimento (extract_pedimento.py)
- Pedimento header (numero, operacion, clave, patente, aduana, etc.)
- Importador (RFC, CURP)
- Agente aduanal (nombre, RFC, CURP, e.firma, certificado)
- Fechas (entrada, pago)
- Liquidacion (DTA, PRV, IVA, IVA PRV, total)
- Pago electronico (banco, linea captura, importe, fecha)
- Transporte (identificacion, pais, guia/BL, contenedor)
- Bultos, seguro, documentos
- Observaciones, e-documents

### Cross-referenceable fields (per document type)
- **Bill of Lading** — BL number, gross weight, container, packages, shipper, consignee, vessel, port
- **Commercial Invoice** — Invoice number, USD value, weight, packages, supplier, consignee, RFC
- **Packing List** — Weight, packages, consignee
- **Cargo Insurance** — USD value, BL number, packages, vessel
- **Delivery Order** — BL, container, vessel, weight, packages, shipper, consignee, port
- **Aviso Automatico** — RFC, USD value, weight
- **VUCEM Acuse** — RFC
- **Carta Encomienda** — BL number, RFC
- **EIR** — Container number

### Document types handled

pedimento, bill_of_lading, commercial_invoice, packing_list, cargo_insurance, certificate_of_analysis, factory_coa, delivery_order, carta_encomienda, manifestacion_de_valor, certificado_produccion, equipment_interchange_receipt, aviso_automatico, vucem_acuse, carta_3_1_8, scanned_docs, document_compilation
