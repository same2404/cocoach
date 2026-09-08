// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


// Vercel-Serverless-Einstiegspunkt: exportiert die gesamte Express-App aus server.ts als Handler.
// Lazy-Import + Try/Catch, damit Startfehler als JSON sichtbar werden statt generischem 500.
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../server').then((m) => m.default);
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Server-Initialisierung fehlgeschlagen',
        detail: String(err?.message || err),
        stack: String(err?.stack || '').split('\n').slice(0, 8).join(' | '),
      })
    );
  }
}