/* CHI-9 Sobot tools: screener, IPO, deals, funds, portfolio, watchlist, crypto INR,
   social, learn, Nifty predict, referral, clubs, themes. Device-only personal data.
   Sobo Coins stay play-money: they cannot be bought, cashed out, transferred or redeemed. */
(() => {
  'use strict';
  const LESSONS = {
    en: [
      { id: 'index', t: 'What an index is', b: 'Nifty 50 and Sensex are baskets of stocks. One number summarises many companies. A change in the index is not a tip to buy or sell any one name.' },
      { id: 'delay', t: 'Delayed prints', b: 'Prices you see here can lag the live tape. Treat them as a snapshot, not a match-winning quote, and never as personal advice.' },
      { id: 'sip', t: 'SIP in two minutes', b: 'A SIP invests a fixed amount at a regular interval. The calculator on this desk is a what-if on past NAVs, not a promise of future returns.' },
      { id: 'ipo', t: 'IPO subscription', b: '“Times subscribed” is official demand versus shares offered. Grey-market premium is not an official NSE field and is not shown here. Listing day can still go either way.' },
      { id: 'deals', t: 'Bulk, block, insider', b: 'Bulk and block deals are large exchange trades published by NSE. Insider (PIT) filings are disclosures, not a buy or sell call.' },
      { id: 'coins', t: 'Sobo Coins are play money', b: 'Coins, streaks and paper books are a game. They cannot be bought, cashed out, transferred or redeemed, and they are not a prize or a security.' }
    ],
    hi: [
      { id: 'index', t: 'इंडेक्स क्या है', b: 'निफ्टी 50 और सेंसेक्स कई शेयरों की टोकरी हैं। एक संख्या कई कंपनियों का सार है। यह किसी एक शेयर को खरीदने या बेचने की सलाह नहीं है।' },
      { id: 'delay', t: 'विलंबित कीमत', b: 'यहाँ दिखने वाली कीमत लाइव टेप से पीछे हो सकती है। इसे स्नैपशॉट मानें, सलाह नहीं।' },
      { id: 'sip', t: 'SIP दो मिनट में', b: 'SIP नियमित अंतराल पर एक तय रकम लगाता है। यहाँ कैलकुलेटर पिछले NAV पर आधारित एक hypothetical है, भविष्य की गारंटी नहीं।' },
      { id: 'ipo', t: 'IPO सब्सक्रिप्शन', b: '“टाइम्स सब्सक्राइब्ड” आधिकारिक मांग है। ग्रे-मार्केट प्रीमियम यहाँ नहीं दिखाया जाता। लिस्टिंग दिन किसी भी दिशा में जा सकता है।' },
      { id: 'deals', t: 'बल्क, ब्लॉक, इनसाइडर', b: 'बल्क और ब्लॉक सौदे NSE द्वारा प्रकाशित बड़े ट्रेड हैं। PIT फाइलिंग प्रकटीकरण हैं, खरीद-फरोख्त की सलाह नहीं।' },
      { id: 'coins', t: 'सोबो कॉइन खेल मुद्रा हैं', b: 'कॉइन, स्ट्रीक और पेपर बुक एक खेल हैं। इन्हें खरीदा, भुनाया, ट्रांसफर या रिडीम नहीं किया जा सकता।' }
    ]
  };

  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const lang = () => (window.Chi && Chi.t && Chi.t('lang') === 'हिन्दी') ? 'hi' : 'en';
  const sid = () => (window.Play && Play.sid && Play.sid()) || 'anon';
  const ls = (k, d) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o == null ? d : o; } catch (e) { return d; } };
  const sv = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} };

  function desk() { return ls('sobot-desk-' + sid(), { portfolio: [], watch: [] }); }
  function saveDesk(o) { sv('sobot-desk-' + sid(), o); }
  function learn() { return ls('sobot-learn-' + sid(), { done: {} }); }
  function pred() { return ls('sobot-pred-' + sid(), { day: '', pick: '', settled: false, streak: 0, best: 0, hist: [] }); }
  function ref() {
    const o = ls('sobot-ref-' + sid(), null);
    if (o && o.code) return o;
    const code = 'SB' + sid().slice(0, 6).toUpperCase();
    const n = { code, used: false, referred: 0 };
    sv('sobot-ref-' + sid(), n);
    return n;
  }
  function clubs() { return ls('sobot-club-' + sid(), { code: '', name: '', chat: [] }); }

  function C9() { return (window.D && D.chi9) || (typeof D !== 'undefined' && D && D.chi9) || {}; }
  function chi(D) { return (D && D.chi9) || {}; }

  function theme() { try { return localStorage.getItem('sobot-theme') || 'dark'; } catch (e) { return 'dark'; } }
  function applyTheme(name) {
    const t = name === 'light' ? 'light' : 'dark';
    try { localStorage.setItem('sobot-theme', t); } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
    if (window.SobotNative && SobotNative.setTheme) { try { SobotNative.setTheme(t); } catch (e) {} }
  }

  function nudgeWidget(D) {
    if (!(window.SobotNative && SobotNative.updateWidget)) return;
    try {
      const I = (D && D.markets && D.markets.indices) || {};
      const n = I.Nifty || {};
      const px = n.ltp == null ? '—' : String(n.ltp);
      const cp = n.change_pct == null ? '' : ((n.change_pct >= 0 ? '+' : '') + Number(n.change_pct).toFixed(2) + '%');
      const asof = (D && D.ist) || '';
      SobotNative.updateWidget(px, cp, asof);
    } catch (e) {}
  }

  function pxOf(D, sym) {
    const M = D && D.markets || {};
    const lists = ((M.movers || {}).lists) || {};
    for (const k of Object.keys(lists)) {
      const sides = lists[k] || {};
      const rows = [].concat(sides.gainers || [], sides.losers || []);
      const r = rows.find(x => x && x.symbol === sym);
      if (r) return { ltp: r.ltp, cp: r.change_pct };
    }
    const I = M.indices || {};
    if (sym === 'NIFTY' && I.Nifty) return { ltp: I.Nifty.ltp, cp: I.Nifty.change_pct };
    if (sym === 'BANKNIFTY' && I.BankNifty) return { ltp: I.BankNifty.ltp, cp: I.BankNifty.change_pct };
    return null;
  }

  function checkWatch(D, toast) {
    const d = desk(); let dirty = false;
    const day = today();
    (d.watch || []).forEach(w => {
      const q = pxOf(D, w.s);
      if (!q || q.cp == null || !w.pct) return;
      if (Math.abs(q.cp) >= Number(w.pct) && w.last !== day) {
        w.last = day; dirty = true;
        if (toast) toast((w.s || '') + ' ' + (q.cp >= 0 ? '+' : '') + Number(q.cp).toFixed(2) + '% (watch alert)');
      }
    });
    if (dirty) saveDesk(d);
  }

  function settlePredict(D) {
    const st = pred();
    const rec = (D && D.markets && D.markets.recap) || {};
    const I = (D && D.markets && D.markets.indices) || {};
    const nif = I.Nifty || {};
    const day = today();
    if (st.day && st.day !== day && st.pick && !st.settled) {
      const cp = nif.change_pct;
      // if we still have yesterday's recap-like change, skip; we settle when a new day has a print
    }
    if (st.day === day && st.pick && !st.settled && nif.change_pct != null && (D.markets && D.markets.session && D.markets.session.state === 'closed')) {
      const up = nif.change_pct >= 0;
      const win = (st.pick === 'up' && up) || (st.pick === 'down' && !up);
      st.settled = true;
      st.streak = win ? (st.streak || 0) + 1 : 0;
      st.best = Math.max(st.best || 0, st.streak || 0);
      st.hist = [{ d: day, pick: st.pick, cp: nif.change_pct, win }].concat(st.hist || []).slice(0, 14);
      sv('sobot-pred-' + sid(), st);
      if (win && window.Play && Play.grant) Play.grant(40, 'predict');
    }
  }

  function ads(u) {
    const p = (window.SOBOT_CFG && SOBOT_CFG.premium) || {};
    const ads = p.ads || {};
    if (p.enabled || !ads.enabled) {
      return u.P(`<div class="once"><b>Plans · not active</b>
        <p class="hint">Free tier will show ads only after a payments account exists. A cheaper plan is ready at ₹499 / month, and the earlier $333 / 3 months plan remains as an option. Nothing is charged and nothing is locked until a Razorpay or Stripe account is connected.</p></div>`);
    }
    return `<div class="ads-slot on" aria-hidden="true"><span>Ad · free tier</span></div>`;
  }

  /* ── Markets extras ── */
  function screener(D, u) {
    const S = (chi(D).screener || {}).presets || {};
    const labs = [
      ['nifty_up', 'Nifty gainers'], ['nifty_down', 'Nifty losers'],
      ['fo_up', 'F&O up'], ['fo_down', 'F&O down'],
      ['all_up', 'All gainers'], ['all_down', 'All losers'],
      ['breakouts', 'Breakouts']
    ];
    const rows = (arr) => (arr || []).map(r => `<tr><td class="l">${u.esc(r.s || '')} <button type="button" class="linkish" data-chi9="watch:${u.esc(r.s || '')}">+ watch</button></td><td class="r">${u.nf(r.ltp, 2)}</td><td class="r ${u.cls(r.cp)}">${u.pct(r.cp)}</td><td class="r">${u.esc(r.vol || r.rule || '')}</td></tr>`);
    const blocks = labs.map(([k, lab]) => {
      const arr = S[k] || [];
      return `${u.head(lab, arr.length + ' names')}
        ${u.P(u.T(['Symbol', ['Last', 'r'], ['Chg', 'r'], ['Vol / rule', 'r']], rows(arr), 'No rows in this preset today'))}`;
    }).join('');
    return `<p class="lead">Presets from the delayed NSE movers tape and the desk breakout list. Not a recommendation.</p>${blocks}${u.src((chi(D).screener || {}).src || '')}`;
  }

  function ipo(D, u) {
    const I = chi(D).ipo || {};
    const cur = (I.current || []).map(r => {
      const t = r.times == null ? '—' : (Number(r.times).toFixed(2) + '×');
      return `<tr><td class="l">${u.esc(r.name || r.sym || '')}<small>${u.esc(r.sym || '')} · ${u.esc(r.start || '')} – ${u.esc(r.end || '')}</small></td><td class="r">${u.esc(r.price || '—')}</td><td class="r">${t}</td><td class="r">${u.esc(r.status || '')}</td></tr>`;
    });
    const up = (I.upcoming || []).map(r => `<tr><td class="l">${u.esc(r.companyName || r.name || r.symbol || JSON.stringify(r).slice(0, 80))}</td></tr>`).join('');
    return `${u.head('Live / current IPO', 'official NSE subscription')}
      ${u.P(u.T(['Issue', ['Price', 'r'], ['Subscribed', 'r'], ['Status', 'r']], cur, 'No current IPO in this pull'))}
      ${u.head('Upcoming', 'official NSE list')}
      ${u.P(up ? `<table class="t"><tbody>${up}</tbody></table>` : '<p class="lead">No upcoming IPO print in this pull.</p>')}
      ${u.head('GMP / listing results', '')}
      ${u.P(`<p class="lead">Grey-market premium is not an official NSE field, so it is not shown. Listing-day results will appear here when the official feed carries them.</p>`)}
      ${u.src(I.src || '')}`;
  }

  function deals(D, u) {
    const X = chi(D).deals || {};
    const row = (r) => `<tr><td class="l">${u.esc(r.s || '')}<small>${u.esc(r.name || '')}</small></td><td>${u.esc(r.side || '')}</td><td class="r">${u.esc(String(r.qty || ''))}</td><td class="r">${u.esc(String(r.px || ''))}</td><td class="l">${u.esc(r.client || r.person || '')}</td><td>${u.esc(r.d || '')}</td></tr>`;
    const th = ['Name', 'Side', ['Qty', 'r'], ['Avg', 'r'], ['Client / person', 'l'], 'Date'];
    return `${u.head('Bulk deals', X.asof ? ('as of ' + X.asof) : 'NSE large-deal snapshot')}
      ${u.P(u.T(th, (X.bulk || []).map(row), 'No bulk deals in this pull'))}
      ${u.head('Block deals', '')}
      ${u.P(u.T(th, (X.block || []).map(row), 'No block deals in this pull'))}
      ${u.head('Insider (PIT) filings', '')}
      ${u.P(u.T(th, (X.insider || []).map(row), 'No insider filings in this pull'))}
      ${u.src(X.src || '')}`;
  }

  /* ── Tools ── */
  function sipFV(pmt, annual, years) {
    const n = years * 12, r = Math.pow(1 + annual, 1 / 12) - 1;
    if (!n || !pmt) return 0;
    if (Math.abs(r) < 1e-12) return pmt * n;
    return pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }
  function whatIf(fund, pmt) {
    const pts = fund.y5 || [];
    if (!pts.length || !pmt) return null;
    // walk the sparse 5y series as SIP units
    let units = 0, invested = 0, last = pts[0].nav;
    const step = Math.max(1, Math.round(pts.length / 60));
    for (let i = 0; i < pts.length; i += step) {
      const nav = pts[i].nav;
      if (!nav) continue;
      units += pmt / nav; invested += pmt; last = nav;
    }
    return { invested, value: units * last, units };
  }

  function funds(D, u) {
    const list = (chi(D).funds || {}).list || [];
    const rows = list.filter(f => f.nav && !f.error).map(f => {
      const r = f.ret || {};
      return `<tr><td class="l">${u.esc(f.name || '')}<small>${u.esc(f.house || '')} · NAV ${u.nf(f.nav, 4)} · ${u.esc(f.asof || '')}</small></td>
        <td class="r ${u.cls(r.y1)}">${r.y1 == null ? '—' : u.pct(r.y1)}</td>
        <td class="r ${u.cls(r.y3)}">${r.y3 == null ? '—' : u.pct(r.y3)}</td>
        <td class="r ${u.cls(r.y5)}">${r.y5 == null ? '—' : u.pct(r.y5)}</td></tr>`;
    });
    const opts = list.filter(f => f.nav).map(f => `<option value="${f.code}">${u.esc(f.name || f.code)}</option>`).join('');
    return `${u.head('Compare funds', 'direct-plan growth where available · past NAVs')}
      ${u.P(u.T(['Fund', ['1y', 'r'], ['3y', 'r'], ['5y', 'r']], rows, 'Fund NAVs unavailable'))}
      ${u.head('SIP calculator / 5-year what-if', 'runs on this device')}
      ${u.P(`<div class="issue wrap">
        <label>Monthly ₹ <input id="sip-pmt" type="number" min="100" step="100" value="5000"></label>
        <label>Years <input id="sip-yr" type="number" min="1" max="30" value="5"></label>
        <label>Assumed annual % <input id="sip-cagr" type="number" step="0.1" value="12"></label>
        <label>Fund <select id="sip-fund">${opts}</select></label>
        <button type="button" class="act" data-chi9="sip">Calculate</button>
      </div>
      <div id="sip-out" class="lead"></div>`)}
      ${u.src((chi(D).funds || {}).src || '')}`;
  }

  function portfolio(D, u) {
    const d = desk();
    const rows = (d.portfolio || []).map((h, i) => {
      const q = pxOf(D, h.s) || {};
      const val = (q.ltp && h.qty) ? q.ltp * h.qty : null;
      const pnl = (val != null && h.avg) ? val - h.avg * h.qty : null;
      return `<tr><td class="l">${u.esc(h.s)}</td><td class="r">${u.nf(h.qty, 2)}</td><td class="r">${u.nf(h.avg, 2)}</td><td class="r">${q.ltp == null ? '—' : u.nf(q.ltp, 2)}</td><td class="r ${u.cls(pnl)}">${pnl == null ? '—' : u.sInrS(pnl)}</td><td><button type="button" class="linkish" data-chi9="port-del:${i}">Remove</button></td></tr>`;
    });
    return `${u.head('Portfolio', 'manual entry · stored only on this device')}
      ${u.P(`<p class="lead">Holdings never leave this device. There is no cloud copy and no broker link.</p>
        <div class="issue wrap">
          <input id="port-s" placeholder="Symbol, e.g. RELIANCE" maxlength="24" autocapitalize="characters">
          <input id="port-qty" type="number" step="1" min="0" placeholder="Qty">
          <input id="port-avg" type="number" step="0.01" min="0" placeholder="Avg price">
          <button type="button" class="act" data-chi9="port-add">Add</button>
        </div>
        ${u.T(['Symbol', ['Qty', 'r'], ['Avg', 'r'], ['Last', 'r'], ['P&L', 'r'], ''], rows, 'No holdings yet')}`)}`;
  }

  function watchlist(D, u) {
    const d = desk();
    const rows = (d.watch || []).map((w, i) => {
      const q = pxOf(D, w.s) || {};
      return `<tr><td class="l">${u.esc(w.s)}</td><td class="r ${u.cls(q.cp)}">${q.ltp == null ? '—' : u.nf(q.ltp, 2)}</td><td class="r ${u.cls(q.cp)}">${q.cp == null ? '—' : u.pct(q.cp)}</td><td class="r">${u.esc(String(w.pct || 3))}%</td><td><button type="button" class="linkish" data-chi9="watch-del:${i}">Remove</button></td></tr>`;
    });
    return `${u.head('Watchlist & alerts', 'on this device · delayed prints')}
      ${u.P(`<div class="issue wrap">
        <input id="watch-s" placeholder="Symbol" maxlength="24" autocapitalize="characters">
        <input id="watch-pct" type="number" min="1" step="0.5" value="3" aria-label="Alert percent">
        <button type="button" class="act" data-chi9="watch-add">Add</button>
      </div>
      ${u.T(['Symbol', ['Last', 'r'], ['Chg', 'r'], ['Alert', 'r'], ''], rows, 'No names watched yet')}
      <p class="lead">A toast appears once per IST day when a watched name’s delayed move reaches your threshold.</p>`)}`;
  }

  function crypto(D, u) {
    const C = chi(D).crypto || {};
    const rows = (C.inr || []).map(r => `<tr><td class="l">${u.esc(r.s)}<small>${u.esc(r.src || '')}</small></td><td class="r">${u.nf(r.px, r.px >= 100 ? 2 : 4)}</td><td class="r ${u.cls(r.cp)}">${r.cp == null ? '—' : u.pct(r.cp)}</td><td class="r">${u.nf(r.vol, 0)}</td></tr>`);
    const fund = (C.funding || []).map(r => `<tr><td class="l">${u.esc(r.s)}</td><td class="r ${u.cls(r.rate)}">${r.rate == null ? '—' : u.pct(r.rate)}</td><td class="r">${u.nf(r.mark, 2)}</td></tr>`);
    return `${u.head('Crypto corner · INR', 'CoinDCX / WazirX public tickers')}
      ${u.P(u.T(['Coin', ['INR last', 'r'], ['24h', 'r'], ['Volume', 'r']], rows, 'No INR tickers in this pull'))}
      ${u.head('Funding', 'Binance public premium index when reachable')}
      ${u.P(fund ? u.T(['Coin', ['Funding %', 'r'], ['Mark', 'r']], fund, '') : `<p class="lead">${u.esc(C.liq || 'Funding was not reachable from the box in this pull.')}</p>`)}
      ${u.P(`<p class="lead">${u.esc(C.liq || '')}</p>`)}
      ${u.src(C.src || '')}`;
  }

  function social(D, u) {
    const S = chi(D).social || {};
    const items = (S.items || []).map(it => `<a class="li" href="${u.esc(it.link || '#')}" target="_blank" rel="noopener noreferrer"><div class="t"><b>${u.esc(it.title || '')}</b><div class="mu">${u.esc(it.source || '')}${it.kind ? ' · ' + u.esc(it.kind) : ''}</div></div></a>`).join('');
    return `${u.head('Social buzz', 'free public sources')}
      ${u.P(items || '<p class="lead">No public buzz items in this pull.</p>')}
      ${u.src(S.src || '')}`;
  }

  function themePanel(u) {
    const t = theme();
    return `${u.head('Appearance', 'saved on this device')}
      ${u.P(`<div class="issue"><button type="button" class="act ${t === 'dark' ? 'on' : ''}" data-chi9="theme:dark">Dark</button>
        <button type="button" class="act ${t === 'light' ? 'on' : ''}" data-chi9="theme:light">Light</button></div>
        <p class="lead">The Android home-screen widget, when the app is installed, shows the last delayed Nifty print seen after unlock.</p>`)}`;
  }

  function tools(D, u, sub) {
    const tab = sub || 'desk';
    const segs = u.segHtml('tools', [['desk', 'Desk'], ['funds', 'Funds'], ['crypto', 'Crypto'], ['social', 'Buzz'], ['theme', 'Theme']]);
    const body = tab === 'funds' ? funds(D, u)
      : tab === 'crypto' ? crypto(D, u)
      : tab === 'social' ? social(D, u)
      : tab === 'theme' ? themePanel(u) + ads(u)
      : (portfolio(D, u) + watchlist(D, u) + ads(u));
    return segs + body;
  }

  /* ── Play extras ── */
  function playSeg(u) {
    return u.segHtml('play', [['games', 'Games'], ['learn', 'Learn'], ['predict', 'Predict'], ['clubs', 'Clubs'], ['refer', 'Refer']]);
  }

  function playPanel(tab, D, u) {
    if (tab === 'learn') return learnPanel(u);
    if (tab === 'predict') return predictPanel(D, u);
    if (tab === 'clubs') return clubsPanel(u);
    if (tab === 'refer') return referPanel(u);
    return '';
  }

  function learnPanel(u) {
    const L = LESSONS[lang()] || LESSONS.en;
    const st = learn();
    const cards = L.map(x => {
      const done = !!(st.done || {})[x.id];
      return `<div class="once"><b>${u.esc(x.t)}</b><p class="hint">${u.esc(x.b)}</p>
        ${done ? '<p class="lead">Done · 50 coins already granted.</p>' : `<button type="button" class="ack" data-chi9="learn:${x.id}">Mark done · +50 coins</button>`}
      </div>`;
    }).join('');
    return `${u.head('Learn mode', 'two-minute lessons · Hindi and English · play-money coins')}
      ${u.P(cards)}`;
  }

  function predictPanel(D, u) {
    const st = pred();
    const I = (D && D.markets && D.markets.indices) || {};
    const nif = I.Nifty || {};
    const day = today();
    const picked = st.day === day ? st.pick : '';
    const board = (st.hist || []).map(h => `<tr><td>${u.esc(h.d)}</td><td>${u.esc(h.pick)}</td><td class="${u.cls(h.cp)}">${u.pct(h.cp)}</td><td>${h.win ? 'Hit' : 'Miss'}</td></tr>`);
    return `${u.head('Daily Nifty up / down', 'play money · one pick per IST day')}
      ${u.P(`<p class="lead">Last delayed Nifty: ${nif.ltp == null ? '—' : u.nf(nif.ltp, 2)} (${nif.change_pct == null ? '—' : u.pct(nif.change_pct)}). Pick before the close. A win adds 40 Sobo Coins. Coins cannot be cashed out.</p>
        <div class="kpis"><div class="kpi"><div class="lbl">Streak</div><div class="v">${u.nf(st.streak || 0, 0)}</div></div>
        <div class="kpi"><div class="lbl">Best</div><div class="v">${u.nf(st.best || 0, 0)}</div></div>
        <div class="kpi"><div class="lbl">Today</div><div class="v">${picked ? u.esc(picked) : 'Open'}</div></div></div>
        <div class="issue">
          <button type="button" class="act" data-chi9="pred:up"${picked ? ' disabled' : ''}>Up</button>
          <button type="button" class="act danger" data-chi9="pred:down"${picked ? ' disabled' : ''}>Down</button>
        </div>
        ${u.T(['Day', 'Pick', ['Chg', 'r'], 'Result'], board, 'No settled picks yet')}
        <p class="lead">Leaderboard on this device. A shared board will appear when the sealed feed carries other play-money scores.</p>`)}`;
  }

  function clubsPanel(u) {
    const c = clubs();
    const chat = (c.chat || []).slice(-20).map(m => `<div class="li"><div class="t"><b>${u.esc(m.who || 'you')}</b><div>${u.esc(m.t || '')}</div><div class="mu">${u.esc(m.at || '')}</div></div></div>`).join('');
    return `${u.head('Clubs', 'private group on this device · sealed bus when joined')}
      ${u.P(`<p class="lead">A short club code is the shared secret. Chat stays on this device for now; a sealed bus fan-out is used when the box can reach it. Keep it simple, and do not paste login keys here.</p>
        <div class="issue wrap">
          <input id="club-code" placeholder="Club code" maxlength="12" value="${u.esc(c.code || '')}">
          <input id="club-name" placeholder="Club name" maxlength="32" value="${u.esc(c.name || '')}">
          <button type="button" class="act" data-chi9="club-join">Join / create</button>
        </div>
        ${c.code ? `<p class="lead">You are in “${u.esc(c.name || c.code)}”. Coins on this login: ${window.Play && Play.state ? u.nf((Play.state().coins || 0), 0) : '—' }.</p>
        <div class="issue wrap"><input id="club-msg" placeholder="Message" maxlength="200"><button type="button" class="act" data-chi9="club-say">Send</button></div>
        ${chat || '<p class="lead">No messages yet.</p>'}` : ''}`)}`;
  }

  function referPanel(u) {
    const r = ref();
    return `${u.head('Referral coins', 'play money only')}
      ${u.P(`<p class="lead">Your code: <b>${u.esc(r.code)}</b>. When a friend enters it on their device they get 200 Sobo Coins once, and so do you if you later confirm on a shared board. Today the bonus is granted on this device when a valid code is entered. Coins cannot be bought, cashed out, transferred or redeemed.</p>
        <div class="issue"><input id="ref-code" placeholder="Friend’s code" maxlength="12" ${r.used ? 'disabled' : ''}><button type="button" class="act" data-chi9="ref-use"${r.used ? ' disabled' : ''}>Apply</button></div>
        ${r.used ? '<p class="lead">A referral was already applied on this login.</p>' : ''}`)}`;
  }

  async function handle(act, D, toast, render) {
    if (!act) return false;
    if (act.startsWith('theme:')) { applyTheme(act.slice(6)); if (toast) toast('Theme: ' + act.slice(6)); if (render) render({ keepScroll: true, quiet: true }); return true; }
    if (act.startsWith('watch:') && !act.startsWith('watch-')) {
      const s = act.slice(6).toUpperCase();
      const d = desk();
      if (s && !(d.watch || []).some(w => w.s === s)) { d.watch = (d.watch || []).concat([{ s, pct: 3, last: '' }]); saveDesk(d); if (toast) toast('Watching ' + s); }
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'watch-add') {
      const s = ((document.getElementById('watch-s') || {}).value || '').trim().toUpperCase();
      const pct = Number((document.getElementById('watch-pct') || {}).value) || 3;
      if (!s) { if (toast) toast('Enter a symbol'); return true; }
      const d = desk(); d.watch = (d.watch || []).concat([{ s, pct, last: '' }]); saveDesk(d);
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act.startsWith('watch-del:')) {
      const i = Number(act.slice(10)); const d = desk(); d.watch.splice(i, 1); saveDesk(d);
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'port-add') {
      const s = ((document.getElementById('port-s') || {}).value || '').trim().toUpperCase();
      const qty = Number((document.getElementById('port-qty') || {}).value);
      const avg = Number((document.getElementById('port-avg') || {}).value);
      if (!s || !qty) { if (toast) toast('Enter a symbol and quantity'); return true; }
      const d = desk(); d.portfolio = (d.portfolio || []).concat([{ s, qty, avg }]); saveDesk(d);
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act.startsWith('port-del:')) {
      const i = Number(act.slice(9)); const d = desk(); d.portfolio.splice(i, 1); saveDesk(d);
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'sip') {
      const pmt = Number((document.getElementById('sip-pmt') || {}).value) || 0;
      const yr = Number((document.getElementById('sip-yr') || {}).value) || 5;
      const cagr = (Number((document.getElementById('sip-cagr') || {}).value) || 0) / 100;
      const code = Number((document.getElementById('sip-fund') || {}).value);
      const fv = sipFV(pmt, cagr, yr);
      const fund = ((chi(D).funds || {}).list || []).find(f => f.code === code);
      const w = fund ? whatIf(fund, pmt) : null;
      const el = document.getElementById('sip-out');
      if (el) el.innerHTML = 'Assumed-return future value: ₹ ' + Math.round(fv).toLocaleString('en-IN')
        + (w ? ('. 5-year what-if on past NAVs of ' + (fund.name || '') + ': invested ₹ ' + Math.round(w.invested).toLocaleString('en-IN') + ', value ₹ ' + Math.round(w.value).toLocaleString('en-IN') + '.') : '.');
      return true;
    }
    if (act.startsWith('learn:')) {
      const id = act.slice(6);
      const st = learn();
      if ((st.done || {})[id]) { if (toast) toast('Already completed'); return true; }
      st.done = st.done || {}; st.done[id] = true; sv('sobot-learn-' + sid(), st);
      if (window.Play && Play.grant) Play.grant(50, 'learn');
      if (toast) toast('+50 Sobo Coins (play money only)');
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act.startsWith('pred:')) {
      const pick = act.slice(5);
      const st = pred(); const day = today();
      if (st.day === day && st.pick) { if (toast) toast('Already picked today'); return true; }
      st.day = day; st.pick = pick; st.settled = false; sv('sobot-pred-' + sid(), st);
      if (toast) toast('Picked Nifty ' + pick + ' for today');
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'club-join') {
      const code = ((document.getElementById('club-code') || {}).value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      const name = ((document.getElementById('club-name') || {}).value || '').trim().slice(0, 32);
      if (code.length < 4) { if (toast) toast('Use a short club code (4+ characters)'); return true; }
      sv('sobot-club-' + sid(), { code, name: name || code, chat: (clubs().code === code ? clubs().chat : []) });
      if (toast) toast('Joined ' + (name || code));
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'club-say') {
      const t = ((document.getElementById('club-msg') || {}).value || '').trim().slice(0, 200);
      if (!t) return true;
      const c = clubs();
      c.chat = (c.chat || []).concat([{ who: 'you', t, at: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) }]).slice(-40);
      sv('sobot-club-' + sid(), c);
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    if (act === 'ref-use') {
      const r = ref();
      const code = ((document.getElementById('ref-code') || {}).value || '').trim().toUpperCase();
      if (r.used) { if (toast) toast('Already applied'); return true; }
      if (!code || code === r.code) { if (toast) toast('Enter a friend’s code, not your own'); return true; }
      r.used = true; r.friend = code; sv('sobot-ref-' + sid(), r);
      if (window.Play && Play.grant) Play.grant(200, 'referral');
      if (toast) toast('+200 Sobo Coins (play money only)');
      if (render) render({ keepScroll: true, quiet: true }); return true;
    }
    return false;
  }

  function boot() { applyTheme(theme()); }

  window.Chi9 = Object.freeze({
    boot, applyTheme, nudgeWidget, checkWatch, settlePredict,
    screener, ipo, deals, tools, playSeg, playPanel, handle, ads, theme
  });
  applyTheme(theme());
})();
