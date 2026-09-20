const { chromium } = require('C:/Users/JSC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = process.env.CLS_AUDIT_OUTPUT || path.join(root, 'tests', 'cls-audit-results.json');
const excluded = new Set(['electricity-simulator', 'date-calculator', 'unit-converter', 'geun-gwan-don', 'money-converter', 'unix-timestamp', 'url-parser', 'privacy-mask', 'hanja-number-converter', 'number-baseball']);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function toolNames() {
  return fs.readdirSync(path.join(root, 'tools'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'tools', entry.name, 'index.html')))
    .map(entry => entry.name).sort();
}

function startServer() {
  const types = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
  const server = http.createServer((request, response) => {
    const raw = decodeURIComponent((request.url || '/').split('?')[0]);
    const relative = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
    const candidate = path.resolve(root, relative);
    if (!candidate.startsWith(root)) { response.writeHead(403); response.end(); return; }
    const target = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory() ? path.join(candidate, 'index.html') : candidate;
    fs.readFile(target, (error, content) => {
      if (error) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function installObserver() {
  const simpleNode = node => node ? node.tagName + (node.id ? `#${node.id}` : '') + (typeof node.className === 'string' && node.className ? `.${node.className.replace(/\s+/g, '.')}` : '') : null;
  window.__clsAudit = { shifts: [], paints: [] };
  new PerformanceObserver(list => list.getEntries().forEach(entry => window.__clsAudit.shifts.push({
    time: Math.round(entry.startTime * 10) / 10,
    value: entry.value,
    recentInput: entry.hadRecentInput,
    sources: entry.sources.map(source => ({ node: simpleNode(source.node), previous: source.previousRect.toJSON(), current: source.currentRect.toJSON() }))
  }))).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => list.getEntries().forEach(entry => window.__clsAudit.paints.push({ name: entry.name, time: Math.round(entry.startTime * 10) / 10 }))).observe({ type: 'paint', buffered: true });
}

async function inspect(browser, baseUrl, tool, scenario) {
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Chrome-Lighthouse', locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10240 * 1024 / 8, uploadThroughput: 10240 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.addInitScript(installObserver);
  await page.route('**/*', async route => {
    const url = route.request().url();
    const isGlobal = /\/style\.css(?:\?|$)/.test(url);
    const isHome = /\/home\.css(?:\?|$)/.test(url);
    const isPage = new RegExp(`/tools/${tool}/[^/]+\\.css(?:\\?|$)`).test(url) && !/\.bundle\.css/.test(url);
    const isBundle = new RegExp(`/tools/${tool}/[^/]+\\.bundle\\.css(?:\\?|$)`).test(url);
    if ((scenario === 'global-300' && isGlobal) || (scenario === 'home-300' && isHome) || (scenario === 'page-300' && isPage) || (scenario === 'bundle-300' && isBundle)) await delay(300);
    return route.continue();
  });
  const start = Date.now();
  try {
    await page.goto(`${baseUrl}/tools/${tool}/`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource').filter(entry => entry.name.includes('.css')).map(entry => ({ name: new URL(entry.name).pathname, start: Math.round(entry.startTime * 10) / 10, end: Math.round((entry.startTime + entry.duration) * 10) / 10 }));
      const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => new URL(link.href).pathname);
      return { audit: window.__clsAudit, resources, sheets };
    });
    const shifts = data.audit.shifts.filter(shift => !shift.recentInput);
    const largest = shifts.reduce((max, shift) => shift.value > (max?.value || 0) ? shift : max, null);
    return { tool, scenario, elapsedMs: Date.now() - start, cls: +shifts.reduce((sum, shift) => sum + shift.value, 0).toFixed(4), largest: largest && { ...largest, value: +largest.value.toFixed(4) }, fcp: data.audit.paints.find(paint => paint.name === 'first-contentful-paint')?.time ?? null, css: data.resources, sheets: data.sheets };
  } catch (error) {
    return { tool, scenario, error: error.message, elapsedMs: Date.now() - start };
  } finally { await context.close(); }
}

(async () => {
  const all = toolNames(); const targets = all.filter(tool => !excluded.has(tool));
  const start = Number(process.argv[2] || 0); const count = Number(process.argv[3] || targets.length); const selected = targets.slice(start, start + count);
  const origin = process.env.CLS_AUDIT_ORIGIN;
  const server = origin ? null : await startServer(); const baseUrl = origin || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--disable-extensions', '--disable-background-networking', '--no-first-run'] });
  const results = [];
  for (const tool of selected) {
    const html = fs.readFileSync(path.join(root, 'tools', tool, 'index.html'), 'utf8');
    const scenarios = html.includes('.bundle.css') ? ['normal', 'bundle-300'] : ['normal', 'global-300', 'home-300', 'page-300'];
    for (const scenario of scenarios) results.push(await inspect(browser, baseUrl, tool, scenario));
  }
  await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  const existingDocument = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : null;
  const existing = existingDocument ? (existingDocument.results || []).filter(row => !selected.includes(row.tool)) : [];
  fs.writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), totalTools: all.length, excluded: [...excluded], targets, results: [...existing, ...results] }, null, 2));
  console.log(JSON.stringify(results.map(row => ({ tool: row.tool, scenario: row.scenario, cls: row.cls, largest: row.largest?.value ?? null, sources: row.largest?.sources?.map(source => source.node).filter(Boolean).slice(0, 3) ?? [], error: row.error ?? null })), null, 2));
})().catch(error => { console.error(error); process.exit(1); });
