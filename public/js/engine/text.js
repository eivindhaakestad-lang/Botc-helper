// Tekster som motoren lager: meldinger til elever (språk × stil) og korte rolleforklaringer.
// Rolleforklaringene er egne, omskrevne sammendrag – ikke de offisielle evnetekstene.
// Har Storytelleren importert offisielle tekster, brukes de i stedet (se charInfo().ability).

export const TEAM_LABEL = {
  no: { townsfolk: 'Townsfolk – god', outsider: 'Outsider – god', minion: 'Minion – ond', demon: 'Demon – ond', traveller: 'Traveller' },
  en: { townsfolk: 'Townsfolk – good', outsider: 'Outsider – good', minion: 'Minion – evil', demon: 'Demon – evil', traveller: 'Traveller' },
};

export const TEAM_PLURAL = {
  no: { townsfolk: 'Townsfolk', outsider: 'Outsiders', minion: 'Minions', demon: 'Demoner' },
  en: { townsfolk: 'Townsfolk', outsider: 'Outsiders', minion: 'Minions', demon: 'Demons' },
};

export const SUMMARY = {
  washerwoman: {
    no: 'Første natt får du vite at én av to spillere er en bestemt Townsfolk.',
    en: 'On your first night you learn that one of two players is a particular Townsfolk.',
  },
  librarian: {
    no: 'Første natt får du vite at én av to spillere er en bestemt Outsider (eller at det ikke finnes noen).',
    en: 'On your first night you learn that one of two players is a particular Outsider (or that there are none).',
  },
  investigator: {
    no: 'Første natt får du vite at én av to spillere er en bestemt Minion.',
    en: 'On your first night you learn that one of two players is a particular Minion.',
  },
  chef: {
    no: 'Første natt får du vite hvor mange par onde spillere som sitter rett ved siden av hverandre.',
    en: 'On your first night you learn how many pairs of evil players sit right next to each other.',
  },
  empath: {
    no: 'Hver natt får du vite hvor mange av dine to nærmeste levende naboer som er onde.',
    en: 'Each night you learn how many of your two closest living neighbours are evil.',
  },
  fortuneteller: {
    no: 'Hver natt velger du to spillere og får vite om en av dem er Demon. Én god spiller ser alltid ut som Demon for deg.',
    en: 'Each night you pick two players and learn if either is the Demon. One good player always reads as the Demon to you.',
  },
  undertaker: {
    no: 'Hver natt unntatt den første får du vite rollen til spilleren som ble henrettet samme dag.',
    en: 'Each night except the first, you learn the character of the player executed that day.',
  },
  monk: {
    no: 'Hver natt unntatt den første velger du en annen spiller. Demonen kan ikke drepe dem i natt.',
    en: 'Each night except the first, pick another player. The Demon cannot kill them tonight.',
  },
  ravenkeeper: {
    no: 'Hvis du dør om natten, vekkes du og velger en spiller. Du får vite rollen deres.',
    en: 'If you die at night, you wake to pick a player and learn their character.',
  },
  virgin: {
    no: 'Første gang du blir nominert: er nominatoren en Townsfolk, blir de henrettet med en gang.',
    en: 'The first time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
  },
  slayer: {
    no: 'Én gang i løpet av spillet kan du om dagen peke ut en spiller offentlig. Er de Demon, dør de.',
    en: 'Once per game, during the day, publicly pick a player. If they are the Demon, they die.',
  },
  soldier: {
    no: 'Demonen kan ikke drepe deg.',
    en: 'The Demon cannot kill you.',
  },
  mayor: {
    no: 'Lever det bare tre spillere og ingen blir henrettet, vinner laget ditt. Hvis du skulle dø om natten, kan en annen dø i stedet.',
    en: 'If only three players live and nobody is executed, your team wins. If you would die at night, someone else might die instead.',
  },
  butler: {
    no: 'Hver natt velger du en annen spiller som din mester. I morgen kan du bare stemme hvis mesteren din også stemmer.',
    en: 'Each night pick another player as your master. Tomorrow you may only vote if your master votes too.',
  },
  drunk: {
    no: 'Du vet ikke at du er Drunk. Du tror du er en Townsfolk, men evnen din virker ikke.',
    en: 'You do not know you are the Drunk. You think you are a Townsfolk, but your ability does not work.',
  },
  recluse: {
    no: 'Du kan registrere som ond, og som Minion eller Demon, også når du er død.',
    en: 'You might register as evil, and as a Minion or Demon, even when dead.',
  },
  saint: {
    no: 'Blir du henrettet, taper laget ditt.',
    en: 'If you are executed, your team loses.',
  },
  poisoner: {
    no: 'Hver natt velger du en spiller. De er forgiftet i natt og i morgen.',
    en: 'Each night pick a player. They are poisoned tonight and tomorrow.',
  },
  spy: {
    no: 'Hver natt ser du Grimoiren. Du kan registrere som god, og som Townsfolk eller Outsider.',
    en: 'Each night you see the Grimoire. You might register as good, and as a Townsfolk or Outsider.',
  },
  scarletwoman: {
    no: 'Lever fem eller flere spillere når Demonen dør, blir du den nye Demonen.',
    en: 'If five or more players are alive when the Demon dies, you become the Demon.',
  },
  baron: {
    no: 'Det er to ekstra Outsiders i spill.',
    en: 'There are two extra Outsiders in play.',
  },
  imp: {
    no: 'Hver natt unntatt den første velger du en spiller som dør. Velger du deg selv, dør du, og en Minion blir den nye Impen.',
    en: 'Each night except the first, pick a player to die. If you pick yourself, you die and a Minion becomes the new Imp.',
  },
};

export function summary(id, lang, info) {
  if (info && info.ability) return info.ability;
  return (SUMMARY[id] && SUMMARY[id][lang]) || '';
}

function list(lang, names) {
  if (names.length <= 1) return names.join('');
  const and = lang === 'no' ? ' og ' : ' and ';
  return names.slice(0, -1).join(', ') + and + names[names.length - 1];
}

// Meldingsmaler. Hver mal: (params) => tekst. 'flavor' faller tilbake til 'short' hvis den mangler.
const M = {
  no: {
    short: {
      roleCard: (p) => `🎭 Rollen din: ${p.char} (${p.team})\n${p.summary}`,
      ping: (p) => `🕵️ Enten ${p.a} eller ${p.b} er ${p.char}.`,
      pingNone: (p) => `🕵️ Det er ingen ${p.teamPlural} i spill.`,
      chef: (p) => `🍳 Antall par onde spillere som sitter ved siden av hverandre: ${p.n}.`,
      empath: (p) => `💜 Antall onde blant dine to nærmeste levende naboer: ${p.n}.`,
      fortune: (p) => `🔮 Du valgte ${p.a} og ${p.b}. Svar: ${p.yes ? 'JA – en av dem er Demon.' : 'NEI – ingen av dem er Demon.'}`,
      ravenkeeper: (p) => `🐦 ${p.a} er ${p.char}.`,
      undertaker: (p) => `⚰️ ${p.a}, som ble henrettet i dag, var ${p.char}.`,
      ackPoison: (p) => `☠️ Mottatt: du forgifter ${p.a} i natt.`,
      ackProtect: (p) => `🛡️ Mottatt: du beskytter ${p.a} i natt.`,
      ackMaster: (p) => `🎩 Mottatt: ${p.a} er mesteren din. I morgen kan du bare stemme hvis ${p.a} også stemmer.`,
      ackKill: (p) => `🗡️ Mottatt: du angriper ${p.a} i natt.`,
      grimoire: (p) => `📖 Grimoiren i natt:\n${p.list}`,
      minionInfo: (p) => `😈 Du er ond. Demonen er ${p.demon}.` + (p.others.length ? ` De andre Minions er ${list('no', p.others)}.` : ' Du er eneste Minion.'),
      demonInfo: (p) => `😈 Dine Minions: ${list('no', p.minions)}.\nTre gode roller som ikke er i spill (bluffs): ${list('no', p.bluffs)}.`,
      becameDemon: (p) => `🔥 Du er nå ${p.char}. Fra i natt er det du som dreper.`,
      dawnDeaths: (p) => `☀️ God morgen! I natt døde: ${list('no', p.names)}.`,
      dawnNone: () => '☀️ God morgen! Ingen døde i natt.',
      executed: (p) => `⚖️ ${p.a} er henrettet og dør.`,
      executedNoDeath: (p) => `⚖️ ${p.a} er henrettet, men dør ikke.`,
      noExecution: () => '⚖️ Ingen ble henrettet i dag.',
      virginTrigger: (p) => `⚡ ${p.a} nominerte Virgin og blir henrettet med en gang.`,
      slayerHit: (p) => `🏹 ${p.a} dør.`,
      slayerMiss: () => '🏹 Ingenting skjer.',
      chooseTarget: () => '👆 Velg én spiller.',
      choosePoison: () => '☠️ Velg én spiller som skal forgiftes i natt.',
      chooseProtect: () => '🛡️ Velg én spiller du vil beskytte i natt (ikke deg selv).',
      chooseMaster: () => '🎩 Velg mesteren din for i morgen (ikke deg selv).',
      chooseKill: () => '🗡️ Velg én spiller som skal dø i natt. Velger du deg selv, dør du, og en Minion blir ny Demon.',
      chooseFortune: () => '🔮 Velg to spillere. Du får vite om en av dem er Demon.',
      chooseRaven: () => '🐦 Du døde i natt. Velg én spiller – du får vite rollen deres.',
      gameEnd: (p) => (p.winner === 'good' ? '🏆 Det gode laget vinner!' : '🏆 Det onde laget vinner!'),
    },
    flavor: {
      roleCard: (p) => `🎭 Velkommen til Ravenswood Bluff. Du er ${p.char} (${p.team}).\n${p.summary}\nHold rollen din hemmelig – eller lat som noe annet.`,
      ping: (p) => `🌙 Natten hvisker til deg: enten ${p.a} eller ${p.b} er ${p.char}.`,
      pingNone: (p) => `🌙 Du lette hele natten, men fant ingen ${p.teamPlural} i byen.`,
      chef: (p) => `🍳 Du smakte på byens gryter i natt. Par av onde spillere som sitter side om side: ${p.n}.`,
      empath: (p) => `💜 Du kjenner etter hvem som sitter nærmest deg. Onde naboer: ${p.n}.`,
      fortune: (p) => `🔮 Krystallkula flimrer over ${p.a} og ${p.b} … ${p.yes ? 'JA. Du ser Demonen der.' : 'NEI. Ingen Demon her.'}`,
      ravenkeeper: (p) => `🐦 Med ditt siste åndedrag ser du sannheten: ${p.a} er ${p.char}.`,
      undertaker: (p) => `⚰️ Du stelte den henrettede ${p.a} for graven. Det var ${p.char}.`,
      ackPoison: (p) => `☠️ Giften er blandet. ${p.a} blir forgiftet i natt.`,
      ackProtect: (p) => `🛡️ Du ber over ${p.a}. Demonen kan ikke ta dem i natt.`,
      ackMaster: (p) => `🎩 Du bøyer deg for ${p.a}. I morgen stemmer du bare hvis ${p.a} stemmer.`,
      ackKill: (p) => `🗡️ Skyggene beveger seg mot ${p.a} …`,
      grimoire: (p) => `📖 Du sniker deg inn og leser Grimoiren:\n${p.list}`,
      minionInfo: (p) => `😈 Mørket samler seg. Din Demon er ${p.demon}.` + (p.others.length ? ` Dine medsammensvorne: ${list('no', p.others)}.` : ' Du står alene som Minion.'),
      demonInfo: (p) => `😈 Dine tjenere: ${list('no', p.minions)}.\nGode roller som ikke er i byen – bruk dem som forkledning: ${list('no', p.bluffs)}.`,
      becameDemon: (p) => `🔥 Demonen har falt, men mørket lever videre i deg. Du er nå ${p.char}.`,
      dawnDeaths: (p) => `☀️ Solen står opp over Ravenswood Bluff. I natt døde: ${list('no', p.names)}.`,
      dawnNone: () => '☀️ Solen står opp over Ravenswood Bluff. Alle overlevde natten.',
      choosePoison: () => '☠️ Giftflasken ligger klar. Hvem skal få en dråpe i natt?',
      chooseKill: () => '🗡️ Byen sover. Hvem tar du i natt? (Velger du deg selv, går mørket videre til en Minion.)',
      chooseFortune: () => '🔮 Krystallkula venter. Velg to spillere å se nærmere på.',
      chooseRaven: () => '🐦 Med ditt siste åndedrag kan du se én sannhet. Velg en spiller.',
    },
  },
  en: {
    short: {
      roleCard: (p) => `🎭 Your character: ${p.char} (${p.team})\n${p.summary}`,
      ping: (p) => `🕵️ Either ${p.a} or ${p.b} is the ${p.char}.`,
      pingNone: (p) => `🕵️ There are no ${p.teamPlural} in play.`,
      chef: (p) => `🍳 Pairs of evil players sitting next to each other: ${p.n}.`,
      empath: (p) => `💜 Evil players among your two closest living neighbours: ${p.n}.`,
      fortune: (p) => `🔮 You chose ${p.a} and ${p.b}. Answer: ${p.yes ? 'YES – one of them is the Demon.' : 'NO – neither is the Demon.'}`,
      ravenkeeper: (p) => `🐦 ${p.a} is the ${p.char}.`,
      undertaker: (p) => `⚰️ ${p.a}, who was executed today, was the ${p.char}.`,
      ackPoison: (p) => `☠️ Got it: you poison ${p.a} tonight.`,
      ackProtect: (p) => `🛡️ Got it: you protect ${p.a} tonight.`,
      ackMaster: (p) => `🎩 Got it: ${p.a} is your master. Tomorrow you may only vote if ${p.a} votes too.`,
      ackKill: (p) => `🗡️ Got it: you attack ${p.a} tonight.`,
      grimoire: (p) => `📖 The Grimoire tonight:\n${p.list}`,
      minionInfo: (p) => `😈 You are evil. The Demon is ${p.demon}.` + (p.others.length ? ` The other Minions are ${list('en', p.others)}.` : ' You are the only Minion.'),
      demonInfo: (p) => `😈 Your Minions: ${list('en', p.minions)}.\nThree good characters not in play (bluffs): ${list('en', p.bluffs)}.`,
      becameDemon: (p) => `🔥 You are now the ${p.char}. From tonight, you are the one who kills.`,
      dawnDeaths: (p) => `☀️ Good morning! Died tonight: ${list('en', p.names)}.`,
      dawnNone: () => '☀️ Good morning! Nobody died tonight.',
      executed: (p) => `⚖️ ${p.a} is executed and dies.`,
      executedNoDeath: (p) => `⚖️ ${p.a} is executed, but does not die.`,
      noExecution: () => '⚖️ Nobody was executed today.',
      virginTrigger: (p) => `⚡ ${p.a} nominated the Virgin and is executed immediately.`,
      slayerHit: (p) => `🏹 ${p.a} dies.`,
      slayerMiss: () => '🏹 Nothing happens.',
      chooseTarget: () => '👆 Choose one player.',
      choosePoison: () => '☠️ Choose one player to poison tonight.',
      chooseProtect: () => '🛡️ Choose one player to protect tonight (not yourself).',
      chooseMaster: () => '🎩 Choose your master for tomorrow (not yourself).',
      chooseKill: () => '🗡️ Choose one player to die tonight. If you choose yourself, you die and a Minion becomes the new Demon.',
      chooseFortune: () => '🔮 Choose two players. You learn whether either is the Demon.',
      chooseRaven: () => '🐦 You died tonight. Choose one player – you learn their character.',
      gameEnd: (p) => (p.winner === 'good' ? '🏆 The good team wins!' : '🏆 The evil team wins!'),
    },
    flavor: {
      roleCard: (p) => `🎭 Welcome to Ravenswood Bluff. You are the ${p.char} (${p.team}).\n${p.summary}\nKeep it secret – or pretend to be someone else.`,
      ping: (p) => `🌙 The night whispers to you: either ${p.a} or ${p.b} is the ${p.char}.`,
      pingNone: (p) => `🌙 You searched all night, but found no ${p.teamPlural} in town.`,
      chef: (p) => `🍳 You tasted every pot in town tonight. Pairs of evil players seated side by side: ${p.n}.`,
      empath: (p) => `💜 You sense the people closest to you. Evil neighbours: ${p.n}.`,
      fortune: (p) => `🔮 The crystal ball flickers over ${p.a} and ${p.b} … ${p.yes ? 'YES. You see the Demon there.' : 'NO. No Demon here.'}`,
      ravenkeeper: (p) => `🐦 With your last breath you see the truth: ${p.a} is the ${p.char}.`,
      undertaker: (p) => `⚰️ You prepared ${p.a} for the grave. They were the ${p.char}.`,
      ackPoison: (p) => `☠️ The poison is mixed. ${p.a} is poisoned tonight.`,
      ackProtect: (p) => `🛡️ You pray over ${p.a}. The Demon cannot take them tonight.`,
      ackMaster: (p) => `🎩 You bow to ${p.a}. Tomorrow you only vote if ${p.a} votes.`,
      ackKill: (p) => `🗡️ The shadows creep towards ${p.a} …`,
      grimoire: (p) => `📖 You sneak in and read the Grimoire:\n${p.list}`,
      minionInfo: (p) => `😈 Darkness gathers. Your Demon is ${p.demon}.` + (p.others.length ? ` Your fellow conspirators: ${list('en', p.others)}.` : ' You stand alone as a Minion.'),
      demonInfo: (p) => `😈 Your servants: ${list('en', p.minions)}.\nGood characters not in town – use them as disguises: ${list('en', p.bluffs)}.`,
      becameDemon: (p) => `🔥 The Demon has fallen, but the darkness lives on in you. You are now the ${p.char}.`,
      dawnDeaths: (p) => `☀️ The sun rises over Ravenswood Bluff. Died tonight: ${list('en', p.names)}.`,
      dawnNone: () => '☀️ The sun rises over Ravenswood Bluff. Everyone survived the night.',
      choosePoison: () => '☠️ The poison bottle is ready. Who gets a drop tonight?',
      chooseKill: () => '🗡️ The town sleeps. Who do you take tonight? (Choose yourself and the darkness passes to a Minion.)',
      chooseFortune: () => '🔮 The crystal ball awaits. Choose two players to look into.',
      chooseRaven: () => '🐦 With your last breath you may see one truth. Choose a player.',
    },
  },
};

export function msg(lang, style, key, params = {}) {
  const L = M[lang] || M.no;
  const fn = (L[style] && L[style][key]) || L.short[key];
  return fn ? fn(params) : '';
}

export { list as joinNames };
