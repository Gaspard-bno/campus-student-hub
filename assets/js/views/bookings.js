import { h, announce } from '../ui.js';
import { t, loc, fmtDate } from '../i18n.js';
import { getBookings, removeBooking } from '../store.js';
import { getService } from '../data.js';
import { navigate } from '../router.js';

export function title() {
  return t('bookings.title');
}

function cmp(a, b) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

function isPast(b) {
  const d = new Date(b.date + 'T' + b.time + ':00');
  return d.getTime() < Date.now();
}

export function render() {
  const root = h('section', { class: 'view view--bookings' });
  const heading = h('h1', { class: 'view__title', tabindex: '-1' }, t('bookings.title'));
  const body = h('div', { class: 'bk-body' });
  root.append(heading, body);

  function row(b, past) {
    const svc = getService(b.serviceId);
    const name = svc ? loc(svc.name) : b.serviceId;
    const r = h('li', { class: 'bk-row' + (past ? ' bk-row--past' : ''), dataset: { testid: 'booking-' + b.id } });
    const info = h('div', { class: 'bk-info' },
      h('p', { class: 'bk-name' }, name),
      h('p', { class: 'bk-when' }, fmtDate(b.date) + ' · ' + b.time),
      h('p', { class: 'bk-ref label-mono' }, b.id)
    );
    r.append(info);
    if (!past) {
      const actions = h('div', { class: 'bk-actions' });
      const cancel = h('button', {
        type: 'button', class: 'btn btn--secondary bk-cancel', dataset: { testid: 'cancel-' + b.id },
        on: { click: () => ask() }
      }, t('bookings.cancel'));
      actions.append(cancel);
      r.append(actions);

      function ask() {
        actions.replaceChildren(
          h('p', { class: 'bk-ask', role: 'group' }, t('bookings.cancelAsk')),
          h('div', { class: 'bk-ask-btns' },
            h('button', {
              type: 'button', class: 'btn btn--danger', dataset: { testid: 'cancel-yes-' + b.id },
              on: { click: () => { removeBooking(b.id); paint(); announce(t('bookings.cancelled')); heading.focus(); } }
            }, t('bookings.cancelYes')),
            h('button', {
              type: 'button', class: 'btn btn--ghost', dataset: { testid: 'cancel-no-' + b.id },
              on: { click: () => { actions.replaceChildren(cancel); cancel.focus(); } }
            }, t('bookings.cancelNo'))
          )
        );
        actions.querySelector('button').focus();
      }
    }
    return r;
  }

  function section(label, items, past) {
    const hid = 'bk-h-' + (past ? 'past' : 'up');
    return h('section', { class: 'bk-section', 'aria-labelledby': hid },
      h('h2', { class: 'bk-h2 label-mono', id: hid }, label),
      h('ul', { class: 'bk-list' }, ...items.map((b) => row(b, past)))
    );
  }

  function paint() {
    const all = getBookings().slice().sort(cmp);
    body.replaceChildren();
    if (!all.length) {
      body.append(h('div', { class: 'bk-empty card', dataset: { testid: 'bookings-empty' } },
        h('p', { class: 'bk-empty__txt' }, t('bookings.empty')),
        h('button', {
          type: 'button', class: 'btn btn--primary', dataset: { testid: 'find-service' },
          on: { click: () => navigate('/home') }
        }, t('bookings.find'))
      ));
      return;
    }
    const up = all.filter((b) => !isPast(b));
    const past = all.filter(isPast).reverse();
    if (up.length) body.append(section(t('bookings.upcoming'), up, false));
    if (past.length) body.append(section(t('bookings.past'), past, true));
  }

  paint();
  return root;
}
