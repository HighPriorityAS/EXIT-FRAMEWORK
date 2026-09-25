"""Launch gate: routes, anchors, image integrity, and the active design system."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
EXPECTED = '6d0945b63ed840bc5918113a95add5b81535475baf92e2bd111ca68395fa4a4d'
EXPECTED_MOBILE = '1b5bb9acb4920fb9b5eef57076f9075b4fb89f0ad9272ac826defe678ced48e2'
errors = []
INTERNAL_HTML = {'qa-viewport.html', 'decision-ledger.html', 'mimir-hud.html'}
LAUNCH_LOOP_PAGES = {'chaos-audit.html', 'minimum-viable-day.html', 'daily-mission.html', '30-day-control-sprint.html', 'control-room.html', 'account.html', 'articles/chaos-is-not-random.html'}

CORE_MANIFEST_FILES = (
    'styles.css',
    'portal-hero.css',
    'launch-loop.css',
    'site.js',
    'launch-config.js',
    'launch-metrics.js',
    'conversion.js',
    'chaos-audit.js',
    'minimum-viable-day.js',
    'daily-mission.js',
    '30-day-control-sprint.js',
    'control-room.js',
    'exit-state.js',
    'account.js',
    'CNAME',
    'assets/exit-framework-hero-source.jpg',
    'assets/exit-portal-hero-v22.webp',
    'assets/exit-portal-mobile-clean-v23.svg',
    'assets/exit-portal-approved-desktop-v24.webp',
    'assets/exit-portal-approved-mobile-v24.webp',
    'assets/exit-portal-clean-v26.webp',
    'assets/exit-mark.svg',
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
    allowed_styles={'styles.css','launch-loop.css'}
    if rel=='index.html': allowed_styles.add('portal-hero.css')
    extras=[name for name in style_names if name not in allowed_styles]
    if extras: errors.append(f'{rel}: unexpected stylesheet(s): {", ".join(extras)}')
    if rel=='index.html' and 'portal-hero.css' not in style_names: errors.append('index.html: portal hero stylesheet missing')
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
        if 'alt' not in im or not all(im.get(a) for a in ('width','height')): errors.append(f'{rel}: image lacks alt/dimensions')
    if rel!='index.html' and 'Research participation is not sold.' not in path.read_text(encoding='utf-8'): errors.append(f'{rel}: research boundary missing')

image=ROOT/'assets/exit-portal-approved-desktop-v24.webp'
actual=hashlib.sha256(image.read_bytes()).hexdigest()
mobile_image=ROOT/'assets/exit-portal-approved-mobile-v24.webp'
mobile_actual=hashlib.sha256(mobile_image.read_bytes()).hexdigest()
if actual!=EXPECTED: errors.append('Desktop hero source SHA-256 changed')
if mobile_actual!=EXPECTED_MOBILE: errors.append('Mobile hero source SHA-256 changed')
if '--decode' in sys.argv:
    from PIL import Image
    with Image.open(image) as im:
        im.load()
        if im.size!=(1920,1080) or im.format!='WEBP': errors.append('Incorrect desktop hero dimensions/format')
    with Image.open(mobile_image) as im:
        im.load()
        if im.size!=(768,806) or im.format!='WEBP': errors.append('Incorrect mobile hero dimensions/format')

# Historical clean artwork remains in the repository for provenance, but the v28
# homepage no longer flattens the hero into one image.
clean_image=ROOT/'assets/exit-portal-clean-v26.webp'
if hashlib.sha256(clean_image.read_bytes()).hexdigest()!='eb36596042d2ffcf2c4251ce8d2e5927c7e68770b3155832f57d7529dd8cf3cd': errors.append('Clean hero SHA-256 changed')
if '--decode' in sys.argv:
    with Image.open(clean_image) as im:
        im.load()
        if im.size!=(1672,941) or im.format!='WEBP': errors.append('Incorrect clean hero dimensions/format')

# The full eight-step method lives inside the operating-loop section on framework.html.
text=(ROOT/'framework.html').read_text(encoding='utf-8')
import re
loop_start=text.find('id="operating-loop"')
loop_end=text.find('</section>', loop_start)
loop_text=text[loop_start:loop_end] if loop_start!=-1 and loop_end!=-1 else ''
pattern=r'\d\d / (Stabilize|Observe|Separate|Choose|Execute|Measure|Document|Adjust)'
if re.findall(pattern,loop_text)!=['Stabilize','Observe','Separate','Choose','Execute','Measure','Document','Adjust']:
    errors.append('framework.html: method order changed')

# Homepage v28 is a deliberate single-screen operating field:
# live navigation + evidence field + continuous control axis + two entry paths.
text=(ROOT/'index.html').read_text(encoding='utf-8')
for required in (
    '<section class="portal-hero"',
    '<h1 class="portal-hero-title" id="hero-title">',
    'Strategic control,',
    'human freedom.',
    'Run the Chaos Audit',
    'Explore the Framework',
    'CHAOS',
    'CONVICTION',
    'CONTROL',
    'portal-hero.css?v=28',
    '<img class="portal-scene-art"',
    'assets/exit-portal-clean-v26.webp',
    'aria-label="Primary navigation"',
):
    if required not in text: errors.append(f'Homepage missing {required}')
for forbidden in (
    '<img class="portal-hero-art"',
    'class="portal-subject"',
    'class="launch-section"',
    '<footer class="site-footer"',
):
    if forbidden in text: errors.append(f'Portal homepage contains flattened/below-fold content: {forbidden}')

portal_css=(ROOT/'portal-hero.css').read_text(encoding='utf-8')
for required in (
    '.home{',
    'overflow:hidden',
    'height:100svh',
    '--seam-x:',
    '.portal-control-axis',
    '.portal-evidence-field',
    '.portal-principles',
):
    if required not in portal_css: errors.append(f'Portal v28 contract missing: {required}')

css=(ROOT/'styles.css').read_text(encoding='utf-8')
js=(ROOT/'site.js').read_text(encoding='utf-8')
if '!important' in css or 'background-image' in css or 'data:image' in css: errors.append('Competing style/hero logic found')
if 'fetch(' in js: errors.append('Unexpected network integration logic in site.js')
if (ROOT/'CNAME').read_text().strip()!='chaosexit.com': errors.append('Domain mismatch')

if '--release' in sys.argv:
    report=json.loads((ROOT/'qa-results.json').read_text())
    if report.get('result')!='passed' or report.get('widths')!=[390,430,768,1440]: errors.append('Mandatory browser QA has not passed')
    if report.get('image_sha256')!=EXPECTED: errors.append('Browser QA references different desktop artwork')
    if report.get('mobile_image_sha256')!=EXPECTED_MOBILE: errors.append('Browser QA references different mobile artwork')
    if report.get('site_sha256')!=site_digest():
        expected=report.get('site_manifest',{})
        actual_manifest=site_manifest()
        changed=[name for name in sorted(set(expected)|set(actual_manifest)) if expected.get(name)!=actual_manifest.get(name)]
        errors.append('Site changed after browser QA: '+', '.join(changed))
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(pages)} public pages; local routes and anchors; active design system; H1s; exact framework method; research boundary; preserved historical hero assets'+('; full pixel decode' if '--decode' in sys.argv else ''))
