/* Sobot Play — live-feel games, play-money only.
   Sobo Coins cannot be bought, cashed out, transferred or redeemed. */
(() => {
  'use strict';
  const START = 100000, DAILY = 400;
  const FUN = 'For fun only · play money · cannot be bought, cashed out, transferred or redeemed';
  const BOTS = ['Aarav','Diya','Kabir','Meera','Ishaan','Ananya','Reyansh','Sara','Vivaan','Zara','Arjun','Kiara','Advait','Myra','Rohan'];
  const GAMES = [
    { id: 'roulette', k: 'Live', t: 'Roulette', d: 'Shared wheel · chip stacks · 20s rounds' },
    { id: 'blackjack', k: 'Table', t: 'Blackjack', d: 'Deal, double, split, dealer reveal' },
    { id: 'slots', k: 'Neon', t: 'Slots', d: 'Reel blur, anticipation, mega-win' },
    { id: 'crash', k: 'Live', t: 'Aviator', d: 'Shared flight · cash out before it crashes' },
    { id: 'plinko', k: 'Drop', t: 'Plinko', d: 'Ball, pegs, multiplier buckets' },
    { id: 'mines', k: 'Grid', t: 'Mines', d: 'Pick gems, cash out, avoid mines' },
    { id: 'dice', k: 'Roll', t: 'Dice', d: 'Over / under with a tumbling die' },
    { id: 'board', k: 'Board', t: 'Monopoly', d: 'Animated dice and a walking token' }
  ];
  const MISSIONS = [
    { id: 'play3', t: 'Play 3 tables', n: 3, xp: 40, coins: 50 },
    { id: 'win1', t: 'Bank a win', n: 1, xp: 30, coins: 40 },
    { id: 'bet5', t: 'Place 5 bets', n: 5, xp: 40, coins: 50 }
  ];
  const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const RV_MS = 20000, RV_BET = 12000, CR_MS = 14000;
  const FACES = ['◆','★','●','▲','7','♪'];
  const BOARD = ['Start','Wheat','Tax','Gold','Chance','Cotton','Jail','Crude','Bonus','Rice','Tax','Silver','Chance','Sugar','Port','Festival'];

  let id = null, st = null, root = null, toastFn = () => {};
  let timers = [], raf = 0, audioCtx = null, table = null, feed = [];

  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const week = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const onejan = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-W' + String(Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)).padStart(2, '0');
  };
  const yesterday = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  };
  const $ = (s, r) => (r || root || document).querySelector(s);
  const $$ = (s, r) => [...(r || root || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const nf = (n) => (Number(n) || 0).toLocaleString('en-IN');

  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p || 18); } catch (e) {} }
  function tone(freq, dur, type, gain) {
    if (!st || !st.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.value = gain == null ? 0.05 : gain;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function roundId(ms) { return Math.floor(Date.now() / ms); }
  function phase(ms) { return Date.now() % ms; }

  async function boot(login) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sobot-play|' + login));
    id = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    st = load();
    grantDaily();
    save();
    seedFeed();
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem('sobot-play-' + id) || 'null');
      if (o && typeof o.coins === 'number') {
        if (o.xp == null) o.xp = 0;
        if (o.level == null) o.level = 1;
        if (o.streak == null) o.streak = 0;
        if (o.bet == null) o.bet = 50;
        if (o.sound == null) o.sound = false;
        if (!o.missions || o.missions.day !== today()) o.missions = { day: today(), prog: {}, got: {} };
        return o;
      }
    } catch (e) {}
    return { coins: 2500, paper: START, week: week(), trades: [], positions: {}, lastDaily: '', lastSpin: '', board: 0, xp: 0, level: 1, streak: 0, lastPlayDay: '', bet: 50, sound: false, missions: { day: today(), prog: {}, got: {} } };
  }
  function save() {
    if (!id || !st) return;
    try { localStorage.setItem('sobot-play-' + id, JSON.stringify(st)); } catch (e) {}
  }
  function grantDaily() {
    if (st.lastDaily !== today()) { st.coins += DAILY; st.lastDaily = today(); }
    if (st.week !== week()) { st.paper = START; st.positions = {}; st.trades = []; st.week = week(); }
    if (!st.missions || st.missions.day !== today()) st.missions = { day: today(), prog: {}, got: {} };
  }
  function pay(n) { n = Math.floor(n); if (!n || st.coins < n) return false; st.coins -= n; save(); buzz(12); tone(220, 0.08, 'square', 0.03); return true; }
  function win(n) { n = Math.floor(n); if (n > 0) { st.coins += n; addXp(Math.max(5, Math.round(n / 20))); mission('win1', 1); save(); buzz([10, 40, 18]); tone(880, 0.16, 'triangle', 0.06); } }
  function addXp(n) { st.xp = (st.xp || 0) + n; st.level = Math.max(1, Math.floor(Math.sqrt(st.xp / 80)) + 1); }
  function touch() {
    const t = today();
    if (st.lastPlayDay === t) return;
    st.streak = st.lastPlayDay === yesterday() ? (st.streak || 0) + 1 : 1;
    st.lastPlayDay = t;
    if (st.streak && st.streak % 3 === 0) { st.coins += 80; }
  }
  function mission(key, add) {
    const m = st.missions;
    if (!m || m.got[key]) return;
    m.prog[key] = (m.prog[key] || 0) + add;
    const def = MISSIONS.find((x) => x.id === key);
    if (def && m.prog[key] >= def.n && !m.got[key]) {
      m.got[key] = 1; st.coins += def.coins; addXp(def.xp);
    }
  }
  function bet() { return Math.min(Math.max(25, st.bet || 50), st.coins || 0); }
  function setBet(n) { st.bet = n; save(); paintHud(); }

  function mark(D) {
    const px = {};
    const I = (D && D.markets && D.markets.indices) || {};
    if (I.Nifty) px.NIFTY = I.Nifty.ltp;
    if (I.BankNifty) px.BANKNIFTY = I.BankNifty.ltp;
    ((D && D.commodities && D.commodities.futures) || []).forEach((f) => { if (f.px) px[f.sym || f.name] = f.px; });
    ['BTC', 'ETH'].forEach((s) => { const x = ((D && D.crypto && D.crypto.prices) || {})[s]; if (x && x.price) px[s] = x.price; });
    return px;
  }
  function equity(D) {
    const px = mark(D); let eq = st.paper;
    Object.entries(st.positions || {}).forEach(([s, q]) => { if (px[s] && q) eq += q * px[s]; });
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

  function seedFeed() {
    feed = [];
    const r = rng(hash(today() + '|feed|' + (id || '')));
    for (let i = 0; i < 10; i++) pushFeed(BOTS[Math.floor(r() * BOTS.length)], GAMES[Math.floor(r() * GAMES.length)].t, [25,50,80,100,200,400][Math.floor(r()*6)], r() > 0.42, true);
  }
  function pushFeed(who, game, amt, won, quiet) {
    feed.unshift({ who, game, amt, won, t: Date.now() });
    if (feed.length > 20) feed.pop();
    if (!quiet) paintFeed();
  }
  function leaders() {
    const day = today();
    const rows = BOTS.map((name, i) => {
      const r = rng(hash(day + '|' + name + '|' + i));
      return { name, coins: Math.floor(1600 + r() * 9200), lv: 3 + Math.floor(r() * 12), bot: true };
    });
    rows.push({ name: 'You', coins: st.coins, lv: st.level || 1, you: true });
    rows.sort((a, b) => b.coins - a.coins);
    return rows;
  }

  function hud() {
    return `<div class="hud">
      <div><div class="lbl">Sobo Coins</div><div class="v gold" data-hud="coins">${nf(st.coins)}</div></div>
      <div><div class="lbl">Level ${st.level || 1}</div><div class="v" data-hud="xp">${nf(st.xp || 0)} XP · ${st.streak || 0}d streak</div></div>
      <div><div class="lbl">Bet</div><div class="v">
        <div class="hud-tools">${[25,50,100,250].map((n) => `<button type="button" class="chip-bet${st.bet===n?' on':''}" data-play="bet:${n}">${n}</button>`).join('')}</div>
      </div></div>
      <div><div class="lbl">Sound</div><div class="v"><button type="button" class="snd${st.sound?' on':''}" data-play="sound">${st.sound?'On':'Muted'}</button></div></div>
    </div><p class="fun">${FUN}</p>`;
  }
  function feedBar() {
    const items = feed.concat(feed).map((f) => `<span><b>${esc(f.who)}</b> ${esc(f.game)} <span class="${f.won?'up':'dn'}">${f.won?'+':''}${f.won?nf(f.amt):'bust'}</span></span>`).join('');
    return `<div class="feedbar" aria-label="Who just won"><span class="pip"></span><div class="feed-track">${items || '<span>Live floor warming up…</span>'}</div></div>`;
  }
  function paintHud() {
    if (!root || !st) return;
    const c = $('[data-hud="coins"]'); if (c) c.textContent = nf(st.coins);
    const x = $('[data-hud="xp"]'); if (x) x.textContent = nf(st.xp || 0) + ' XP · ' + (st.streak || 0) + 'd streak';
    $$('.chip-bet').forEach((b) => b.classList.toggle('on', Number(b.dataset.play.slice(4)) === st.bet));
    const s = $('.snd'); if (s) { s.classList.toggle('on', !!st.sound); s.textContent = st.sound ? 'On' : 'Muted'; }
  }
  function paintFeed() {
    if (!root) return;
    const track = $('.feed-track');
    if (!track) return;
    const items = feed.concat(feed).map((f) => `<span><b>${esc(f.who)}</b> ${esc(f.game)} <span class="${f.won?'up':'dn'}">${f.won?'+':''}${f.won?nf(f.amt):'bust'}</span></span>`).join('');
    track.innerHTML = items;
  }

  function lobby() {
    const tiles = GAMES.map((g) => {
      const live = g.id === 'roulette' ? `<span class="live-cd" data-rv-cd></span>` : (g.id === 'crash' ? `<span class="live-cd" data-cr-cd></span>` : '');
      return `<button type="button" class="tile" data-play="open:${g.id}">${live}<div class="k">${esc(g.k)}</div><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></button>`;
    }).join('');
    const ms = MISSIONS.map((m) => {
      const got = !!(st.missions && st.missions.got[m.id]);
      const p = (st.missions && st.missions.prog[m.id]) || 0;
      return `<div class="mission${got?' done':''}"><b>${esc(m.t)}</b><p class="hint">${got ? 'Collected' : p + ' / ' + m.n + ' · +' + m.coins + ' coins'}</p></div>`;
    }).join('');
    const lb = leaders().slice(0, 8).map((r, i) => `<div class="row${r.you?' you':''}"><span class="rk">${i+1}</span><span>${esc(r.name)}</span><span class="gold ml-auto">${nf(r.coins)}</span><span class="hint">Lv ${r.lv}</span></div>`).join('');
    return `<div class="lobby">${tiles}</div>
      ${headish('Daily missions', 'resets midnight IST')}
      <div class="missions">${ms}</div>
      ${headish('Live floor board', 'play money · this login vs house bots')}
      <div class="lb">${lb}</div>
      ${paperStrip()}`;
  }
  function headish(t, s) { return `<div class="h"><h2>${esc(t)}</h2>${s?`<small>${esc(s)}</small>`:''}</div>`; }
  function paperStrip() {
    return `<div class="h"><h2>Paper book</h2><small>₹1 lakh fake money this week · delayed prints</small></div>
      <p class="lead">Open Markets for prices, then come back to place a paper buy. This is a game on delayed data, not a broker and not a tip.</p>`;
  }

  function tableShell(title, body) {
    return `<button type="button" class="back" data-play="lobby">← Floor</button>
      <div class="h"><h2>${esc(title)}</h2><small>Bet ${st.bet} · play money only</small></div>
      <div class="table" data-table="${esc(table)}">${body}</div>`;
  }

  /* ── Roulette (shared clock) ── */
  function rvState() {
    const rid = roundId(RV_MS), p = phase(RV_MS);
    const n = Math.floor(rng(hash('rv|' + rid))() * 37);
    const color = n === 0 ? 'green' : (RED.includes(n) ? 'red' : 'black');
    const betting = p < RV_BET;
    return { rid, p, n, color, betting, left: betting ? Math.ceil((RV_BET - p) / 1000) : Math.ceil((RV_MS - p) / 1000), spin: !betting };
  }
  function rvBots(rid) {
    const r = rng(hash('rvbots|' + rid));
    return BOTS.slice(0, 6 + Math.floor(r() * 5)).map((name) => {
      const kind = ['red','black','green'][Math.floor(r() * 2.15)];
      return { name, kind, amt: [25,50,100][Math.floor(r()*3)] };
    });
  }
  function paintRoulette(force) {
    const box = $('[data-table="roulette"]'); if (!box && !force) return;
    const s = rvState();
    if (st._rv && st._rv.settled !== s.rid && !s.betting) settleRoulette(s);
    if (st._rv && st._rv.rid !== s.rid && s.betting) st._rv = { rid: s.rid, kind: st._rv && st._rv.nextKind, settled: 0 };
    const wheelSpin = s.betting ? (s.rid % 360) : (s.rid % 360) + 1080 + s.n * (360 / 37);
    const ball = s.betting ? (s.p / 20) : 720 + s.n * (360 / 37);
    const kind = st._rv && st._rv.kind;
    const bots = rvBots(s.rid).map((b) => `<span>${esc(b.name)} · ${b.kind} ${b.amt}</span>`).join('');
    const html = `<div class="table-stage">
        <div class="roulette-wheel" style="--spin:${wheelSpin}deg"><div class="hub"></div><i class="roulette-ball" style="--ball:${ball}deg"></i></div>
        <div class="rv-cd">${s.betting ? ('Bets close in ' + s.left + 's') : ('Ball · ' + s.n + ' ' + s.color)}</div>
        <div class="rv-bets">
          <button type="button" class="red${kind==='red'?' on':''}" data-play="rv:red">Red 2×</button>
          <button type="button" class="black${kind==='black'?' on':''}" data-play="rv:black">Black 2×</button>
          <button type="button" class="green${kind==='green'?' on':''}" data-play="rv:green">Zero 14×</button>
          <button type="button" data-play="rv:odd">Odd 2×</button>
        </div>
        <div class="bots">${bots}</div>
        <div class="result" data-rv-res></div>
      </div>`;
    if (box) {
      const cd = $('.rv-cd', box), wheel = $('.roulette-wheel', box);
      if (cd && wheel && !force) {
        cd.textContent = s.betting ? ('Bets close in ' + s.left + 's') : ('Ball · ' + s.n + ' ' + s.color);
        wheel.style.setProperty('--spin', wheelSpin + 'deg');
        const ballEl = $('.roulette-ball', box);
        if (ballEl) ballEl.style.setProperty('--ball', ball + 'deg');
        const lobbyCd = document.querySelector('[data-rv-cd]');
        if (lobbyCd) lobbyCd.textContent = s.betting ? s.left + 's' : 'SPIN';
        return;
      }
      box.innerHTML = html;
    }
    const lobbyCd = document.querySelector('[data-rv-cd]');
    if (lobbyCd) lobbyCd.textContent = s.betting ? s.left + 's' : 'SPIN';
  }
  function placeRv(kind) {
    const s = rvState();
    if (!s.betting) { toastFn('Wait for the next betting window.'); return; }
    if (st._rv && st._rv.rid === s.rid && st._rv.kind) { toastFn('Already on this spin.'); return; }
    const b = bet(); if (!pay(b)) { toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3', 1); mission('bet5', 1);
    st._rv = { rid: s.rid, kind, bet: b, settled: 0 };
    save(); paintHud(); paintRoulette(true);
    toastFn('Chip on ' + kind + ' · ' + b);
  }
  function settleRoulette(s) {
    const b = st._rv; if (!b || b.settled === s.rid) return;
    b.settled = s.rid;
    let hit = false, payo = 0;
    if (b.kind === s.color) { hit = true; payo = b.bet * (s.color === 'green' ? 14 : 2); }
    if (b.kind === 'odd' && s.n && s.n % 2) { hit = true; payo = b.bet * 2; }
    if (hit) { win(payo); pushFeed('You', 'Roulette', payo, true); toastFn('Roulette ' + s.n + ' · +' + payo); confetti(); }
    else { pushFeed('You', 'Roulette', b.bet, false); toastFn('Roulette ' + s.n + ' · miss'); tone(110, 0.2, 'sine', 0.04); }
    save(); paintHud();
    const res = $('[data-rv-res]'); if (res) { res.className = 'result ' + (hit ? 'win' : 'lose'); res.textContent = hit ? ('+' + payo + ' coins') : 'No payout this spin.'; }
  }

  /* ── Blackjack ── */
  const drawC = () => 1 + Math.floor(Math.random() * 13);
  const suit = () => ['♠','♥','♦','♣'][Math.floor(Math.random()*4)];
  const face = (c) => (['A','2','3','4','5','6','7','8','9','10','J','Q','K'])[c-1];
  const val = (h) => { let t=0,a=0; h.forEach((c)=>{ const v=Math.min(c.r,10); t+=v; if(c.r===1)a++; }); while(a && t+10<=21){t+=10;a--;} return t; };
  const cardEl = (c, hide) => hide ? `<div class="card back">?</div>` : `<div class="card${(c.s==='♥'||c.s==='♦')?' red':''}"><span>${face(c.r)}${c.s}</span></div>`;
  function paintBj() {
    const box = $('[data-table="blackjack"]'); if (!box) return;
    const g = st._bj;
    if (!g) {
      box.innerHTML = `<div class="table-stage pad"><p class="lead">Dealer stands on 17. Blackjack pays 3:2. Double and split when the cards allow.</p>
        <div class="acts"><button type="button" data-play="bj:deal">Deal ${bet()}</button></div></div>`;
      return;
    }
    const splitBtn = (!g.done && g.p.length===2 && g.p[0].r===g.p[1].r && !g.split) ? `<button type="button" data-play="bj:split">Split</button>` : '';
    const dbl = (!g.done && g.p.length===2) ? `<button type="button" data-play="bj:double">Double</button>` : '';
    box.innerHTML = `<div class="table-stage pad">
      <div class="lbl">Dealer ${g.done?val(g.d):''}</div>
      <div class="cards">${g.d.map((c,i)=>cardEl(c, !g.done && i>0)).join('')}</div>
      <div class="lbl">You ${val(g.p)}</div>
      <div class="cards">${g.p.map((c)=>cardEl(c)).join('')}</div>
      ${g.splitHand ? `<div class="lbl">Split ${val(g.splitHand)}</div><div class="cards">${g.splitHand.map((c)=>cardEl(c)).join('')}</div>`:''}
      <div class="bj-acts acts row-acts">${g.done?'<button type="button" data-play="bj:deal">New hand</button>':`<button type="button" data-play="bj:hit">Hit</button><button type="button" data-play="bj:stand">Stand</button>${dbl}${splitBtn}`}</div>
      <div class="result ${g.msg&&/win|Blackjack/i.test(g.msg)?'win':(g.msg&&/bust|Dealer/i.test(g.msg)?'lose':'')}">${esc(g.msg||'')}</div>
    </div>`;
  }
  function bjDeal() {
    const b = bet(); if (!pay(b)) { toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3', 1); mission('bet5', 1);
    const p = [{r:drawC(),s:suit()},{r:drawC(),s:suit()}], d = [{r:drawC(),s:suit()},{r:drawC(),s:suit()}];
    st._bj = { bet: b, p, d, done: false, msg: '', doubled: false };
    if (val(p) === 21) { st._bj.done = true; const payo = Math.floor(b * 2.5); win(payo); st._bj.msg = 'Blackjack · +' + payo; pushFeed('You','Blackjack',payo,true); confetti(); }
    save(); paintHud(); paintBj();
  }
  function bjHit() {
    const g = st._bj; if (!g || g.done) return;
    g.p.push({r:drawC(),s:suit()}); tone(520,0.07);
    if (val(g.p) > 21) { g.done = true; g.msg = 'Bust.'; pushFeed('You','Blackjack',g.bet,false); }
    save(); paintBj(); paintHud();
  }
  function bjStand() {
    const g = st._bj; if (!g || g.done) return;
    while (val(g.d) < 17) g.d.push({r:drawC(),s:suit()});
    const pv = val(g.p), dv = val(g.d);
    g.done = true;
    if (pv > 21) g.msg = 'Bust.';
    else if (dv > 21 || pv > dv) { const payo = g.bet * 2; win(payo); g.msg = 'You win · +' + payo; pushFeed('You','Blackjack',payo,true); confetti(); }
    else if (pv === dv) { win(g.bet); g.msg = 'Push.'; }
    else { g.msg = 'Dealer wins.'; pushFeed('You','Blackjack',g.bet,false); }
    save(); paintBj(); paintHud();
  }
  function bjDouble() {
    const g = st._bj; if (!g || g.done || g.p.length !== 2) return;
    if (!pay(g.bet)) { toastFn('Not enough to double.'); return; }
    mission('bet5', 1); g.bet *= 2; g.p.push({r:drawC(),s:suit()});
    if (val(g.p) > 21) { g.done = true; g.msg = 'Bust.'; pushFeed('You','Blackjack',g.bet,false); save(); paintBj(); paintHud(); return; }
    bjStand();
  }
  function bjSplit() {
    const g = st._bj; if (!g || g.done || g.p.length !== 2 || g.p[0].r !== g.p[1].r) return;
    if (!pay(g.bet)) { toastFn('Not enough to split.'); return; }
    mission('bet5', 1);
    const a = [g.p[0], {r:drawC(),s:suit()}], b = [g.p[1], {r:drawC(),s:suit()}];
    g.p = a; g.splitHand = b; save(); paintBj(); toastFn('Split dealt. Play the first hand, then stand.');
  }

  /* ── Slots ── */
  function paintSlots(spinning, faces, payout, kind) {
    const box = $('[data-table="slots"]'); if (!box) return;
    const cols = (faces || ['◆','★','7']).map((f, i) => {
      const strip = FACES.concat(FACES).concat([f]).map((s) => `<div class="sym">${s}</div>`).join('');
      return `<div class="reel${spinning?' blur':''}" data-reel="${i}"><div class="col">${strip}</div></div>`;
    }).join('');
    box.innerHTML = `<div class="table-stage"><div class="reels">${cols}</div>
      <div class="acts row-acts center"><button type="button" data-play="slots:spin" ${spinning?'disabled':''}>Spin ${bet()}</button></div>
      <div class="result ${payout?'win':''}" data-slot-res>${payout ? ((kind||'Win') + ' · +' + payout) : (spinning ? 'Good luck…' : 'Three of a kind pays 8× · sevens pay 25×')}</div>
      <div class="confetti" data-confetti></div></div>`;
  }
  function slotsSpin() {
    const b = bet(); if (!pay(b)) { toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3', 1); mission('bet5', 1); paintHud();
    const a = [FACES[Math.floor(Math.random()*FACES.length)], FACES[Math.floor(Math.random()*FACES.length)], FACES[Math.floor(Math.random()*FACES.length)]];
    paintSlots(true, a, 0);
    [0,1,2].forEach((i) => {
      setTimeout(() => {
        const reel = $(`.reel[data-reel="${i}"]`);
        if (reel) reel.classList.remove('blur');
        tone(330 + i*80, 0.08, 'square', 0.04);
        buzz(8);
        if (i === 2) finishSlots(a, b);
      }, 700 + i * 450 + (i===2?400:0));
    });
  }
  function finishSlots(a, b) {
    let payout = 0, kind = '';
    if (a[0]===a[1] && a[1]===a[2]) { payout = a[0]==='7' ? b*25 : b*8; kind = a[0]==='7' ? 'Mega win' : 'Big win'; }
    else if (a[0]===a[1] || a[1]===a[2] || a[0]===a[2]) { payout = b*2; kind = 'Pair'; }
    paintSlots(false, a, payout, kind);
    if (payout) { win(payout); pushFeed('You','Slots',payout,true); if (payout >= b*8) confetti(); toastFn(kind + ' · +' + payout); }
    else { pushFeed('You','Slots',b,false); toastFn('No line this spin.'); }
    paintHud();
  }

  /* ── Crash / Aviator (shared) ── */
  function crashPoint(rid) {
    const r = rng(hash('cr|' + rid))();
    if (r < 0.04) return 1;
    return Math.min(25, Math.round((1 / (1 - r * 0.92)) * 100) / 100);
  }
  function crState() {
    const rid = roundId(CR_MS), p = phase(CR_MS);
    const wait = 2500;
    const flying = p > wait;
    const t = Math.max(0, (p - wait) / 1000);
    const cap = crashPoint(rid);
    const mult = flying ? Math.min(cap, Math.round(Math.exp(0.42 * t) * 100) / 100) : 1;
    const crashed = flying && (Math.exp(0.42 * t) >= cap);
    return { rid, p, cap, mult: crashed ? cap : mult, crashed, flying, left: flying ? 0 : Math.ceil((wait - p)/1000) };
  }
  function paintCrash(tick) {
    const box = $('[data-table="crash"]');
    const s = crState();
    if (st._cr && st._cr.rid === s.rid && st._cr.in && s.crashed && !st._cr.out && !st._cr.settled) {
      st._cr.settled = 1; pushFeed('You','Aviator',st._cr.bet,false); toastFn('Crashed at ' + s.cap.toFixed(2) + 'x'); tone(90,0.3,'sawtooth',0.05); buzz([30,40,30]); save(); paintHud();
    }
    if (st._cr && st._cr.rid !== s.rid && !s.flying) st._cr = null;
    const lobbyCd = document.querySelector('[data-cr-cd]');
    if (lobbyCd) lobbyCd.textContent = s.crashed ? s.cap.toFixed(2)+'x' : (s.flying ? s.mult.toFixed(2)+'x' : s.left+'s');
    if (!box) return;
    if (!tick || !$('canvas', box)) {
      box.innerHTML = `<div class="table-stage crash-wrap"><canvas width="390" height="220"></canvas>
        <div class="crash-mult${s.crashed?' boom':''}" data-cr-m>${s.crashed?'CRASH '+s.cap.toFixed(2)+'x':(s.flying?s.mult.toFixed(2)+'x':('Next in '+s.left+'s'))}</div>
        <div class="acts row-acts crash-acts">
          <button type="button" data-play="crash:bet">${st._cr && st._cr.in && !st._cr.out ? 'In' : 'Bet ' + bet()}</button>
          <button type="button" data-play="crash:out">Cash out</button>
        </div></div>
        <div class="result">Cash out before the plane crashes. Shared rounds, play money only.</div>`;
    }
    const m = $('[data-cr-m]', box);
    if (m) { m.className = 'crash-mult' + (s.crashed ? ' boom' : ''); m.textContent = s.crashed ? ('CRASH ' + s.cap.toFixed(2) + 'x') : (s.flying ? s.mult.toFixed(2) + 'x' : ('Next in ' + s.left + 's')); }
    const cv = $('canvas', box); if (cv) drawCrash(cv, s);
  }
  function drawCrash(cv, s) {
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(201,176,137,0.25)'; ctx.beginPath();
    for (let x=0;x<w;x+=40){ ctx.moveTo(x,h); ctx.lineTo(x,0);} ctx.stroke();
    ctx.strokeStyle = '#c9b089'; ctx.lineWidth = 2; ctx.beginPath();
    const tMax = s.flying ? Math.log(Math.max(1.001, s.mult)) / 0.42 : 0;
    const maxT = 6, pts = 40;
    for (let i=0;i<=pts;i++){
      const t = (tMax * i)/pts;
      const x = 20 + (t/maxT) * (w-40);
      const y = h-20 - (Math.exp(0.42*t)-1) / 8 * (h-40);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    if (s.flying) {
      const x = 20 + (tMax/maxT)*(w-40), y = h-20 - (s.mult-1)/8*(h-40);
      ctx.fillStyle = s.crashed ? '#d9706b' : '#c9b089';
      ctx.beginPath(); ctx.arc(x,y,5,0,6.28); ctx.fill();
    }
  }
  function crashBet() {
    const s = crState();
    if (s.flying) { toastFn('Wait for the next flight.'); return; }
    if (st._cr && st._cr.rid === s.rid) return;
    const b = bet(); if (!pay(b)) { toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3',1); mission('bet5',1);
    st._cr = { rid: s.rid, bet: b, in: 1, out: 0, settled: 0 };
    save(); paintHud(); toastFn('On this flight · ' + b);
  }
  function crashOut() {
    const s = crState(); const b = st._cr;
    if (!b || b.rid !== s.rid || b.out || b.settled) { toastFn('No open bet.'); return; }
    if (!s.flying || s.crashed) { toastFn('Too late.'); return; }
    b.out = 1; b.settled = 1;
    const payo = Math.floor(b.bet * s.mult);
    win(payo); pushFeed('You','Aviator',payo,true); if (s.mult>=3) confetti();
    toastFn('Cashed out at ' + s.mult.toFixed(2) + 'x · +' + payo);
    save(); paintHud();
  }

  /* ── Plinko ── */
  function paintPlinko() {
    const box = $('[data-table="plinko"]'); if (!box) return;
    box.innerHTML = `<div class="table-stage plinko-wrap"><canvas width="390" height="280" data-plinko></canvas>
      <div class="acts row-acts center"><button type="button" data-play="plinko:drop">Drop ${bet()}</button></div>
      <div class="result" data-pk-res>16 rows · centre is safer, edges pay more.</div></div>`;
    drawPlinkoIdle($('canvas', box));
  }
  function drawPlinkoIdle(cv) {
    if (!cv) return;
    const ctx = cv.getContext('2d'), w=cv.width, h=cv.height;
    ctx.clearRect(0,0,w,h);
    const rows=8, gap=36, top=28;
    ctx.fillStyle='#c9b089';
    for(let r=0;r<rows;r++){
      const n=r+3, y=top+r*gap, ox=(w-(n-1)*gap)/2;
      for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(ox+i*gap,y,3.5,0,6.28); ctx.fill(); }
    }
    const bins=[9,4,2,0.6,0.4,0.6,2,4,9];
    bins.forEach((b,i)=>{ const x=20+i*((w-40)/bins.length); ctx.fillStyle='rgba(201,176,137,.12)'; ctx.fillRect(x,h-28,(w-40)/bins.length-4,22); ctx.fillStyle='#c9b089'; ctx.font='11px sans-serif'; ctx.fillText(b+'x', x+8, h-12); });
  }
  function plinkoDrop() {
    const b = bet(); if (!pay(b)) { toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3',1); mission('bet5',1); paintHud();
    const bins=[9,4,2,0.6,0.4,0.6,2,4,9];
    let slot=4;
    for(let i=0;i<8;i++) slot += Math.random()<0.5?0:1;
    slot = Math.max(0, Math.min(8, slot-0));
    const mul = bins[Math.max(0, Math.min(bins.length-1, slot))];
    const payo = Math.floor(b * mul);
    const cv = $('[data-plinko]'); const ctx = cv && cv.getContext('2d');
    if (ctx) {
      const w=cv.width,h=cv.height; let x=w/2, y=10, step=0;
      const tick=()=>{
        drawPlinkoIdle(cv);
        ctx.fillStyle='#f4efe6'; ctx.beginPath(); ctx.arc(x,y,6,0,6.28); ctx.fill();
        y+=6; if (step%6===0) x += (slot+0.5)/9*w > x ? 8 : -8;
        step++;
        if (y<h-36) raf=requestAnimationFrame(tick);
        else finishPlinko(payo, mul);
      };
      raf=requestAnimationFrame(tick);
    } else finishPlinko(payo, mul);
  }
  function finishPlinko(payo, mul) {
    if (payo>0) { win(payo); pushFeed('You','Plinko',payo,true); if (mul>=4) confetti(); toastFn(mul+'x · +'+payo); }
    else { pushFeed('You','Plinko',0,false); }
    const res=$('[data-pk-res]'); if(res){ res.className='result '+(payo?'win':''); res.textContent = mul+'x · '+(payo?('+'+payo+' coins'):'No payout'); }
    paintHud();
  }

  /* ── Mines ── */
  function paintMines() {
    const box = $('[data-table="mines"]'); if (!box) return;
    const g = st._mn;
    if (!g) {
      box.innerHTML = `<div class="table-stage pad"><p class="lead">5×5 board, three mines. Each gem lifts the cash-out. One mine ends the round.</p>
        <div class="acts"><button type="button" data-play="mines:start">Start ${bet()}</button></div></div>`;
      return;
    }
    const cells = [];
    for (let i=0;i<25;i++){
      const open = g.open.indexOf(i)!==-1;
      const isMine = g.done && g.mines.indexOf(i)!==-1;
      cells.push(`<button type="button" class="${isMine?'mine':(open?'gem':'')}" data-play="mines:hit:${i}">${isMine?'●':(open?'◆':'')}</button>`);
    }
    const mul = 1 + g.open.length * 0.35;
    box.innerHTML = `<div class="table-stage"><div class="mines">${cells.join('')}</div>
      <div class="acts row-acts center">
        ${g.done?`<button type="button" data-play="mines:start">New board ${bet()}</button>`:`<button type="button" data-play="mines:out">Cash out ${mul.toFixed(2)}x</button>`}
      </div>
      <div class="result ${g.msg&&/cashed|win/i.test(g.msg)?'win':(g.msg&&/hit/i.test(g.msg)?'lose':'')}">${esc(g.msg||('Multiplier '+mul.toFixed(2)+'x'))}</div></div>`;
  }
  function minesStart() {
    const b=bet(); if(!pay(b)){ toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3',1); mission('bet5',1);
    const mines=[]; while(mines.length<3){ const n=Math.floor(Math.random()*25); if(mines.indexOf(n)<0) mines.push(n); }
    st._mn={ bet:b, mines, open:[], done:false, msg:'' }; save(); paintHud(); paintMines();
  }
  function minesHit(i) {
    const g=st._mn; if(!g||g.done||g.open.indexOf(i)!==-1) return;
    if (g.mines.indexOf(i)!==-1) { g.done=true; g.open.push(i); g.msg='Mine — round over.'; pushFeed('You','Mines',g.bet,false); tone(90,0.25,'sawtooth',0.05); buzz([20,30,20]); }
    else { g.open.push(i); tone(640,0.06); buzz(8); g.msg=''; }
    save(); paintMines();
  }
  function minesOut() {
    const g=st._mn; if(!g||g.done||!g.open.length){ toastFn('Pick at least one gem first.'); return; }
    const mul=1+g.open.length*0.35; const payo=Math.floor(g.bet*mul);
    g.done=true; g.msg='Cashed out · +'+payo; win(payo); pushFeed('You','Mines',payo,true); if(mul>=2) confetti();
    save(); paintHud(); paintMines();
  }

  /* ── Dice ── */
  function paintDice(roll, winAmt, target, over) {
    const box=$('[data-table="dice"]'); if(!box) return;
    const tgt = target || (st._dice && st._dice.target) || 50;
    const isOver = over==null ? !!(st._dice && st._dice.over) : over;
    box.innerHTML = `<div class="table-stage pad tac">
      <div class="dice-face">${roll==null?'?':roll}</div>
      <p class="lead">Roll over or under a number. 1 and 100 are rare edges.</p>
      <label class="lead">Target <input id="dice-t" type="range" min="5" max="95" value="${tgt}"></label>
      <div class="acts row-acts center">
        <button type="button" data-play="dice:under">Under</button>
        <button type="button" data-play="dice:over">Over</button>
      </div>
      <div class="result ${winAmt?'win':(roll!=null?'lose':'')}" data-dc-res>${roll==null?'Pick a side to roll.':('Rolled '+roll+(winAmt?(' · +'+winAmt):' · miss'))}</div>
    </div>`;
  }
  function diceRoll(over) {
    const b=bet(); if(!pay(b)){ toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3',1); mission('bet5',1);
    const tgt=Number(($('#dice-t')||{}).value)||50;
    const roll=1+Math.floor(Math.random()*100);
    const hit = over ? roll>tgt : roll<tgt;
    const chance = over ? (100-tgt) : tgt;
    const mul = Math.max(1.05, Math.round((98/Math.max(1,chance))*100)/100);
    const payo = hit ? Math.floor(b*mul) : 0;
    st._dice={target:tgt,over:over};
    if(payo){ win(payo); pushFeed('You','Dice',payo,true); if(mul>=3) confetti(); toastFn('Rolled '+roll+' · +'+payo); }
    else { pushFeed('You','Dice',b,false); toastFn('Rolled '+roll+' · miss'); }
    save(); paintHud(); paintDice(roll, payo, tgt, over);
  }

  /* ── Monopoly-style board ── */
  function paintBoard(msg) {
    const box=$('[data-table="board"]'); if(!box) return;
    const cells=BOARD.map((s,i)=>`<span class="sq${i===st.board?' on':''}">${esc(s)}${i===st.board?'<i class="token"></i>':''}</span>`).join('');
    box.innerHTML=`<div class="table-stage"><div class="mono">${cells}</div>
      <div class="acts row-acts center"><button type="button" data-play="board:roll">Roll ${Math.min(15, bet()>0?15:15)}</button></div>
      <div class="result" data-bd-res>${esc(msg||'Roll to walk the token. Bonus and festival pay coins.')}</div></div>`;
  }
  function boardRoll() {
    if(!pay(15)){ toastFn('Not enough Sobo Coins.'); return; }
    touch(); mission('play3',1); mission('bet5',1);
    const a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6);
    const steps=a+b, from=st.board, dest=(from+steps)%BOARD.length;
    let i=0;
    const walk=()=>{
      i++; st.board=(from+i)%BOARD.length; paintBoard('Rolling '+a+' + '+b+'…');
      buzz(6); if(i<steps) setTimeout(walk, 180); else finishBoard(a,b,dest);
    };
    walk();
  }
  function finishBoard(a,b,dest) {
    st.board=dest;
    const sq=BOARD[dest];
    let msg='Landed on '+sq+'.', gain=0;
    if(sq==='Bonus'||sq==='Festival'){ gain=80; win(80); msg+=' +80 coins.'; }
    else if(sq==='Tax'||sq==='Jail'){ msg+=' No payout.'; }
    else if(sq==='Chance'){ gain=Math.random()<0.5?50:0; if(gain) win(gain); msg+=gain?' +50 coins.':' Nothing this time.'; }
    else if(sq==='Start'){ gain=40; win(40); msg+=' +40 coins.'; }
    else { gain=20; win(20); msg+=' +20 coins.'; }
    if(gain) pushFeed('You','Board',gain,true);
    save(); paintHud(); paintBoard(a+' + '+b+' · '+msg); toastFn(msg);
  }

  function confetti() {
    const host = $('[data-confetti]') || $('.table-stage');
    if (!host) return;
    const c = document.createElement('div'); c.className='confetti';
    const colors=['#c9b089','#f4efe6','#e24b4b','#d9b56a','#8a7350'];
    for(let i=0;i<28;i++){
      const n=document.createElement('i');
      n.style.left=(Math.random()*100)+'%';
      n.style.background=colors[i%colors.length];
      n.style.animationDelay=(Math.random()*0.2)+'s';
      c.appendChild(n);
    }
    host.appendChild(c);
    setTimeout(()=>c.remove(), 1200);
  }

  function openTable(name) {
    table = name;
    const host = $('.play.floor');
    if (!host) return;
    const map = { roulette:'Live roulette', blackjack:'Blackjack', slots:'Slots', crash:'Aviator', plinko:'Plinko', mines:'Mines', dice:'Dice', board:'Monopoly' };
    const body = '<div></div>';
    const segs = host.querySelector('[data-seg="play"]');
    const keepSegs = segs ? segs.parentElement === host ? segs.outerHTML : '' : '';
    // replace from hud down? Keep hud + feed + shell
    const existingHud = $('.hud', host); const existingFeed=$('.feedbar', host);
    const after = tableShell(map[name]||name, body);
    // remove lobby / old table
    [...host.children].forEach((el)=>{
      if (el.classList.contains('hud') || el.classList.contains('feedbar') || el.classList.contains('fun') || el.hasAttribute('data-seg') || (el.closest && false)) return;
      if (el.classList.contains('src')) return;
      if (el.classList.contains('h') && el.parentElement===host) { /* may be leftover */ }
    });
    // simpler: rebuild body under feed
    const parts=[];
    [...host.children].forEach((el, idx)=>{
      if (el.classList.contains('hud') || el.classList.contains('fun') || el.classList.contains('feedbar') || (el.getAttribute && el.getAttribute('data-seg')==='play') || el.classList.contains('src')) parts.push(el);
    });
    const hold = parts.slice();
    host.innerHTML = (hold[0] && hold[0].getAttribute && hold[0].getAttribute('data-seg')==='play' ? hold.shift().outerHTML : '') + hud() + feedBar() + after + `<span class="src">${FUN}</span>`;
    const box = $('[data-table]');
    if (box) box.innerHTML = '';
    startTable();
    paintHud();
  }
  function startTable() {
    if (table==='roulette') paintRoulette(true);
    else if (table==='blackjack') paintBj();
    else if (table==='slots') paintSlots(false);
    else if (table==='crash') paintCrash();
    else if (table==='plinko') paintPlinko();
    else if (table==='mines') paintMines();
    else if (table==='dice') paintDice();
    else if (table==='board') paintBoard();
  }
  function goLobby() {
    table=null;
    // full play render is easier
    return 'rerender';
  }

  function render(D, u) {
    if (!st) return u.P(`<p class="lead">Unlock Sobot first.</p>`);
    grantDaily(); save();
    const tab = (u.playTab || 'games');
    const segs = (window.Chi9 && Chi9.playSeg) ? Chi9.playSeg(u) : '';
    if (tab !== 'games') {
      const extra = (window.Chi9 && Chi9.playPanel) ? Chi9.playPanel(tab, D, u) : '';
      return `<div class="play">${segs}<p class="fun">${FUN}</p>
        ${u.P(`<div class="kpis"><div class="kpi"><div class="lbl">Sobo Coins</div><div class="v gold">${u.nf(st.coins,0)}</div></div>
          <div class="kpi"><div class="lbl">Level</div><div class="v">${st.level||1}</div></div>
          <div class="kpi"><div class="lbl">Streak</div><div class="v">${st.streak||0}d</div></div></div>`)}
        ${extra}${u.src(FUN)}</div>`;
    }
    if (table) {
      const map = { roulette:'Live roulette', blackjack:'Blackjack', slots:'Slots', crash:'Aviator', plinko:'Plinko', mines:'Mines', dice:'Dice', board:'Monopoly' };
      return `<div class="play floor">${segs}${hud()}${feedBar()}${tableShell(map[table]||table,'')}<span class="src">${FUN}</span></div>`;
    }
    return `<div class="play floor">${segs}${hud()}${feedBar()}${lobby()}<span class="src">${FUN}</span></div>`;
  }

  function after(el, toast) {
    stopLoops();
    if (toast) toastFn = toast;
    root = (el && el.querySelector) ? (el.querySelector('.play') || el) : el;
    if (!root || !st) return;
    startLoops();
    if (table) startTable();
    else { paintRoulette(false); paintCrash(); }
  }
  function startLoops() {
    timers.push(setInterval(() => { paintRoulette(false); paintCrash(true); }, 250));
    timers.push(setInterval(() => {
      const r = Math.random();
      const who = BOTS[Math.floor(Math.random()*BOTS.length)];
      const g = GAMES[Math.floor(Math.random()*GAMES.length)].t;
      const amt = [25,50,80,120,200,400][Math.floor(Math.random()*6)];
      pushFeed(who, g, amt, r>0.42);
    }, 2800));
  }
  function stopLoops() {
    timers.forEach((t) => clearInterval(t)); timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function handle(act, D, toast) {
    if (toast) toastFn = toast;
    if (!st) return;
    if (act.slice(0,4)==='bet:') { setBet(Number(act.slice(4))); return 'keep'; }
    if (act==='sound') { st.sound=!st.sound; save(); paintHud(); if(st.sound && audioCtx && audioCtx.resume) audioCtx.resume(); tone(660,0.08); return 'keep'; }
    if (act.slice(0,5)==='open:') { table = act.slice(5); return 'rerender'; }
    if (act==='lobby') { table=null; return 'rerender'; }
    if (act.slice(0,3)==='rv:') { placeRv(act.slice(3)); return 'keep'; }
    if (act==='bj:deal') { bjDeal(); return 'keep'; }
    if (act==='bj:hit') { bjHit(); return 'keep'; }
    if (act==='bj:stand') { bjStand(); return 'keep'; }
    if (act==='bj:double') { bjDouble(); return 'keep'; }
    if (act==='bj:split') { bjSplit(); return 'keep'; }
    if (act==='slots:spin') { slotsSpin(); return 'keep'; }
    if (act==='crash:bet') { crashBet(); return 'keep'; }
    if (act==='crash:out') { crashOut(); return 'keep'; }
    if (act==='plinko:drop') { plinkoDrop(); return 'keep'; }
    if (act==='mines:start') { minesStart(); return 'keep'; }
    if (act.slice(0,10)==='mines:hit:') { minesHit(Number(act.slice(10))); return 'keep'; }
    if (act==='mines:out') { minesOut(); return 'keep'; }
    if (act==='dice:over') { diceRoll(true); return 'keep'; }
    if (act==='dice:under') { diceRoll(false); return 'keep'; }
    if (act==='board:roll') { boardRoll(); return 'keep'; }
    if (act==='buy' || act==='sell') {
      const sym=(document.getElementById('play-sym')||{}).value;
      const qty=Number((document.getElementById('play-qty')||{}).value);
      const err=trade(sym, act==='buy'?qty:-qty, D);
      toastFn(err || (act==='buy'?'Paper buy filled.':'Paper sell filled.'));
      return 'rerender';
    }
    return 'keep';
  }
  function lock() { stopLoops(); id=null; st=null; root=null; table=null; }
  function grant(n) { if (!st) return; st.coins += n; save(); }
  function sid() { return id; }
  function state() { return st; }

  window.Play = { boot, render, handle, lock, after, sleep: stopLoops, label: FUN, grant, sid, state };
})();
