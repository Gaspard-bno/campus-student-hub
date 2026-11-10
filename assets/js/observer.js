import { h } from './ui.js';
import { t, getLang } from './i18n.js';
import * as store from './store.js';

const sessions = [];
let running = null;
let tick = null;

function fmt(ms) {
  return (ms / 1000).toFixed(1);
}

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv() {
  const cols = ['startedAt', 'durationS', 'version', 'lang', 'screens', 'usedSearch', 'completed'];
  const lines = [cols.join(',')];
  sessions.forEach((s) => lines.push(cols.map((c) => csvCell(s[c])).join(',')));
  return lines.join('\n') + '\n';
}

function download() {
  const blob = new Blob([toCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campus-student-hub-sessions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mount(el) {
  let last = null;
  let timerEl;
  let resultEl;
  let startBtn;
  let stopBtn;

  function sync() {
    if (!timerEl) return;
    timerEl.textContent = running ? fmt(Date.now() - running.t0) + ' s' : (last ? fmt(last.durationS * 1000) + ' s' : '0.0 s');
    startBtn.disabled = !!running;
    stopBtn.disabled = !running;
    resultEl.textContent = last && !running && last.completed ? t('panel.testDone', { s: last.durationS.toFixed(1) }) : '';
  }

  function finish(completed) {
    if (!running) return;
    clearInterval(tick);
    const durationS = Math.round((Date.now() - running.t0) / 100) / 10;
    let version = 2;
    try { version = store.getVersion(); } catch (e) { /* keep default */ }
    last = {
      startedAt: new Date(running.t0).toISOString(), durationS, version, lang: getLang(),
      screens: running.screens, usedSearch: running.usedSearch, completed
    };
    sessions.push(last);
    store.set('sessions', sessions.slice());
    running = null;
    sync();
  }

  function start() {
    if (running) return;
    last = null;
    running = { t0: Date.now(), screens: 0, usedSearch: false };
    clearInterval(tick);
    tick = setInterval(sync, 100);
    sync();
  }

  function build() {
    timerEl = h('p', { class: 'obs-timer', 'aria-hidden': 'true' }, '0.0 s');
    resultEl = h('p', { class: 'obs-result', role: 'status', dataset: { testid: 'obs-result' } });
    startBtn = h('button', { type: 'button', class: 'btn btn--secondary obs-btn', dataset: { testid: 'obs-start' }, on: { click: start } }, t('panel.testStart'));
    stopBtn = h('button', { type: 'button', class: 'btn btn--ghost obs-btn', dataset: { testid: 'obs-stop' }, on: { click: () => finish(false) } }, t('panel.testStop'));
    const exp = h('button', { type: 'button', class: 'btn btn--ghost obs-btn', dataset: { testid: 'obs-export' }, on: { click: download } }, t('panel.testExport'));
    el.classList.add('obs');
    el.replaceChildren(
      h('h2', { class: 'obs-title label-mono' }, t('panel.test')),
      timerEl,
      h('div', { class: 'obs-btns' }, startBtn, stopBtn),
      resultEl,
      exp
    );
    sync();
  }

  window.addEventListener('csh:route', (e) => {
    if (!running) return;
    running.screens += 1;
    if (e.detail && e.detail.name === 'confirm') finish(true);
  });
  window.addEventListener('csh:search', () => { if (running) running.usedSearch = true; });
  window.addEventListener('csh:langchange', build);
  build();
}
