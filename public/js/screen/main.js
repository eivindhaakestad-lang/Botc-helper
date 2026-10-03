// Storskjermen (Town Square): plasser, levende/døde, fase, kunngjøringer,
// QR-kode for å bli med og drømmetopplisten om natten. Viser aldri roller før spillet er slutt.

import { h } from '../app/dom.js';
import { LiveClient, joinUrl, qrSvg } from '../live/client.js';
import { revealCircle } from '../live/reveal.js';
import { podium } from '../live/podium.js';
import { voteCircle, tickVoteCircle, tieLine, patchVoteCircle } from '../live/voteclock.js';
import { sfx, enableSound, disableSound, soundEnabled, playMusic, stopMusic } from '../live/sound.js';
import { applyTheme } from '../live/theme.js';
import { recapCircle, recapList } from '../live/recapview.js';
import { playPhaseCine, playRevealCine, REVEAL_CINE_MS, syncNightWeather } from './cine.js';

const TXT = {
  no: { join: 'Bli med: skann koden eller gå til', code: 'Romkode', setup: 'Venter på Storytelleren', night: 'Natt', day: 'Dag', ended: 'Spillet er slutt', alive: 'lever', votes: 'stemmer for å henrette', board: 'Drømmetoppliste', noScores: 'Hopp over hinder for å komme på lista!', good: 'Det gode laget vinner!', evil: 'Det onde laget vinner!', fullscreen: 'Fullskjerm', closed: 'Rommet er stengt.', noroom: 'Fant ikke rommet.', joined: 'inne', reveal: 'Grim reveal', hands: 'Talerekkefølge', noms: 'Nominasjoner i dag', voteNow: 'Stem nå på PC-en din!', voteClosed: 'Avstemningen er lukket', need: 'trengs', onBlock: 'På blokka', tie: 'Uavgjort – ingen er på blokka', executed: 'Henrettet i dag', noExec: 'Ingen henrettet i dag', votes2: 'stemmer', dawnPending: 'Byen våkner …', nominator: 'nominerer', nominee: 'nominert', startsIn: 'Viseren starter om', handAt: 'Viseren er hos', closed: 'Avstemningen er lukket', soundOn: 'Slå på lyd', soundOff: 'Lyd på', timer: 'Tid', timeUp: 'Tiden er ute!', voteBefore: 'Stem før viseren når deg!', champs: 'Drømmemestere', points: 'hinder', musicOn: 'Musikk på', musicOff: 'Slå på musikk', musicHelp: 'Dyster stemningsmusikk om natten', tieWith: '{tie} = uavgjort med {block} (ingen dør)', tieStill: '{tie} = fortsatt uavgjort (ingen dør)', needFor: '{need} = {name} på blokka', recap: 'Slik gikk det egentlig', whoWas: 'Hvem var hvem?', weatherOn: 'Regn på', weatherOff: 'Slå på regn', weatherHelp: 'Skyer og regn om natten' },
  en: { join: 'Join: scan the code or go to', code: 'Room code', setup: 'Waiting for the Storyteller', night: 'Night', day: 'Day', ended: 'Game over', alive: 'alive', votes: 'votes to execute', board: 'Dream leaderboard', noScores: 'Clear obstacles to get on the list!', good: 'Good wins!', evil: 'Evil wins!', fullscreen: 'Fullscreen', closed: 'The room is closed.', noroom: 'Room not found.', joined: 'joined', reveal: 'Grim reveal', hands: 'Speaking order', noms: 'Nominations today', voteNow: 'Vote now on your computer!', voteClosed: 'The vote is closed', need: 'needed', onBlock: 'On the block', tie: 'Tie – nobody is on the block', executed: 'Executed today', noExec: 'Nobody executed today', votes2: 'votes', dawnPending: 'The town wakes up …', nominator: 'nominates', nominee: 'nominated', startsIn: 'The hand starts in', handAt: 'The hand is at', closed: 'The vote is closed', soundOn: 'Turn on sound', soundOff: 'Sound on', timer: 'Time', timeUp: 'Time is up!', voteBefore: 'Vote before the hand reaches you!', champs: 'Dream champions', points: 'obstacles', musicOn: 'Music on', musicOff: 'Turn on music', musicHelp: 'Dark ambient music at night', tieWith: '{tie} = tie with {block} (nobody dies)', tieStill: '{tie} = still a tie (nobody dies)', needFor: '{need} = {name} on the block', recap: 'What really happened', whoWas: 'Who was who?', weatherOn: 'Rain on', weatherOff: 'Turn on rain', weatherHelp: 'Clouds and rain at night' },
};

const S = { dying: new Map(), deadSeen: null, pub: null, room: null, claimed: {}, board: null, error: null, status: 'connecting', hands: [], vote: null, timer: null, offset: 0 };
const vtext = () => ({ nominator: T('nominator'), nominee: T('nominee'), startsIn: T('startsIn'), handAt: T('handAt'), closed: T('closed'), voteNow: '🗳 ' + T('voteNow'), tieLine: (v, nm) => tieLine(v, nm, T) });
const nameOf = (id) => { const x = S.pub && S.pub.seats.find((y) => y.id === id); return x ? x.names.join(' + ') : '?'; };
const T = (k) => (TXT[S.pub && S.pub.lang === 'en' ? 'en' : 'no'][k]);
const code = (new URLSearchParams(location.search).get('room') || '').toUpperCase();

// ——— Slayer-skudd: pil fra skytteren til målet ———
const SHOT_FLY = 900;
const SHOT_TOTAL = 2600;
function seatXY(i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)];
}
function shotLayer(p, n) {
  const a = S.shotAnim;
  if (!a) return null;
  const i = p.seats.findIndex((x) => x.id === a.shot.from);
  const j = p.seats.findIndex((x) => x.id === a.shot.to);
  if (i < 0 || j < 0) return null;
  const [x1, y1] = seatXY(i, n);
  const [x2, y2] = seatXY(j, n);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const landed = Date.now() - a.start >= SHOT_FLY;
  return h('div', { class: 'shot-layer' + (landed ? ' landed' : ''), 'aria-hidden': 'true', style: `--x1:${x1}%;--y1:${y1}%;--x2:${x2}%;--y2:${y2}%;--ang:${ang}deg` },
    h('div', { class: 'shot-trail', html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="100"/></svg>` }),
    landed ? null : h('span', { class: 'shot-arrow' }, '➳'),
    landed ? h('span', { class: 'shot-impact ' + (a.shot.hit ? 'hit' : 'miss') }, a.shot.hit ? '💥' : '💨') : null);
}

// ——— dødsanimasjon: hver gang en spiller vises som død for første gang ———
const DEATH_MS = 2600;
function detectDeaths(p) {
  const dead = new Set(p.seats.filter((x) => !x.alive).map((x) => x.id));
  if (!S.deadSeen) { S.deadSeen = dead; return; }
  const fresh = [...dead].filter((id) => !S.deadSeen.has(id));
  for (const id of [...S.deadSeen]) if (!dead.has(id)) S.deadSeen.delete(id);
  if (!fresh.length) return;
  const now = Date.now();
  for (const id of fresh) { S.deadSeen.add(id); S.dying.set(id, now + DEATH_MS); }
  // Slayer/Gunslinger-skuddet har allerede sin egen lyd
  const shotTarget = S.shotAnim && S.shotAnim.shot.hit ? S.shotAnim.shot.to : null;
  if (fresh.some((id) => id !== shotTarget)) sfx.death();
  setTimeout(() => { const t = Date.now(); for (const [id, until] of S.dying) if (until <= t) S.dying.delete(id); render(); }, DEATH_MS + 50);
}

function seatToken(seat, i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  const left = 50 + 40 * Math.cos(a);
  const top = 50 + 40 * Math.sin(a);
  const joined = (S.claimed[seat.id] || 0) > 0;
  const initials = seat.names.map((x) => x.slice(0, 1)).join('');
  const handPos = S.hands.indexOf(seat.id);
  const v = S.vote;
  const voted = v && v.voters.includes(seat.id);
  const nominee = v && v.nomineeId === seat.id;
  const nominator = v && v.nominatorId === seat.id;
  const d = S.pub.day;
  const block = !!(d && d.block && !d.executed && d.block.nomineeId === seat.id);
  const sa = S.shotAnim;
  const dying = S.dying.has(seat.id) ? ' dying' : '';
  const shotCls = sa ? (sa.shot.from === seat.id ? ' shooter' : sa.shot.to === seat.id ? (Date.now() - sa.start >= SHOT_FLY ? (sa.shot.hit ? ' shot-hit' : ' shot-miss') : ' shot-target') : '') : '';
  return h('div', { class: 'grim-slot', style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%` },
    h('div', { class: 'token screen-token' + (seat.alive ? '' : ' dead') + (joined ? ' joined' : '') + (voted ? ' voted' : '') + (nominee ? ' nominee' : '') + (nominator ? ' nominator' : '') + (block ? ' on-block' : '') + shotCls + dying },
      h('span', { class: 'token-disc' },
        h('span', { class: 'token-num' }, String(i + 1)),
        h('span', { class: 'token-char' }, voted ? '✋' : nominee ? '⚖️' : seat.traveller ? seat.traveller.icon : initials),
        seat.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†'),
        handPos >= 0 ? h('span', { class: 'hand-badge' }, '✋' + (handPos + 1)) : null,
        dying ? h('span', { class: 'death-skull', 'aria-hidden': 'true' }, '💀') : null,
        block ? h('span', { class: 'block-badge' }, '💀') : null),
      h('span', { class: 'token-label' }, seat.names.join(' + '),
        seat.alive ? null : h('span', { class: 'ghost-vote' + (seat.ghostVote ? ' has' : '') }, seat.ghostVote ? '●' : '○')),
      seat.traveller ? h('span', { class: 'trav-tag' }, seat.traveller.name) : null,
      block ? h('span', { class: 'vc-role nominee block-label' }, '💀 ' + T('onBlock')) : null));
}

function render() {
  const root = document.getElementById('screen');
  if (S.error) { root.replaceChildren(h('div', { class: 'screen-msg display' }, T(S.error) || S.error)); return; }
  if (!S.pub) { root.replaceChildren(h('div', { class: 'screen-msg display' }, '✦ Botc Helper')); return; }
  let p = S.pub;
  const ph = p.phase;
  applyTheme(ph.type === 'ended' && p.recap ? (p.recap.type === 'night' ? 'night' : 'day') : ph.type);
  syncMusic();
  syncNightWeather(ph.type === 'night' && weatherOn());
  if (S.shotAnim && Date.now() - S.shotAnim.start < SHOT_FLY + 400) {
    // Målet lever til pila treffer, og kunngjøringen venter.
    p = { ...p, announcement: '', seats: p.seats.map((x) => (x.id === S.shotAnim.shot.to ? { ...x, alive: true } : x)) };
  }
  if (ph.type === 'ended' && p.recap) {
    root.replaceChildren(h('div', { class: 'screen screen-recap' },
      h('section', { class: 'screen-grim' }, recapCircle({ seats: p.seats, recap: p.recap, size: 130, reveal: p.reveal || [] })),
      h('aside', { class: 'screen-side' },
        recapList(p.recap, { title: '📜 ' + T('recap') }),
        h('div', { class: 'row gap screen-tools' }, musicButton(), soundButton()))));
    return;
  }
  if (ph.type === 'ended') {
    const dt = S.dealAt ? Date.now() - S.dealAt : Infinity;
    const deal = dt < REVEAL_CINE_MS + 8000;
    root.replaceChildren(h('div', { class: 'screen screen-reveal' + (deal ? ' deal' : ''), style: deal ? `--deal0:${Math.round(REVEAL_CINE_MS - 700 - dt)}ms` : undefined },
      revealCircle({ seats: p.seats, reveal: p.reveal || [], winner: p.winner, size: 150, text: { title: T('reveal'), good: T('good'), evil: T('evil') } }),
      podium({ board: S.board && S.board.board, step: S.dreamReveal, text: { title: T('champs'), points: T('points') } }),
      h('button', { class: 'btn ghost small fs-btn', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen'))));
    return;
  }
  // Dødsanimasjonen vises på den vanlige grimen (ikke mens avstemningssirkelen står)
  if (!(S.vote && ph.type === 'day')) detectDeaths(p);
  const alive = p.seats.filter((x) => x.alive).length;
  const n = Math.max(1, p.seats.length);
  const joinedAll = p.seats.length > 0 && p.seats.every((x) => (S.claimed[x.id] || 0) > 0);
  const showJoin = ph.type === 'setup' && !(S.room && S.room.locked) && !joinedAll;
  const phaseText = ph.type === 'night' ? `🌙 ${T('night')} ${ph.number}` : ph.type === 'day' ? `☀️ ${T('day')} ${ph.number}` : ph.type === 'ended' ? `🏁 ${T('ended')}` : `✦ ${p.title || 'Botc Helper'}`;
  const joinedN = p.seats.filter((x) => (S.claimed[x.id] || 0) > 0).length;
  const url = joinUrl(code);
  root.replaceChildren(
    h('div', { class: 'screen phase-' + ph.type },
      h('section', { class: 'screen-grim' },
        S.vote && ph.type === 'day' ? voteCircle({ seats: p.seats, vote: S.vote, text: vtext(), size: 120 }) : h('div', { class: 'grim ' + ph.type, style: `--tok:min(120px, ${Math.min(26, (257 / n) * 0.7).toFixed(2)}cqw)` },
          h('div', { class: 'grim-ring', 'aria-hidden': 'true' }),
          h('div', { class: 'grim-center' },
            h('div', { class: 'center-text' },
              h('span', { class: 'display screen-phase' }, phaseText),
              ph.type === 'day' && p.dawnPending ? h('span', { class: 'center-stat dawn-wait' }, T('dawnPending')) : null,
              (ph.type === 'day' && !p.dawnPending) || ph.type === 'night' ? h('span', { class: 'center-stat' }, `${alive} ${T('alive')} · ${Math.ceil(alive / 2)} ${T('votes')}`) : null,
              ph.type === 'setup' ? h('span', { class: 'center-stat' }, `${joinedN} / ${p.seats.length} ${T('joined')}`) : null,
              p.winner ? h('span', { class: 'display screen-winner ' + p.winner }, T(p.winner)) : null,
              ph.type === 'night' ? candle() : null)),
          p.seats.map((seat, i) => seatToken(seat, i, n)),
          shotLayer(p, n))),
      h('aside', { class: 'screen-side' },
        timerCard(),
        S.vote && ph.type === 'day' && S.vote.open ? h('div', { class: 'vote-card-screen' + (S.vote.clock ? ' clock' : '') },
          h('div', { class: 'vcs-who display' }, h('span', { class: 'vc-nominator' }, nameOf(S.vote.nominatorId)), h('span', { class: 'vcs-arrow' }, ' ➜ '), h('span', { class: 'vc-nominee' }, nameOf(S.vote.nomineeId))),
          S.vote.tieAt ? h('p', { class: 'vcs-tie' }, tieLine(S.vote, nameOf, T).split(' · ').map((x) => h('span', { class: 'tie-row' }, x))) : h('p', { class: 'vcs-tie' }, T('needFor').replace('{need}', S.vote.need).replace('{name}', nameOf(S.vote.nomineeId))),
          h('p', { class: 'strong' }, S.vote.clock ? '🕐 ' + T('voteBefore') : '🗳 ' + T('voteNow'))) : null,
        p.announcement ? h('div', { class: 'announce' }, p.announcement) : null,
        showJoin ? h('div', { class: 'join-card' },
          h('div', { class: 'qr', html: qrSvg(url, { size: 240 }) }),
          h('p', { class: 'muted' }, T('join')),
          h('p', { class: 'join-url' }, url.replace(/^https?:\/\//, '')),
          h('p', { class: 'label' }, T('code')),
          h('p', { class: 'display big-code' }, code)) : null,
        handsPanel(),
        ph.type === 'day' ? dayPanel(p) : null,
        (ph.type === 'night' || ph.type === 'setup') && p.dream !== false ? h('div', { class: 'panel' },
          h('h3', { class: 'section-title' }, '🏃 ' + T('board')),
          S.board && S.board.board.length
            ? h('ol', { class: 'board big' }, S.board.board.slice(0, 10).map((x) => h('li', null, h('span', { class: 'grow' }, x.name), h('span', { class: 'strong' }, String(x.score)))))
            : h('p', { class: 'muted' }, T('noScores'))) : null,
        h('div', { class: 'row gap screen-tools' },
          ph.type === 'night' ? weatherButton() : null,
          musicButton(),
          soundButton(),
          h('button', { class: 'btn ghost small', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen'))))));
  tick(true);
}

// ——— stearinlyset om natten: brenner sakte ned med tiden (sier ingenting om hvem som våkner) ———
function nightStart() {
  const ph = S.pub && S.pub.phase;
  if (!ph || ph.type !== 'night') return null;
  const key = `botc-night-${code}-${ph.number}`;
  let v = null;
  try { v = Number(sessionStorage.getItem(key)) || null; } catch { /* */ }
  if (!v) { v = Date.now(); try { sessionStorage.setItem(key, String(v)); } catch { /* */ } }
  return v;
}
function candleLeft() {
  const t0 = nightStart();
  if (!t0) return 1;
  return 0.12 + 0.88 * Math.exp(-(Date.now() - t0) / 420000);
}
function candle() {
  return h('div', { class: 'candle', id: 'night-candle', style: `--h:${candleLeft().toFixed(3)}`, 'aria-hidden': 'true' },
    h('div', { class: 'candle-glow' }),
    h('div', { class: 'candle-wax' }, h('span', { class: 'candle-drip' })),
    h('div', { class: 'candle-flame' }),
    h('div', { class: 'candle-plate' }));
}

// Stemningsmusikk om natten – egen knapp, uavhengig av lydeffektene
let musicWanted = false;
function syncMusic() {
  if (musicWanted && S.pub && S.pub.phase.type === 'night') playMusic(); else stopMusic();
}
function musicButton() {
  return h('button', { class: 'btn small sound-btn' + (musicWanted ? ' ghost' : ''), onclick: () => { musicWanted = !musicWanted; syncMusic(); render(); }, title: T('musicHelp') }, musicWanted ? '🎵 ' + T('musicOn') : '🎵 ' + T('musicOff'));
}

// Skyer og regn om natten – kan slås av hvis projektor-PC-en er treg (huskes på denne maskinen)
function weatherOn() { try { return localStorage.getItem('botc-screen-weather') !== 'off'; } catch { return true; } }
function weatherButton() {
  const on = weatherOn();
  return h('button', { class: 'btn small sound-btn' + (on ? ' ghost' : ''), title: T('weatherHelp'), onclick: () => { try { localStorage.setItem('botc-screen-weather', on ? 'off' : 'on'); } catch { /* */ } render(); } }, on ? '🌧 ' + T('weatherOn') : '🌧 ' + T('weatherOff'));
}

function soundButton() {
  const on = soundEnabled();
  return h('button', { class: 'btn small sound-btn' + (on ? ' ghost' : ' primary'), onclick: () => { if (on) disableSound(); else { enableSound(); sfx.pop(); } render(); } }, on ? '🔊 ' + T('soundOff') : '🔇 ' + T('soundOn'));
}

// ——— timer ———
const fmt = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
function timerLeft() {
  const tm = S.timer;
  return tm ? Math.max(0, Math.ceil((tm.endsAt - (Date.now() + S.offset)) / 1000)) : null;
}
function timerCard() {
  const left = timerLeft();
  if (left === null) return null;
  return h('div', { class: 'timer-card' + (left <= 10 ? ' urgent' : '') + (left === 0 ? ' up' : '') },
    h('span', { class: 'label' }, '⏳ ' + (S.timer.label || T('timer'))),
    h('span', { class: 'display timer-big', id: 'screen-timer' }, left === 0 ? T('timeUp') : fmt(left)),
    h('div', { class: 'timer-bar' }, h('span', { id: 'screen-timer-bar', style: `transform:scaleX(${Math.max(0, Math.min(1, (left * 1000) / Math.max(1, S.timer.durationMs))).toFixed(3)})` })));
}

// ——— animasjon og lyd (kjører hele tiden, tegner ikke alt på nytt) ———
const snd = { countdown: null, step: null, done: null, voteId: null, timerSec: null, timerEnd: null };
function tick(fromRender = false) {
  const root = document.getElementById('screen');
  if (!root || !S.pub) return;
  // Avstemningsklokka
  const v = S.vote;
  if (v && v.clock && S.pub.phase.type === 'day') {
    const info = tickVoteCircle(root, v, S.offset, vtext());
    if (info && !fromRender) {
      if (snd.voteId !== v.id) Object.assign(snd, { voteId: v.id, countdown: null, step: null, done: null });
      if (info.countdown > 0 && snd.countdown !== info.countdown) { snd.countdown = info.countdown; sfx.countdown(); }
      if (info.t >= 0 && !info.done && snd.step !== info.step) {
        if (snd.step === null || snd.step === -1) sfx.go();
        snd.step = info.step;
        if (info.step % 2) sfx.tock(); else sfx.tick();
        sfx.lock();
      }
      if (info.done && !snd.done) { snd.done = true; sfx.bell(); }
    }
  }
  // Stearinlyset (én gang i sekundet)
  const cd = document.getElementById('night-candle');
  if (cd && (fromRender || Date.now() - (snd.candleAt || 0) > 1000)) { snd.candleAt = Date.now(); cd.style.setProperty('--h', candleLeft().toFixed(3)); }
  // Timer (oppdateres bare når sekundet endrer seg; linja går med transform)
  const left = timerLeft();
  const el = document.getElementById('screen-timer');
  if (left !== null) {
    if (el && (fromRender || snd.timerShown !== left)) {
      snd.timerShown = left;
      el.textContent = left === 0 ? T('timeUp') : fmt(left);
      const card = el.closest('.timer-card');
      if (card) { card.classList.toggle('urgent', left <= 10); card.classList.toggle('up', left === 0); }
      const bar = document.getElementById('screen-timer-bar');
      if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, (left * 1000) / Math.max(1, S.timer.durationMs))).toFixed(3)})`;
    }
    if (!fromRender && snd.timerSec !== left) {
      const endKey = S.timer.endsAt;
      if (left > 0 && left <= 10 && snd.timerSec !== null) sfx.tick();
      if (left === 0 && snd.timerEnd !== endKey && snd.timerSec !== null && snd.timerSec > 0) { snd.timerEnd = endKey; sfx.bell(); }
      snd.timerSec = left;
    }
  } else snd.timerSec = null;
}
// Én animasjonsløkke synkronisert med skjermen (jevnere enn setInterval, og pauser når fanen er skjult)
function frame() { tick(false); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

// Lyder når noe skjer i spillet
function soundsFor(prev, m) {
  if (!prev) return;
  const a = prev.public; const b = m.public;
  if (a.phase.type !== b.phase.type || a.phase.number !== b.phase.number) {
    if (b.phase.type === 'night') playPhaseCine('night', b.phase.number, `🌙 ${T('night')} ${b.phase.number}`);
    else if (b.phase.type === 'day') { sfx.sunrise(); playPhaseCine('day', b.phase.number, `☀️ ${T('day')} ${b.phase.number}`); }
    else if (b.phase.type === 'ended') { S.dealAt = Date.now(); playRevealCine(T('reveal'), T('whoWas')); }
  }
  if (a.dawnPending && !b.dawnPending && b.phase.type === 'day') {
    const died = b.seats.some((x) => !x.alive && (a.seats.find((y) => y.id === x.id) || {}).alive);
    if (!died) sfx.bell(); // dødsfall får egen lyd og animasjon
  }
  const pv = prev.vote; const nv = m.vote;
  if (nv && nv.open && (!pv || pv.id !== nv.id || !pv.open)) sfx.gavel();
  else if (nv && pv && nv.id === pv.id && nv.voters.length > pv.voters.length && !nv.clock) sfx.pop();
  if ((m.hands || []).length > (prev.hands || []).length) sfx.pop();
  const ba = a.day && a.day.block && a.day.block.nomineeId; const bb = b.day && b.day.block && b.day.block.nomineeId;
  if (bb && bb !== ba) sfx.lock();
  if (b.winner && b.winner !== a.winner) sfx.fanfare();
  const rca = a.recap; const rcb = b.recap;
  if (rcb && (!rca || rcb.step > rca.step)) {
    const it = rcb.items[rcb.items.length - 1];
    const fresh = it && !(rca && rca.items.some((x) => x.id === it.id));
    if (!fresh) { if (rcb.type === 'night') sfx.gong(); else sfx.sunrise(); }
    else if (it.kind === 'demonKill' || it.kind === 'died' || it.kind === 'executed' || it.kind === 'shotHit') sfx.death();
    else if (it.kind === 'poisoned' || it.kind === 'falseInfo' || it.kind === 'drunk') sfx.thunk();
    else if (it.kind === 'survived' || it.kind === 'protected') sfx.reveal();
    else sfx.pop();
  }
  const ra = (a.reveal || []).filter((x) => x.shown || x.character).length;
  const rb = (b.reveal || []).filter((x) => x.shown || x.character).length;
  if (rb > ra) sfx.reveal();
}
let lastPublic = null;
const seenShots = new Set();
function detectShots(m, first) {
  const shots = (m.public.day && m.public.day.shots) || [];
  for (const sh of shots) {
    if (seenShots.has(sh.id)) continue;
    seenShots.add(sh.id);
    if (first) continue; // gamle skudd spilles ikke av på nytt ved tilkobling
    S.shotAnim = { shot: sh, start: Date.now() };
    sfx.whoosh();
    setTimeout(() => { if (sh.hit) sfx.hit(); else sfx.thunk(); render(); }, SHOT_FLY);
    setTimeout(render, SHOT_FLY + 450);
    setTimeout(() => { if (S.shotAnim && S.shotAnim.shot.id === sh.id) { S.shotAnim = null; render(); } }, SHOT_TOTAL);
  }
}

function handsPanel() {
  if (!S.hands.length || !S.pub || !['setup', 'day'].includes(S.pub.phase.type)) return null;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, '✋ ' + T('hands')),
    h('ol', { class: 'board big hands-screen' }, S.hands.map((id) => h('li', null, h('span', { class: 'grow' }, nameOf(id))))));
}

function dayPanel(p) {
  const d = p.day;
  if (!d) return null;
  return h('div', { class: 'panel' },
    h('h3', { class: 'section-title' }, '⚖️ ' + T('noms')),
    d.nominations.length ? h('ol', { class: 'noms-screen' }, d.nominations.map((n) => h('li', { class: d.block && d.block.nomineeId === n.nomineeId && n.votes === d.block.votes ? 'block' : '' },
      h('span', { class: 'grow' }, `${nameOf(n.nominatorId)} → ${nameOf(n.nomineeId)}`),
      h('span', { class: 'strong' }, `${n.votes} / ${d.need}`)))) : h('p', { class: 'muted' }, `${d.need} ${T('votes2')} ${T('need')}`),
    d.block ? h('p', { class: 'strong block-line' }, `💀 ${T('onBlock')}: ${nameOf(d.block.nomineeId)} (${d.block.votes})`) : d.tie ? h('p', { class: 'muted' }, T('tie')) : null,
    d.executed ? h('p', { class: 'muted' }, d.executed === 'none' ? T('noExec') : `${T('executed')}: ${nameOf(d.executed)}`) : null);
}

if (!code) {
  S.error = 'noroom';
  render();
} else {
  new LiveClient({
    code,
    params: { role: 'screen' },
    onStatus: (st) => { S.status = st; },
    onMessage: (m) => {
      if (m.t === 'public') {
        // Bare nye stemmer i en pågående avstemning? Da oppdateres sirkelen direkte uten å tegne alt på nytt.
        const prev = lastPublic;
        const onlyVotes = prev && m.vote && prev.vote && prev.vote.id === m.vote.id && prev.vote.open === m.vote.open
          && JSON.stringify(prev.vote.clock || null) === JSON.stringify(m.vote.clock || null)
          && JSON.stringify([prev.public, prev.hands, prev.timer, prev.room, prev.claimed, prev.dreamReveal]) === JSON.stringify([m.public, m.hands, m.timer, m.room, m.claimed, m.dreamReveal]);
        if (onlyVotes && patchVoteCircle(document.getElementById('screen'), m.vote)) {
          soundsFor(prev, m);
          lastPublic = m;
          S.vote = m.vote;
          return;
        }
        soundsFor(lastPublic, m);
        detectShots(m, !lastPublic);
        lastPublic = m;
        if (m.now) S.offset = m.now - Date.now();
        if ((m.dreamReveal || 0) > (S.dreamReveal || 0)) { if ((m.dreamReveal || 0) >= Math.min(3, (S.board && S.board.board.length) || 3)) sfx.fanfare(); else sfx.reveal(); }
        S.dreamReveal = m.dreamReveal || 0;
        S.pub = m.public; S.room = m.room; S.claimed = m.claimed || {}; S.hands = m.hands || []; S.vote = m.vote || null; S.timer = m.timer || null;
      }
      else if (m.t === 'board') S.board = m;
      else if (m.t === 'closed') S.error = 'closed';
      else if (m.t === 'error' && m.code === 'noroom') S.error = 'noroom';
      render();
    },
  });
  render();
}
