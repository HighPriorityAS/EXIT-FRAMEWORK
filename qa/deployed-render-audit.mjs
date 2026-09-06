import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL || 'https://chaosexit.com';
const OUT = 'qa-artifacts';
const routes = ['/', '/founders.html', '/membership.html', '/has.html', '/faq.html', '/privacy.html'];
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const [viewportName, viewport] of Object.entries(viewports)) {
  for (const route of routes) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(String(err)));
    page.on('requestfailed', req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || 'failed' }));

    const url = new URL(route, BASE).href;
    let status = null;
    let navigationError = null;
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      status = response?.status() ?? null;
      await page.waitForTimeout(600);
    } catch (error) {
      navigationError = String(error);
    }

    const data = navigationError ? null : await page.evaluate(() => {
      const visible = el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      const normalize = value => (value || '').trim().replace(/\s+/g, ' ');
      const classifyHref = href => {
        const h = href.toLowerCase();
        if (/stripe|checkout|payment|buy\.stripe/.test(h)) return 'payment';
        if (/instagram\.com|youtube\.com|youtu\.be|tiktok\.com|linkedin\.com|x\.com|twitter\.com|facebook\.com/.test(h)) return 'social';
        return 'other';
      };
      const visibleLinks = [...document.querySelectorAll('a')].filter(visible).map(a => ({
        text: normalize(a.innerText || a.textContent).slice(0, 180),
        href: a.href,
        className: String(a.className || ''),
        ariaDisabled: a.getAttribute('aria-disabled'),
        kind: classifyHref(a.href || ''),
      }));
      const visibleButtons = [...document.querySelectorAll('button')].filter(visible).map(b => ({
        text: normalize(b.innerText || b.textContent).slice(0, 180),
        disabled: b.disabled,
        ariaDisabled: b.getAttribute('aria-disabled'),
        className: String(b.className || ''),
      }));
      const images = [...document.images].map(img => ({
        src: img.currentSrc || img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      const forms = [...document.forms].map(f => ({ action: f.action, method: f.method, text: normalize(f.innerText).slice(0, 180) }));
      const html = document.documentElement;
      const body = document.body;
      const sectionBackgrounds = [...document.querySelectorAll('header, main, section, footer')]
        .filter(visible)
        .map(el => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return { tag: el.tagName, id: el.id, className: String(el.className || ''), y: Math.round(rect.top + scrollY), backgroundColor: style.backgroundColor, color: style.color };
        });
      return {
        title: document.title,
        h1: [...document.querySelectorAll('h1')].filter(visible).map(h => normalize(h.innerText)),
        width: { innerWidth, htmlClientWidth: html.clientWidth, htmlScrollWidth: html.scrollWidth, bodyScrollWidth: body.scrollWidth },
        horizontalOverflowPx: Math.max(html.scrollWidth, body.scrollWidth) - innerWidth,
        visibleLinks,
        visibleButtons,
        images,
        forms,
        sectionBackgrounds,
        mainText: normalize(document.querySelector('main')?.innerText || body.innerText).slice(0, 14000),
      };
    });

    const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\.html$/, '');
    const screenshot = path.join(OUT, `${viewportName}-${slug}.png`);
    if (!navigationError) await page.screenshot({ path: screenshot, fullPage: true });

    const defects = [];
    if (navigationError) defects.push(`navigation: ${navigationError}`);
    if (status !== null && status >= 400) defects.push(`HTTP ${status}`);
    if (data?.horizontalOverflowPx > 1) defects.push(`horizontal overflow ${data.horizontalOverflowPx}px`);
    const brokenImages = data?.images.filter(i => !i.complete || i.naturalWidth === 0) || [];
    if (brokenImages.length) defects.push(`broken images: ${brokenImages.map(i => i.src).join(', ')}`);
    if (pageErrors.length) defects.push(`page errors: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length) defects.push(`console errors: ${consoleErrors.join(' | ')}`);
    if (failedRequests.length) defects.push(`failed requests: ${failedRequests.map(r => `${r.url} (${r.error})`).join(', ')}`);

    const paymentLinks = data?.visibleLinks.filter(l => l.kind === 'payment') || [];
    const socialLinks = data?.visibleLinks.filter(l => l.kind === 'social') || [];
    const externalForms = data?.forms.filter(f => f.action && !f.action.startsWith(locationOrigin(BASE))) || [];

    results.push({ viewportName, viewport, route, url, status, navigationError, defects, paymentLinks, socialLinks, externalForms, data, screenshot });
    console.log(JSON.stringify({ viewportName, route, status, defects, paymentLinks: paymentLinks.length, socialLinks: socialLinks.length, h1: data?.h1 || [], overflow: data?.horizontalOverflowPx ?? null }));
    await context.close();
  }
}

await browser.close();
await fs.writeFile(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 2));

const summary = results.map(r => ({
  viewport: r.viewportName,
  route: r.route,
  status: r.status,
  defects: r.defects,
  paymentLinks: r.paymentLinks.length,
  socialLinks: r.socialLinks.length,
  h1: r.data?.h1 || [],
  overflow: r.data?.horizontalOverflowPx ?? null,
}));
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

if (results.some(r => r.navigationError || (r.status !== null && r.status >= 400))) process.exitCode = 1;

function locationOrigin(base) {
  try { return new URL(base).origin; } catch { return base; }
}
