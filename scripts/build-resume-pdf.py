"""Builds assets/DelRosarioXavierResume.pdf from ../Z_Personal/Resume.html.

Resume.html stays the source of truth; rerun this after editing it:
  python3 -m venv venv && venv/bin/pip install reportlab beautifulsoup4
  venv/bin/python scripts/build-resume-pdf.py
Layout mirrors the HTML's print styles (Times, 10.5pt body, 0.6in / 0.85in margins).
"""
from pathlib import Path
from bs4 import BeautifulSoup
from reportlab.lib.colors import black, HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Table, TableStyle,
                                ListFlowable, ListItem, Spacer, HRFlowable)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "Z_Personal" / "Resume.html"
OUT = ROOT / "assets" / "DelRosarioXavierResume.pdf"
MUTED = HexColor("#333333")
INDENT = 0.3 * inch

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def st(name, **kw):
    base = dict(fontName="Times-Roman", fontSize=10.5, leading=12.6, textColor=black)
    base.update(kw)
    return ParagraphStyle(name, **base)

NAME = st("name", fontName="Times-Bold", fontSize=21, leading=25, alignment=TA_CENTER)
CONTACT = st("contact", fontSize=10, leading=12, alignment=TA_CENTER, textColor=MUTED)
H2 = st("h2", fontName="Times-Bold", fontSize=11, leading=13)
BODY = st("body", leftIndent=INDENT)
TITLE = st("title", fontName="Times-Bold")
DATE = st("date", fontSize=10, textColor=MUTED, alignment=2)
BULLET = st("bullet")
TECH = st("tech", fontName="Times-Italic", fontSize=9.5, leading=11.5, textColor=MUTED, leftIndent=INDENT)
SKILL = st("skill", fontSize=9.5, leading=11.9)
SKILL_LABEL = st("skilllabel", fontName="Times-Bold", fontSize=9.5, leading=11.9)

def heading(text):
    return [Spacer(1, 4), Paragraph(esc(text.upper()).replace(" ", "&nbsp;"), H2),
            HRFlowable(width="100%", thickness=0.75, color=black, spaceBefore=1, spaceAfter=3)]

def head_row(title, date, width):
    t = Table([[Paragraph(esc(title), TITLE), Paragraph(esc(date), DATE)]],
              colWidths=[width - 1.45 * inch, 1.45 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t

def indented(flowable, width):
    t = Table([[flowable]], colWidths=[width])
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), INDENT), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t

def build():
    soup = BeautifulSoup(SRC.read_text(encoding="utf-8"), "html.parser")
    page = soup.select_one(".page")
    doc = SimpleDocTemplate(str(OUT), pagesize=letter, leftMargin=0.85 * inch, rightMargin=0.85 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            title="Xavier Del Rosario — Resume", author="Xavier Del Rosario")
    width = doc.width - 12  # the frame pads 6pt on each side
    story = [Paragraph(esc(page.select_one("header h1").get_text(strip=True)), NAME), Spacer(1, 4)]

    links = []
    for span in page.select("header .contact > span:not(.sep)"):
        a = span.find("a")
        links.append(f'<a href="{a["href"]}" color="#333333">{esc(a.get_text(strip=True))}</a>' if a
                     else esc(span.get_text(strip=True)))
    story += [Paragraph("&nbsp;&nbsp;|&nbsp;&nbsp;".join(links), CONTACT), Spacer(1, 6),
              HRFlowable(width="100%", thickness=1.5, color=black, spaceAfter=6)]

    for section in page.find_all("section"):
        story += heading(section.find("h2").get_text(strip=True))
        if "skills" in (section.get("class") or []):
            rows = []
            for p in section.find_all("p"):
                label = p.select_one(".label")
                text = p.get_text(" ", strip=True).replace(label.get_text(strip=True), "", 1).strip()
                rows.append([Paragraph(esc(label.get_text(strip=True)), SKILL_LABEL), Paragraph(esc(text), SKILL)])
            t = Table(rows, colWidths=[INDENT + 1.4 * inch, width - INDENT - 1.4 * inch])
            t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (0, -1), INDENT), ("LEFTPADDING", (1, 0), (1, -1), 0),
                                   ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 1), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            story.append(t)
            continue
        entries = section.select(".entry")
        if not entries:
            for p in section.find_all("p"):
                story.append(Paragraph(esc(p.get_text(" ", strip=True)), BODY))
            continue
        for e in entries:
            story.append(indented(head_row(e.select_one(".title").get_text(" ", strip=True),
                                           e.select_one(".date").get_text(" ", strip=True), width - INDENT), width))
            items = [ListItem(Paragraph(esc(li.get_text(" ", strip=True)), BULLET))
                     for li in e.select("li")]
            if items:
                story.append(Spacer(1, 1))
                story.append(ListFlowable(items, bulletType="bullet", start="•", bulletFontName="Times-Roman",
                                          bulletFontSize=10.5, leftIndent=INDENT + 13, bulletDedent=11))
            tech = e.select_one(".tech")
            if tech:
                story.append(Spacer(1, 1))
                story.append(Paragraph(esc(tech.get_text(" ", strip=True)), TECH))
            story.append(Spacer(1, 4))

    pages = []
    doc.build(story, onFirstPage=lambda c, d: pages.append(1), onLaterPages=lambda c, d: pages.append(1))
    print(f"wrote {OUT.relative_to(ROOT)} ({len(pages)} page{'s' if len(pages) != 1 else ''})")

if __name__ == "__main__":
    build()
