"""Configuration: paths, constants, environment loading."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DRIVE_DIR = BASE_DIR / "data" / "raw" / "drive-download-20260205T220732Z-1-001"
PED_SIMPLIFICADO = BASE_DIR / "data" / "raw" / "PED. SIMPLIFICADO AT2501392.pdf"
TAXONOMY_PATH = DRIVE_DIR / "taxonomy_fields.json"
OUTPUT_PATH = BASE_DIR / "data" / "output" / "comparison_results.json"

# Numeric comparison tolerance (0.5%)
NUMERIC_TOLERANCE = 0.005


def load_dotenv(path: str = None):
    if path is None:
        path = str(BASE_DIR / ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
