import { h, backBar } from '../ui.js';
import { t, loc, fmtDayShort } from '../i18n.js';
import { getService } from '../data.js';
import { nextDays, daySlots, hasConflict, newRef, todayISO } from '../availability.js';
import { addBooking } from '../store.js';
import { navigate } from '../router.js';

let currentName = '';

export function title() {
  return currentName ? `${t('book.title')}: ${currentName}` : t('book.title');
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pressed(el, on) {
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
}

export function render(params) {
  const service = getService(params.serviceId);
  if (!service) {
    navigate('/home');
    return h('section', { class: 'view view--book' });
  }
  currentName = loc(service.name);

  const days = nextDays(service, 7);
  const state = {
    advisorId: service.advisors[0].id,
    date: days[0],
    time: null,
    format: service.formats.includes('onsite') ? 'onsite' : service.formats[0],
  };

  const grid = h('div', { class: 'book-slots', tabindex: '-1', role: 'group', 'aria-label': t('book.time') });
  const errorHost = h('div', { class: 'book-error-host' });

  function showError(msg) {
    errorHost.replaceChildren(h('p', { class: 'inline-error', role: 'alert', dataset: { testid: 'book-error' } }, msg));
  }
  function clearError() {
    errorHost.replaceChildren();
  }

  function renderSlots() {
    const slots = daySlots(service, state.advisorId, state.date);
    grid.replaceChildren();
    if (!slots.length) {
      grid.appendChild(h('p', { class: 'muted book-empty' }, t('book.noTimes')));
      return;
    }
    const groups = [
      ['book.morning', slots.filter((s) => s.time < '12:00')],
      ['book.afternoon', slots.filter((s) => s.time >= '12:00')],
    ];
    for (const [key, list] of groups) {
      if (!list.length) continue;
      const wrap = h('div', { class: 'book-slotgroup' }, h('h3', { class: 'label-mono' }, t(key)));
      const row = h('div', { class: 'book-slotgrid' });
      for (const s of list) {
        const unavailable = s.state !== 'free';
        const btn = h('button', {
          class: 'book-slot',
          type: 'button',
          disabled: unavailable ? 'disabled' : null,
          'aria-pressed': unavailable ? null : (state.time === s.time ? 'true' : 'false'),
          dataset: { testid: `slot-${s.time}`, state: s.state },
          on: {
            click: () => {
              state.time = s.time;
              clearError();
              for (const b of grid.querySelectorAll('.book-slot[aria-pressed]')) pressed(b, b.dataset.testid === `slot-${s.time}`);
            },
          },
        }, s.state === 'booked'
          ? h('span', { class: 'book-slot__inner' }, s.time, h('span', { class: 'book-slot__tag' }, t('book.booked')))
          : s.time);
        row.appendChild(btn);
      }
      wrap.appendChild(row);
      grid.appendChild(wrap);
    }
  }

  // Advisor control
  let advisorBlock = null;
  if (service.advisors.length >= 2) {
    const seg = h('div', { class: 'seg book-advisors', role: 'group', 'aria-label': t('book.advisor') });
    for (const a of service.advisors) {
      seg.appendChild(h('button', {
        class: 'seg__opt', type: 'button', 'aria-pressed': a.id === state.advisorId ? 'true' : 'false',
        dataset: { testid: `advisor-${a.id}` },
        on: {
          click: () => {
            state.advisorId = a.id;
            state.time = null;
            clearError();
            for (const b of seg.children) pressed(b, b.dataset.testid === `advisor-${a.id}`);
            renderSlots();
          },
        },
      }, a.name));
    }
    advisorBlock = h('section', { class: 'book-block' }, h('h2', { class: 'label-mono' }, t('book.advisor')), seg);
  }

  // Day strip
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const strip = h('div', { class: 'book-days', role: 'group', 'aria-label': t('book.day') });
  for (const iso of days) {
    const { weekday, day } = fmtDayShort(iso);
    const rel = iso === today ? t('day.today') : iso === tomorrow ? t('day.tomorrow') : weekday;
    strip.appendChild(h('button', {
      class: 'book-day', type: 'button', 'aria-pressed': iso === state.date ? 'true' : 'false',
      dataset: { testid: `day-${iso}` },
      on: {
        click: () => {
          state.date = iso;
          state.time = null;
          clearError();
          for (const b of strip.children) pressed(b, b.dataset.testid === `day-${iso}`);
          renderSlots();
        },
      },
    }, h('span', { class: 'book-day__wd' }, rel), h('span', { class: 'book-day__num' }, String(day))));
  }

  // Format control
  const formatSeg = h('div', { class: 'seg book-formats', role: 'group', 'aria-label': t('book.format') });
  for (const f of service.formats) {
    formatSeg.appendChild(h('button', {
      class: 'seg__opt', type: 'button', 'aria-pressed': f === state.format ? 'true' : 'false',
      dataset: { testid: `format-${f}` },
      on: {
        click: () => {
          state.format = f;
          for (const b of formatSeg.children) pressed(b, b.dataset.testid === `format-${f}`);
        },
      },
    }, t(f === 'video' ? 'book.video' : 'book.onsite')));
  }

  function confirm() {
    if (!state.time) {
      showError(t('book.chooseTime'));
      grid.focus();
      return;
    }
    if (hasConflict(state.date, state.time)) {
      showError(t('book.conflict'));
      grid.focus();
      return;
    }
    const id = newRef();
    addBooking({
      id, serviceId: service.id, advisorId: state.advisorId, date: state.date,
      time: state.time, format: state.format, createdAt: new Date().toISOString(),
    });
    navigate(`/confirm/${id}`);
  }

  renderSlots();

  const root = h('section', { class: 'view view--book' },
    backBar(t('nav.back')),
    h('header', { class: 'book-head' },
      h('h1', { class: 'view__title', tabindex: '-1' }, t('book.title')),
      h('p', { class: 'book-service' }, currentName)));
  if (advisorBlock) root.appendChild(advisorBlock);
  root.append(
    h('section', { class: 'book-block' }, h('h2', { class: 'label-mono' }, t('book.day')), strip),
    h('section', { class: 'book-block' }, h('h2', { class: 'label-mono' }, t('book.time')), grid, errorHost),
    h('section', { class: 'book-block' }, h('h2', { class: 'label-mono' }, t('book.format')), formatSeg),
    h('div', { class: 'book-actions' },
      h('button', { class: 'btn btn--primary btn--block', type: 'button', dataset: { testid: 'confirm-booking' }, on: { click: confirm } }, t('book.confirm'))));
  return root;
}
