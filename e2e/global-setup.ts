// Next dev compiles each route on first request. Hitting a route mid-compile
// and then interacting with it triggers a Fast-Refresh remount partway
// through the test, which silently wipes out anything already typed into
// controlled inputs (observed on /login: fields reverted to their default
// useState values right before submit). Pre-warming every route once here —
// before any test navigates for real — means every in-test navigation hits
// an already-compiled route and is fast + stable.
const ROUTES = [
  '/login',
  '/dashboard',
  '/map',
  '/entity/ent-001',
  '/surveillance',
  '/command',
];

async function warm(base: string, path: string) {
  const url = `${base}${path}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      await res.text();
      return;
    } catch {
      // Route may still be mid-compile or the dev server mid-boot; retry.
    }
  }
}

export default async function globalSetup() {
  const base = 'http://localhost:3001';
  for (const route of ROUTES) {
    await warm(base, route);
  }
}
