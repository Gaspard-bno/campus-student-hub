import { h } from '../ui.js';
import { t, setLang, allLangs } from '../i18n.js';
import { navigate } from '../router.js';

// Language names are proper nouns written in their own language, not UI copy.
const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
];

export function title() {
  return t('welcome.title');
}

export function render() {
  const pick = (code) => {
    setLang(code);
    navigate('/home');
  };

  const buttons = LANGS.map(({ code, name }) =>
    h('button', {
      type: 'button',
      class: 'welcome__lang',
      lang: code === 'pt' ? 'pt-BR' : code,
      dataset: { testid: `lang-${code}` },
      on: { click: () => pick(code) },
    },
      h('span', { class: 'welcome__lang-name' }, name),
      h('span', { class: 'label-mono welcome__lang-code', 'aria-hidden': 'true' }, code.toUpperCase()),
    ),
  );

  return h('section', { class: 'view view--welcome' },
    h('div', { class: 'welcome__intro' },
      h('p', { class: 'label-mono welcome__eyebrow' }, t('welcome.choose')),
      // Greeting stacked in EN, PT, FR (allLangs order), each line tagged with its own language.
      h('h1', { class: 'view__title welcome__title', tabindex: '-1' },
        ...allLangs('welcome.title').map((text, i) =>
          h('span', { class: 'welcome__greet', lang: LANGS[i].code === 'pt' ? 'pt-BR' : LANGS[i].code }, text))),
    ),
    h('div', { class: 'welcome__choices', role: 'group', 'aria-label': t('welcome.choose') }, ...buttons),
    h('p', { class: 'welcome__later muted' }, t('welcome.later')),
  );
}
