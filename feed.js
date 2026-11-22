/* SOBOT feed: fetch the sealed pack, unwrap the data key with a login key, decrypt in memory. No storage. */
(() => {
  'use strict';
  const CFG = window.SOBOT_CFG || {};
  const FILE = CFG.file || 'v';
  const ITER = 600000;
  const WRAP_AAD = (id) => new TextEncoder().encode('SBK1' + id);
  const FEED_AAD = new TextEncoder().encode('SBF1');
  let dataKey = null, kid = null, etag = null, lastPack = null;
  const PACK_CACHE = 'sobot-sealed-pack';
  function cachePack(pack) { try { if (pack && pack.blob) localStorage.setItem(PACK_CACHE, JSON.stringify({ t: Date.now(), pack })); } catch (e) {} }
  function cachedPack() { try { const o = JSON.parse(localStorage.getItem(PACK_CACHE) || 'null'); if (o && o.pack && o.pack.blob) return o.pack; } catch (e) {} return null; }

  const b64u = (s) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4);
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  async function fetchPack() {
    if (CFG.blobUrl) {
      const r = await fetch(CFG.blobUrl + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('feed ' + r.status);
      lastPack = await r.json(); cachePack(lastPack); return { pack: lastPack, changed: true };
    }
    const h = { Accept: 'application/vnd.github+json' };
    if (etag) h['If-None-Match'] = etag;
    let r;
    try { r = await fetch('https://api.github.com/gists/' + CFG.gist, { headers: h, cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit' }); }
    catch (e) { r = null; }
    if (r && r.status === 304 && lastPack) return { pack: lastPack, changed: false };
    if (r && r.ok) {
      etag = r.headers.get('ETag');
      const j = await r.json(); const f = j.files && j.files[FILE];
      if (!f) throw new Error('feed empty');
      let c = f.content;
      if (f.truncated) c = await (await fetch(f.raw_url, { cache: 'no-store', credentials: 'omit' })).text();
      lastPack = JSON.parse(c); cachePack(lastPack); return { pack: lastPack, changed: true };
    }
    const raw = await fetch('https://gist.githubusercontent.com/' + CFG.user + '/' + CFG.gist + '/raw/' + FILE + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store', credentials: 'omit' });
    if (!raw.ok) throw new Error('feed unreachable (' + (r ? r.status : 'offline') + ')');
    lastPack = JSON.parse(await raw.text()); cachePack(lastPack); return { pack: lastPack, changed: true };
  }

  async function derive(login, salt, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(login.trim()), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter || ITER }, base,
      { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }

  async function unwrap(login, slot) {
    const k = await derive(login, b64u(slot.salt), slot.iter);
    const iv = b64u(slot.iv), ct = b64u(slot.wrap);
    const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: WRAP_AAD(slot.id) }, k, ct));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  }

  async function open(blob, key) {
    if (!blob || !blob.startsWith('SBF1.')) throw new Error('not a SOBOT feed');
    const b = b64u(blob.slice(5));
    const iv = b.slice(0, 12), ct = b.slice(12);
    const body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: FEED_AAD }, key, ct));
    const n = (body[0] << 24 | body[1] << 16 | body[2] << 8 | body[3]) >>> 0;
    const ds = new Blob([body.subarray(4, 4 + n)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const txt = await new Response(ds).text();
    body.fill(0);
    return JSON.parse(txt);
  }

  const Feed = {
    get unlocked() { return !!dataKey; },
    async unlock(login) {
      const tryPack = async (pack) => {
        if (!pack || pack.app !== 'sobot' || pack.fmt !== 'SBK1') throw new Error('unexpected feed');
        const slots = pack.slots || [];
        if (!slots.length) throw new Error('no login slots');
        let key = null, data = null, err;
        for (const slot of slots) {
          try { key = await unwrap(login, slot); data = await open(pack.blob, key); break; }
          catch (e) { err = e; }
        }
        if (!key || !data) { const e = new Error('wrong key'); e.code = 'BAD'; throw e; }
        return { key, data, kid: pack.kid };
      };
      const cached = cachedPack();
      if (cached) {
        try {
          const got = await tryPack(cached);
          dataKey = got.key; kid = got.kid; lastPack = cached;
          fetchPack().catch(() => {});
          return got.data;
        } catch (e) { /* stale cache or wrong key; fall through to network */ }
      }
      const { pack } = await fetchPack();
      const got = await tryPack(pack);
      dataKey = got.key; kid = got.kid; cachePack(pack); return got.data;
    },
    async refresh() {
      if (!dataKey) throw new Error('locked');
      const { pack, changed } = await fetchPack();
      if (!changed) return null;
      if (pack.kid && kid && pack.kid !== kid) {
        Feed.lock(); const e = new Error('feed was re-keyed'); e.code = 'REKEY'; throw e;
      }
      try { return await open(pack.blob, dataKey); }
      catch (err) { Feed.lock(); const e = new Error('feed was re-keyed'); e.code = 'REKEY'; throw e; }
    },
    lock() { dataKey = null; kid = null; lastPack = null; etag = null; },
  };
  Object.freeze(Feed);
  Object.defineProperty(window, 'Feed', { value: Feed, writable: false, configurable: false });
})();
