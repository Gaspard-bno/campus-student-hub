import { getService } from './data.js';
import { loc, t } from './i18n.js';

const pad = (n) => String(n).padStart(2, '0');

function escapeText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Fold lines longer than 75 octets (RFC 5545), continuation lines start with a space.
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) {
      parts.push(cur);
      cur = '';
      size = 0;
      limit = 74;
    }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

function stamp(d, withZ) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${withZ ? '' : ''}`;
}

export function buildIcs(booking) {
  const service = getService(booking.serviceId);
  const [y, mo, d] = booking.date.split('-').map(Number);
  const [hh, mm] = booking.time.split(':').map(Number);
  const start = new Date(y, mo - 1, d, hh, mm, 0);
  const end = new Date(start.getTime() + (service ? service.durationMin : 30) * 60000);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const name = service ? loc(service.name) : booking.serviceId;
  const where = booking.format === 'video'
    ? t('book.video')
    : `Demo Campus, ${service ? loc(service.location) : ''}`;
  const description = `${t('confirm.ref')}: ${booking.id}\n${t('confirm.demoNote')}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crousty Studio//Campus Student Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@campus-student-hub.demo`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(name)}`,
    `LOCATION:${escapeText(where)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(booking) {
  const blob = new Blob([buildIcs(booking)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus-student-hub-${booking.id}.ics`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
