// Lokal lagring i nettleseren (localStorage). Ingenting sendes til noen server.
// Data er versjonert (schemaVersion) og migreres ved oppdateringer.

import { uid } from '../engine/rng.js';
import { replay } from '../engine/state.js';

const LIB_KEY = 'botc-helper.library';
const GAME_KEY = 'botc-helper.game';
export const LIB_VERSION = 1;

function defaults() {
  return {
    schemaVersion: LIB_VERSION,
    settings: { uiLang: 'no', gameLang: 'no', style: 'short', historyEnabled: true, historyWeeks: 4 },
    classes: [],
    students: [],
    groups: [],
    scripts: [],
    charTexts: {},
    history: [],
  };
}

function migrate(d) {
  const base = defaults();
  const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  // Framtidige migreringer: if (out.schemaVersion < 2) { ... }
  out.schemaVersion = LIB_VERSION;
  return out;
}

let persistent = true;
function read(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { persistent = false; return null; }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { persistent = false; return false; }
}

export const store = {
  lib: defaults(),
  game: null, // { initial, events, redo, copied: {messageId: true}, ui: {} }
  listeners: new Set(),

  load() {
    const d = read(LIB_KEY);
    this.lib = d ? migrate(d) : defaults();
    this.game = read(GAME_KEY);
    this.pruneHistory();
    // Test om lagring faktisk virker
    try { localStorage.setItem('botc-helper.probe', '1'); localStorage.removeItem('botc-helper.probe'); } catch { persistent = false; }
  },
  isPersistent() { return persistent; },
  saveLib() { write(LIB_KEY, this.lib); this.emit(); },
  saveGame() { write(GAME_KEY, this.game); this.emit(); },
  emit() { for (const fn of this.listeners) fn(); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

  // ——— klasser, grupper, elever ———
  addClass(name) {
    const c = { id: uid('c_'), name: name.trim() || '?' };
    this.lib.classes.push(c);
    this.saveLib();
    return c;
  },
  renameClass(id, name) { const c = this.lib.classes.find((x) => x.id === id); if (c) { c.name = name; this.saveLib(); } },
  deleteClass(id) {
    this.lib.classes = this.lib.classes.filter((x) => x.id !== id);
    this.lib.students = this.lib.students.filter((x) => x.classId !== id);
    this.lib.groups = this.lib.groups.filter((x) => x.classId !== id);
    this.saveLib();
  },
  addGroup(classId, name) {
    const g = { id: uid('gr_'), classId, name: name.trim() || '?', studentIds: [] };
    this.lib.groups.push(g);
    this.saveLib();
    return g;
  },
  renameGroup(id, name) { const g = this.lib.groups.find((x) => x.id === id); if (g) { g.name = name; this.saveLib(); } },
  deleteGroup(id) { this.lib.groups = this.lib.groups.filter((x) => x.id !== id); this.saveLib(); },
  toggleGroupMember(groupId, studentId) {
    const g = this.lib.groups.find((x) => x.id === groupId);
    if (!g) return;
    g.studentIds = g.studentIds.includes(studentId) ? g.studentIds.filter((x) => x !== studentId) : [...g.studentIds, studentId];
    this.saveLib();
  },
  addStudents(classId, names, groupId = null) {
    const added = [];
    for (const raw of names) {
      const firstName = String(raw).trim();
      if (!firstName) continue;
      const s = { id: uid('st_'), classId, firstName, tags: [] };
      this.lib.students.push(s);
      added.push(s);
    }
    if (groupId) {
      const g = this.lib.groups.find((x) => x.id === groupId);
      if (g) g.studentIds.push(...added.map((x) => x.id));
    }
    this.saveLib();
    return added;
  },
  updateStudent(id, patch) { const s = this.lib.students.find((x) => x.id === id); if (s) { Object.assign(s, patch); this.saveLib(); } },
  toggleTag(id, tag) {
    const s = this.lib.students.find((x) => x.id === id);
    if (!s) return;
    s.tags = s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag];
    this.saveLib();
  },
  moveStudent(id, classId) {
    const s = this.lib.students.find((x) => x.id === id);
    if (!s) return;
    s.classId = classId;
    for (const g of this.lib.groups) if (g.classId !== classId) g.studentIds = g.studentIds.filter((x) => x !== id);
    this.saveLib();
  },
  deleteStudent(id) {
    this.lib.students = this.lib.students.filter((x) => x.id !== id);
    for (const g of this.lib.groups) g.studentIds = g.studentIds.filter((x) => x !== id);
    this.saveLib();
  },
  studentsOf(classId, groupId = null) {
    const list = this.lib.students.filter((x) => x.classId === classId);
    if (!groupId) return list;
    const g = this.lib.groups.find((x) => x.id === groupId);
    return g ? list.filter((x) => g.studentIds.includes(x.id)) : list;
  },

  // ——— scripts og rolletekster ———
  addScript(script) { this.lib.scripts.push(script); this.saveLib(); },
  deleteScript(id) { this.lib.scripts = this.lib.scripts.filter((x) => x.id !== id); this.saveLib(); },
  setCharTexts(texts) { this.lib.charTexts = texts; this.saveLib(); },

  // ——— pågående spill ———
  startGame(initial) {
    this.game = { initial, events: [], redo: [], copied: {}, ui: { stepKey: null } };
    this.saveGame();
  },
  state() {
    if (!this.game) return null;
    if (!this._cache || this._cache.events !== this.game.events.length || this._cache.initial !== this.game.initial) {
      this._cache = { events: this.game.events.length, initial: this.game.initial, state: replay(this.game.initial, this.game.events) };
    }
    return this._cache.state;
  },
  dispatch(ev) {
    if (!this.game) return;
    this.game.events.push({ ...ev, ts: Date.now() });
    this.game.redo = [];
    this._cache = null;
    this.saveGame();
  },
  undo() {
    if (!this.game || !this.game.events.length) return false;
    this.game.redo.push(this.game.events.pop());
    this._cache = null;
    this.saveGame();
    return true;
  },
  redo() {
    if (!this.game || !this.game.redo.length) return false;
    this.game.events.push(this.game.redo.pop());
    this._cache = null;
    this.saveGame();
    return true;
  },
  markCopied(id) { if (this.game) { this.game.copied[id] = true; this.saveGame(); } },
  setUi(patch) { if (this.game) { Object.assign(this.game.ui, patch); write(GAME_KEY, this.game); } },
  endGame(archive) {
    const s = this.state();
    if (archive && s && this.lib.settings.historyEnabled) {
      this.lib.history.unshift({
        id: s.id,
        date: Date.now(),
        className: s.meta.className || '',
        groupName: s.meta.groupName || '',
        scriptName: s.script.name,
        winner: s.winner,
        seats: s.seats.map((x) => ({ names: x.names, characterId: x.characterId, alive: x.alive })),
        notes: s.notes.map((n) => n.text),
        expiresAt: Date.now() + this.lib.settings.historyWeeks * 7 * 864e5,
      });
    }
    this.game = null;
    this._cache = null;
    write(GAME_KEY, null);
    this.saveLib();
  },
  pruneHistory() {
    const now = Date.now();
    const before = this.lib.history.length;
    this.lib.history = this.lib.history.filter((x) => !x.expiresAt || x.expiresAt > now);
    if (this.lib.history.length !== before) write(LIB_KEY, this.lib);
  },
  deleteHistory(id) { this.lib.history = id ? this.lib.history.filter((x) => x.id !== id) : []; this.saveLib(); },

  // ——— backup ———
  exportAll() {
    return JSON.stringify({ app: 'botc-helper', exportedAt: new Date().toISOString(), library: this.lib, game: this.game }, null, 1);
  },
  importAll(text) {
    const d = JSON.parse(text);
    if (!d || d.app !== 'botc-helper' || !d.library) throw new Error('format');
    this.lib = migrate(d.library);
    this.game = d.game || null;
    this._cache = null;
    write(GAME_KEY, this.game);
    this.saveLib();
  },
  wipe() {
    this.lib = defaults();
    this.game = null;
    this._cache = null;
    write(GAME_KEY, null);
    this.saveLib();
  },
};
