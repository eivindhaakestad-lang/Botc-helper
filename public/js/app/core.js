// Felles app-tilstand (kun i minnet) og render.

import { applyTheme } from '../live/theme.js';

export const app = {
  view: 'home',
  params: {},
  draft: null,
  gameTab: 'phase',
  focusMode: false,
  stepDrafts: {},
  pending: [],
  modal: null,
  classFilter: null,
  importOpen: false,
};

let renderer = () => [];
let scheduled = false;

export function setRenderer(fn) { renderer = fn; }

export function render() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const root = document.getElementById('app');
    if (!root) return;
    const active = document.activeElement;
    const activeId = active && active.id;
    const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    const scrolls = {};
    root.querySelectorAll('[data-keep-scroll]').forEach((el) => { scrolls[el.dataset.keepScroll] = el.scrollTop; });
    app.theme = 'none';
    root.replaceChildren(...renderer().filter(Boolean));
    applyTheme(app.theme);
    root.querySelectorAll('[data-keep-scroll]').forEach((el) => { if (scrolls[el.dataset.keepScroll] !== undefined) el.scrollTop = scrolls[el.dataset.keepScroll]; });
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) {
        el.focus({ preventScroll: true });
        if (selStart !== null && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(selStart, selStart); } catch { /* */ } }
      }
    }
  });
}

export function navigate(view, params = {}) {
  app.view = view;
  app.params = params;
  app.modal = null;
  render();
  window.scrollTo(0, 0);
}
