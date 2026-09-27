import { h, readFile, download, toast, copyText } from './dom.js';
import { store } from './store.js';
import { navigate, app, render } from './core.js';
import { t } from './i18n.js';
import { segmented, confirmButton, emptyState } from './ui.js';
import { parseCharacterTexts } from '../engine/script.js';
import { configureCharacters, charInfo, teamAlignment } from '../engine/characters.js';

export function viewSettings() {
  const set = store.lib.settings;
  const save = () => store.saveLib();
  const textsCount = Object.keys(store.lib.charTexts || {}).length;
  const importTexts = (text) => {
    const r = parseCharacterTexts(text);
    if (!r.count) { toast(t('textsNone'), 'warn'); return; }
    store.setCharTexts({ ...store.lib.charTexts, ...r.texts });
    configureCharacters({ texts: store.lib.charTexts });
    toast(t('textsImported', { n: r.count }));
  };
  const importBackup = async (text) => {
    try { store.importAll(text); configureCharacters({ texts: store.lib.charTexts }); toast(t('backupRestored')); } catch { toast(t('backupInvalid'), 'warn'); }
  };
  return h('div', { class: 'page narrow settings' },
    h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, t('navSettings'))),

    h('section', { class: 'panel stack' },
      h('h2', { class: 'section-title' }, t('languageAndStyle')),
      h('div', { class: 'row gap wrap' },
        h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('uiLanguage')),
          segmented({ value: set.uiLang, options: [{ value: 'no', label: 'Norsk' }, { value: 'en', label: 'English' }], onChange: (v) => { set.uiLang = v; save(); } })),
        h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('defaultMessageLanguage')),
          segmented({ value: set.gameLang, options: [{ value: 'no', label: 'Norsk' }, { value: 'en', label: 'English' }], onChange: (v) => { set.gameLang = v; save(); } })),
        h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('defaultStyle')),
          segmented({ value: set.style, options: [{ value: 'short', label: t('styleShort') }, { value: 'flavor', label: t('styleFlavor') }], onChange: (v) => { set.style = v; save(); } })))),

    h('section', { class: 'panel stack' },
      h('h2', { class: 'section-title' }, t('characterTexts')),
      h('p', { class: 'muted small' }, t('characterTextsHelp')),
      h('p', { class: 'small' }, textsCount ? t('textsLoaded', { n: textsCount }) : t('textsUsingOwn')),
      h('div', { class: 'row gap wrap' },
        h('label', { class: 'btn file-btn' }, t('chooseFile'), h('input', { type: 'file', accept: '.json', class: 'visually-hidden', onchange: async (e) => { const f = e.target.files[0]; if (f) importTexts(await readFile(f)); } })),
        textsCount ? confirmButton({ key: 'cleartexts', label: t('clearTexts'), onConfirm: () => { store.setCharTexts({}); configureCharacters({ texts: {} }); } }) : null),
      textsCount ? h('p', { class: 'muted small' }, t('example') + ' – Empath: ' + (charInfo('empath').ability || '')) : null),

    h('section', { class: 'panel stack' },
      h('h2', { class: 'section-title' }, t('historySettings')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: set.historyEnabled, onchange: (e) => { set.historyEnabled = e.target.checked; save(); } }), t('historyEnabled')),
      h('label', { class: 'row gap' }, h('span', null, t('deleteAfterWeeks')),
        h('input', { id: 'hist-weeks', class: 'input tiny', type: 'number', min: 1, max: 52, value: set.historyWeeks, onchange: (e) => { set.historyWeeks = Math.max(1, Math.min(52, Number(e.target.value) || 4)); save(); } }))),

    h('section', { class: 'panel stack' },
      h('h2', { class: 'section-title' }, t('backup')),
      h('p', { class: 'muted small' }, t('backupHelp')),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn', onclick: () => download(`botc-helper-backup-${new Date().toISOString().slice(0, 10)}.json`, store.exportAll()) }, t('downloadBackup')),
        h('button', { class: 'btn ghost', onclick: async () => { const ok = await copyText(store.exportAll()); toast(ok ? t('copied') : t('copyFailed')); } }, t('copyBackup')),
        h('label', { class: 'btn file-btn' }, t('restoreBackup'), h('input', { type: 'file', accept: '.json', class: 'visually-hidden', onchange: async (e) => { const f = e.target.files[0]; if (f) importBackup(await readFile(f)); } })))),

    h('section', { class: 'panel stack danger-zone' },
      h('h2', { class: 'section-title' }, t('privacy')),
      h('p', { class: 'muted small' }, t('privacyLong')),
      h('p', { class: 'small' }, store.isPersistent() ? '✓ ' + t('storageOk') : '⚠ ' + t('storageOff')),
      confirmButton({ key: 'wipe', label: t('deleteAll'), confirmLabel: t('deleteAllConfirm'), onConfirm: () => { store.wipe(); app.draft = null; toast(t('deleted')); navigate('home'); } })));
}

// ——— statistikk per elev (regnes ut fra den lagrede historikken) ———
function playerStats(list, classFilter) {
  const by = new Map();
  for (const g of list) {
    if (classFilter && g.className !== classFilter) continue;
    for (const seat of g.seats) {
      const info = charInfo(seat.characterId);
      const align = seat.alignment || teamAlignment(info.team);
      for (const name of seat.names) {
        const key = name.trim().toLowerCase();
        const p = by.get(key) || { name, games: 0, good: 0, evil: 0, wins: 0, demon: 0, minion: 0, survived: 0, roles: {} };
        p.games += 1;
        p[align === 'evil' ? 'evil' : 'good'] += 1;
        if (g.winner && g.winner === align) p.wins += 1;
        if (info.team === 'demon') p.demon += 1;
        if (info.team === 'minion') p.minion += 1;
        if (seat.alive) p.survived += 1;
        p.roles[info.name] = (p.roles[info.name] || 0) + 1;
        by.set(key, p);
      }
    }
  }
  return [...by.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name));
}

function statsView(list) {
  const classes = [...new Set(list.map((g) => g.className).filter(Boolean))].sort();
  const cf = app.statsClass && classes.includes(app.statsClass) ? app.statsClass : '';
  const rows = playerStats(list, cf);
  const pct = (a, b) => (b ? Math.round((100 * a) / b) + ' %' : '–');
  return h('div', { class: 'stack' },
    h('p', { class: 'muted small' }, t('statsHelp', { n: store.lib.settings.historyWeeks })),
    classes.length > 1 ? h('div', { class: 'row gap wrap' },
      h('label', { class: 'label', for: 'stats-class' }, t('class')),
      h('select', { id: 'stats-class', class: 'input', onchange: (e) => { app.statsClass = e.target.value; render(); } },
        h('option', { value: '' }, t('allClasses')), classes.map((c) => h('option', { value: c, selected: c === cf }, c)))) : null,
    rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table stats-table' },
      h('thead', null, h('tr', null, [t('player'), t('statGames'), t('statWins'), '😇', '😈', t('statDemon'), t('statSurvived'), t('statTopRole')].map((x, i) => h('th', { class: i ? 'right' : '' }, x)))),
      h('tbody', null, rows.map((p) => {
        const top = Object.entries(p.roles).sort((a, b) => b[1] - a[1])[0];
        return h('tr', null,
          h('td', { class: 'strong' }, p.name),
          h('td', { class: 'right' }, String(p.games)),
          h('td', { class: 'right' }, `${p.wins} (${pct(p.wins, p.games)})`),
          h('td', { class: 'right' }, String(p.good)),
          h('td', { class: 'right' }, String(p.evil)),
          h('td', { class: 'right' }, String(p.demon)),
          h('td', { class: 'right' }, pct(p.survived, p.games)),
          h('td', { class: 'right muted' }, top ? `${top[0]}${top[1] > 1 ? ' ×' + top[1] : ''}` : ''));
      })))) : emptyState(t('noHistory'), t('noHistoryHint')));
}

function historyTabs() {
  return segmented({ value: app.historyTab === 'stats' ? 'stats' : 'games', options: [{ value: 'games', label: t('pastGames') }, { value: 'stats', label: '📊 ' + t('stats') }], onChange: (v) => { app.historyTab = v; render(); } });
}

export function viewHistory() {
  const list = store.lib.history;
  if (app.historyTab === 'stats') {
    return h('div', { class: 'page' },
      h('div', { class: 'page-head row between wrap' },
        h('h1', { class: 'page-title' }, t('stats')),
        historyTabs()),
      statsView(list));
  }
  const fmt = (ts) => new Date(ts).toLocaleDateString(store.lib.settings.uiLang === 'no' ? 'nb-NO' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return h('div', { class: 'page narrow' },
    h('div', { class: 'page-head row between wrap' },
      h('div', null, h('h1', { class: 'page-title' }, t('pastGames')),
        h('p', { class: 'muted' }, store.lib.settings.historyEnabled ? t('deletedAfter', { n: store.lib.settings.historyWeeks }) : t('historyOff'))),
      h('div', { class: 'row gap wrap' }, historyTabs(),
        list.length ? confirmButton({ key: 'delhist', label: t('deleteAllHistory'), onConfirm: () => store.deleteHistory(null) }) : null)),
    list.length ? h('ul', { class: 'history-list' }, list.map((g) => h('li', { class: 'panel' },
      h('div', { class: 'row between wrap' },
        h('div', null,
          h('span', { class: 'display strong' }, [g.className, g.groupName].filter(Boolean).join(' · ') || t('quickList')),
          h('span', { class: 'muted small' }, ` · ${fmt(g.date)} · ${g.scriptName}`)),
        h('div', { class: 'row gap' },
          h('span', { class: 'pill ' + (g.winner === 'good' ? 'team-townsfolk' : g.winner === 'evil' ? 'team-demon' : '') }, g.winner === 'good' ? t('goodWins') : g.winner === 'evil' ? t('evilWins') : '—'),
          confirmButton({ key: 'dh' + g.id, label: '✕', confirmLabel: t('delete'), cls: 'btn danger small', onConfirm: () => store.deleteHistory(g.id) }))),
      h('p', { class: 'small' }, g.seats.map((x) => `${x.names.join(' + ')} (${charInfo(x.characterId).name}${x.alive ? '' : ' †'})`).join(', ')),
      g.notes && g.notes.length ? h('details', null, h('summary', { class: 'small' }, t('notes') + ` (${g.notes.length})`), h('ul', { class: 'small' }, g.notes.map((n) => h('li', null, n)))) : null,
      h('p', { class: 'muted small' }, t('expires') + ' ' + fmt(g.expiresAt))))) : emptyState(t('noHistory'), t('noHistoryHint')));
}
