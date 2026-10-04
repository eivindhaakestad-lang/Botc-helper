// Elevvisningen: velg plass, se rollen din, motta kort fra Storytelleren, svar på valg
// og spill drømmespillet om natten. Viser aldri noe hemmelig uten at eleven holder inne / trykker.

import { h, toast } from '../app/dom.js';
import { LiveClient } from '../live/client.js';
import { DreamGame } from './dream.js';
import { revealCircle, CHEER_MS, SAD_MS } from '../live/reveal.js';
import { podium } from '../live/podium.js';
import { pickCircle } from '../live/pickcircle.js';
import { voteCircle, tickVoteCircle, lockAt, tieLine, voteTotal } from '../live/voteclock.js';
import { sfx, enableSound, disableSound, soundEnabled } from '../live/sound.js';
import { applyTheme } from '../live/theme.js';
import { recapCircle, recapList } from '../live/recapview.js';
import { playRevealCine, REVEAL_CINE_MS } from '../screen/cine.js';
import { setLooks, setChampionFromBoard, championSeat, seatSheep, seatLook, sheepDisc, sheepImg, frameEl } from '../live/sheep.js';
import { wallet } from './wallet.js';
import { creatorView, shopView, creatorKey, coinBurst, resetWardrobe, fmtCoins } from './wardrobe.js';

const TXT = {
  no: {
    title: 'Botc Helper', enterCode: 'Skriv inn romkoden fra tavla', join: 'Bli med', connecting: 'Kobler til …', reconnecting: 'Mistet forbindelsen – prøver igjen …',
    pickSeat: 'Trykk på navnet ditt', taken: 'Tatt', locked: 'Rommet er låst. Spør Storytelleren.', seatTaken: 'Plassen er allerede tatt.', noseat: 'Fant ikke plassen.',
    released: 'Storytelleren frigjorde plassen din. Velg på nytt.', closed: 'Spillet er avsluttet. Takk for nå!', noroom: 'Fant ikke rommet. Sjekk koden.',
    setup: 'Venter på at spillet starter …', night: 'Natt', day: 'Dag', ended: 'Spillet er slutt', nightSub: 'Byen sover. Storytelleren vekker deg hvis du skal gjøre noe.',
    daySub: 'Diskuter, nominer og stem.', holdRole: 'Hold inne for å se rollen din', roleHidden: 'Rollen din er skjult', noRole: 'Du har ikke fått rolle ennå.',
    playDream: 'Spill drømmespill', dreamClosed: 'Drømmespillet åpner når natten kommer.', back: 'Tilbake',
    messages: 'Mine meldinger', noMessages: 'Ingen meldinger ennå.', holdRead: 'Hold inne for å lese', tapShow: 'Trykk for å vise', hide: 'Skjul',
    wake: 'Storytelleren vekker deg', read: 'Jeg har lest', send: 'Send valg', chooseN: 'Velg {n}', decoy: '🌙 Ingenting skjer. Du sover videre.', ok: 'OK',
    town: 'Byen', alive: 'lever', dead: 'død', ghost: 'ghost vote', board: 'Drømmetoppliste', noScores: 'Ingen har hoppet over hinder ennå.',
    sheep: 'Hinder', best: 'Din rekord', start: 'Trykk eller mellomrom for å hoppe', woke: 'Du våknet!', sheepCounted: 'hinder', eagle: '🦅 Ørn! Ikke hopp – løp under!', pu_rocket: '🚀 Raketter! De neste 3 hindrene sprenges', pu_shield: '🛡 Skjold! Du tåler ett treff', pu_jet: '🎆 Superhopp! Du flyr over 10 hinder', pu_slow: '⏱ Sakte tid!', pu_double: '✨ Dobbel poeng i 20 sekunder!', again: 'Trykk for å prøve igjen', paused: 'Pause',
    morning: 'Solen står opp – drømmen er over.', you: 'Du', answered: 'Svar sendt', winnerGood: 'Det gode laget vinner!', winnerEvil: 'Det onde laget vinner!',
    reveal: 'Rollene var', leave: 'Bytt plass', revealTitle: 'Grim reveal', revealWait: 'Storytelleren avslører rollene …',
    beforeGame: 'Før spillet', raiseHand: '✋ Rekk opp hånden', lowerHand: 'Ta ned hånden', handPos: 'Hånden din er oppe – du er nr. {n}', handQueue: 'Talerekkefølge',
    voteTitle: '{a} nominerte {b}', voteYes: '✋ Jeg stemmer for å henrette', voteUndo: '✓ Du stemmer – trykk for å angre', voteOpen: 'Stem nå!',
    voteClosed: 'Avstemningen er lukket', voteCount: '{n} av {need} stemmer trengs', ghostWarn: 'Du er død: dette bruker din ene ghost vote.',
    noGhost: 'Du har brukt ghost vote-en din og kan ikke stemme.', onBlock: 'På blokka: {name} ({n} stemmer)', nomsToday: 'Nominasjoner i dag', executedToday: 'Henrettet i dag: {name}',
    nominator: 'nominerer', nominee: 'nominert', startsIn: 'Viseren starter om', handAt: 'Viseren er hos', voteBefore: 'Stem før viseren når deg!',
    lockedYes: '🔒 Stemmen din er låst: du stemte for', lockedNo: '🔒 Viseren har passert deg: du stemte ikke', votelocked: 'For sent – viseren har passert deg.',
    timer: 'Tid', timeUp: 'Tiden er ute!', sound: 'Lyd',
    lastMsg: 'Hold inne for å se siste melding', noMsgYet: 'Du har ikke fått melding ennå.', chat: 'Chat', chatSt: 'Storyteller',
    chatPlaceholder: 'Skriv til {name} …', chatSend: 'Send', chatEmpty: 'Ingen meldinger ennå.', chatStHelp: 'Bare Storytelleren ser dette.',
    chatNbHelp: 'Bare {name} og Storytelleren ser dette.', chatClosed: 'Naboprat er stengt akkurat nå.', chatnotneighbour: 'Du kan bare skrive til naboene dine.', chatclosed: 'Naboprat er stengt akkurat nå.',
    newChat: 'Ny melding fra {name}', proposeNom: 'Foreslå nominasjon', propHelp: 'Trykk på spilleren du vil nominere. Storytelleren godkjenner forslaget.', propTap: 'Velg en spiller', propSend: 'Send forslag', propSent: 'Forslaget er sendt til Storytelleren', propWaiting: 'Du foreslår å nominere {name} – venter på Storytelleren.', propDead: 'Døde spillere kan ikke nominere.', propAlready: 'Du har allerede nominert i dag.', propFail: 'Forslaget ble ikke sendt.', cancel: 'Avbryt', champs: 'Drømmemestere', stAlive: 'Du lever', stDeadGhost: 'Du er død – du har 1 ghost vote igjen', stDeadNoGhost: 'Du er død – ghost vote-en er brukt', stOnBlock: 'Du er på blokka', notes: 'Notater', notesDone: 'Ferdig', notesHelp: 'Bare du ser notatene dine. Marker hva du tror om hver spiller.', noteMark: 'God, ond eller usikker', noteRole: 'Rollen de sier de har', notePh: 'Notat …', grimIntro: 'Du får se grimoiren i natt.', grimOpen: 'Åpne grimoiren', grimTitle: 'Grimoiren', grimSecret: 'Hemmelig – bare du ser dette', script: 'Script', showScript: 'Se scriptet – alle roller', noScript: 'Storytelleren har ikke delt scriptet ennå.', team_townsfolk: 'Townsfolk (gode)', team_outsider: 'Outsiders (gode)', team_minion: 'Minions (onde)', team_demon: 'Demon (ond)', team_traveller: 'Travellers', shotFired: '{a} skyter mot {b} …', shotHit: '{b} dør!', shotMiss: 'Ingenting skjer.', tieWith: '{tie} = uavgjort med {block} (ingen dør)', tieStill: '{tie} = fortsatt uavgjort (ingen dør)', needFor: '{need} = {name} på blokka', dawnPending: 'Byen våkner … Storytelleren forteller snart hva som skjedde i natt.', rolesOut: 'Rollene er delt ut! Hold inne for å se din.', recap: 'Slik gikk det egentlig', tip: 'Tips:', myGrim: 'Min grim', whoWas: 'Hvem var hvem?', makeSheep: 'Lag sauen din', editSheep: 'Endre sauen', makeSheepHelp: 'Bytt ansikt med pilene og velg farge under. Sauen din vises i sirkelen for alle.', prevFace: 'Forrige ansikt', nextFace: 'Neste ansikt', face: 'Ansikt', color: 'Farge', random: 'Tilfeldig', done: 'Ferdig', moreInShop: 'Flere farger, ansikter, hatter, sko, spor og kjæledyr finner du i Saueboden.', shop: 'Saueboden', shopClosedDay: 'Saueboden er stengt på dagen – nå er det tid for å diskutere! Den åpner igjen når natten kommer.', yourCoins: 'Dine mynter', shopHelp: 'Trykk på en ting for å prøve den på sauen din. Mynter tjener du i drømmespillet: ett hinder = én mynt.', takeOff: 'Ta av', wearing: 'På', wear: 'Ta på', missing: 'Mangler {n}', buyFor: 'Kjøp – {n}', owned: 'Eid', free: 'Gratis', tampered: 'Lommeboka ble endret utenfor spillet, så myntene ble nullstilt.', mySheep: 'Sauen din', youLead: '👑 Du leder drømmetoppen – du har mesterkrona!', shopClosedShort: 'Saueboden åpner i natt', bonusJoin: 'Takk for at du var med!', bonusWin: 'Laget ditt vant!', shRound: 'Drømmerunden din', shopClosing: 'Saueboden stenger – nå er det dag!', coinsWord: 'mynter', backHome: 'Tilbake', close: 'Lukk', myGrimHelp: 'Trykk på en spiller for å notere', markGood: 'God', markEvil: 'Ond', markUnsure: 'Usikker',
    pu_magnet: '🧲 Magnet! Myntene flyr til deg i 15 sekunder', newRecord: '🎆 NY REKORD! 🎆', recordShort: 'Ny rekord!', coinsHud: 'Mynter', dealTitle: 'Dagens tilbud', dealSee: 'Se tilbudet', dealBought: 'Kjøpt – nytt tilbud i morgen', dealHelp: 'Ett nytt tilbud hver dag', sell: 'Bytt inn', sellFor: 'Bytt inn (+{n})', sellSure: 'Sikker? Trykk igjen (+{n})', sold: 'Byttet inn! +{n} mynter', fxTry: '▶ Se igjen', fxHelp: 'Slik dør sauen din på storskjermen.', cheatOk: 'Juksekode!',
  },
  en: {
    title: 'Botc Helper', enterCode: 'Type the room code from the board', join: 'Join', connecting: 'Connecting …', reconnecting: 'Lost connection – retrying …',
    pickSeat: 'Tap your name', taken: 'Taken', locked: 'The room is locked. Ask the Storyteller.', seatTaken: 'That seat is already taken.', noseat: 'Seat not found.',
    released: 'The Storyteller released your seat. Pick again.', closed: 'The game has ended. Thanks for playing!', noroom: 'Room not found. Check the code.',
    setup: 'Waiting for the game to start …', night: 'Night', day: 'Day', ended: 'Game over', nightSub: 'The town sleeps. The Storyteller wakes you if you have something to do.',
    daySub: 'Discuss, nominate and vote.', holdRole: 'Press and hold to see your character', roleHidden: 'Your character is hidden', noRole: 'You have no character yet.',
    playDream: 'Play the dream game', dreamClosed: 'The dream game opens when night falls.', back: 'Back',
    messages: 'My messages', noMessages: 'No messages yet.', holdRead: 'Press and hold to read', tapShow: 'Tap to show', hide: 'Hide',
    wake: 'The Storyteller wakes you', read: 'I have read it', send: 'Send choice', chooseN: 'Choose {n}', decoy: '🌙 Nothing happens. You keep sleeping.', ok: 'OK',
    town: 'The town', alive: 'alive', dead: 'dead', ghost: 'ghost vote', board: 'Dream leaderboard', noScores: 'Nobody has cleared an obstacle yet.',
    sheep: 'Obstacles', best: 'Your best', start: 'Tap or press space to jump', woke: 'You woke up!', sheepCounted: 'obstacles', eagle: '🦅 Eagle! Don’t jump – run under it!', pu_rocket: '🚀 Rockets! The next 3 obstacles get blown up', pu_shield: '🛡 Shield! You survive one hit', pu_jet: '🎆 Super jump! You fly over 10 obstacles', pu_slow: '⏱ Slow time!', pu_double: '✨ Double points for 20 seconds!', again: 'Tap to try again', paused: 'Paused',
    morning: 'The sun rises – the dream is over.', you: 'You', answered: 'Choice sent', winnerGood: 'Good wins!', winnerEvil: 'Evil wins!',
    reveal: 'The characters were', leave: 'Change seat', revealTitle: 'Grim reveal', revealWait: 'The Storyteller is revealing the characters …',
    beforeGame: 'Before the game', raiseHand: '✋ Raise your hand', lowerHand: 'Lower your hand', handPos: 'Your hand is up – you are no. {n}', handQueue: 'Speaking order',
    voteTitle: '{a} nominated {b}', voteYes: '✋ I vote to execute', voteUndo: '✓ You are voting – tap to undo', voteOpen: 'Vote now!',
    voteClosed: 'The vote is closed', voteCount: '{n} of {need} votes needed', ghostWarn: 'You are dead: this uses your one ghost vote.',
    noGhost: 'You have used your ghost vote and cannot vote.', onBlock: 'On the block: {name} ({n} votes)', nomsToday: 'Nominations today', executedToday: 'Executed today: {name}',
    nominator: 'nominates', nominee: 'nominated', startsIn: 'The hand starts in', handAt: 'The hand is at', voteBefore: 'Vote before the hand reaches you!',
    lockedYes: '🔒 Your vote is locked: you voted yes', lockedNo: '🔒 The hand has passed you: you did not vote', votelocked: 'Too late – the hand has passed you.',
    timer: 'Time', timeUp: 'Time is up!', sound: 'Sound',
    lastMsg: 'Press and hold to see your latest message', noMsgYet: 'You have not received a message yet.', chat: 'Chat', chatSt: 'Storyteller',
    chatPlaceholder: 'Write to {name} …', chatSend: 'Send', chatEmpty: 'No messages yet.', chatStHelp: 'Only the Storyteller sees this.',
    chatNbHelp: 'Only {name} and the Storyteller see this.', chatClosed: 'Neighbour chat is closed right now.', chatnotneighbour: 'You can only write to your neighbours.', chatclosed: 'Neighbour chat is closed right now.',
    newChat: 'New message from {name}', proposeNom: 'Propose a nomination', propHelp: 'Tap the player you want to nominate. The Storyteller approves the proposal.', propTap: 'Pick a player', propSend: 'Send proposal', propSent: 'The proposal was sent to the Storyteller', propWaiting: 'You propose to nominate {name} – waiting for the Storyteller.', propDead: 'Dead players cannot nominate.', propAlready: 'You have already nominated today.', propFail: 'The proposal was not sent.', cancel: 'Cancel', champs: 'Dream champions', stAlive: 'You are alive', stDeadGhost: 'You are dead – you have 1 ghost vote left', stDeadNoGhost: 'You are dead – your ghost vote is used', stOnBlock: 'You are on the block', notes: 'Notes', notesDone: 'Done', notesHelp: 'Only you see your notes. Mark what you think about each player.', noteMark: 'Good, evil or unsure', noteRole: 'The character they claim', notePh: 'Note …', grimIntro: 'You get to see the Grimoire tonight.', grimOpen: 'Open the Grimoire', grimTitle: 'Grimoire', grimSecret: 'Secret – only you can see this', script: 'Script', showScript: 'See the script – all characters', noScript: 'The Storyteller has not shared the script yet.', team_townsfolk: 'Townsfolk (good)', team_outsider: 'Outsiders (good)', team_minion: 'Minions (evil)', team_demon: 'Demon (evil)', team_traveller: 'Travellers', shotFired: '{a} shoots at {b} …', shotHit: '{b} dies!', shotMiss: 'Nothing happens.', tieWith: '{tie} = tie with {block} (nobody dies)', tieStill: '{tie} = still a tie (nobody dies)', needFor: '{need} = {name} on the block', dawnPending: 'The town wakes up … The Storyteller will soon tell what happened last night.', rolesOut: 'Characters are out! Press and hold to see yours.', recap: 'What really happened', tip: 'Tip:', myGrim: 'My grim', whoWas: 'Who was who?', makeSheep: 'Make your sheep', editSheep: 'Change sheep', makeSheepHelp: 'Switch faces with the arrows and pick a colour below. Your sheep is shown in the circle for everyone.', prevFace: 'Previous face', nextFace: 'Next face', face: 'Face', color: 'Colour', random: 'Random', done: 'Done', moreInShop: 'More colours, faces, hats, shoes, trails and pets in the Sheep Shop.', shop: 'Sheep Shop', shopClosedDay: 'The Sheep Shop is closed during the day – time to discuss! It opens again when night falls.', yourCoins: 'Your coins', shopHelp: 'Tap something to try it on your sheep. You earn coins in the dream game: one obstacle = one coin.', takeOff: 'Take off', wearing: 'On', wear: 'Wear', missing: 'Need {n} more', buyFor: 'Buy – {n}', owned: 'Owned', free: 'Free', tampered: 'Your wallet was changed outside the game, so your coins were reset.', mySheep: 'Your sheep', youLead: '👑 You lead the dream board – you wear the champion crown!', shopClosedShort: 'The Sheep Shop opens tonight', bonusJoin: 'Thanks for playing!', bonusWin: 'Your team won!', shRound: 'Your dream run', shopClosing: 'The Sheep Shop closes – it is daytime!', coinsWord: 'coins', backHome: 'Back', close: 'Close', myGrimHelp: 'Tap a player to take notes', markGood: 'Good', markEvil: 'Evil', markUnsure: 'Unsure',
    pu_magnet: '🧲 Magnet! Coins fly to you for 15 seconds', newRecord: '🎆 NEW RECORD! 🎆', recordShort: 'New record!', coinsHud: 'Coins', dealTitle: 'Deal of the day', dealSee: 'See the deal', dealBought: 'Bought – new deal tomorrow', dealHelp: 'A new deal every day', sell: 'Trade in', sellFor: 'Trade in (+{n})', sellSure: 'Sure? Tap again (+{n})', sold: 'Traded in! +{n} coins', fxTry: '▶ Watch again', fxHelp: 'This is how your sheep dies on the big screen.', cheatOk: 'Cheat code!',
  },
};

const P = {
  code: null, client: null, status: 'connecting', error: null,
  pub: null, room: null, claimed: {},
  me: null, roleCard: null, inbox: [], board: null,
  view: 'home', overlay: [], shown: {}, choiceSel: {}, revealMsg: null,
  dream: null, decoyTimers: [], hands: [], vote: null, timer: null, offset: 0,
  chats: {}, chatTab: 'st', chatDraft: {}, seenShots: new Set(), looks: {},
};

const lang = () => (P.pub && P.pub.lang === 'en' ? 'en' : 'no');
const T = (k, p) => { let s = TXT[lang()][k] || TXT.no[k] || k; if (p) s = s.replace(/\{(\w+)\}/g, (_, x) => p[x]); return s; };
const credKey = () => 'botc-seat-' + P.code;
function loadCred() { try { return JSON.parse(localStorage.getItem(credKey()) || 'null'); } catch { return null; } }
function saveCred(c) { try { if (c) localStorage.setItem(credKey(), JSON.stringify(c)); else localStorage.removeItem(credKey()); } catch { /* */ } }
const seatName = (id) => { const s = P.pub && P.pub.seats.find((x) => x.id === id); return s ? s.names.join(' + ') : '?'; };
const isNight = () => P.pub && P.pub.phase.type === 'night';
// Drømmespillet er åpent før spillet starter og om natten.
const dreamPhase = () => !!(P.pub && (P.pub.phase.type === 'night' || P.pub.phase.type === 'setup') && P.pub.dream !== false);
const myBest = () => { const b = P.board && P.me && P.board.board.find((x) => x.seatId === P.me.seatId); return b ? b.score : 0; };

// ——— tilkobling ———
function connect(code) {
  P.code = code.toUpperCase();
  history.replaceState(null, '', '?room=' + P.code);
  P.client = new LiveClient({
    code: P.code,
    params: { role: 'player' },
    onOpen: () => { const c = loadCred(); if (c) P.client.send({ t: 'resume', seatId: c.seatId, token: c.token }); },
    onStatus: (s) => { P.status = s; render(); },
    onMessage,
  });
  render();
}

function onMessage(m) {
  switch (m.t) {
    case 'public': {
      // Bare nye stemmer i en pågående avstemning? Da tegnes bare stemmekortet på nytt.
      const lp = P.lastPublicMsg;
      P.voteOnly = !!(lp && m.vote && lp.vote && lp.vote.id === m.vote.id && lp.vote.open === m.vote.open
        && JSON.stringify(lp.vote.clock || null) === JSON.stringify(m.vote.clock || null)
        && JSON.stringify([lp.public, lp.hands, lp.timer, lp.room, lp.claimed, lp.dreamReveal, lp.looks]) === JSON.stringify([m.public, m.hands, m.timer, m.room, m.claimed, m.dreamReveal, m.looks]));
      P.lastPublicMsg = m;
      const before = P.pub && P.pub.phase;
      const prevWinner = P.pub ? P.pub.winner || null : undefined;
      const wasHidden = !!(P.pub && P.pub.rolesOut === false);
      const firstPub = !P.pub;
      if (before && before.type !== 'ended' && m.public.phase.type === 'ended') { P.dealAt = Date.now(); playRevealCine(T('revealTitle'), T('whoWas')); }
      P.pub = m.public;
      if (prevWinner !== undefined && P.pub.phase.type === 'ended' && P.pub.winner && P.pub.winner !== prevWinner) {
        P.winAt = Date.now();
        setTimeout(render, SAD_MS + 50);
        setTimeout(render, CHEER_MS + 50);
      }
      P.looks = m.looks || {};
      if (P.me) P.looks[P.me.seatId] = wallet.look; // egen sau vises med en gang
      setLooks(P.looks);
      P.room = m.room;
      P.dreamReveal = m.dreamReveal || 0;
      P.claimed = m.claimed || {};
      P.hands = m.hands || [];
      for (const sh of (P.pub.day && P.pub.day.shots) || []) {
        if (P.seenShots.has(sh.id)) continue;
        P.seenShots.add(sh.id);
        if (firstPub) continue;
        toast('🏹 ' + T('shotFired', { a: seatName(sh.from), b: seatName(sh.to) }));
        sfx.whoosh();
        setTimeout(() => { toast(sh.hit ? '💥 ' + T('shotHit', { b: seatName(sh.to) }) : '💨 ' + T('shotMiss')); if (sh.hit) sfx.hit(); else sfx.thunk(); }, 900);
      }
      const pv = P.vote;
      if (wasHidden && P.pub.rolesOut !== false && P.me) { toast('🎭 ' + T('rolesOut')); sfx.reveal(); }
      P.vote = m.vote || null;
      P.timer = m.timer || null;
      if (m.now) P.offset = m.now - Date.now();
      if (P.vote && P.vote.open && (!pv || pv.id !== P.vote.id || !pv.open)) sfx.gavel();
      const ph = P.pub.phase;
      if (before && P.view === 'dream' && !dreamPhase()) { closeDream(); toast(T('morning')); }
      if (ph.type === 'night' && (!before || before.type !== 'night' || before.number !== ph.number)) planDecoys(ph.number);
      if (ph.type !== 'night') { clearDecoys(); P.overlay = P.overlay.filter((c) => !c.decoy && c.kind !== 'choice'); } // ubesvarte nattvalg er utdatert om dagen
      if (ph.type === 'ended') { P.overlay = []; closeDream(); }
      // Saueboden er stengt på dagen
      if (P.me && (P.view === 'shop' || (P.view === 'creator' && wallet.created)) && !shopOpen()) { P.view = 'home'; resetWardrobe(); toast('🌞 ' + T('shopClosing')); }
      if (ph.type === 'ended' && P.me) setTimeout(payEndBonuses, 0);
      break;
    }
    case 'you':
      P.me = { seatId: m.seatId, token: m.token };
      saveCred(P.me);
      P.roleCard = m.roleCard;
      P.inbox = m.inbox || [];
      P.chats = m.chats || {};
      P.overlay = P.inbox.filter((c) => c.status === 'new');
      P.error = null;
      if (isNight()) planDecoys(P.pub.phase.number);
      sendLook(true);
      if (!wallet.created) { P.view = 'creator'; resetWardrobe(); }
      break;
    case 'role':
      P.roleCard = m.roleCard;
      break;
    case 'card': {
      const i = P.inbox.findIndex((c) => c.id === m.card.id);
      if (i >= 0) P.inbox[i] = m.card; else P.inbox.push(m.card);
      if (m.card.status === 'new' && !P.overlay.some((c) => c.id === m.card.id)) {
        // Et ekte kort fra Storytelleren fjerner eventuelle tomme «falske» meldinger først.
        P.overlay = P.overlay.filter((c) => !c.decoy);
        P.overlay.push(m.card);
        P.shown[m.card.id] = false;
      }
      else if (m.card.status !== 'new') P.overlay = P.overlay.filter((c) => c.id !== m.card.id);
      break;
    }
    case 'chat': {
      const list = P.chats[m.key] || (P.chats[m.key] = []);
      if (!list.some((x) => x.id === m.msg.id)) list.push(m.msg);
      if (P.me && m.msg.from !== P.me.seatId) {
        const who = m.msg.from === 'st' ? T('chatSt') : seatName(m.msg.from);
        if (!(P.view === 'home' && chatKeyFor(P.chatTab) === m.key && document.getElementById('chat-log'))) toast('💬 ' + T('newChat', { name: who }));
        sfx.pop();
      }
      break;
    }
    case 'myProposal':
      P.myProposal = m.nomineeId || null;
      break;
    case 'decoy':
      if (isNight() && P.me && !deepInDream()) pushDecoy(m.id);
      break;
    case 'board': {
      const wasChamp = amChampion();
      P.board = m;
      setChampionFromBoard(m);
      if (P.dream) P.dream.best = Math.max(P.dream.best, myBest());
      if (P.dream && wasChamp !== amChampion()) P.dream.setLook(wallet.look, amChampion());
      if (!wasChamp && amChampion() && P.me) { toast(T('youLead')); sfx.fanfare(); }
      break;
    }
    case 'released':
      saveCred(null); P.me = null; P.roleCard = null; P.inbox = []; P.overlay = []; P.error = 'released';
      break;
    case 'error':
      if (m.code === 'badtoken') { saveCred(null); P.me = null; }
      else if (m.code === 'noghost') toast(T('noGhost'), 'warn');
      else if (m.code === 'votelocked') toast(T('votelocked'), 'warn');
      else if (m.code === 'chatnotneighbour' || m.code === 'chatclosed') toast(T(m.code), 'warn');
      else if (m.code === 'nomprop') toast(T('propFail'), 'warn');
      else P.error = { locked: 'locked', taken: 'seatTaken', noseat: 'noseat', noroom: 'noroom', auth: 'noroom' }[m.code] || null;
      break;
    case 'closed':
      saveCred(null); P.error = 'closed'; P.me = null; closeDream();
      break;
    default:
      break;
  }
  syncPause();
  if (m.t === 'public' && P.voteOnly) { P.voteOnly = false; renderVote(); return; }
  render();
}

// Tegn bare stemmekortet på nytt (billig), ellers hele siden
function renderVote() {
  const old = document.querySelector('#play .vote-card');
  const fresh = old && voteView();
  if (!fresh) { render(); return; }
  old.replaceWith(fresh);
}

// ——— sauen, lommeboka og Saueboden ———
const shopOpen = () => !!(P.pub && P.pub.shop !== false && ['setup', 'night', 'ended'].includes(P.pub.phase.type));
const amChampion = () => !!(P.me && championSeat() === P.me.seatId);
let lookTimer = null;
function sendLook(now = false) {
  clearTimeout(lookTimer);
  if (P.me) { P.looks[P.me.seatId] = wallet.look; setLooks(P.looks); }
  const go = () => { if (P.client && P.me) P.client.send({ t: 'look', look: wallet.look }); };
  if (now) go(); else lookTimer = setTimeout(go, 350);
}
function openShop() {
  if (!P.me) return;
  if (P.dream) closeDream();
  P.view = 'shop';
  render();
  window.scrollTo(0, 0);
}
function openCreator() {
  if (!P.me) return;
  if (P.dream) closeDream();
  resetWardrobe();
  P.view = 'creator';
  render();
  window.scrollTo(0, 0);
}
function wctx() {
  return {
    T, lang: lang(), render, sendLook, open: shopOpen(), champion: amChampion(),
    done: () => { P.view = 'home'; resetWardrobe(); render(); window.scrollTo(0, 0); },
    back: () => backButton(),
  };
}
// Mynter etter spillet: drømmerunde som ikke ble ferdig, deltakelse og vinnerlaget (én gang per spill)
let burstAt = 0;
function queueBurst(res, label) {
  if (!res || !res.add) return;
  const now = Date.now();
  burstAt = Math.max(now + 6200, burstAt + 2300); // etter grim reveal-introen
  setTimeout(() => coinBurst(res, null, label), burstAt - now);
}
function payEndBonuses() {
  if (!P.me || !P.pub || P.pub.phase.type !== 'ended') return;
  const saved = loadDream();
  if (saved && (saved.score > 0 || saved.coinCount > 0)) { saveDream(null); queueBurst(wallet.earn((saved.score || 0) + (saved.coinCount || 0)), T('shRound')); }
  queueBurst(wallet.reward(P.code, 'join', 50), T('bonusJoin'));
  if (Array.isArray(P.pub.winners) && P.pub.winners.includes(P.me.seatId)) queueBurst(wallet.reward(P.code, 'win', 100), T('bonusWin'));
}
function walletChip() {
  return h('button', { id: 'wallet-chip', class: 'wallet-chip', title: T('shop'), 'aria-label': `${fmtCoins(wallet.coins)} ${T('coinsWord')}`, onclick: openShop }, '🪙 ', h('span', { class: 'wallet-num' }, fmtCoins(wallet.coins)));
}
function mySheepRow() {
  const open = shopOpen();
  const champ = amChampion();
  const me = P.pub && P.me && P.pub.seats.find((x) => x.id === P.me.seatId);
  const ghost = !!(me && !me.alive && P.pub.phase.type !== 'ended');
  return h('div', { class: 'my-sheep panel' + (champ ? ' champ' : '') },
    h('button', { class: 'my-sheep-pic', disabled: !open, title: T('editSheep'), onclick: openCreator }, sheepImg(wallet.look, { cls: 'my-sheep-img', champion: champ, ghost, mood: !ghost && isNight() ? 'sleep' : '' }), wallet.look.border ? frameEl(wallet.look.border) : null),
    h('div', { class: 'stack tight grow' },
      h('strong', null, T('mySheep')),
      champ ? h('span', { class: 'champ-note' }, T('youLead')) : null,
      h('span', { class: 'muted small' }, `🪙 ${fmtCoins(wallet.coins)} ${T('coinsWord')}` + (open ? '' : ' · ' + T('shopClosedShort')))),
    h('div', { class: 'row gap wrap my-sheep-btns' },
      h('button', { class: 'btn small', disabled: !open, onclick: openCreator }, '🎨 ' + T('editSheep')),
      h('button', { class: 'btn small primary', disabled: !open, onclick: openShop }, '🛍 ' + T('shop'))));
}

// ——— falske vekkinger ———
function clearDecoys() {
  P.decoyTimers.forEach(clearTimeout);
  P.decoyTimers = [];
}
// Eleven er midt i en god runde i drømmespillet (mer enn 10 poeng): ingen falske vekkinger.
function deepInDream() {
  return !!(P.view === 'dream' && P.dream && P.dream.state === 'running' && P.dream.score > 10);
}

// Tom «falsk» melding: forsvinner av seg selv etter 10 sekunder.
function pushDecoy(id) {
  P.overlay.push({ id, decoy: true });
  setTimeout(() => {
    if (!P.overlay.some((c) => c.id === id)) return;
    P.overlay = P.overlay.filter((c) => c.id !== id);
    syncPause();
    render();
  }, 10000);
}

function planDecoys(night) {
  clearDecoys();
  if (!P.pub || P.pub.decoys === false || !P.me) return;
  const key = `botc-decoy-${P.code}-${night}`;
  let done = 0;
  try { done = Number(localStorage.getItem(key) || 0); } catch { /* */ }
  // Roller som vekkes av Storytelleren får sjeldnere tomme meldinger (0–1), andre 1–2.
  const wakes = !!(P.roleCard && P.roleCard.wakes);
  const want = wakes ? (Math.random() < 0.4 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0);
  const times = [25000 + Math.random() * 70000, 110000 + Math.random() * 120000].slice(0, want);
  times.slice(done).forEach((ms) => {
    P.decoyTimers.push(setTimeout(function fire() {
      if (!isNight() || !P.me) return;
      if (P.overlay.length) { P.decoyTimers.push(setTimeout(fire, 6000)); return; }
      if (!deepInDream()) pushDecoy('decoy-local-' + Date.now());
      try { localStorage.setItem(key, String(++done)); } catch { /* */ }
      syncPause();
      render();
    }, ms));
  });
}

// ——— drømmespill ———
function openDream() {
  if (!dreamPhase()) return;
  P.view = 'dream';
  render();
}
// En runde som avbrytes (dagen kommer, eller eleven går tilbake) lagres og fortsetter neste gang.
const dreamKey = () => `botc-dream-${P.code}-${P.me ? P.me.seatId : ''}`;
function saveDream(snap) { try { if (snap) localStorage.setItem(dreamKey(), JSON.stringify(snap)); else localStorage.removeItem(dreamKey()); } catch { /* */ } }
function loadDream() { try { return JSON.parse(localStorage.getItem(dreamKey()) || 'null'); } catch { return null; } }
function closeDream() {
  if (P.dream) { saveDream(P.dream.snapshot()); P.dream.destroy(); P.dream = null; }
  if (P.view === 'dream') P.view = 'home';
}
function syncPause() {
  if (!P.dream) return;
  if (P.overlay.length) P.dream.pause(); else P.dream.resume();
}

// ——— handlinger på kort ———
function finishCard(card) {
  P.overlay = P.overlay.filter((c) => c.id !== card.id);
  syncPause();
  render();
}
function ack(card) {
  if (!card.decoy) P.client.send({ t: 'ack', cardId: card.id });
  finishCard(card);
}
function choose(card) {
  const sel = P.choiceSel[card.id] || [];
  if (!sel.length) return;
  P.client.send({ t: 'choose', cardId: card.id, choice: sel });
  toast(T('answered'));
  finishCard(card);
}

// Hold-for-å-vise: innholdet vises bare mens eleven holder inne.
function holdReveal(label, content, cls = '') {
  const box = h('div', { class: 'hold ' + cls, tabindex: '0', role: 'button', 'aria-label': label });
  const cover = h('div', { class: 'hold-cover' }, '👁 ' + label);
  const body = h('div', { class: 'hold-body' }, content);
  box.append(cover, body);
  const show = (e) => { if (e) e.preventDefault(); box.classList.add('open'); };
  const hide = () => box.classList.remove('open');
  box.addEventListener('pointerdown', show);
  box.addEventListener('pointerup', hide);
  box.addEventListener('pointerleave', hide);
  box.addEventListener('pointercancel', hide);
  box.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') show(e); });
  box.addEventListener('keyup', hide);
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  return box;
}

// ——— visninger ———
function overlayView() {
  const card = P.overlay[0];
  if (!card) return null;
  let body;
  if (card.decoy) {
    body = [holdReveal(T('holdRead'), h('p', { class: 'card-text' }, T('decoy'))), h('button', { class: 'btn primary big', onclick: () => ack(card) }, T('ok'))];
  } else if (card.kind === 'choice') {
    const open = P.shown[card.id];
    const sel = P.choiceSel[card.id] || [];
    const count = card.choice ? card.choice.count : 1;
    const toggle = (id) => {
      const cur = P.choiceSel[card.id] || [];
      P.choiceSel[card.id] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-count);
      render();
    };
    body = open
      ? [h('p', { class: 'card-text' }, card.text),
        h('p', { class: 'muted small' }, T('chooseN', { n: count })),
        pickCircle({ seats: P.pub.seats, selected: sel, me: P.me.seatId, allowSelf: card.choice.allowSelf, onToggle: toggle, night: isNight(),
          center: h('span', { class: 'pick-count display' }, `${sel.length} / ${count}`) }),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn ghost', onclick: () => { P.shown[card.id] = false; render(); } }, T('hide')),
          h('button', { class: 'btn primary big', disabled: sel.length !== count, onclick: () => choose(card) }, T('send')))]
      : [h('button', { class: 'hold-cover big-cover', onclick: () => { P.shown[card.id] = true; render(); } }, '👁 ' + T('tapShow'))];
  } else if (card.grim) {
    body = [h('p', { class: 'card-text' }, '📖 ' + T('grimIntro')),
      h('button', { class: 'btn big', onclick: () => { P.grimOpen = card; render(); } }, '📖 ' + T('grimOpen')),
      h('button', { class: 'btn primary big', onclick: () => ack(card) }, '✓ ' + T('read'))];
  } else {
    body = [holdReveal(T('holdRead'), h('p', { class: 'card-text' }, card.text)), h('button', { class: 'btn primary big', onclick: () => ack(card) }, '✓ ' + T('read'))];
  }
  return h('div', { class: 'wake-overlay' },
    h('div', { class: 'wake-card' },
      h('p', { class: 'eyebrow' }, '📜 ' + T('wake')),
      h('div', { class: 'stack' }, body)));
}

// Spy: grimoiren som en ordentlig sirkel (bare på Spy-elevens skjerm)
// Stor, tydelig tilbakeknapp (drømmespill, Min grim, script) – Esc virker også
function goHome() { P.view = 'home'; P.noteSeat = null; resetWardrobe(); render(); window.scrollTo(0, 0); }
function backButton(onBack = goHome) {
  return h('button', { class: 'btn primary back-btn', onclick: onBack }, '← ' + T('backHome'));
}
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !P.me) return;
  if (P.grimOpen) { P.grimOpen = null; render(); return; }
  if (P.noteSeat) { P.noteSeat = null; render(); return; }
  if (P.view === 'dream') { closeDream(); render(); return; }
  if (P.view === 'script' || P.view === 'mygrim' || P.view === 'shop' || (P.view === 'creator' && wallet.created)) goHome();
});
// Piltastene bytter ansikt i «lag sauen din»
window.addEventListener('keydown', (e) => { if (P.me && P.view === 'creator' && !(e.target && e.target.closest && e.target.closest('input, textarea'))) creatorKey(e, wctx()); });

function grimSheet() {
  const card = P.grimOpen;
  if (!card || !card.grim) return null;
  const seats = card.grim.seats;
  const n = Math.max(1, seats.length);
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  return h('div', { class: 'grim-sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'grim-sheet-inner' },
      h('div', { class: 'row between' },
        h('span', { class: 'display' }, `📖 ${T('grimTitle')} · ${T('night')} ${card.grim.night}`),
        h('button', { class: 'btn primary back-btn', onclick: () => { P.grimOpen = null; render(); } }, '✕ ' + T('close'))),
      h('div', { class: 'grim spy-grim', style: `--tok:min(110px, ${tok}cqw)` },
        h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
        h('div', { class: 'grim-center' }, h('div', { class: 'center-text' }, h('span', { class: 'muted small' }, T('grimSecret')))),
        seats.map((x, i) => {
          const a = (-90 + (360 / n) * i) * (Math.PI / 180);
          return h('div', { class: 'grim-slot', style: `left:${(50 + 40 * Math.cos(a)).toFixed(2)}%;top:${(50 + 40 * Math.sin(a)).toFixed(2)}%` },
            h('div', { class: `token team-${x.team}${x.alive ? '' : ' dead'}` },
              h('span', { class: 'token-disc' },
                h('span', { class: 'token-icon', 'aria-hidden': 'true' }, x.icon),
                h('span', { class: 'token-char' + (x.character.length > 12 ? ' xlong' : x.character.length > 8 ? ' long' : '') }, x.character),
                x.shown ? h('span', { class: 'token-shown' }, x.shown) : null,
                x.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†')),
              h('span', { class: 'token-label' }, x.name),
              x.reminders.length ? h('span', { class: 'token-rem' }, x.reminders.map((r) => h('span', { class: 'rem' }, r))) : null));
        }))));
}

function phaseBanner() {
  const ph = P.pub.phase;
  if (ph.type === 'night') return h('div', { class: 'phase-hero night' }, h('span', { class: 'display big' }, `🌙 ${T('night')} ${ph.number}`), h('p', { class: 'muted' }, T('nightSub')));
  if (ph.type === 'day') return h('div', { class: 'phase-hero day' }, h('span', { class: 'display big' }, `☀️ ${T('day')} ${ph.number}`),
    P.pub.dawnPending ? h('p', { class: 'strong dawn-wait' }, T('dawnPending')) : P.pub.announcement ? h('p', { class: 'strong announce-play' }, P.pub.announcement) : null,
    h('p', { class: 'muted' }, T('daySub')));
  if (ph.type === 'ended') return h('div', { class: 'phase-hero ended' }, h('span', { class: 'display big' }, '🏁 ' + T('ended')), P.pub.winner ? h('p', { class: 'strong' }, T(P.pub.winner === 'good' ? 'winnerGood' : 'winnerEvil')) : null);
  return h('div', { class: 'phase-hero' }, h('span', { class: 'display big' }, '✦ ' + (P.pub.title || 'Botc Helper')), h('p', { class: 'muted' }, T('setup')));
}

function boardView() {
  const b = P.board;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, '🏃 ' + T('board')),
    b && b.board.length
      ? h('ol', { class: 'board' }, b.board.map((x, i) => h('li', { class: P.me && x.seatId === P.me.seatId ? 'me' : '' }, seatSheep(x.seatId, 'mini-sheep'), h('span', { class: 'grow' }, (i === 0 && x.score > 0 ? '👑 ' : '') + x.name), h('span', { class: 'strong' }, String(x.score)))))
      : h('p', { class: 'muted small' }, T('noScores')));
}

// ——— siste melding (alle har boksen, så ingen ser hvem som har fått noe) ———
function lastMessageView() {
  const last = P.inbox.filter((c) => c.kind !== 'choice').slice(-1)[0];
  return holdReveal(T('lastMsg'), h('p', { class: 'card-text' + (last ? '' : ' muted') }, last ? last.text : T('noMsgYet')), 'msg-hold');
}

// ——— chat ———
// Juksekode: skriver eleven koden i chatten med Storytelleren, får hen 100 000 mynter.
// Meldingen sendes ikke, så den synes ikke i chatten. Bare en sjekksum av koden ligger her,
// så den ikke kan leses rett ut av kildekoden (store/små bokstaver og mellomrom spiller ingen rolle).
const CHEAT_HASH = '1f0yib1';
const CHEAT_COINS = 100000;
function cheatSum(str) { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); }
const isCheat = (text) => cheatSum('ull|' + text.toLowerCase().replace(/\s+/g, '')) === CHEAT_HASH;
function neighbours() {
  const seats = P.pub.seats;
  const n = seats.length;
  const i = seats.findIndex((x) => x.id === P.me.seatId);
  if (i < 0 || n < 2) return [];
  return [...new Set([seats[(i - 1 + n) % n].id, seats[(i + 1) % n].id])].filter((x) => x !== P.me.seatId);
}
function chatKeyFor(tab) {
  if (!P.me) return '';
  return tab === 'st' ? 'st|' + P.me.seatId : [P.me.seatId, tab].sort().join('|');
}
function neighbourChatOpen() {
  return P.pub.chat !== 'off';
}
const readKey = () => 'botc-chatread-' + P.code + '-' + (P.me ? P.me.seatId : '');
function chatRead() { try { return JSON.parse(localStorage.getItem(readKey()) || '{}'); } catch { return {}; } }
function setChatRead(key, n) { try { const r = chatRead(); r[key] = n; localStorage.setItem(readKey(), JSON.stringify(r)); } catch { /* */ } }
function unread(key) {
  const list = P.chats[key] || [];
  const read = chatRead()[key] || 0;
  return list.slice(read).filter((m) => m.from !== P.me.seatId).length;
}

function chatView() {
  const nbs = P.pub.chat === 'off' ? [] : neighbours();
  if (P.chatTab !== 'st' && !nbs.includes(P.chatTab)) P.chatTab = 'st';
  const tab = P.chatTab;
  const key = chatKeyFor(tab);
  const list = P.chats[key] || [];
  setChatRead(key, list.length);
  const isSt = tab === 'st';
  const closed = !isSt && !neighbourChatOpen();
  const who = isSt ? T('chatSt') : seatName(tab);
  const send = () => {
    const text = (P.chatDraft[key] || '').trim();
    if (!text) return;
    if (isSt && isCheat(text)) {
      P.chatDraft[key] = '';
      render();
      sfx.buy();
      coinBurst(wallet.grant(CHEAT_COINS), document.getElementById('chat-log'), '💰 ' + T('cheatOk'));
      return;
    }
    P.client.send({ t: 'chat', to: tab, text: text.slice(0, 500) });
    P.chatDraft[key] = '';
    render();
  };
  queueMicrotask(() => { const el = document.getElementById('chat-log'); if (el) el.scrollTop = el.scrollHeight; });
  return h('div', { class: 'panel chat-box' },
    h('h3', { class: 'section-title' }, '💬 ' + T('chat')),
    h('div', { class: 'segmented chat-tabs' }, ['st', ...nbs].map((id) => {
      const n = unread(chatKeyFor(id));
      return h('button', { type: 'button', class: 'seg' + (id === tab ? ' active' : ''), onclick: () => { P.chatTab = id; render(); } },
        id === 'st' ? '🕯 ' + T('chatSt') : seatName(id), n && id !== tab ? h('span', { class: 'badge' }, String(n)) : null);
    })),
    h('p', { class: 'muted small' }, isSt ? T('chatStHelp') : T('chatNbHelp', { name: who })),
    h('div', { class: 'chat-log', id: 'chat-log' },
      list.length ? list.map((m) => h('div', { class: 'chat-msg' + (m.from === P.me.seatId ? ' mine' : m.from === 'st' ? ' st' : '') },
        h('span', { class: 'chat-meta' }, (m.from === P.me.seatId ? T('you') : m.from === 'st' ? T('chatSt') : seatName(m.from)) + ' · ' + new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })),
        h('span', { class: 'chat-text' }, m.text))) : h('p', { class: 'muted small center' }, T('chatEmpty'))),
    closed ? h('p', { class: 'small warn-text' }, T('chatClosed')) : h('form', { class: 'chat-form', onsubmit: (e) => { e.preventDefault(); send(); } },
      h('textarea', {
        id: 'chat-input', class: 'input', rows: 2, maxlength: 500, placeholder: T('chatPlaceholder', { name: who }), value: P.chatDraft[key] || '',
        oninput: (e) => { P.chatDraft[key] = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
      }),
      h('button', { class: 'btn primary', type: 'submit' }, T('chatSend'))));
}

function blockId() {
  const d = P.pub && P.pub.phase.type === 'day' && P.pub.day;
  return d && d.block && !d.executed ? d.block.nomineeId : null;
}

// ——— scriptet: alle roller med beskrivelse ———
const TEAMS = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];
function scriptView() {
  const sc = P.pub.script;
  const roles = (sc && sc.roles) || [];
  return h('div', { class: 'stack script-view' },
    h('div', { class: 'row between' },
      backButton(),
      h('span', { class: 'display' }, '📜 ' + (sc && sc.name ? sc.name : T('script')))),
    roles.length ? TEAMS.filter((tm) => roles.some((r) => r.team === tm)).map((tm) => h('section', { class: 'panel script-team team-' + tm },
      h('h3', { class: 'section-title' }, T('team_' + tm)),
      h('ul', { class: 'script-roles' }, roles.filter((r) => r.team === tm).map((r) => h('li', null,
        h('span', { class: 'script-name display' }, r.icon ? h('span', { class: 'script-icon', 'aria-hidden': 'true' }, r.icon + ' ') : null, r.name),
        h('span', { class: 'script-text' }, r.text)))))) : h('p', { class: 'muted' }, T('noScript')));
}

// ——— egen status ———
function statusLine() {
  const me = P.me && P.pub.seats.find((x) => x.id === P.me.seatId);
  if (!me || P.pub.phase.type === 'setup') return null;
  const onBlock = blockId() === me.id;
  const txt = me.alive ? T('stAlive') : me.ghostVote ? T('stDeadGhost') : T('stDeadNoGhost');
  return h('div', { class: 'status-line' + (me.alive ? ' alive' : ' dead') + (onBlock ? ' block' : '') },
    h('span', null, me.alive ? '🟢' : '💀'), h('span', { class: 'grow' }, txt),
    onBlock ? h('span', { class: 'strong' }, '💀 ' + T('stOnBlock')) : null,
    me.traveller ? h('span', { class: 'trav-tag' }, `${me.traveller.icon} ${me.traveller.name}`) : null);
}

// ——— diskret notatblokk: egne markeringer per spiller (bare på denne PC-en) ———
const notesKey = () => `botc-notes-${P.code}-${P.me ? P.me.seatId : ''}`;
function loadNotes() { try { return JSON.parse(localStorage.getItem(notesKey()) || '{}'); } catch { return {}; } }
function saveNotes(n) { try { localStorage.setItem(notesKey(), JSON.stringify(n)); } catch { /* */ } }
const MARKS = [null, 'good', 'evil', 'unsure'];
const MARK_ICON = { good: '😇', evil: '😈', unsure: '❓' };

function noteChips(note) {
  if (!note) return null;
  const roles = (P.pub.script && P.pub.script.roles) || [];
  const r = note.role && roles.find((x) => x.id === note.role);
  const parts = [note.mark ? MARK_ICON[note.mark] : '', r ? `${r.icon || ''} ${r.name}` : '', note.text || ''].filter(Boolean);
  return parts.length ? h('span', { class: 'note-chip' }, parts.join(' · ')) : null;
}

function noteEditor(x, notes) {
  const n = notes[x.id] || {};
  const upd = (patch, rerender = true) => { notes[x.id] = { ...n, ...patch }; saveNotes(notes); if (rerender) render(); };
  const roles = (P.pub.script && P.pub.script.roles) || [];
  return h('div', { class: 'note-edit' },
    h('button', { class: 'btn small ghost', title: T('noteMark'), onclick: () => upd({ mark: MARKS[(MARKS.indexOf(n.mark || null) + 1) % MARKS.length] }) }, n.mark ? MARK_ICON[n.mark] : '○'),
    h('select', { class: 'input small', 'aria-label': T('noteRole'), onchange: (e) => upd({ role: e.target.value || null }) },
      h('option', { value: '' }, '—'),
      roles.map((r) => h('option', { value: r.id, selected: n.role === r.id }, `${r.icon || ''} ${r.name}`))),
    h('input', { id: 'note-' + x.id, class: 'input small grow', value: n.text || '', placeholder: T('notePh'), maxlength: 80, oninput: (e) => upd({ text: e.target.value }, false) }));
}

// ——— Min grim: notatblokka som en sirkel med rolle-tokens (som den offisielle appen) ———
const MARK_LABEL = { good: 'markGood', evil: 'markEvil', unsure: 'markUnsure' };
function myGrimView() {
  const notes = loadNotes();
  const seats = P.pub.seats;
  const n = Math.max(1, seats.length);
  const tok = Math.min(26, (257 / n) * 0.7).toFixed(2);
  const roles = (P.pub.script && P.pub.script.roles) || [];
  const me = P.me && P.me.seatId;
  const circle = h('div', { class: 'grim my-grim', style: `--tok:min(92px, ${tok}cqw)` },
    h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'grim-center' }, h('div', { class: 'center-text' },
      h('span', { class: 'display' }, '🎭 ' + T('myGrim')),
      h('span', { class: 'muted small' }, T('myGrimHelp')))),
    seats.map((x, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      const note = notes[x.id] || {};
      const r = note.role && roles.find((y) => y.id === note.role);
      const mine = x.id === me;
      return h('div', { class: 'grim-slot', style: `left:${(50 + 40 * Math.cos(a)).toFixed(2)}%;top:${(50 + 40 * Math.sin(a)).toFixed(2)}%` },
        h('button', {
          type: 'button', class: `token my-token${note.mark ? ' mark-' + note.mark : ''}${r ? ' team-' + r.team : ''}${x.alive ? '' : ' dead'}${mine ? ' me' : ''}`,
          disabled: mine, 'aria-label': x.names.join(' + '),
          onclick: () => { P.noteSeat = x.id; render(); },
        },
        h('span', { class: 'token-disc' },
          r ? h('span', { class: 'token-icon' }, r.icon || '✦') : null,
          r || !seatLook(x.id) ? h('span', { class: 'token-char' + (r && r.name.length > 10 ? ' long' : '') }, r ? r.name : mine ? T('you') : x.names.map((y) => y[0]).join('')) : sheepDisc(x, { night: isNight() }),
          r && seatLook(x.id) ? h('span', { class: 'sheep-badge' }, seatSheep(x.id, 'mini-sheep', { ghost: !x.alive, mood: isNight() && x.alive ? 'sleep' : '' })) : null,
          x.alive || (seatLook(x.id) && !r) ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†'),
          note.mark ? h('span', { class: 'my-mark', 'aria-hidden': 'true' }, MARK_ICON[note.mark]) : null),
        h('span', { class: 'token-label' }, x.names.join(' + ')),
        note.text ? h('span', { class: 'my-note-text' }, note.text) : null));
    }));
  return h('div', { class: 'stack my-grim-view' },
    h('div', { class: 'row between' },
      backButton(),
      h('span', { class: 'muted small' }, T('notesHelp'))),
    circle,
    P.noteSeat ? noteSheet(P.noteSeat, notes, roles) : null);
}

function noteSheet(seatId, notes, roles) {
  const x = P.pub.seats.find((y) => y.id === seatId);
  if (!x) return null;
  const n = notes[seatId] || {};
  const upd = (patch, rerender = true) => { notes[seatId] = { ...(notes[seatId] || {}), ...patch }; saveNotes(notes); if (rerender) render(); };
  const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];
  return h('div', { class: 'note-sheet', role: 'dialog', 'aria-label': x.names.join(' + ') },
    h('div', { class: 'row between' },
      h('h3', { class: 'section-title' }, x.names.join(' + ')),
      h('button', { class: 'btn primary', onclick: () => { P.noteSeat = null; render(); } }, '✓ ' + T('notesDone'))),
    h('div', { class: 'row gap wrap mark-row' },
      [null, 'good', 'evil', 'unsure'].map((m) => h('button', {
        class: 'btn small' + ((n.mark || null) === m ? ' active primary' : ' ghost'), onclick: () => upd({ mark: m }),
      }, m ? `${MARK_ICON[m]} ${T(MARK_LABEL[m])}` : '○'))),
    h('input', { id: 'note-' + seatId, class: 'input', value: n.text || '', placeholder: T('notePh'), maxlength: 80, oninput: (e) => upd({ text: e.target.value }, false) }),
    h('span', { class: 'label' }, T('noteRole')),
    h('div', { class: 'role-grid' }, teams.map((team) => {
      const list = roles.filter((r) => r.team === team);
      if (!list.length) return null;
      return [h('span', { class: 'role-grid-team team-' + team }, T('team_' + team)),
        h('div', { class: 'role-grid-row' }, list.map((r) => h('button', {
          class: 'role-chip team-' + r.team + (n.role === r.id ? ' on' : ''), onclick: () => upd({ role: n.role === r.id ? null : r.id }),
        }, h('span', { class: 'role-chip-icon' }, r.icon || '✦'), h('span', null, r.name))))];
    })));
}

// Kort markering i bylista når noen dør (samme regel som storskjermen)
function freshDeaths() {
  const dead = new Set(P.pub.seats.filter((x) => !x.alive).map((x) => x.id));
  if (!P.deadSeen) { P.deadSeen = dead; P.dying = new Set(); return; }
  const fresh = [...dead].filter((id) => !P.deadSeen.has(id));
  for (const id of [...P.deadSeen]) if (!dead.has(id)) P.deadSeen.delete(id);
  if (!fresh.length) return;
  fresh.forEach((id) => { P.deadSeen.add(id); P.dying.add(id); });
  sfx.death();
  setTimeout(() => { fresh.forEach((id) => P.dying.delete(id)); }, 2100);
}

function townView() {
  freshDeaths();
  const notes = loadNotes();
  return h('div', { class: 'panel' },
    h('div', { class: 'row between' },
      h('h3', { class: 'section-title' }, T('town')),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small my-grim-btn', onclick: () => { P.view = 'mygrim'; P.noteSeat = null; render(); window.scrollTo(0, 0); } }, '🎭 ' + T('myGrim')),
        h('button', { class: 'btn small ghost note-toggle' + (P.notesOpen ? ' active' : ''), onclick: () => { P.notesOpen = !P.notesOpen; render(); }, title: T('notesHelp') }, P.notesOpen ? '✓ ' + T('notesDone') : '✎ ' + T('notes')))),
    P.notesOpen ? h('p', { class: 'muted small' }, T('notesHelp')) : null,
    h('ol', { class: 'town' + (P.notesOpen ? ' noting' : '') }, P.pub.seats.map((x) => h('li', { class: (x.alive ? '' : 'dead') + (P.me && x.id === P.me.seatId ? ' me' : '') + (blockId() === x.id ? ' on-block' : '') + (P.dying && P.dying.has(x.id) ? ' dying' : '') },
      h('div', { class: 'town-row' },
        seatSheep(x.id, 'mini-sheep', { ghost: !x.alive, mood: isNight() && x.alive ? 'sleep' : '' }),
        h('span', { class: 'grow' }, (blockId() === x.id ? '💀 ' : '') + x.names.join(' + '), x.traveller ? h('span', { class: 'trav-tag' }, ` ${x.traveller.icon} ${x.traveller.name}`) : null,
          P.notesOpen ? null : noteChips(notes[x.id])),
        h('span', { class: 'muted small' }, x.alive ? T('alive') : `† ${x.ghostVote ? '● ' + T('ghost') : ''}`)),
      P.notesOpen && !(P.me && x.id === P.me.seatId) ? noteEditor(x, notes) : null))));
}

// Nominasjonsforslag: kan eleven foreslå nå?
function canPropose() {
  const me = P.me && P.pub.seats.find((x) => x.id === P.me.seatId);
  if (!me || P.pub.phase.type !== 'day' || P.pub.nomProps === false || P.pub.dawnPending) return { ok: false };
  if (!me.alive) return { ok: false, why: T('propDead') };
  const noms = (P.pub.day && P.pub.day.nominations) || [];
  if (noms.some((n) => n.nominatorId === me.id)) return { ok: false, why: T('propAlready') };
  return { ok: true };
}

function nomPickSheet() {
  if (!P.nomPick) return null;
  const noms = (P.pub.day && P.pub.day.nominations) || [];
  const taken = new Set(noms.map((n) => n.nomineeId));
  const sel = P.nomPick.sel ? [P.nomPick.sel] : [];
  return h('div', { class: 'wake-overlay' },
    h('div', { class: 'wake-card' },
      h('p', { class: 'eyebrow' }, '⚖️ ' + T('proposeNom')),
      h('p', { class: 'muted small' }, T('propHelp')),
      pickCircle({ seats: P.pub.seats, selected: sel, me: P.me.seatId, allowSelf: true, disabled: (x) => taken.has(x.id),
        onToggle: (id) => { P.nomPick.sel = P.nomPick.sel === id ? null : id; render(); },
        center: sel.length ? h('span', { class: 'display pick-count' }, seatName(sel[0])) : h('span', { class: 'muted small' }, T('propTap')) }),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn ghost', onclick: () => { P.nomPick = null; render(); } }, T('cancel')),
        h('button', { class: 'btn primary big', disabled: !sel.length, onclick: () => { P.client.send({ t: 'nomPropose', nomineeId: sel[0] }); P.nomPick = null; toast('⚖️ ' + T('propSent')); render(); } }, T('propSend')))));
}

function handView() {
  const t = P.pub.phase.type;
  if (!P.me || !(t === 'setup' || t === 'day')) return null;
  const pos = P.hands.indexOf(P.me.seatId);
  const up = pos >= 0;
  const cp = canPropose();
  return h('div', { class: 'panel hand-panel' + (up ? ' up' : '') },
    h('div', { class: 'hand-row' },
      h('button', { class: 'btn big hand-btn' + (up ? '' : ' primary'), onclick: () => P.client.send({ t: 'hand', up: !up }) }, up ? T('lowerHand') : T('raiseHand')),
      t === 'day' && P.pub.nomProps !== false ? h('button', { class: 'btn big hand-btn nom-prop-btn', disabled: !cp.ok || !!P.myProposal, title: cp.why || '', onclick: () => { P.nomPick = { sel: null }; render(); } }, '⚖️ ' + T('proposeNom')) : null),
    cp.why && t === 'day' && P.pub.nomProps !== false ? h('p', { class: 'muted small center' }, cp.why) : null,
    P.myProposal ? h('p', { class: 'strong center' }, T('propWaiting', { name: seatName(P.myProposal) }), ' ', h('button', { class: 'btn small ghost', onclick: () => P.client.send({ t: 'nomPropose', nomineeId: null }) }, T('cancel'))) : null,
    up ? h('p', { class: 'strong center' }, T('handPos', { n: pos + 1 })) : null,
    P.hands.length ? h('div', { class: 'stack tight' },
      h('span', { class: 'label' }, T('handQueue')),
      h('ol', { class: 'hand-queue' }, P.hands.map((id) => h('li', { class: id === P.me.seatId ? 'me' : '' }, seatName(id))))) : null);
}

function myLocked(v) {
  if (!v || !v.clock || !P.me) return false;
  const at = lockAt(v, P.me.seatId);
  return at !== null && Date.now() + P.offset >= at;
}

function voteView() {
  const v = P.vote;
  if (!v || !P.me || P.pub.phase.type !== 'day') return null;
  const me = P.pub.seats.find((x) => x.id === P.me.seatId);
  const mine = v.voters.includes(P.me.seatId);
  const cant = me && !me.alive && !me.ghostVote && !mine;
  const locked = myLocked(v);
  const vtext = { nominator: T('nominator'), nominee: T('nominee'), startsIn: T('startsIn'), handAt: T('handAt'), closed: T('voteClosed'), voteNow: T('voteOpen'), tieLine: (vv, nm) => tieLine(vv, nm, T) };
  return h('div', { class: 'vote-card' + (v.open ? ' open' : '') + (v.clock ? ' clock' : '') },
    h('p', { class: 'eyebrow' }, v.open ? (v.clock ? '🕐 ' + T('voteBefore') : '🗳 ' + T('voteOpen')) : T('voteClosed')),
    h('p', { class: 'display vote-title vote-who' }, h('span', { class: 'vc-nominator' }, seatName(v.nominatorId)), h('span', { class: 'vcs-arrow' }, ' ➜ '), h('span', { class: 'vc-nominee' }, seatName(v.nomineeId))),
    h('p', { class: 'vote-num' }, h('span', { class: 'big-num' }, String(voteTotal(v))), ' ', T('voteCount', { n: '', need: v.need }).replace(/^\s*/, '')),
    v.tieAt ? h('p', { class: 'vcs-tie small' }, tieLine(v, seatName, T).split(' · ').map((x) => h('span', { class: 'tie-row' }, x))) : null,
    v.open
      ? (cant ? h('p', { class: 'warn-text' }, T('noGhost'))
        : locked ? h('p', { class: 'strong locked-msg' + (mine ? ' yes' : '') }, mine ? T('lockedYes') : T('lockedNo'))
          : h('button', { class: 'btn big vote-btn' + (mine ? ' on' : ' primary'), onclick: () => P.client.send({ t: 'voteCast', voteId: v.id, up: !mine }) }, mine ? T('voteUndo') : T('voteYes')))
      : null,
    v.open && !locked && me && !me.alive && me.ghostVote && !mine ? h('p', { class: 'muted small' }, T('ghostWarn')) : null,
    v.clock ? voteCircle({ seats: P.pub.seats, vote: v, text: vtext, me: P.me.seatId, size: 64 }) : null,
    v.voters.length ? h('p', { class: 'muted small' }, '✋ ' + v.voters.map(seatName).join(', ')) : null);
}

// Timer fra Storytelleren
const fmtTime = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
function timerLeft() {
  return P.timer ? Math.max(0, Math.ceil((P.timer.endsAt - (Date.now() + P.offset)) / 1000)) : null;
}
function timerView() {
  const left = timerLeft();
  if (left === null) return null;
  return h('div', { class: 'timer-card small-timer' + (left <= 10 ? ' urgent' : '') + (left === 0 ? ' up' : '') },
    h('span', { class: 'label' }, '⏳ ' + (P.timer.label || T('timer'))),
    h('span', { class: 'display timer-big', id: 'play-timer' }, left === 0 ? T('timeUp') : fmtTime(left)));
}

// Viser, låsing og timer oppdateres i takt med skjermen uten full ny tegning.
const tk = { locked: null, done: null, timerSec: null, voteId: null, shown: null };
function playFrame() {
  playTick();
  requestAnimationFrame(playFrame);
}
requestAnimationFrame(playFrame);
function playTick() {
  const root = document.getElementById('play');
  if (!root || !P.pub) return;
  const v = P.vote;
  if (v && v.clock && P.pub.phase.type === 'day') {
    const vtext = { startsIn: T('startsIn'), handAt: T('handAt'), closed: T('voteClosed'), voteNow: T('voteOpen') };
    const info = tickVoteCircle(root, v, P.offset, vtext);
    if (tk.voteId !== v.id) Object.assign(tk, { voteId: v.id, locked: myLocked(v), done: info && info.done });
    const l = myLocked(v);
    if (l !== tk.locked) { tk.locked = l; if (l) sfx.lock(); renderVote(); }
    if (info && info.done && !tk.done) { tk.done = true; sfx.bell(); }
  }
  const left = timerLeft();
  const el = document.getElementById('play-timer');
  if (left !== null) {
    if (el && tk.shown !== left) {
      tk.shown = left;
      el.textContent = left === 0 ? T('timeUp') : fmtTime(left);
      const card = el.closest('.timer-card');
      if (card) { card.classList.toggle('urgent', left <= 10); card.classList.toggle('up', left === 0); }
    }
    if (left === 0 && tk.timerSec > 0) sfx.bell();
    tk.timerSec = left;
  } else tk.timerSec = null;
}

function dayView() {
  const d = P.pub.day;
  if (!d || !d.nominations.length) return null;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, T('nomsToday')),
    h('ol', { class: 'town' }, d.nominations.map((n) => h('li', { class: d.block && d.block.nomineeId === n.nomineeId ? 'me' : '' },
      h('span', { class: 'grow' }, `${seatName(n.nominatorId)} → ${seatName(n.nomineeId)}`),
      h('span', { class: 'strong' }, `${n.votes} / ${d.need}`)))),
    d.block ? h('p', { class: 'strong block-line' }, '💀 ' + T('onBlock', { name: seatName(d.block.nomineeId), n: d.block.votes })) : null,
    d.executed && d.executed !== 'none' ? h('p', { class: 'muted' }, T('executedToday', { name: seatName(d.executed) })) : null);
}

function revealView() {
  if (P.pub.recap) {
    return h('div', { class: 'play-reveal play-recap' },
      recapCircle({ seats: P.pub.seats, recap: P.pub.recap, size: 90, reveal: P.pub.reveal || [] }),
      recapList(P.pub.recap, { title: '📜 ' + T('recap') }));
  }
  const dt = P.dealAt ? Date.now() - P.dealAt : Infinity;
  const deal = dt < REVEAL_CINE_MS + 8000;
  return h('div', { class: 'play-reveal' + (deal ? ' deal' : ''), style: deal ? `--deal0:${Math.round(REVEAL_CINE_MS - 700 - dt)}ms` : undefined },
    revealCircle({ seats: P.pub.seats, reveal: P.pub.reveal || [], winner: P.pub.winner, me: P.me && P.me.seatId, size: 96,
      text: { title: T('revealTitle'), good: T('winnerGood'), evil: T('winnerEvil') }, celebrate: P.winAt ? { at: P.winAt, winners: P.pub.winners || [] } : null }),
    P.pub.winner ? null : h('p', { class: 'muted center' }, T('revealWait')),
    podium({ board: P.board && P.board.board, step: P.dreamReveal, text: { title: T('champs'), points: T('sheepCounted') } }),
    P.me ? h('div', { class: 'row gap wrap center end-shop' }, h('span', { class: 'muted' }, `🪙 ${fmtCoins(wallet.coins)} ${T('coinsWord')}`), h('button', { class: 'btn primary', onclick: openShop }, '🛍 ' + T('shop'))) : null);
}

function homeView() {
  if (P.pub.phase.type === 'ended') return revealView();
  const me = P.pub.seats.find((x) => x.id === P.me.seatId);
  return h('div', { class: 'play-home' },
    phaseBanner(),
    statusLine(),
    mySheepRow(),
    h('button', { class: 'btn script-btn', onclick: () => { P.view = 'script'; render(); window.scrollTo(0, 0); } }, '📜 ' + T('showScript')),
    timerView(),
    voteView(),
    P.pub.rolesOut === false ? null : h('div', { class: 'hold-row' },
      P.roleCard
        ? holdReveal(T('holdRole'), h('div', null, h('p', { class: 'display role-name team-' + P.roleCard.team }, P.roleCard.icon ? P.roleCard.icon + ' ' : '', P.roleCard.character), h('p', { class: 'card-text' }, P.roleCard.text), P.roleCard.tip ? h('p', { class: 'role-tip' }, h('strong', null, '💡 ' + T('tip') + ' '), P.roleCard.tip) : null), 'role-hold')
        : h('p', { class: 'muted' }, T('noRole')),
      lastMessageView()),
    handView(),
    dreamPhase() ? h('button', { class: 'btn primary big dream-btn', onclick: openDream }, '💤 ' + T('playDream')) : null,
    dreamPhase() ? boardView() : null,
    dayView(),
    chatView(),
    h('div', { class: 'panel' },
      h('h3', { class: 'section-title' }, T('messages')),
      P.inbox.length
        ? h('ol', { class: 'inbox' }, P.inbox.slice().reverse().map((c) => h('li', null,
          c.kind === 'choice'
            ? h('p', { class: 'muted small' }, c.status === 'answered' ? `✉ ${T('answered')}: ${(c.response || []).map(seatName).join(' + ')}` : '…')
            : c.grim ? h('button', { class: 'btn small', onclick: () => { P.grimOpen = c; render(); } }, `📖 ${T('grimTitle')} · ${T('night')} ${c.grim.night}`)
              : holdReveal(T('holdRead'), h('p', { class: 'card-text' }, c.text), 'small-hold'))))
        : h('p', { class: 'muted small' }, T('noMessages'))),
    townView(),
    me ? h('p', { class: 'muted small center' }, `${T('you')}: ${me.names.join(' + ')}`) : null);
}

function dreamLabel() {
  return P.pub.phase.type === 'night' ? `🌙 ${T('night')} ${P.pub.phase.number}` : `✦ ${T('beforeGame')}`;
}

function dreamView() {
  const wrap = h('div', { class: 'dream-view' },
    h('div', { class: 'row between' },
      backButton(() => { closeDream(); render(); }),
      h('span', { id: 'dream-phase', class: 'display' }, dreamLabel())),
    h('canvas', { id: 'dream-canvas', class: 'dream-canvas', 'aria-label': T('playDream') }),
    boardView());
  return wrap;
}

function seatPicker() {
  return h('div', { class: 'stack' },
    h('h2', { class: 'section-title center' }, T('pickSeat')),
    P.error ? h('p', { class: 'callout warn' }, T(P.error)) : null,
    h('div', { class: 'pick-grid' }, P.pub.seats.map((x) => {
      const full = (P.claimed[x.id] || 0) >= Math.max(1, x.names.length);
      return h('button', { class: 'pick big' + (full ? ' taken' : ''), disabled: full, onclick: () => { P.error = null; P.client.send({ t: 'claim', seatId: x.id }); } },
        x.names.join(' + '), full ? h('span', { class: 'muted small' }, ' · ' + T('taken')) : null);
    })));
}

function codeEntry() {
  return h('form', {
    class: 'stack code-form',
    onsubmit: (e) => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) connect(v); },
  },
  h('label', { class: 'label', for: 'room-code' }, T('enterCode')),
  h('input', { id: 'room-code', class: 'input code-input', autocomplete: 'off', autocapitalize: 'characters', maxlength: 8, placeholder: 'ABCDE' }),
  h('button', { class: 'btn primary big', type: 'submit' }, T('join')));
}

function soundToggle() {
  const on = soundEnabled();
  return h('button', { class: 'btn small ghost sound-btn', title: T('sound'), 'aria-pressed': on ? 'true' : 'false', onclick: () => { if (on) disableSound(); else { enableSound(); sfx.pop(); } render(); } }, on ? '🔊' : '🔇');
}

// ——— Blod rundt skjermen når eleven selv er død (uansett årsak) ———
let bloodSvg = null;
function bloodDrips() {
  if (bloodSvg) return bloodSvg;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const base = 14;
  let d = `M0 0 H1000 V${base}`;
  let bulbs = '';
  let x = 1000;
  while (x > 0) {
    const gap = 18 + rnd() * 60;
    const w = 8 + rnd() * 16;
    const L = rnd() < 0.35 ? 26 + rnd() * 36 : 4 + rnd() * 14;
    const wave = base + (rnd() - 0.5) * 6;
    d += ` Q${(x - gap / 2).toFixed(1)} ${(wave + 4).toFixed(1)} ${(x - gap).toFixed(1)} ${base}`;
    x -= gap;
    if (x - w <= 0) break;
    d += ` C${(x - w * 0.15).toFixed(1)} ${base} ${(x - w * 0.3).toFixed(1)} ${(base + L).toFixed(1)} ${(x - w / 2).toFixed(1)} ${(base + L).toFixed(1)}`;
    d += ` C${(x - w * 0.7).toFixed(1)} ${(base + L).toFixed(1)} ${(x - w * 0.85).toFixed(1)} ${base} ${(x - w).toFixed(1)} ${base}`;
    if (L > 26) bulbs += `<ellipse cx="${(x - w / 2).toFixed(1)}" cy="${(base + L).toFixed(1)}" rx="${(w * 0.42).toFixed(1)}" ry="${(w * 0.5).toFixed(1)}"/>`;
    x -= w;
  }
  d += ' V0 Z';
  bloodSvg = `<svg class="blood-top" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a0208"/><stop offset="0.5" stop-color="#8e0a16"/><stop offset="1" stop-color="#b3141f"/></linearGradient></defs><g fill="url(#bl)"><path d="${d}"/>${bulbs}</g></svg>`;
  return bloodSvg;
}
function syncBlood() {
  const me = P.pub && P.me && P.pub.seats.find((x) => x.id === P.me.seatId);
  const dead = !!(me && !me.alive && P.pub.phase.type !== 'ended');
  let el = document.getElementById('blood-frame');
  if (!dead) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'blood-frame';
  el.className = 'blood-frame';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = bloodDrips() + '<div class="blood-vignette"></div>';
  document.body.appendChild(el);
}

function render() {
  const root = document.getElementById('play');
  syncBlood();
  applyTheme(P.pub && P.me ? (P.pub.recap ? (P.pub.recap.type === 'night' ? 'night' : 'day') : P.pub.phase.type) : 'none');
  let main;
  if (!P.code) main = codeEntry();
  else if (P.error === 'closed' || P.error === 'noroom') main = h('p', { class: 'callout' }, T(P.error));
  else if (!P.pub) main = h('p', { class: 'muted center' }, T('connecting'));
  else if (P.me && P.view === 'creator') main = creatorView(wctx());
  else if (P.me && P.view === 'shop') main = shopView(wctx());
  else if (P.pub.phase.type === 'ended') main = revealView();
  else if (!P.me) main = seatPicker();
  else if (P.view === 'dream' && dreamPhase()) main = dreamView();
  else if (P.view === 'script') main = scriptView();
  else if (P.view === 'mygrim') main = myGrimView();
  else main = homeView();
  const keepDream = P.view === 'dream' && P.dream && document.getElementById('dream-canvas');
  if (keepDream && P.me && dreamPhase()) {
    // Ikke tegn spillet på nytt – bare oppdater toppliste, fase og overlegg.
    const b = root.querySelector('.dream-view .panel');
    if (b) b.replaceWith(boardView());
    const lbl = document.getElementById('dream-phase');
    if (lbl) lbl.textContent = dreamLabel();
    root.querySelector('.overlay-slot').replaceChildren(overlayView() || '');
    root.querySelector('.conn').replaceChildren(connView());
    const oldSheet = root.querySelector('.grim-sheet');
    if (oldSheet) oldSheet.remove();
    const sheet = grimSheet();
    if (sheet) root.append(sheet);
    return;
  }
  const act = document.activeElement;
  const focusId = act && (act.id === 'chat-input' || (act.id || '').startsWith('note-')) ? act.id : null;
  const refocus = focusId && typeof act.selectionStart === 'number' ? act.selectionStart : null;
  root.replaceChildren(
    h('header', { class: 'play-top' },
      h('span', { class: 'brand-name' }, '✦ Botc Helper'),
      P.code ? h('span', { class: 'room-code display' }, P.code) : null,
      P.me ? walletChip() : null,
      h('span', { class: 'conn' }, connView()),
      soundToggle()),
    h('main', { class: 'play-main' + (P.view === 'dream' && dreamPhase() ? ' wide' : '') }, main),
    h('div', { class: 'overlay-slot' }, P.me ? overlayView() || '' : ''),
    (P.me && grimSheet()) || '',
    (P.me && nomPickSheet()) || '');
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus({ preventScroll: true }); if (refocus !== null) { try { el.setSelectionRange(refocus, refocus); } catch { /* */ } } }
  }
  if (P.view === 'dream' && dreamPhase() && P.me) {
    if (P.dream) P.dream.destroy();
    const canvas = document.getElementById('dream-canvas');
    const text = TXT[lang()];
    P.dream = new DreamGame(canvas, {
      text, best: myBest(), look: wallet.look, champion: amChampion(),
      onGameOver: (score, coins = 0, record = false) => {
        saveDream(null);
        P.client.send({ t: 'score', score });
        // Poengene (og myntene som ble plukket i lufta) renner inn i lommeboka
        const label = [record ? '🏆 ' + T('recordShort') : '', coins ? `🏃 ${score} + 🪙 ${coins}` : ''].filter(Boolean).join(' · ');
        coinBurst(wallet.earn(score + coins), canvas, label);
      },
      onCoin: () => sfx.coin(),
      onPower: (kind) => { if (kind === 'magnet') sfx.magnet(); },
      onRecord: () => { sfx.fanfare(); sfx.firework(0.2); sfx.firework(0.7); sfx.firework(1.3); },
    });
    const saved = loadDream();
    if (saved) { P.dream.restore(saved); saveDream(null); }
    syncPause();
  }
}

function connView() {
  if (!P.code) return '';
  if (P.status === 'open') return h('span', { class: 'dot on', title: 'online' });
  return h('span', { class: 'small warn-text' }, P.status === 'dead' ? '' : T('reconnecting'));
}

// Liten feilsøkingskrok (viser bare elevens egen tilstand).
window.botcPlay = { dreamState: () => (P.dream ? P.dream.state : null), dreamInfo: () => (P.dream ? { score: P.dream.score, shield: P.dream.shield, countdown: P.dream.countdown } : null), overlay: () => P.overlay.length };
window.addEventListener('pagehide', () => { if (P.dream) saveDream(P.dream.snapshot()); });

const code = new URLSearchParams(location.search).get('room');
render();
if (code) connect(code);
