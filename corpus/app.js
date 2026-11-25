/* Corpus — interface, moteur de séance, voix du coach, défis et progression. */
(function () {
  'use strict';
  const { EX, byId, ZONES, AUD, PROGRAMS, progById, CHALLENGES } = window.CorpusData;
  const E = window.Corpus3D;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const zoneLabel = Object.fromEntries(ZONES);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
  const fmtDate = (s) => parseYmd(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const EQUIP = { 'haltères': 'Haltères', kettlebell: 'Kettlebell', barre: 'Barre', banc: 'Banc', chaise: 'Chaise', tapis: 'Tapis', mur: 'Mur', 'barre de traction': 'Barre de traction', poulie: 'Poulie', machine: 'Machine' };
  const equipText = (ex) => ex.equip.length ? ex.equip.map((e) => EQUIP[e] || e).join(', ') : 'Poids du corps';

  const I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.2v11.6a1 1 0 0 0 1.55.83L15 13v4.8a1 1 0 0 0 2 0V6.2a1 1 0 0 0-2 0V11L6.55 5.37A1 1 0 0 0 5 6.2z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 5M22 9l-5 5"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    flame: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2-4.6 0 1.6.8 2.6 1.8 2.6C12.5 10 12 6 12 2z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg>',
    camera: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
  };

  /* ---------- Données locales ---------- */
  const KEY = 'corpus.v1', PKEY = 'corpus.photos.v1';
  const DEFAULTS = {
    settings: { coach: 'f', skin: 2, hair: 0, outfit: 0, voice: true, voiceURI: '', count: true, cues: true, tempo: 'normal', rest: 30, warm: true, listen: false },
    place: 'maison', aud: 'tous', custom: [], history: [], challenges: {}, measures: [], profile: null,
  };
  function load(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v || fb; } catch (e) { return fb; } }
  const S = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), load(KEY, {}));
  S.settings = Object.assign({}, DEFAULTS.settings, S.settings || {});
  let PHOTOS = load(PKEY, []);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } }
  function savePhotos() { try { localStorage.setItem(PKEY, JSON.stringify(PHOTOS)); return true; } catch (e) { return false; } }

  const SKINS = ['#f3d2bb', '#e3b48f', '#c99673', '#a8714e', '#7d4e33', '#553424'];
  const HAIRS = ['#2b1d16', '#141010', '#7a4a2a', '#c49a5c'];
  const OUTFITS = [
    { n: 'Cobalt', top: '#2f56e0', bottom: '#1c2230' }, { n: 'Graphite', top: '#3a3f48', bottom: '#15181d' },
    { n: 'Corail', top: '#e8664c', bottom: '#262b35' }, { n: 'Sauge', top: '#7ea489', bottom: '#2b3530' }, { n: 'Prune', top: '#7a3f7e', bottom: '#1e1a24' },
  ];
  const COACH = { f: { name: 'Léa', initial: 'L', proud: 'fière' }, m: { name: 'Malik', initial: 'M', proud: 'fier' } };
  const TEMPO = { lent: 0.8, normal: 1, rapide: 1.2 };
  const coach = () => COACH[S.settings.coach];
  const tempo = () => TEMPO[S.settings.tempo] || 1;
  const avatarCfg = () => {
    const o = OUTFITS[S.settings.outfit] || OUTFITS[0];
    return { sex: S.settings.coach, skin: SKINS[S.settings.skin], hair: HAIRS[S.settings.hair], top: o.top, bottom: o.bottom };
  };

  /* ---------- Voix ---------- */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  // Dans l'application Android/iPhone (Capacitor), la voix passe par le moteur natif du téléphone.
  const nativeTTS = () => { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.TextToSpeech ? C.Plugins.TextToSpeech : null; };
  const FEMALE = /am[ée]lie|audrey|marie|c[ée]line|julie|hortense|denise|virginie|aur[ée]lie|elsa|brigitte|chantal|sylvie|google fran/i;
  const MALE = /thomas|nicolas|paul|henri|claude|daniel|antoine|jean|guillaume|mathieu|olivier|fabrice/i;
  const Voice = {
    list: [], voice: null,
    init() {
      if (!synth) return;
      const loadV = () => { this.list = synth.getVoices().filter((v) => /^fr/i.test(v.lang)); this.pick(); if (state.tab === 'reglages') render(); };
      loadV(); synth.onvoiceschanged = loadV;
    },
    pick() {
      const L = this.list;
      this.voice = L.find((v) => v.voiceURI === S.settings.voiceURI)
        || L.find((v) => (S.settings.coach === 'f' ? FEMALE : MALE).test(v.name) && /fr-FR/i.test(v.lang))
        || L.find((v) => /fr-FR/i.test(v.lang)) || L[0] || null;
    },
    say(text, opt = {}) {
      setCoachText(text);
      const wait = opt.wait !== false;
      const tts = nativeTTS();
      if (S.settings.voice && tts) {
        const go = (opt.interrupt ? tts.stop().catch(() => {}) : Promise.resolve())
          .then(() => { speaking(true); return tts.speak({ text, lang: 'fr-FR', rate: opt.rate || 1.0, pitch: S.settings.coach === 'f' ? 1.05 : 0.9, volume: 1, category: 'playback' }); })
          .catch(() => {}).then(() => speaking(false));
        return wait ? Promise.race([go, sleepPlain(1800 + text.length * 95)]) : Promise.resolve();
      }
      if (!S.settings.voice || !synth) return wait ? sleepPlain(Math.min(5200, 600 + text.length * 48)) : Promise.resolve();
      if (opt.interrupt) synth.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\s*!\s*/g, ' ! '));
      u.lang = 'fr-FR'; if (this.voice) u.voice = this.voice;
      u.rate = opt.rate || 1.04; u.pitch = S.settings.coach === 'f' ? 1.04 : 0.92;
      return new Promise((res) => {
        let done = false;
        const fin = () => { if (!done) { done = true; speaking(false); res(); } };
        u.onend = fin; u.onerror = fin; u.onstart = () => speaking(true);
        synth.speak(u);
        setTimeout(fin, 1800 + text.length * 95);
        if (!wait) res();
      });
    },
    stop() { if (synth) synth.cancel(); const t = nativeTTS(); if (t) t.stop().catch(() => {}); speaking(false); },
  };
  /* ---------- Avatar réaliste importé (.glb) ---------- */
  const IDB = {
    open() { return new Promise((res, rej) => { const r = indexedDB.open('corpus', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async put(k, v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', 'readonly'); const r = tx.objectStore('files').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async del(k) { const db = await this.open(); return new Promise((res) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(k); tx.oncomplete = res; tx.onerror = res; }); },
  };
  const modelState = { name: null, error: null, loading: false };
  function loadModel(buf, name) {
    return new Promise((res, rej) => {
      if (!THREE.GLTFLoader) return rej(new Error('Le chargeur de modèles 3D n\'est pas disponible.'));
      new THREE.GLTFLoader().parse(buf, '', (gltf) => {
        try { const prep = E.prepareModel(gltf.scene); E.useModel(prep); res(prep); } catch (err) { rej(err); }
      }, (err) => rej(new Error('Ce fichier n\'est pas un modèle .glb lisible.')));
    });
  }
  async function importModel(file) {
    modelState.loading = true; modelState.error = null; render();
    try {
      const buf = await file.arrayBuffer();
      await loadModel(buf, file.name);
      modelState.name = file.name;
      try { await IDB.put('avatar', { name: file.name, buf }); } catch (e) { /* stockage indisponible : le modèle restera jusqu'au rechargement */ }
      toast('Avatar importé. Le coach a pris son nouveau corps.');
    } catch (err) { modelState.error = err.message; }
    modelState.loading = false; render();
  }
  async function restoreModel() {
    try { const rec = await IDB.get('avatar'); if (rec && rec.buf) { await loadModel(rec.buf, rec.name); modelState.name = rec.name; if (state.tab === 'reglages') render(); } } catch (e) { /* aucun modèle enregistré */ }
  }

  /* ---------- Commandes vocales ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const Listen = {
    supported: !!SR, rec: null, on: false,
    sync() {
      const want = !!(SR && S.settings.listen && run);
      if (want && !this.on) this.start(); else if (!want && this.on) this.stop();
    },
    start() {
      try {
        const rec = this.rec = new SR();
        rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = false;
        rec.onresult = (e) => { const r = e.results[e.results.length - 1]; if (r.isFinal) this.handle(r[0].transcript.toLowerCase()); };
        rec.onerror = (e) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { this.on = false; S.settings.listen = false; save(); toast('Le micro n\'est pas autorisé ici. Les commandes vocales sont désactivées.'); }
        };
        rec.onend = () => { if (this.on && run) { try { rec.start(); } catch (err) { /* déjà démarré */ } } };
        rec.start(); this.on = true;
      } catch (err) { this.on = false; }
    },
    stop() { this.on = false; try { this.rec && this.rec.stop(); } catch (err) { /* rien */ } },
    handle(t) {
      if (!run) return;
      if (/\b(stop|arr[êe]te|termin)/.test(t)) stopSession();
      else if (/\b(pause|attends)\b/.test(t)) { if (!run.paused) togglePause(); }
      else if (/\b(reprend|reprends|continue|c'est reparti|go)\b/.test(t)) { if (run.paused) togglePause(); }
      else if (/\b(suivant|passe|next|saute)\b/.test(t)) { if (run.phase === 'rest') run.skipRest = true; else run.skip = true; }
      else if (/\b(r[ée]p[èe]te|quoi)\b/.test(t)) { const ex = E.ex; if (ex) Voice.say(ex.steps.join(' '), { wait: false, interrupt: true }); }
      else return;
      toast(`Commande : « ${t.trim()} »`);
    },
  };

  function speaking(on) { $('#coach-line').classList.toggle('speaking', on); }
  function setCoachText(t) { $('#coach-text').textContent = t; }
  const sleepPlain = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- État de l'interface ---------- */
  const state = { tab: 'accueil', tip: null, editProfile: false, exQuery: '', exZones: new Set(), exDetail: null, selPhotos: [], confirm: null, previewEx: byId.squat };
  let run = null;
  const STOP = { stop: true };

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2400);
  }

  /* ---------- HUD ---------- */
  function setHud(eyebrow, name, meta) { $('#hud-eyebrow').textContent = eyebrow; $('#hud-name').textContent = name; $('#hud-meta').textContent = meta; }
  function setCount(n, total, unit) {
    const el = $('#c-n'); el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; if (n > 0) el.classList.add('pop');
    $('#c-of').textContent = unit === 's' ? 'secondes' : `sur ${total}`;
    const p = unit === 's' ? 1 - n / total : n / total;
    $('#ring').style.strokeDashoffset = String(289 * (1 - Math.max(0, Math.min(1, p))));
  }
  function overlay(html) { const o = $('#overlay'); if (html) { o.innerHTML = html; o.hidden = false; } else { o.hidden = true; o.innerHTML = ''; } }
  function exMeta(ex, sets, n) {
    const amount = ex.hold ? `${n} s` : `${n} rép.`;
    return `${sets} × ${amount} · ${equipText(ex)}`;
  }
  function setViewButtons(v) { $$('.views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v))); }

  function renderControls() {
    const c = $('#controls');
    const vol = `<button class="ctrl" id="c-voice" aria-label="${S.settings.voice ? 'Couper la voix' : 'Activer la voix'}">${S.settings.voice ? I.sound : I.mute}</button>`;
    if (run) {
      c.innerHTML = `${vol}<button class="ctrl" id="c-stop" aria-label="Arrêter la séance">${I.stop}</button>
        <button class="ctrl" id="c-next" aria-label="Passer">${I.next}</button>
        <button class="ctrl primary" id="c-pause" aria-label="${run.paused ? 'Reprendre' : 'Pause'}">${run.paused ? I.play : I.pause}</button>`;
    } else {
      const ex = state.previewEx;
      c.innerHTML = `${vol}<button class="btn accent" id="c-try">${I.play} Faire 1 série</button>`;
      $('#c-try').onclick = () => startSession({ title: ex.name, items: [{ ex, sets: 1, n: ex.def.reps || ex.def.secs }], quick: true });
    }
    $('#c-voice').onclick = () => { S.settings.voice = !S.settings.voice; if (!S.settings.voice) Voice.stop(); save(); renderControls(); if (state.tab === 'reglages') render(); };
    if (run) {
      $('#c-stop').onclick = () => stopSession();
      $('#c-next').onclick = () => { if (run.phase === 'rest') run.skipRest = true; else run.skip = true; };
      $('#c-pause').onclick = togglePause;
    }
  }

  function preview(ex, say) {
    state.previewEx = ex;
    if (run) return;
    E.setExercise(ex); E.setMode('loop'); E.setSpeed(tempo() * 0.9);
    setViewButtons('');
    const d = ex.def;
    setHud(ex.zones.map((z) => zoneLabel[z]).slice(0, 3).join(' · '), ex.name, exMeta(ex, d.sets, d.reps || d.secs));
    $('#counter').hidden = true; overlay(null);
    if (say) setCoachText(ex.steps[0] + ' ' + (ex.steps[1] || ''));
    renderControls();
  }

  /* ---------- Moteur de séance ---------- */
  function sleep(ms, r) {
    return new Promise((res, rej) => {
      let left = ms, last = performance.now();
      const tick = () => {
        if (r.stop) return rej(STOP);
        if (r.skip || (r.phase === 'rest' && r.skipRest)) return res();
        const now = performance.now();
        if (!r.paused) left -= now - last;
        last = now;
        if (left <= 0) return res();
        setTimeout(tick, 60);
      };
      tick();
    });
  }
  async function sayR(r, text, opt) { if (r.stop) throw STOP; await Voice.say(text, opt); while (r.paused && !r.stop) await sleepPlain(150); if (r.stop) throw STOP; }

  function estimateMin(items) {
    let s = 20;
    for (const it of items) {
      const ex = it.ex || byId[it.id];
      const work = (ex.hold ? it.n : it.n * (ex.cycle || 3) / (ex.count ? ex.count.length : 1)) * (ex.sided ? 2 : 1);
      s += (it.phase ? 6 : 15) + it.sets * (work + 5) + (it.sets - 1) * S.settings.rest + (it.phase ? 5 : 20);
    }
    return Math.max(1, Math.round(s / 60));
  }

  function buildStrip(plan) {
    const st = $('#strip'); st.hidden = false;
    st.innerHTML = plan.items.map(() => '<span></span>').join('');
  }
  function updateStrip(r) {
    const spans = $$('#strip span');
    spans.forEach((s, i) => { s.className = i < r.idx ? 'done' : i === r.idx ? 'cur' : ''; });
    const cur = spans[r.idx];
    if (cur) { const it = r.plan.items[r.idx]; cur.style.setProperty('--p', `${Math.round(((r.set || 1) - 1) / it.sets * 100)}%`); }
  }

  // Échauffement et retour au calme automatiques
  const WARMUP = [['marche-sur-place', 20], ['cercles-bras', 10], ['cou-rotation', 4], ['squat', 8]];
  function warmItems() { return WARMUP.map(([id, n]) => ({ ex: byId[id], sets: 1, n, phase: 'warm' })); }
  function coolItems(items) {
    const worked = new Set();
    for (const it of items) for (const z of it.ex.zones) worked.add(z);
    const scored = EX.filter((e) => e.stretch && e.id !== 'posture-enfant')
      .map((e, i) => ({ e, i, sc: e.zones.filter((z) => worked.has(z)).length }))
      .filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, 3).map((x) => x.e);
    if (!scored.length) scored.push(byId['etir-ischios']);
    scored.push(byId['posture-enfant']);
    return scored.map((e) => ({ ex: e, sets: 1, n: e.sided ? 20 : 25, phase: 'cool' }));
  }
  const PHASE_LABEL = { warm: 'Échauffement', cool: 'Retour au calme' };

  async function startSession(plan) {
    if (run) stopSession(true);
    plan.items = plan.items.map((it) => ({ ex: it.ex || byId[it.id], sets: it.sets, n: it.n }));
    const lvl = S.profile ? S.profile.level : 'inter';
    if (!plan.quick && !plan.challenge && lvl !== 'inter') {
      plan.items = plan.items.map((it) => lvl === 'debutant'
        ? { ...it, sets: Math.max(1, it.sets - 1), n: Math.max(it.ex.hold ? 15 : 5, Math.round(it.n * 0.75)) }
        : { ...it, sets: it.sets + (it.sets >= 3 ? 1 : 0), n: Math.round(it.n * 1.15) });
    }
    if (!plan.quick && S.settings.warm) {
      const mobility = plan.items.every((it) => it.ex.stretch || it.ex.zones.includes('cou') || it.ex.aud.includes('mobilite'));
      if (!mobility) plan.items = [...warmItems(), ...plan.items, ...coolItems(plan.items)];
    }
    const r = run = { plan, paused: false, skip: false, skipRest: false, stop: false, t0: Date.now(), pausedMs: 0, reps: 0, idx: 0, set: 1, phase: 'intro', done: [],
      warmN: plan.items.filter((x) => x.phase === 'warm').length, mainN: plan.items.filter((x) => !x.phase).length };
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { r.lock = l; }).catch(() => {});
    buildStrip(plan); renderControls(); if (state.tab !== 'accueil') state.tab = 'seances'; render(); updateStrip(r); Listen.sync();
    try {
      const first = plan.items[0];
      E.setExercise(first.ex); E.setMode('loop'); E.setSpeed(0.7 * tempo()); setViewButtons('');
      setHud(plan.quick ? 'Une série' : first.phase ? PHASE_LABEL[first.phase] : plan.title, first.ex.name, exMeta(first.ex, first.sets, first.n));
      if (!plan.quick) {
        const mins = estimateMin(plan.items);
        await sayR(r, `C'est ${coach().name}. Au programme : ${plan.title}, ${r.mainN} exercices, environ ${mins} minutes${r.warmN ? ', échauffement et étirements compris' : ''}. Je compte avec toi. On y va !`);
      }
      for (let i = 0; i < plan.items.length; i++) {
        r.idx = i; r.set = 1; r.skip = false; updateStrip(r); render();
        const it = plan.items[i], ex = it.ex;
        if (E.ex !== ex) { E.setExercise(ex); }
        E.setMode('loop'); E.setSpeed(0.7 * tempo());
        const eyebrow = plan.quick ? 'Une série' : it.phase ? PHASE_LABEL[it.phase] : `Exercice ${i + 1 - r.warmN} sur ${r.mainN}`;
        setHud(eyebrow, ex.name, exMeta(ex, it.sets, it.n));
        $('#counter').hidden = true; r.phase = 'intro';
        const amount = ex.hold ? `${it.n} secondes` : `${it.n} répétitions`;
        const perSide = ex.sided ? (ex.hold ? ' de chaque côté' : ' par côté') : '';
        if (it.phase === 'warm' && i === 0) await sayR(r, 'On commence par s\'échauffer, tranquillement.');
        if (it.phase === 'cool' && (i === 0 || !plan.items[i - 1].phase)) await sayR(r, 'Bravo, le plus dur est fait ! On s\'étire pour bien récupérer.');
        if (it.phase) await sayR(r, `${ex.name}, ${amount}${perSide}. ${ex.steps[0]}`);
        else await sayR(r, `${ex.name}. ${it.sets > 1 ? it.sets + ' séries de ' : ''}${amount}${perSide}. ${ex.steps[0]} ${ex.steps[1] || ''}`);
        const sides = ex.sided ? [ex, E.mirror(ex)] : [ex];
        for (let set = 1; set <= it.sets && !r.skip; set++) {
          r.set = set; updateStrip(r);
          for (let si = 0; si < sides.length && !r.skip; si++) {
            const sx = sides[si];
            if (E.ex !== sx) E.setExercise(sx);
            const sideTxt = ex.sided ? ` · ${si === 0 ? '1er' : '2e'} côté` : '';
            setHud(eyebrow, ex.name, `Série ${set} sur ${it.sets} · ${ex.hold ? it.n + ' s' : it.n + ' répétitions'}${sideTxt}`);
            await countdown(r, set, it.sets, si, !!it.phase);
            if (r.skip) break;
            r.phase = 'work';
            if (ex.hold) await doHold(r, sx, it.n); else await doReps(r, sx, it.n);
          }
          if (r.skip) break;
          if (set < it.sets) await rest(r, S.settings.rest, null, set);
        }
        r.done.push(i); r.skip = false;
        if (i < plan.items.length - 1) {
          const nx = plan.items[i + 1];
          const secs = it.phase === 'warm' || (it.phase === 'cool' && nx.phase === 'cool') ? 5 : Math.max(15, S.settings.rest);
          await rest(r, secs, nx, 0);
        }
      }
      finish(r, true);
    } catch (e) {
      if (e !== STOP) { console.error(e); finish(r, false); }
    }
  }

  async function countdown(r, set, sets, side, light) {
    r.phase = 'count';
    E.setMode('settle'); E.setSpeed(tempo());
    $('#counter').hidden = true;
    const lines = side > 0 ? 'Autre côté. En position.' : set === 1 ? 'En position.' : `Série ${set}${set === sets ? ', la dernière' : ''}. En position.`;
    await sayR(r, lines);
    if (light && side === 0) { await sleep(600, r); Voice.say('Go !', { wait: false, interrupt: true }); return; }
    for (const n of [3, 2, 1]) {
      overlay(`<div class="n">${n}</div>`);
      Voice.say(['trois', 'deux', 'un'][3 - n], { wait: false, interrupt: true });
      await sleep(850, r);
      if (r.skip) { overlay(null); return; }
    }
    overlay(null);
    Voice.say('Go !', { wait: false, interrupt: true });
  }

  function doReps(r, ex, n) {
    return new Promise((res, rej) => {
      let c = 0;
      $('#counter').hidden = false; setCount(0, n);
      E.phase = Math.round(E.phase); E.setSpeed(tempo()); E.setMode('work');
      const cueAt = n >= 6 ? Math.ceil(n / 2) : -1;
      const cue = ex.cues[Math.floor(Math.random() * ex.cues.length)];
      const finish2 = (fn) => { clearInterval(iv); E.onCount = null; fn(); };
      E.onCount = () => {
        c++; r.reps++; setCount(c, n);
        let t = String(c);
        if (c === n) t = `${c}. Bravo !`;
        else if (c === n - 1 && n > 3) t = `${c}, dernière !`;
        else if (c === n - 3 && n >= 8) t = `${c}, plus que trois !`;
        else if (c === cueAt && S.settings.cues) t = `${c}. ${cue}.`;
        if (S.settings.count) Voice.say(t, { wait: false, interrupt: true }); else setCoachText(t);
        if (c >= n) finish2(() => { E.setMode('settle'); res(); });
      };
      const iv = setInterval(() => {
        if (r.stop) finish2(() => rej(STOP));
        else if (r.skip) finish2(res);
      }, 80);
    });
  }

  async function doHold(r, ex, secs) {
    $('#counter').hidden = false;
    E.setMode('loop'); E.setSpeed(1);
    let left = secs; setCount(left, secs, 's');
    const cue = ex.cues[0];
    Voice.say(`Tiens la position. ${secs} secondes.`, { wait: false });
    while (left > 0) {
      await sleep(1000, r);
      if (r.skip) return;
      left--; setCount(left, secs, 's');
      if (left === Math.floor(secs / 2) && secs >= 20 && S.settings.cues) Voice.say(`${cue}. Encore ${left} secondes.`, { wait: false, interrupt: true });
      else if (left === 10 && secs > 15) Voice.say('Encore dix secondes !', { wait: false, interrupt: true });
      else if (left <= 3 && left > 0) Voice.say(String(left), { wait: false, interrupt: true });
    }
    Voice.say('Terminé, bravo !', { wait: false, interrupt: true });
    E.setMode('settle');
  }

  async function rest(r, secs, next, setDone) {
    r.phase = 'rest'; r.skipRest = false;
    $('#counter').hidden = true;
    if (next) {
      E.setExercise(next.ex); E.setMode('loop'); E.setSpeed(0.6 * tempo());
      setHud('À suivre', next.ex.name, exMeta(next.ex, next.sets, next.n));
      Voice.say(`Repos, ${secs} secondes. Prochain exercice : ${next.ex.name}.`, { wait: false });
    } else {
      E.setMode('settle');
      const lines = [`Repos, ${secs} secondes. Respire profondément.`, `Très bien ! ${secs} secondes de repos.`, `Belle série. Récupère, ${secs} secondes.`];
      Voice.say(lines[setDone % lines.length], { wait: false });
    }
    let left = secs;
    const draw = () => overlay(`<div class="lbl">Repos</div><div class="n num">${left}</div>${next ? `<div class="next">À suivre : ${esc(next.ex.name)}</div>` : ''}<div class="next note">Le bouton Passer enchaîne tout de suite</div>`);
    draw();
    while (left > 0 && !r.skipRest) {
      await sleep(1000, r);
      if (r.skipRest || r.skip) break;
      left--; draw();
      if (left === 10 && secs > 15) Voice.say('Encore dix secondes.', { wait: false, interrupt: true });
    }
    overlay(null); r.skipRest = false; r.phase = 'intro';
  }

  function togglePause() {
    if (!run) return;
    run.paused = !run.paused;
    if (run.paused) {
      run.pauseAt = Date.now(); run.modeBefore = E.mode; E.setMode('still'); Voice.stop();
      overlay('<div class="lbl">Pause</div><div class="n">II</div>');
      setCoachText('Pause. Reprends quand tu veux.');
    } else {
      run.pausedMs += Date.now() - run.pauseAt; E.setMode(run.modeBefore || 'loop'); overlay(null);
      Voice.say('On reprend !', { wait: false });
    }
    renderControls();
  }

  function stopSession(silent) {
    if (!run) return;
    const r = run; r.stop = true;
    if (E.onCount) E.onCount = null;
    finish(r, false, silent);
  }

  function finish(r, complete, silent) {
    if (r.finished) return; r.finished = true;
    if (r.lock) r.lock.release().catch(() => {});
    if (run === r) run = null;
    Listen.sync();
    Voice.stop();
    const mins = Math.max(1, Math.round((Date.now() - r.t0 - r.pausedMs) / 60000));
    $('#strip').hidden = true; $('#counter').hidden = true;
    if (r.reps > 0 || complete) {
      S.history.push({ date: ymd(), title: r.plan.title, min: mins, reps: r.reps, ex: r.done.length, complete });
      if (complete && r.plan.challenge) {
        const c = S.challenges[r.plan.challenge.id];
        if (c && !c.done.includes(r.plan.challenge.day)) c.done.push(r.plan.challenge.day);
      }
      save();
    }
    if (!silent) {
      if (complete) {
        overlay(`<div class="lbl">Séance terminée</div><div class="n num">${r.reps}</div><div class="next">répétitions · ${mins} min</div>`);
        Voice.say(r.plan.quick ? 'Série terminée. Bien joué !' : `Séance terminée ! ${r.reps} répétitions en ${mins} minutes. Je suis ${coach().proud} de toi. À demain !`, { wait: false });
        setTimeout(() => { if (!run) overlay(null); }, 6000);
      } else {
        overlay(null); setCoachText('Séance arrêtée. Ce que tu as fait est enregistré.');
      }
    }
    E.setMode('loop'); E.setSpeed(tempo() * 0.9);
    state.previewEx = E.ex || state.previewEx;
    if (E.ex) setHud('Aperçu', E.ex.name, exMeta(E.ex, E.ex.def.sets, E.ex.def.reps || E.ex.def.secs));
    renderControls(); render();
  }

  /* ---------- Panneau ---------- */
  function setTab(t) { state.tab = t; state.exDetail = null; state.confirm = null; state.tip = null; render(); $('#panel').scrollTop = 0; }
  function render() {
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
    const v = $('#view');
    const fn = { accueil: viewAccueil, seances: viewSeances, exercices: viewExercices, defis: viewDefis, progres: viewProgres, reglages: viewReglages }[state.tab];
    v.innerHTML = fn();
    bind(v);
  }

  function zoneChips(zs, max = 5) { return zs.slice(0, max).map((z) => `<span class="tag">${zoneLabel[z]}</span>`).join(''); }
  function programZones(items) { const s = []; for (const it of items) for (const z of (it.ex || byId[it.id]).zones) if (!s.includes(z)) s.push(z); return s; }

  function sessionCard() {
    if (!run) return '';
    const r = run;
    return `<div class="card"><div class="row"><div class="grow"><div class="note">Séance en cours</div><h3 class="prog-title">${esc(r.plan.title)}</h3></div>
      <button class="btn ghost sm" data-act="stop">Arrêter</button></div>
      <ul class="ex-list">${r.plan.items.map((it, i) => `<li><div class="ex-row ${i === r.idx ? 'cur' : r.done.includes(i) ? 'done' : ''}"><div><div class="n">${esc(it.ex.name)}</div><div class="z">${it.ex.zones.map((z) => zoneLabel[z]).slice(0, 3).join(' · ')}</div></div><div class="sr">${it.phase ? (it.phase === 'warm' ? 'Échauff.' : 'Étirement') : `${it.sets}×${it.n}${it.ex.hold ? 's' : ''}`}</div></div></li>`).join('')}</ul></div>`;
  }

  function progCard(p) {
    const items = p.items.map((it) => ({ ex: byId[it.id], sets: it.sets, n: it.n }));
    return `<article class="card">
      <div class="row"><div class="grow"><h3 class="prog-title">${esc(p.title)}</h3></div><span class="tag ${p.place === 'salle' ? 'acc' : ''}">${p.place === 'salle' ? 'Salle' : 'Maison'}</span></div>
      <p class="lead">${esc(p.blurb)}</p>
      <div class="prog-meta"><span><b>${items.length}</b> exercices</span><span><b>~${estimateMin(items) + (S.settings.warm ? 4 : 0)}</b> min</span><span>${esc(p.level)}</span></div>
      <div class="chips">${zoneChips(programZones(items), 6)}</div>
      ${p.safety ? `<div class="safety">${esc(p.safety)}</div>` : ''}
      <details><summary class="note">Voir les exercices</summary>
        <ul class="ex-list">${items.map((it) => `<li><button class="ex-row" data-prev="${it.ex.id}"><div><div class="n">${esc(it.ex.name)}</div><div class="z">${it.ex.zones.map((z) => zoneLabel[z]).slice(0, 3).join(' · ')}</div></div><div class="sr">${it.sets}×${it.n}${it.ex.hold ? 's' : ''}</div></button></li>`).join('')}</ul>
      </details>
      <div class="row"><button class="btn accent" data-start="${p.id}">${I.play} Démarrer</button></div>
    </article>`;
  }

  /* ---------- Profil & accueil ---------- */
  const GOALS = [
    ['ventre', 'Perdre du ventre'], ['fessiers', 'Galber les fessiers'], ['muscle', 'Prendre du muscle'], ['forme', 'Garder la forme'],
    ['souplesse', 'Souplesse et dos'], ['running', 'Courir mieux'], ['grossesse', 'Sport pendant la grossesse'], ['senior', 'Bouger en douceur'],
  ];
  const LEVELS = [['debutant', 'Débutant(e)'], ['inter', 'Intermédiaire'], ['avance', 'Avancé(e)']];
  const GOAL_PLAN = {
    ventre: { progs: ['ventre', 'hiit', 'pilates', 'full-maison'], ch: 'ventre52', tips: ['ventre', 'regularite', 'sommeil'] },
    fessiers: { progs: ['fessiers', 'silhouette-salle', 'hiit', 'full-maison'], ch: 'fessiers30', tips: ['fessiers', 'photos', 'regularite'] },
    muscle: { progs: ['pecs', 'bras', 'force-salle', 'full-maison'], ch: 'bras21', tips: ['muscle', 'sommeil', 'recup'] },
    forme: { progs: ['full-maison', 'hiit', 'dos-cou', 'reveil'], ch: 'transfo60', tips: ['regularite', 'echauffement', 'eau'] },
    souplesse: { progs: ['etirements', 'dos-cou', 'pilates', 'reveil'], ch: 'dos28', tips: ['dos', 'respiration', 'regularite'] },
    running: { progs: ['running', 'etirements', 'hiit', 'full-maison'], ch: 'squat30', tips: ['running', 'recup', 'sommeil'] },
    grossesse: { progs: ['grossesse', 'etirements'], ch: null, tips: ['grossesse', 'respiration', 'eau'] },
    senior: { progs: ['seniors', 'reveil', 'etirements', 'dos-cou'], ch: null, tips: ['seniors', 'echauffement', 'regularite'] },
  };
  const needsDumbbells = (p) => p.items.some((it) => byId[it.id].equip.includes('haltères'));
  function recoPrograms() {
    const pr = S.profile; if (!pr) return [];
    const ids = GOAL_PLAN[pr.goal].progs;
    let list = ids.map((id) => progById[id]).filter(Boolean);
    if (pr.place === 'maison') list = list.filter((p) => p.place === 'maison');
    list.sort((a, b) => (needsDumbbells(a) && !pr.dumbbells) - (needsDumbbells(b) && !pr.dumbbells));
    return list;
  }
  function todayPlan() {
    for (const c of CHALLENGES) {
      const st = S.challenges[c.id]; if (!st) continue;
      const day = chDay(c); if (day < 1) continue;
      const plan = chPlan(c, day);
      return { kind: 'challenge', c, day, plan, done: st.done.includes(day) };
    }
    const reco = recoPrograms(); if (!reco.length) return null;
    const p = reco[S.history.length % reco.length];
    return { kind: 'program', p, done: S.history.some((h) => h.date === ymd() && h.complete) };
  }
  function weekCount() {
    const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
    const start = ymd(d);
    return S.history.filter((h) => h.date >= start).length;
  }
  function viewOnboarding() {
    const pr = S.profile || { name: '', sex: 'f', goal: 'ventre', level: 'debutant', freq: 3, place: S.place, dumbbells: false };
    const chip = (k, v, l) => `<button class="chip" data-pf="${k}" data-v="${v}" aria-pressed="${String(pr[k]) === String(v)}">${l}</button>`;
    state.draft = state.draft || Object.assign({}, pr);
    const d = state.draft;
    const dchip = (k, v, l) => `<button class="chip" data-pf="${k}" data-v="${v}" aria-pressed="${String(d[k]) === String(v)}">${l}</button>`;
    return `<div><h2>${S.profile ? 'Ton profil' : 'Bienvenue sur Corpus'}</h2><p class="lead">Quelques questions pour que ton coach te prépare le bon programme.</p></div>
      <div class="form" style="grid-template-columns:1fr"><label>Ton prénom (facultatif)<input id="pf-name" value="${esc(d.name || '')}" autocomplete="given-name" placeholder="Ex. Charlotte"></label></div>
      <div class="setting"><span>Tu es</span><div class="chips">${dchip('sex', 'f', 'Une femme')}${dchip('sex', 'm', 'Un homme')}</div></div>
      <div class="setting"><span>Ton objectif principal</span><div class="chips">${GOALS.map(([k, l]) => dchip('goal', k, l)).join('')}</div></div>
      <div class="setting"><span>Ton niveau</span><div class="chips">${LEVELS.map(([k, l]) => dchip('level', k, l)).join('')}</div></div>
      <div class="setting"><span>Séances par semaine</span><div class="chips">${[2, 3, 4, 5, 6].map((n) => dchip('freq', n, String(n))).join('')}</div></div>
      <div class="setting"><span>Tu t'entraînes surtout</span><div class="chips">${dchip('place', 'maison', 'À la maison')}${dchip('place', 'salle', 'En salle')}</div></div>
      <div class="setting"><span>Tu as des haltères ?</span><div class="chips">${dchip('dumbbells', true, 'Oui')}${dchip('dumbbells', false, 'Non')}</div></div>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn accent" data-act="save-profile">${S.profile ? 'Enregistrer' : 'Créer mon programme'}</button>${S.profile ? '<button class="btn ghost" data-act="cancel-profile">Annuler</button>' : ''}</div>`;
  }
  function tipCard(t) { return `<button class="ex-row" data-tip="${t.id}"><div><div class="n">${esc(t.title)}</div><div class="z">${esc(t.cat)}</div></div><div class="z">Lire</div></button>`; }
  function viewTip(t) {
    return `<button class="back" data-act="tip-back">${I.back} Retour</button>
      <div><div class="note">${esc(t.cat)}</div><h2>${esc(t.title)}</h2></div>
      <div class="card">${t.body.map((p) => `<p style="margin:0">${esc(p)}</p>`).join('')}</div>
      <p class="note">Conseils généraux, qui ne remplacent pas l'avis d'un médecin ou d'une sage-femme.</p>`;
  }
  function viewAccueil() {
    if (!S.profile || state.editProfile) return viewOnboarding();
    if (state.tip) return viewTip(window.CorpusTips.find((t) => t.id === state.tip));
    const pr = S.profile, gp = GOAL_PLAN[pr.goal];
    const tp = todayPlan();
    const wk = weekCount();
    const goalLabel = (GOALS.find((g) => g[0] === pr.goal) || [, ''])[1];
    const h = new Date().getHours();
    const hello = h < 12 ? 'Bonjour' : h < 18 ? 'Salut' : 'Bonsoir';
    let today = '';
    if (tp && tp.kind === 'challenge') {
      today = tp.done ? `<div class="row">${I.check}<b>Séance du jour validée.</b><span class="note">Repos bien mérité.</span></div>`
        : tp.plan ? `<p class="lead">${esc(tp.c.title)}, jour ${tp.day}${tp.plan.sub ? ' : ' + esc(tp.plan.sub) : ''}.</p><div class="row"><button class="btn accent" data-ch-go="${tp.c.id}">${I.play} C'est parti</button></div>`
        : `<p class="lead">${esc(tp.c.title)}, jour ${tp.day} : jour de repos. Une marche de 20 minutes est idéale.</p><div class="row"><button class="btn ghost sm" data-ch-rest="${tp.c.id}">Valider le repos</button></div>`;
    } else if (tp) {
      const items = tp.p.items.map((it) => ({ ex: byId[it.id], sets: it.sets, n: it.n }));
      today = `<p class="lead"><b>${esc(tp.p.title)}</b> · ${items.length} exercices · ~${estimateMin(items) + (S.settings.warm ? 4 : 0)} min</p>
        <div class="chips">${zoneChips(programZones(items), 6)}</div>
        <div class="row"><button class="btn accent" data-start="${tp.p.id}">${I.play} C'est parti</button>${tp.done ? '<span class="note">Déjà une séance aujourd\'hui, bravo !</span>' : ''}</div>`;
    }
    const ch = gp.ch && CHALLENGES.find((c) => c.id === gp.ch);
    const chSuggest = ch && !S.challenges[ch.id] && !Object.keys(S.challenges).length
      ? `<div class="card"><div class="row"><div class="grow"><div class="note">Défi conseillé</div><h3 class="prog-title">${esc(ch.title)}</h3></div><span class="tag">${ch.days} jours</span></div><p class="lead">${esc(ch.blurb)}</p><div class="row"><button class="btn ghost sm" data-ch-start="${ch.id}">Relever le défi</button></div></div>` : '';
    const tips = gp.tips.map((id) => window.CorpusTips.find((t) => t.id === id)).filter(Boolean);
    const others = window.CorpusTips.filter((t) => !gp.tips.includes(t.id) && (!t.aud.length || t.aud.includes(pr.sex === 'f' ? 'femme' : 'homme') || t.aud.some((a) => ['mobilite'].includes(a))));
    return `<div><h2>${hello}${pr.name ? ' ' + esc(pr.name) : ''} !</h2><p class="lead">Objectif : ${esc(goalLabel.toLowerCase())} · ${esc((LEVELS.find((l) => l[0] === pr.level) || [, ''])[1].toLowerCase())} <button class="back" data-act="edit-profile" style="display:inline">· modifier</button></p></div>
      ${sessionCard()}
      <div class="card"><div class="row"><h3 class="grow">Ta séance du jour</h3></div>${today || '<p class="lead">Choisis une séance dans l\'onglet Séances.</p>'}</div>
      <div class="stats">
        <div class="stat"><div class="v">${wk}<span style="font-size:18px;color:var(--muted)"> / ${pr.freq}</span></div><div class="k">Séances cette semaine</div><div class="bar-track" style="margin-top:6px"><b style="width:${Math.min(100, Math.round(wk / pr.freq * 100))}%"></b></div></div>
        <div class="stat"><div class="v">${streak()}</div><div class="k">Jours d'affilée</div></div>
      </div>
      ${chSuggest}
      <div><h3>Recommandé pour toi</h3></div>
      ${recoPrograms().slice(0, 3).map((p) => progCard(p) + (needsDumbbells(p) && !pr.dumbbells ? '' : '')).join('')}
      <div class="card"><h3>Les conseils de ton coach</h3><ul class="ex-list">${tips.map((t) => `<li>${tipCard(t)}</li>`).join('')}</ul>
        <details><summary class="note">Tous les conseils</summary><ul class="ex-list">${others.map((t) => `<li>${tipCard(t)}</li>`).join('')}</ul></details></div>`;
  }

  function viewSeances() {
    const aud = S.aud;
    let progs = PROGRAMS.filter((p) => aud === 'tous' || p.aud.includes(aud));
    progs = S.place === 'maison' ? progs.filter((p) => p.place === 'maison') : progs.slice().sort((a, b) => (b.place === 'salle') - (a.place === 'salle'));
    const custom = S.custom.length ? `<article class="card"><div class="row"><div class="grow"><h3 class="prog-title">Ma séance</h3><div class="note">${S.custom.length} exercices · ~${estimateMin(S.custom)} min</div></div>
      <button class="btn accent" data-act="start-custom">${I.play} Démarrer</button></div>
      <ul class="ex-list">${S.custom.map((it, i) => { const ex = byId[it.id]; return `<li><div class="ex-row"><div><div class="n">${esc(ex.name)}</div><div class="z">${it.sets} × ${it.n}${ex.hold ? ' s' : ''}</div></div>
        <div class="row"><button class="btn ghost sm" data-cust="${i}" data-d="-1" aria-label="Moins">−</button><button class="btn ghost sm" data-cust="${i}" data-d="1" aria-label="Plus">+</button><button class="btn ghost sm" data-cust-del="${i}">Retirer</button></div></div></li>`; }).join('')}</ul></article>` : '';
    return `${sessionCard()}
      <div><h2>Séances guidées</h2><p class="lead">${S.place === 'maison' ? 'À la maison, sans matériel ou avec une chaise et des haltères.' : 'En salle : machines, barres, poulies, plus tout ce qui se fait à la maison.'}</p></div>
      <div class="chips" role="group" aria-label="Pour qui">${AUD.map(([k, l]) => `<button class="chip" data-aud="${k}" aria-pressed="${aud === k}">${l}</button>`).join('')}</div>
      ${custom}
      ${progs.map(progCard).join('') || '<div class="empty">Aucune séance pour ce filtre ici. Essaie l\'autre lieu.</div>'}`;
  }

  function viewExercices() {
    if (state.exDetail) return viewExDetail(byId[state.exDetail]);
    const q = state.exQuery.trim().toLowerCase();
    const list = EX.filter((e) => S.place === 'salle' || e.place.includes('maison'))
      .filter((e) => !state.exZones.size || [...state.exZones].some((z) => (z === 'etirements' ? e.stretch : e.zones.includes(z))))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.zones.some((z) => zoneLabel[z].toLowerCase().includes(q)));
    return `<div><h2>${EX.length} exercices, tout le corps</h2><p class="lead">Touche un exercice : le coach le montre en 3D. Tourne autour avec la souris ou le doigt.</p></div>
      <input class="search" id="ex-q" type="search" placeholder="Rechercher : squat, cou, fessiers…" value="${esc(state.exQuery)}" aria-label="Rechercher un exercice">
      <div class="chips" role="group" aria-label="Zones">${ZONES.concat([['etirements', 'Étirements']]).map(([k, l]) => `<button class="chip" data-zone="${k}" aria-pressed="${state.exZones.has(k)}">${l}</button>`).join('')}</div>
      <div class="note">${list.length} résultat${list.length > 1 ? 's' : ''}${S.place === 'maison' ? ' · lieu : maison' : ' · lieu : salle'}</div>
      <ul class="ex-list">${list.map((e) => `<li><button class="ex-row ${state.previewEx === e ? 'cur' : ''}" data-ex="${e.id}"><div><div class="n">${esc(e.name)}</div><div class="z">${e.zones.map((z) => zoneLabel[z]).join(' · ')}</div></div><div class="z">${esc(equipText(e))}</div></button></li>`).join('') || '<li class="empty">Aucun exercice ne correspond.</li>'}</ul>`;
  }

  function viewExDetail(ex) {
    const inCustom = S.custom.some((c) => c.id === ex.id);
    const d = ex.def;
    return `<button class="back" data-act="ex-back">${I.back} Tous les exercices</button>
      <div><h2>${esc(ex.name)}</h2><div class="chips" style="margin-top:8px">${ex.zones.map((z) => `<span class="tag acc">${zoneLabel[z]}</span>`).join('')}</div></div>
      <dl class="kv"><dt>Matériel</dt><dd>${esc(equipText(ex))}</dd><dt>Lieu</dt><dd>${ex.place.map((p) => p === 'salle' ? 'Salle' : 'Maison').join(' et ')}</dd>
        <dt>Volume conseillé</dt><dd>${d.sets} × ${d.reps ? d.reps + ' répétitions' : d.secs + ' secondes'}</dd><dt>Niveau</dt><dd>${['', 'Débutant', 'Intermédiaire', 'Avancé'][ex.level]}</dd></dl>
      <div class="card"><h3>Exécution</h3><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      ${ex.sided ? `<div class="row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="note">Exercice unilatéral : en séance, le coach fait les deux côtés.</span><button class="btn ghost sm" data-act="other-side">Voir l'autre côté</button></div>` : ''}
      <div class="card"><h3>Ce que le coach te dira</h3><div class="chips">${ex.cues.map((c) => `<span class="tag">« ${esc(c)} »</span>`).join('')}</div>${ex.note ? `<div class="note">${esc(ex.note)}</div>` : ''}</div>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn accent" data-act="try">${I.play} Faire 1 série</button>
        <button class="btn ghost" data-act="${inCustom ? 'rm-custom' : 'add-custom'}">${inCustom ? 'Retirer de ma séance' : '+ Ajouter à ma séance'}</button></div>`;
  }

  /* ---------- Défis ---------- */
  function chDay(c) { const st = S.challenges[c.id]; return st ? Math.min(c.days, daysBetween(st.start, ymd()) + 1) : 0; }
  function chPlan(c, day) {
    const prog = (day - 1) / Math.max(1, c.days - 1);
    if (c.single) {
      const total = c.base + c.step * (day - 1);
      return { title: `${c.title} · jour ${day}`, items: [{ id: c.single, sets: 3, n: Math.ceil(total / 3) }] };
    }
    const pid = c.rotation[(day - 1) % c.rotation.length];
    if (pid === 'repos') return null;
    const p = progById[pid];
    const scale = 1 + 0.35 * prog;
    return { title: `${c.title} · jour ${day}`, sub: p.title, items: p.items.map((it) => ({ id: it.id, sets: it.sets, n: Math.round(it.n * scale) })) };
  }
  function viewDefis() {
    const cards = CHALLENGES.map((c) => {
      const st = S.challenges[c.id];
      if (!st) {
        return `<article class="card"><div class="row"><div class="grow"><h3 class="prog-title">${esc(c.title)}</h3></div><span class="tag">${c.days} jours</span></div>
          <p class="lead">${esc(c.blurb)}</p>
          <div class="row"><button class="btn accent sm" data-ch-start="${c.id}">Commencer aujourd'hui</button>
          <label class="note" style="display:flex;gap:6px;align-items:center">ou le <input type="date" id="chd-${c.id}" style="border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface)"></label>
          <button class="btn ghost sm" data-ch-start-date="${c.id}">Valider</button></div></article>`;
      }
      const day = chDay(c);
      const done = st.done.length;
      const plan = day > 0 ? chPlan(c, day) : null;
      const cells = [];
      for (let d = 1; d <= c.days; d++) {
        const isRest = !c.single && c.rotation[(d - 1) % c.rotation.length] === 'repos';
        const cls = st.done.includes(d) ? 'done' : d === day ? 'today' : isRest ? 'rest' : d < day ? 'miss' : '';
        cells.push(`<span class="${cls}" title="Jour ${d}">${d}</span>`);
      }
      const todayDone = st.done.includes(day);
      const started = daysBetween(st.start, ymd()) >= 0;
      return `<article class="card"><div class="row"><div class="grow"><h3 class="prog-title">${esc(c.title)}</h3><div class="note">Commencé le ${fmtDate(st.start)}</div></div>
          <span class="tag acc">${started ? `Jour ${day} / ${c.days}` : `Débute le ${fmtDate(st.start)}`}</span></div>
        <div class="bar-track" aria-label="${done} jours validés sur ${c.days}"><b style="width:${Math.round(done / c.days * 100)}%"></b></div>
        <div class="note">${done} jour${done > 1 ? 's' : ''} validé${done > 1 ? 's' : ''} sur ${c.days}</div>
        <div class="cal">${cells.join('')}</div>
        ${!started ? '' : todayDone ? `<div class="row">${I.check}<b>Jour ${day} validé.</b><span class="note">Reviens demain.</span></div>`
          : plan ? `<div class="row"><button class="btn accent" data-ch-go="${c.id}">${I.play} Séance du jour</button><span class="note">${esc(plan.sub || '')} · ~${estimateMin(plan.items.map((it) => ({ ex: byId[it.id], sets: it.sets, n: it.n })))} min</span></div>`
          : `<div class="row"><span class="note">Jour de repos : marche 20 minutes ou fais la séance Réveil mobilité.</span><button class="btn ghost sm" data-ch-rest="${c.id}">Valider le repos</button></div>`}
        ${state.confirm === 'ch-' + c.id ? `<div class="confirm"><span>Abandonner ce défi ? Ta progression sera effacée.</span><button class="btn sm" data-ch-quit="${c.id}">Abandonner</button><button class="btn ghost sm" data-act="cancel">Garder</button></div>`
          : `<button class="back" data-confirm="ch-${c.id}">Abandonner le défi</button>`}
      </article>`;
    });
    return `<div><h2>Défis</h2><p class="lead">Un programme jour par jour, qui devient un peu plus dur chaque semaine. Prends une photo avant le jour 1 dans Progrès.</p></div>${cards.join('')}`;
  }

  /* ---------- Progrès ---------- */
  function streak() {
    const days = new Set(S.history.map((h) => h.date));
    let d = new Date(), n = 0;
    if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
    while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function badges() {
    const H = S.history, reps = H.reduce((a, h) => a + h.reps, 0), st = streak();
    const anyCh = Object.values(S.challenges).some((c) => c.done.length >= 7);
    return [
      { on: H.length >= 1, t: 'Première séance', d: 'Le plus dur est fait', i: I.star },
      { on: H.length >= 10, t: '10 séances', d: `${Math.min(H.length, 10)} / 10`, i: I.trophy },
      { on: st >= 7, t: '7 jours d\'affilée', d: `${Math.min(st, 7)} / 7`, i: I.flame },
      { on: reps >= 1000, t: '1 000 répétitions', d: `${Math.min(reps, 1000)} / 1000`, i: I.bolt },
      { on: anyCh, t: 'Une semaine de défi', d: '7 jours validés', i: I.check },
      { on: PHOTOS.length >= 2, t: 'Avant / après', d: `${Math.min(PHOTOS.length, 2)} / 2 photos`, i: I.camera },
    ];
  }
  function barChart(days) {
    const W = 400, H = 150, L = 28, B = 22, T = 10;
    const max = Math.max(10, ...days.map((d) => d.v));
    const top = Math.ceil(max / 10) * 10;
    const bw = (W - L) / days.length;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    let s = '';
    for (const g of [0, top / 2, top]) s += `<line class="grid" x1="${L}" x2="${W}" y1="${y(g)}" y2="${y(g)}"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${g}</text>`;
    days.forEach((d, i) => {
      const x = L + i * bw + 3, w = bw - 6, h = Math.max(0, y(0) - y(d.v));
      if (d.v > 0) { const r = Math.min(4, w / 2, h); s += `<path d="M${x},${y(0)} V${y(d.v) + r} Q${x},${y(d.v)} ${x + r},${y(d.v)} H${x + w - r} Q${x + w},${y(d.v)} ${x + w},${y(d.v) + r} V${y(0)} Z" fill="var(--accent)"/>`; }
      if (i % 2 === 1 || days.length <= 7) s += `<text class="axis" x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${d.lbl}</text>`;
      s += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-tip="${d.full} : ${d.v} min" data-x="${(x + w / 2) / W}" data-y="${y(d.v) / H}"/>`;
    });
    return `<div class="chart" data-chart><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes d'entraînement sur 14 jours">${s}</svg><div class="tip" hidden></div></div>`;
  }
  function lineChart(pts, unit) {
    const W = 400, H = 130, L = 34, B = 20, T = 12, R = 30;
    const vs = pts.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 2) { lo -= 1; hi += 1; }
    const padV = (hi - lo) * 0.15; lo -= padV; hi += padV;
    const x = (i) => L + (W - L - R) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    let s = '';
    for (const g of [lo + padV, hi - padV]) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${Math.round(g * 10) / 10}</text>`;
    s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><rect x="${x(i) - 14}" y="${T}" width="28" height="${H - T - B}" fill="transparent" data-tip="${fmtDate(p.date)} : ${p.v} ${unit}" data-x="${x(i) / W}" data-y="${y(p.v) / H}"/>`; });
    const last = pts[pts.length - 1];
    s += `<text class="axis" x="${x(pts.length - 1) + 8}" y="${y(last.v) + 3}" style="fill:var(--ink);font-weight:700">${last.v}</text>`;
    s += `<text class="axis" x="${L}" y="${H - 4}">${fmtDate(pts[0].date)}</text>${pts.length > 1 ? `<text class="axis" x="${W - R}" y="${H - 4}" text-anchor="end">${fmtDate(last.date)}</text>` : ''}`;
    return `<div class="chart" data-chart><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution en ${unit}">${s}</svg><div class="tip" hidden></div></div>`;
  }
  const METRICS = [['poids', 'Poids', 'kg'], ['taille', 'Tour de taille', 'cm'], ['hanches', 'Tour de hanches', 'cm'], ['bras', 'Tour de bras', 'cm'], ['cuisse', 'Tour de cuisse', 'cm']];

  function viewProgres() {
    const H = S.history;
    const reps = H.reduce((a, h) => a + h.reps, 0), mins = H.reduce((a, h) => a + h.min, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const k = ymd(d);
      days.push({ v: H.filter((h) => h.date === k).reduce((a, h) => a + h.min, 0), lbl: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }), full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) });
    }
    const ms = S.measures.slice().sort((a, b) => a.date.localeCompare(b.date));
    const charts = METRICS.map(([k, l, u]) => {
      const pts = ms.filter((m) => m[k] !== undefined && m[k] !== null && m[k] !== '').map((m) => ({ date: m.date, v: +m[k] }));
      if (!pts.length) return '';
      const delta = pts.length > 1 ? Math.round((pts[pts.length - 1].v - pts[0].v) * 10) / 10 : null;
      return `<div class="card"><div class="row"><h3 class="grow">${l}</h3>${delta !== null ? `<span class="tag ${delta < 0 ? 'acc' : ''}">${delta > 0 ? '+' : ''}${delta} ${u} depuis le ${fmtDate(pts[0].date)}</span>` : ''}</div>${lineChart(pts, u)}</div>`;
    }).join('');
    const sel = state.selPhotos.map((id) => PHOTOS.find((p) => p.id === id)).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
    const cmp = sel.length === 2 ? `<div class="compare" id="cmp"><img src="${sel[0].src}" alt="Photo du ${fmtDate(sel[0].date)}"><img class="after" src="${sel[1].src}" alt="Photo du ${fmtDate(sel[1].date)}"><div class="line"></div>
        <span class="lab" style="left:8px">${esc(sel[0].label)} · ${fmtDate(sel[0].date)}</span><span class="lab" style="right:8px">${esc(sel[1].label)} · ${fmtDate(sel[1].date)}</span>
        <input type="range" id="cmp-r" min="0" max="100" value="50" aria-label="Glisser pour comparer"></div>` : '';
    return `<div><h2>Ta progression</h2><p class="lead">Tout est enregistré sur cet appareil, dans ce navigateur.</p></div>
      <div class="stats">
        <div class="stat"><div class="v">${H.length}</div><div class="k">Séances</div></div>
        <div class="stat"><div class="v">${mins}</div><div class="k">Minutes</div></div>
        <div class="stat"><div class="v">${reps.toLocaleString('fr-FR')}</div><div class="k">Répétitions</div></div>
        <div class="stat"><div class="v">${streak()}</div><div class="k">Jours d'affilée</div></div>
      </div>
      <div class="card"><h3>Minutes par jour, 14 derniers jours</h3>${H.length ? barChart(days) : '<div class="empty">Ta première séance apparaîtra ici.</div>'}</div>
      <div class="card"><h3>Badges</h3><div class="badges">${badges().map((b) => `<div class="bdg ${b.on ? 'on' : ''}"><div class="ico">${b.i}</div><div class="t">${b.t}</div><div class="d">${b.d}</div></div>`).join('')}</div></div>
      <div class="card"><h3>Photos avant / après</h3>
        <p class="note">Même endroit, même lumière, même tenue : la comparaison sera parlante. Sélectionne deux photos pour les comparer. Tes photos restent sur cet appareil.</p>
        <div class="form"><label>Étiquette<select id="ph-label"><option>Avant</option><option>Pendant</option><option>Après</option></select></label><label>Date<input type="date" id="ph-date" value="${ymd()}"></label></div>
        <label class="btn ghost" style="justify-self:start">${I.camera} Ajouter une photo<input type="file" id="ph-file" accept="image/*" hidden></label>
        ${PHOTOS.length ? `<div class="photos">${PHOTOS.slice().sort((a, b) => a.date.localeCompare(b.date)).map((p) => `<button class="photo" data-photo="${p.id}" aria-pressed="${state.selPhotos.includes(p.id)}"><img src="${p.src}" alt="${esc(p.label)} du ${fmtDate(p.date)}"><small>${esc(p.label)} · ${fmtDate(p.date)}</small></button>`).join('')}</div>` : '<div class="empty">Aucune photo pour l\'instant.</div>'}
        ${cmp}
        ${state.selPhotos.length ? (state.confirm === 'photos' ? `<div class="confirm"><span>Supprimer ${state.selPhotos.length} photo(s) ?</span><button class="btn sm" data-act="del-photos">Supprimer</button><button class="btn ghost sm" data-act="cancel">Annuler</button></div>` : `<button class="back" data-confirm="photos">Supprimer la sélection</button>`) : ''}
      </div>
      <div class="card"><h3>Mensurations</h3>
        <div class="form">
          <label>Date<input type="date" id="m-date" value="${ymd()}"></label>
          ${METRICS.map(([k, l, u]) => `<label>${l} (${u})<input type="number" inputmode="decimal" step="0.1" min="0" id="m-${k}"></label>`).join('')}
        </div>
        <button class="btn accent" data-act="add-measure" style="justify-self:start">Enregistrer</button>
      </div>
      ${charts}
      ${ms.length ? `<div class="card"><h3>Historique des mesures</h3><ul class="ex-list">${ms.slice().reverse().slice(0, 8).map((m) => `<li><div class="ex-row"><div><div class="n">${fmtDate(m.date)}</div><div class="z">${METRICS.filter(([k]) => m[k] !== undefined && m[k] !== '').map(([k, l, u]) => `${l} ${m[k]} ${u}`).join(' · ')}</div></div><button class="btn ghost sm" data-m-del="${m.id}">Supprimer</button></div></li>`).join('')}</ul></div>` : ''}
      ${H.length ? `<div class="card"><h3>Dernières séances</h3><ul class="ex-list">${H.slice().reverse().slice(0, 8).map((h) => `<li><div class="ex-row"><div><div class="n">${esc(h.title)}</div><div class="z">${fmtDate(h.date)} · ${h.min} min · ${h.reps} rép.</div></div>${h.complete ? `<span class="tag acc">Terminée</span>` : '<span class="tag">Partielle</span>'}</div></li>`).join('')}</ul></div>` : ''}`;
  }

  /* ---------- Réglages ---------- */
  function viewReglages() {
    const st = S.settings;
    const voices = Voice.list;
    return `<div class="card"><div class="row"><div class="grow"><h3>Mon profil</h3><div class="note">${S.profile ? esc((GOALS.find((g) => g[0] === S.profile.goal) || [, ''])[1]) + ' · ' + S.profile.freq + ' séances par semaine' : 'Pas encore créé'}</div></div><button class="btn ghost sm" data-act="edit-profile">Modifier</button></div></div>
      <div><h2>Ton coach</h2><p class="lead">Choisis la personne qui t'accompagne, son apparence et sa voix.</p></div>
      <div class="setting"><span>Coach</span><div class="seg" role="group">
        <button data-set="coach" data-v="f" aria-pressed="${st.coach === 'f'}">Léa</button><button data-set="coach" data-v="m" aria-pressed="${st.coach === 'm'}">Malik</button></div></div>
      <div class="card"><h3>Avatar réaliste (bêta)</h3>
        <p class="note">Importe un personnage 3D humain au format .glb avec un squelette standard (Mixamo, Character Creator, MakeHuman, Unity/VRM). Le coach reprend tous ses mouvements avec ce corps. Le fichier reste sur cet appareil.</p>
        ${modelState.name ? `<div class="row">${I.check}<b>${esc(modelState.name)}</b><button class="btn ghost sm" data-act="clear-model">Revenir à l'avatar intégré</button></div>` : ''}
        ${modelState.loading ? '<div class="note">Chargement du modèle…</div>' : ''}
        ${modelState.error ? `<div class="safety">${esc(modelState.error)} Vérifie que le personnage a un squelette humanoïde complet (bassin, colonne, bras, jambes).</div>` : ''}
        <label class="btn ghost sm" style="justify-self:start">Importer un fichier .glb<input type="file" id="model-file" accept=".glb,model/gltf-binary" hidden></label>
      </div>
      <div class="setting"><span>Peau</span><div class="swatches">${SKINS.map((c, i) => `<button class="sw" style="background:${c}" data-set="skin" data-v="${i}" aria-pressed="${st.skin === i}" aria-label="Teinte ${i + 1}"></button>`).join('')}</div></div>
      <div class="setting"><span>Cheveux</span><div class="swatches">${HAIRS.map((c, i) => `<button class="sw" style="background:${c}" data-set="hair" data-v="${i}" aria-pressed="${st.hair === i}" aria-label="Couleur ${i + 1}"></button>`).join('')}</div></div>
      <div class="setting"><span>Tenue</span><div class="swatches">${OUTFITS.map((o, i) => `<button class="sw duo" style="--a:${o.top};--b:${o.bottom}" data-set="outfit" data-v="${i}" aria-pressed="${st.outfit === i}" aria-label="${o.n}"></button>`).join('')}</div></div>
      <div class="card">
        <label class="toggle">Voix du coach<input type="checkbox" id="s-voice" ${st.voice ? 'checked' : ''}></label>
        <label class="toggle">Compter les répétitions à voix haute<input type="checkbox" id="s-count" ${st.count ? 'checked' : ''}></label>
        <label class="toggle">Conseils et encouragements pendant les séries<input type="checkbox" id="s-cues" ${st.cues ? 'checked' : ''}></label>
        <label class="toggle">Échauffement et étirements automatiques<input type="checkbox" id="s-warm" ${st.warm ? 'checked' : ''}></label>
        <label class="toggle">Commandes vocales pendant la séance<input type="checkbox" id="s-listen" ${st.listen ? 'checked' : ''}></label>
        <div class="note">Dis « pause », « reprends », « suivant », « répète » ou « stop ». Le micro ne s'active que pendant une séance.${Listen.supported ? '' : ' Ce navigateur ne propose pas la reconnaissance vocale : essaie Chrome, Edge ou Safari.'}</div>
        ${synth && !nativeTTS() ? `<div class="form" style="grid-template-columns:1fr"><label>Voix<select id="s-vsel"><option value="">Automatique</option>${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === st.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label></div>
          <button class="btn ghost sm" data-act="test-voice" style="justify-self:start">${I.sound} Tester la voix</button>`
          : nativeTTS() ? `<button class="btn ghost sm" data-act="test-voice" style="justify-self:start">${I.sound} Tester la voix</button>` : '<div class="note">Ce navigateur ne propose pas de synthèse vocale : le coach parle par sous-titres.</div>'}
        ${synth && !nativeTTS() && !voices.length ? '<div class="note">Aucune voix française trouvée sur cet appareil. Installe une voix française dans les réglages du système pour un meilleur rendu.</div>' : ''}
      </div>
      <div class="setting"><span>Rythme des répétitions</span><div class="seg" role="group">${Object.keys(TEMPO).map((k) => `<button data-set="tempo" data-v="${k}" aria-pressed="${st.tempo === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
      <div class="setting"><span>Repos entre les séries</span><div class="seg" role="group">${[20, 30, 45, 60, 90].map((k) => `<button data-set="rest" data-v="${k}" aria-pressed="${st.rest === k}">${k} s</button>`).join('')}</div></div>
      <div class="card"><h3>Mes données</h3><p class="note">Séances, défis, mesures et photos sont stockés uniquement dans ce navigateur.</p>
        ${state.confirm === 'reset' ? `<div class="confirm"><span>Tout effacer, photos comprises ?</span><button class="btn sm" data-act="reset">Tout effacer</button><button class="btn ghost sm" data-act="cancel">Annuler</button></div>` : `<button class="btn ghost sm" data-confirm="reset" style="justify-self:start">Effacer mes données</button>`}
      </div>`;
  }

  /* ---------- Événements ---------- */
  function resizeImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  function bind(v) {
    v.onclick = async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      const d = t.dataset;
      if (d.pf) { const v = d.v === 'true' ? true : d.v === 'false' ? false : /^\d+$/.test(d.v) ? +d.v : d.v; state.draft[d.pf] = v; const nm = $('#pf-name'); if (nm) state.draft.name = nm.value; render(); }
      else if (d.tip) { state.tip = d.tip; render(); $('#panel').scrollTop = 0; }
      else if (d.aud) { S.aud = d.aud; save(); render(); }
      else if (d.start) { const p = progById[d.start]; startSession({ title: p.title, items: p.items.map((x) => ({ ...x })) }); }
      else if (d.prev) preview(byId[d.prev], true);
      else if (d.ex) { state.exDetail = d.ex; preview(byId[d.ex], true); render(); $('#panel').scrollTop = 0; }
      else if (d.zone) { state.exZones.has(d.zone) ? state.exZones.delete(d.zone) : state.exZones.add(d.zone); render(); }
      else if (d.cust !== undefined) { const it = S.custom[+d.cust]; const ex = byId[it.id]; it.n = Math.max(ex.hold ? 10 : 4, it.n + (+d.d) * (ex.hold ? 5 : 2)); save(); render(); }
      else if (d.custDel !== undefined) { S.custom.splice(+d.custDel, 1); save(); render(); }
      else if (d.chStart) { S.challenges[d.chStart] = { start: ymd(), done: [] }; save(); render(); toast('Défi lancé. Jour 1 aujourd\'hui !'); }
      else if (d.chStartDate) { const val = $('#chd-' + d.chStartDate).value; if (!val) { toast('Choisis une date de début.'); return; } S.challenges[d.chStartDate] = { start: val, done: [] }; save(); render(); }
      else if (d.chGo) { const c = CHALLENGES.find((x) => x.id === d.chGo); const day = chDay(c); const plan = chPlan(c, day); plan.challenge = { id: c.id, day }; startSession(plan); }
      else if (d.chRest) { const c = CHALLENGES.find((x) => x.id === d.chRest); S.challenges[c.id].done.push(chDay(c)); save(); render(); toast('Repos validé. Récupère bien.'); }
      else if (d.chQuit) { delete S.challenges[d.chQuit]; state.confirm = null; save(); render(); }
      else if (d.confirm) { state.confirm = d.confirm; render(); }
      else if (d.photo) { const id = d.photo; const i = state.selPhotos.indexOf(id); if (i >= 0) state.selPhotos.splice(i, 1); else { state.selPhotos.push(id); if (state.selPhotos.length > 2) state.selPhotos.shift(); } render(); }
      else if (d.mDel) { S.measures = S.measures.filter((m) => m.id !== d.mDel); save(); render(); }
      else if (d.set) {
        const key = d.set; let val = d.v;
        if (['skin', 'hair', 'outfit', 'rest'].includes(key)) val = +val;
        S.settings[key] = val; save();
        if (['coach', 'skin', 'hair', 'outfit'].includes(key)) { E.setAvatar(avatarCfg()); updateCoachUi(); if (key === 'coach') { Voice.pick(); Voice.say(`Salut, c'est ${coach().name}. C'est moi qui t'accompagne maintenant.`, { wait: false, interrupt: true }); } }
        render();
      } else {
        switch (d.act) {
          case 'stop': stopSession(); break;
          case 'save-profile': {
            const first = !S.profile;
            const dr = Object.assign({}, state.draft, { name: ($('#pf-name').value || '').trim().slice(0, 30) });
            S.profile = dr; state.draft = null; state.editProfile = false;
            if (first) { S.settings.coach = dr.sex; S.aud = dr.sex === 'f' ? 'femme' : 'homme'; E.setAvatar(avatarCfg()); updateCoachUi(); Voice.pick(); }
            if (dr.goal === 'grossesse') S.aud = 'prenatal'; else if (dr.goal === 'senior') S.aud = 'senior';
            save(); setPlace(dr.place);
            if (first) Voice.say(`Enchanté${dr.sex === 'f' ? 'e' : ''}${dr.name ? ' ' + dr.name : ''} ! Je suis ${coach().name}, ton coach. Ton programme est prêt.`, { wait: false });
            break;
          }
          case 'cancel-profile': state.editProfile = false; state.draft = null; render(); break;
          case 'edit-profile': state.editProfile = true; state.draft = Object.assign({}, S.profile); state.tab = 'accueil'; render(); break;
          case 'tip-back': state.tip = null; render(); break;
          case 'clear-model': E.clearModel(); modelState.name = null; IDB.del('avatar'); render(); toast('Avatar intégré rétabli.'); break;
          case 'start-custom': startSession({ title: 'Ma séance', items: S.custom.map((x) => ({ ...x })) }); break;
          case 'ex-back': state.exDetail = null; render(); break;
          case 'other-side': { const cur = E.ex; if (cur && !run) { E.setExercise(E.mirror(cur)); E.setMode('loop'); } break; }
          case 'try': { const ex = byId[state.exDetail]; startSession({ title: ex.name, items: [{ ex, sets: 1, n: ex.def.reps || ex.def.secs }], quick: true }); break; }
          case 'add-custom': { const ex = byId[state.exDetail]; S.custom.push({ id: ex.id, sets: ex.def.sets, n: ex.def.reps || ex.def.secs }); save(); render(); toast(`${ex.name} ajouté à ta séance.`); break; }
          case 'rm-custom': S.custom = S.custom.filter((c) => c.id !== state.exDetail); save(); render(); break;
          case 'cancel': state.confirm = null; render(); break;
          case 'reset': localStorage.removeItem(KEY); localStorage.removeItem(PKEY); Object.assign(S, JSON.parse(JSON.stringify(DEFAULTS))); PHOTOS = []; state.confirm = null; save(); E.setAvatar(avatarCfg()); updateCoachUi(); render(); toast('Données effacées.'); break;
          case 'test-voice': Voice.say(`Bonjour, je suis ${coach().name}, ton coach. Un, deux, trois, quatre ! On lâche rien !`, { wait: false, interrupt: true }); break;
          case 'add-measure': {
            const m = { id: String(Date.now()), date: $('#m-date').value || ymd() };
            let any = false;
            for (const [k] of METRICS) { const val = $('#m-' + k).value; if (val !== '') { m[k] = Math.round(parseFloat(val) * 10) / 10; any = true; } }
            if (!any) { toast('Renseigne au moins une mesure.'); return; }
            S.measures.push(m); save(); render(); toast('Mesures enregistrées.'); break;
          }
          case 'del-photos': PHOTOS = PHOTOS.filter((p) => !state.selPhotos.includes(p.id)); state.selPhotos = []; state.confirm = null; savePhotos(); render(); break;
        }
      }
    };
    v.onchange = async (e) => {
      const t = e.target;
      if (t.id === 'model-file' && t.files && t.files[0]) { importModel(t.files[0]); }
      else if (t.id === 'ph-file' && t.files && t.files[0]) {
        try {
          const src = await resizeImage(t.files[0]);
          const p = { id: String(Date.now()), date: $('#ph-date').value || ymd(), label: $('#ph-label').value, src };
          PHOTOS.push(p);
          if (!savePhotos()) { PHOTOS.pop(); toast('Plus de place pour les photos sur cet appareil. Supprimes-en une.'); return; }
          render(); toast('Photo ajoutée.');
        } catch (err) { toast('Cette image ne peut pas être lue. Essaie un fichier JPG ou PNG.'); }
      } else if (t.id === 's-voice') { S.settings.voice = t.checked; if (!t.checked) Voice.stop(); save(); renderControls(); }
      else if (t.id === 's-count') { S.settings.count = t.checked; save(); }
      else if (t.id === 's-cues') { S.settings.cues = t.checked; save(); }
      else if (t.id === 's-warm') { S.settings.warm = t.checked; save(); }
      else if (t.id === 's-listen') { S.settings.listen = t.checked; save(); Listen.sync(); }
      else if (t.id === 's-vsel') { S.settings.voiceURI = t.value; save(); Voice.pick(); }
    };
    v.oninput = (e) => {
      if (e.target.id === 'ex-q') {
        state.exQuery = e.target.value; const pos = e.target.selectionStart; render();
        const q = $('#ex-q'); q.focus(); q.setSelectionRange(pos, pos);
      } else if (e.target.id === 'cmp-r') $('#cmp').style.setProperty('--cut', e.target.value + '%');
    };
    $$('[data-chart]', v).forEach((ch) => {
      const tip = $('.tip', ch);
      ch.addEventListener('pointermove', (e) => {
        const r = e.target.closest('[data-tip]');
        if (!r) { tip.hidden = true; return; }
        tip.textContent = r.dataset.tip; tip.hidden = false;
        tip.style.left = (+r.dataset.x * 100) + '%'; tip.style.top = (+r.dataset.y * 100) + '%';
      });
      ch.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
  }

  function updateCoachUi() {
    const c = coach();
    $('#coach-initial').textContent = c.initial; $('#coach-badge').textContent = c.initial; $('#coach-name').textContent = 'Coach ' + c.name;
  }
  function setPlace(p) {
    S.place = p; save();
    $('#place-maison').setAttribute('aria-pressed', String(p === 'maison'));
    $('#place-salle').setAttribute('aria-pressed', String(p === 'salle'));
    state.exDetail = null; render();
  }

  /* ---------- Démarrage ---------- */
  function boot() {
    $$('.tabs button').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });
    $('#place-maison').onclick = () => setPlace('maison');
    $('#place-salle').onclick = () => setPlace('salle');
    $('#coach-btn').onclick = () => setTab('reglages');
    $$('.views button').forEach((b) => { b.onclick = () => { E.setView(b.dataset.view); setViewButtons(b.dataset.view); }; });
    setPlace(S.place);
    updateCoachUi();
    if (!window.THREE || !E) { $('#loading').textContent = 'Le moteur 3D n\'a pas pu se charger. Vérifie ta connexion puis recharge la page.'; return; }
    try {
      E.init($('#gl'));
      E.setAvatar(avatarCfg());
      $('#loading').hidden = true;
    } catch (err) {
      console.error(err);
      $('#loading').textContent = 'La 3D n\'est pas disponible sur cet appareil (WebGL désactivé). Les séances guidées par la voix fonctionnent quand même.';
    }
    preview(state.previewEx, false);
    setCoachText(`Salut, c'est ${coach().name} ! Choisis une séance, ou touche un exercice pour le voir en 3D.`);
    Voice.init();
    if (window.indexedDB) restoreModel();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const re = () => setTimeout(() => E.applyTheme && E.applyTheme(), 30);
    mq.addEventListener && mq.addEventListener('change', re);
    new MutationObserver(re).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude\.ai|claudeusercontent/.test(location.host)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  window.CorpusApp = { startSession, preview, state, S };
  boot();
})();
