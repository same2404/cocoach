// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


// Vercel-Serverless-Einstiegspunkt.
// Bindet das von `npm run build` erzeugte `dist/server.cjs` ein (deterministisches,
// zuvor getestetes Bundle) statt server.ts direkt – der Vercel-Funktions-Bundler
// löst diesen relativen Pfad auf und legt das Bundle ins Lambda.
let app: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      // @ts-ignore – dist/server.cjs wird vor dem Funktions-Build erzeugt
      const ns: any = await import('../dist/server.cjs');
      const m = ns?.default;
      app = (m && m.default) ?? m;
    }
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