"""Builds assets/DelRosarioXavierResume.pdf from ../Z_Personal/Resume.html.

Resume.html stays the source of truth; rerun this after editing it. It prints the page
with headless Chromium, so the PDF matches the HTML's own print styles exactly:
  python3 -m venv venv && venv/bin/pip install playwright pypdf
  venv/bin/python -m playwright install chromium
  venv/bin/python scripts/build-resume-pdf.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "Z_Personal" / "Resume.html"
OUT = ROOT / "assets" / "DelRosarioXavierResume.pdf"

def build():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(SRC.as_uri())
        page.wait_for_load_state("networkidle")
        page.pdf(path=str(OUT), prefer_css_page_size=True, print_background=True)
        browser.close()
    pages = len(PdfReader(str(OUT)).pages)
    print(f"wrote {OUT.relative_to(ROOT)} ({pages} page{'s' if pages != 1 else ''})")

if __name__ == "__main__":
    build()
