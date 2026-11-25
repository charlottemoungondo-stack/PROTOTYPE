/* Corpus — compte et synchronisation en ligne (Supabase). Inactif tant que window.CORPUS_CLOUD n'est pas configuré. */
(function () {
  'use strict';
  const cfg = window.CORPUS_CLOUD;
  const Cloud = { enabled: false, user: null, status: '', client: null };
  window.CorpusCloud = Cloud;
  if (!cfg || !cfg.url || !cfg.key) return;
  Cloud.enabled = true;
  let sb = null;
  const ready = new Promise((res) => {
    if (window.supabase) return res();
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    sc.onload = res; sc.onerror = () => { Cloud.enabled = false; res(); };
    document.head.appendChild(sc);
  }).then(() => { if (window.supabase) { sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } }); Cloud.client = sb; } });
  let pushTimer = null, onChange = () => {};
  Cloud.onChange = (fn) => { onChange = fn; };
  Cloud.init = async (getState, setState) => {
    Cloud.getState = getState; Cloud.setState = setState;
    await ready; if (!sb) { onChange(); return; }
    const { data } = await sb.auth.getSession();
    Cloud.user = data.session ? data.session.user : null;
    sb.auth.onAuthStateChange((_e, session) => { Cloud.user = session ? session.user : null; onChange(); });
    if (Cloud.user) await Cloud.pull();
    onChange();
  };
  Cloud.sendCode = async (email) => {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw new Error('Envoi impossible : ' + error.message);
  };
  Cloud.verify = async (email, token) => {
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error('Code incorrect ou expiré.');
    Cloud.user = data.user; await Cloud.pull(); await Cloud.push(); onChange();
  };
  Cloud.signOut = async () => { await sb.auth.signOut(); Cloud.user = null; onChange(); };
  // Fusion simple : la version la plus récente l'emporte, l'historique est réuni sans doublon.
  Cloud.pull = async () => {
    if (!Cloud.user) return;
    const { data, error } = await sb.from('user_state').select('state, updated_at').eq('user_id', Cloud.user.id).maybeSingle();
    if (error || !data) return;
    const local = Cloud.getState(), remote = data.state || {};
    const key = (h) => h.date + '|' + h.title + '|' + h.reps;
    const hist = new Map();
    for (const h of (remote.history || []).concat(local.history || [])) hist.set(key(h), h);
    const newer = (remote.savedAt || '') > (local.savedAt || '') ? remote : local;
    Cloud.setState(Object.assign({}, newer, { history: [...hist.values()].sort((a, b) => a.date.localeCompare(b.date)) }));
    Cloud.status = 'Synchronisé';
  };
  Cloud.push = async () => {
    if (!Cloud.user) return;
    const state = Cloud.getState();
    const { error } = await sb.from('user_state').upsert({ user_id: Cloud.user.id, state, updated_at: new Date().toISOString() });
    Cloud.status = error ? 'Synchronisation en attente (hors ligne ?)' : 'Synchronisé';
  };
  Cloud.schedulePush = () => { if (!Cloud.user) return; clearTimeout(pushTimer); pushTimer = setTimeout(() => Cloud.push().then(onChange), 1500); };
  Cloud.uploadPhoto = async (id, dataUrl) => {
    if (!Cloud.user) return;
    const blob = await (await fetch(dataUrl)).blob();
    await sb.storage.from('photos').upload(`${Cloud.user.id}/${id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
  };
})();
