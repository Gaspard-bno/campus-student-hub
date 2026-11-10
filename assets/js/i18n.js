import * as store from './store.js';

export const LANGS = ['en', 'pt', 'fr'];
const HTML_LANG = { en: 'en', pt: 'pt-BR', fr: 'fr' };
const NAMES = { en: 'English', pt: 'Português', fr: 'Français', es: 'Español' };
let dict = {};
let lang = 'en';

export function init(d) {
  dict = d || {};
  const stored = store.get('lang');
  lang = LANGS.includes(stored) ? stored : 'en';
  document.documentElement.lang = HTML_LANG[lang];
}

export function hasLang() { return LANGS.includes(store.get('lang')); }
export function getLang() { return lang; }

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  const changed = l !== lang;
  lang = l;
  store.set('lang', l);
  document.documentElement.lang = HTML_LANG[l];
  if (changed) window.dispatchEvent(new CustomEvent('csh:langchange', { detail: { lang: l } }));
}

export function t(key, vars) {
  let s = (dict[lang] && dict[lang][key]) ?? (dict.en && dict.en[key]) ?? '';
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

// Same key in every language (used by search over category labels).
export function allLangs(key) { return LANGS.map((l) => (dict[l] && dict[l][key]) || '').filter(Boolean); }

export function loc(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj.en ?? '';
}

function toDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(iso, opts) {
  const o = opts || { weekday: 'long', day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat(HTML_LANG[lang], o).format(toDate(iso));
}

export function fmtDayShort(iso) {
  const d = toDate(iso);
  return {
    weekday: new Intl.DateTimeFormat(HTML_LANG[lang], { weekday: 'short' }).format(d).replace('.', ''),
    day: String(d.getDate()),
  };
}

export function langLabel(code) { return NAMES[code] || String(code).toUpperCase(); }
