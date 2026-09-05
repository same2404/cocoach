// Copyright (c) 2026 CoCoach. All rights reserved. Copying or duplication is prohibited.
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(root, 'flyer');
mkdirSync(outDir, { recursive: true });

const htmlUrl = pathToFileURL(resolve(root, 'scripts', 'qr-flyer.html')).href;

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1240, height: 1748, deviceScaleFactor: 2 });
await page.goto(htmlUrl, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 400));

await page.pdf({
  path: resolve(outDir, 'qr-flyer.pdf'),
  width: '105mm',
  height: '148mm',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

await page.evaluate(() => document.fonts.ready);
const png = resolve(outDir, 'qr-flyer.png');
await page.screenshot({ path: png, type: 'png' });

await browser.close();
console.log('Flyer erstellt:');
console.log('  PDF:', resolve(outDir, 'qr-flyer.pdf'));
console.log('  PNG:', png);