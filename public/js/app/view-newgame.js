// Nytt spill: spillere → script → roller → plassering → setup.

import { h, readFile, toast } from './dom.js';
import { store } from './store.js';
import { app, render, navigate } from './core.js';
import { t } from './i18n.js';
import { charSelect, teamPill, segmented, confirmButton, emptyState } from './ui.js';
import { grimCircle, roleToken } from './grim.js';
import { TROUBLE_BREWING } from '../engine/defs.js';
import { charInfo, configureCharacters, teamAlignment } from '../engine/characters.js';
import { randomizeRoles, validateSetup, suggestBluffs, suggestDrunkShown, suggestRedHerring, expectedComposition, baseComposition, roleCardMessages } from '../engine/setup.js';
import { createGame } from '../engine/state.js';
import { parseScript } from '../engine/script.js';
import { shuffle } from '../engine/rng.js';
import { msg } from '../engine/text.js';

const STEPS = ['wzPlayers', 'wzScript', 'wzRoles', 'wzSeating', 'wzSetup'];

function allScripts() {
  return [TROUBLE_BREWING, ...store.lib.scripts];
}

function ensureDraft() {
  if (!app.draft) {
    const set = store.lib.settings;
    const cls = store.lib.classes[0];
    app.draft = {
      step: 1, source: cls ? 'class' : 'quick', quickText: '',
      classId: cls ? cls.id : null, groupId: null, absent: [], pairs: [], pairMode: false, pairFirst: null,
      scriptId: 'tb', lang: set.gameLang, style: set.style,
      seats: [], include: [], exclude: [], swapSel: [], bluffs: [], redHerring: null, warnings: [], rolled: false,
      scriptImport: '', scriptImportMsg: null,
    };
  }
  return app.draft;
}

function script(d) {
  const sc = allScripts().find((x) => x.id === d.scriptId) || TROUBLE_BREWING;
  configureCharacters({ custom: sc.custom || {} });
  return sc;
}

function students(d) {
  if (d.source === 'quick') {
    return d.quickText.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean).map((name, i) => ({ id: 'q' + i + '_' + name.toLowerCase().replace(/[^a-zæøå0-9]/g, ''), firstName: name, tags: [] }));
  }
  return d.classId ? store.studentsOf(d.classId, d.groupId) : [];
}

function buildSeats(d) {
  const list = students(d).filter((s) => !d.absent.includes(s.id));
  const used = new Set();
  const seats = [];
  for (const st of list) {
    if (used.has(st.id)) continue;
    const pair = d.pairs.find((p) => p.includes(st.id));
    const members = [st];
    if (pair) {
      const other = list.find((x) => x.id === (pair[0] === st.id ? pair[1] : pair[0]));
      if (other) members.push(other);
    }
    members.forEach((m) => used.add(m.id));
    const id = 'seat_' + members.map((m) => m.id).join('_');
    const prev = d.seats.find((x) => x.id === id);
    seats.push({
      id, names: members.map((m) => m.firstName), studentIds: d.source === 'quick' ? [] : members.map((m) => m.id),
      tags: [...new Set(members.flatMap((m) => m.tags || []))],
      characterId: prev ? prev.characterId : null, locked: prev ? prev.locked : false, shownCharacterId: prev ? prev.shownCharacterId : null,
    });
  }
  const order = d.seats.map((x) => x.id);
  const pos = (id) => { const i = order.indexOf(id); return i < 0 ? 9999 : i; };
  seats.sort((a, b) => pos(a.id) - pos(b.id));
  d.seats = seats;
}

function roll(d, all = false) {
  const sc = script(d);
  if (all) d.seats.forEach((x) => { x.locked = false; });
  const locks = {};
  d.seats.forEach((x) => { if (x.locked && x.characterId) locks[x.id] = x.characterId; });
  const r = randomizeRoles({ seats: d.seats, script: sc, locks, include: d.include, exclude: d.exclude, lang: store.lib.settings.uiLang });
  d.seats.forEach((x) => { x.characterId = r.assignment[x.id] || null; });
  d.warnings = r.warnings;
  d.rolled = true;
  d.swapSel = [];
  // Nullstill setup-valg som kan ha blitt ugyldige
  d.seats.forEach((x) => { if (!(x.characterId && charInfo(x.characterId).def && charInfo(x.characterId).def.drunkLike)) x.shownCharacterId = null; });
  d.bluffs = [];
  d.redHerring = null;
}

function fillSetupSuggestions(d) {
  const sc = script(d);
  const inPlay = d.seats.map((x) => x.characterId).filter(Boolean);
  for (const seat of d.seats) {
    const def = seat.characterId && charInfo(seat.characterId).def;
    if (def && def.drunkLike && !seat.shownCharacterId) seat.shownCharacterId = suggestDrunkShown(sc, inPlay);
  }
  const shown = d.seats.map((x) => x.shownCharacterId).filter(Boolean);
  const ft = d.seats.find((x) => needsRedHerring(x));
  if (ft && !d.redHerring) d.redHerring = suggestRedHerring(d.seats, ft.id);
  if (!d.bluffs.filter(Boolean).length && inPlay.some((id) => charInfo(id).team === 'demon')) d.bluffs = suggestBluffs(sc, inPlay, shown);
}

function acting(seat) {
  const def = seat.characterId && charInfo(seat.characterId).def;
  return def && def.drunkLike && seat.shownCharacterId ? seat.shownCharacterId : seat.characterId;
}

function needsRedHerring(seat) {
  const a = acting(seat);
  const def = a && charInfo(a).def;
  return !!(def && def.setup === 'redHerring');
}

function seatsForValidation(d) {
  return d.seats.map((x) => ({ ...x, reminders: d.redHerring === x.id ? [{ kind: 'redherring' }] : [] }));
}

// ——— steg 1 ———
function stepPlayers(d) {
  const classes = store.lib.classes;
  const list = students(d);
  const groups = store.lib.groups.filter((g) => g.classId === d.classId);
  buildSeats(d);
  const n = d.seats.length;
  const comp = n >= 5 ? baseComposition(n) : null;
  const pairOf = (id) => d.pairs.find((p) => p.includes(id));
  const nameOf = (id) => (list.find((x) => x.id === id) || {}).firstName || '?';

  const clickStudent = (st) => {
    if (d.pairMode) {
      if (d.absent.includes(st.id)) return;
      if (pairOf(st.id)) { d.pairs = d.pairs.filter((p) => !p.includes(st.id)); d.pairFirst = null; render(); return; }
      if (!d.pairFirst) d.pairFirst = st.id;
      else if (d.pairFirst === st.id) d.pairFirst = null;
      else { d.pairs.push([d.pairFirst, st.id]); d.pairFirst = null; }
    } else {
      d.absent = d.absent.includes(st.id) ? d.absent.filter((x) => x !== st.id) : [...d.absent, st.id];
      if (d.absent.includes(st.id)) d.pairs = d.pairs.filter((p) => !p.includes(st.id));
    }
    render();
  };

  return h('div', { class: 'wz-body' },
    h('div', { class: 'row gap wrap' },
      segmented({
        value: d.source, label: t('source'),
        options: [{ value: 'class', label: t('fromClass') }, { value: 'quick', label: t('quickList') }],
        onChange: (v) => { d.source = v; d.absent = []; d.pairs = []; render(); },
      })),
    d.source === 'class' ? (classes.length ? h('div', { class: 'stack' },
      h('div', { class: 'row gap wrap' },
        h('span', { class: 'label' }, t('class')),
        segmented({ value: d.classId, options: classes.map((c) => ({ value: c.id, label: c.name })), onChange: (v) => { d.classId = v; d.groupId = null; d.absent = []; d.pairs = []; render(); } })),
      groups.length ? h('div', { class: 'row gap wrap' },
        h('span', { class: 'label' }, t('group')),
        segmented({ value: d.groupId, options: [{ value: null, label: t('wholeClass') }, ...groups.map((g) => ({ value: g.id, label: g.name }))], onChange: (v) => { d.groupId = v; d.absent = []; d.pairs = []; render(); } })) : null)
      : emptyState(t('noClasses'), t('noClassesQuick'), h('button', { class: 'btn', onclick: () => navigate('classes') }, t('navClasses'))))
      : h('div', { class: 'stack' },
        h('label', { class: 'label', for: 'quick-names' }, t('quickListLabel')),
        h('textarea', { id: 'quick-names', class: 'textarea', rows: 4, value: d.quickText, placeholder: 'Markus, Frida, Tarjei, Emil, Nora, Ida, Jonas, Sara, Ole, Ella', oninput: (e) => { d.quickText = e.target.value; render(); } }),
        h('p', { class: 'muted small' }, t('quickListNote'))),

    list.length ? h('div', { class: 'stack' },
      h('div', { class: 'row between wrap' },
        h('p', { class: 'muted small' }, d.pairMode ? t('pairModeHelp') : t('absentHelp')),
        h('button', { class: 'btn' + (d.pairMode ? ' primary' : ''), 'aria-pressed': d.pairMode ? 'true' : 'false', onclick: () => { d.pairMode = !d.pairMode; d.pairFirst = null; render(); } }, d.pairMode ? t('pairModeDone') : '⇄ ' + t('pairMode'))),
      h('div', { class: 'student-grid' + (d.pairMode ? ' pairing' : '') }, list.map((st) => {
        const absent = d.absent.includes(st.id);
        const pair = pairOf(st.id);
        return h('button', {
          class: 'student-tile' + (absent ? ' absent' : '') + (pair ? ' paired' : '') + (d.pairFirst === st.id ? ' picking' : ''),
          'aria-pressed': absent ? 'false' : 'true', onclick: () => clickStudent(st),
        },
        h('span', { class: 'st-name' }, st.firstName),
        absent ? h('span', { class: 'st-state' }, t('absent')) : pair ? h('span', { class: 'st-state' }, '⇄ ' + nameOf(pair[0] === st.id ? pair[1] : pair[0])) : null,
        (st.tags || []).length ? h('span', { class: 'st-tags' }, st.tags.map((tg) => h('span', { class: 'mini-tag' }, t('tagShort_' + tg)))) : null);
      }))) : null,

    h('div', { class: 'summary-bar' },
      h('span', null, h('strong', null, String(list.length - d.absent.length)), ' ' + t('present')),
      d.pairs.length ? h('span', null, h('strong', null, String(d.pairs.length)), ' ' + t('pairsCount')) : null,
      h('span', null, h('strong', null, String(n)), ' ' + t('seats')),
      comp ? h('span', { class: 'muted' }, `${comp.townsfolk} Townsfolk · ${comp.outsider} Outsider · ${comp.minion} Minion · ${comp.demon} Demon`) : h('span', { class: 'warn-text' }, t('needFive'))));
}

// ——— steg 2 ———
function stepScript(d) {
  const sc = script(d);
  const sample = msg(d.lang, d.style, 'empath', { n: 1 });
  const doImport = async (text) => {
    const r = parseScript(text);
    if (!r.script) { d.scriptImportMsg = { kind: 'warn', text: t('scriptImportEmpty') }; render(); return; }
    store.addScript(r.script);
    d.scriptId = r.script.id;
    d.scriptImport = '';
    d.scriptImportMsg = { kind: r.unknown.length ? 'warn' : 'ok', text: t('scriptImported', { name: r.script.name, n: r.script.characters.length }) + (r.unknown.length ? ' ' + t('scriptUnknown', { list: r.unknown.join(', ') }) : '') };
    d.rolled = false;
    render();
  };
  const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];
  return h('div', { class: 'wz-body' },
    h('div', { class: 'script-list' }, allScripts().map((x) => h('div', { class: 'script-card' + (x.id === d.scriptId ? ' active' : '') },
      h('button', { class: 'script-pick', onclick: () => { d.scriptId = x.id; d.rolled = false; d.include = []; d.exclude = []; render(); }, 'aria-pressed': x.id === d.scriptId ? 'true' : 'false' },
        h('span', { class: 'script-name display' }, x.name),
        h('span', { class: 'muted small' }, (x.builtIn ? t('builtIn') : t('imported')) + ' · ' + x.characters.length + ' ' + t('characters'))),
      x.builtIn ? null : confirmButton({ key: 'delscript' + x.id, label: '✕', confirmLabel: t('delete'), cls: 'btn danger small', onConfirm: () => { store.deleteScript(x.id); if (d.scriptId === x.id) d.scriptId = 'tb'; } })))),
    h('div', { class: 'script-roles' }, teams.map((tm) => {
      const ids = sc.characters.filter((id) => charInfo(id).team === tm);
      if (!ids.length) return null;
      return h('div', { class: 'role-col' }, h('span', { class: 'label' }, t('team_' + tm)),
        h('div', { class: 'chips' }, ids.map((id) => h('span', { class: 'chip ' + (charInfo(id).modeled ? '' : 'unmodeled'), title: charInfo(id).modeled ? '' : t('unmodeled') }, charInfo(id).name))));
    })),
    h('details', { class: 'panel', open: !!d.scriptImport || !!d.scriptImportMsg },
      h('summary', null, t('importScript')),
      h('p', { class: 'muted small' }, t('importScriptHelp')),
      h('label', { class: 'btn ghost file-btn' }, t('chooseFile'), h('input', { type: 'file', accept: '.json,.txt', class: 'visually-hidden', onchange: async (e) => { const f = e.target.files[0]; if (f) doImport(await readFile(f)); } })),
      h('textarea', { id: 'script-import', class: 'textarea mono', rows: 4, value: d.scriptImport, placeholder: '[{"id":"_meta","name":"Mitt script"},"washerwoman","empath","imp", …]', oninput: (e) => { d.scriptImport = e.target.value; } }),
      h('button', { class: 'btn', onclick: () => doImport(d.scriptImport) }, t('importScriptBtn')),
      d.scriptImportMsg ? h('p', { class: 'small ' + d.scriptImportMsg.kind + '-text' }, d.scriptImportMsg.text) : null),
    h('div', { class: 'row gap wrap settings-row' },
      h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('messageLanguage')),
        segmented({ value: d.lang, options: [{ value: 'no', label: 'Norsk' }, { value: 'en', label: 'English' }], onChange: (v) => { d.lang = v; render(); } })),
      h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('messageStyle')),
        segmented({ value: d.style, options: [{ value: 'short', label: t('styleShort') }, { value: 'flavor', label: t('styleFlavor') }], onChange: (v) => { d.style = v; render(); } }))),
    h('div', { class: 'msg-card kind-private sample' }, h('span', { class: 'msg-to' }, t('example') + ' · Empath'), h('p', { class: 'msg-text' }, sample)));
}

// ——— steg 3 ———
function stepRoles(d) {
  const sc = script(d);
  if (!d.rolled) roll(d);
  const lang = store.lib.settings.uiLang;
  const v = validateSetup({ seats: seatsForValidation(d), script: sc, bluffs: d.bluffs, lang }).filter((x) => !['vDrunkMissing', 'vDrunkInPlay', 'vRedHerringMissing', 'vRedHerringEvil', 'vBluffs', 'vBluffInPlay', 'vBluffEvil'].includes(x.code));
  const ids = d.seats.map((x) => x.characterId).filter(Boolean);
  const exp = expectedComposition(d.seats.length, ids);
  const cycle = (id) => {
    if (d.include.includes(id)) { d.include = d.include.filter((x) => x !== id); d.exclude.push(id); } else if (d.exclude.includes(id)) d.exclude = d.exclude.filter((x) => x !== id);
    else d.include.push(id);
    render();
  };
  const swap = () => {
    const [a, b] = d.swapSel.map((id) => d.seats.find((x) => x.id === id));
    if (!a || !b) return;
    [a.characterId, b.characterId] = [b.characterId, a.characterId];
    a.locked = b.locked = true;
    d.swapSel = [];
    render();
  };
  return h('div', { class: 'wz-body roles-layout' },
    h('div', { class: 'stack' },
      h('div', { class: 'row gap wrap toolbar' },
        h('button', { class: 'btn primary', onclick: () => { roll(d); render(); } }, '🎲 ' + t('reroll')),
        h('button', { class: 'btn', onclick: () => { roll(d, true); render(); } }, t('rerollAll')),
        h('button', { class: 'btn', onclick: () => { d.seats.forEach((x) => { x.locked = true; }); render(); } }, '🔒 ' + t('lockAll')),
        h('button', { class: 'btn', onclick: () => { d.seats.forEach((x) => { x.locked = false; }); render(); } }, t('unlockAll')),
        h('button', { class: 'btn', disabled: d.swapSel.length !== 2, onclick: swap }, '⇄ ' + t('swapSelected'))),
      d.warnings.length ? h('div', { class: 'callout warn' }, d.warnings.map((w) => h('p', null, '⚠ ' + w))) : null,
      h('div', { class: 'table-wrap' }, h('table', { class: 'table roles' },
        h('thead', null, h('tr', null, h('th', { class: 'w-check' }, h('span', { class: 'visually-hidden' }, t('select'))), h('th', null, '#'), h('th', null, t('player')), h('th', null, t('character')), h('th', null, t('team')), h('th', { class: 'center' }, t('lock')))),
        h('tbody', null, d.seats.map((seat, i) => {
          const info = seat.characterId ? charInfo(seat.characterId) : null;
          return h('tr', { class: seat.locked ? 'locked' : '' },
            h('td', { class: 'w-check' }, h('input', { type: 'checkbox', 'aria-label': t('select') + ' ' + seat.names.join(' + '), checked: d.swapSel.includes(seat.id), onchange: (e) => { d.swapSel = e.target.checked ? [...d.swapSel, seat.id].slice(-2) : d.swapSel.filter((x) => x !== seat.id); render(); } })),
            h('td', { class: 'num' }, String(i + 1)),
            h('td', null, h('span', { class: 'strong' }, seat.names.join(' + ')), seat.tags.map((tg) => h('span', { class: 'mini-tag' }, t('tagShort_' + tg)))),
            h('td', null, charSelect({ id: 'rs-' + seat.id, value: seat.characterId, options: [...new Set([...sc.characters, ...(seat.characterId ? [seat.characterId] : [])])], onChange: (val) => { seat.characterId = val; seat.locked = !!val; render(); } })),
            h('td', null, info ? teamPill(info.team) : null),
            h('td', { class: 'center' }, h('button', { class: 'icon-btn lock' + (seat.locked ? ' on' : ''), 'aria-pressed': seat.locked ? 'true' : 'false', 'aria-label': t('lock'), onclick: () => { seat.locked = !seat.locked; render(); } }, seat.locked ? '🔒' : '🔓')));
        })))),
      h('details', { class: 'panel' },
        h('summary', null, t('rolePool')),
        h('p', { class: 'muted small' }, t('rolePoolHelp')),
        h('div', { class: 'chips' }, sc.characters.map((id) => h('button', {
          class: 'chip toggle ' + (d.include.includes(id) ? 'on include' : d.exclude.includes(id) ? 'exclude' : ''),
          onclick: () => cycle(id),
        }, (d.include.includes(id) ? '+ ' : d.exclude.includes(id) ? '− ' : '') + charInfo(id).name))))),
    h('aside', { class: 'validation panel' },
      h('h3', { class: 'section-title' }, t('setupValidation')),
      h('p', { class: 'muted small' }, t('expected') + `: ${exp.townsfolk} / ${exp.outsider} / ${exp.minion} / ${exp.demon}`),
      h('ul', { class: 'checks' }, v.map((x) => h('li', { class: 'check-' + x.level }, h('span', { class: 'check-icon', 'aria-hidden': 'true' }, x.level === 'ok' ? '✓' : x.level === 'warn' ? '⚠' : 'i'), x.text)))));
}

// ——— steg 4 ———
function stepSeating(d) {
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= d.seats.length) return;
    [d.seats[i], d.seats[j]] = [d.seats[j], d.seats[i]];
    render();
  };
  return h('div', { class: 'wz-body seating-layout' },
    grimCircle({
      seats: d.seats,
      token: (seat, i) => roleToken({ characterId: seat.characterId, label: seat.names.join(' + '), index: i }),
      center: h('div', { class: 'center-text' }, h('span', { class: 'display' }, t('clockwise')), h('span', { class: 'muted small' }, t('seatingCenter'))),
    }),
    h('div', { class: 'stack' },
      h('p', { class: 'muted' }, t('seatingHelp')),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn', onclick: () => { d.seats = shuffle(d.seats); render(); } }, '🎲 ' + t('randomOrder')),
        h('button', { class: 'btn', onclick: () => { d.seats.sort((a, b) => a.names[0].localeCompare(b.names[0], 'nb')); render(); } }, t('alphabetical'))),
      h('ol', { class: 'seat-order' }, d.seats.map((seat, i) => h('li', null,
        h('span', { class: 'num' }, String(i + 1)),
        h('span', { class: 'grow strong' }, seat.names.join(' + ')),
        h('span', { class: 'muted small' }, seat.characterId ? charInfo(seat.characterId).name : ''),
        h('button', { class: 'icon-btn', 'aria-label': t('moveUp'), disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
        h('button', { class: 'icon-btn', 'aria-label': t('moveDown'), disabled: i === d.seats.length - 1, onclick: () => move(i, 1) }, '↓'))))));
}

// ——— steg 5 ———
function stepSetup(d) {
  const sc = script(d);
  fillSetupSuggestions(d);
  const lang = store.lib.settings.uiLang;
  const inPlay = d.seats.map((x) => x.characterId).filter(Boolean);
  const v = validateSetup({ seats: seatsForValidation(d), script: sc, bluffs: d.bluffs, lang });
  const warns = v.filter((x) => x.level === 'warn');
  const drunks = d.seats.filter((x) => x.characterId && charInfo(x.characterId).def && charInfo(x.characterId).def.drunkLike);
  const ft = d.seats.find((x) => needsRedHerring(x));
  const hasDemon = inPlay.some((id) => charInfo(id).team === 'demon');
  const tfNotIn = sc.characters.filter((id) => charInfo(id).team === 'townsfolk' && !inPlay.includes(id));
  const good = sc.characters.filter((id) => ['townsfolk', 'outsider'].includes(charInfo(id).team));
  const goodSeats = d.seats.filter((x) => x.characterId && teamAlignment(charInfo(x.characterId).team) === 'good');

  return h('div', { class: 'wz-body setup-layout' },
    h('div', { class: 'stack' },
      drunks.map((seat) => h('div', { class: 'setup-item' },
        h('div', { class: 'setup-q' }, h('strong', null, seat.names.join(' + ')), ' ' + t('isDrunk')),
        h('div', { class: 'row gap' },
          charSelect({ id: 'drunk-' + seat.id, value: seat.shownCharacterId, options: tfNotIn.length ? tfNotIn : sc.characters.filter((id) => charInfo(id).team === 'townsfolk'), onChange: (val) => { seat.shownCharacterId = val; render(); } }),
          h('button', { class: 'icon-btn', 'aria-label': t('suggest'), onclick: () => { seat.shownCharacterId = suggestDrunkShown(sc, inPlay, [seat.shownCharacterId]); render(); } }, '🎲')))),
      ft ? h('div', { class: 'setup-item' },
        h('div', { class: 'setup-q' }, h('strong', null, 'Fortune Teller'), ' – ' + t('redHerringQ')),
        h('div', { class: 'row gap' },
          h('select', { id: 'rh', class: 'select', onchange: (e) => { d.redHerring = e.target.value || null; render(); } },
            h('option', { value: '' }, '—'),
            goodSeats.map((x) => h('option', { value: x.id, selected: d.redHerring === x.id }, `${x.names.join(' + ')} · ${charInfo(x.characterId).name}`))),
          h('button', { class: 'icon-btn', 'aria-label': t('suggest'), onclick: () => { d.redHerring = suggestRedHerring(d.seats, ft.id); render(); } }, '🎲'))) : null,
      hasDemon ? h('div', { class: 'setup-item' },
        h('div', { class: 'setup-q' }, h('strong', null, t('demonBluffs')), ' – ' + t('bluffsQ')),
        h('div', { class: 'row gap wrap' },
          [0, 1, 2].map((i) => charSelect({ id: 'bluff' + i, value: d.bluffs[i] || null, options: good, onChange: (val) => { d.bluffs[i] = val; render(); } })),
          h('button', { class: 'icon-btn', 'aria-label': t('suggest'), onclick: () => { d.bluffs = suggestBluffs(sc, inPlay, d.seats.map((x) => x.shownCharacterId).filter(Boolean)); render(); } }, '🎲'))) : null,
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t('player')), h('th', null, t('character')), h('th', null, t('team')), h('th', null, t('believes')))),
        h('tbody', null, d.seats.map((seat, i) => h('tr', null,
          h('td', { class: 'num' }, String(i + 1)),
          h('td', { class: 'strong' }, seat.names.join(' + ')),
          h('td', null, seat.characterId ? charInfo(seat.characterId).name : '—', d.redHerring === seat.id ? h('span', { class: 'mini-tag' }, 'Red herring') : null),
          h('td', null, seat.characterId ? teamPill(charInfo(seat.characterId).team) : null),
          h('td', { class: 'muted' }, seat.shownCharacterId ? charInfo(seat.shownCharacterId).name : ''))))))),
    h('aside', { class: 'validation panel' },
      h('h3', { class: 'section-title' }, t('setupValidation')),
      h('ul', { class: 'checks' }, v.map((x) => h('li', { class: 'check-' + x.level }, h('span', { class: 'check-icon', 'aria-hidden': 'true' }, x.level === 'ok' ? '✓' : x.level === 'warn' ? '⚠' : 'i'), x.text))),
      warns.length ? h('p', { class: 'small warn-text' }, t('canOverride')) : h('p', { class: 'small ok-text' }, t('setupReady'))));
}

function startGame(d) {
  const sc = script(d);
  const cls = store.lib.classes.find((c) => c.id === d.classId);
  const grp = store.lib.groups.find((g) => g.id === d.groupId);
  const seats = d.seats.map((x) => ({
    id: x.id, names: x.names, studentIds: x.studentIds, tags: x.tags, characterId: x.characterId, shownCharacterId: x.shownCharacterId,
    reminders: d.redHerring === x.id ? [{ kind: 'redherring', label: 'Red herring', sourceSeatId: (d.seats.find((y) => needsRedHerring(y)) || {}).id || null }] : [],
  }));
  const messages = roleCardMessages(seats, d.lang, d.style);
  const initial = createGame({
    seats, script: sc, lang: d.lang, style: d.style, bluffs: d.bluffs.filter(Boolean),
    meta: { className: d.source === 'quick' ? '' : cls ? cls.name : '', groupName: d.source === 'quick' ? '' : grp ? grp.name : '' },
    messages,
  });
  store.startGame(initial);
  app.stepDrafts = {};
  app.pending = [];
  app.gameTab = 'phase';
  app.draft = null;
  navigate('game');
  toast(t('gameStarted'));
}

export function viewNewGame() {
  const d = ensureDraft();
  script(d);
  if (d.step >= 3 && !d.rolled) roll(d);
  const body = [stepPlayers, stepScript, stepRoles, stepSeating, stepSetup][d.step - 1](d);
  const canNext = d.step !== 1 || d.seats.length >= 3;
  const go = (n) => { d.step = n; if (n >= 2) buildSeats(d); render(); window.scrollTo(0, 0); };
  return h('div', { class: 'page wizard' },
    h('div', { class: 'page-head' },
      h('h1', { class: 'page-title' }, t('newGame')),
      store.game ? h('p', { class: 'callout warn small' }, t('newGameReplacesWarn')) : null),
    h('ol', { class: 'stepper' }, STEPS.map((k, i) => h('li', { class: (i + 1 === d.step ? 'current' : i + 1 < d.step ? 'done' : '') },
      h('button', { class: 'step-btn', disabled: i + 1 > d.step && !(i + 1 === d.step + 1 && canNext), onclick: () => go(i + 1) },
        h('span', { class: 'step-num' }, String(i + 1)), h('span', { class: 'step-label' }, t(k)))))),
    body,
    h('div', { class: 'wz-foot' },
      d.step > 1 ? h('button', { class: 'btn ghost', onclick: () => go(d.step - 1) }, '← ' + t('back')) : h('span'),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn ghost', onclick: () => { app.draft = null; navigate('home'); } }, t('cancel')),
        d.step < 5
          ? h('button', { class: 'btn primary', disabled: !canNext, onclick: () => go(d.step + 1) }, t('next') + ' →')
          : h('button', { class: 'btn primary big', onclick: () => startGame(d) }, t('startGame')))));
}
