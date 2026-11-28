(() => {
  const $ = id => document.getElementById(id), MAGIE = 'RNG1';
  const merk = { lies: () => { try { return localStorage.getItem('r.k'); } catch { return null; } }, setz: v => { try { localStorage.setItem('r.k', v); } catch {} }, weg: () => { try { localStorage.removeItem('r.k'); } catch {} } };
  const norm = t => t.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const ausHash = () => { const m = location.hash.match(/^#k=([0-9A-Za-z-]{20,60})$/); return m ? norm(m[1]) : null; };
  const alsApp = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let schluessel = null;

  async function ableiten(code) {
    const roh = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ring|' + code));
    return crypto.subtle.importKey('raw', roh, 'AES-GCM', false, ['decrypt']);
  }
  // direkt: am Zwischenspeicher der Webseite vorbei, damit ein neuer Stand sofort da ist
  async function direkt(datei) {
    if (!/\.github\.io$/.test(location.hostname)) return null;
    try {
      const r = await fetch('https://api.github.com/repos/' + location.hostname.split('.')[0] + '/' + location.pathname.split('/')[1] + '/contents/' + datei + '?t=' + Date.now(),
        { cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/vnd.github.raw' }, signal: AbortSignal.timeout(7000) });
      if (!r.ok) return null;
      const b = new Uint8Array(await r.arrayBuffer());
      caches.open('r1').then(c => c.put(new URL(datei, location.origin + location.pathname).href, new Response(b))).catch(() => {});
      return b;
    } catch { return null; }
  }
  async function oeffne(datei, sofort) {
    let b = sofort ? await direkt(datei) : null, r = null;
    if (!b) {
      r = await fetch(datei, { cache: 'no-store' });
      if (!r.ok) throw new Error('nicht gefunden');
      b = new Uint8Array(await r.arrayBuffer());
    }
    if (new TextDecoder().decode(b.subarray(0, 4)) !== MAGIE) throw new Error('beschädigt');
    let klar;
    try { klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(4, 16) }, schluessel, b.subarray(16)); }
    catch { throw Object.assign(new Error('Der Code passt nicht.'), { code: true }); }
    const strom = new Response(new Blob([klar]).stream().pipeThrough(new DecompressionStream('gzip')));
    return { daten: JSON.parse(await strom.text()), offline: !!r && r.headers.get('x-aus-speicher') === '1' };
  }

  function seite(...teile) {
    const s = $('s'); s.replaceChildren();
    const img = document.createElement('img'); img.src = 'i.png'; img.alt = ''; s.append(img);
    for (const t of teile) { const d = document.createElement('div'); d.style.display = 'contents'; d.innerHTML = t; s.append(d); }
  }
  function frageCode(text) {
    seite('<h1>Code eingeben</h1>', '<input id="code" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Code" placeholder="XXXX-XXXX-XXXX …">', '<button id="los">Öffnen</button>', '<p class="fehler" id="f"></p>');
    if (text) $('f').textContent = text;
    const los = () => { const c = norm($('code').value); if (c.length < 20) { $('f').textContent = 'Der Code ist zu kurz.'; return; } starte(c); };
    $('los').onclick = los;
    $('code').onkeydown = e => { if (e.key === 'Enter') los(); };
  }
  function zeigeAnleitung(code) {
    seite('<h1>Auf den Home-Bildschirm legen</h1>',
      '<ol><li>Tippe auf das <b>Seitenmenü</b> mit den Strichen links neben der Adresse, dann auf <b>Teilen</b> <svg class="teilen" viewBox="0 0 18 18"><path d="M9 11.5V2M5.8 5 9 1.8 12.2 5M4.5 7.5H3.2v8.3h11.6V7.5h-1.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>. Bei älterem iOS ist Teilen direkt unten.</li><li>Wähle <b>Zum Home-Bildschirm</b>, wenn nötig vorher <b>Mehr anzeigen</b>.</li><li>Gib einen Namen ein, der dir gefällt, und tippe auf <b>Hinzufügen</b>.</li></ol>',
      '<p>Lass diese Seite dafür offen, der Schlüssel steckt im Link.</p>', '<button class="leise" id="hier">Erst mal hier öffnen</button>');
    $('hier').onclick = () => starte(code);
  }
  async function starte(code) {
    try {
      schluessel = await ableiten(code);
      const [a, b] = await Promise.all([oeffne('a.bin'), oeffne('b.bin')]);
      merk.setz(code);
      window.__p = { a: a.daten, b: b.daten, offline: b.offline, oeffne };
      if (/^#k=/.test(location.hash)) history.replaceState(null, '', location.pathname);
      const css = document.createElement('style'); css.textContent = a.daten.css;
      $('s0').remove(); document.head.append(css);
      document.body.innerHTML = a.daten.html;
      const js = document.createElement('script'); js.textContent = a.daten.js; document.body.append(js);
    } catch (e) {
      if (e.code) { merk.weg(); return frageCode('Der Code passt nicht.'); }
      seite('<p class="fehler" id="f"></p>', '<button id="neu">Noch einmal versuchen</button>');
      $('f').textContent = !window.isSecureContext ? 'Diese Seite braucht eine sichere Verbindung.' : 'Gerade keine Verbindung. (' + e.message + ')';
      $('neu').onclick = () => starte(code);
    }
  }
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
  const neu = ausHash(), code = neu || merk.lies();
  if (!code) frageCode();
  else if (neu && !alsApp() && /iPhone|iPad|iPod/.test(navigator.userAgent)) zeigeAnleitung(neu);
  else starte(code);
})();
