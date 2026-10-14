import re, sys
from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import argparse

_ap = argparse.ArgumentParser(
    description="Convert a ConstructOps markdown document to a styled .docx. "
                "The first H1 of the source becomes the title-page heading.")
_ap.add_argument("--src", required=True, help="input markdown file")
_ap.add_argument("--out", required=True, help="output .docx file")
_ap.add_argument("--subtitle", default="Business Document",
                 help="title-page subtitle line")
_ap.add_argument("--tagline", default=None, help="title-page italic tagline")
_ap.add_argument("--meta", action="append", default=[], metavar="KEY=VALUE",
                 help="title-page metadata row; repeatable")
_ap.add_argument("--note", default=None,
                 help="title-page italic note paragraph (optional)")
_ap.add_argument("--footer", default="ConstructOps",
                 help="footer label before page number")
args = _ap.parse_args()

SRC = args.src
OUT = args.out

GRAPHITE = RGBColor(0x1E, 0x1E, 0x1E)
ORANGE = RGBColor(0xC4, 0x51, 0x00)
STEEL = RGBColor(0x2F, 0x80, 0xED)
MUTED = RGBColor(0x55, 0x55, 0x55)
CODE_BG = "F3F4F6"
HEAD_BG = "1E1E1E"
BODY_FONT = "Calibri"
MONO = "Consolas"

doc = Document()

# ---------- page + base styles ----------
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.left_margin = sec.right_margin = Cm(1.6)
sec.top_margin = sec.bottom_margin = Cm(1.8)

st = doc.styles["Normal"]
st.font.name = BODY_FONT
st.font.size = Pt(10.5)
st.paragraph_format.space_after = Pt(6)
st.paragraph_format.line_spacing = 1.1

for name, size, color, before in (
    ("Heading 1", 20, GRAPHITE, 18),
    ("Heading 2", 15, ORANGE, 16),
    ("Heading 3", 12.5, GRAPHITE, 12),
    ("Heading 4", 11, MUTED, 10),
):
    s = doc.styles[name]
    s.font.name = BODY_FONT
    s.font.size = Pt(size)
    s.font.color.rgb = color
    s.font.bold = True
    s.font.italic = False
    s.paragraph_format.space_before = Pt(before)
    s.paragraph_format.space_after = Pt(4)
    s.paragraph_format.keep_with_next = True


def shade(el, fill):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    return shd


def field(par, instr):
    r = par.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    r._r.append(begin)
    instr_el = OxmlElement("w:instrText")
    instr_el.set(qn("xml:space"), "preserve")
    instr_el.text = instr
    r._r.append(instr_el)
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    r._r.append(sep)
    t = OxmlElement("w:t")
    t.text = "1"
    r._r.append(t)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    r._r.append(end)
    return r


INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\)|\\\S)", re.S)
CODE_SPAN = re.compile(r"(`[^`]+`)")


def style_code_run(par, text, size):
    r = par.add_run(text)
    r.font.name = MONO
    r.font.size = Pt(max((size or 10.5) - 1, 7))
    return r


def add_plain_or_code(par, chunk, size, color, bold=False, italic=False):
    for tok in CODE_SPAN.split(chunk):
        if not tok:
            continue
        if tok.startswith("`") and tok.endswith("`") and len(tok) > 2:
            r = style_code_run(par, tok[1:-1], size)
            r._r.get_or_add_rPr().append(shade(None, CODE_BG))
            if bold:
                r.bold = True
            if italic:
                r.italic = True
        else:
            r = par.add_run(tok)
            r.font.name = BODY_FONT
            if size:
                r.font.size = Pt(size)
            if color is not None:
                r.font.color.rgb = color
            if bold:
                r.bold = True
            if italic:
                r.italic = True


def add_inline(par, text, size=None, color=None, bold=False, italic=False):
    text = text.replace("\u2011", "-")
    for tok in INLINE.split(text):
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**") and len(tok) > 4:
            add_plain_or_code(par, tok[2:-2], size, color, bold=True, italic=italic)
        elif re.match(r"\[[^\]]+\]\([^)]*\)", tok):
            m = re.match(r"\[([^\]]+)\]\(([^)]*)\)", tok)
            label, target = m.group(1), m.group(2)
            add_plain_or_code(par, label, size, STEEL if not target.startswith("#") else color,
                              bold=bold, italic=italic)
            if not target.startswith("#"):
                par.runs[-1].underline = True
        elif tok.startswith("\\") and len(tok) == 2:
            add_plain_or_code(par, tok[1], size, color, bold=bold, italic=italic)
        else:
            add_plain_or_code(par, tok, size, color, bold=bold, italic=italic)


def para(text="", style=None, size=None, color=None, bold=False, italic=False,
         indent=None, space_after=None, space_before=None, align=None):
    p = doc.add_paragraph(style=style)
    if text:
        add_inline(p, text, size=size, color=color, bold=bold, italic=italic)
    if indent is not None:
        p.paragraph_format.left_indent = Cm(indent)
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    if space_before is not None:
        p.paragraph_format.space_before = Pt(space_before)
    if align is not None:
        p.alignment = align
    return p


def code_block(lines, lang):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.rows[0].cells[0]
    cell._tc.get_or_add_tcPr().append(shade(None, CODE_BG))
    label = {"mermaid": "diagram source (mermaid)", "bash": "shell", "": "code"}.get(lang, lang)
    first = True
    if lang == "mermaid":
        p = cell.paragraphs[0]
        r = p.add_run(label + " —")
        r.font.name = MONO
        r.font.size = Pt(8)
        r.italic = True
        r.font.color.rgb = MUTED
        p.paragraph_format.space_after = Pt(2)
        first = False
    for ln in lines:
        ln = ln.replace("<br/>", " / ").replace("<br>", " / ")
        p = cell.paragraphs[0] if first else cell.add_paragraph()
        first = False
        r = p.add_run(ln if ln else " ")
        r.font.name = MONO
        r.font.size = Pt(8.5)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.line_spacing = 1.0
    para("", space_after=2)


def split_row(line):
    parts = re.split(r"(?<!\\)\|", line.strip())
    if parts and not parts[0].strip():
        parts = parts[1:]
    if parts and not parts[-1].strip():
        parts = parts[:-1]
    return [p.strip().replace("\\|", "|") for p in parts]


def is_sep(line):
    return bool(re.fullmatch(r"\|?[\s:|-]+\|?", line.strip())) and "-" in line


def make_table(rows):
    header_cells = split_row(rows[0])
    blank_header = not any(c.strip() for c in header_cells)
    if blank_header:
        header, body = [""] * len(header_cells), rows[1:]
    else:
        header, body = rows[0], rows[2:] if len(rows) > 1 and is_sep(rows[1]) else rows[1:]
    ncol = max(len(split_row(r)) for r in rows)
    tbl = doc.add_table(rows=0, cols=ncol)
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl.autofit = True
    width = (sec.page_width - sec.left_margin - sec.right_margin) / ncol
    size = 9.0 if ncol <= 3 else (8.2 if ncol <= 5 else 7.6)
    header_cells = split_row(rows[0]) if not blank_header else []

    def fill_row(cells_text, is_head):
        row = tbl.add_row()
        for i in range(ncol):
            cell = row.cells[i]
            cell.width = width
            txt = cells_text[i] if i < len(cells_text) else ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.0
            if is_head:
                cell._tc.get_or_add_tcPr().append(shade(None, HEAD_BG))
                add_inline(p, txt, size=size, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True)
            else:
                add_inline(p, txt, size=size, color=GRAPHITE)
    fill_row(header_cells or [""] * ncol, not blank_header)
    for r in body:
        fill_row(split_row(r), False)
    # repeat header across pages
    if not blank_header:
        trPr = tbl.rows[0]._tr.get_or_add_trPr()
        el = OxmlElement("w:tblHeader")
        el.set(qn("w:val"), "true")
        trPr.append(el)
    para("", space_after=4)


def hr():
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:color"), "DDDDDD")
    pbdr.append(bottom)
    pPr.append(pbdr)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)


# ---------- read + parse ----------
raw = open(SRC, encoding="utf-8").read()
lines = raw.split("\n")

# title page from first H1
h1 = lines[0][2:].strip()
for i in range(1, 6):
    para("", space_after=0)
tp = para(h1, size=26, color=GRAPHITE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
para(args.subtitle, size=15, color=ORANGE,
     align=WD_ALIGN_PARAGRAPH.CENTER, space_after=20)
if args.tagline:
    para(args.tagline, size=11, color=MUTED,
         italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=26)
if args.meta:
    meta = doc.add_table(rows=0, cols=2)
    meta.style = "Table Grid"
    for pair in args.meta:
        k, _, v = pair.partition("=")
        row = meta.add_row()
        a, b = row.cells
        a.width = Cm(4.2)
        b.width = Cm(13.0)
        a._tc.get_or_add_tcPr().append(shade(None, "FFF0E5"))
        pa, pb = a.paragraphs[0], b.paragraphs[0]
        pa.paragraph_format.space_after = Pt(2)
        pb.paragraph_format.space_after = Pt(2)
        ra = pa.add_run(k.strip())
        ra.bold = True
        ra.font.size = Pt(9.5)
        rb = pb.add_run(v.strip().replace("—", "-"))
        rb.font.size = Pt(9.5)
    para("", space_after=18)
if args.note:
    note = para(args.note, size=9.5, color=MUTED, italic=True,
                align=WD_ALIGN_PARAGRAPH.CENTER)
    note.paragraph_format.left_indent = Cm(1)
    note.paragraph_format.right_indent = Cm(1)

doc.add_page_break()
toc_p = para("Contents", size=15, color=ORANGE, bold=True, space_after=8)
field(doc.add_paragraph(), r'TOC \o "1-2" \h \z \u')
para("(open in Word and press Ctrl+A then F9 to build the page numbers)", size=8.5,
     color=MUTED, italic=True)
doc.add_page_break()

i = 0
skipped_toc = False
table_buf = []
in_code = None
code_buf = []
first_h2 = True

while i < len(lines):
    line = lines[i]

    if in_code is not None:
        if line.strip().startswith("```"):
            code_block(code_buf, in_code)
            in_code = None
            code_buf = []
        else:
            code_buf.append(line)
        i += 1
        continue

    if line.strip().startswith("```"):
        in_code = line.strip()[3:].strip().lower()
        i += 1
        continue

    if line.lstrip().startswith("|") and line.rstrip().endswith("|"):
        table_buf.append(line)
        i += 1
        continue
    if table_buf:
        make_table(table_buf)
        table_buf = []

    stripped = line.strip()
    if not stripped:
        i += 1
        continue
    if re.fullmatch(r"-{3,}", stripped):
        i += 1
        continue
    if stripped == "# " + h1 or stripped.startswith("# ConstructOps"):
        i += 1
        continue

    m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
    if m:
        lvl = len(m.group(1))
        text = re.sub(r"\s*—\s*", " - ", m.group(2))
        text = text.replace("**", "").replace("`", "")
        if lvl == 1:
            i += 1
            continue
        if text.lower().startswith("table of contents"):
            skipped_toc = True
            i += 1
            continue
        if lvl == 2 and not first_h2:
            doc.add_page_break()
        if lvl == 2:
            first_h2 = False
        p = doc.add_heading("", level=min(lvl, 4))
        run = p.add_run(text)
        run.font.name = BODY_FONT
        i += 1
        continue

    if stripped.startswith(">"):
        buf = []
        while i < len(lines) and lines[i].strip().startswith(">"):
            buf.append(lines[i].strip().lstrip(">").strip())
            i += 1
        p = para(" ".join(b for b in buf if b), size=9.8, color=MUTED, italic=True,
                 indent=0.5, space_after=8)
        continue

    if skipped_toc and re.match(r"^\d+\.\s+\[.*\]\(#.*\)$", stripped):
        i += 1
        continue
    if re.match(r"^\d+\.\s+\[.*\]\(#.*\)$", stripped):
        i += 1
        continue

    mnum = re.match(r"^(\d+)\.\s+(.*)$", stripped)
    if mnum:
        p = para("", indent=0.55, space_after=4)
        r = p.add_run(mnum.group(1) + ". ")
        r.bold = True
        r.font.size = Pt(10.5)
        add_inline(p, mnum.group(2), size=10.5, color=GRAPHITE)
        p.paragraph_format.first_line_indent = Cm(-0.55)
        i += 1
        continue

    mb = re.match(r"^[-*]\s+(.*)$", stripped)
    if mb:
        depth = len(line) - len(line.lstrip())
        style = "List Bullet 2" if depth >= 2 else "List Bullet"
        p = doc.add_paragraph(style=style)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.1
        add_inline(p, mb.group(1), size=10.4, color=GRAPHITE)
        i += 1
        continue

    p = para(stripped, size=10.5, color=GRAPHITE)
    i += 1

if table_buf:
    make_table(table_buf)

# ---------- footer ----------
for s in doc.sections:
    s.footer.is_linked_to_previous = False
    fp = s.footer.paragraphs[0]
    fp.text = ""
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = fp.add_run(args.footer + "   |   page ")
    r1.font.size = Pt(8)
    r1.font.color.rgb = MUTED
    field(fp, "PAGE")
    r2 = fp.add_run(" of ")
    r2.font.size = Pt(8)
    r2.font.color.rgb = MUTED
    field(fp, "NUMPAGES")
    for r in fp.runs:
        r.font.size = Pt(8)
        r.font.color.rgb = MUTED

doc.save(OUT)

d2 = Document(OUT)
print("saved:", OUT)
print("paragraphs:", len(d2.paragraphs), "tables:", len(d2.tables))
print("h2 sections:", sum(1 for p in d2.paragraphs if p.style.name == "Heading 2"))
