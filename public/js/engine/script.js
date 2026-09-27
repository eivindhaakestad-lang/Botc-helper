// Import av scripts i det offisielle formatet (Script Tool / script-schema.json),
// eldre varianter med understrek i ID-er, eller en enkel liste med rollenavn.

import { OFFICIAL } from './data/official.js';
import { normalizeId, findByName } from './characters.js';

const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];

export function parseScript(text) {
  const result = { script: null, unknown: [], errors: [] };
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  const characters = [];
  const custom = {};
  let name = '';
  let author = '';
  const add = (id) => { if (id && !characters.includes(id)) characters.push(id); };

  if (Array.isArray(data) || (data && Array.isArray(data.characters))) {
    const arr = Array.isArray(data) ? data : data.characters;
    if (!Array.isArray(data)) { name = data.name || ''; author = data.author || ''; }
    for (const item of arr) {
      if (typeof item === 'string') {
        const id = normalizeId(item);
        if (OFFICIAL[id]) add(id); else result.unknown.push(item);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      if (item.id === '_meta') { name = item.name || name; author = item.author || author; continue; }
      const id = normalizeId(item.id);
      if (!id) continue;
      if (OFFICIAL[id] && !item.ability) { add(id); continue; }
      if (item.team && TEAMS.includes(item.team) && item.name) {
        custom[id] = {
          id, name: item.name, team: item.team, ability: item.ability || '',
          firstNight: Number(item.firstNight) || 0, otherNight: Number(item.otherNight) || 0,
          firstNightReminder: item.firstNightReminder || '', otherNightReminder: item.otherNightReminder || '',
          reminders: item.reminders || [], setup: !!item.setup,
        };
        add(id);
        continue;
      }
      if (OFFICIAL[id]) add(id); else result.unknown.push(item.id);
    }
  } else if (typeof text === 'string' && text.trim()) {
    // Liste med rollenavn, én per linje eller kommaseparert
    for (const raw of text.split(/[\n,;]+/)) {
      const t = raw.trim();
      if (!t) continue;
      const id = findByName(t);
      if (id) add(id); else result.unknown.push(t);
    }
  }
  if (!characters.length) {
    result.errors.push('empty');
    return result;
  }
  result.script = { id: 'imp_' + Date.now().toString(36), name: name || 'Script', author, characters, custom, builtIn: false };
  return result;
}

// Rolletekster Storytelleren importerer selv (f.eks. roles.json fra det offisielle repoet,
// eller et homebrew-script med fulle rolleobjekter).
export function parseCharacterTexts(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { texts: {}, count: 0, error: 'json' }; }
  const arr = Array.isArray(data) ? data : Object.values(data || {});
  const texts = {};
  for (const item of arr) {
    if (!item || typeof item !== 'object' || !item.id || item.id === '_meta') continue;
    const id = normalizeId(item.id);
    if (!item.ability && !item.name) continue;
    texts[id] = {
      name: item.name || '',
      ability: item.ability || '',
      firstNightReminder: item.firstNightReminder || '',
      otherNightReminder: item.otherNightReminder || '',
      image: typeof item.image === 'string' ? item.image : Array.isArray(item.image) && typeof item.image[0] === 'string' ? item.image[0] : '',
    };
  }
  return { texts, count: Object.keys(texts).length };
}
