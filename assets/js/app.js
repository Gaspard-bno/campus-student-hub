import * as store from './store.js';
import * as i18n from './i18n.js';
import * as data from './data.js';
import * as router from './router.js';
import { icon } from '../icons/icons.js';
import * as welcome from './views/welcome.js';
import * as home from './views/home.js';
import * as service from './views/service.js';
import * as book from './views/book.js';
import * as confirm from './views/confirm.js';
import * as bookings from './views/bookings.js';
import * as help from './views/help.js';
import { mount as mountObserver } from './observer.js';

const { t } = i18n;
const $ = (id) => document.getElementById(id);
const q = (sel) => document.querySelector(sel);

async function loadData() {
  if (window.__CSH_DATA__) return window.__CSH_DATA__;
  const [services, dict] = await Promise.all([
    fetch('assets/data/services.json').then((r) => r.json()),
    fetch('assets/data/i18n.json').then((r) => r.json()),
  ]);
  return { services, i18n: dict };
}

// Global URL parameters, accepted in location.search and after the hash: v, lang, reset.
function applyParams(params) {
  if (params.reset === '1') store.resetAll();
  if (i18n.LANGS.includes(params.lang)) i18n.setLang(params.lang);
  if (params.v === '1' || params.v === '2') store.setVersion(params.v);
}

function setText(el, text) { if (el) el.textContent = text; }

function paintShell() {
  setText($('banner'), t('demo.banner'));
  const logo = $('logo');
  if (logo) { logo.textContent = t('app.name'); logo.setAttribute('aria-label', `${t('app.name')}, ${t('nav.home')}`); }
  setText($('lang-code'), i18n.getLang().toUpperCase());
  const lb = $('lang-button');
  if (lb) {
    lb.setAttribute('aria-label', t('nav.language'));
    if (!lb.querySelector('svg')) lb.insertAdjacentHTML('afterbegin', icon('globe', 20));
  }
  document.querySelectorAll('#lang-menu [data-lang]').forEach((b) => {
    b.textContent = i18n.langLabel(b.dataset.lang);
    b.setAttribute('lang', b.dataset.lang === 'pt' ? 'pt-BR' : b.dataset.lang);
    b.setAttribute('aria-pressed', String(b.dataset.lang === i18n.getLang()));
  });
  const urgent = $('urgent-button');
  if (urgent) { urgent.setAttribute('aria-label', t('nav.urgent')); urgent.innerHTML = icon('life-buoy', 22); }
  const tabs = { home: ['home', 'nav.home'], bookings: ['calendar', 'nav.bookings'], help: ['message-circle', 'nav.help'] };
  document.querySelectorAll('#tabbar [data-tab]').forEach((a) => {
    const [ic, key] = tabs[a.dataset.tab] || [];
    const i = a.querySelector('.tab__icon');
    const l = a.querySelector('.tab__label');
    if (i) i.innerHTML = icon(ic, 22);
    if (l) l.textContent = t(key);
  });
  $('tabbar')?.setAttribute('aria-label', t('app.name'));
  setText($('panel-brand'), 'Crousty Studio');
  setText($('panel-name'), t('app.name'));
  setText($('panel-title'), t('panel.title'));
  setText($('panel-desc'), t('panel.desc'));
  setText($('panel-version-label'), t('panel.version'));
  setText(q('[data-testid="version-1"]'), t('panel.v1'));
  setText(q('[data-testid="version-2"]'), t('panel.v2'));
  setText(q('[data-testid="reset-demo"]'), t('panel.reset'));
  setText($('panel-scan-label'), t('panel.scan'));
  const qr = q('[data-testid="qr"]');
  if (qr) qr.alt = t('panel.scan');
  paintVersion();
}

function paintVersion() {
  const v = store.getVersion();
  document.documentElement.dataset.version = String(v);
  q('[data-testid="version-1"]')?.setAttribute('aria-pressed', String(v === 1));
  q('[data-testid="version-2"]')?.setAttribute('aria-pressed', String(v === 2));
}

function paintTabs(name) {
  const active = name === 'bookings' ? 'bookings' : name === 'help' ? 'help' : 'home';
  document.querySelectorAll('#tabbar [data-tab]').forEach((a) => {
    if (a.dataset.tab === active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function bindShell() {
  const menu = $('lang-menu');
  const lb = $('lang-button');
  const closeMenu = () => { if (menu) menu.hidden = true; lb?.setAttribute('aria-expanded', 'false'); };
  lb?.addEventListener('click', () => {
    if (!menu) return;
    menu.hidden = !menu.hidden;
    lb.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('[aria-pressed="true"]')?.focus();
  });
  menu?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    i18n.setLang(b.dataset.lang);
    closeMenu();
    lb?.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); lb?.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (menu && !menu.hidden && !e.target.closest('#lang-menu, #lang-button')) closeMenu();
  });

  // Logo: tap goes home, 1 s long press toggles V1 / V2 (observer shortcut on mobile).
  const logo = $('logo');
  let timer = null;
  let longPressed = false;
  const cancel = () => { clearTimeout(timer); timer = null; };
  logo?.addEventListener('pointerdown', () => {
    longPressed = false;
    timer = setTimeout(() => { longPressed = true; store.setVersion(store.getVersion() === 1 ? 2 : 1); }, 1000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => logo?.addEventListener(ev, cancel));
  logo?.addEventListener('click', () => { if (!longPressed) router.navigate('/home'); });
  logo?.addEventListener('contextmenu', (e) => e.preventDefault());

  q('[data-testid="version-1"]')?.addEventListener('click', () => store.setVersion(1));
  q('[data-testid="version-2"]')?.addEventListener('click', () => store.setVersion(2));
  q('[data-testid="reset-demo"]')?.addEventListener('click', () => {
    store.resetAll();
    i18n.init(dictRef);
    document.documentElement.dataset.version = '2';
    setText($('panel-reset-status'), t('panel.resetDone'));
    setTimeout(() => setText($('panel-reset-status'), ''), 2500);
    paintShell();
    if (location.hash === '#/welcome') router.rerender(); else router.navigate('/welcome');
  });
  const qr = q('[data-testid="qr"]');
  if (qr) {
    const hide = () => { const box = qr.closest('[data-qr-box]') || qr.parentElement; if (box) box.hidden = true; };
    qr.addEventListener('error', hide);
    if (qr.complete && qr.naturalWidth === 0) hide();
  }

  window.addEventListener('csh:langchange', paintShell);
  window.addEventListener('csh:versionchange', paintVersion);
  window.addEventListener('csh:route', (e) => paintTabs(e.detail.name));
}

let dictRef = {};

async function boot() {
  const loaded = await loadData();
  dictRef = loaded.i18n;
  i18n.init(dictRef);
  data.init(loaded.services);

  const sp = Object.fromEntries(new URLSearchParams(location.search));
  applyParams(sp);
  if (sp.reset === '1') {
    const u = new URL(location.href);
    u.searchParams.delete('reset');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    i18n.init(dictRef);
  }

  router.register('welcome', '/welcome', welcome);
  router.register('home', '/home', home);
  router.register('search', '/search', home);
  router.register('service', '/service/:id', service);
  router.register('book', '/book/:serviceId', book);
  router.register('confirm', '/confirm/:bookingId', confirm);
  router.register('bookings', '/bookings', bookings);
  router.register('help', '/help', help);
  router.setGuard((p) => {
    const g = { ...(p.query || {}) };
    let redirect = null;
    if (g.reset === '1' || g.lang || g.v) {
      // Strip one-shot parameters from the URL first: applying them fires events that re-render.
      const one = { reset: g.reset, lang: g.lang, v: g.v };
      delete g.reset; delete g.lang; delete g.v;
      const rest = new URLSearchParams(g).toString();
      redirect = p.path + (rest ? '?' + rest : '');
      history.replaceState(null, '', '#' + redirect);
      applyParams(one);
      if (one.reset === '1') i18n.init(dictRef);
      paintShell();
    }
    if (!i18n.hasLang() && p.name !== 'welcome') return '/welcome';
    return redirect;
  });

  paintShell();
  bindShell();
  const obs = $('panel-observer');
  if (obs) mountObserver(obs);
  router.start();
}

boot();
