// Gjenbrukbare UI-biter.

import { h, copyText, toast } from './dom.js';
import { charInfo, TEAMS } from '../engine/characters.js';
import { seatName } from '../engine/state.js';
import { t } from './i18n.js';
import { app, render } from './core.js';

export function teamClass(team) {
  return 'team-' + (team || 'townsfolk');
}

export function teamPill(team) {
  return h('span', { class: 'pill ' + teamClass(team) }, t('team_' + team));
}

export function charSelect({ id, value, options, onChange, none = null, placeholder = true, cls = '' }) {
  const groups = {};
  for (const cid of options) {
    const team = charInfo(cid).team;
    (groups[team] = groups[team] || []).push(cid);
  }
  return h('select', { id, class: 'select ' + cls, onchange: (e) => onChange(e.target.value || null) },
    placeholder ? h('option', { value: '', selected: !value }, '—') : null,
    none ? h('option', { value: '__none', selected: value === '__none' }, none) : null,
    TEAMS.filter((tm) => groups[tm]).map((tm) => h('optgroup', { label: t('team_' + tm) },
      groups[tm].map((cid) => h('option', { value: cid, selected: cid === value }, charInfo(cid).name)))));
}

export function playerSelect({ id, s, value, onChange, filter = null, exclude = [] }) {
  let seats = s.seats.filter((x) => !exclude.includes(x.id));
  if (filter === 'alive') seats = seats.filter((x) => x.alive);
  if (filter === 'aliveMinions') seats = seats.filter((x) => x.alive && charInfo(x.characterId).team === 'minion');
  return h('select', { id, class: 'select', onchange: (e) => onChange(e.target.value || null) },
    h('option', { value: '', selected: !value }, '—'),
    seats.map((x) => h('option', { value: x.id, selected: x.id === value },
      `${seatName(x)} · ${charInfo(x.characterId).name}${x.alive ? '' : ' †'}`)));
}

export function copyButton(text, { id, onCopied, label, cls = '' } = {}) {
  return h('button', {
    id, class: 'btn copy ' + cls, type: 'button',
    onclick: async () => {
      const ok = await copyText(typeof text === 'function' ? text() : text);
      toast(ok ? t('copied') : t('copyFailed'), ok ? 'ok' : 'warn');
      if (ok && onCopied) onCopied();
    },
  }, label || t('copy'));
}

// Modal: app.modal = () => modal({...})
export function modal({ title, body, actions = [], wide = false }) {
  const close = () => { app.modal = null; render(); };
  return h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === e.currentTarget) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-head' },
        h('h2', { class: 'modal-title' }, title),
        h('button', { class: 'icon-btn', onclick: close, 'aria-label': t('close') }, '✕')),
      h('div', { class: 'modal-body' }, body),
      actions.length ? h('div', { class: 'modal-actions' }, actions) : null));
}

export function openModal(fn) {
  app.modal = fn;
  render();
}

export function closeModal() {
  app.modal = null;
  render();
}

// Bekreft-knapp i to trinn (appen kan ikke bruke confirm()).
const armed = new Set();
export function confirmButton({ key, label, confirmLabel, onConfirm, cls = 'btn danger' }) {
  const on = armed.has(key);
  return h('button', {
    class: cls + (on ? ' armed' : ''), type: 'button',
    onclick: () => {
      if (on) { armed.delete(key); onConfirm(); render(); } else { armed.add(key); render(); setTimeout(() => { if (armed.delete(key)) render(); }, 4000); }
    },
  }, on ? confirmLabel || t('confirmSure') : label);
}

export function emptyState(title, text, action) {
  return h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, title), text ? h('p', { class: 'muted' }, text) : null, action || null);
}

export function segmented({ value, options, onChange, label }) {
  return h('div', { class: 'segmented', role: 'group', 'aria-label': label || '' },
    options.map((o) => h('button', {
      type: 'button', class: 'seg' + (o.value === value ? ' active' : ''), 'aria-pressed': o.value === value ? 'true' : 'false',
      onclick: () => onChange(o.value),
    }, o.label)));
}
