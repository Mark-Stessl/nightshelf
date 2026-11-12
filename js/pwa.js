/* Nightshelf – als App installieren (Handy und Desktop), Offline-Modus und Push-Benachrichtigungen */
const Pwa = (() => {
  let deferred = null;          // Installations-Angebot von Chrome/Edge/Android
  let reg = null;               // Service-Worker-Registrierung
  let ctx = { toast: () => {}, render: () => {} };
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(); } catch {} });

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; ctx.toast('<div><b>Nightshelf ist installiert</b><small>Du findest die App jetzt bei deinen Programmen</small></div>'); emit(); });

  /* Neue Version? Beim Zurückkehren in die App prüfen und ggf. neu laden (iOS hält Apps lange im Speicher) */
  const myVersion = (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src').match(/v=(\d+)/) || [])[1];
  let lastUpdateCheck = 0;
  async function checkUpdate() {
    if (!myVersion || Date.now() - lastUpdateCheck < 5 * 60 * 1000) return;
    lastUpdateCheck = Date.now();
    try {
      const html = await fetch(`./?check=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
      const v = (html.match(/js\/app\.js\?v=(\d+)/) || [])[1];
      if (v && v !== myVersion && !document.documentElement.classList.contains('modal-open')) location.reload();
    } catch {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

  async function init(c) {
    ctx = { ...ctx, ...c };
    if (!('serviceWorker' in navigator)) return;
    try {
      reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
      navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'open' && e.data.url) location.href = e.data.url; });
      emit();
    } catch {}
  }

  /* ---------- Installieren ---------- */
  function installState() {
    if (standalone()) return 'installed';
    if (deferred) return 'prompt';
    if (isIOS) return 'ios';
    if (isSafari) return 'mac-safari';
    if (isFirefox) return isMobile ? 'android-firefox' : 'firefox';
    return 'manual';
  }
  async function install() {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    deferred = null; emit();
    return outcome === 'accepted';
  }

  /* ---------- App-Symbol mit Zahl ---------- */
  function badge(n) {
    if (!('setAppBadge' in navigator)) return;
    (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }

  /* ---------- Push ---------- */
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64ToBytes = s => { const p = (s + '==='.slice((s.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(p), ch => ch.charCodeAt(0)); };
  async function subscription() {
    if (!pushSupported()) return null;
    const r = reg || await navigator.serviceWorker.getRegistration();
    return r ? r.pushManager.getSubscription() : null;
  }
  async function api(path, body) {
    const res = await fetch(`${PSN.worker()}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...Sync.header() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'error'); e.code = data.error || 'error'; throw e; }
    return data;
  }
  function deviceName() {
    const os = isIOS ? 'iPhone/iPad' : isAndroid ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Gerät';
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Browser';
    return `${os} · ${br}${standalone() ? ' (App)' : ''}`;
  }
  async function enablePush() {
    if (!pushSupported()) { const e = new Error('unsupported'); e.code = isIOS && !standalone() ? 'ios_install' : 'unsupported'; throw e; }
    if (!Sync.enabled()) { const e = new Error('sync'); e.code = 'sync_required'; throw e; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { const e = new Error('denied'); e.code = 'denied'; throw e; }
    const r = reg || await navigator.serviceWorker.ready;
    const { publicKey } = await api('/push/key');
    let sub = await r.pushManager.getSubscription();
    if (sub) {
      const cur = sub.options?.applicationServerKey;
      const same = cur && btoa(String.fromCharCode(...new Uint8Array(cur))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === publicKey;
      if (!same) { await sub.unsubscribe().catch(() => {}); sub = null; }
    }
    if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    await api('/push/subscribe', { subscription: sub.toJSON(), device: deviceName() });
    emit();
    return true;
  }
  async function disablePush() {
    const sub = await subscription();
    if (sub) { await api('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
    emit();
  }
  const testPush = async () => { const sub = await subscription(); return api('/push/test', { endpoint: sub?.endpoint }); };
  const devices = () => api('/push/devices');

  return {
    init, install, installState, standalone, isIOS, isAndroid, isMobile, badge,
    pushSupported, subscription, enablePush, disablePush, testPush, devices,
    onChange: fn => { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
