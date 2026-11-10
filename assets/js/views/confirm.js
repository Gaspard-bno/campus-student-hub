import { h } from '../ui.js';
import { announce } from '../ui.js';
import { t, loc, fmtDate } from '../i18n.js';
import { getService } from '../data.js';
import { getBookings } from '../store.js';
import { navigate } from '../router.js';
import { icon } from '../../icons/icons.js';
import { downloadIcs } from '../ics.js';

export function title() {
  return t('confirm.title');
}

function row(label, value) {
  return h('div', { class: 'cf-row' },
    h('dt', { class: 'label-mono' }, label),
    h('dd', { class: 'cf-row__value' }, value));
}

export function render(params) {
  const booking = getBookings().find((b) => b.id === params.bookingId);
  const service = booking ? getService(booking.serviceId) : null;
  if (!booking || !service) {
    navigate('/bookings');
    return h('section', { class: 'view view--confirm' });
  }
  const advisor = service.advisors.find((a) => a.id === booking.advisorId);
  const video = booking.format === 'video';
  const where = video ? t('book.video') : `Demo Campus, ${loc(service.location)}`;

  const copyLabel = h('span', {}, t('confirm.copy'));
  const copyBtn = h('button', {
    class: 'btn btn--secondary cf-copy', type: 'button', dataset: { testid: 'copy-ref' },
    on: {
      click: async () => {
        try {
          await navigator.clipboard.writeText(booking.id);
        } catch (e) { /* clipboard unavailable: still give feedback */ }
        copyLabel.textContent = t('confirm.copied');
        announce(t('confirm.copied'));
        setTimeout(() => {
          copyLabel.textContent = t('confirm.copy');
        }, 2000);
      },
    },
  }, h('span', { html: icon('copy', 20), class: 'cf-copy__icon' }), copyLabel);

  const list = h('dl', { class: 'cf-list' },
    row(t('confirm.service'), loc(service.name)),
    row(t('confirm.advisor'), advisor ? advisor.name : ''),
    row(t('confirm.date'), fmtDate(booking.date)),
    row(t('confirm.time'), booking.time),
    row(t('confirm.format'), t(video ? 'book.video' : 'book.onsite')),
    row(t('confirm.where'), where));

  const card = h('article', { class: 'card card--cream cf-card' }, list);
  if (video) card.appendChild(h('p', { class: 'cf-video-note' }, t('confirm.videoNote')));

  return h('section', { class: 'view view--confirm' },
    h('header', { class: 'cf-head' },
      h('span', { class: 'cf-ok', html: icon('check-circle', 48) }),
      h('h1', { class: 'view__title', tabindex: '-1', dataset: { testid: 'confirm-title' } }, t('confirm.title')),
      h('p', { class: 'cf-sub' }, t('confirm.sub'))),
    h('section', { class: 'cf-ref' },
      h('span', { class: 'label-mono' }, t('confirm.ref')),
      h('p', { class: 'cf-ref__code', dataset: { testid: 'ref-code' } }, booking.id),
      copyBtn),
    card,
    h('div', { class: 'cf-actions' },
      h('button', { class: 'btn btn--primary btn--block', type: 'button', dataset: { testid: 'add-calendar' }, on: { click: () => downloadIcs(booking) } },
        h('span', { html: icon('calendar-plus', 20), class: 'cf-copy__icon' }), h('span', {}, t('confirm.calendar'))),
      h('button', { class: 'btn btn--secondary btn--block', type: 'button', dataset: { testid: 'view-bookings' }, on: { click: () => navigate('/bookings') } }, t('confirm.viewBookings')),
      h('button', { class: 'btn btn--ghost btn--block', type: 'button', dataset: { testid: 'back-home' }, on: { click: () => navigate('/home') } }, t('confirm.home'))),
    h('p', { class: 'notice-mono', dataset: { testid: 'confirm-demo-note' } }, t('confirm.demoNote')));
}
