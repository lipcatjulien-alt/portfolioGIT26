#!/usr/bin/env python3
"""Static checks for BTS SIO portfolio and public document exposure.
Run: python tests/audit_portfolio.py
Do not print secrets or PDF text in CI logs.
"""
from __future__ import annotations
import html.parser, json, os, pathlib, re, sys
from urllib.parse import unquote, urlsplit
ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = {"accueil", "competences", "stage", "projets", "veille", "synthese", "parcours", "referentiel", "cv", "procedures", "contact"}

class Scan(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids=[]; self.hashes=[]; self.assets=[]; self.images=[]; self.new_tabs=[]; self.headings=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get("id"): self.ids.append(a["id"])
        if tag in ("h1","h2","h3"): self.headings.append(tag)
        if tag=="img": self.images.append(a)
        if tag=="a":
            if a.get("href","").startswith("#"): self.hashes.append(a["href"][1:])
            if a.get("target")=="_blank": self.new_tabs.append(a)
        if tag in ("a","img","script","link"):
            for key in ("href","src"):
                val=a.get(key,"")
                if val and not val.startswith(("#","mailto:","tel:","data:")) and not urlsplit(val).scheme and not val.startswith("//"):
                    self.assets.append(val)

def main():
    doc=Scan()
    index=ROOT/"index.html"
    doc.feed(index.read_text(encoding="utf-8"))
    errors=[]; warnings=[]
    for item in sorted(REQUIRED-set(doc.ids)): errors.append("missing-section: "+item)
    dup=sorted({x for x in doc.ids if doc.ids.count(x)>1})
    if dup: errors.append("duplicate-ids: "+", ".join(dup))
    missing_anchors=sorted({unquote(x) for x in doc.hashes if unquote(x) not in doc.ids})
    if missing_anchors: errors.append("unresolved-anchors: "+", ".join(missing_anchors))
    if doc.headings.count("h1")!=1: errors.append("expected exactly one H1")
    if any("alt" not in img for img in doc.images): errors.append("image without alt")
    if any("noopener" not in (x.get("rel") or "").split() for x in doc.new_tabs): warnings.append("external target=_blank missing noopener")
    missing_files=[]
    for raw in sorted(set(doc.assets)):
        path=unquote(urlsplit(raw).path)
        if not path or path.startswith("/"): continue
        actual=ROOT/path
        if not actual.is_file(): missing_files.append(raw)
    if missing_files: errors.append("missing-assets: "+", ".join(missing_files))
    pdfs=sorted(ROOT.rglob("*.pdf"))
    reports=[]
    # Text inspection is deliberately not an attestation of absence of confidential content.
    try: import fitz
    except ImportError: fitz=None; warnings.append("PyMuPDF missing; PDF content not scanned")
    secret_rx=re.compile(r"(?i)\b(?:password|passwd|mot\s+de\s+passe|secret|api[_ -]?key|token|clé\s+privée)\b\s*[:=]\s*(?:['\"])?\S{4,}")
    privatekey_rx=re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")
    key_rx=re.compile(r"\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,})\b")
    for filename in pdfs:
        entry={"file":str(filename.relative_to(ROOT)), "pages":None, "keyword_pages":[], "critical_pages":[], "error":None}
        if not fitz:
            reports.append(entry); continue
        try:
            with fitz.open(filename) as d:
                entry["pages"]=len(d)
                for n,page in enumerate(d):
                    txt=page.get_text()
                    if secret_rx.search(txt): entry["keyword_pages"].append(n+1)
                    if privatekey_rx.search(txt) or key_rx.search(txt): entry["critical_pages"].append(n+1)
        except Exception as ex:
            entry["error"]=type(ex).__name__
            errors.append("unreadable-pdf: "+entry["file"])
        reports.append(entry)
    critical=[r for r in reports if r["critical_pages"]]
    flagged=[r for r in reports if r["keyword_pages"]]
    if critical: errors.append("POTENTIAL SECRET MATERIAL in PDFs: "+", ".join(x["file"] for x in critical))
    if flagged: warnings.append("PDF pages contain credential-like terms; manual review required: "+str(len(flagged))+" files")
    summary={"status":"pass" if not errors else "fail","sections":len(REQUIRED),"internal_links":len(doc.hashes),"images":len(doc.images),"external_new_tabs":len(doc.new_tabs),"assets_checked":len(set(doc.assets)),"pdfs_scanned":len(pdfs),"pdfs_flagged":flagged,"pdfs_critical":critical,"errors":errors,"warnings":warnings}
    out=ROOT/"audit-results.json"
    out.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    # No content or matched values printed: only paths and page numbers.
    print(json.dumps({k:v for k,v in summary.items() if k not in ("pdfs_flagged","pdfs_critical")},ensure_ascii=False,indent=2))
    for entry in flagged: print("PDF_REVIEW:",entry["file"],"pages",",".join(map(str,entry["keyword_pages"])))
    for entry in critical: print("PDF_CRITICAL:",entry["file"],"pages",",".join(map(str,entry["critical_pages"])))
    return int(bool(errors))
if __name__=="__main__": sys.exit(main())
