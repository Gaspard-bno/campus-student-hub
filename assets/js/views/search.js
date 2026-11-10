import { h } from '../ui.js';
import { t, loc } from '../i18n.js';
import { search, highlight } from '../data.js';
import { navigate } from '../router.js';

// Returns the results (or empty state) for a query. `data-count` lets the
// caller announce the count through its persistent aria-live node.
export function renderResults(q, onBrowse) {
  const found = search(q);
  const n = found.length;
  const root = h('div', { class: 'results', dataset: { count: String(n) } });

  if (n === 0) {
    root.append(
      h('div', { class: 'results__empty', dataset: { testid: 'search-empty' } },
        h('p', { class: 'results__empty-text' }, t('search.empty', { q })),
        h('button', {
          type: 'button',
          class: 'btn btn--secondary',
          dataset: { testid: 'browse-categories' },
          on: { click: () => onBrowse && onBrowse() },
        }, t('search.browse')),
      ),
    );
    return root;
  }

  root.append(
    h('ul', { class: 'results__list' },
      ...found.map((s) =>
        h('li', { class: 'results__item' },
          h('button', {
            type: 'button',
            class: 'results__row',
            dataset: { testid: `result-${s.id}` },
            on: { click: () => navigate(`/service/${s.id}`) },
          },
            h('span', { class: 'results__name' }, highlight(loc(s.name), q)),
            h('span', { class: 'label-mono results__hint' }, t(`cat.${s.category}.hint`)),
          ),
        ),
      ),
    ),
  );
  return root;
}

export function countMessage(n) {
  return n === 1 ? t('search.result1') : t('search.results', { n });
}
