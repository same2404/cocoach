// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import path from 'path';

const APP_URL = 'https://fc-auggen-manager-26-27-kappa.vercel.app';
const PASSWORD = 'Naomi29082017!!';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SHOTS = [
  { name: '01_dashboard', tab: 'dashboard' },
  { name: '02_taktiktafel', tab: 'profi_3d_taktiktafel' },
  { name: '03_training', tab: 'training_planning' },
  { name: '04_kader', tab: 'personnel' },
  { name: '05_budget', tab: 'budget_finance' },
  { name: '06_tracker', tab: 'player_portal' },
  { name: '07_analyse', tab: 'match_analysis_pro' },
];

mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1.5 },
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=1920,1080'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  console.log('1. App oeffnen...');
  await page.goto(`${APP_URL}/?tab=dashboard`, { waitUntil: 'networkidle2', timeout: 90000 });

  // Passwort-Gate loesen
  const pwInput = await page.$('input[placeholder="Passwort"]');
  if (pwInput) {
    console.log('2. Passwort eingeben...');
    await pwInput.type(PASSWORD, { delay: 40 });
    await page.click('button[type="submit"]');
    console.log('3. Eingeloggt, App laedt...');
  } else {
    console.log('Kein Passwort-Gate → direkt in der App.');
  }

  await sleep(9000);
  console.log('4. App bereit. Starte Screenshots...');

  for (const shot of SHOTS) {
    console.log(`   → ${shot.name} (tab=${shot.tab})`);
    try {
      await page.goto(`${APP_URL}/?tab=${shot.tab}`, { waitUntil: 'networkidle2', timeout: 90000 });
    } catch {
      console.log('      (networkidle2 timeout – Screenshot trotzdem)');
    }
    await sleep(9500);
    const out = path.join('shots', `${shot.name}.png`);
    await page.screenshot({ path: out });
    console.log(`      gespeichert`);
  }

  console.log('FERTIG. Alle Screenshots in /shots');
} catch (e) {
  console.error('FEHLER:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}