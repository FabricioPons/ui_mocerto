import os

from openai import OpenAI


def load_dotenv(path=".env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing. Add it to .env or your shell env.")

# Initialize client
client = OpenAI(api_key=api_key)

# PDF file to upload (can be overridden in .env with PDF_FILE=...)
PDF_FILE = os.getenv(
    "PDF_FILE",
    "data/raw/drive-download-20260205T220732Z-1-001/escaneo_grupo4pl100-050_2026-01-29-10-15-42.pdf",
)
if not os.path.exists(PDF_FILE):
    raise FileNotFoundError(
        f"PDF file not found: {PDF_FILE}. Set PDF_FILE in .env to a valid path."
    )

print("Uploading PDF...")

# Upload PDF
with open(PDF_FILE, "rb") as fh:
    pdf = client.files.create(
        file=fh,
        purpose="assistants",
    )

print("Uploaded successfully.")
print("File ID:", pdf.id)

print("\nTesting PDF parsing...\n")

# Ask model to parse PDF
response = client.responses.create(
    model="gpt-4.1-mini",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": (
                        "Analyze this PDF and pr1ovide:\n"
                        "1. Document title\n"
                        "2. 5 bullet summary\n"
                        "3. Any serial numbers\n"
                        "4. Any important values or measurements\n"
                        "5. Confirm you successfully read it"
                    )
                },
                {
                    "type": "input_file",
                    "file_id": pdf.id
                }
            ]
        }
    ]
)

print("=== MODEL RESPONSE ===\n")
print(response.output_text)
print("\n=== END ===")
