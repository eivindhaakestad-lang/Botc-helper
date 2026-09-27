// Egne, enkle ikoner (emoji) for rollene. Ingen offisiell grafikk følger med appen.
// Har Storytelleren importert rolletekster med bildelenker, brukes de i grimen i stedet.

export const ICONS = {
  // Trouble Brewing – Townsfolk
  washerwoman: '🧺', librarian: '📚', investigator: '🔍', chef: '🍳', empath: '💞', fortuneteller: '🔮',
  undertaker: '⚰️', monk: '🙏', ravenkeeper: '🐦‍⬛', virgin: '🌸', slayer: '🏹', soldier: '🛡️', mayor: '🎩',
  // Outsiders
  butler: '🤵', drunk: '🍺', recluse: '🏚️', saint: '😇',
  // Minions
  poisoner: '🧪', spy: '🕵️', scarletwoman: '💋', baron: '🎖️',
  // Demon
  imp: '😈',
  // Travellers (TB)
  scapegoat: '🐐', gunslinger: '🤠', beggar: '🥣', bureaucrat: '📋', thief: '🦝',
};

const TEAM_FALLBACK = { townsfolk: '🔵', outsider: '🔷', minion: '🔺', demon: '🔥', traveller: '🧳' };

export function roleIcon(id, team) {
  return ICONS[id] || TEAM_FALLBACK[team] || '✦';
}
