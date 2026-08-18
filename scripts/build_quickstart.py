"""
Builds docs/Tracksure-Driver-Quick-Start.docx.

A contractual deliverable (TRACKSURE.md §12: "visual driver quick-start guide,
minimal text"). One page per action: a big orange step number, a short title, a
single line of plain English, and a screenshot that dominates the page.

Type and colour follow BRAND.md — Oxanium for numbers and headings, Albert Sans
for the line beneath, orange used once per page.
"""
import sys
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

S = sys.argv[1]
OUT = sys.argv[2]

BRAND = RGBColor(0xE0, 0x75, 0x1A)   # brand-deep reads better than #FFA300 on white paper
INK = RGBColor(0x30, 0x30, 0x30)
INK_SOFT = RGBColor(0x59, 0x59, 0x59)

# BRAND.md's Oxanium / Albert Sans are Google web fonts and are not installed on
# a typical office machine — naming them here makes Word substitute Times, which
# looks worse on a printed deliverable than an honest sans. The brand is carried
# by the logo, the orange, and 17 screenshots that use the real typefaces. Swap
# these two constants back if Anfani install the fonts on their machines.
DISPLAY = "Arial"
BODY = "Arial"

# (image, step title, the one line under it)
PAGES = [
    ("01-login",              "Sign in",                    "Your phone number, then your 4-number PIN."),
    ("02-home-blocking",      "Your trip",                  "An orange box means the office is waiting on you."),
    ("05-home-actions",       "Everything you can do",      "One tap each. Nothing else to learn."),
    ("03-journey-plan",       "Read the journey plan",      "Your route, your stops, and what to watch out for."),
    ("04-declaration-pretrip","Sign before you go",         "Your PIN is your signature. Loading starts after this."),
    ("06-waybill-pre",        "Photograph the waybill",     "At loading. Lay it flat and fill the screen."),
    ("07-waybill-post",       "Photograph the signed one",  "At delivery. This photo IS the proof you delivered."),
    ("08-fuel-stations",      "Fuel: pick the station",     "Just say where. Credit or cash is the office's job."),
    ("09-fuel-form",          "Fuel: photo and litres",     "Photograph the receipt. Litres and amount if you know."),
    ("10-fuel-sent",          "Fuel: sent",                 "It tells you if the station bills the office."),
    ("11-complaint",          "Report a problem",           "Breakdown, delay, trouble at the depot. Add a photo."),
    ("12-summary",            "End of trip",                "Your km, and the fuel you logged against the trip."),
    ("13-declaration-return", "Sign on return",             "Your PIN again. This one never blocks your next load."),
    ("14-settings",           "Your account",               "Your name and driver number. Sign out lives here."),
    ("15-change-pin",         "Change your PIN",            "Your current PIN, then the new one twice."),
    ("16-install-android",    "Put it on your phone",       "Android: open in Chrome and install it."),
    ("17-install-iphone",     "Put it on your phone",       "iPhone: open in Safari and add it."),
]


def style_run(run, *, font, size, color, bold=False):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold


def spaced(p, before=0, after=0, line=None):
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    if line is not None:
        p.paragraph_format.line_spacing = line


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.27)      # A4
section.page_height = Inches(11.69)
for attr in ("top_margin", "bottom_margin"):
    setattr(section, attr, Inches(0.55))
for attr in ("left_margin", "right_margin"):
    setattr(section, attr, Inches(0.7))

# ---------------------------------------------------------------- cover ----
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
spaced(p, before=90, after=0)
p.add_run().add_picture(f"{S}/quick-start-assets/assets-logo-stacked.png", width=Inches(3.1))

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
spaced(p, before=30, after=6)
style_run(p.add_run("Tracksure Driver"), font=DISPLAY, size=40, color=INK, bold=True)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
spaced(p, after=40)
style_run(p.add_run("Quick start"), font=DISPLAY, size=26, color=BRAND, bold=True)

for line in (
    "Everything you do on the road, one page at a time.",
    "You need phone signal to use it.",
    "Stuck? Call the office.",
):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spaced(p, after=8)
    style_run(p.add_run(line), font=BODY, size=15, color=INK_SOFT)

# --------------------------------------------------------- action pages ----
for i, (img, title, line) in enumerate(PAGES, start=1):
    # Small lockup so every page is unmistakably Anfani's. `page_break_before`
    # rather than an explicit break run: it leaves no empty paragraph behind at
    # the top of each page.
    p = doc.add_paragraph()
    p.paragraph_format.page_break_before = True
    spaced(p, after=14)
    p.add_run().add_picture(f"{S}/quick-start-assets/assets-logo.png", width=Inches(1.15))

    # Big number + title on one line: the number is the only orange thing here.
    p = doc.add_paragraph()
    spaced(p, after=2, line=1.0)
    style_run(p.add_run(f"{i}  "), font=DISPLAY, size=46, color=BRAND, bold=True)
    style_run(p.add_run(title), font=DISPLAY, size=28, color=INK, bold=True)

    p = doc.add_paragraph()
    spaced(p, after=16, line=1.15)
    style_run(p.add_run(line), font=BODY, size=17, color=INK_SOFT)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spaced(p, after=0)
    # Width-driven: the shots are trimmed of trailing blank space, so a fixed
    # height would stretch the short ones. A 4.9in phone is still the page.
    p.add_run().add_picture(f"{S}/quick-start-assets/{img}.png", width=Inches(4.9))

doc.save(OUT)
print(f"wrote {OUT} — {len(PAGES) + 1} pages")
