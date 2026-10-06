import { h } from './dom.js';
import { store } from './store.js';
import { navigate } from './core.js';
import { t } from './i18n.js';
import { logoEl } from '../live/logo.js';

function phaseLabel(s) {
  if (s.phase.type === 'setup') return t('phaseSetup');
  if (s.phase.type === 'night') return t('night') + ' ' + s.phase.number;
  if (s.phase.type === 'day') return t('day') + ' ' + s.phase.number;
  return t('phaseEnded');
}

export function viewHome() {
  const s = store.state();
  const lib = store.lib;
  const classes = lib.classes.length;
  const students = lib.students.length;
  return h('div', { class: 'home' },
    h('section', { class: 'home-logo' }, logoEl({ variant: 'stack', lang: store.lib.settings.uiLang, anim: true })),
    // For elevene: stort og tydelig øverst – rett til spillet
    h('section', { class: 'join-hero' },
      h('a', { class: 'join-big display', href: '/play' }, '🎮 ' + t('joinGame')),
      h('form', { class: 'join-code', onsubmit: (e) => { e.preventDefault(); const v = e.target.querySelector('input').value.trim().toUpperCase(); location.href = '/play' + (v ? '?room=' + encodeURIComponent(v) : ''); } },
        h('input', { class: 'input', placeholder: t('roomCode'), 'aria-label': t('roomCode'), autocomplete: 'off', autocapitalize: 'characters', maxlength: 8 }),
        h('button', { class: 'btn primary', type: 'submit' }, t('joinGo')))),
    h('section', { class: 'home-hero' },
      h('h1', { class: 'visually-hidden' }, t('homeTitle')),
      h('p', { class: 'lead' }, t('homeLead'))),
    h('div', { class: 'home-grid' },
      s ? h('button', { class: 'home-card resume', onclick: () => navigate('game') },
        h('span', { class: 'card-kicker' }, t('resumeGame')),
        h('span', { class: 'card-title' }, phaseLabel(s)),
        h('span', { class: 'card-meta' }, [s.meta.className, s.meta.groupName, s.script.name].filter(Boolean).join(' · ') + ' · ' + s.seats.length + ' ' + t('seats'))) : null,
      h('button', { class: 'home-card primary', onclick: () => navigate('new') },
        h('span', { class: 'card-kicker' }, t('step') + ' 1'),
        h('span', { class: 'card-title' }, t('newGame')),
        h('span', { class: 'card-meta' }, s ? t('newGameReplaces') : t('newGameMeta'))),
      h('button', { class: 'home-card', onclick: () => navigate('classes') },
        h('span', { class: 'card-kicker' }, t('library')),
        h('span', { class: 'card-title' }, t('navClasses')),
        h('span', { class: 'card-meta' }, `${classes} ${t('classesCount')} · ${students} ${t('studentsCount')}`)),
      h('button', { class: 'home-card', onclick: () => navigate('history') },
        h('span', { class: 'card-kicker' }, t('history')),
        h('span', { class: 'card-title' }, t('pastGames')),
        h('span', { class: 'card-meta' }, lib.settings.historyEnabled ? `${lib.history.length} ${t('gamesSaved')} · ${t('deletedAfter', { n: lib.settings.historyWeeks })}` : t('historyOff')))),
    h('section', { class: 'home-notes' },
      h('h2', { class: 'section-title' }, t('howItWorks')),
      h('ol', { class: 'flow' },
        [t('flow1'), t('flow2'), t('flow3'), t('flow4'), t('flow5')].map((x) => h('li', null, x))),
      h('p', { class: 'muted small' }, t('privacyNote'))));
}
