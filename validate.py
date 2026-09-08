"""Launch gate: routes, anchors, image integrity, and the active design system."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
EXPECTED = 'aca2b26064cc3880e8722fe2d45ea877a62a1741906b573b658b7c3325def853'
errors = []
INTERNAL_HTML = {'qa-viewport.html'}
LAUNCH_LOOP_PAGES = {'chaos-audit.html', 'minimum-viable-day.html', 'articles/chaos-is-not-random.html'}

CORE_MANIFEST_FILES = (
    'styles.css',
    'launch-loop.css',
    'site.js',
    'launch-config.js',
    'launch-metrics.js',
    'chaos-audit.js',
    'minimum-viable-day.js',
    'CNAME',
    'assets/exit-framework-hero-source.jpg',
    'assets/ibm-plex-mono-regular.ttf',
)


def public_html_paths():
    paths = list(ROOT.glob('*.html')) + list((ROOT / 'articles').glob('*.html'))
    return [p for p in paths if p.name not in INTERNAL_HTML]


def site_manifest():
    paths = public_html_paths()
    paths += [ROOT / p for p in CORE_MANIFEST_FILES]
    manifest = {}
    for path in paths:
        data = (
            path.read_text(encoding='utf-8').encode('utf-8')
            if path.suffix in ('.html', '.css', '.js') or path.name == 'CNAME'
            else path.read_bytes()
        )
        manifest[path.relative_to(ROOT).as_posix()] = hashlib.sha256(data).hexdigest()
    return manifest


def site_digest():
    return hashlib.sha256(json.dumps(site_manifest(), sort_keys=True, separators=(',', ':')).encode()).hexdigest()


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


pages={p.resolve():Page(p) for p in public_html_paths()}
for path,page in pages.items():
    rel=path.relative_to(ROOT).as_posix()
    if page.h1!=1: errors.append(f'{rel}: expected one H1')
    style_names=[Path(urlsplit(href).path).name for href in page.styles]
    if 'styles.css' not in style_names: errors.append(f'{rel}: shared stylesheet missing')
    extras=[name for name in style_names if name not in ('styles.css','launch-loop.css')]
    if extras: errors.append(f'{rel}: unexpected stylesheet(s): {", ".join(extras)}')
    uses_launch_loop=rel in LAUNCH_LOOP_PAGES
    if uses_launch_loop and 'launch-loop.css' not in style_names: errors.append(f'{rel}: launch-loop stylesheet missing')
    if not uses_launch_loop and 'launch-loop.css' in style_names: errors.append(f'{rel}: launch-loop stylesheet loaded outside launch flow')
    for raw in page.refs:
        u=urlsplit(raw)
        if u.scheme or u.netloc: continue
        target=(ROOT/u.path.lstrip('/') if u.path.startswith('/') else path.parent/unquote(u.path)).resolve() if u.path else path
        if target.is_dir(): target=target/'index.html'
        if not target.is_relative_to(ROOT) or not target.exists(): errors.append(f'{rel}: missing/outside link {raw}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids: errors.append(f'{rel}: missing anchor {raw}')
    for im in page.images:
        if not all(im.get(a) for a in ('alt','width','height')): errors.append(f'{rel}: image lacks alt/dimensions')
    if 'Research participation is not sold.' not in path.read_text(encoding='utf-8'): errors.append(f'{rel}: research boundary missing')

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
    if report.get('site_sha256')!=site_digest():
        expected=report.get('site_manifest',{})
        actual_manifest=site_manifest()
        changed=[name for name in sorted(set(expected)|set(actual_manifest)) if expected.get(name)!=actual_manifest.get(name)]
        errors.append('Site changed after browser QA: '+', '.join(changed))
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(pages)} public pages; local routes and anchors; approved stylesheets; H1s; exact method; research boundary; hero SHA-256 {actual}'+('; full pixel decode' if '--decode' in sys.argv else ''))
