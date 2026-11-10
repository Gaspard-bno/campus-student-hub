import { h } from '../ui.js';
import { t, loc, fmtDate } from '../i18n.js';
import * as store from '../store.js';
import { categories, serviceForCategory, getService } from '../data.js';
import { navigate, setSilent } from '../router.js';
import { icon } from '../../icons/icons.js';
import { renderResults, countMessage } from './search.js';

export function title() {
  return t('home.greeting');
}

function nextBooking() {
  const now = Date.now();
  return store
    .getBookings()
    .filter((b) => new Date(`${b.date}T${b.time}:00`).getTime() >= now)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
}

function categoryTile(c, v2) {
  const size = v2 ? 28 : 22;
  const featured = v2 && c.featured;
  return h('button', {
    type: 'button',
    class: `cat${featured ? ' cat--featured' : ''}`,
    dataset: { testid: `cat-${c.id}` },
    on: { click: () => navigate(`/service/${serviceForCategory(c.id).id}`) },
  },
    h('span', { class: 'cat__icon', html: icon(c.icon, size) }),
    h('span', { class: 'cat__text' },
      h('span', { class: 'cat__label' }, t(`cat.${c.id}`)),
      h('span', { class: 'cat__hint' }, t(`cat.${c.id}.hint`)),
    ),
  );
}

function bookingCard(b) {
  const s = getService(b.serviceId);
  return h('button', {
    type: 'button',
    class: 'next',
    dataset: { testid: 'next-booking' },
    on: { click: () => navigate('/bookings') },
  },
    h('span', { class: 'next__icon', html: icon('calendar', 22) }),
    h('span', { class: 'next__text' },
      h('span', { class: 'label-mono next__label' }, t('home.next')),
      h('span', { class: 'next__name' }, s ? loc(s.name) : ''),
      h('span', { class: 'next__when' }, `${fmtDate(b.date)} · ${b.time}`),
    ),
    h('span', { class: 'next__chev', html: icon('chevron-right', 20) }),
  );
}

export function render(params, query) {
  const v2 = store.getVersion() === 2;
  const cats = categories();
  const initialQ = ((query && query.q) || '').trim();

  const input = h('input', {
    type: 'search',
    class: 'searchbar__input',
    dataset: { testid: 'search-input' },
    placeholder: t('search.placeholder'),
    'aria-label': t('search.placeholder'),
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  });
  const clear = h('button', {
    type: 'button',
    class: 'icon-btn searchbar__clear',
    dataset: { testid: 'search-clear' },
    'aria-label': t('search.clear'),
    hidden: true,
    html: icon('x', 20),
  });
  const live = h('div', { class: 'sr-only', 'aria-live': 'polite', role: 'status' });
  const body = h('div', { class: 'home__body' });
  const coachSlot = h('div', { class: 'home__coach-slot' });

  // ---- categories / next booking ----
  const buildCategories = () => {
    const nb = nextBooking();
    const wrap = h('div', { class: 'home__cats' });
    if (nb) wrap.append(bookingCard(nb));
    wrap.append(h('h2', { class: 'label-mono home__section' }, t('home.categories')));
    if (v2) {
      const feat = cats.filter((c) => c.featured);
      const rest = cats.filter((c) => !c.featured);
      wrap.append(
        h('div', { class: 'cats cats--v2' },
          ...feat.map((c) => categoryTile(c, true)),
          ...rest.map((c) => categoryTile(c, true)),
        ),
      );
    } else {
      wrap.append(h('div', { class: 'cats cats--v1' }, ...cats.map((c) => categoryTile(c, false))));
    }
    return wrap;
  };

  // ---- coach mark (V2, first display) ----
  let coach = null;
  const dismissCoach = () => {
    if (!coach) return;
    store.set('coachmarkSeen', true);
    coach.remove();
    coach = null;
    document.removeEventListener('keydown', onCoachKey);
  };
  function onCoachKey(e) {
    if (!coach || !coach.isConnected) {
      document.removeEventListener('keydown', onCoachKey);
      return;
    }
    if (e.key === 'Escape') dismissCoach();
  }
  if (v2 && !store.get('coachmarkSeen', false)) {
    coach = h('div', { class: 'coach', role: 'note', dataset: { testid: 'coach' } },
      h('p', { class: 'coach__text' }, t('home.coach')),
      h('button', {
        type: 'button',
        class: 'btn btn--secondary coach__ok',
        dataset: { testid: 'coach-ok' },
        on: { click: dismissCoach },
      }, t('home.coachOk')),
    );
    coachSlot.append(coach);
    document.addEventListener('keydown', onCoachKey);
  }

  // ---- live search ----
  let timer = null;
  let searching = false;
  let sessionOpen = false;
  let pushed = false;
  let lastQ = '';

  const showCategories = () => {
    body.replaceChildren(buildCategories());
    coachSlot.hidden = false;
  };

  const browse = () => {
    input.value = '';
    clear.hidden = true;
    runSearch('');
    input.focus();
  };

  const runSearch = (raw) => {
    const q = raw.trim();
    clear.hidden = raw.length === 0;
    if (q.length < 2) {
      if (searching) {
        searching = false;
        sessionOpen = false;
        pushed = false;
        lastQ = '';
        showCategories();
        setSilent('/home', { push: false });
        live.textContent = '';
      }
      return;
    }
    if (q === lastQ) return;
    lastQ = q;
    const res = renderResults(q, browse);
    body.replaceChildren(res);
    coachSlot.hidden = true;
    live.textContent = countMessage(Number(res.dataset.count));
    setSilent(`/search?q=${encodeURIComponent(q)}`, { push: !pushed });
    pushed = true;
    searching = true;
    if (!sessionOpen) {
      sessionOpen = true;
      window.dispatchEvent(new CustomEvent('csh:search', { detail: { q } }));
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    clear.hidden = input.value.length === 0;
    timer = setTimeout(() => runSearch(input.value), 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(timer);
      input.value = '';
      runSearch('');
    }
  });
  clear.addEventListener('click', () => {
    clearTimeout(timer);
    input.value = '';
    runSearch('');
    input.focus();
  });

  // ---- assemble ----
  const root = h('section', { class: 'view view--home' },
    h('header', { class: 'home__head' },
      h('h1', { class: 'view__title home__title', tabindex: '-1' }, t('home.greeting')),
      h('p', { class: 'home__sub' }, t('home.sub')),
    ),
    h('div', { class: 'searchbar field' },
      h('span', { class: 'searchbar__icon', html: icon('search', 20) }),
      input,
      clear,
    ),
    live,
    coachSlot,
    body,
  );

  if (initialQ.length >= 2) {
    input.value = initialQ;
    clear.hidden = false;
    pushed = true; // the URL already carries the query
    runSearch(initialQ);
  } else {
    showCategories();
  }
  return root;
}
