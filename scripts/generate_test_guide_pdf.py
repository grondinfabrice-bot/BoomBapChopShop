from pathlib import Path
import textwrap


OUT = Path("documents/test-guide/boombapchopshop-test-guide.pdf")
W, H = 390, 844
M = 28
SITE_URL = "https://boombapchopshop.art"
FEEDBACK_URL = "https://boombapchopshop.art/#test-feedback"

COLORS = {
    "charcoal": (30 / 255, 30 / 255, 30 / 255),
    "black": (16 / 255, 16 / 255, 15 / 255),
    "surface": (25 / 255, 25 / 255, 24 / 255),
    "beige": (199 / 255, 191 / 255, 174 / 255),
    "gold": (176 / 255, 141 / 255, 87 / 255),
    "offwhite": (243 / 255, 238 / 255, 230 / 255),
    "brick": (142 / 255, 59 / 255, 46 / 255),
    "paper": (229 / 255, 220 / 255, 203 / 255),
    "soft": (155 / 255, 145 / 255, 128 / 255),
}


def color(name, stroke=False):
    r, g, b = COLORS[name]
    op = "RG" if stroke else "rg"
    return f"{r:.3f} {g:.3f} {b:.3f} {op}"


def esc(value):
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(text, chars):
    lines = []
    for para in str(text).split("\n"):
        if not para.strip():
            lines.append("")
            continue
        lines.extend(textwrap.wrap(para, width=chars, break_long_words=False))
    return lines


class Page:
    def __init__(self):
        self.ops = []
        self.links = []

    def rect(self, x, y, w, h, fill=None, stroke=None, lw=1):
        self.ops.append("q")
        if fill:
            self.ops.append(color(fill))
        if stroke:
            self.ops.append(color(stroke, True))
            self.ops.append(f"{lw} w")
        self.ops.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        self.ops.append("B" if fill and stroke else "f" if fill else "S")
        self.ops.append("Q")

    def line(self, x1, y1, x2, y2, stroke="gold", lw=0.8):
        self.ops += ["q", color(stroke, True), f"{lw} w", f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S", "Q"]

    def text(self, x, y, value, size=12, font="F1", fill="charcoal"):
        self.ops += ["q", color(fill), "BT", f"/{font} {size:.2f} Tf", f"{x:.2f} {y:.2f} Td", f"({esc(value)}) Tj", "ET", "Q"]

    def paragraph(self, x, y, text, size=11, font="F1", fill="charcoal", chars=42, leading=None):
        leading = leading or size * 1.35
        for line in wrap(text, chars):
            if line:
                self.text(x, y, line, size, font, fill)
            y -= leading
        return y

    def pill(self, x, y, text, w=72):
        self.rect(x, y - 18, w, 22, fill="offwhite", stroke="gold", lw=0.6)
        self.text(x + 8, y - 10, text, 8, "F2", "brick")

    def link(self, x, y, w, h, url):
        self.links.append((x, y, w, h, url))

    def card(self, x, y, w, h, title, body, accent="gold", body_size=10.2, body_chars=38):
        self.rect(x, y - h, w, h, fill="paper", stroke=accent, lw=0.7)
        self.text(x + 14, y - 24, title, 11, "F2", "brick")
        self.paragraph(x + 14, y - 44, body, body_size, "F1", "charcoal", body_chars, body_size * 1.35)

    def circle_logo(self, x, y, r=22):
        k = 0.55228475
        for rr, fill in [(r, "charcoal"), (r * 0.45, "gold"), (r * 0.14, "black")]:
            c = k * rr
            self.ops += [
                "q",
                color(fill),
                f"{x:.2f} {y + rr:.2f} m",
                f"{x + c:.2f} {y + rr:.2f} {x + rr:.2f} {y + c:.2f} {x + rr:.2f} {y:.2f} c",
                f"{x + rr:.2f} {y - c:.2f} {x + c:.2f} {y - rr:.2f} {x:.2f} {y - rr:.2f} c",
                f"{x - c:.2f} {y - rr:.2f} {x - rr:.2f} {y - c:.2f} {x - rr:.2f} {y:.2f} c",
                f"{x - rr:.2f} {y + c:.2f} {x - c:.2f} {y + rr:.2f} {x:.2f} {y + rr:.2f} c",
                "f",
                "Q",
            ]


def header(page, title):
    page.rect(0, 0, W, H, fill="offwhite")
    for gx in range(0, W, 48):
        page.line(gx, 0, gx, H, "paper", 0.22)
    for gy in range(0, H, 48):
        page.line(0, gy, W, gy, "paper", 0.22)
    page.rect(0, H - 122, W, 122, fill="surface")
    page.circle_logo(M + 25, H - 61, 24)
    page.text(M + 64, H - 52, "BOOM BAP CHOP SHOP", 11, "F2", "gold")
    page.text(M + 64, H - 70, "TEST MODE FIELD GUIDE", 8.5, "F1", "beige")
    page.text(M, H - 100, title, 29, "F2", "offwhite")
    page.line(M, H - 137, W - M, H - 137, "gold", 1.1)


def footer(page, n):
    page.text(M, 24, "Use only with Stripe test mode", 7.5, "F1", "soft")
    page.text(M + 112, 24, SITE_URL, 7.5, "F2", "brick")
    page.link(M + 112, 18, 132, 14, SITE_URL)
    page.text(W - M - 34, 24, f"{n}/4", 7.5, "F2", "soft")


def build_pages():
    pages = []

    p = Page()
    header(p, "TEST THE SHOP")
    y = H - 168
    p.rect(M, y - 44, W - 2 * M, 38, fill="surface", stroke="gold", lw=0.7)
    p.text(M + 14, y - 22, "Open on your phone:", 9, "F2", "gold")
    p.text(M + 128, y - 22, SITE_URL, 12, "F2", "offwhite")
    p.link(M + 128, y - 30, 190, 18, SITE_URL)
    y -= 60
    p.card(M, y, W - 2 * M, 116, "Mission", "Clique partout, ecoute, ajoute, retire, teste le panier et lance un paiement test. Le but est de trouver ce qui bloque, ce qui rassure, et ce qui donne envie d acheter.", "gold", 10.8, 42)
    y -= 138
    p.card(M, y, W - 2 * M, 108, "Important", "Entre ton vrai email pendant le checkout. Apres l achat test, verifie si le mail arrive, si les liens sont clairs, et si le telechargement fonctionne.", "brick", 10.6, 42)
    y -= 132
    p.text(M, y, "Carte test Stripe", 15, "F2", "brick")
    y -= 18
    p.rect(M, y - 124, W - 2 * M, 116, fill="surface", stroke="gold", lw=0.9)
    p.text(M + 18, y - 32, "BOOM BAP CHOP SHOP BANK", 10.5, "F2", "gold")
    p.text(M + 18, y - 64, "4242 4242 4242 4242", 18, "F2", "offwhite")
    p.text(M + 18, y - 91, "FABRICE GRONDIN", 9.5, "F2", "beige")
    p.text(M + 210, y - 91, "EXP 12/34", 9.5, "F2", "beige")
    p.text(M + 210, y - 108, "CVC 123", 9.5, "F2", "beige")
    p.text(M + 18, y - 110, "TEST MODE ONLY", 7.5, "F1", "soft")
    y -= 152
    p.card(M, y, W - 2 * M, 90, "Retour attendu", "Donne les notes /20, puis trois remarques franches : ce qui marche, ce qui bloque, et l amelioration prioritaire.", "gold", 10.8, 42)
    y -= 106
    p.rect(M, y - 42, W - 2 * M, 36, fill="surface", stroke="gold", lw=0.7)
    p.text(M + 14, y - 25, "Send feedback:", 9, "F2", "gold")
    p.text(M + 116, y - 25, FEEDBACK_URL, 9.5, "F2", "offwhite")
    p.link(M + 116, y - 32, 210, 16, FEEDBACK_URL)
    footer(p, 1)
    pages.append(p)

    ratings = [
        ("Style visuel", "Univers boom bap, premium, credible."),
        ("Clarte", "On comprend vite ce que le site vend."),
        ("Navigation", "Beats, licences, blog, contact sont faciles a trouver."),
        ("Ecoute", "Player, pochettes, play/pause sont agreables."),
        ("Checkout", "Panier, licence, paiement : clair et rassurant."),
        ("Licences", "MP3, WAV, Stems, Exclusive sont comprehensibles."),
        ("Mobile", "Lisible, centre, facile a cliquer sur telephone."),
        ("Confiance", "Tu aurais confiance pour acheter ou contacter."),
        ("Vitesse", "Le site semble fluide et sans bug genant."),
        ("Global", "Envie de rester, ecouter, acheter, revenir."),
    ]
    for chunk_index, chunk in enumerate((ratings[:5], ratings[5:]), 0):
        p = Page()
        header(p, "NOTES /20")
        y = H - 166
        start = chunk_index * 5 + 1
        for offset, (title, desc) in enumerate(chunk):
            i = start + offset
            h = 92
            p.rect(M, y - h, W - 2 * M, h - 8, fill="paper", stroke="gold", lw=0.45)
            p.text(M + 14, y - 28, f"{i:02d}. {title}", 13, "F2", "brick")
            p.paragraph(M + 14, y - 50, desc, 10, "F1", "charcoal", 34, 13)
            p.line(W - M - 92, y - 59, W - M - 38, y - 59, "brick", 1)
            p.text(W - M - 33, y - 64, "/20", 15, "F2", "charcoal")
            y -= h
        footer(p, 2 + chunk_index)
        pages.append(p)

    p = Page()
    header(p, "QUESTIONS RAPIDES")
    y = H - 166
    questions = [
        "Qu est-ce qui t a donne envie de cliquer ?",
        "Qu est-ce qui t a freine ou semble flou ?",
        "A quel moment tu t es demande quoi faire ensuite ?",
        "Quel element semble amateur ou pas assez credible ?",
        "As-tu trouve un bug, un bouton bizarre, un texte pas clair ?",
        "Sur mobile, qu est-ce qui t a gene ?",
        "Si tu etais artiste, acheterais-tu un beat ici ? Pourquoi ?",
        "Quelle section ameliorer en priorite ?",
    ]
    for q in questions:
        p.rect(M, y - 48, W - 2 * M, 42, fill="paper", stroke="gold", lw=0.35)
        p.paragraph(M + 12, y - 23, q, 10.2, "F2", "charcoal", 42, 13)
        y -= 58
    footer(p, 4)
    pages.append(p)

    p = Page()
    header(p, "CHECKLIST TEST")
    y = H - 166
    checks = [
        "ouvrir le site sur telephone",
        "ecouter plusieurs beats",
        "tester play / pause / restart",
        "ouvrir une licence",
        "ajouter une licence au panier",
        "retirer un item du panier",
        "ajouter mix/master si propose",
        "aller au checkout",
        "entrer ton vrai email",
        "accepter les termes de licence",
        "payer avec la carte test",
        "verifier le retour apres Stripe",
        "verifier le mail recu",
        "ouvrir le contrat PDF",
        "tester le lien de telechargement",
    ]
    for c in checks:
        p.rect(M, y - 15, 12, 12, stroke="brick", lw=1)
        p.text(M + 22, y - 12, c, 10.5, "F1", "charcoal")
        y -= 31
    p.rect(M, 66, W - 2 * M, 118, fill="surface", stroke="gold", lw=0.7)
    p.text(M + 14, 134, "Retour final", 13, "F2", "gold")
    p.paragraph(M + 14, 112, "Envoie-moi tes notes, les bugs, et ton impression honnete. Une critique dure est utile si elle rend le shop plus clair.", 9.8, "F1", "offwhite", 39)
    p.text(M + 14, 82, FEEDBACK_URL, 9.5, "F2", "gold")
    p.link(M + 14, 76, 216, 16, FEEDBACK_URL)
    footer(p, 5)
    pages.append(p)
    return pages


def add_object(objects, obj):
    objects.append(obj)
    return len(objects)


def build_pdf(pages):
    objects = []
    font_regular = add_object(objects, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    font_bold = add_object(objects, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    page_ids = []
    content_ids = []
    page_annots = []
    for page in pages:
        stream = "\n".join(page.ops).encode("cp1252", errors="replace")
        content_id = add_object(objects, b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
        content_ids.append(content_id)
        annots = []
        for x, y, w, h, url in page.links:
            annot = (
                f"<< /Type /Annot /Subtype /Link /Rect [{x:.2f} {y:.2f} {x + w:.2f} {y + h:.2f}] "
                f"/Border [0 0 0] /A << /S /URI /URI ({esc(url)}) >> >>"
            ).encode()
            annots.append(add_object(objects, annot))
        page_annots.append(annots)
        page_ids.append(add_object(objects, None))
    pages_id = add_object(objects, None)
    catalog_id = add_object(objects, f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode())

    for page_id, content_id, annots in zip(page_ids, content_ids, page_annots):
        annots_part = f"/Annots [{' '.join(f'{annot} 0 R' for annot in annots)}] " if annots else ""
        objects[page_id - 1] = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {W} {H}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
            f"{annots_part}/Contents {content_id} 0 R >>"
        ).encode()
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return pdf


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(build_pdf(build_pages()))
    print(OUT.resolve())


if __name__ == "__main__":
    main()
