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

### Module Structure

- **`config.py`** — Paths (`DRIVE_DIR`, `PED_SIMPLIFICADO`, etc.), `NUMERIC_TOLERANCE`, and `load_dotenv()`.
- **`classifier.py`** — `CLASSIFICATION_RULES`, `CONTENT_HEURISTICS`, `classify_document()`.
- **`extractors/`** — Package for text-based PDF extraction:
  - `common.py` — `first_match()`, `get_pdf_text()`, `is_image_pdf()`.
  - `__init__.py` — `extract_text_pdf()` dispatcher by doc_type.
  - `bill_of_lading.py`, `commercial_invoice.py`, `packing_list.py`, `cargo_insurance.py`, `certificate_of_analysis.py`, `delivery_order.py`, `aviso_automatico.py`, `vucem_acuse.py`, `carta_encomienda.py`, `eir.py`, `factory_coa.py` — Each exports `extract(text, upper)`.
  - `pedimento.py` — `extract(pdf_path)` + `pedimento_to_crossref()`.
- **`gpt_extraction.py`** — `GPT_FIELD_DEFS`, `build_gpt_prompt()`, `extract_image_pdf()`, `extract_image_pdf_file_upload()`.
- **`operations.py`** — `OPERATION_IDENTIFIERS`, `group_by_operation()`.
- **`crossref.py`** — `CROSS_REF_FIELDS`, `compare_values()`, `cross_reference()`.
- **`pipeline.py`** — `main()` orchestrator (entry point).
- **`parse_and_compare.py`** — Thin wrapper: `from pipeline import main`.
- **`extract_pedimento.py`** — Core pedimento parser (`collect_lines()`, `extract_fields()`, `normalize_amount()`).
- **`check.py`** — Standalone OpenAI API smoke test.

### Data Flow

```
data/raw/*.pdf → classify_document() → extract_text_pdf() or extract_image_pdf()
                                            ↓
data/raw/PED_SIMPLIFICADO.pdf → extract_fields() → ped_crossref (reference)
                                            ↓
                                   cross_reference() → comparison_results.json
```

### Key Hardcoded Paths

In `config.py`:
- `DRIVE_DIR` = `data/raw/drive-download-20260205T220732Z-1-001/`
- `PED_SIMPLIFICADO` = `data/raw/PED. SIMPLIFICADO AT2501392.pdf`
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
