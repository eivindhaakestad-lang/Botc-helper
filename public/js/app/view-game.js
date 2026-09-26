// Spillskjermen: grimoire, nattassistent, dag, meldinger, notater og logg.

import { h, toast, copyText } from './dom.js';
import { store } from './store.js';
import { app, render, navigate } from './core.js';
import { t } from './i18n.js';
import { charSelect, playerSelect, copyButton, modal, openModal, closeModal, confirmButton, emptyState, segmented, teamPill } from './ui.js';
import { grimCircle, roleToken } from './grim.js';
import { charInfo, configureCharacters } from '../engine/characters.js';
import { seatName, getSeat, aliveSeats, compromised } from '../engine/state.js';
import { nightQueue, stepModel, resolveStep, defaultInput, suggestInput, deriveInput, choiceRequest, choiceToInput } from '../engine/night.js';
import { live, liveOpen, sendCard, cardState, seatOnline, startLive, closeRoom, setLiveSetting, setLocked, releaseSeat } from './live.js';
import { joinUrl, screenUrl, qrSvg } from '../live/client.js';
import {
  nominationsToday, voteThreshold, onTheBlock, nominationWarnings, virginCheck, voteWarnings, slayerCheck,
  postDeathChecks, checkWin, mayorCheck, dawnMessage,
} from '../engine/day.js';
import { msg } from '../engine/text.js';
import { uid } from '../engine/rng.js';

const ui = () => store.lib.settings.uiLang;
let current = null; // aktivt nattsteg, for tastatursnarveier

function phaseLabel(s) {
  if (s.phase.type === 'setup') return t('phaseSetup');
  if (s.phase.type === 'night') return t('night') + ' ' + s.phase.number;
  if (s.phase.type === 'day') return t('day') + ' ' + s.phase.number;
  return t('phaseEnded');
}

function phaseRefLabel(p) {
  if (!p) return '';
  if (p.type === 'setup') return t('phaseSetup');
  if (p.type === 'night') return t('night') + ' ' + p.number;
  if (p.type === 'day') return t('day') + ' ' + p.number;
  return t('phaseEnded');
}

// ——— handlinger ———
function dispatch(ev) {
  store.dispatch(ev);
}

function runPostDeath(killed, aliveBefore, cause) {
  const s = store.state();
  if (!killed.length) return;
  const list = postDeathChecks(s, killed, aliveBefore, cause, ui(), s.style);
  app.pending = [...app.pending.filter((p) => p.type === 'virgin'), ...list];
}

function undo() {
  const ev = store.game && store.game.events[store.game.events.length - 1];
  if (store.undo()) { app.pending = []; toast(t('undone') + (ev && ev.log ? ': ' + ev.log : '')); }
}
function redo() {
  if (store.redo()) { app.pending = []; toast(t('redone')); }
}

function startNight() {
  const s = store.state();
  if (s.phase.type === 'day') {
    const m = mayorCheck(s, ui());
    if (m && !app.pending.some((p) => p.type === 'mayor')) { app.pending = [{ ...m, type: 'mayor' }]; render(); return; }
  }
  app.pending = [];
  dispatch({ type: 'NIGHT_START', log: t('logNightStart') });
  store.setUi({ stepKey: null });
  app.gameTab = 'phase';
}

function startDay(text) {
  dispatch({ type: 'DAY_START', messages: [{ kind: 'public', text }], log: t('logDayStart') });
  const w = checkWin(store.state(), ui());
  app.pending = w ? [w] : [];
  app.gameTab = 'phase';
  app.dayForm = null;
}

function endGame(winner) {
  dispatch({ type: 'GAME_END', winner: winner || null, log: t('logGameEnd') });
  app.pending = [];
  app.modal = null;
  app.gameTab = 'phase';
}

function revealSeats(s, ids) {
  if (!ids.length) return;
  dispatch({ type: 'REVEAL', seatIds: ids, log: t('logRevealed', { list: ids.map((id) => seatName(getSeat(s, id))).join(', ') }) });
}

function hideSeats(s, ids) {
  if (!ids.length) return;
  dispatch({ type: 'HIDE', seatIds: ids, log: t('logHidden') });
}

function announce(s, winner) {
  dispatch({ type: 'ANNOUNCE', winner, messages: winner ? [{ kind: 'public', text: msg(s.lang, s.style, 'gameEnd', { winner }) }] : [], log: winner ? msg(s.lang, s.style, 'gameEnd', { winner }) : t('logUnannounced') });
}

// ——— toppfelt ———
function gameBar(s) {
  const canUndo = store.game.events.length > 0;
  const canRedo = store.game.redo.length > 0;
  let next = null;
  if (s.phase.type === 'setup') next = h('button', { class: 'btn primary', onclick: startNight }, '🌙 ' + t('startNight1'));
  else if (s.phase.type === 'night') next = h('button', { class: 'btn primary', onclick: () => { store.setUi({ stepKey: '__end' }); app.gameTab = 'phase'; render(); } }, '☀️ ' + t('toDawn'));
  else if (s.phase.type === 'day') next = h('button', { class: 'btn primary', onclick: startNight }, '🌙 ' + t('startNightN', { n: s.phase.number + 1 }));
  return h('div', { class: 'game-bar ' + s.phase.type },
    h('div', { class: 'phase-badge' },
      h('span', { class: 'phase-icon', 'aria-hidden': 'true' }, s.phase.type === 'night' ? '🌙' : s.phase.type === 'day' ? '☀️' : s.phase.type === 'ended' ? '🏁' : '✦'),
      h('span', { class: 'phase-name display' }, phaseLabel(s)),
      h('span', { class: 'phase-meta muted' }, [s.meta.className, s.meta.groupName, s.script.name].filter(Boolean).join(' · '))),
    h('div', { class: 'row gap wrap bar-actions' },
      h('button', { class: 'btn', disabled: !canUndo, onclick: undo, title: 'Ctrl+Z' }, '↶ ' + t('undo')),
      h('button', { class: 'btn', disabled: !canRedo, onclick: redo, title: 'Ctrl+Y' }, '↷ ' + t('redo')),
      h('button', { class: 'btn ghost', 'aria-pressed': app.focusMode ? 'true' : 'false', onclick: () => { app.focusMode = !app.focusMode; render(); }, title: 'F' }, app.focusMode ? t('showGrim') : t('focusMode')),
      liveBadge(s),
      h('button', { class: 'btn ghost', onclick: () => openModal(gameMenu) }, '⋯ ' + t('game')),
      next));
}

function gameMenu() {
  const s = store.state();
  return modal({
    title: t('gameSettings'),
    body: h('div', { class: 'stack' },
      h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('messageLanguage')),
        segmented({ value: s.lang, options: [{ value: 'no', label: 'Norsk' }, { value: 'en', label: 'English' }], onChange: (v) => { dispatch({ type: 'SETTINGS', lang: v }); } })),
      h('div', { class: 'stack tight' }, h('span', { class: 'label' }, t('messageStyle')),
        segmented({ value: s.style, options: [{ value: 'short', label: t('styleShort') }, { value: 'flavor', label: t('styleFlavor') }], onChange: (v) => { dispatch({ type: 'SETTINGS', style: v }); } })),
      h('p', { class: 'muted small' }, t('langAppliesNew')),
      h('hr'),
      h('span', { class: 'label' }, t('endGame')),
      h('p', { class: 'muted small' }, t('endGameMenuHelp')),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn primary', onclick: () => endGame(null) }, '🏁 ' + t('endGameReveal'))),
      h('hr'),
      confirmButton({ key: 'abandon', label: t('abandonGame'), confirmLabel: t('abandonConfirm'), onConfirm: () => { if (store.game.live) closeRoom(); store.endGame(false); app.modal = null; navigate('home'); } })),
  });
}

// ——— grimoire ———
function grimView(s, activeIds) {
  const alive = aliveSeats(s).length;
  return grimCircle({
    seats: s.seats,
    cls: s.phase.type,
    token: (seat, i) => roleToken({
      characterId: seat.characterId,
      shownId: seat.shownCharacterId && seat.shownCharacterId !== seat.characterId ? seat.shownCharacterId : null,
      label: seatName(seat),
      index: i,
      dead: !seat.alive,
      ghost: seat.alive ? null : seat.ghostVote,
      active: activeIds.includes(seat.id) || (s.phase.type === 'ended' && (s.revealed || []).includes(seat.id)),
      alignment: seat.alignment,
      reminders: [
        ...seat.reminders,
        ...(compromised(s, seat).poisoned && !seat.reminders.some((r) => r.kind === 'poisoned') ? [{ kind: 'poisoned', label: 'Poisoned' }] : []),
      ],
      sub: s.phase.type === 'ended' ? ((s.revealed || []).includes(seat.id) ? '👁 ' + t('revealedShort') : t('hiddenShort')) : null,
      onClick: s.phase.type === 'ended'
        ? () => ((s.revealed || []).includes(seat.id) ? hideSeats(s, [seat.id]) : revealSeats(s, [seat.id]))
        : () => openModal(() => seatModal(seat.id)),
    }),
    center: s.phase.type === 'ended' ? h('div', { class: 'center-text' },
      h('span', { class: 'display center-phase' }, t('revealTitle')),
      h('span', { class: 'center-stat' }, t('revealedOf', { a: (s.revealed || []).length, n: s.seats.length })),
      s.announced ? h('span', { class: 'center-stat strong' }, s.announced === 'good' ? t('goodWins') : t('evilWins')) : h('span', { class: 'center-stat muted' }, t('notAnnounced'))) : h('div', { class: 'center-text' },
      h('span', { class: 'display center-phase' }, phaseLabel(s)),
      h('span', { class: 'center-stat' }, t('aliveOf', { a: alive, n: s.seats.length })),
      h('span', { class: 'center-stat muted' }, t('votesNeeded', { n: voteThreshold(s) })),
      s.bluffs.length ? h('span', { class: 'center-bluffs' }, h('span', { class: 'label' }, t('bluffs')), s.bluffs.map((id) => h('span', { class: 'chip small' }, charInfo(id).name))) : null),
  });
}

function seatModal(seatId) {
  const s = store.state();
  const seat = getSeat(s, seatId);
  if (!seat) return null;
  const info = charInfo(seat.characterId);
  const comp = compromised(s, seat);
  const apply = (effects, log, cause) => {
    const aliveBefore = aliveSeats(store.state()).length;
    dispatch({ type: 'EFFECTS', effects, log });
    const killed = effects.filter((e) => e.t === 'kill').map((e) => e.seatId);
    if (killed.length) runPostDeath(killed, aliveBefore, cause || 'other');
  };
  const nm = seatName(seat);
  const manualPoison = seat.reminders.find((r) => r.kind === 'poisoned' && !r.sourceSeatId);
  const manualDrunk = seat.reminders.find((r) => r.kind === 'drunk');
  const scriptChars = [...new Set([...s.script.characters, seat.characterId])];
  return modal({
    title: nm,
    body: h('div', { class: 'stack' },
      h('div', { class: 'row gap wrap' },
        h('span', { class: 'display seat-char' }, info.name),
        teamPill(info.team),
        seat.alignment !== (info.team === 'minion' || info.team === 'demon' ? 'evil' : 'good') ? h('span', { class: 'pill warn' }, seat.alignment) : null,
        seat.shownCharacterId && seat.shownCharacterId !== seat.characterId ? h('span', { class: 'muted' }, t('believes') + ': ' + charInfo(seat.shownCharacterId).name) : null,
        h('span', { class: 'pill ' + (seat.alive ? 'ok' : 'dead') }, seat.alive ? t('alive') : t('dead'))),
      comp.any ? h('p', { class: 'warn-text small' }, comp.drunk ? '⚠ ' + t('isDrunkNow') : '⚠ ' + t('isPoisonedNow')) : null,
      h('p', { class: 'muted small' }, info.ability || ''),
      seat.reminders.length ? h('div', { class: 'chips' }, seat.reminders.map((r) => h('span', { class: 'chip rem-chip rem-' + r.kind },
        r.label + (r.sourceSeatId ? ' ← ' + seatName(getSeat(s, r.sourceSeatId)) : ''),
        h('button', { class: 'chip-x', 'aria-label': t('remove') + ' ' + r.label, onclick: () => apply([{ t: 'removeReminder', seatId, reminderId: r.id }], `${nm}: −${r.label}`) }, '×')))) : null,
      h('div', { class: 'action-grid' },
        seat.alive
          ? h('button', { class: 'btn danger', onclick: () => { apply([{ t: 'kill', seatId, cause: 'storyteller' }], t('logKilled', { name: nm })); closeModal(); } }, '☠ ' + t('kill'))
          : h('button', { class: 'btn', onclick: () => apply([{ t: 'revive', seatId }], t('logRevived', { name: nm })) }, '✚ ' + t('revive')),
        manualPoison
          ? h('button', { class: 'btn', onclick: () => apply([{ t: 'removeReminder', seatId, reminderId: manualPoison.id }], `${nm}: −Poisoned`) }, t('unpoison'))
          : h('button', { class: 'btn', onclick: () => apply([{ t: 'addReminder', seatId, reminder: { kind: 'poisoned', label: 'Poisoned', sourceSeatId: null } }], `${nm}: +Poisoned`) }, '☠ ' + t('poison')),
        manualDrunk
          ? h('button', { class: 'btn', onclick: () => apply([{ t: 'removeReminder', seatId, reminderId: manualDrunk.id }], `${nm}: −Drunk`) }, t('undrunk'))
          : h('button', { class: 'btn', onclick: () => apply([{ t: 'addReminder', seatId, reminder: { kind: 'drunk', label: 'Drunk', sourceSeatId: null } }], `${nm}: +Drunk`) }, '🍺 ' + t('markDrunk')),
        !seat.alive ? h('button', { class: 'btn', onclick: () => apply([{ t: 'ghostVote', seatId, value: !seat.ghostVote }], `${nm}: ghost vote`) }, seat.ghostVote ? t('ghostUsed') : t('ghostRestore')) : null,
        seat.reminders.some((r) => r.kind === 'noability')
          ? null
          : h('button', { class: 'btn', onclick: () => apply([{ t: 'addReminder', seatId, reminder: { kind: 'noability', label: 'No ability', sourceSeatId: seatId } }], `${nm}: No ability`) }, t('markNoAbility'))),
      h('div', { class: 'stack tight' },
        h('span', { class: 'label' }, t('changeCharacter')),
        charSelect({ id: 'chg-' + seatId, value: seat.characterId, options: scriptChars, placeholder: false, onChange: (v) => { if (v && v !== seat.characterId) apply([{ t: 'setCharacter', seatId, characterId: v }], `${nm}: ${info.name} → ${charInfo(v).name}`); } })),
      h('form', {
        class: 'inline-form',
        onsubmit: (e) => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value.trim()) { apply([{ t: 'addReminder', seatId, reminder: { kind: 'custom', label: i.value.trim(), sourceSeatId: null } }], `${nm}: +${i.value.trim()}`); } },
      }, h('input', { id: 'rem-' + seatId, class: 'input', placeholder: t('reminderPh'), 'aria-label': t('addReminder') }), h('button', { class: 'btn', type: 'submit' }, t('addReminder')))),
  });
}

// ——— varsler som venter på Storyteller ———
function pendingBanner(s) {
  if (!app.pending.length) return null;
  const drop = (p) => { app.pending = app.pending.filter((x) => x !== p); render(); };
  return h('div', { class: 'pending' }, app.pending.map((p) => h('div', { class: 'pending-item ' + (p.winner || p.type) },
    h('p', { class: 'pending-text' }, p.text),
    h('div', { class: 'row gap wrap' },
      p.type === 'sw' ? [
        h('button', { class: 'btn primary', onclick: () => { dispatch({ type: 'EFFECTS', effects: p.effects, messages: p.messages, log: p.text }); drop(p); } }, t('yesApply')),
        h('button', { class: 'btn ghost', onclick: () => drop(p) }, t('no')),
      ] : null,
      p.type === 'virgin' ? [
        h('button', { class: 'btn primary', onclick: () => {
          const aliveBefore = aliveSeats(store.state()).length;
          dispatch({ type: 'EXECUTE', sk: 'exec:' + s.phase.number, seatId: p.nominatorId, messages: [{ kind: 'public', text: msg(s.lang, s.style, 'virginTrigger', { a: seatName(getSeat(s, p.nominatorId)) }) }], log: p.text });
          drop(p);
          runPostDeath([p.nominatorId], aliveBefore, 'execution');
          render();
        } }, t('executeNow')),
        h('button', { class: 'btn ghost', onclick: () => drop(p) }, t('no')),
      ] : null,
      p.type === 'win' || p.type === 'mayor' ? [
        h('button', { class: 'btn ' + (p.winner === 'good' ? 'good' : 'evil'), onclick: () => endGame(p.winner) }, '🏁 ' + t('endGameReveal')),
        p.type === 'mayor'
          ? h('button', { class: 'btn ghost', onclick: () => { app.pending = []; dispatch({ type: 'NIGHT_START', log: t('logNightStart') }); store.setUi({ stepKey: null }); } }, t('continueNight'))
          : h('button', { class: 'btn ghost', onclick: () => drop(p) }, t('notNow')),
      ] : null))));
}

// ——— natt ———
function stepDraft(s, step) {
  const comp = step.seatId ? compromised(s, getSeat(s, step.seatId)) : { any: false };
  const compKey = JSON.stringify(comp);
  let d = app.stepDrafts[step.key];
  const saved = s.progress[step.key] && s.progress[step.key].input;
  const untouched = d && !Object.keys(d.touched).length && !Object.keys(d.edits).length;
  if (!d || (untouched && !saved && d.compKey !== compKey)) {
    let input = saved ? { ...saved } : defaultInput(s, step);
    input = deriveInput(s, step, input, {});
    d = { input, touched: saved ? Object.fromEntries(Object.keys(saved).map((k) => [k, true])) : {}, edits: {}, editing: {}, compKey, respAt: saved ? Date.now() : 0 };
    app.stepDrafts[step.key] = d;
  }
  const l = store.game.live;
  const resp = l && l.responses['choice:' + step.key];
  if (resp && resp.at > (d.respAt || 0)) {
    const patch = choiceToInput(step, resp.choice);
    d.input = { ...d.input, ...patch };
    d.touched = { ...d.touched, ...Object.fromEntries(Object.keys(patch).map((k) => [k, true])) };
    d.input = deriveInput(s, step, d.input, d.touched);
    d.edits = {};
    d.respAt = resp.at;
  }
  return d;
}

function claimed(seatId) {
  return (live.claimed[seatId] || 0) > 0;
}

function sendStepMessages(step, messages) {
  let n = 0;
  messages.forEach((m, i) => {
    const id = `step:${step.key}#${i}`;
    if (m.seatId && claimed(m.seatId) && !cardState(id) && sendCard(m.seatId, { id, kind: 'info', text: m.text })) n++;
  });
  return n;
}

function requestChoice(s, step) {
  const req = choiceRequest(s, step);
  if (!req || !claimed(req.seatId)) return false;
  return sendCard(req.seatId, req.card);
}

function requestAllChoices(s, q) {
  let n = 0;
  for (const step of q) {
    if (step.status !== 'pending') continue;
    const req = choiceRequest(s, step);
    if (!req || cardState(req.cardId)) continue;
    if (requestChoice(s, step)) n++;
  }
  toast(n ? t('choicesRequested', { n }) : t('choicesNone'));
}

function currentStep(q) {
  const key = store.game.ui.stepKey;
  if (key === '__end') return null;
  return q.find((x) => x.key === key) || q.find((x) => x.status === 'pending') || null;
}

function selectStep(key) {
  store.setUi({ stepKey: key });
  render();
}

function nextAfter(q, step) {
  const later = q.filter((x) => x.index > step.index && x.status === 'pending');
  if (later.length) return later[0].key;
  const any = q.find((x) => x.status === 'pending' && x.key !== step.key);
  return any ? any.key : '__end';
}

function completeStep(s, step, d, q) {
  const r = resolveStep(s, step, d.input, s.lang, s.style);
  if (r.incomplete) { toast(t('incomplete'), 'warn'); return; }
  const messages = r.messages.map((m, i) => ({ ...m, text: d.edits[i] !== undefined ? d.edits[i] : m.text }));
  const aliveBefore = aliveSeats(s).length;
  if (liveOpen()) { const sent = sendStepMessages(step, messages); if (sent) toast(t('sentN', { n: sent })); }
  const nm = step.seatId ? seatName(getSeat(s, step.seatId)) : '';
  const summary = messages[0] ? messages[0].text.replace(/\n/g, ' ') : r.effects.length ? stepModel(s, step, d.input, ui(), q).effects.join(', ') : '';
  dispatch({
    type: 'STEP', sk: 'step:' + step.key, key: step.key, status: 'done', input: d.input, effects: r.effects, messages, phase: s.phase,
    log: `${charInfo(step.characterId).name}${nm ? ' (' + nm + ')' : ''}: ${summary}`.slice(0, 220),
  });
  const killed = r.effects.filter((e) => e.t === 'kill').map((e) => e.seatId);
  if (killed.length) runPostDeath(killed, aliveBefore, (r.effects.find((e) => e.t === 'kill') || {}).cause || 'demon');
  const q2 = nightQueue(store.state());
  const cur = q2.find((x) => x.key === step.key) || step;
  store.setUi({ stepKey: nextAfter(q2, cur) });
}

function skipStep(s, step) {
  dispatch({ type: 'STEP', sk: 'step:' + step.key, key: step.key, status: 'skipped', phase: s.phase, log: `${charInfo(step.characterId).name}: ${t('skipped')}` });
  store.setUi({ stepKey: nextAfter(nightQueue(store.state()), step) });
}

function reopenStep(s, step) {
  dispatch({ type: 'STEP', sk: 'step:' + step.key, key: step.key, status: 'pending', phase: s.phase, log: `${charInfo(step.characterId).name}: ${t('reopened')}` });
  store.setUi({ stepKey: step.key });
}

function field(s, step, d, f) {
  const set = (v) => {
    d.input = { ...d.input, [f.name]: v };
    d.touched = { ...d.touched, [f.name]: true };
    d.input = deriveInput(s, step, d.input, d.touched);
    d.edits = {};
    render();
  };
  const id = `f-${step.key}-${f.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  let control;
  if (f.type === 'player') control = playerSelect({ id, s, value: d.input[f.name], onChange: set, filter: f.filter || null });
  else if (f.type === 'character') control = charSelect({ id, value: d.input[f.name], options: f.options, onChange: set, none: f.none });
  else if (f.type === 'number') {
    const v = d.input[f.name];
    control = h('div', { class: 'stepper-num', role: 'group', 'aria-label': f.label },
      Array.from({ length: Math.min(f.max, 8) - f.min + 1 }, (_, i) => f.min + i).map((n) => h('button', {
        type: 'button', class: 'num-btn' + (v === n ? ' active' : ''), 'aria-pressed': v === n ? 'true' : 'false', onclick: () => set(n),
      }, String(n))));
  } else if (f.type === 'yesno') {
    const v = d.input[f.name];
    control = h('div', { class: 'segmented' },
      h('button', { type: 'button', class: 'seg yes' + (v === true ? ' active' : ''), onclick: () => set(true) }, t('yes')),
      h('button', { type: 'button', class: 'seg no' + (v === false ? ' active' : ''), onclick: () => set(false) }, t('no')));
  } else if (f.type === 'choice') {
    control = h('div', { class: 'choice-list' }, f.options.map((o) => h('button', {
      type: 'button', class: 'choice' + (d.input[f.name] === o.value ? ' active' : ''), onclick: () => set(o.value),
    }, o.label)));
  } else if (f.type === 'toggle') {
    control = h('label', { class: 'check' }, h('input', { id, type: 'checkbox', checked: !!d.input[f.name], onchange: (e) => set(e.target.checked) }), f.label);
    return h('div', { class: 'field' }, control);
  } else if (f.type === 'bluffs') {
    const b = d.input.bluffs || [];
    control = h('div', { class: 'row gap wrap' }, [0, 1, 2].map((i) => charSelect({ id: id + i, value: b[i] || null, options: f.options, onChange: (v) => { const nb = [...b]; nb[i] = v; set(nb); } })));
  } else if (f.type === 'text') {
    control = h('textarea', { id, class: 'textarea', rows: 3, value: d.input[f.name] || '', oninput: (e) => { d.input = { ...d.input, [f.name]: e.target.value }; d.touched[f.name] = true; }, onchange: () => render() });
  }
  return h('div', { class: 'field' }, h('label', { class: 'label', for: id }, f.label), control);
}

function messagePreview(s, step, d, model, r) {
  if (!r.messages.length) return null;
  return h('div', { class: 'stack tight' }, r.messages.map((m, i) => {
    const text = d.edits[i] !== undefined ? d.edits[i] : m.text;
    const to = m.seatId ? seatName(getSeat(s, m.seatId)) : t('everyone');
    const msgId = `step:${step.key}#${i}`;
    const copied = store.game.copied[msgId];
    const editing = d.editing[i];
    const cs = cardState(msgId);
    const canSend = liveOpen() && m.seatId && claimed(m.seatId);
    return h('div', { class: 'msg-card kind-' + (m.kind || 'private') + (copied || cs ? ' copied' : '') },
      h('div', { class: 'msg-head' },
        h('span', { class: 'msg-to' }, t('messageTo') + ' ' + to),
        r.messages.length === 1 && model.truth !== null && model.isInfo ? h('span', { class: 'pill ' + (model.truth ? 'ok' : 'warn') }, model.truth ? '✓ ' + t('trueInfo') : '⚠ ' + t('falseInfo')) : null,
        cs ? statusPill(cs) : null,
        copied ? h('span', { class: 'pill ok' }, '✓ ' + t('copiedShort')) : null),
      editing
        ? h('textarea', { id: 'edit-' + msgId.replace(/[^a-zA-Z0-9]/g, '_'), class: 'textarea', rows: 3, value: text, oninput: (e) => { d.edits[i] = e.target.value; } })
        : h('p', { class: 'msg-text' }, text),
      h('div', { class: 'row gap wrap' },
        canSend ? h('button', { class: 'btn primary', onclick: () => { if (sendCard(m.seatId, { id: msgId, kind: 'info', text: d.edits[i] !== undefined ? d.edits[i] : m.text })) toast(t('sentN', { n: 1 })); } }, cs ? '📨 ' + t('resend') : '📨 ' + t('send')) : null,
        copyButton(() => (d.edits[i] !== undefined ? d.edits[i] : m.text), { id: i === 0 ? 'copy-current' : undefined, label: t('copy') + (i === 0 ? ' (C)' : ''), cls: canSend ? '' : 'primary', onCopied: () => store.markCopied(msgId) }),
        h('button', { class: 'btn ghost', onclick: () => { d.editing[i] = !editing; if (editing && d.edits[i] === m.text) delete d.edits[i]; render(); } }, editing ? t('done') : '✎ ' + t('edit')),
        d.edits[i] !== undefined && !editing ? h('button', { class: 'btn ghost', onclick: () => { delete d.edits[i]; render(); } }, t('resetText')) : null));
  }));
}

function stepCard(s, step, q) {
  const d = stepDraft(s, step);
  const model = stepModel(s, step, d.input, ui(), q);
  const r = resolveStep(s, step, d.input, s.lang, s.style);
  const seat = step.seatId ? getSeat(s, step.seatId) : null;
  const info = charInfo(step.characterId);
  current = { s, step, d, q };
  const done = step.status === 'done';
  const skipped = step.status === 'skipped' || step.status === 'auto';
  const pos = q.indexOf(step) + 1;
  const canSuggest = model.isInfo && !['minioninfo', 'demoninfo', 'grimoire', 'manual'].includes(step.kind);
  const team = step.characterId === 'minioninfo' ? 'minion' : step.characterId === 'demoninfo' ? 'demon' : info.team;
  return h('article', { class: 'step-card team-' + team + (done ? ' is-done' : '') + (skipped ? ' is-skipped' : '') },
    h('div', { class: 'step-top' },
      h('span', { class: 'eyebrow' }, `${phaseLabel(s)} · ${pos} / ${q.length}`),
      done ? h('span', { class: 'pill ok' }, '✓ ' + t('completed')) : skipped ? h('span', { class: 'pill muted-pill' }, step.status === 'auto' ? t('autoSkipped') : t('skipped')) : null),
    h('h2', { class: 'step-role display' }, model.title),
    h('p', { class: 'step-player' }, model.seatName || ''),
    seat && !seat.alive ? h('p', { class: 'small muted' }, '† ' + t('deadPlayer')) : null,
    model.instruction ? h('p', { class: 'step-instruction' }, model.instruction) : null,
    model.warnings.length ? h('div', { class: 'callout warn' }, model.warnings.map((w) => h('p', null, w))) : null,
    model.hints.length ? h('ul', { class: 'hints' }, model.hints.map((x) => h('li', null, x))) : null,
    canSuggest ? h('div', { class: 'row gap wrap' },
      h('button', { class: 'btn small', onclick: () => { d.input = deriveInput(s, step, suggestInput(s, step, false), {}); d.touched = {}; d.edits = {}; render(); } }, t('useTrue')),
      h('button', { class: 'btn small', onclick: () => { d.input = deriveInput(s, step, suggestInput(s, step, true), {}); d.touched = {}; d.edits = {}; render(); } }, t('useFalse'))) : null,
    choiceBox(s, step),
    model.fields.length ? h('div', { class: 'fields' }, model.fields.map((f) => field(s, step, d, f))) : null,
    model.effects.length ? h('ul', { class: 'effects' }, model.effects.map((x) => h('li', null, '→ ' + x))) : null,
    messagePreview(s, step, d, model, r),
    h('div', { class: 'step-actions' },
      h('button', { class: 'btn ghost', disabled: pos <= 1, onclick: () => selectStep(q[pos - 2].key), title: '←' }, '← ' + t('previous')),
      done || step.status === 'skipped'
        ? h('button', { class: 'btn ghost', onclick: () => reopenStep(s, step) }, t('reopen'))
        : h('button', { class: 'btn ghost', onclick: () => skipStep(s, step) }, t('skip')),
      h('button', { id: 'complete-step', class: 'btn primary big', onclick: () => completeStep(s, step, d, q), title: 'Enter' },
        done ? t('updateStep') : (liveOpen() && r.messages.some((m, i) => m.seatId && claimed(m.seatId) && !cardState(`step:${step.key}#${i}`)) ? '📨 ' + t('sendAndComplete') : '✓ ' + t('complete')) + ' (Enter)'),
      pos < q.length ? h('button', { class: 'btn ghost', onclick: () => selectStep(q[pos].key), title: '→' }, t('nextStep') + ' →') : null));
}

function rail(s, q, cur) {
  return h('ol', { class: 'rail', 'data-keep-scroll': 'rail' },
    q.map((x) => h('li', null, h('button', {
      class: `rail-item st-${x.status}${cur && cur.key === x.key ? ' current' : ''} team-${x.characterId === 'minioninfo' ? 'minion' : x.characterId === 'demoninfo' ? 'demon' : charInfo(x.characterId).team}`,
      onclick: () => selectStep(x.key),
    },
    h('span', { class: 'rail-icon', 'aria-hidden': 'true' }, x.status === 'done' ? '✓' : x.status === 'pending' ? (cardState('choice:' + x.key) === 'answered' ? '✉' : cardState('choice:' + x.key) ? '⏳' : '○') : '–'),
    h('span', { class: 'rail-name' }, x.characterId === 'minioninfo' ? t('minionInfo') : x.characterId === 'demoninfo' ? t('demonInfo') : charInfo(x.characterId).name),
    x.seatId ? h('span', { class: 'rail-player' }, seatName(getSeat(s, x.seatId))) : null))),
    h('li', null, h('button', { class: 'rail-item end' + (!cur ? ' current' : ''), onclick: () => selectStep('__end') }, h('span', { class: 'rail-icon' }, '☀'), h('span', { class: 'rail-name' }, t('dawn')))));
}

function dawnCard(s, q) {
  const pending = q.filter((x) => x.status === 'pending');
  const dm = dawnMessage(s, s.lang, s.style);
  if (app.dawnText === undefined || app.dawnFor !== s.phase.number + ':' + dm.text) { app.dawnText = dm.text; app.dawnFor = s.phase.number + ':' + dm.text; }
  const died = s.deaths.filter((x) => x.phase.type === 'night' && x.phase.number === s.phase.number && !x.revived);
  return h('article', { class: 'step-card dawn' },
    h('span', { class: 'eyebrow' }, phaseLabel(s)),
    h('h2', { class: 'step-role display' }, t('dawn')),
    pending.length ? h('div', { class: 'callout warn' }, h('p', null, t('pendingSteps', { n: pending.length })), h('div', { class: 'chips' }, pending.map((x) => h('button', { class: 'chip', onclick: () => selectStep(x.key) }, charInfo(x.characterId).name || x.characterId)))) : h('p', { class: 'ok-text' }, '✓ ' + t('allStepsDone')),
    h('p', { class: 'step-instruction' }, died.length ? t('diedTonight') + ': ' + died.map((x) => seatName(getSeat(s, x.seatId))).join(', ') : t('nobodyDied')),
    h('div', { class: 'msg-card kind-public' },
      h('div', { class: 'msg-head' }, h('span', { class: 'msg-to' }, t('publicSayAloud'))),
      h('textarea', { id: 'dawn-text', class: 'textarea', rows: 2, value: app.dawnText, oninput: (e) => { app.dawnText = e.target.value; } }),
      h('div', { class: 'row gap' }, copyButton(() => app.dawnText, { label: t('copy') }))),
    h('div', { class: 'step-actions' },
      q.length ? h('button', { class: 'btn ghost', onclick: () => selectStep(q[q.length - 1].key) }, '← ' + t('previous')) : null,
      h('button', { class: 'btn primary big', onclick: () => startDay(app.dawnText) }, '☀️ ' + t('startDayN', { n: s.phase.number }))));
}

function nightPanel(s) {
  const q = nightQueue(s);
  const cur = currentStep(q);
  current = null;
  const askable = liveOpen() ? q.filter((x) => x.status === 'pending' && choiceRequest(s, x) && !cardState('choice:' + x.key) && claimed(x.seatId)).length : 0;
  return h('div', { class: 'night-panel' },
    askable ? h('div', { class: 'row between wrap live-ask' },
      h('span', { class: 'small muted' }, t('askAllHelp', { n: askable })),
      h('button', { class: 'btn primary', onclick: () => requestAllChoices(s, q) }, '📨 ' + t('askAll'))) : null,
    rail(s, q, cur),
    cur ? stepCard(s, cur, q) : dawnCard(s, q));
}

function setupPanel(s) {
  const cards = s.messages.filter((m) => m.tag === 'roleCard');
  const copiedN = cards.filter((m) => store.game.copied[m.id]).length;
  return h('div', { class: 'stack' },
    h('div', { class: 'step-card' },
      h('span', { class: 'eyebrow' }, t('phaseSetup')),
      h('h2', { class: 'step-role display' }, t('roleCards')),
      h('p', { class: 'step-instruction' }, liveOpen() ? t('roleCardsLive') : t('roleCardsHelp')),
      h('p', { class: 'small muted' }, t('copiedOf', { a: copiedN, n: cards.length })),
      h('div', { class: 'step-actions' }, h('button', { class: 'btn primary big', onclick: startNight }, '🌙 ' + t('startNight1')))),
    h('div', { class: 'msg-list' }, cards.map((m) => messageCard(s, m))));
}

// ——— dag ———
function timer() {
  const tm = app.timer;
  const left = tm ? Math.max(0, Math.round((tm.end - Date.now()) / 1000)) : 0;
  const fmt = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  const start = (sec) => {
    clearInterval(app.timerInt);
    app.timer = { end: Date.now() + sec * 1000 };
    app.timerInt = setInterval(() => {
      const el = document.getElementById('timer-left');
      const l = Math.max(0, Math.round((app.timer.end - Date.now()) / 1000));
      if (el) el.textContent = fmt(l);
      if (l <= 0) { clearInterval(app.timerInt); app.timer = null; toast(t('timeUp'), 'warn'); render(); }
    }, 500);
    render();
  };
  return h('div', { class: 'timer row gap wrap' },
    h('span', { class: 'label' }, t('timer')),
    h('span', { id: 'timer-left', class: 'timer-left' + (tm ? ' running' : '') }, tm ? fmt(left) : '–:––'),
    [1, 2, 3, 5].map((m) => h('button', { class: 'btn small', onclick: () => start(m * 60) }, m + ' min')),
    tm ? h('button', { class: 'btn small ghost', onclick: () => { clearInterval(app.timerInt); app.timer = null; render(); } }, t('stop')) : null);
}

function dayPanel(s) {
  const lang = ui();
  const df = app.dayForm || (app.dayForm = { nominator: null, nominee: null, slayer: null, slayTarget: null, execTarget: undefined, changingExec: false });
  const noms = nominationsToday(s);
  const block = onTheBlock(s);
  const need = voteThreshold(s);
  const dawn = s.messages.filter((m) => m.kind === 'public' && m.phase.type === 'day' && m.phase.number === s.phase.number);
  const execToday = s.executions.filter((e) => e.day === s.phase.number).slice(-1)[0];
  const nw = nominationWarnings(s, df.nominator, df.nominee, lang);
  const slayers = s.seats.filter((x) => x.characterId === 'slayer' || (x.shownCharacterId === 'slayer'));

  const nominate = () => {
    if (!df.nominator || !df.nominee) return;
    const vc = virginCheck(s, df.nominator, df.nominee, lang);
    const id = uid('n_');
    dispatch({ type: 'NOMINATE', nominationId: id, nominatorId: df.nominator, nomineeId: df.nominee, effects: vc ? vc.effects : [], log: `${seatName(getSeat(s, df.nominator))} → ${seatName(getSeat(s, df.nominee))}` });
    if (vc && (vc.trigger || vc.maybe)) app.pending.push({ type: 'virgin', text: vc.text, nominatorId: df.nominator });
    df.nominator = null; df.nominee = null;
    render();
  };
  const toggleVoter = (nom, seatId) => {
    const voters = nom.voters.includes(seatId) ? nom.voters.filter((x) => x !== seatId) : [...nom.voters, seatId];
    dispatch({ type: 'VOTE', sk: 'vote:' + nom.id, nominationId: nom.id, voters, log: `${t('votes')}: ${seatName(getSeat(s, nom.nomineeId))} ${voters.length}` });
  };
  const execute = (seatId) => {
    const aliveBefore = aliveSeats(s).length;
    const target = seatId ? getSeat(s, seatId) : null;
    const text = !target ? msg(s.lang, s.style, 'noExecution') : target.alive ? msg(s.lang, s.style, 'executed', { a: seatName(target) }) : msg(s.lang, s.style, 'executedNoDeath', { a: seatName(target) });
    dispatch({ type: 'EXECUTE', sk: 'exec:' + s.phase.number, seatId: seatId || null, messages: [{ kind: 'public', text }], log: text });
    df.changingExec = false;
    if (target && target.alive) runPostDeath([seatId], aliveBefore, 'execution');
    render();
  };
  const execDefault = df.execTarget !== undefined ? df.execTarget : block.nomination ? block.nomination.nomineeId : null;
  const sc = df.slayer && df.slayTarget ? slayerCheck(s, df.slayer, df.slayTarget, lang) : null;
  const shoot = (hit) => {
    const aliveBefore = aliveSeats(s).length;
    const target = getSeat(s, df.slayTarget);
    const effects = [...sc.effects, ...(hit ? [{ t: 'kill', seatId: target.id, cause: 'slayer' }] : [])];
    dispatch({ type: 'EFFECTS', effects, messages: [{ kind: 'public', text: hit ? msg(s.lang, s.style, 'slayerHit', { a: seatName(target) }) : msg(s.lang, s.style, 'slayerMiss') }], log: `Slayer → ${seatName(target)}: ${hit ? '☠' : '–'}` });
    if (hit) runPostDeath([target.id], aliveBefore, 'slayer');
    df.slayTarget = null;
    render();
  };

  return h('div', { class: 'stack day-panel' },
    dawn.length ? h('div', { class: 'stack tight' }, dawn.map((m) => messageCard(s, m))) : null,
    timer(),
    h('section', { class: 'panel' },
      h('div', { class: 'row between wrap' },
        h('h3', { class: 'section-title' }, t('nominations')),
        h('span', { class: 'muted small' }, t('votesNeeded', { n: need }))),
      h('div', { class: 'row gap wrap nominate-form' },
        playerSelect({ id: 'nom-by', s, value: df.nominator, filter: 'alive', onChange: (v) => { df.nominator = v; render(); } }),
        h('span', { class: 'muted' }, '→'),
        playerSelect({ id: 'nom-who', s, value: df.nominee, onChange: (v) => { df.nominee = v; render(); } }),
        h('button', { class: 'btn primary', disabled: !df.nominator || !df.nominee, onclick: nominate }, t('nominate'))),
      nw.length ? h('div', { class: 'small warn-text' }, nw.map((w) => h('p', null, w))) : null,
      noms.length ? h('ul', { class: 'nom-list' }, noms.map((nom) => {
        const isBlock = block.nomination && block.nomination.id === nom.id;
        const vw = voteWarnings(s, nom.voters, lang);
        return h('li', { class: 'nom' + (isBlock ? ' on-block' : '') },
          h('div', { class: 'row between wrap' },
            h('span', { class: 'strong' }, `${seatName(getSeat(s, nom.nominatorId))} → ${seatName(getSeat(s, nom.nomineeId))}`),
            h('span', { class: 'row gap' },
              h('span', { class: 'vote-count' + (nom.votes >= need ? ' enough' : '') }, `${nom.votes} / ${need}`),
              isBlock ? h('span', { class: 'pill warn' }, t('onTheBlock')) : null,
              confirmButton({ key: 'delnom' + nom.id, label: '✕', confirmLabel: t('delete'), cls: 'btn danger small', onConfirm: () => dispatch({ type: 'NOMINATION_REMOVE', nominationId: nom.id, log: t('nominationRemoved') }) }))),
          h('div', { class: 'voters' }, s.seats.map((x) => {
            const on = nom.voters.includes(x.id);
            const cant = !x.alive && !x.ghostVote && !on;
            return h('button', {
              class: 'voter' + (on ? ' on' : '') + (x.alive ? '' : ' dead') + (cant ? ' cant' : ''), 'aria-pressed': on ? 'true' : 'false',
              onclick: () => toggleVoter(nom, x.id), title: x.alive ? '' : x.ghostVote ? 'Ghost vote' : t('ghostSpent'),
            }, seatName(x) + (x.alive ? '' : x.ghostVote || on ? ' ●' : ' ○'));
          })),
          vw.length ? h('div', { class: 'small warn-text' }, vw.map((w) => h('p', null, w))) : null);
      })) : h('p', { class: 'muted small' }, t('noNominations')),
      block.tie ? h('p', { class: 'small warn-text' }, t('tieNoExecution')) : null),
    h('section', { class: 'panel' },
      h('h3', { class: 'section-title' }, t('execution')),
      execToday && !df.changingExec
        ? h('div', { class: 'row between wrap' },
          h('p', { class: 'strong' }, execToday.seatId ? '⚖️ ' + seatName(getSeat(s, execToday.seatId)) + (execToday.died ? ' †' : '') : t('noExecutionToday')),
          h('button', { class: 'btn ghost', onclick: () => { df.changingExec = true; render(); } }, t('change')))
        : h('div', { class: 'row gap wrap' },
          playerSelect({ id: 'exec-who', s, value: execDefault, onChange: (v) => { df.execTarget = v; render(); } }),
          h('button', { class: 'btn danger', disabled: !execDefault, onclick: () => execute(execDefault) }, '⚖️ ' + t('execute')),
          h('button', { class: 'btn ghost', onclick: () => execute(null) }, t('noExecution')))),
    h('section', { class: 'panel' },
      h('h3', { class: 'section-title' }, t('dayAbilities')),
      h('div', { class: 'row gap wrap' },
        h('span', { class: 'label' }, 'Slayer'),
        playerSelect({ id: 'slayer-by', s, value: df.slayer || (slayers[0] && slayers[0].id) || null, onChange: (v) => { df.slayer = v; render(); } }),
        h('span', { class: 'muted' }, '→'),
        playerSelect({ id: 'slayer-at', s, value: df.slayTarget, filter: 'alive', onChange: (v) => { if (!df.slayer && slayers[0]) df.slayer = slayers[0].id; df.slayTarget = v; render(); } })),
      sc ? h('div', { class: 'callout' },
        h('p', null, sc.text),
        h('div', { class: 'row gap wrap' },
          sc.hit || sc.maybe ? h('button', { class: 'btn danger', onclick: () => shoot(true) }, t('targetDies')) : null,
          !sc.hit ? h('button', { class: 'btn', onclick: () => shoot(false) }, t('nothingHappens')) : null)) : null,
      h('p', { class: 'muted small' }, t('dayAbilitiesHelp'))),
    h('div', { class: 'step-actions' }, h('button', { class: 'btn primary big', onclick: startNight }, '🌙 ' + t('startNightN', { n: s.phase.number + 1 }))));
}

// ——— slutt ———
function endPanel(s) {
  const rev = new Set(s.revealed || []);
  const hidden = s.seats.filter((x) => !rev.has(x.id));
  const next = hidden[0];
  const suggested = s.winner && !s.announced ? s.winner : null;
  return h('div', { class: 'stack' },
    h('div', { class: 'step-card end ' + (s.announced || '') },
      h('span', { class: 'eyebrow' }, t('phaseEnded')),
      h('h2', { class: 'step-role display' }, t('revealTitle')),
      h('p', { class: 'step-instruction' }, liveOpen() ? t('revealLiveHelp') : t('revealHelp')),
      h('div', { class: 'reveal-controls' },
        next ? h('button', { id: 'reveal-next', class: 'btn primary big', onclick: () => revealSeats(s, [next.id]) }, '👁 ' + t('revealNext', { name: seatName(next) })) : null,
        hidden.length ? h('button', { class: 'btn', onclick: () => revealSeats(s, hidden.map((x) => x.id)) }, t('revealAll')) : null,
        rev.size ? h('button', { class: 'btn ghost', onclick: () => hideSeats(s, [...rev]) }, t('hideAll')) : null,
        h('span', { class: 'muted small' }, t('revealedOf', { a: rev.size, n: s.seats.length }))),
      h('div', { class: 'stack tight' },
        h('span', { class: 'label' }, t('announceWinner')),
        h('div', { class: 'row gap wrap announce-row' },
          h('button', { class: 'btn good' + (s.announced === 'good' ? ' active' : ''), onclick: () => announce(s, 'good') }, '🏆 ' + t('goodWins')),
          h('button', { class: 'btn evil' + (s.announced === 'evil' ? ' active' : ''), onclick: () => announce(s, 'evil') }, '🏆 ' + t('evilWins')),
          s.announced ? h('button', { class: 'btn ghost', onclick: () => announce(s, null) }, t('unannounce')) : null),
        suggested ? h('p', { class: 'muted small' }, t('suggestedWinner', { team: t(suggested === 'good' ? 'teamGood' : 'teamEvil') })) : null),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t('player')), h('th', null, t('character')), h('th', null, t('team')), h('th', null, ''), h('th', { class: 'right' }, ''))),
        h('tbody', null, s.seats.map((x, i) => h('tr', { class: x.alive ? '' : 'is-dead' },
          h('td', { class: 'num' }, String(i + 1)),
          h('td', { class: 'strong' }, seatName(x)),
          h('td', null, charInfo(x.characterId).name, x.shownCharacterId && x.shownCharacterId !== x.characterId ? h('span', { class: 'muted small' }, ` (${charInfo(x.shownCharacterId).name})`) : null),
          h('td', null, teamPill(charInfo(x.characterId).team)),
          h('td', null, x.alive ? '' : '†'),
          h('td', { class: 'right' }, rev.has(x.id)
            ? h('button', { class: 'btn small ghost', onclick: () => hideSeats(s, [x.id]) }, t('hide'))
            : h('button', { class: 'btn small', onclick: () => revealSeats(s, [x.id]) }, '👁 ' + t('reveal')))))))),
      h('div', { class: 'row gap wrap' },
        copyButton(() => s.seats.map((x, i) => `${i + 1}. ${seatName(x)} – ${charInfo(x.characterId).name}${x.alive ? '' : ' †'}`).join('\n'), { label: t('copyReveal') })),
      h('div', { class: 'step-actions' },
        h('button', { class: 'btn ghost', onclick: undo }, '↶ ' + t('undo')),
        confirmButton({ key: 'closenosave', label: t('closeNoSave'), onConfirm: () => { if (store.game.live) closeRoom(); store.endGame(false); navigate('home'); }, cls: 'btn ghost' }),
        h('button', { class: 'btn primary', onclick: () => { if (store.game.live) closeRoom(); store.endGame(true); navigate(store.lib.settings.historyEnabled ? 'history' : 'home'); toast(t('gameSaved')); } }, store.lib.settings.historyEnabled ? t('saveAndClose') : t('closeGame')))));
}

// ——— meldinger, notater, logg ———
function messageCard(s, m) {
  const copied = store.game.copied[m.id];
  const to = m.seatId ? seatName(getSeat(s, m.seatId)) : m.kind === 'public' ? t('publicSayAloud') : t('everyone');
  const editKey = 'medit-' + m.id;
  const editing = app.editingMsg === m.id;
  const cs = cardState(m.id);
  const canSend = liveOpen() && m.seatId && m.kind === 'private' && m.tag !== 'roleCard' && claimed(m.seatId);
  return h('div', { class: 'msg-card kind-' + (m.kind || 'private') + (copied || cs ? ' copied' : '') },
    h('div', { class: 'msg-head' },
      h('span', { class: 'msg-to' }, (m.kind === 'public' ? '📣 ' : '') + to),
      h('span', { class: 'muted small' }, phaseRefLabel(m.phase)),
      cs ? statusPill(cs) : null,
      m.tag === 'roleCard' && liveOpen() && claimed(m.seatId) ? h('span', { class: 'pill ok' }, '📱 ' + t('inApp')) : null,
      copied ? h('span', { class: 'pill ok' }, '✓ ' + t('copiedShort')) : null),
    editing
      ? h('textarea', { id: editKey.replace(/[^a-zA-Z0-9_-]/g, '_'), class: 'textarea', rows: 3, value: app.editingText, oninput: (e) => { app.editingText = e.target.value; } })
      : h('p', { class: 'msg-text' }, m.text),
    h('div', { class: 'row gap' },
      editing
        ? [h('button', { class: 'btn primary', onclick: () => { dispatch({ type: 'MESSAGE_EDIT', messageId: m.id, text: app.editingText, log: t('messageEdited') }); app.editingMsg = null; } }, t('save')),
          h('button', { class: 'btn ghost', onclick: () => { app.editingMsg = null; render(); } }, t('cancel'))]
        : [canSend ? h('button', { class: 'btn primary', onclick: () => { if (sendCard(m.seatId, { id: m.id, kind: 'info', text: m.text })) toast(t('sentN', { n: 1 })); } }, cs ? '📨 ' + t('resend') : '📨 ' + t('send')) : null,
          copyButton(m.text, { cls: copied || canSend ? '' : 'primary', onCopied: () => store.markCopied(m.id) }),
          h('button', { class: 'btn ghost', onclick: () => { app.editingMsg = m.id; app.editingText = m.text; render(); } }, '✎ ' + t('edit'))]));
}

function messagesPanel(s) {
  const f = app.msgFilter || 'all';
  let list = s.messages.slice().reverse();
  if (f === 'uncopied') list = list.filter((m) => !store.game.copied[m.id]);
  if (f === 'public') list = list.filter((m) => m.kind === 'public');
  return h('div', { class: 'stack' },
    segmented({ value: f, options: [{ value: 'all', label: t('all') }, { value: 'uncopied', label: t('notCopied') }, { value: 'public', label: t('public') }], onChange: (v) => { app.msgFilter = v; render(); } }),
    list.length ? h('div', { class: 'msg-list' }, list.map((m) => messageCard(s, m))) : emptyState(t('noMessages')));
}

function notesPanel(s) {
  const add = () => {
    const el = document.getElementById('note-input');
    const v = el && el.value.trim();
    if (!v) return;
    dispatch({ type: 'NOTE', noteId: uid('note_'), text: v, ts: Date.now(), log: t('noteAdded') });
    app.noteDraft = '';
  };
  return h('div', { class: 'stack' },
    h('div', { class: 'stack tight' },
      h('textarea', {
        id: 'note-input', class: 'textarea', rows: 3, placeholder: t('notePh'), value: app.noteDraft || '',
        oninput: (e) => { app.noteDraft = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } },
      }),
      h('div', { class: 'row between' }, h('span', { class: 'muted small' }, 'Ctrl+Enter'), h('button', { class: 'btn primary', onclick: add }, t('addNote')))),
    s.notes.length ? h('ul', { class: 'note-list' }, s.notes.slice().reverse().map((n) => h('li', { class: 'note' },
      h('span', { class: 'muted small' }, phaseRefLabel(n.phase)),
      h('p', null, n.text),
      h('button', { class: 'icon-btn', 'aria-label': t('delete'), onclick: () => dispatch({ type: 'NOTE_DELETE', noteId: n.id, log: t('noteDeleted') }) }, '✕')))) : emptyState(t('noNotes'), t('notesPrivate')));
}

function logPanel(s) {
  return s.log.length
    ? h('ol', { class: 'log-list', 'data-keep-scroll': 'log' }, s.log.slice().reverse().map((l) => h('li', null, h('span', { class: 'muted small' }, phaseRefLabel(l.phase)), ' ', l.text)))
    : emptyState(t('noLog'));
}

// ——— live ———
function statusPill(cs) {
  if (cs === 'answered') return h('span', { class: 'pill ok' }, '✉ ' + t('stAnswered'));
  if (cs === 'read') return h('span', { class: 'pill ok' }, '✓ ' + t('stRead'));
  return h('span', { class: 'pill live' }, '📨 ' + t('stSent'));
}

function choiceBox(s, step) {
  const req = store.game.live ? choiceRequest(s, step) : null;
  if (!req) return null;
  const cs = cardState(req.cardId);
  const resp = store.game.live.responses[req.cardId];
  const name = seatName(getSeat(s, req.seatId));
  if (!liveOpen() && !cs) return null;
  return h('div', { class: 'choice-box' + (cs === 'answered' ? ' answered' : '') },
    cs === 'answered'
      ? h('span', null, '✉ ' + t('playerChose', { name, list: resp.choice.map((id) => seatName(getSeat(s, id))).join(' + ') }))
      : cs ? h('span', null, '⏳ ' + t('waitingFor', { name })) : h('span', { class: 'muted' }, claimed(req.seatId) ? t('askHint', { name }) : t('notInApp', { name })),
    liveOpen() && claimed(req.seatId)
      ? h('button', { class: 'btn small' + (cs ? ' ghost' : ' primary'), onclick: () => { if (requestChoice(s, step)) toast(t('sentN', { n: 1 })); } }, cs ? t('askAgain') : '📨 ' + t('askChoice'))
      : null);
}

function liveBadge(s) {
  if (!store.game.live) return null;
  const n = s.seats.filter((x) => claimed(x.id)).length;
  const on = liveOpen();
  return h('button', { class: 'btn ghost live-badge' + (on ? ' on' : ''), onclick: () => { app.gameTab = 'live'; render(); }, title: t('live') },
    h('span', { class: 'dot' + (on ? ' on' : live.status === 'dead' ? ' dead' : '') }), `${n}/${s.seats.length}`);
}

function livePanel(s) {
  const l = store.game.live;
  if (!l) {
    return h('div', { class: 'stack' },
      h('div', { class: 'step-card' },
        h('span', { class: 'eyebrow' }, t('live')),
        h('h2', { class: 'step-role display' }, t('liveTitle')),
        h('p', { class: 'step-instruction' }, t('liveIntro')),
        h('ul', { class: 'hints' }, [t('liveP1'), t('liveP2'), t('liveP3'), t('liveP4')].map((x) => h('li', null, x))),
        live.error === 'create' ? h('p', { class: 'warn-text small' }, t('liveCreateFailed')) : null,
        h('div', { class: 'step-actions' }, h('button', { class: 'btn primary big', onclick: () => startLive() }, '📡 ' + t('startLive')))));
  }
  const settings = l.settings || {};
  const statusText = { open: t('liveOpen'), connecting: t('liveConnecting'), reconnecting: t('liveReconnecting'), dead: t('liveDead'), off: t('liveConnecting'), closed: t('liveDead') }[live.status] || live.status;
  const join = joinUrl(l.code);
  const locked = live.room && live.room.locked;
  const board = live.board && live.board.board && live.board.board.length ? live.board : null;
  return h('div', { class: 'stack' },
    h('div', { class: 'panel live-panel' },
      h('div', { class: 'row between wrap' },
        h('span', { class: 'row gap' }, h('span', { class: 'dot' + (live.status === 'open' ? ' on' : live.status === 'dead' ? ' dead' : '') }), statusText),
        h('span', { class: 'room-code display' }, l.code)),
      live.status === 'dead' ? h('p', { class: 'warn-text small' }, t('liveDeadHelp')) : null,
      h('div', { class: 'live-join' },
        h('div', { class: 'qr', html: qrSvg(join, { size: 180 }) }),
        h('div', { class: 'stack tight' },
          h('span', { class: 'label' }, t('studentLink')),
          h('code', { class: 'link-text' }, join),
          h('div', { class: 'row gap wrap' },
            copyButton(join, { label: t('copyLink') }),
            h('a', { class: 'btn', href: screenUrl(l.code), target: '_blank', rel: 'noopener' }, '🖥 ' + t('openScreen'))),
          h('p', { class: 'muted small' }, t('screenHelp')))),
      h('div', { class: 'row gap wrap' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!locked, onchange: (e) => setLocked(e.target.checked) }), t('lockRoom')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: settings.dream !== false, onchange: (e) => setLiveSetting('dream', e.target.checked) }), t('dreamOn')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: settings.decoys !== false, onchange: (e) => setLiveSetting('decoys', e.target.checked) }), t('decoysOn'))),
      h('p', { class: 'muted small' }, t('decoysHelp'))),
    h('div', { class: 'panel' },
      h('h3', { class: 'section-title' }, t('seatsInApp')),
      h('ul', { class: 'seat-status' }, s.seats.map((x) => h('li', null,
        h('span', { class: 'dot' + (seatOnline(x.id) ? ' on' : claimed(x.id) ? ' away' : '') }),
        h('span', { class: 'grow strong' }, seatName(x)),
        h('span', { class: 'muted small' }, seatOnline(x.id) ? t('online') : claimed(x.id) ? t('away') : t('notJoined')),
        claimed(x.id) ? confirmButton({ key: 'rel' + x.id, label: t('release'), confirmLabel: t('releaseConfirm'), cls: 'btn small ghost', onConfirm: () => releaseSeat(x.id) }) : null)))),
    board ? h('div', { class: 'panel' },
      h('h3', { class: 'section-title' }, t('dreamBoard') + ' · ' + t('night') + ' ' + live.board.night),
      h('ol', { class: 'board' }, board.board.map((b) => h('li', null, h('span', { class: 'grow' }, b.name), h('span', { class: 'strong' }, String(b.score)))))) : null,
    h('div', { class: 'row gap' },
      confirmButton({ key: 'closeroom', label: t('closeRoom'), confirmLabel: t('closeRoomConfirm'), onConfirm: () => closeRoom() })));
}

// ——— hovedvisning ———
export function viewGame() {
  const s = store.state();
  if (!s) return emptyState(t('noGame'), t('noGameHint'), h('button', { class: 'btn primary', onclick: () => navigate('new') }, t('newGame')));
  configureCharacters({ custom: s.script.custom || {} });
  const q = s.phase.type === 'night' ? nightQueue(s) : [];
  const cur = s.phase.type === 'night' ? currentStep(q) : null;
  const activeIds = cur ? (cur.seatId ? [cur.seatId] : cur.seatIds || []) : [];
  const uncopied = s.messages.filter((m) => m.kind === 'private' && !store.game.copied[m.id]).length;
  const tabs = [
    ['phase', s.phase.type === 'setup' ? t('roleCards') : s.phase.type === 'ended' ? t('phaseEnded') : phaseLabel(s)],
    ['messages', t('messages') + (uncopied ? ` (${uncopied})` : '')],
    ['notes', t('notes') + (s.notes.length ? ` (${s.notes.length})` : '')],
    ['log', t('log')],
    ['live', '📡 ' + t('live')],
  ];
  let content;
  if (app.gameTab === 'messages') content = messagesPanel(s);
  else if (app.gameTab === 'notes') content = notesPanel(s);
  else if (app.gameTab === 'log') content = logPanel(s);
  else if (app.gameTab === 'live') content = livePanel(s);
  else if (s.phase.type === 'setup') content = setupPanel(s);
  else if (s.phase.type === 'night') content = nightPanel(s);
  else if (s.phase.type === 'day') content = dayPanel(s);
  else content = endPanel(s);
  if (app.gameTab !== 'phase' || s.phase.type !== 'night') current = null;

  return h('div', { class: 'game' + (app.focusMode ? ' focus' : '') + ' phase-' + s.phase.type },
    gameBar(s),
    h('div', { class: 'game-body' },
      app.focusMode ? null : h('section', { class: 'grim-pane', 'aria-label': 'Grimoire' }, grimView(s, activeIds),
        h('p', { class: 'muted small center' }, s.phase.type === 'ended' ? t('grimHintReveal') : t('grimHint'))),
      h('section', { class: 'side-pane' },
        pendingBanner(s),
        h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label]) => h('button', {
          role: 'tab', class: 'tab' + (app.gameTab === k ? ' active' : ''), 'aria-selected': app.gameTab === k ? 'true' : 'false',
          onclick: () => { app.gameTab = k; render(); },
        }, label))),
        h('div', { class: 'tab-body' }, content))));
}

// ——— tastatur ———
export function gameKeydown(e) {
  const tag = (e.target && e.target.tagName) || '';
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target && e.target.isContentEditable);
  const mod = e.ctrlKey || e.metaKey;
  if (!store.game || app.modal) return;
  if (mod && !typing && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && !typing && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (typing || mod || e.altKey) return;
  if (e.key === 'f' || e.key === 'F') { app.focusMode = !app.focusMode; render(); return; }
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); app.gameTab = 'notes'; render(); setTimeout(() => { const el = document.getElementById('note-input'); if (el) el.focus(); }, 30); return; }
  if (!current) return;
  const { s, step, d, q } = current;
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); completeStep(s, step, d, q); return; }
  if (e.key === 'c' || e.key === 'C') {
    const r = resolveStep(s, step, d.input, s.lang, s.style);
    if (r.messages[0]) {
      const text = d.edits[0] !== undefined ? d.edits[0] : r.messages[0].text;
      copyText(text).then((ok) => { toast(ok ? t('copied') : t('copyFailed'), ok ? 'ok' : 'warn'); if (ok) store.markCopied(`step:${step.key}#0`); });
    }
    return;
  }
  if (e.key === 'ArrowRight') { const i = q.indexOf(step); if (i < q.length - 1) selectStep(q[i + 1].key); else selectStep('__end'); return; }
  if (e.key === 'ArrowLeft') { const i = q.indexOf(step); if (i > 0) selectStep(q[i - 1].key); }
}

