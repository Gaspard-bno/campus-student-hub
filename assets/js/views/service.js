import { h, backBar } from '../ui.js';
import { t, loc, langLabel, getLang } from '../i18n.js';
import { getService } from '../data.js';
import { navigate } from '../router.js';
import { icon } from '../../icons/icons.js';

let currentName = '';

export function title() {
  return currentName;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Mon=1 ... Sun=0/7. 2024-01-01 is a Monday.
function dayName(d, style) {
  const date = new Date(Date.UTC(2024, 0, 1 + ((d % 7) + 6) % 7));
  return new Intl.DateTimeFormat(getLang(), { weekday: style, timeZone: 'UTC' }).format(date);
}

export function formatDays(days) {
  const sorted = [...new Set(days.map((d) => (d === 0 ? 7 : d)))].sort((a, b) => a - b);
  const runs = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === d - 1) last[1] = d;
    else runs.push([d, d]);
  }
  return runs
    .map(([a, b]) => (a === b ? dayName(a, 'long') : b === a + 1 ? `${dayName(a, 'short')}, ${dayName(b, 'short')}` : `${dayName(a, 'short')}\u2013${dayName(b, 'short')}`))
    .join(', ');
}

function fact(iconName, label, value) {
  return h('div', { class: 'svc-fact' },
    h('span', { class: 'svc-fact__icon', html: icon(iconName, 20) }),
    h('div', { class: 'svc-fact__body' },
      h('span', { class: 'label-mono' }, label),
      h('span', { class: 'svc-fact__value' }, value)));
}

export function render(params) {
  const service = getService(params.id);
  if (!service) {
    navigate('/home');
    return h('section', { class: 'view view--service' });
  }
  currentName = loc(service.name);

  const langs = [];
  for (const a of service.advisors) for (const l of a.languages) if (!langs.includes(l)) langs.push(l);

  const chips = h('div', { class: 'svc-chips' });
  for (const l of langs) chips.appendChild(h('span', { class: 'chip chip--mono' }, langLabel(l)));

  const advisors = h('ul', { class: 'svc-advisors' });
  for (const a of service.advisors) {
    advisors.appendChild(h('li', { class: 'svc-advisor' },
      h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(a.name)),
      h('div', { class: 'svc-advisor__body' },
        h('span', { class: 'svc-advisor__name' }, a.name),
        h('span', { class: 'svc-advisor__role' }, loc(a.role)),
        h('span', { class: 'svc-advisor__langs' }, a.languages.map(langLabel).join(', ')))));
  }

  const hours = `${formatDays(service.hours.days)}, ${service.hours.start}\u2013${service.hours.end}`;

  return h('section', { class: 'view view--service' },
    backBar(t('nav.back')),
    h('article', { class: 'card card--cream svc-card' },
      h('h1', { class: 'view__title', tabindex: '-1' }, currentName),
      h('p', { class: 'svc-summary' }, loc(service.summary)),
      h('div', { class: 'svc-facts' },
        h('div', { class: 'svc-fact' },
          h('span', { class: 'svc-fact__icon', html: icon('languages', 20) }),
          h('div', { class: 'svc-fact__body' },
            h('span', { class: 'label-mono' }, t('service.languages')),
            chips)),
        fact('map-pin', t('service.location'), `Demo Campus, ${loc(service.location)}`),
        fact('clock', t('service.hours'), hours),
        h('div', { class: 'svc-fact' },
          h('span', { class: 'svc-fact__icon', html: icon('timer', 20) }),
          h('div', { class: 'svc-fact__body' },
            h('span', { class: 'svc-fact__value' }, t('service.duration', { min: service.durationMin })))))),
    h('section', { class: 'svc-section' },
      h('h2', { class: 'label-mono svc-section__title' }, t('service.advisors')),
      advisors),
    h('div', { class: 'svc-actions' },
      h('button', { class: 'btn btn--primary btn--block', type: 'button', dataset: { testid: 'book-session' }, on: { click: () => navigate(`/book/${service.id}`) } }, t('service.book')),
      h('button', { class: 'btn btn--secondary btn--block', type: 'button', dataset: { testid: 'ask-question' }, on: { click: () => navigate(`/help?service=${service.id}`) } }, t('service.ask'))),
    h('p', { class: 'notice-mono', dataset: { testid: 'service-notice' } }, t('demo.serviceNotice')));
}
