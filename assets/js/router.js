import { t } from './i18n.js';

const routes = [];
const stack = [];
let cur = { path: '/home', name: 'home', params: {}, query: {} };
let guard = null;
let lastDir = 'fwd';

export function register(name, pattern, view) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ name, rx, keys, view });
}
export function setGuard(fn) { guard = fn; }
export function current() { return cur; }

function parse(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/home';
  const [path, qs = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { path, name: r.name, params, query, view: r.view };
    }
  }
  return null;
}

export function navigate(path) {
  const target = '#' + path;
  if (location.hash === target) render(false);
  else location.hash = target;
}

export function back() {
  if (stack.length > 1) history.back();
  else navigate('/home');
}

export function setSilent(path, opts = {}) {
  const target = '#' + path;
  if (location.hash === target) return;
  if (opts.push) { history.pushState(null, '', target); stack.push(target); }
  else { history.replaceState(null, '', target); stack[stack.length - 1] = target; }
  const p = parse(target);
  if (p) cur = { path: p.path, name: p.name, params: p.params, query: p.query };
}

export function rerender() { render(false); }

function track(hash) {
  if (stack.length > 1 && stack[stack.length - 2] === hash) { stack.pop(); lastDir = 'back'; }
  else if (stack[stack.length - 1] !== hash) { stack.push(hash); lastDir = 'fwd'; }
}

function render(animate = true) {
  let p = parse(location.hash);
  if (!p) { history.replaceState(null, '', '#/home'); p = parse('#/home'); }
  if (guard) {
    const redirect = guard(p);
    if (redirect) { history.replaceState(null, '', '#' + redirect); p = parse('#' + redirect); }
  }
  track(location.hash || '#/home');
  cur = { path: p.path, name: p.name, params: p.params, query: p.query };
  const host = document.getElementById('view');
  const el = p.view.render(p.params, p.query);
  if (animate) {
    const cls = lastDir === 'back' ? 'view-enter-back' : 'view-enter-fwd';
    el.classList.add(cls);
    // Drop the class once played so no transform lingers (it widened the scroll area by the 12 px offset).
    el.addEventListener('animationend', (e) => { if (e.target === el) el.classList.remove(cls); }, { once: false });
  }
  host.replaceChildren(el);
  host.scrollTop = 0;
  document.body.classList.toggle('is-welcome', p.name === 'welcome');
  document.body.dataset.route = p.name;
  const title = p.view.title ? p.view.title() : '';
  document.title = title ? `${title} · ${t('app.name')}` : t('app.name');
  if (animate) {
    const h1 = el.querySelector('h1');
    if (h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  window.dispatchEvent(new CustomEvent('csh:route', { detail: { path: p.path, name: p.name } }));
}

export function start() {
  window.addEventListener('hashchange', () => render(true));
  window.addEventListener('csh:langchange', () => render(false));
  window.addEventListener('csh:versionchange', () => render(false));
  render(true);
}
