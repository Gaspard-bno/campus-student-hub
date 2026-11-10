// Safe storage: localStorage with in-memory fallback. Keys are stored as csh.<key>.
const P = 'csh.';
const mem = new Map();

export function get(key, fallback = null) {
  let raw;
  try { raw = localStorage.getItem(P + key); } catch { raw = mem.has(key) ? mem.get(key) : null; }
  if (raw === null || raw === undefined) raw = mem.has(key) ? mem.get(key) : null;
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return raw; }
}

export function set(key, value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  mem.set(key, raw);
  try { localStorage.setItem(P + key, raw); } catch { /* memory only */ }
}

export function remove(key) {
  mem.delete(key);
  try { localStorage.removeItem(P + key); } catch { /* memory only */ }
}

export function resetAll() {
  mem.clear();
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k));
  } catch { /* memory only */ }
}

export function getBookings() {
  const list = get('bookings', []);
  return Array.isArray(list) ? list : [];
}
export function addBooking(b) { set('bookings', [...getBookings(), b]); }
export function removeBooking(id) { set('bookings', getBookings().filter((b) => b.id !== id)); }

export function getVersion() { return Number(get('version', 2)) === 1 ? 1 : 2; }
export function setVersion(n) {
  const v = Number(n) === 1 ? 1 : 2;
  set('version', String(v));
  document.documentElement.dataset.version = String(v);
  window.dispatchEvent(new CustomEvent('csh:versionchange', { detail: { version: v } }));
}
