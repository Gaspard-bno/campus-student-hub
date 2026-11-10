import { t } from './i18n.js';
import { icon } from '../icons/icons.js';
import { back } from './router.js';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  const a = attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs) ? attrs : null;
  if (!a && attrs != null) children.unshift(attrs);
  if (a) {
    for (const [k, v] of Object.entries(a)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') for (const [dk, dv] of Object.entries(v)) { if (dv != null) el.dataset[dk] = dv; }
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function announce(msg) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 30);
}

export function backBar(label) {
  return h('div', { class: 'back-bar' },
    h('button', { type: 'button', class: 'back-btn', 'data-testid': 'back', on: { click: () => back() } },
      h('span', { class: 'back-btn__icon', html: icon('chevron-left', 20) }),
      h('span', null, label || t('nav.back'))));
}
