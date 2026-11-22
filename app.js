/* SOBOT · live terminal. Public markets, sports, sentiment and World Monitor. Sealed; login key required. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TCFG = window.SOBOT_CFG || {}; const IDLE_MS = TCFG.idleMsTest || 10 * 60 * 1000, POLL_MS = TCFG.pollMsTest || 75 * 1000;
  let D = null, section = 'home', pollT = null, unsub = null, lastAct = Date.now();
  const sub = { pulse: 'overview', world: 'intel', sports: 'home', tools: 'desk', play: 'games', fno: 'NIFTY', mov: 'NIFTY', std: 'nba', feed: 'all', news: 'all', wnews: 'all' };
  const prevScore = {};
  const NATIVE = window.SobotNative || null;
  const H = (k = 'light') => { try { if (NATIVE && NATIVE.haptic) return NATIVE.haptic(k); if (navigator.vibrate) navigator.vibrate({ light: 6, medium: 12, heavy: 22, success: [8, 30, 10], error: [24, 40, 24] }[k] || 6); } catch (e) {} };
  const UP = '#5fb98e', DN = '#d9706b', GOLD = '#cdb27c', MU = '#7d7d87';

  /* ── format ── */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (n) => n != null && n !== '' && !isNaN(n) && isFinite(n);
  const nf = (n, d = 0) => !ok(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const nu = (n, d = 2) => !ok(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const inr = (n, d = 0) => !ok(n) ? '—' : (n < 0 ? '−' : '') + '₹' + nf(Math.abs(n), d);
  const inrS = (n) => { if (!ok(n)) return '—'; const a = Math.abs(n), s = n < 0 ? '−' : ''; return s + '₹' + (a >= 1e7 ? (a / 1e7).toFixed(2) + 'Cr' : a >= 1e5 ? (a / 1e5).toFixed(2) + 'L' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : a.toFixed(0)); };
  const sInr = (n) => !ok(n) ? '—' : Math.abs(n) < 0.5 ? '₹0' : (n > 0 ? '+' : '') + inr(n);
  const sInrS = (n) => !ok(n) ? '—' : Math.abs(n) < 0.5 ? '₹0' : (n > 0 ? '+' : '') + inrS(n);
  const usd = (n) => { if (!ok(n)) return '—'; const a = Math.abs(n), s = n < 0 ? '−' : ''; return s + '$' + (a >= 1e12 ? (a / 1e12).toFixed(2) + 'T' : a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : a.toFixed(0)); };
  const pct = (n, d = 2) => !ok(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d) + '%';
  const sg = (n, d = 2) => !ok(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + nf(Math.abs(n), d);
  const cls = (n) => !ok(n) ? 'flat' : n > 1e-9 ? 'up' : n < -1e-9 ? 'dn' : 'flat';
  const px = (n) => !ok(n) ? '—' : n >= 1000 ? nu(n, 2) : n >= 1 ? Number(n).toFixed(2) : Number(n).toPrecision(4);
  const sec = (ts) => ts > 1e11 ? ts / 1000 : ts;
  const ago = (ts) => { if (!ts) return '—'; const s = Math.max(0, Date.now() / 1000 - sec(ts)); return s < 60 ? Math.floor(s) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };
  const ist = (ts, o = { hour: '2-digit', minute: '2-digit', hour12: false }) => ts ? new Date(sec(ts) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...o }) : '—';
  const css = (o) => esc(Object.entries(o).map(([k, v]) => k + ':' + v).join('|'));
  const applyCss = (root) => $$('[data-css]', root).forEach(el => { el.dataset.css.split('|').forEach(p => { const i = p.indexOf(':'); if (i > 0) el.style.setProperty(p.slice(0, i), p.slice(i + 1)); }); el.removeAttribute('data-css'); });
  const ext = (href, inner, c = '') => href ? `<a class="${c}" href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow">${inner}</a>` : `<div class="${c}">${inner}</div>`;
  const empty = (t) => `<div class="empty">${esc(t)}</div>`;
  const head = (t, s = '') => `<div class="h"><h2>${esc(t)}</h2><small>${s}</small></div>`;
  const P = (inner, c = '') => `<div class="p ${c}">${inner}</div>`;
  const src = (t) => `<span class="src">${esc(t)}</span>`;
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); };
  const T = (cols, rows, emptyMsg = 'Nothing here yet') => `<div class="tw"><table class="t"><thead><tr>${cols.map(c => Array.isArray(c) ? `<th class="${c[1]}">${c[0]}</th>` : `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${cols.length}" class="l mu">${esc(emptyMsg)}</td></tr>`}</tbody></table></div>`;
  const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;
  const bar = (frac, c = '') => `<span class="bar ${c}"><i data-css="${css({ width: Math.max(2, Math.min(100, frac * 100)).toFixed(1) + '%' })}"></i></span>`;
  const rng = (lo, hi, v) => (!ok(lo) || !ok(hi) || !ok(v) || hi <= lo) ? '<span class="dim">—</span>' : `<span class="rng"><i data-css="${css({ left: Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)).toFixed(1) + '%' })}"></i></span>`;
  function spark(arr, c) { const a = (arr || []).filter(ok); if (a.length < 2) return '<span class="dim">—</span>'; const lo = Math.min(...a), hi = Math.max(...a), n = a.length - 1;
    const d = a.map((v, i) => (i ? 'L' : 'M') + (i / n * 64).toFixed(1) + ' ' + (16.5 - (v - lo) / ((hi - lo) || 1) * 15).toFixed(1)).join('');
    return `<svg class="spk ${c || (a[n] > a[0] ? 'u' : a[n] < a[0] ? 'd' : 'f')}" viewBox="0 0 64 18" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" d="${d}"/></svg>`; }
  const segHtml = (key, items, small) => `<div class="seg ${small ? 's2' : ''}" data-seg="${key}"><i class="seg-pill"></i>${items.map(([k, t, b]) => `<button data-sub="${k}" class="${sub[key] === k ? 'on' : ''}">${esc(t)}${b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}</div>`;

  /* ── derived ── */
  const XU = () => ({esc, nf, pct, cls, px, P, head, src, spark, T, ext, empty, ago, tag, inrS, sInrS, segHtml, playTab: sub.play});
  const fx = () => (D && D.fx && D.fx.usdinr) || 84.5;
  const W = () => (D && D.world && !D.world.error) ? D.world : null;
  function quote(sym) { const w = W(); if (!w) return null; for (const g of Object.values(w.quotes || {})) for (const q of g) if (q.s === sym) return q; return null; }

  /* ── chart (canvas, hairline) ── */
  function chart(cv, pts, o = {}) {
    if (!cv || !pts || pts.length < 2) { if (cv) cv.parentElement.innerHTML = empty(o.emptyMsg || 'Not enough points yet'); return; }
    const dpr = Math.min(3, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr); const ys = pts.map(p => p[1]); const base = o.base;
    let lo = Math.min(...ys, base ?? Infinity), hi = Math.max(...ys, base ?? -Infinity); if (hi === lo) { hi += Math.abs(hi) * .001 || 1; lo -= Math.abs(lo) * .001 || 1; }
    const pad = (hi - lo) * .14; lo -= pad; hi += pad; const N = pts.length - 1, L = 14, R = 50, TOP = 10, BOT = 16;
    const X = (i) => L + i / N * (w - L - R), Y = (y) => TOP + (1 - (y - lo) / (hi - lo)) * (h - TOP - BOT);
    const col = o.color || (ys[N] >= (base ?? ys[0]) ? UP : DN); const fmt = o.fmt || ((v) => nf(v));
    g.font = '9.5px GeistMono, ui-monospace, monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let k = 0; k <= 3; k++) { const v = lo + pad + (hi - lo - 2 * pad) * k / 3, y = Y(v); g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Math.round(y) + .5); g.lineTo(w - R + 6, Math.round(y) + .5); g.stroke(); g.fillStyle = '#55555e'; g.fillText(o.axis ? o.axis(v) : fmt(v), w - 4, y); }
    if (o.times) { g.textAlign = 'left'; g.fillStyle = '#55555e'; g.textBaseline = 'alphabetic'; const tf = (t) => ist(t, o.times); g.fillText(tf(pts[0][0]), L, h - 3); g.textAlign = 'right'; g.fillText(tf(pts[N][0]), w - R, h - 3); }
    if (base != null) { g.setLineDash([2, 4]); g.strokeStyle = 'rgba(205,178,124,.35)'; g.beginPath(); g.moveTo(L, Y(base)); g.lineTo(w - R + 6, Y(base)); g.stroke(); g.setLineDash([]); }
    const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(i), Y(p[1])) : g.moveTo(X(i), Y(p[1]))); };
    const grd = g.createLinearGradient(0, TOP, 0, h - BOT); grd.addColorStop(0, col + '26'); grd.addColorStop(1, col + '00');
    path(); g.lineTo(X(N), h - BOT); g.lineTo(X(0), h - BOT); g.closePath(); g.fillStyle = grd; g.fill();
    path(); g.strokeStyle = col; g.lineWidth = 1.25; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(X(N), Y(ys[N]), 2.4, 0, 7); g.fill();
    const snap = g.getImageData(0, 0, cv.width, cv.height); const lab = o.scrub; let lastI = -1;
    const move = (ev) => { const r = cv.getBoundingClientRect(); const i = Math.max(0, Math.min(N, Math.round((ev.clientX - r.left - L) / (w - L - R) * N)));
      g.putImageData(snap, 0, 0); const x = X(i), y = Y(pts[i][1]); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(x) + .5, TOP); g.lineTo(Math.round(x) + .5, h - BOT); g.stroke();
      g.fillStyle = '#ececee'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
      if (lab) { lab.innerHTML = `<b>${esc(fmt(pts[i][1]))}</b>  ${esc(ist(pts[i][0], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }))} IST`; lab.classList.add('on'); }
      if (i !== lastI && i % 10 === 0) H('light'); lastI = i; };
    const end = () => { g.putImageData(snap, 0, 0); lab && lab.classList.remove('on'); };
    cv.onpointerdown = move; cv.onpointermove = (e) => { if (e.pointerType === 'mouse' || e.buttons) move(e); }; cv.onpointerleave = end; cv.onpointerup = () => setTimeout(end, 1200);
  }

  /* ════════ VIEWS ════════ */
  const V = {};

  function alerts() {
    const A = []; const w = W();
    if (w && w.risk && w.risk.level <= 2) A.push({ lvl: 'd', t: `Global risk level ${w.risk.level} of 5`, s: `score ${w.risk.score}/100 · ${w.risk.high6h || 0} high-severity headlines in 6h`, jump: 'world:monitor' });
    (w && w.chokepoints || []).filter(c => c.level !== 'NORMAL').forEach(c => A.push({ lvl: c.level === 'HIGH' ? 'd' : 'a', t: `${c.name}: ${c.level.toLowerCase()}`, s: (c.latest && c.latest.title) || `${c.hits} headlines in 24h`, href: c.latest && c.latest.link }));
    const vix = (D.markets && D.markets.indices || {}).VIX; if (vix && Math.abs(vix.change_pct) >= 5) A.push({ lvl: 'a', t: `India VIX ${pct(vix.change_pct)}`, s: `at ${nf(vix.ltp, 2)}`, jump: 'pulse:fno' });
    const uv = quote('^VIX'); if (uv && uv.p >= 25) A.push({ lvl: 'a', t: `CBOE VIX ${nu(uv.p)}`, s: `${pct(uv.cp)} · US risk-off`, jump: 'world:global' });
    const f = D.fiidii && D.fiidii.days && D.fiidii.days[0]; if (f && f.FII) A.push({ lvl: f.FII.net >= 0 ? 'u' : 'd', t: `FII ${f.FII.net >= 0 ? 'bought' : 'sold'} ₹${nf(Math.abs(f.FII.net))} cr`, s: `${f.d} · DII ${sg(f.DII && f.DII.net, 0)} cr`, jump: 'pulse:flows' });
    const bo = D.breakouts || {}; if ((bo.breakouts || []).length) A.push({ lvl: 'g', t: `${bo.breakouts.length} breakouts · ${(bo.near || []).length} near`, s: (bo.breakouts || []).slice(0, 4).map(b => b.symbol).join(' · '), jump: 'pulse:breakouts' });
    for (const k of ['cricket', 'nfl', 'nba', 'soccer']) { const g = ((sportData(k) || {}).games || []).find(g => g.state === 'in' && (k !== 'cricket' || /india/i.test(g.name + JSON.stringify(g.competitors || [])))); if (g) A.push({ lvl: 'live', t: `${(g.competitors || []).map(c => c.abbr || c.name).join(' v ')} live`, s: g.detail || '', jump: 'sports:' + k }); }
    const fng = (D.insight || {}).fng; if (fng && (fng.now <= 25 || fng.now >= 75)) A.push({ lvl: fng.now <= 25 ? 'd' : 'u', t: `Crypto Fear & Greed ${fng.now} · ${fng.label}`, s: `yesterday ${fng.yday}`, jump: 'pulse:insight' });
    if (Date.now() / 1000 - D.ts > 900) A.push({ lvl: 'a', t: 'Feed is ' + ago(D.ts) + ' old', s: 'The public pusher may be paused' });
    return A;
  }
  const alertList = (al) => al.map(a => ext(a.href, `<i class="dot ${a.lvl}"></i><div class="t"><b>${esc(a.t)}</b><span>${esc(a.s || '')}</span></div>`, 'li' + (a.jump ? '" data-jump="' + a.jump : ''))).join('') || empty('All quiet');

  const chiHome = () => (window.Chi ? (Chi.brief(D, XU()) + Chi.meter(D, XU())) : '') + (window.Teach && window.SOBOT_CFG ? Teach.paywall(window.SOBOT_CFG, XU()) : '');
  V.home = () => {
    const nq = quote('^NSEI') || quote('NIFTY') || {};
    const M = D.markets || {}, ses = M.session || {}, rc = M.recap || {};
    const ix = (M.indices || {}).NIFTY || {};
    const last = nq.p != null ? nq.p : ix.ltp, chg = nq.cp != null ? nq.cp : ix.change_pct;
    const vix = quote('^INDIAVIX') || (M.indices || {}).VIX || {};
    const usdq = quote('USDINR=X') || {};
    const btc = Live.px.BTC || ((D.crypto || {}).prices || {}).BTC || {};
    const fng = (D.insight || {}).fng;
    const risk = (W() && W().risk) || {};
    const fii = ((D.fiidii || {}).days || [])[0] || {};
    const I = D.intel || {}; const b = I.briefing || {};
    const mk = [['^NSEI', 'Nifty 50'], ['^NSEBANK', 'Bank Nifty'], ['^INDIAVIX', 'India VIX'], ['USDINR=X', 'USD/INR'], ['BZ=F', 'Brent'], ['GC=F', 'Gold'], ['ES=F', 'S&P fut'], ['^TNX', 'US 10Y']].map(([s, n]) => { const q = quote(s); return q ? `<tr><td class="n">${n}</td><td>${px(q.p)}</td><td class="${cls(q.cp)}">${pct(q.cp)}</td><td>${spark(q.sp)}</td></tr>` : ''; }).filter(Boolean);
    ['BTC', 'ETH'].forEach(c => { const x = Live.px[c] || ((D.crypto || {}).prices || {})[c]; if (x) mk.push(`<tr data-c="${c}"><td class="n">${c}</td><td class="px">${px(x.price)}</td><td class="chg ${cls(x.change_pct)}">${pct(x.change_pct)}</td><td><span class="dim">live</span></td></tr>`); });
    const al = alerts();
    const liveGames = [].concat(...['cricket', 'nfl', 'nba', 'soccer', 'nhl'].map(k => ((sportData(k) || {}).games || []).filter(g => g.state === 'in'))).slice(0, 5);
    const kp = (l, v, c = '') => `<div><div class="lbl">${l}</div><div class="v ${c}">${v}</div></div>`;
    return `${chiHome()}` + `<div class="cols c3"><div>
      <section class="p hero" id="hero">
        <div class="row1"><div><div class="lbl">${esc(rc.headline ? 'Session' : 'Nifty 50')}</div><div class="big ${cls(chg)}">${nf(last, 2)}</div></div>${tag(ses.open ? 'Open' : 'Closed', ses.open ? 'u' : '')}</div>
        <div class="sub"><span>Nifty <b class="${cls(chg)}">${pct(chg)}</b></span><span>${esc(rc.headline || rc.summary || 'Live markets')}</span></div>
        <div class="chartw"><canvas id="hc"></canvas><div class="scrub" id="hcs"></div></div>
      </section>
      <div class="p"><div class="kpis">
        ${kp('India VIX', vix.p != null ? nf(vix.p, 2) : (vix.ltp != null ? nf(vix.ltp, 2) : '—'), cls(vix.cp != null ? vix.cp : vix.change_pct))}
        ${kp('USD/INR', usdq.p != null ? nf(usdq.p, 2) : '—', cls(usdq.cp))}
        ${kp('Bitcoin', btc.price != null ? '$' + nu(btc.price, 0) : '—', cls(btc.change_pct))}
        <div class="last-row">${kp('Fear & Greed', fng ? `${fng.now}<small class="fl">${esc(fng.label || '')}</small>` : '—', fng ? (fng.now <= 25 ? 'dn' : fng.now >= 75 ? 'up' : '') : '')}</div>
        <div class="last-row">${kp('World risk', risk.level != null ? 'L' + risk.level + '/5' : '—', risk.level <= 2 ? 'dn' : '')}</div>
        <div class="last-row">${kp('FII net', fii.FII ? sg(fii.FII.net, 0) + ' cr' : '—', fii.FII ? cls(fii.FII.net) : '')}</div>
      </div></div>
      ${b.lines && b.lines.length ? head('World War Ai brief', b.ist || '') + P(`<div class="pp brief">${b.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`) : ''}
      ${D.insight ? head('Crypto sentiment', '<a data-jump="pulse:insight">more →</a>') + sentiment() : ''}
    </div><div>
      ${head('Alerts', al.length + ' now')}
      ${P(alertList(al))}
      ${head('Markets', '<a data-jump="pulse:overview">more →</a>')}
      ${P(T([['Instrument', 'l'], 'Last', 'Chg', ''], mk, 'World Monitor offline'))}
      ${head('Live sport', liveGames.length ? liveGames.length + ' now' : '—')}
      ${P(liveGames.map(game).join('') || empty('Nothing live right now. Open Sports for the full board.'))}
      ${src('Public feed ' + (D.ist || '') + ' · World Monitor, NSE, ESPN, Binance')}
    </div></div>`;
  };
  V.home.after = (root) => {
    const q = quote('^NSEI'); const sp = (q && q.sp) || [];
    const pts = sp.map((v, i) => [i, v]);
    chart($('#hc', root), pts, { base: pts.length ? pts[0][1] : null, fmt: (v) => nf(v, 2), axis: (v) => nf(v, 0), scrub: $('#hcs', root), times: null, emptyMsg: 'Nifty path appears once World Monitor reports' });
  };

  /* ── markets ── */
  const P_ = {};
  P_.commodities = () => MarketsX.commodities(D, {esc, nf, pct, cls, px, P, head, src, spark, T, ext, empty, ago, tag});
  P_.screener = () => window.Chi9 ? Chi9.screener(D, XU()) : P(empty('Screener unavailable.'));
  P_.ipo = () => window.Chi9 ? Chi9.ipo(D, XU()) : P(empty('IPO centre unavailable.'));
  P_.deals = () => window.Chi9 ? Chi9.deals(D, XU()) : P(empty('Deals unavailable.'));
  V.pulse = () => segHtml('pulse', [['overview', 'Overview'], ['fno', 'F&O'], ['flows', 'Flows'], ['breakouts', 'Breakouts'], ['screener', 'Screener'], ['ipo', 'IPO'], ['deals', 'Deals'], ['crypto', 'Crypto'], ['commodities', 'Commodities'], ['insight', 'Sentiment'], ['news', 'News']]) + (P_[sub.pulse] || P_.overview)();
  V.tools = () => window.Chi9 ? Chi9.tools(D, XU(), sub.tools) : P(empty('Tools unavailable.'));

  P_.overview = () => {
    const M = D.markets || {}, w = W(); const ses = M.session || {}; const rc = M.recap || {};
    const ind = (w && w.quotes.india || []).filter(q => q.p != null);
    const rows = ind.map(q => `<tr><td class="n">${esc(q.n)}${q.d ? `<small>delayed ${q.d}m</small>` : ''}</td><td>${nf(q.p, 2)}</td><td class="${cls(q.cp)}">${pct(q.cp)}</td><td>${rng(q.l, q.h, q.p)}</td><td>${rng(q.l52, q.h52, q.p)}</td><td>${spark(q.sp)}</td></tr>`);
    if (!rows.length) Object.values(M.indices || {}).forEach(x => rows.push(`<tr><td class="n">${esc(x.name)}</td><td>${nf(x.ltp, 2)}</td><td class="${cls(x.change_pct)}">${pct(x.change_pct)}</td><td>${rng(x.low, x.high, x.ltp)}</td><td>${rng(x.year_low, x.year_high, x.ltp)}</td><td></td></tr>`));
    const br = M.breadth || {}; const tot = (br.advances || 0) + (br.declines || 0) + (br.unchanged || 0) || 1;
    const sect = (w && w.quotes.sectors || []).filter(q => q.cp != null).sort((a, b) => b.cp - a.cp); const ms = Math.max(1, ...sect.map(s => Math.abs(s.cp)));
    const lists = (M.movers || {}).lists || {}; const L = lists[sub.mov] || {};
    const mv = (arr) => T([['Symbol', 'l'], 'LTP', 'Chg', 'Vol'], (arr || []).slice(0, 8).map(x => `<tr><td class="n">${esc(x.symbol)}</td><td>${nf(x.ltp, 2)}</td><td class="${cls(x.change_pct)}">${pct(x.change_pct)}</td><td class="mu">${esc(x.volume || '—')}</td></tr>`), 'No data');
    const nq = quote('^NSEI');
    return `<div class="cols c3"><div>
      ${P(`<div class="pp"><div class="row1"><div><div class="lbl">Session</div><div data-css="margin-top:7px;font-size:14px;line-height:1.35">${esc(rc.headline || '—')}</div><div class="note bare" data-css="margin-top:4px">${esc(rc.summary || '')}</div></div>${tag(ses.open ? 'Open' : 'Closed', ses.open ? 'u' : '')}</div></div>`)}
      ${head('Indices', w && w.nse_msg ? esc(w.nse_msg) : '')}
      ${P(T([['Index', 'l'], 'Last', 'Chg', 'Day', '52W', ''], rows))}
      ${head('Breadth', esc(br.timestamp || ''))}
      ${P(`<div class="pp"><div class="legend"><span class="up">${nf(br.advances)} adv</span><span>${nf(br.unchanged)} unch</span><span class="dn">${nf(br.declines)} dec</span></div>
        <div class="breadth"><i class="a" data-css="${css({ width: (br.advances || 0) / tot * 100 + '%' })}"></i><i class="n" data-css="${css({ width: (br.unchanged || 0) / tot * 100 + '%' })}"></i><i class="d" data-css="${css({ width: (br.declines || 0) / tot * 100 + '%' })}"></i></div>
        <div class="legend"><span>A/D ${br.declines ? (br.advances / br.declines).toFixed(2) : '—'}</span>${nq && nq.adv != null ? `<span>Nifty 50 <b class="up">${nq.adv}</b>/<b class="dn">${nq.dec}</b></span>` : ''}${nq && nq.pe ? `<span>P/E ${nq.pe}</span>` : ''}</div></div>`)}
      ${head('Sector heat', 'Nifty sectoral indices')}
      ${P(sect.length ? `<div class="heat">${sect.map(s => `<div data-css="${css({ background: `rgba(${s.cp >= 0 ? '95,185,142' : '217,112,107'},${(0.03 + 0.2 * Math.min(1, Math.abs(s.cp) / ms)).toFixed(3)})` })}"><b>${esc(s.n)}</b><span class="${cls(s.cp)}">${pct(s.cp)}</span></div>`).join('')}</div>` : empty('World Monitor offline'))}
    </div><div>
      ${head('Movers', esc((M.movers || {}).timestamp || ''))}
      ${segHtml('mov', [['NIFTY', 'Nifty'], ['BANKNIFTY', 'Bank'], ['FOSec', 'F&O'], ['allSec', 'All']], true)}
      ${P(`<div class="lbl" data-css="padding:11px 14px 2px">Gainers</div>${mv(L.gainers)}`)}
      ${P(`<div class="lbl" data-css="padding:11px 14px 2px">Losers</div>${mv(L.losers)}`)}
      ${head('Global cues', '<a data-jump="world:global">all →</a>')}
      ${P(T([['Market', 'l'], 'Last', 'Chg', ''], [['ES=F', 'S&P 500 fut'], ['NQ=F', 'Nasdaq fut'], ['^N225', 'Nikkei'], ['^HSI', 'Hang Seng'], ['^GDAXI', 'DAX'], ['DX-Y.NYB', 'DXY'], ['^TNX', 'US 10Y'], ['BZ=F', 'Brent'], ['GC=F', 'Gold']].map(([s, n]) => { const q = quote(s); return q ? `<tr><td class="n">${n}</td><td>${px(q.p)}</td><td class="${cls(q.cp)}">${pct(q.cp)}</td><td>${spark(q.sp)}</td></tr>` : ''; }).filter(Boolean), 'World Monitor offline'))}
      ${src((M.sources || []).join(' · '))}
    </div></div>`;
  };
  const BUILD = { 'Long build-up': 'u', 'Short build-up': 'd', 'Short covering': 'a', 'Long unwinding': '' };
  P_.fno = () => {
    const O = D.oi || {}; const sym = sub.fno; const s = (O.summary || {})[sym] || {}; const ch = (D.fno || {}).chain || {};
    const t = s.totals || {}; const kp = (l, v, c = '') => `<div><div class="lbl">${l}</div><div class="v ${c}">${v}</div></div>`;
    const ivt = (O.iv_term || []).filter(x => x.atm_iv); const vix = (D.markets && D.markets.indices || {}).VIX; const vt = D.vix_term || [];
    const bu = (O.buildup || {})[sym] || [];
    let chain = ''; if (sym === 'NIFTY' && (ch.rows || []).length) { const atm = ch.atm; const rows = ch.rows.filter(r => Math.abs(r.strike - atm) <= 500); const mo = Math.max(1, ...rows.map(r => Math.max(r.ce_oi || 0, r.pe_oi || 0)));
      chain = head('Option chain', `NIFTY ${esc(ch.expiry || '')} · ATM ${nf(atm)}`) + P(T(['CE OI', 'ΔOI', 'LTP', ['Strike', ''], 'LTP', 'ΔOI', 'PE OI'], rows.map(r => `<tr class="${r.strike === atm ? 'hl' : ''}"><td>${bar((r.ce_oi || 0) / mo, 'd r')}</td><td class="${cls(r.ce_oi_chg)}">${sg(r.ce_oi_chg / 1000, 1)}k</td><td>${nf(r.ce_ltp, 2)}</td><td class="n${r.strike === ch.max_pain ? ' gold' : ''}" data-css="text-align:center">${nf(r.strike)}</td><td>${nf(r.pe_ltp, 2)}</td><td class="${cls(r.pe_oi_chg)}">${sg(r.pe_oi_chg / 1000, 1)}k</td><td>${bar((r.pe_oi || 0) / mo, 'u')}</td></tr>`))) + src('Max-pain strike in gold · ATM row marked · bars scaled to the largest OI in view'); }
    return `${segHtml('fno', [['NIFTY', 'Nifty'], ['BANKNIFTY', 'Bank Nifty'], ['FINNIFTY', 'Fin Nifty']], true)}<div class="cols c3"><div>
      ${P(`<div class="kpis">${kp('Spot', nf(s.u, 2))}${kp('ATM', nf(s.atm))}${kp('Max pain', nf(s.maxPain), 'gold')}${kp('PCR OI', ok(s.pcr) ? s.pcr.toFixed(2) : '—', s.pcr >= 1 ? 'up' : 'dn')}${kp('PCR ΔOI', ok(s.pcrChg) ? s.pcrChg.toFixed(2) : '—')}${kp('Straddle', nf(s.straddle, 1))}
        <div class="last-row">${kp('ATM IV', ok(s.atmIv) ? s.atmIv.toFixed(2) + '%' : '—')}</div><div class="last-row">${kp('CE OI', nf((t.ceOI || 0) / 1e5, 1) + 'L')}</div><div class="last-row">${kp('PE OI', nf((t.peOI || 0) / 1e5, 1) + 'L')}</div></div>`)}
      ${src(`${sym} · expiry ${s.expiry || '—'} · NSE ${s.ts || ''}`)}
      ${head('OI build-up', 'largest ΔOI · CE + PE')}
      ${P(T(['Strike', 'Side', 'ΔOI', 'OI', 'LTP', 'Chg', 'IV', ['Signal', 'l']], bu.map(r => `<tr><td class="n">${nf(r.k)}</td><td class="${r.side === 'CE' ? 'dn' : 'up'}">${r.side}</td><td class="${cls(r.coi)}">${sg(r.coi / 1000, 1)}k</td><td>${nf(r.oi / 1000, 0)}k</td><td>${nf(r.ltp, 2)}</td><td class="${cls(r.chg)}">${sg(r.chg, 1)}</td><td class="mu">${r.iv ? r.iv.toFixed(1) : '—'}</td><td class="l">${tag(r.kind, BUILD[r.kind])}</td></tr>`), 'Chain unavailable'))}
      ${chain}
    </div><div>
      ${head('Volatility term')}
      ${P(T([['Tenor', 'l'], 'IV', 'Straddle', 'PCR'], (vix ? [`<tr><td class="n">India VIX<small>30-day implied</small></td><td>${nf(vix.ltp, 2)}</td><td class="${cls(vix.change_pct)}">${pct(vix.change_pct)}</td><td></td></tr>`] : []).concat(ivt.map(x => `<tr><td class="n">Nifty ATM<small>${esc(x.expiry)}</small></td><td>${x.atm_iv.toFixed(2)}%</td><td>${nf(x.straddle, 1)}</td><td>${ok(x.pcr) ? x.pcr.toFixed(2) : '—'}</td></tr>`)), 'No IV data'))}
      ${P(T([['CBOE VIX term', 'l'], 'Level', 'Prev', 'Chg'], vt.filter(x => x.v).map(x => `<tr><td class="n">${esc(x.t)}</td><td>${nu(x.v)}</td><td class="mu">${nu(x.pc)}</td><td class="${cls(x.v - x.pc)}">${pct((x.v - x.pc) / x.pc * 100, 1)}</td></tr>`), 'No data') + (vt.length > 1 && vt[0].v && vt[vt.length - 1].v ? `<div class="note">${vt[0].v > vt[vt.length - 1].v ? 'Backwardation: near-term fear above long-dated, a stress signal.' : 'Contango: the normal, calm term structure.'}</div>` : ''))}
      ${head('Walls', 'highest open interest')}
      ${P(T([['Resistance · CE', 'l'], 'OI', 'ΔOI'], (s.res || []).map(r => `<tr><td class="n dn">${nf(r.k)}</td><td>${nf(r.oi / 1000, 0)}k</td><td class="${cls(r.coi)}">${sg(r.coi / 1000, 1)}k</td></tr>`)) + T([['Support · PE', 'l'], 'OI', 'ΔOI'], (s.sup || []).map(r => `<tr><td class="n up">${nf(r.k)}</td><td>${nf(r.oi / 1000, 0)}k</td><td class="${cls(r.coi)}">${sg(r.coi / 1000, 1)}k</td></tr>`)))}
      ${src('NSE option chain via World Monitor · CBOE VIX term via Yahoo')}
    </div></div>`;
  };
  P_.flows = () => {
    const F = D.fiidii || {}; const days = F.days || []; const mx = Math.max(1, ...days.flatMap(d => [Math.abs((d.FII || {}).net || 0), Math.abs((d.DII || {}).net || 0)]));
    const l = days[0] || {}; const fn = (l.FII || {}).net, dn = (l.DII || {}).net;
    return `${P(`<div class="kpis k4"><div><div class="lbl">FII net</div><div class="v ${cls(fn)}">${sg(fn, 0)} <small>cr</small></div></div><div><div class="lbl">DII net</div><div class="v ${cls(dn)}">${sg(dn, 0)} <small>cr</small></div></div>
        <div class="last-row"><div class="lbl">Combined</div><div class="v ${cls((fn || 0) + (dn || 0))}">${sg((fn || 0) + (dn || 0), 0)} <small>cr</small></div></div><div class="last-row"><div class="lbl">Session</div><div class="v">${esc(l.d || '—')}</div></div></div>`)}
      ${head('FII / DII cash', days.length + ' sessions')}
      ${P(T([['Date', 'l'], 'FII buy', 'FII sell', 'FII net', '', 'DII net', ''], days.map(d => { const f = d.FII || {}, i = d.DII || {}; return `<tr><td class="l tx2">${esc(d.d)}</td><td class="mu">${nf(f.buy, 0)}</td><td class="mu">${nf(f.sell, 0)}</td><td class="${cls(f.net)}">${sg(f.net, 0)}</td><td>${bar(Math.abs(f.net || 0) / mx, f.net >= 0 ? 'u' : 'd')}</td><td class="${cls(i.net)}">${sg(i.net, 0)}</td><td>${bar(Math.abs(i.net || 0) / mx, i.net >= 0 ? 'u' : 'd')}</td></tr>`; }), 'NSE flows unavailable'))}
      ${src((F.src || 'NSE') + ' · NSE publishes one session at a time; history builds on the box daily')}`;
  };
  P_.breakouts = () => {
    const B = D.breakouts || {};
    return `<div class="cols"><div>${head('Breakouts', (B.breakouts || []).length + ' · ' + esc(B.session_date || ''))}
      ${P(T([['Symbol', 'l'], 'Close', 'Level', 'Above', 'Vol ×'], (B.breakouts || []).map(b => `<tr><td class="n">${esc(b.symbol)}</td><td>${nf(b.close, 2)}</td><td class="mu">${nf(b.level, 2)}</td><td class="up">${pct(b.pct_from_level, 1)}</td><td class="${b.volume_multiple >= 3 ? 'gold' : ''}">${ok(b.volume_multiple) ? b.volume_multiple.toFixed(1) + '×' : '—'}</td></tr>`), 'No breakouts this session'))}
    </div><div>${head('Near breakout', (B.near || []).length + ' within 1%')}
      ${P(T([['Symbol', 'l'], 'Close', 'Level', 'Gap', 'Vol ×'], (B.near || []).slice(0, 40).map(b => `<tr><td class="n">${esc(b.symbol)}</td><td>${nf(b.close, 2)}</td><td class="mu">${nf(b.level, 2)}</td><td class="${cls(b.pct_from_level)}">${pct(b.pct_from_level, 2)}</td><td>${ok(b.volume_multiple) ? b.volume_multiple.toFixed(1) + '×' : '—'}</td></tr>`), 'None'))}
      ${src((B.rule || '') + ' · ' + (B.src || ''))}</div></div>`;
  };
  P_.crypto = () => {
    const C = D.crypto || {}; const coins = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'];
    const spot = coins.map(c => { const x = Live.px[c] || (C.prices || {})[c]; if (!x) return ''; return `<tr data-c="${c}"><td class="n">${c}</td><td class="px">${px(x.price)}</td><td class="chg ${cls(x.change_pct)}">${pct(x.change_pct)}</td><td class="mu">${px(x.high)}</td><td class="mu">${px(x.low)}</td><td class="tx2 inr">${inrS(x.price * fx())}</td></tr>`; }).filter(Boolean);
    const live = Object.keys(Live.fut).length > 0; const dv = live ? coins.map(c => Live.fut[c]).filter(Boolean) : ((D.deriv || {}).rows || []).filter(r => !r.error);
    const prints = C.large_prints || []; const xfer = C.transfers || [];
    const trend = ((D.insight || {}).trending || []);
    return `<div class="cols c3"><div>
      ${head('Spot', Object.keys(Live.px).length ? '<i class="dot live"></i>Binance stream' : 'feed snapshot')}
      ${P(T([['Coin', 'l'], 'USD', '24h', 'High', 'Low', 'INR'], spot, 'No prices'))}
      ${head('Perpetuals', live ? 'Binance USD-M · live' : 'OKX USDT swaps · feed')}
      ${P(T([['Coin', 'l'], 'Fund 8h', 'Annual', 'Open int.', live ? 'Basis' : 'Vol 24h', 'Next'], dv.map(r => `<tr><td class="n">${r.c}</td><td class="${cls(r.funding)}">${(r.funding * 100).toFixed(4)}%</td><td class="${cls(r.funding_ann)}">${pct(r.funding_ann, 1)}</td><td>${usd(r.oi_usd)}</td><td class="mu">${live ? pct(r.basis, 3) : usd(r.vol_ccy24 * (r.last || 0))}</td><td class="mu">${r.next ? ist(r.next) : '—'}</td></tr>`), 'Derivatives unavailable'))}
      ${src(live ? 'fapi.binance.com, fetched by this browser' : ((D.deriv || {}).src || ''))}
    </div><div>
      ${head('Trending', 'CoinGecko searches')}
      ${P(T([['Coin', 'l'], 'Rank', '24h'], trend.map(t => `<tr><td class="n">${esc(t.s)}<small>${esc(t.n)}</small></td><td class="mu">${t.rank || '—'}</td><td class="${cls(t.chg)}">${pct(t.chg, 1)}</td></tr>`), 'Unavailable'))}
      ${head('Large prints', 'Binance aggTrades · ≥ $1M')}
      ${P(T([['Coin', 'l'], 'Side', 'Notional', 'When'], prints.slice(0, 12).map(x => `<tr><td class="n">${esc(x.coin || x.s || '')}</td><td class="${(x.side || '').toLowerCase() === 'sell' ? 'dn' : 'up'}">${esc(x.side || '—')}</td><td>${usd(x.notional || x.usd)}</td><td class="mu">${ago(x.ts)}</td></tr>`), 'None in this window'))}
      ${xfer.length ? head('On-chain transfers', '') + P(T([['Asset', 'l'], 'Amount', 'When'], xfer.slice(0, 8).map(x => `<tr><td class="n">${esc(x.asset || x.coin || '')}</td><td>${esc(x.amount || usd(x.usd))}</td><td class="mu">${ago(x.ts)}</td></tr>`))) : ''}
      ${src((C.notes || []).join(' '))}
    </div></div>`;
  };
  const fngCls = (v) => v == null ? '' : v <= 25 ? 'dn' : v < 45 ? 'amb' : v <= 55 ? 'tx2' : v < 75 ? 'up' : 'up';
  function sentiment() {
    const I = D.insight || {}; const f = I.fng, g = I.global || {}, cb = I.cb_premium, db = (I.deribit || {}).BTC || {}, r = (I.ratios || {}).BTC || {};
    if (!f && !g.mcap) return '';
    const kp = (l, v, c = '', extra = '') => `<div><div class="lbl">${l}</div><div class="v ${c}">${v}</div>${extra}</div>`;
    return P(`<div class="kpis">${kp('Fear & Greed', f ? `${f.now}<small class="fl">${esc(f.label)}</small>` : '—', f ? fngCls(f.now) : '')}${kp('Crypto mcap', usd(g.mcap), '', `<div class="kx ${cls(g.mcap_chg)}">${pct(g.mcap_chg)}</div>`)}${kp('BTC dom', ok(g.btc_dom) ? g.btc_dom.toFixed(1) + '%' : '—')}
      <div class="last-row">${kp('CB premium', cb ? pct(cb.prem_pct, 3) : '—', cb ? cls(cb.prem_pct) : '')}</div><div class="last-row">${kp('BTC DVOL', ok(db.dvol) ? db.dvol.toFixed(1) : '—')}</div><div class="last-row">${kp('L/S accts', ok(r.ls) ? r.ls.toFixed(2) : '—')}</div></div>`);
  }
  P_.insight = () => {
    const I = D.insight || {}; const f = I.fng; const g = I.global || {}; const R = I.ratios || {}; const L = I.liq || {}; const Db = I.deribit || {}; const cb = I.cb_premium; const bc = I.btc_chain || {}; const ll = I.llama || {};
    const gauge = f ? `<div class="pp"><div class="row1"><div><div class="lbl">Crypto Fear &amp; Greed</div><div class="rl"><span class="${fngCls(f.now)}">${f.now}</span><span class="mu"> ${esc(f.label)}</span></div></div><div class="rr">${spark(f.hist, 'g')}<div class="note bare">30 days</div></div></div>
      <div class="fng"><i data-css="${css({ left: f.now + '%' })}"></i></div><div class="legend"><span>Yesterday ${f.yday}</span><span>Week ago ${f.week}</span><span>Month ago ${f.month}</span></div></div>` : empty('Fear & Greed unavailable');
    return `${head('Sentiment')}${P(gauge)}${sentiment()}
      ${head('Positioning', 'OKX · 1h')}
      ${P(T([['Coin', 'l'], 'L/S', 'Top', 'Taker', 'Liq L', 'Liq S'], ['BTC', 'ETH', 'SOL'].map(c => { const r = R[c] || {}, l = L[c] || {}; return `<tr><td class="n">${c}</td><td class="${r.ls > 1 ? 'up' : 'dn'}">${ok(r.ls) ? r.ls.toFixed(2) : '—'}</td><td>${ok(r.top_ls) ? r.top_ls.toFixed(2) : '—'}</td><td class="${cls((r.taker || 1) - 1)}">${ok(r.taker) ? r.taker.toFixed(2) : '—'}</td><td class="dn">${usd(l.long)}</td><td class="up">${usd(l.short)}</td></tr>`; }), 'Unavailable'), 'xs')}
      ${head('Options & flows')}
      ${P(T([['Metric', 'l'], 'BTC', 'ETH'], [
        `<tr><td class="n">DVOL<small>implied vol</small></td><td>${ok((Db.BTC || {}).dvol) ? Db.BTC.dvol.toFixed(1) : '—'}</td><td>${ok((Db.ETH || {}).dvol) ? Db.ETH.dvol.toFixed(1) : '—'}</td></tr>`,
        `<tr><td class="n">Put/call OI</td><td>${ok((Db.BTC || {}).pc_oi) ? Db.BTC.pc_oi.toFixed(2) : '—'}</td><td>${ok((Db.ETH || {}).pc_oi) ? Db.ETH.pc_oi.toFixed(2) : '—'}</td></tr>`,
        `<tr><td class="n">Put/call volume</td><td>${ok((Db.BTC || {}).pc_vol) ? Db.BTC.pc_vol.toFixed(2) : '—'}</td><td>${ok((Db.ETH || {}).pc_vol) ? Db.ETH.pc_vol.toFixed(2) : '—'}</td></tr>`]), 'xs')}
      ${P(T([['Market', 'l'], 'Value', 'Chg'], [
        cb ? `<tr><td class="n">Coinbase premium<small>BTC-USD vs Binance USDT</small></td><td class="${cls(cb.prem_usd)}">${cb.prem_usd >= 0 ? '+' : '−'}$${nu(Math.abs(cb.prem_usd))}</td><td class="${cls(cb.prem_pct)}">${pct(cb.prem_pct, 3)}</td></tr>` : '',
        `<tr><td class="n">Total crypto mcap</td><td>${usd(g.mcap)}</td><td class="${cls(g.mcap_chg)}">${pct(g.mcap_chg)}</td></tr>`,
        `<tr><td class="n">24h volume</td><td>${usd(g.vol)}</td><td class="mu">—</td></tr>`,
        `<tr><td class="n">BTC / ETH dominance</td><td>${ok(g.btc_dom) ? g.btc_dom.toFixed(1) : '—'}% / ${ok(g.eth_dom) ? g.eth_dom.toFixed(1) : '—'}%</td><td class="mu">—</td></tr>`,
        `<tr><td class="n">Stablecoins<small>7d chg</small></td><td>${usd(ll.stables)}</td><td class="${cls(ll.stables_7d)}">${pct(ll.stables_7d)}</td></tr>`,
        `<tr><td class="n">DeFi TVL<small>7d chg</small></td><td>${usd(ll.tvl)}</td><td class="${cls(ll.tvl_7d)}">${pct(ll.tvl_7d)}</td></tr>`,
        `<tr><td class="n">BTC fees<small>sat/vB fast/hr/eco</small></td><td>${bc.fast ?? '—'} / ${bc.hour ?? '—'} / ${bc.eco ?? '—'}</td><td class="mu">—</td></tr>`,
        `<tr><td class="n">BTC hashrate</td><td>${ok(bc.hashrate_eh) ? nf(bc.hashrate_eh, 0) + ' EH/s' : '—'}</td><td class="mu">—</td></tr>`].filter(Boolean)))}
      ${head('Trending', 'CoinGecko searches')}
      ${P(T([['Coin', 'l'], 'Rank', '24h'], (I.trending || []).map(t => `<tr><td class="n">${esc(t.s)}<small>${esc(t.n)}</small></td><td class="mu">${t.rank || '—'}</td><td class="${cls(t.chg)}">${pct(t.chg, 1)}</td></tr>`), 'Unavailable'))}
      ${src('alternative.me · CoinGecko · OKX · Deribit · Coinbase · mempool.space · DefiLlama. Liquidations are an OKX sample, not market-wide.' + ((I.failed || []).length ? ' Unavailable: ' + I.failed.join(', ') : ''))}`;
  };
  const newsList = (items, n = 50) => items.slice(0, n).map(i => ext(i.link, `<i class="sev s${i.sev || (i.flags && i.flags.length ? 2 : 1)}"></i><div class="t"><b>${esc(i.title)}</b><span>${esc(i.source || '')} · ${ago(i.ts)}${i.place ? ' · ' + esc(i.place) : ''}</span></div>`, 'li')).join('') || empty('No headlines');
  P_.news = () => {
    const N = D.news || {}; const items = N.items || []; const cats = [...new Set(items.map(i => i.cat).filter(Boolean))];
    const f = sub.news === 'flagged' ? (N.flagged || []) : sub.news === 'all' ? items : items.filter(i => i.cat === sub.news);
    return `${segHtml('news', [['all', 'All'], ['flagged', 'Flagged', (N.flagged || []).length || '']].concat(cats.map(c => [c, c])), true)}${P(newsList(f, 60))}${src('Desk news feeds · ' + ago(N.ts) + ' ago')}`;
  };

  /* ── world (merged from the World Monitor / WWAi command center) ── */
  V.play = () => window.Play ? Play.render(D, XU()) : P(empty('Play is unavailable.'));
  const W_ = {};
  V.world = () => {
    const w = W(); const segs = segHtml('world', [['intel', 'Brief'], ['monitor', 'Monitor'], ['feed', 'Events'], ['global', 'Global'], ['calendar', 'Calendar'], ['wnews', 'News'], ['tv', 'Live TV'], ['weather', 'Weather']]);
    if (sub.world === 'tv') return segs + (window.Chi ? Chi.tv(D, XU()) : '');
    if (sub.world === 'weather') return segs + (window.Chi ? Chi.weather(D, XU()) : '');
    if (!w) return segs + P(empty('World Monitor is offline on the box (live-markets :8620). start.sh restarts it.'));
    return segs + (W_[sub.world] || W_.monitor)(w);
  };
  const LON = (lon) => (lon + 180) / 360 * 1000, LAT = (lat) => (90 - lat) / 180 * 500;
  function mapSvg(w) {
    const grid = []; for (let x = -150; x <= 180; x += 30) grid.push(`<line x1="${LON(x)}" y1="40" x2="${LON(x)}" y2="412"/>`); for (let y = -60; y <= 75; y += 30) grid.push(`<line x1="0" y1="${LAT(y)}" x2="1000" y2="${LAT(y)}"/>`);
    const pins = (w.pins || []).filter(p => p.ll).map(p => `<circle class="pin s${p.sev || 1}" cx="${LON(p.ll[1]).toFixed(1)}" cy="${LAT(p.ll[0]).toFixed(1)}" r="1.8" opacity=".75"/>`);
    const hot = (w.hot || []).filter(h => h.ll).sort((a, b) => b.n - a.n);
    const hs = hot.slice(0, 14).map((h, i) => { const x = LON(h.ll[1]), y = LAT(h.ll[0]), r = 2.5 + Math.sqrt(h.n) * 1.6;
      return `<circle class="halo s${h.sev || 1}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity=".7"/>${i < 5 && h.sev >= 3 ? `<circle class="halo s3 pulse" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>` : ''}${i < 6 ? `<text x="${(x + r + 3).toFixed(1)}" y="${(y + 3).toFixed(1)}">${esc(String(h.place || '').toUpperCase())}</text>` : ''}`; });
    const cps = (w.chokepoints || []).filter(c => c.ll).map(c => { const x = LON(c.ll[1]), y = LAT(c.ll[0]); return `<rect class="cp ${c.level !== 'NORMAL' ? 'hi' : ''}" x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6" height="6" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/>`; });
    return `<div class="map"><svg viewBox="0 40 1000 372" role="img" aria-label="World situation map"><g class="grid">${grid.join('')}</g><path class="land" d="${window.SOBOT_LAND || ''}"/>${pins.join('')}${hs.join('')}${cps.join('')}</svg>
      <div class="mlegend"><span><i class="lg-h"></i>high</span><span><i class="lg-e"></i>elevated</span><span><i class="lg-w"></i>watch</span><span><i class="lg-c"></i>chokepoint</span></div></div>`;
  }
  W_.monitor = (w) => {
    const r = w.risk || {}; const lvl = r.level || 5; const filled = 6 - lvl;
    const imp = [['BZ=F', 'Brent'], ['CL=F', 'WTI'], ['GC=F', 'Gold'], ['SI=F', 'Silver'], ['NG=F', 'Nat gas'], ['DX-Y.NYB', 'DXY'], ['^TNX', 'US 10Y'], ['^VIX', 'CBOE VIX'], ['^INDIAVIX', 'India VIX'], ['USDINR=X', 'USD/INR'], ['ES=F', 'S&P fut']];
    const hot = (w.hot || []).slice().sort((a, b) => b.n - a.n).slice(0, 12);
    return `<div class="cols c3"><div>
      ${P(`<div class="pp"><div class="risk"><div><div class="lbl">Global risk</div><div class="rl">Level ${lvl}<span class="mu"> / 5</span></div></div>
        <div class="rr"><div class="lvl">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= filled ? 'on' + (lvl <= 2 ? ' hot' : '') : ''}"></i>`).join('')}</div><div class="note bare">score ${r.score ?? '—'}/100 · ${r.high6h ?? 0} severe headlines · 6h</div></div></div></div>
        ${mapSvg(w)}<div class="note">Level 1 is extreme, 5 is calm: a plain heuristic from headline severity, VIX, India VIX and crude/gold moves. Dots are geo-tagged headlines; rings are hotspots sized by headline count.</div>`)}
      ${head('Chokepoints', '24h headline scan')}
      ${P(T([['Route', 'l'], ['Carries', 'l'], 'Hits', 'Status'], (w.chokepoints || []).map(c => `<tr class="${c.level !== 'NORMAL' ? 'hl' : ''}"><td class="n">${esc(c.name)}</td><td class="l mu">${esc(c.share || '')}</td><td>${c.hits}</td><td>${tag(c.level.toLowerCase(), c.level === 'HIGH' ? 'd' : c.level === 'ELEVATED' ? 'a' : '')}</td></tr>`)))}
    </div><div>
      ${head('Market impact', 'risk-sensitive assets')}
      ${P(T([['Asset', 'l'], 'Last', 'Chg', ''], imp.map(([s, n]) => { const q = quote(s); return q ? `<tr><td class="n">${n}</td><td>${px(q.p)}</td><td class="${cls(q.cp)}">${pct(q.cp)}</td><td>${spark(q.sp)}</td></tr>` : ''; }).filter(Boolean)))}
      ${head('Hotspots', hot.length + ' places')}
      ${P(T([['Place', 'l'], 'Headlines', 'Severity'], hot.map(h => `<tr><td class="n">${esc(h.place)}</td><td>${h.n}</td><td>${tag(h.sev >= 3 ? 'high' : h.sev === 2 ? 'elevated' : 'watch', h.sev >= 3 ? 'd' : h.sev === 2 ? 'a' : '')}</td></tr>`)))}
      ${src(w.src + ' · updated ' + ago(w.at) + ' ago')}
    </div></div>`;
  };
  W_.intel = (w) => {
    const I = D.intel || {}; const b = I.briefing || {}; const hz = I.hero_zero || {};
    const al = (list) => list.map(a => ext(a.link, `<i class="sev s${a.sev || 1}"></i><div class="t"><b>${esc(a.title)}</b><span>${esc(a.cat ? a.cat + ' · ' + (a.source || '') + ' · ' + ago(a.ts) : a.detail || '')}</span></div>`, 'li')).join('') || empty('No rule fired');
    return `<div class="cols c3"><div>
      ${head('Briefing', esc(b.ist || ''))}
      ${P(`<div class="pp brief">${(b.lines || []).map(l => `<p>${esc(l)}</p>`).join('') || empty('No briefing yet')}</div>`)}
      ${head('Market-moving alerts', (I.alerts || []).length + ' fired')}
      ${P(al(I.alerts || []))}
      ${src(I.rules || '')}
    </div><div>
      ${head('Crypto overnight', (I.crypto_alerts || []).length + ' alerts')}
      ${P(al(I.crypto_alerts || []))}
      ${head('Hero-zero scan', hz.active ? 'EXPIRY DAY · ' + esc(hz.expiry) : 'next expiry ' + esc(hz.expiry || '—'))}
      ${P(`<div class="pp"><div class="legend"><span>Bias <b class="${hz.bias === 'up' ? 'up' : hz.bias === 'down' ? 'dn' : 'gold'}">${esc(hz.bias || '—')}</b></span><span>Spot ${nf(hz.spot, 2)}</span><span>Max pain ${nf(hz.max_pain)}</span></div></div>` + T(['Strike', 'Side', 'LTP', 'Dist', 'OI', 'ΔOI'], (hz.cands || []).map(c => `<tr><td class="n">${nf(c.k)}</td><td class="${c.side === 'CE' ? 'up' : 'dn'}">${c.side}</td><td>${nf(c.ltp, 2)}</td><td class="mu">${sg(c.dist, 0)}</td><td>${nf((c.oi || 0) / 1000, 0)}k</td><td class="${cls(c.coi)}">${sg((c.coi || 0) / 1000, 1)}k</td></tr>`), hz.active ? 'No strike passes the rule' : 'Runs on expiry day only') + `<div class="note">${esc(hz.rule || '')}</div>`)}
    </div></div>`;
  };
  W_.feed = (w) => {
    const pins = (w.pins || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)); const f = sub.feed === 'high' ? pins.filter(p => p.sev >= 3) : sub.feed === 'elev' ? pins.filter(p => p.sev === 2) : pins;
    return `${segHtml('feed', [['all', 'All'], ['high', 'High', pins.filter(p => p.sev >= 3).length], ['elev', 'Elevated']], true)}${P(newsList(f, 80))}${src('Conflict & event feed: geo-tagged headlines from 18 wire/RSS feeds · World Monitor')}`;
  };
  W_.global = (w) => {
    const tb = (title, g) => head(title) + P(T([['Market', 'l'], 'Last', 'Chg', 'Day', ''], (w.quotes[g] || []).filter(q => q.p != null).map(q => `<tr><td class="n">${esc(q.n)}${q.d ? `<small>${q.d}m delay</small>` : ''}</td><td>${px(q.p)}</td><td class="${cls(q.cp)}">${pct(q.cp)}</td><td>${rng(q.l, q.h, q.p)}</td><td>${spark(q.sp)}</td></tr>`), 'No quotes'));
    return `<div class="cols"><div>${tb('Global indices', 'global')}${tb('Commodities', 'commod')}</div><div>${tb('Futures · rates · FX', 'futures')}${src('Yahoo quote API via World Monitor; delays marked per row')}</div></div>`;
  };
  W_.calendar = (w) => {
    const ev = (w.calendar || []).slice().sort((a, b) => a.t - b.t); const by = {}; ev.forEach(e => { const k = ist(e.t, { weekday: 'short', day: '2-digit', month: 'short' }); (by[k] = by[k] || []).push(e); });
    const imp = (i) => `<span class="${i >= 1 ? 'gold' : i === 0 ? 'tx2' : 'dim'}">${'●'.repeat(Math.max(1, (i || 0) + 2))}</span>`;
    const out = Object.entries(by).map(([k, list]) => head(k, list.length + ' events') + P(T([['IST', 'l'], ['', 'l'], ['Event', 'l'], 'Imp', 'Act', 'Fcst', 'Prev'], list.map(e => `<tr class="${e.imp >= 1 ? 'hl' : ''}"><td class="l tx2">${ist(e.t)}</td><td class="l mu">${esc(e.c)}</td><td class="w">${esc(e.title)}${e.per ? ` <span class="dim">${esc(e.per)}</span>` : ''}</td><td>${imp(e.imp)}</td><td>${e.a ?? '—'}</td><td class="mu">${e.f ?? '—'}</td><td class="mu">${e.p ?? '—'}</td></tr>`)))).join('');
    return (out || P(empty('No upcoming events'))) + src('TradingView public economic calendar (IN, US, CN, EU, JP, GB) via World Monitor');
  };
  W_.wnews = (w) => { const items = w.news || []; const cats = [...new Set(items.map(i => i.cat).filter(Boolean))]; const f = sub.wnews === 'all' ? items : items.filter(i => i.cat === sub.wnews);
    return `${segHtml('wnews', [['all', 'All']].concat(cats.map(c => [c, c])), true)}${P(newsList(f, 70))}${src('Reuters/AP via Google News, BBC, Al Jazeera, France 24, DW, UN, ET, Mint, BS, CoinDesk · World Monitor')}`; };

  /* ── sports ── */
  const sportData = (k) => Live.sports[k] || (D && D.sports && D.sports.sports && D.sports.sports[k]) || null;
  const wpFor = (g) => { const m = D.winprob || {}; const id = String(g.id || '').split(':').pop(); for (const k in m) if (k.split(':').pop() === id) return m[k]; return null; };
  function game(g) {
    const cs = g.competitors || []; const live = g.state === 'in'; const wp = wpFor(g);
    const home = cs.find(c => c.home) || cs[0]; const sc = cs.slice(0, g.sport === 'golf' || g.sport === 'f1' ? 6 : 2);
    const rows = sc.map(c => { const key = g.id + c.abbr; const bump = prevScore[key] != null && prevScore[key] !== c.score; prevScore[key] = c.score; const long = String(c.score || '').length > 9;
      return `<div class="tm ${c.winner ? 'win' : ''} ${long ? 'long' : ''}"><span class="ab">${c.logo ? `<img src="${esc(c.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc((c.abbr || c.name || '?').slice(0, 3))}</span><span class="nm">${esc(c.name)}${c.record ? ` <span class="dim m">${esc(c.record)}</span>` : ''}</span><span class="sc ${bump ? 'bump' : ''}">${esc(c.score ?? '')}</span></div>`; }).join('');
    const odds = g.odds && (g.odds.details || g.odds.over_under) ? `${esc(g.odds.details || '')}${g.odds.over_under ? ' · o/u ' + g.odds.over_under : ''}` : '';
    const clk = live ? (g.clock && g.clock !== '0.0' && g.clock !== "0'" ? g.clock : '') : g.state === 'pre' ? ist(g.start, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST' : 'final';
    return `<div class="g"><div class="meta"><b>${live ? '<i class="dot live"></i><span class="lvt">LIVE</span> ' : ''}${esc(g.league || '')}</b><span>${esc(clk)}</span></div>${rows}
      ${g.detail && !/^final$/i.test(g.detail) ? `<div class="det">${esc(g.detail)}</div>` : ''}${wp && home ? `<div class="wp"><span>${esc(home.abbr || 'Home')} win</span><span class="bar"><i data-css="${css({ width: (wp.home * 100).toFixed(1) + '%' })}"></i></span><span class="tx2">${(wp.home * 100).toFixed(1)}%</span>${spark(wp.series, 'g')}</div>` : ''}${odds ? `<div class="det">${odds}</div>` : ''}</div>`;
  }
  const S_ = {};
  V.sports = () => {
    const ks = Live.SPORTS.filter(k => { const d = sportData(k); return d && (d.games || []).length; });
    const segs = segHtml('sports', [['home', 'Markets']].concat(ks.map(k => [k, Live.LABEL[k] || k, (sportData(k) || {}).live || ''])).concat([['standings', 'Standings']]));
    if (sub.sports === 'home') return segs + S_.home();
    if (sub.sports === 'standings') return segs + S_.standings();
    const d = sportData(sub.sports); if (!d) return segs + P(empty('No games'));
    const gs = d.games || [];
    return segs + `<div class="cols">${[['in', 'Live'], ['pre', 'Upcoming'], ['post', 'Final']].map(([st, t]) => { const l = gs.filter(g => g.state === st); return l.length ? `<div>${head(t, l.length + (Live.sports[sub.sports] ? ' · ESPN live' : ' · feed ' + ago(D.sports && D.sports.ts)))}${P(l.slice(0, 25).map(game).join(''))}</div>` : ''; }).join('')}</div>`;
  };
  const bh = (m) => ((D.bet_hist || {})[`${m.source}|${m.url || m.event}|${m.question}`] || []).map(x => x[1]);
  S_.home = () => {
    const H_ = D.sports_home || {}; const rk = H_.sports_rank || []; const mv = Math.max(1, ...rk.map(r => r.volume24hr || 0));
    const live = [].concat(...['cricket', 'nfl', 'nba', 'nhl', 'soccer', 'ncaaf', 'ncaab'].map(k => ((sportData(k) || {}).games || []).filter(g => g.state === 'in'))).slice(0, 8);
    return `<div class="cols c3"><div>
      ${head('Most-bet markets', 'implied % · 72h path')}
      ${P(T([['Market', 'l'], 'Yes', '72h', 'Δ', 'Vol 24h'], (H_.top_markets || []).slice(0, 25).map(m => { const o = (m.outcomes || [])[0] || {}; const h = bh(m); const dlt = h.length > 1 ? h[h.length - 1] - h[0] : null;
        return `<tr><td class="w">${ext(m.url, esc(m.question || m.event), 'mq')}<small class="m dim">${esc(m.event)} · ${esc((m.sport || '').toUpperCase())} · ${esc(m.source)}</small></td><td>${ok(o.implied_pct) ? o.implied_pct.toFixed(0) + '%' : '—'}</td><td>${spark(h, 'g')}</td><td class="${cls(dlt)}">${ok(dlt) && dlt !== 0 ? sg(dlt, 1) : '<span class="dim">·</span>'}</td><td class="mu">${usd(m.volume24hr)}</td></tr>`; }), 'No markets'))}
      ${src((H_.disclaimer || '') + ' Price path tracked on the box since first seen.')}
    </div><div>
      ${head('Volume by sport', '24h · Polymarket + Kalshi')}
      ${P(T(['#', ['Sport', 'l'], 'Events', 'Vol 24h', ''], rk.map((r, i) => `<tr class="tap" data-sport="${esc(r.sport)}"><td class="mu">${i + 1}</td><td class="n l">${esc(r.label)}</td><td>${r.n_events}</td><td>${usd(r.volume24hr)}</td><td>${bar((r.volume24hr || 0) / mv, 'g')}</td></tr>`)))}
      ${head('Live now', live.length + ' games')}
      ${P(live.map(game).join('') || empty('Nothing live right now'))}
    </div></div>`;
  };
  S_.standings = () => {
    const St = D.standings || {}; const ks = Object.keys(St).filter(k => St[k] && St[k].groups); if (!ks.length) return P(empty('Standings unavailable'));
    if (!St[sub.std]) sub.std = ks[0]; const s = St[sub.std]; const soccer = /epl|laliga/.test(sub.std), nhl = sub.std === 'nhl';
    return segHtml('std', ks.map(k => [k, St[k].label]), true) + `<div class="cols">${(s.groups || []).map(g => `<div>${head(g.name || s.label)}${P(T(['#', ['Team', 'l'], 'W', 'L', soccer ? 'D' : nhl ? 'OTL' : 'Pct', soccer || nhl ? 'Pts' : 'GB', soccer ? 'GD' : 'Diff', 'Strk'], g.rows.map((r, i) => `<tr><td class="mu">${i + 1}</td><td class="n l">${r.logo ? `<img class="lg" src="${esc(r.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}${esc(r.n || r.t)}</td><td>${esc(r.w ?? '—')}</td><td>${esc(r.l ?? '—')}</td><td class="mu">${esc(soccer || nhl ? (r.otl ?? '—') : (r.pct ?? '—'))}</td><td>${esc(soccer || nhl ? (r.pts ?? '—') : (r.gb ?? '—'))}</td><td class="${cls(parseFloat(r.diff))}">${esc(r.diff ?? '—')}</td><td class="${/^W/.test(r.strk || '') ? 'up' : /^L/.test(r.strk || '') ? 'dn' : 'mu'}">${esc(r.strk ?? '—')}</td></tr>`)))}</div>`).join('')}</div>${src('ESPN standings · refreshed every 30 min on the box')}`;
  };

  function imgs(root) { $$('img', root).forEach(i => { const off = () => i.remove(); if (i.complete && !i.naturalWidth) off(); else i.addEventListener('error', off, { once: true }); }); }
  function placeSeg(root, animate = true) { $$('.seg', root).forEach(s => { const on = $('button.on', s), pill = $('.seg-pill', s); if (!on || !pill) return; if (!animate) pill.style.setProperty('transition', 'none');
    pill.style.setProperty('width', on.offsetWidth + 'px'); pill.style.setProperty('transform', `translateX(${on.offsetLeft}px)`); if (!animate) requestAnimationFrame(() => pill.style.removeProperty('transition'));
    if (on.offsetLeft + on.offsetWidth > s.scrollLeft + s.clientWidth || on.offsetLeft < s.scrollLeft) s.scrollTo({ left: on.offsetLeft - 24, behavior: animate ? 'smooth' : 'auto' }); }); }

  /* ── render ── */
  function render(opts = {}) {
    if (!D) return; const main = $('#view'); const y = scrollY;
    main.innerHTML = `<div class="view">${V[section]()}</div>`; if (opts.quiet) main.firstChild.style.setProperty('animation', 'none');
    applyCss(main); imgs(main); placeSeg(main, false); V[section].after && V[section].after(main);
    if (opts.keepScroll) scrollTo(0, y); placeDock(); tape();
    if (section === 'pulse' && sub.pulse === 'crypto') Live.pullFutures();
    if (window.Chi9) { Chi9.nudgeWidget(D); Chi9.checkWatch(D, toast); Chi9.settlePredict(D); }
  }
  function go(s, sb) { if (sb) { if (s === 'pulse') sub.pulse = sb; if (s === 'world') sub.world = sb; if (s === 'tools') sub.tools = sb; if (s === 'play') sub.play = sb; if (s === 'sports') { sub.sports = sb; if (Live.LABEL[sb]) Live.watch(sb); } }
    if (section !== s || sb) { section = s; H('light'); scrollTo({ top: 0 }); render(); } }
  function placeDock() { const btns = $$('#dock button'); const i = btns.findIndex(b => b.dataset.go === section); btns.forEach((b, j) => b.classList.toggle('on', j === i)); const b = btns[i], pill = $('#pill'); if (!b) return;
    if (matchMedia('(min-width:1000px)').matches) { pill.style.removeProperty('width'); pill.style.setProperty('transform', `translateY(${b.offsetTop}px)`); }
    else { pill.style.setProperty('width', '22px'); pill.style.setProperty('transform', `translateX(${b.offsetLeft + (b.offsetWidth - 22) / 2}px)`); } }

  /* ── ticker ── */
  function tape() {
    if (!D) return; const items = []; const tk = (n, v, c, extra = '') => `<span class="tk"${extra}><b>${esc(n)}</b><span class="px">${v}</span><span class="${cls(c)}">${pct(c)}</span></span>`;
    const I = (D.markets || {}).indices || {}; [['Nifty', 'NIFTY'], ['BankNifty', 'BANK'], ['VIX', 'VIX']].forEach(([k, n]) => { const x = I[k]; if (x) items.push(tk(n, nf(x.ltp, 2), x.change_pct)); });
    [['USDINR=X', 'USDINR'], ['BZ=F', 'BRENT'], ['GC=F', 'GOLD'], ['ES=F', 'SPX FUT'], ['^TNX', 'US10Y']].forEach(([s, n]) => { const q = quote(s); if (q && q.p != null) items.push(tk(n, px(q.p), q.cp)); });
    ['BTC', 'ETH', 'SOL'].forEach(s => { const x = Live.px[s] || ((D.crypto || {}).prices || {})[s]; if (x) items.push(tk(s, px(x.price), x.change_pct, ` data-c="${s}"`)); });
    const w = W(); if (w && w.risk) items.push(`<span class="tk"><b>RISK</b><span class="${w.risk.level <= 2 ? 'dn' : 'gold'}">L${w.risk.level}/5</span></span>`);
    [].concat(...['cricket', 'nfl', 'nba', 'soccer', 'nhl'].map(s => ((sportData(s) || {}).games || []).filter(g => g.state === 'in').slice(0, 2))).slice(0, 6).forEach(g => items.push(`<span class="tk"><i class="dot live"></i><b>${esc((g.competitors || []).map(c => c.abbr || c.name).join(' v '))}</b><span>${esc((g.competitors || []).map(c => c.score).join(' – '))}</span></span>`));
    const track = $('#tape'); const html = items.join(''); if (track.dataset.h === html) return; track.dataset.h = html; track.innerHTML = html + html;
    track.style.setProperty('animation-duration', Math.max(40, items.length * 7) + 's');
  }

  /* ── data loop ── */
  async function poll() {
    clearTimeout(pollT); if (!Feed.unlocked) return;
    try { const d = await Feed.refresh(); if (d) { D = d; if (window.Chi) Chi.watchPrices(D, toast); if (!(section === 'sports' && Live.sports[sub.sports])) render({ keepScroll: true, quiet: true }); else tape(); } }
    catch (e) { if (e.code === 'REKEY') { lock('This login key is no longer valid.'); return; } freshness(true); }
    pollT = setTimeout(poll, POLL_MS);
  }
  function freshness(err) { const b = $('#fresh'); if (!D) return; const a = Date.now() / 1000 - D.ts; b.classList.toggle('stale', a > 900 && a <= 3600); b.classList.toggle('dead', a > 3600 || !!err); $('span', b).textContent = ago(D.ts); }

  ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (!Feed.unlocked) return;
    const idle = Date.now() - lastAct; const f = Math.min(1, idle / IDLE_MS);
    const c = $('.idle-ring circle'); c && c.style.setProperty('stroke-dashoffset', (100.5 * f).toFixed(1));
    const lb = $('#lock'); if (lb) lb.classList.toggle('warn', f > .8);
    const cl = $('#clock'); if (cl) cl.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    freshness(); if (idle >= IDLE_MS) lock('Locked after 10 minutes idle.');
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Feed.unlocked && Date.now() - lastAct >= IDLE_MS) lock('Locked after 10 minutes idle.'); });

  function lock(msg) {
    Feed.lock(); if (window.Play) Play.lock(); Live.stop(); unsub && unsub(); clearTimeout(pollT); D = null;
    $('#view').innerHTML = ''; $('#tape').innerHTML = ''; $('#tape').dataset.h = ''; for (const k in prevScore) delete prevScore[k];
    const app = $('#app'); app.classList.add('hidden'); app.classList.remove('reveal'); app.setAttribute('aria-hidden', 'true');
    const g = $('#gate'); g.classList.remove('hidden', 'leaving', 'working', 'bad');
    const pass = $('#pass'); if (pass) pass.value = '';
    gateMsg(msg || ''); H('medium');
  }
  window.SOBOT = Object.freeze({ lock: () => Feed.unlocked && lock('Locked.') });

  const gateMsg = (t, err) => { const m = $('#gate-msg'); if (!m) return; m.textContent = t; m.classList.toggle('err', !!err); };
  const shake = () => { const f = $('#unlock'); if (!f) return; f.classList.add('shake'); setTimeout(() => f.classList.remove('shake'), 450); };
  async function unlock(login) {
    const g = $('#gate'), btn = $('#go');
    if (!login || !login.trim()) { gateMsg('Enter a login key', true); H('error'); shake(); return; }
    if (btn) btn.disabled = true; g.classList.add('working'); g.classList.remove('bad'); gateMsg('Opening sealed feed…'); H('light');
    try {
      const d = await Feed.unlock(login);
      if (window.Play) await Play.boot(login);
      if (window.Chi9) Chi9.boot();
      if (window.Teach) setTimeout(() => Teach.open(), 700);
      const pass = $('#pass'); if (pass) pass.value = '';
      D = d; lastAct = Date.now(); H('success'); gateMsg('');
      g.classList.add('leaving'); const app = $('#app'); app.classList.remove('hidden'); app.classList.add('reveal');
      app.addEventListener('animationend', function rv(e) { if (e.target === app) { app.classList.remove('reveal'); app.removeEventListener('animationend', rv); } });
      app.setAttribute('aria-hidden', 'false');
      setTimeout(() => g.classList.add('hidden'), 520);
      section = 'home'; render(); Live.start(); unsub = Live.sub(onLive); pollT = setTimeout(poll, POLL_MS);
    } catch (e) {
      g.classList.add('bad'); H('error'); shake();
      gateMsg(e.code === 'BAD' ? 'That login key does not open this feed.' : (e.message || 'Could not reach the feed'), true);
    } finally { if (btn) btn.disabled = false; g.classList.remove('working'); }
  }
  function onLive(type, x) {
    if (!D) return;
    if (type === 'px') $$(`[data-c="${x.sym}"]`).forEach(t => { const n = $('.px', t); if (n) n.textContent = px(x.d.price); const c = $('.chg', t); if (c) { c.textContent = pct(x.d.change_pct); c.className = 'chg ' + cls(x.d.change_pct); } const r = $('.inr', t); if (r) r.textContent = inrS(x.d.price * fx());
      if (x.d.dir && t.classList.contains('tk')) { t.classList.remove('flash-up', 'flash-down'); void t.offsetWidth; t.classList.add(x.d.dir > 0 ? 'flash-up' : 'flash-down'); } });
    if (type === 'fut' && section === 'pulse' && sub.pulse === 'crypto') render({ keepScroll: true, quiet: true });
    if (type === 'sport') { if (section === 'sports' && sub.sports === x.sport) { render({ keepScroll: true, quiet: true }); if ($('.bump', $('#view'))) H('light'); } tape(); }
  }

  /* ── events ── */
  $('#unlock').addEventListener('submit', (e) => { e.preventDefault(); unlock($('#pass').value); });
  $('#peek').addEventListener('click', () => { const i = $('#pass'); const on = i.type === 'password'; i.type = on ? 'text' : 'password'; $('#peek').classList.toggle('on', on); H('light'); });
  $('#lock').addEventListener('click', () => lock('Locked.'));
  const lb=$('#langbtn'); if(lb) lb.addEventListener('click', () => { if(window.Chi){ Chi.toggleLang(); toast(Chi.t('lang')==='English'?'Hindi':'English'); render({keepScroll:true,quiet:true}); }});
  const ab=$('#alertbtn'); if(ab) ab.addEventListener('click', () => { if(window.Chi) Chi.enableAlerts(toast); });
  $('#fresh').addEventListener('click', () => { H('light'); toast('Refreshing…'); poll(); });
  $('#dock').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.go); });
  $('#view').addEventListener('click', (e) => {
    const tv = e.target.closest('[data-tv]');
    if (tv) { e.preventDefault(); const st=$('#tv-stage'); if(st){ st.classList.remove('hidden'); st.innerHTML='<iframe src="'+tv.dataset.tv+'" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="'+ (tv.dataset.title||'Live') +'"></iframe>'; } return; }
    const c9 = e.target.closest('[data-chi9]');
    if (c9 && window.Chi9) { e.preventDefault(); Chi9.handle(c9.dataset.chi9, D, toast, render); return; }
    const pact = e.target.closest('[data-play]');
    if (pact && window.Play) { e.preventDefault(); Play.handle(pact.dataset.play, D, toast); render({keepScroll:true,quiet:true}); return; }
    const s = e.target.closest('[data-sub]'); if (s) { const key = s.closest('[data-seg]').dataset.seg; if (sub[key] !== s.dataset.sub) { sub[key] = s.dataset.sub; H('light');
      if (key === 'sports') { if (Live.LABEL[s.dataset.sub]) Live.watch(s.dataset.sub); else Live.unwatch(); } render({ keepScroll: !['sports', 'pulse', 'world', 'tools', 'play'].includes(key) }); } return; }
    const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); const [a, b] = j.dataset.jump.split(':'); go(a, b); return; }
    const sp = e.target.closest('[data-sport]'); if (sp && Live.LABEL[sp.dataset.sport]) { sub.sports = sp.dataset.sport; Live.watch(sp.dataset.sport); H('light'); render(); }
  });
  addEventListener('resize', () => { placeDock(); placeSeg(document, false); });

  if ('serviceWorker' in navigator && location.protocol === 'https:' && !NATIVE) navigator.serviceWorker.register('sw.js').catch(() => {});
  setTimeout(() => { const p = $('#pass'); p && p.focus(); }, 400);
})();
