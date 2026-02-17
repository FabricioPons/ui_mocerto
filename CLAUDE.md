# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Mocerto app-mvp is a **document extraction and cross-reference pipeline** for Mexican customs import operations. It parses PDF documents (pedimentos, bills of lading, commercial invoices, packing lists, insurance certificates, etc.), extracts structured fields, and cross-references them against the main pedimento (customs declaration) to find discrepancies.

The pipeline handles three import operations (A, B, C) from a shared customs agent, each with different importers, suppliers, and goods. See `data/raw/drive-download-20260205T220732Z-1-001/DOCUMENT_MAP.md` for the full operation breakdown.

## Commands

```bash
# Install dependencies
pip install pdfplumber openai PyMuPDF

# Extract fields from a single pedimento PDF → JSON to stdout
python extract_pedimento.py <pdf_path>

# Run the full pipeline (extract all docs, classify, cross-reference)
python parse_and_compare.py
# Output → data/output/comparison_results.json

# Test OpenAI file parsing connectivity
python check.py
```

## Environment Setup

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The key is required for `check.py` and for image-PDF extraction in `parse_and_compare.py` (text-based PDFs work without it).

## Architecture

### Three Python Scripts

- **`extract_pedimento.py`** — Core pedimento parser. Uses `pdfplumber` + regex to extract all fields from Pedimento Simplificado PDFs. Exports `collect_lines()`, `extract_fields()`, and `normalize_amount()` used by the pipeline.

- **`parse_and_compare.py`** — Main pipeline orchestrator. Imports from `extract_pedimento.py`. Does:
  1. Extracts the main pedimento (PED SIMPLIFICADO) as the reference document
  2. Discovers and classifies all PDFs in `data/raw/drive-download-*/` using filename regex patterns (`CLASSIFICATION_RULES`) then content heuristics (`CONTENT_HEURISTICS`)
  3. Extracts cross-referenceable fields from text PDFs via regex, or from image PDFs via OpenAI GPT-4.1-mini vision API (parallel with `ThreadPoolExecutor`)
  4. Groups documents into operations (A/B/C) using known identifiers in `OPERATION_IDENTIFIERS`
  5. Cross-references extracted fields against pedimento data with numeric tolerance (0.5%) and fuzzy string matching

- **`check.py`** — Standalone OpenAI API smoke test. Uploads a PDF and asks GPT to summarize it.

### Data Flow

```
data/raw/*.pdf → classify_document() → extract_text_pdf() or extract_image_pdf()
                                            ↓
data/raw/PED_SIMPLIFICADO.pdf → extract_fields() → ped_crossref (reference)
                                            ↓
                                   cross_reference() → comparison_results.json
```

### Key Hardcoded Paths

In `parse_and_compare.py`:
- `DRIVE_DIR` = `data/raw/drive-download-20260205T220732Z-1-001/`
- `PED_SIMPLIFICADO` = `data/raw/81_5001570_IC_PN_1.pdf`
- `TAXONOMY_PATH` = taxonomy JSON inside drive download folder
- `OUTPUT_PATH` = `data/output/comparison_results.json`

### Document Types Handled

pedimento, bill_of_lading, commercial_invoice, packing_list, cargo_insurance, certificate_of_analysis, factory_coa, delivery_order, carta_encomienda, manifestacion_de_valor, certificado_produccion, equipment_interchange_receipt, aviso_automatico, vucem_acuse, carta_3_1_8, scanned_docs, document_compilation

### Cross-Reference Logic

`CROSS_REF_FIELDS` defines which fields are comparable per document type. Comparison uses `compare_values()` which returns: `match`, `mismatch`, `missing_in_pedimento`, or `missing_in_source`. Numeric comparisons use a 0.5% relative tolerance (`NUMERIC_TOLERANCE`).

## Domain Context

- **Pedimento** = Mexican customs declaration form filed for each import
- **Pedimento Simplificado** = simplified version of the customs declaration
- Field names are largely in Spanish (peso_bruto = gross weight, bultos = packages, aduana = customs office, etc.)
- All documents revolve around the Mexican import process through ANAM (customs authority)
- Reference taxonomy in `data/reference/field_taxonomy.json` defines all document types and their fields
