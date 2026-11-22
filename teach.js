/* In-app guided tutorial (CSS animation, no paid video) + inactive premium paywall. */
(() => {
  'use strict';
  const STEPS = {
    en: [
      { t: 'Welcome to Sobot', b: 'A live data and news dashboard for markets, sports, the world and commodities. It is not a broker and not SEBI-regulated advice.' },
      { t: 'Your login key', b: 'Each person has a key. It stays in memory on this device. If it is revoked, this feed will no longer open.' },
      { t: 'Markets & commodities', b: 'Use Markets for indices, F&O and flows, and Commodities for delayed metals, energy, mandi staples and a rule-based outlook.' },
      { t: 'World, TV and weather', b: 'World has the brief, calendar and live TV wall. Weather shows a 7-day rain outlook for major crop regions.' },
      { t: 'Play money', b: 'Play is a game with a ₹1 lakh paper book and Sobo Coins. Coins are for fun only. They cannot be bought, cashed out, transferred or redeemed.' },
      { t: 'Language and alerts', b: 'Switch Hindi or English in the header. You can turn on price-move alerts for large swings in the delayed prints.' }
    ],
    hi: [
      { t: 'सोबोट में आपका स्वागत है', b: 'यह बाज़ार, खेल, विश्व और कमोडिटी का लाइव डेटा-समाचार डैशबोर्ड है। यह ब्रोकर नहीं है और SEBI-नियंत्रित सलाह नहीं है।' },
      { t: 'आपकी लॉगिन कुंजी', b: 'हर व्यक्ति की एक कुंजी होती है। यह इस डिवाइस की मेमोरी में रहती है। रद्द होने पर यह फीड नहीं खुलेगा।' },
      { t: 'बाज़ार और कमोडिटी', b: 'सूचकांक, F&O और प्रवाह के लिए Markets, और धातु, ऊर्जा, मंडी और नियम-आधारित दृष्टिकोण के लिए Commodities खोलें।' },
      { t: 'विश्व, टीवी और मौसम', b: 'World में ब्रीफ, कैलेंडर और लाइव टीवी है। मौसम मुख्य फसल क्षेत्रों की 7-दिन बारिश दिखाता है।' },
      { t: 'खेल मुद्रा', b: 'Play में ₹1 लाख का पेपर बही और सोबो कॉइन हैं। कॉइन केवल मनोरंजन हैं। उन्हें खरीदा, भुनाया, भेजा या पुरस्कार में बदला नहीं जा सकता।' },
      { t: 'भाषा और अलर्ट', b: 'हेडर में हिन्दी या English चुनें। बड़ी कीमत हलचल पर अलर्ट चालू कर सकते हैं।' }
    ]
  };
  let i = 0, on = false;
  function lang() { return (window.Chi && Chi.lang) || 'en'; }
  function open(force) {
    if (!force) {
      try { if (localStorage.getItem('sobot-taught') === '1') return; } catch (e) {}
    }
    on = true; i = 0; draw();
  }
  function draw() {
    const steps = STEPS[lang()] || STEPS.en;
    const s = steps[i] || steps[0];
    let el = document.getElementById('tutor');
    if (!el) { el = document.createElement('div'); el.id = 'tutor'; el.className = 'tutor'; document.body.appendChild(el); }
    el.classList.add('on');
    el.innerHTML = `<div class="tutor-card"><div class="meta">${i + 1} / ${steps.length}</div><h2>${s.t}</h2><p>${s.b}</p>
      <div class="issue"><button type="button" class="act" id="tutor-skip">Skip</button><button type="button" class="act" id="tutor-next">${i === steps.length - 1 ? 'Done' : 'Next'}</button></div></div>`;
    el.querySelector('#tutor-skip').onclick = close;
    el.querySelector('#tutor-next').onclick = () => { if (i >= steps.length - 1) close(); else { i += 1; draw(); } };
  }
  function close() {
    on = false;
    try { localStorage.setItem('sobot-taught', '1'); } catch (e) {}
    const el = document.getElementById('tutor'); if (el) el.classList.remove('on');
  }

  function paywall(cfg, u) {
    const p = (cfg && cfg.premium) || {};
    if (p.enabled) return u.P(`<p class="lead">Premium is on. ${u.esc(p.plan || '')}</p>`);
    const plan = p.plan || '₹499 / month';
    const alt = p.alt || '$333 / 3 months';
    return u.P(`<div class="once"><b>Premium — ready, not active</b>
      <p class="hint">Cheaper plan: ${u.esc(plan)}. Alternative: ${u.esc(alt)}. Ads will appear on the free tier only, once a payments account exists. Nothing is charged and nothing is locked yet. Sobot stays a data and news dashboard.</p>
      <p class="hint">To turn it on later: create a Razorpay or Stripe account, put the publishable key in site config, set premium.enabled to true (and ads.enabled if you want the free-tier ad slot), and add a webhook the box can verify. Then rebuild the Android app.</p></div>`);
  }

  window.Teach = Object.freeze({ open, close, paywall });
})();
