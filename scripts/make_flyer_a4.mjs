// Copyright (c) 2026 CoCoach. All rights reserved. Copying or duplication is prohibited.
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(root, 'flyer');
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 2480, height: 3508, deviceScaleFactor: 2 });
await page.emulateMediaType('screen');
await page.goto(pathToFileURL(resolve(root, 'scripts', 'qr-flyer-a4.html')).href, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 400));

await page.pdf({
  path: resolve(outDir, 'qr-flyer-a4.pdf'),
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

const png = resolve(outDir, 'qr-flyer-a4.png');
await page.screenshot({ path: png, type: 'png' });

await browser.close();
console.log('A4-Bogen erstellt:');
console.log('  PDF:', resolve(outDir, 'qr-flyer-a4.pdf'));
console.log('  PNG:', png);