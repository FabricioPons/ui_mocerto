#!/usr/bin/env python
"""
Document Extraction & Cross-Reference Pipeline.
Parses all import operation documents, extracts structured fields,
and cross-references them against pedimento data to find discrepancies.
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple

from config import DRIVE_DIR, OUTPUT_PATH, PED_SIMPLIFICADO, TAXONOMY_PATH, load_dotenv
from classifier import classify_document
from crossref import cross_reference
from extractors import extract_text_pdf, get_pdf_text, is_image_pdf
from extractors.pedimento import pedimento_to_crossref
from extract_pedimento import collect_lines, extract_fields
from gpt_extraction import extract_image_pdf_file_upload
from operations import group_by_operation


def main() -> int:
    load_dotenv()

    print("=" * 60)
    print("Document Extraction & Cross-Reference Pipeline")
    print("=" * 60)

    # Load taxonomy
    taxonomy: Dict[str, Any] = {}
    if TAXONOMY_PATH.exists():
        with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
            taxonomy = json.load(f)
        print(f"Loaded taxonomy: {taxonomy.get('metadata', {}).get('total_document_types', '?')} document types")

    # Step 1: Extract PED SIMPLIFICADO (main reference)
    print(f"\n--- Extracting PED SIMPLIFICADO ---")
    if not PED_SIMPLIFICADO.exists():
        print(f"ERROR: PED SIMPLIFICADO not found at {PED_SIMPLIFICADO}", file=sys.stderr)
        return 1

    ped_lines = collect_lines(PED_SIMPLIFICADO)
    ped_data = extract_fields(ped_lines)
    ped_data["source_pdf"] = str(PED_SIMPLIFICADO)
    ped_crossref = pedimento_to_crossref(ped_data)
    print(f"  Pedimento: {ped_crossref.get('pedimento_numero')}")
    print(f"  BL: {ped_crossref.get('bl_numero')}, Container: {ped_crossref.get('contenedor')}")
    print(f"  Weight: {ped_crossref.get('peso_bruto')} kg")

    # Step 2: Discover and classify all PDFs
    print(f"\n--- Discovering documents in {DRIVE_DIR.name} ---")
    if not DRIVE_DIR.exists():
        print(f"ERROR: Drive directory not found at {DRIVE_DIR}", file=sys.stderr)
        return 1

    pdf_files = sorted(DRIVE_DIR.glob("*.pdf"))
    print(f"  Found {len(pdf_files)} PDF files")

    # Classify and extract
    documents: List[Dict[str, Any]] = []
    image_pdfs: List[Tuple] = []

    for pdf_path in pdf_files:
        filename = pdf_path.name

        text_preview = get_pdf_text(pdf_path)[:500]
        doc_type = classify_document(filename, text_preview)

        is_img = is_image_pdf(pdf_path)
        method = "gpt-4.1-mini" if is_img else "pdfplumber"

        doc_entry = {
            "file": filename,
            "type": doc_type,
            "extraction_method": method,
            "fields": {},
        }

        print(f"  {filename}: type={doc_type}, method={method}")

        if not is_img:
            doc_entry["fields"] = extract_text_pdf(pdf_path, doc_type)
        else:
            image_pdfs.append((pdf_path, doc_type))

        documents.append(doc_entry)

    # Step 3: Process image PDFs with GPT (parallel)
    if image_pdfs:
        print(f"\n--- Extracting {len(image_pdfs)} image PDFs via GPT ---")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("WARNING: OPENAI_API_KEY not set. Skipping image PDF extraction.", file=sys.stderr)
        else:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            def process_image(args):
                pdf_path, doc_type = args
                return pdf_path.name, extract_image_pdf_file_upload(pdf_path, doc_type, client, taxonomy)

            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {executor.submit(process_image, item): item for item in image_pdfs}
                for future in as_completed(futures):
                    try:
                        fname, fields = future.result()
                        for doc in documents:
                            if doc["file"] == fname:
                                doc["fields"] = fields
                                break
                        print(f"  GPT extracted: {fname} -> {len(fields)} fields")
                    except Exception as e:
                        pdf_path, _ = futures[future]
                        print(f"  GPT error for {pdf_path.name}: {e}", file=sys.stderr)

    # Step 4: Group by operation
    print(f"\n--- Grouping documents by operation ---")
    operations: Dict[str, Dict[str, Any]] = {}

    for doc in documents:
        op_id = group_by_operation(doc)
        doc["operation"] = op_id

        if op_id not in operations:
            operations[op_id] = {
                "operation_id": op_id,
                "documents": [],
                "comparisons": [],
            }
        operations[op_id]["documents"].append(doc)

    for op_id, op in sorted(operations.items()):
        print(f"  Operation {op_id}: {len(op['documents'])} documents")

    # Step 5: Cross-reference against PED SIMPLIFICADO
    print(f"\n--- Cross-referencing against PED SIMPLIFICADO ---")

    ped_simplificado_entry = {
        "numero": ped_crossref.get("pedimento_numero"),
        "peso_bruto": ped_crossref.get("peso_bruto"),
        "bl_numero": ped_crossref.get("bl_numero"),
        "contenedor": ped_crossref.get("contenedor"),
        "bultos": ped_crossref.get("bultos"),
        "importer_rfc": ped_crossref.get("importer_rfc"),
        "vessel": ped_crossref.get("vessel"),
        "port_discharge": ped_crossref.get("port_discharge"),
        "valor_usd": ped_crossref.get("valor_usd"),
    }

    total_compared = 0
    total_matches = 0
    total_mismatches = 0
    total_missing = 0

    for op_id, op in operations.items():
        op_pedimento = {}

        for doc in op["documents"]:
            if doc["type"] == "pedimento" and doc["fields"]:
                op_pedimento = doc["fields"]
                break

        if not op_pedimento:
            op_pedimento = ped_crossref

        op["pedimento"] = ped_simplificado_entry

        ref = op_pedimento if op_pedimento else ped_crossref
        comparisons = cross_reference(ref, op["documents"])
        op["comparisons"] = comparisons

        for comp in comparisons:
            for source_info in comp["sources"].values():
                total_compared += 1
                status = source_info["status"]
                if status == "match":
                    total_matches += 1
                elif status == "mismatch":
                    total_mismatches += 1
                else:
                    total_missing += 1

    # Step 6: Build output
    output = {
        "ped_simplificado": {
            "source_pdf": str(PED_SIMPLIFICADO.name),
            "fields": ped_simplificado_entry,
        },
        "operations": [op for _, op in sorted(operations.items())],
        "summary": {
            "total_documents": len(documents),
            "total_fields_compared": total_compared,
            "matches": total_matches,
            "mismatches": total_mismatches,
            "missing": total_missing,
        },
    }

    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n--- Results ---")
    print(f"  Output: {OUTPUT_PATH}")
    print(f"  Total documents: {len(documents)}")
    print(f"  Fields compared: {total_compared}")
    print(f"  Matches: {total_matches}")
    print(f"  Mismatches: {total_mismatches}")
    print(f"  Missing: {total_missing}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
