// Genererer public/js/engine/data/official.js fra det offisielle repoet (bare funksjonelle felt).
// Bruk: git clone --depth 1 https://github.com/ThePandemoniumInstitute/botc-release /tmp/botc-release
//       node tools/gen-official.mjs /tmp/botc-release
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.argv[2] || '/tmp/botc-release';
const roles = JSON.parse(readFileSync(join(repo, 'resources/data/roles.json'), 'utf8'));
const night = JSON.parse(readFileSync(join(repo, 'resources/data/nightsheet.json'), 'utf8'));
const list = Array.isArray(roles) ? roles : Object.values(roles);
const chars = {};
for (const c of list) {
  if (!['townsfolk', 'outsider', 'minion', 'demon', 'traveller'].includes(c.team)) continue;
  chars[c.id] = [c.name, c.team, c.edition, c.setup ? 1 : 0];
}
const out = `// Funksjonelle data om offisielle roller: ID, navn, team, utgave, setup-flagg og night order.
// Kilde: ThePandemoniumInstitute/botc-release (resources/data). Ingen evnetekster er inkludert.
// Generert av tools/gen-official.mjs – ikke rediger for hånd.
export const OFFICIAL = ${JSON.stringify(chars)};
export const NIGHT_FIRST = ${JSON.stringify(night.firstNight)};
export const NIGHT_OTHER = ${JSON.stringify(night.otherNight)};
`;
writeFileSync(new URL('../public/js/engine/data/official.js', import.meta.url), out);
console.log(`${Object.keys(chars).length} roller skrevet`);
