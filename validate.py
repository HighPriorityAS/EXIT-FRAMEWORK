"""Launch gate: routes, anchors, image integrity, and the single design system."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
EXPECTED = 'aca2b26064cc3880e8722fe2d45ea877a62a1741906b573b658b7c3325def853'
errors = []

def site_digest():
    digest=hashlib.sha256()
    # Path ordering is case-insensitive on Windows; sort portable strings instead.
    for path in sorted(ROOT.rglob('*'), key=lambda p: p.relative_to(ROOT).as_posix()):
        if path.is_file() and '.git' not in path.parts and (path.suffix in ('.html','.css','.js','.jpg','.webp','.svg','.ttf','.xml') or path.name in ('CNAME','robots.txt')):
            digest.update(path.relative_to(ROOT).as_posix().encode())
            # Text checkout newlines can differ between Windows and the Pages runner.
            if path.suffix in ('.html','.css','.js','.xml') or path.name in ('CNAME','robots.txt'):
                digest.update(path.read_text(encoding='utf-8').encode('utf-8'))
            else:
                digest.update(path.read_bytes())
    return digest.hexdigest()

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.path=path; self.ids=set(); self.refs=[]; self.styles=[]; self.images=[]; self.h1=0
        self.feed(path.read_text(encoding='utf-8'))
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'):
            if a['id'] in self.ids: errors.append(f'{self.path.name}: duplicate id {a["id"]}')
            self.ids.add(a['id'])
        if tag=='h1': self.h1+=1
        if tag=='link' and a.get('rel')=='stylesheet': self.styles.append(a.get('href'))
        if tag=='img': self.images.append(a)
        for key in ('src','href'):
            if a.get(key): self.refs.append(a[key])

pages={p.resolve():Page(p) for p in ROOT.rglob('*.html') if '_site' not in p.parts}
for path,page in pages.items():
    if page.h1!=1: errors.append(f'{path.name}: expected one H1')
    if len(page.styles)!=1 or not urlsplit(page.styles[0]).path.endswith('styles.css'): errors.append(f'{path.name}: shared stylesheet missing')
    for raw in page.refs:
        u=urlsplit(raw)
        if u.scheme or u.netloc: continue
        target=(ROOT/u.path.lstrip('/') if u.path.startswith('/') else path.parent/unquote(u.path)).resolve() if u.path else path
        if target.is_dir(): target=target/'index.html'
        if not target.is_relative_to(ROOT) or not target.exists(): errors.append(f'{path.name}: missing/outside link {raw}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids: errors.append(f'{path.name}: missing anchor {raw}')
    for im in page.images:
        if not all(im.get(a) for a in ('alt','width','height')): errors.append(f'{path.name}: image lacks alt/dimensions')
    if 'Research participation is not sold.' not in path.read_text(encoding='utf-8'): errors.append(f'{path.name}: research boundary missing')

image=ROOT/'assets/exit-framework-hero-source.jpg'
actual=hashlib.sha256(image.read_bytes()).hexdigest()
if actual!=EXPECTED: errors.append('Hero source SHA-256 changed')
if '--decode' in sys.argv:
    from PIL import Image
    with Image.open(image) as im:
        im.load()
        if im.size!=(864,1536) or im.format!='JPEG': errors.append('Incorrect hero dimensions/format')
for name in ('index.html','framework.html'):
    text=(ROOT/name).read_text(encoding='utf-8')
    # Numbered method labels, in document order (not incidental prose mentions).
    import re
    pattern=r'<h3>(Stabilize|Observe|Separate|Choose|Execute|Measure|Document|Adjust)</h3>' if name=='index.html' else r'\d\d / (Stabilize|Observe|Separate|Choose|Execute|Measure|Document|Adjust)'
    if re.findall(pattern,text)!=['Stabilize','Observe','Separate','Choose','Execute','Measure','Document','Adjust']: errors.append(f'{name}: method order changed')
text=(ROOT/'index.html').read_text(encoding='utf-8')
for required in ('<h1 id="hero-title">EXIT FRAMEWORK</h1>','A STRATEGIC SYSTEM FOR','HUMAN AUTONOMY','CLARITY TODAY.','A DIFFERENT TOMORROW.','assets/exit-framework-hero-source.jpg'):
    if required not in text: errors.append(f'Homepage missing {required}')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
js=(ROOT/'site.js').read_text(encoding='utf-8')
if '!important' in css or 'background-image' in css or 'data:image' in css: errors.append('Competing style/hero logic found')
if 'createElement' in js or 'fetch(' in js: errors.append('Unexpected injection/integration logic')
if (ROOT/'CNAME').read_text().strip()!='chaosexit.com': errors.append('Domain mismatch')
if '--release' in sys.argv:
    report=json.loads((ROOT/'qa-results.json').read_text())
    if report.get('result')!='passed' or report.get('widths')!=[390,430,768,1440]: errors.append('Mandatory browser QA has not passed')
    if report.get('image_sha256')!=EXPECTED: errors.append('Browser QA references different artwork')
    if report.get('site_sha256')!=site_digest(): errors.append('Site changed after browser QA; repeat affected checks')
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(pages)} pages; local routes and anchors; one stylesheet; H1s; exact method; research boundary; hero SHA-256 {actual}'+('; full pixel decode' if '--decode' in sys.argv else ''))
