import { getBookings } from './store.js';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function todayISO() { return iso(new Date()); }

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Next n working days of the service, starting today (local date).
export function nextDays(service, n = 7) {
  const out = [];
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; out.length < n && i < 60; i++) {
    const wd = d.getDay() || 7;
    const todayOver = i === 0 && nowMin >= toMin(service.hours.end) - 30;
    if (service.hours.days.includes(wd) && !todayOver) out.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function daySlots(service, advisorId, date) {
  const now = new Date();
  const isToday = date === iso(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const mine = getBookings();
  const out = [];
  for (let m = toMin(service.hours.start); m < toMin(service.hours.end); m += 30) {
    if (isToday && m <= nowMin) continue;
    const time = fromMin(m);
    const booked = mine.some((b) => b.serviceId === service.id && b.advisorId === advisorId && b.date === date && b.time === time);
    const free = fnv1a(`${service.id}|${advisorId}|${date}|${time}`) % 100 < 60;
    out.push({ time, state: booked ? 'booked' : free ? 'free' : 'taken' });
  }
  return out;
}

export function hasConflict(date, time) {
  return getBookings().some((b) => b.date === date && b.time === time);
}

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newRef() {
  const used = new Set(getBookings().map((b) => b.id));
  for (;;) {
    let s = 'CSH-';
    for (let i = 0; i < 4; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    if (!used.has(s)) return s;
  }
}
