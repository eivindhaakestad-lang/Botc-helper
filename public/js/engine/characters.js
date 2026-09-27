// Oppslag av roller: kombinerer offisielle funksjonsdata, modellerte mekanikker (DEFS),
// egne roller fra importerte scripts og rolletekster Storytelleren har importert selv.

import { OFFICIAL, NIGHT_FIRST, NIGHT_OTHER } from './data/official.js';
import { DEFS } from './defs.js';
import { roleIcon } from './icons.js';

export const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];

export function teamAlignment(team) {
  return team === 'minion' || team === 'demon' ? 'evil' : 'good';
}

export function normalizeId(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function prettify(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// Register for egne roller (fra aktivt script) og importerte rolletekster.
const registry = { custom: {}, texts: {} };
export function configureCharacters({ custom, texts } = {}) {
  if (custom) registry.custom = custom;
  if (texts) registry.texts = texts;
}

// ctx = { custom: {id: characterObject}, texts: {id: {name, ability, ...}} }
export function charInfo(id, ctx = registry) {
  if (!id) return null;
  const off = OFFICIAL[id];
  const custom = ctx.custom && ctx.custom[id];
  const text = ctx.texts && ctx.texts[id];
  return {
    id,
    name: (custom && custom.name) || (off ? off[0] : (text && text.name) || prettify(id)),
    team: (custom && custom.team) || (off ? off[1] : (text && text.team) || 'townsfolk'),
    edition: off ? off[2] : 'custom',
    setup: custom ? !!custom.setup : off ? !!off[3] : false,
    official: !!off,
    modeled: !!DEFS[id],
    def: DEFS[id] || null,
    ability: (text && text.ability) || (custom && custom.ability) || null,
    icon: roleIcon(id, (custom && custom.team) || (off ? off[1] : (text && text.team) || 'townsfolk')),
    image: (text && text.image) || (custom && custom.image) || null,
    firstNight: custom ? Number(custom.firstNight) || 0 : null,
    otherNight: custom ? Number(custom.otherNight) || 0 : null,
  };
}

export function findByName(name) {
  const n = normalizeId(name);
  if (OFFICIAL[n]) return n;
  for (const [id, v] of Object.entries(OFFICIAL)) if (normalizeId(v[0]) === n) return id;
  return null;
}

// Night order for et gitt sett med roller. Offisielle roller følger den offisielle rekkefølgen.
// Egne roller uten plass i den offisielle lista sorteres på sitt eget tall og legges til rett før daggry.
export function nightOrder(first, characterIds, ctx = registry) {
  const base = first ? NIGHT_FIRST : NIGHT_OTHER;
  const set = new Set(characterIds);
  const specials = first ? ['minioninfo', 'demoninfo'] : [];
  const out = base.filter((id) => set.has(id) || specials.includes(id));
  const extra = characterIds
    .filter((id) => !base.includes(id))
    .map((id) => ({ id, n: first ? charInfo(id, ctx).firstNight : charInfo(id, ctx).otherNight }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.id);
  return [...out, ...extra];
}

export function allOfficialIds() {
  return Object.keys(OFFICIAL);
}
