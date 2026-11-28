const SPEICHER = 'r1', VORRAT = ['./', 's.js', 'i.png', 'a.bin', 'b.bin'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(SPEICHER).then(c => Promise.allSettled(VORRAT.map(v => c.add(new Request(v, { cache: 'no-store' })))))); });
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== SPEICHER) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const schluessel = u.pathname.endsWith('/') || u.pathname.endsWith('index.html') ? new URL('./', self.registration.scope).href : u.origin + u.pathname;
  e.respondWith((async () => {
    const c = await caches.open(SPEICHER);
    const netz = fetch(e.request).then(r => { if (r.ok) c.put(schluessel, r.clone()); return r; });
    try { return await Promise.race([netz, new Promise((_, n) => setTimeout(() => n(new Error('langsam')), 6000))]); }
    catch {
      const alt = await c.match(schluessel);
      if (!alt) return netz;
      const h = new Headers(alt.headers); h.set('x-aus-speicher', '1');
      return new Response(await alt.arrayBuffer(), { status: 200, headers: h });
    }
  })());
});
