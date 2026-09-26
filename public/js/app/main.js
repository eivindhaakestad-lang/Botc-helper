// Oppstart, enkel ruter, render-løkke og tastatursnarveier.

import { store } from './store.js';
import { app, render, navigate, setRenderer } from './core.js';
import { configureCharacters } from '../engine/characters.js';
import { viewHome } from './view-home.js';
import { viewClasses, viewClass } from './view-classes.js';
import { viewNewGame } from './view-newgame.js';
import { viewGame, gameKeydown } from './view-game.js';
import { viewSettings, viewHistory } from './view-settings.js';
import { t } from './i18n.js';
import { h } from './dom.js';
import { connectLive, syncLive } from './live.js';

const VIEWS = {
  home: viewHome,
  classes: viewClasses,
  class: viewClass,
  new: viewNewGame,
  game: viewGame,
  settings: viewSettings,
  history: viewHistory,
};

function topbar() {
  const nav = [
    ['home', t('navHome')],
    ['classes', t('navClasses')],
    ['new', t('navNew')],
    ['settings', t('navSettings')],
  ];
  const s = store.state();
  return h('header', { class: 'topbar' },
    h('button', { class: 'brand', onclick: () => navigate('home'), 'aria-label': t('navHome') },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '✦'),
      h('span', { class: 'brand-name' }, 'Botc Helper')),
    h('nav', { class: 'nav' },
      nav.map(([v, label]) => h('button', { class: 'nav-btn' + (app.view === v || (v === 'classes' && app.view === 'class') ? ' active' : ''), onclick: () => navigate(v) }, label)),
      s ? h('button', { class: 'nav-btn game-link' + (app.view === 'game' ? ' active' : ''), onclick: () => navigate('game') }, '● ' + t('navGame')) : null),
    h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('uiLanguage') },
      ['no', 'en'].map((l) => h('button', {
        class: 'lang' + (store.lib.settings.uiLang === l ? ' active' : ''),
        'aria-pressed': store.lib.settings.uiLang === l ? 'true' : 'false',
        onclick: () => { store.lib.settings.uiLang = l; store.saveLib(); },
      }, l === 'no' ? 'NO' : 'EN'))));
}

function frame() {
  const view = VIEWS[app.view] || viewHome;
  return [
    topbar(),
    store.isPersistent() ? null : h('div', { class: 'banner warn' }, t('storageOff')),
    h('main', { class: 'main view-' + app.view }, view()),
    app.modal ? app.modal() : null,
  ];
}

setRenderer(frame);

function boot() {
  store.load();
  configureCharacters({ texts: store.lib.charTexts });
  store.subscribe(() => { render(); queueMicrotask(syncLive); });
  if (store.game) app.view = 'game';
  if (store.game && store.game.live) connectLive();
  render();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && app.modal) { app.modal = null; render(); return; }
    if (app.view === 'game') gameKeydown(e);
  });
}

boot();
