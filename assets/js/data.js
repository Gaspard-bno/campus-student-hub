import { allLangs } from './i18n.js';

let db = { categories: [], services: [] };

export function init(json) { db = json || db; }
export function categories() { return db.categories; }
export function services() { return db.services; }
export function getService(id) { return db.services.find((s) => s.id === id) || null; }
export function serviceForCategory(catId) { return db.services.find((s) => s.category === catId) || null; }

export function normalize(str) {
  return String(str ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function search(q) {
  const n = normalize(q);
  if (n.length < 2) return [];
  return db.services.filter((s) => {
    const hay = [
      ...Object.values(s.name || {}),
      ...(s.keywords || []),
      ...allLangs(`cat.${s.category}`),
    ];
    return hay.some((x) => normalize(x).includes(n));
  });
}

// Wraps the first accent-insensitive match of q in <strong>.
export function highlight(text, q) {
  const frag = document.createDocumentFragment();
  const src = String(text ?? '');
  const n = normalize(q);
  let norm = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i].normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    for (const ch of c) { norm += ch; map.push(i); }
  }
  const at = n ? norm.indexOf(n) : -1;
  if (at < 0) { frag.append(src); return frag; }
  const start = map[at];
  const end = map[at + n.length - 1] + 1;
  const strong = document.createElement('strong');
  strong.textContent = src.slice(start, end);
  frag.append(src.slice(0, start), strong, src.slice(end));
  return frag;
}
