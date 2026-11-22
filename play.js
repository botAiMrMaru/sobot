/* Sobot play-money only. Sobo Coins cannot be bought, cashed out, transferred or redeemed. */
(() => {
  'use strict';
  const START = 100000, DAILY = 400, BET = 25;
  const FUN = 'For fun only · play money · cannot be bought, cashed out, transferred or redeemed';
  let id = null, st = null;

  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const week = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const onejan = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-W' + String(Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)).padStart(2, '0');
  };
  async function boot(login) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sobot-play|' + login));
    id = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    st = load();
    grantDaily();
    save();
  }
  function load() {
    try { const o = JSON.parse(localStorage.getItem('sobot-play-' + id) || 'null'); if (o && typeof o.coins === 'number') return o; } catch (e) {}
    return { coins: 2500, paper: START, week: week(), trades: [], positions: {}, lastDaily: '', lastSpin: '', board: 0 };
  }
  function save() {
    if (!id || !st) return;
    try { localStorage.setItem('sobot-play-' + id, JSON.stringify(st)); } catch (e) {}
  }
  function grantDaily() {
    if (st.lastDaily !== today()) { st.coins += DAILY; st.lastDaily = today(); }
    if (st.week !== week()) { st.paper = START; st.positions = {}; st.trades = []; st.week = week(); }
  }
  function pay(n) { if (st.coins < n) return false; st.coins -= n; save(); return true; }
  function win(n) { st.coins += n; save(); }

  /* ── paper book ── */
  function mark(D) {
    const px = {};
    const I = (D && D.markets && D.markets.indices) || {};
    if (I.Nifty) px.NIFTY = I.Nifty.ltp;
    if (I.BankNifty) px.BANKNIFTY = I.BankNifty.ltp;
    (D && D.commodities && D.commodities.futures || []).forEach(f => { if (f.px) px[f.sym || f.name] = f.px; });
    (D && D.crypto && D.crypto.prices || {});
    ['BTC', 'ETH'].forEach(s => { const x = ((D && D.crypto && D.crypto.prices) || {})[s]; if (x && x.price) px[s] = x.price; });
    return px;
  }
  function equity(D) {
    const px = mark(D); let eq = st.paper;
    Object.entries(st.positions).forEach(([s, q]) => { if (px[s] && q) eq += q * px[s]; });
    return { eq, px };
  }
  function trade(sym, qty, D) {
    const { px } = equity(D); const p = px[sym];
    if (!p || !qty) return 'No delayed price for that contract.';
    const cost = qty * p;
    if (qty > 0 && st.paper < cost) return 'Not enough paper cash this week.';
    if (qty < 0 && (st.positions[sym] || 0) + qty < -1e-9) return 'No shorting in the paper game.';
    st.paper -= cost; st.positions[sym] = (st.positions[sym] || 0) + qty;
    if (Math.abs(st.positions[sym]) < 1e-9) delete st.positions[sym];
    st.trades.unshift({ ts: Date.now(), sym, qty, p }); st.trades = st.trades.slice(0, 40);
    save(); return null;
  }

  /* ── games ── */
  const rnd = (n) => Math.floor(Math.random() * n);
  function roulette(bet, kind) {
    if (!pay(bet)) return { err: 'Not enough Sobo Coins.' };
    const n = rnd(37), red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n);
    let payout = 0, hit = 'miss';
    if (kind === 'red' && red) { payout = bet * 2; hit = 'red'; }
    else if (kind === 'black' && n && !red) { payout = bet * 2; hit = 'black'; }
    else if (kind === 'green' && n === 0) { payout = bet * 14; hit = 'zero'; }
    if (payout) win(payout);
    return { n, red: n === 0 ? 'green' : red, payout, hit, coins: st.coins };
  }
  function slot(bet) {
    if (!pay(bet)) return { err: 'Not enough Sobo Coins.' };
    const face = ['◆', '★', '●', '▲', '7'];
    const a = [face[rnd(5)], face[rnd(5)], face[rnd(5)]];
    let payout = 0;
    if (a[0] === a[1] && a[1] === a[2]) payout = a[0] === '7' ? bet * 20 : bet * 8;
    else if (a[0] === a[1] || a[1] === a[2]) payout = bet * 2;
    if (payout) win(payout);
    return { a, payout, coins: st.coins };
  }
  function dailySpin() {
    if (st.lastSpin === today()) return { err: 'Today’s free spin is already used.' };
    st.lastSpin = today();
    const prize = [50, 80, 120, 200, 400, 800][rnd(6)];
    win(prize);
    return { prize, coins: st.coins };
  }
  function bjDeal(bet) {
    if (!pay(bet)) return { err: 'Not enough Sobo Coins.' };
    const draw = () => 1 + rnd(13);
    const val = (h) => { let t = 0, a = 0; h.forEach(c => { const v = Math.min(c, 10); t += v; if (c === 1) a++; }); while (a && t + 10 <= 21) { t += 10; a--; } return t; };
    const face = (c) => (['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'])[c - 1];
    const p = [draw(), draw()], d = [draw(), draw()];
    st._bj = { bet, p, d, done: false };
    save();
    return showBj();
  }
  function showBj() {
    const g = st._bj; if (!g) return { err: 'No hand.' };
    const val = (h) => { let t = 0, a = 0; h.forEach(c => { const v = Math.min(c, 10); t += v; if (c === 1) a++; }); while (a && t + 10 <= 21) { t += 10; a--; } return t; };
    const face = (c) => (['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'])[c - 1];
    return { p: g.p.map(face), d: g.done ? g.d.map(face) : [face(g.d[0]), '?'], pv: val(g.p), dv: g.done ? val(g.d) : null, done: g.done, coins: st.coins, msg: g.msg };
  }
  function bjHit() {
    const g = st._bj; if (!g || g.done) return showBj();
    const draw = () => 1 + rnd(13);
    const val = (h) => { let t = 0, a = 0; h.forEach(c => { const v = Math.min(c, 10); t += v; if (c === 1) a++; }); while (a && t + 10 <= 21) { t += 10; a--; } return t; };
    g.p.push(draw());
    if (val(g.p) > 21) { g.done = true; g.msg = 'Bust.'; save(); }
    return showBj();
  }
  function bjStand() {
    const g = st._bj; if (!g || g.done) return showBj();
    const draw = () => 1 + rnd(13);
    const val = (h) => { let t = 0, a = 0; h.forEach(c => { const v = Math.min(c, 10); t += v; if (c === 1) a++; }); while (a && t + 10 <= 21) { t += 10; a--; } return t; };
    while (val(g.d) < 17) g.d.push(draw());
    const pv = val(g.p), dv = val(g.d);
    g.done = true;
    if (pv > 21) g.msg = 'Bust.';
    else if (dv > 21 || pv > dv) { win(g.bet * 2); g.msg = 'You win.'; }
    else if (pv === dv) { win(g.bet); g.msg = 'Push.'; }
    else g.msg = 'Dealer wins.';
    save(); return showBj();
  }
  const BOARD = ['Start', 'Wheat', 'Tax', 'Gold', 'Chance', 'Cotton', 'Jail', 'Crude', 'Bonus', 'Rice', 'Tax', 'Silver', 'Chance', 'Sugar', 'Port', 'Festival'];
  function boardRoll() {
    if (!pay(15)) return { err: 'Not enough Sobo Coins.' };
    const a = 1 + rnd(6), b = 1 + rnd(6);
    st.board = (st.board + a + b) % BOARD.length;
    const sq = BOARD[st.board];
    let msg = 'Landed on ' + sq + '.', gain = 0;
    if (sq === 'Bonus' || sq === 'Festival') { gain = 80; win(80); msg += ' +80 coins.'; }
    else if (sq === 'Tax' || sq === 'Jail') { msg += ' No payout.'; }
    else if (sq === 'Chance') { gain = rnd(2) ? 50 : 0; if (gain) win(gain); msg += gain ? ' +50 coins.' : ' Nothing this time.'; }
    else if (sq === 'Start') { gain = 40; win(40); msg += ' +40 coins.'; }
    else { gain = 20; win(20); msg += ' +20 coins.'; }
    save(); return { a, b, sq, pos: st.board, msg, coins: st.coins };
  }

  function render(D, u) {
    if (!st) return u.P(`<p class="lead">Unlock Sobot first.</p>`);
    grantDaily(); save();
    const { eq, px } = equity(D);
    const pnl = eq - START;
    const posRows = Object.entries(st.positions).map(([s, q]) => `<tr><td class="l">${u.esc(s)}</td><td class="r">${u.nf(q, 2)}</td><td class="r">${u.px(px[s])}</td><td class="r">${u.inrS((px[s] || 0) * q)}</td></tr>`);
    const syms = Object.keys(px);
    const opts = syms.map(s => `<option value="${u.esc(s)}">${u.esc(s)}</option>`).join('');
    const board = BOARD.map((s, i) => `<span class="sq ${i === st.board ? 'on' : ''}">${u.esc(s)}</span>`).join('');
    return `<div class="play">
      <p class="fun">${FUN}</p>
      ${u.P(`<div class="kpis"><div class="kpi"><div class="lbl">Sobo Coins</div><div class="v gold">${u.nf(st.coins, 0)}</div></div>
        <div class="kpi"><div class="lbl">Paper book</div><div class="v">${u.inrS(eq)}</div></div>
        <div class="kpi"><div class="lbl">Week P&L</div><div class="v ${u.cls(pnl)}">${u.sInrS(pnl)}</div></div>
        <div class="kpi"><div class="lbl">Daily grant</div><div class="v">${st.lastDaily === today() ? 'Done' : '+' + DAILY}</div></div></div>`)}
      ${u.head('Paper trading', '₹1 lakh fake money this week · delayed prints')}
      ${u.P(`<div class="issue"><select id="play-sym">${opts}</select>
        <input id="play-qty" type="number" step="1" min="1" placeholder="Qty" aria-label="Quantity">
        <button type="button" class="act" data-play="buy">Buy</button>
        <button type="button" class="act danger" data-play="sell">Sell</button></div>
        ${u.T(['Contract', ['Qty', 'r'], ['Last', 'r'], ['Value', 'r']], posRows, 'No paper positions this week')}
        <p class="lead">Closes reset every IST week. This is a game on delayed data, not a broker and not a tip.</p>`)}
      ${u.head('Sobo Coins games', 'free daily coins · play money only')}
      ${u.P(`<div class="play-actions">
        <button type="button" class="act" data-play="spin">Daily spin</button>
        <button type="button" class="act" data-play="slot">Slots (25)</button>
        <button type="button" class="act" data-play="red">Roulette red (25)</button>
        <button type="button" class="act" data-play="black">Roulette black (25)</button>
        <button type="button" class="act" data-play="bj">Blackjack (25)</button>
        <button type="button" class="act" data-play="hit">Hit</button>
        <button type="button" class="act" data-play="stand">Stand</button>
        <button type="button" class="act" data-play="board">Board roll (15)</button>
      </div>
      <div id="play-msg" class="lead"></div>
      <div class="board">${board}</div>`)}
      ${u.head('Coin leaderboard', 'this device')}
      ${u.P(`<p class="lead">Sobo Coins on this login: ${u.nf(st.coins, 0)}. A live shared board will appear here once the sealed feed carries other play-money scores. Coins stay on the device and have no cash value.</p>`)}
      ${u.src(FUN)}
    </div>`;
  }
  function handle(act, D, toast) {
    let r;
    if (act === 'buy' || act === 'sell') {
      const sym = (document.getElementById('play-sym') || {}).value;
      const qty = Number((document.getElementById('play-qty') || {}).value);
      const err = trade(sym, act === 'buy' ? qty : -qty, D);
      toast(err || (act === 'buy' ? 'Paper buy filled.' : 'Paper sell filled.'));
      return;
    }
    if (act === 'spin') r = dailySpin();
    else if (act === 'slot') r = slot(BET);
    else if (act === 'red' || act === 'black') r = roulette(BET, act);
    else if (act === 'bj') r = bjDeal(BET);
    else if (act === 'hit') r = bjHit();
    else if (act === 'stand') r = bjStand();
    else if (act === 'board') r = boardRoll();
    if (!r) return;
    const el = document.getElementById('play-msg');
    if (r.err) { toast(r.err); if (el) el.textContent = r.err; return; }
    const msg = r.prize != null ? ('Daily spin: +' + r.prize + ' coins')
      : r.a ? (r.a + ' + ' + r.b + ' · ' + r.msg)
      : r.a && r.a.join ? r.a.join(' ') + (r.payout ? (' +' + r.payout) : '')
      : r.p ? ('You ' + r.p.join(' ') + (r.d ? (' · dealer ' + r.d.join(' ')) : '') + (r.msg ? (' · ' + r.msg) : ''))
      : r.n != null ? ('Ball ' + r.n + (r.payout ? (' · +' + r.payout) : ' · miss'))
      : '';
    if (el) el.textContent = msg; toast(msg || 'OK');
  }
  function lock() { id = null; st = null; }

  window.Play = Object.freeze({ boot, render, handle, lock, label: FUN });
})();
