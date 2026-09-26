// Mekanikk for modellerte roller (regelmotor-data). Rene data – logikken ligger i night.js/day.js.
//
// first / other : nattsteg (kind) første natt / andre netter
//   kind        : pingPair | chef | empath | fortune | poison | protect | master | demonKill |
//                 ravenkeeper | undertaker | grimoire
//   when        : betingelse for at steget vises (se night.js: CONDITIONS)
//   whenDead    : steget gjelder selv om spilleren er død
// setup         : hva setup-veiviseren må spørre om (drunk | redHerring)
// setupModifier : endring i sammensetning (Baron)
// registers     : hva rollen kan registrere som (Spy/Recluse)
// day           : dagsevne (virgin | slayer | butler)
// passive       : passive regler (soldier | mayor | saint | scarletwoman)
// drunkLike     : spilleren tror de er en annen rolle, og evnen virker ikke

export const DEFS = {
  // Trouble Brewing – Townsfolk
  washerwoman: { first: { kind: 'pingPair', team: 'townsfolk' } },
  librarian: { first: { kind: 'pingPair', team: 'outsider', allowNone: true } },
  investigator: { first: { kind: 'pingPair', team: 'minion' } },
  chef: { first: { kind: 'chef' } },
  empath: { first: { kind: 'empath' }, other: { kind: 'empath' } },
  fortuneteller: { first: { kind: 'fortune' }, other: { kind: 'fortune' }, setup: 'redHerring' },
  undertaker: { other: { kind: 'undertaker', when: 'executedToday' } },
  monk: { other: { kind: 'protect' } },
  ravenkeeper: { other: { kind: 'ravenkeeper', when: 'diedTonight', whenDead: true } },
  virgin: { day: 'virgin' },
  slayer: { day: 'slayer' },
  soldier: { passive: 'soldier' },
  mayor: { passive: 'mayor' },

  // Trouble Brewing – Outsiders
  butler: { first: { kind: 'master' }, other: { kind: 'master' }, day: 'butler' },
  drunk: { setup: 'drunk', drunkLike: true },
  recluse: { registers: ['evil', 'minion', 'demon'] },
  saint: { passive: 'saint' },

  // Trouble Brewing – Minions
  poisoner: { first: { kind: 'poison' }, other: { kind: 'poison' } },
  spy: { first: { kind: 'grimoire' }, other: { kind: 'grimoire' }, registers: ['good', 'townsfolk', 'outsider'] },
  scarletwoman: { passive: 'scarletwoman' },
  baron: { setupModifier: { outsider: 2, townsfolk: -2 } },

  // Trouble Brewing – Demon
  imp: { other: { kind: 'demonKill', when: 'notNewDemon' } },
};

export const TROUBLE_BREWING = {
  id: 'tb',
  name: 'Trouble Brewing',
  author: 'The Pandemonium Institute',
  builtIn: true,
  characters: [
    'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker',
    'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor',
    'butler', 'drunk', 'recluse', 'saint',
    'poisoner', 'spy', 'scarletwoman', 'baron',
    'imp',
  ],
  custom: {},
};
