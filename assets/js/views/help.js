import { h } from '../ui.js';
import { t, loc } from '../i18n.js';
import { getService } from '../data.js';
import { icon } from '../../icons/icons.js';

export function title() {
  return t('help.title');
}

const QUICK = ['book', 'office', 'lang', 'card'];
const TYPING_MS = 700;

export function render(params, query) {
  const root = h('section', { class: 'view view--help' });
  const heading = h('h1', { class: 'view__title', tabindex: '-1' }, t('help.title'));

  const phone = (testid, num, label) =>
    h('a', { class: 'btn btn--danger hp-call', href: 'tel:' + num, dataset: { testid } },
      h('span', { html: icon('phone', 20) }), h('span', {}, label));

  const urgent = h('section', { class: 'hp-urgent', 'aria-labelledby': 'hp-urgent-h' },
    h('h2', { class: 'hp-h2', id: 'hp-urgent-h' }, t('help.urgentTitle')),
    h('p', {}, t('help.samu')),
    phone('tel-192', '192', t('help.callSamu')),
    h('h3', { class: 'hp-h3' }, t('help.cvvTitle')),
    h('p', {}, t('help.cvv')),
    phone('tel-188', '188', t('help.callCvv')),
    h('p', { class: 'hp-note' }, t('help.realNote'))
  );

  const log = h('div', { class: 'chat-log', role: 'log', 'aria-live': 'polite', dataset: { testid: 'chat-log' } });
  let busy = false;
  let typingEl = null;

  function add(from, text) {
    const m = h('p', { class: 'chat-msg', dataset: { from } }, text);
    log.append(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function reply(text) {
    if (typingEl) typingEl.remove();
    typingEl = h('p', { class: 'chat-msg chat-typing', dataset: { from: 'team' } },
      h('span', { class: 'sr-only' }, t('chat.typing')),
      h('span', { class: 'chat-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
    log.append(typingEl);
    log.scrollTop = log.scrollHeight;
    busy = true;
    setTimeout(() => {
      if (typingEl) typingEl.remove();
      typingEl = null;
      add('team', text);
      busy = false;
    }, TYPING_MS);
  }

  add('team', t('chat.hello'));

  const chips = h('div', { class: 'chat-chips' }, ...QUICK.map((k) =>
    h('button', {
      type: 'button', class: 'chip chat-chip', dataset: { testid: 'chat-q-' + k },
      on: { click: () => { add('me', t('chat.q.' + k)); reply(t('chat.a.' + k)); } }
    }, t('chat.q.' + k))));

  const input = h('input', {
    type: 'text', class: 'chat-input', id: 'chat-input', autocomplete: 'off',
    placeholder: t('chat.placeholder'), 'aria-label': t('chat.placeholder'),
    dataset: { testid: 'chat-input' }
  });
  const svcId = query && query.service;
  const svc = svcId ? getService(svcId) : null;
  if (svc) input.value = loc(svc.name);

  const form = h('form', {
    class: 'chat-form',
    on: {
      submit: (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        add('me', v);
        input.value = '';
        reply(t('chat.fallback'));
      }
    }
  },
    h('div', { class: 'field chat-field' }, input),
    h('button', { type: 'submit', class: 'btn btn--primary chat-send', dataset: { testid: 'chat-send' } },
      h('span', { html: icon('send', 18) }), h('span', {}, t('chat.send')))
  );

  const chat = h('section', { class: 'hp-chat card', 'aria-labelledby': 'hp-chat-h' },
    h('h2', { class: 'hp-h2', id: 'hp-chat-h' }, t('chat.title')),
    h('p', { class: 'notice-mono', dataset: { testid: 'chat-simulated' } }, t('chat.simulated')),
    log, chips, form
  );

  root.append(heading, urgent, chat);
  return root;
}
