import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const label = process.env.QA_LABEL || 'audit';
const out = 'qa-artifacts';
const viewports = [
  { width: 375, height: 780 },
  { width: 390, height: 780 },
  { width: 430, height: 800 },
  { width: 600, height: 900 },
  { width: 767, height: 1024 },
  { width: 768, height: 1024 },
  { width: 769, height: 1024 },
  { width: 1440, height: 900 },
];

await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(String(error)));

  const response = await page.goto(new URL('/', base).href, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(400);
  const metrics = await page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, position: style.position, display: style.display };
    };
    const image = document.querySelector('.hero-art img');
    const html = document.documentElement;
    return {
      innerWidth,
      clientWidth: html.clientWidth,
      scrollWidth: html.scrollWidth,
      overflow: html.scrollWidth - html.clientWidth,
      header: rect('.home .header-row'),
      art: rect('.hero-art'),
      image: { ...rect('.hero-art img'), src: image?.getAttribute('src'), naturalWidth: image?.naturalWidth, naturalHeight: image?.naturalHeight },
      copy: rect('.hero-copy'),
      heading: rect('.hero-copy h1'),
      subtitle: rect('.hero-subtitle'),
      support: rect('.hero-support'),
      primary: rect('.hero-primary'),
      secondary: rect('.hero-secondary'),
      menuToggle: rect('.menu-toggle'),
      menuHidden: document.querySelector('#mobile-menu')?.hidden,
    };
  });

  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  const openState = await page.evaluate(() => ({
    expanded: document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),
    hidden: document.querySelector('#mobile-menu')?.hidden,
  }));
  await page.keyboard.press('Tab');
  const focusedAfterTab = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press('Escape');
  const escapeState = await page.evaluate(() => ({
    expanded: document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),
    hidden: document.querySelector('#mobile-menu')?.hidden,
    focusRestored: document.activeElement === document.querySelector('.menu-toggle'),
  }));

  const screenshot = `${out}/${label}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: screenshot, fullPage: false });
  const result = { viewport, status: response?.status(), metrics, openState, focusedAfterTab, escapeState, consoleErrors, pageErrors, screenshot };
  results.push(result);
  console.log(JSON.stringify(result));
  await context.close();
}

await browser.close();
await fs.writeFile(`${out}/${label}-results.json`, JSON.stringify(results, null, 2));

const failed = results.some(result => result.status !== 200 || result.metrics.overflow !== 0 || result.consoleErrors.length || result.pageErrors.length || result.openState.expanded !== 'true' || result.openState.hidden || result.escapeState.expanded !== 'false' || !result.escapeState.hidden || !result.escapeState.focusRestored);
if (failed) process.exitCode = 1;
