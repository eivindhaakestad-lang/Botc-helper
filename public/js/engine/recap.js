// «Slik gikk det egentlig»: en gjennomgang av spillet natt for natt, laget fra hendelsesloggen.
// Viser HVA som skjedde med hvem (forgiftet, drept av demonen, fikk feil informasjon …),
// men aldri HVEM som gjorde det – demonen og minionene avsløres ikke.

import { applyEvent, seatName, isDrunkLike, getSeat, compromised } from './state.js';
import { charInfo } from './characters.js';
import { nightQueue, stepModel } from './night.js';

const TX = {
  no: {
    setup: 'Før spillet', night: 'Natt {n}', day: 'Dag {n}',
    drunk: '{a} var full hele spillet – informasjonen kunne være feil',
    poisoned: '{a} ble forgiftet',
    protected: '{a} ble beskyttet i natt',
    demonKill: 'Demonen drepte {a}',
    survived: 'Demonen angrep {a}, men {a} overlevde',
    died: '{a} døde',
    falseInfo: '{a} fikk feil informasjon',
    whyPoisoned: ' (forgiftet)', whyDrunk: ' (full)',
    executed: '{a} ble henrettet',
    executedAlive: '{a} ble henrettet, men døde ikke',
    noExecution: 'Ingen ble henrettet',
    shotHit: '{a} skjøt mot {b} – og traff!',
    shotMiss: '{a} skjøt mot {b} – ingenting skjedde',
  },
  en: {
    setup: 'Before the game', night: 'Night {n}', day: 'Day {n}',
    drunk: '{a} was drunk all game – their information could be wrong',
    poisoned: '{a} was poisoned',
    protected: '{a} was protected tonight',
    demonKill: 'The Demon killed {a}',
    survived: 'The Demon attacked {a}, but {a} survived',
    died: '{a} died',
    falseInfo: '{a} got false information',
    whyPoisoned: ' (poisoned)', whyDrunk: ' (drunk)',
    executed: '{a} was executed',
    executedAlive: '{a} was executed, but did not die',
    noExecution: 'Nobody was executed',
    shotHit: '{a} shot at {b} – and hit!',
    shotMiss: '{a} shot at {b} – nothing happened',
  },
};

export const RECAP_ICON = {
  drunk: '🍺', poisoned: '🧪', protected: '🛡️', demonKill: '🗡️', survived: '✨', died: '💀',
  falseInfo: '❗', executed: '⚖️', noExecution: '⚖️', shotHit: '🏹', shotMiss: '🏹',
};

function tx(lang, key, p = {}) {
  const s = (TX[lang] || TX.no)[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (p[k] ?? ''));
}

function clone(x) {
  return typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

// Returnerer { chapters: [{ key, type, number, title, deadBefore: [seatId], items: [{ id, kind, icon, seatIds, dies, text }] }], stats }
export function buildRecap(initial, events, lang = 'no') {
  const s = clone(initial);
  const L = lang === 'en' ? 'en' : 'no';
  const last = new Map();
  events.forEach((ev, i) => { if (ev.sk) last.set(ev.sk, i); });
  const chapters = [];
  const byKey = new Map();
  const stats = { info: 0, falseInfo: 0 };
  const nm = (id) => seatName(getSeat(s, id));

  const chapter = (phase) => {
    const type = phase.type === 'ended' ? (phase.from || 'day') : phase.type;
    const key = type === 'setup' ? 'setup' : type + phase.number;
    if (!byKey.has(key)) {
      const ch = {
        key, type, number: phase.number,
        title: type === 'setup' ? tx(L, 'setup') : tx(L, type, { n: phase.number }),
        deadBefore: s.seats.filter((x) => !x.alive).map((x) => x.id),
        items: [],
      };
      byKey.set(key, ch);
      chapters.push(ch);
    }
    return byKey.get(key);
  };
  const add = (ch, kind, seatIds, p, dies = null) => {
    ch.items.push({ id: `${ch.key}:${ch.items.length}`, kind, icon: RECAP_ICON[kind], seatIds, dies, text: tx(L, kind, p) });
  };

  // Drunk er med fra starten
  const setup = chapter({ type: 'setup', number: 0 });
  for (const seat of s.seats) if (isDrunkLike(seat)) add(setup, 'drunk', [seat.id], { a: seatName(seat) });

  events.forEach((ev, i) => {
    if (ev.sk && last.get(ev.sk) !== i) return;
    const phase = ev.phase || s.phase;
    if (['GAME_END', 'REVEAL', 'HIDE', 'ANNOUNCE', 'NOTE', 'NOTE_DELETE', 'MESSAGE', 'MESSAGE_EDIT', 'SETTINGS'].includes(ev.type)) { applyEvent(s, ev); return; }
    const ch = phase.type === 'setup' ? setup : chapter(phase);

    // Informasjon: var den sann? (regnes ut med tilstanden FØR steget)
    let before = null;
    if (ev.type === 'STEP' && ev.status === 'done' && s.phase.type === 'night') {
      const step = nightQueue(s).find((x) => x.key === ev.key);
      if (step) {
        const seat = step.seatId ? getSeat(s, step.seatId) : null;
        const model = stepModel(s, step, ev.input || {}, L);
        const team = charInfo(step.characterId).team;
        before = { step, seat, model, comp: seat ? compromised(s, seat) : null, demon: team === 'demon' };
        if (model.isInfo && seat && (ev.messages || []).length) {
          stats.info++;
          if (model.truth === false) stats.falseInfo++;
        }
      }
    }

    const deathsBefore = s.deaths.length;
    applyEvent(s, ev);
    const effects = ev.effects || [];

    for (const e of effects) {
      if (e.t === 'addReminder' && e.reminder && e.reminder.kind === 'poisoned') add(ch, 'poisoned', [e.seatId], { a: nm(e.seatId) });
      if (e.t === 'addReminder' && e.reminder && e.reminder.kind === 'safe') add(ch, 'protected', [e.seatId], { a: nm(e.seatId) });
    }
    if (ev.shot) add(ch, ev.shot.hit ? 'shotHit' : 'shotMiss', [ev.shot.from, ev.shot.to], { a: nm(ev.shot.from), b: nm(ev.shot.to) });
    if (before && before.demon && ev.input && ev.input.target && ev.input.outcome === 'none') {
      add(ch, 'survived', [ev.input.target], { a: nm(ev.input.target) });
    }
    if (before && before.model.isInfo && before.seat && before.model.truth === false && (ev.messages || []).length) {
      const why = before.comp && before.comp.poisoned ? tx(L, 'whyPoisoned') : before.comp && before.comp.drunk ? tx(L, 'whyDrunk') : '';
      add(ch, 'falseInfo', [before.seat.id], { a: seatName(before.seat) });
      ch.items[ch.items.length - 1].text += why;
    }
    if (ev.type === 'EXECUTE') {
      if (!ev.seatId) add(ch, 'noExecution', [], {});
      else {
        const ex = s.executions[s.executions.length - 1];
        if (!(ex && ex.died)) add(ch, 'executedAlive', [ev.seatId], { a: nm(ev.seatId) });
      }
    }
    for (const d of s.deaths.slice(deathsBefore)) {
      const shotKill = ev.shot && ev.shot.hit && ev.shot.to === d.seatId;
      if (d.cause === 'demon') add(ch, 'demonKill', [d.seatId], { a: nm(d.seatId) }, d.seatId);
      else if (d.cause === 'execution') add(ch, 'executed', [d.seatId], { a: nm(d.seatId) }, d.seatId);
      else if (shotKill) { const it = [...ch.items].reverse().find((x) => x.kind === 'shotHit'); if (it) it.dies = d.seatId; }
      else add(ch, 'died', [d.seatId], { a: nm(d.seatId) }, d.seatId);
    }
  });

  return { chapters: chapters.filter((c) => c.items.length), stats };
}

// Stegene Storytelleren blar gjennom: tittelkort for hvert kapittel, så ett punkt om gangen.
// ctl = { hidden: {itemId: true}, edits: {itemId: text} }
export function recapSteps(recap, ctl = {}) {
  const hidden = ctl.hidden || {};
  const edits = ctl.edits || {};
  const steps = [];
  for (const ch of recap.chapters) {
    const items = ch.items.filter((x) => !hidden[x.id]).map((x) => (edits[x.id] !== undefined ? { ...x, text: edits[x.id] } : x));
    if (!items.length) continue;
    steps.push({ ch, item: null });
    for (const item of items) steps.push({ ch, item });
  }
  return steps;
}

// Det storskjermen og elevene får se ved steg pos (0-basert).
export function recapPublic(recap, ctl, pos) {
  const steps = recapSteps(recap, ctl);
  if (!steps.length) return null;
  const p = Math.max(0, Math.min(steps.length - 1, pos || 0));
  const cur = steps[p];
  const shown = steps.slice(0, p + 1).filter((x) => x.ch === cur.ch && x.item).map((x) => x.item);
  const dead = new Set(cur.ch.deadBefore);
  for (const it of shown) if (it.dies) dead.add(it.dies);
  return {
    title: cur.ch.title,
    type: cur.ch.type,
    step: p + 1,
    total: steps.length,
    items: shown.map((x) => ({ id: x.id, kind: x.kind, icon: x.icon, seatIds: x.seatIds, text: x.text })),
    dead: [...dead],
  };
}
