// Storskjermen (Town Square): plasser, levende/døde, fase, kunngjøringer,
// QR-kode for å bli med og drømmetopplisten om natten. Viser aldri roller før spillet er slutt.

import { h } from '../app/dom.js';
import { LiveClient, joinUrl, qrSvg } from '../live/client.js';
import { revealCircle } from '../live/reveal.js';
import { voteCircle, tickVoteCircle } from '../live/voteclock.js';
import { sfx, enableSound, disableSound, soundEnabled } from '../live/sound.js';
import { applyTheme } from '../live/theme.js';

const TXT = {
  no: { join: 'Bli med: skann koden eller gå til', code: 'Romkode', setup: 'Venter på Storytelleren', night: 'Natt', day: 'Dag', ended: 'Spillet er slutt', alive: 'lever', votes: 'stemmer for å henrette', board: 'Drømmetoppliste', noScores: 'Hopp over hinder for å komme på lista!', good: 'Det gode laget vinner!', evil: 'Det onde laget vinner!', fullscreen: 'Fullskjerm', closed: 'Rommet er stengt.', noroom: 'Fant ikke rommet.', joined: 'inne', reveal: 'Grim reveal', hands: 'Talerekkefølge', noms: 'Nominasjoner i dag', voteNow: 'Stem nå på PC-en din!', voteClosed: 'Avstemningen er lukket', need: 'trengs', onBlock: 'På blokka', tie: 'Uavgjort – ingen er på blokka', executed: 'Henrettet i dag', noExec: 'Ingen henrettet i dag', votes2: 'stemmer', nominator: 'nominerer', nominee: 'nominert', startsIn: 'Viseren starter om', handAt: 'Viseren er hos', closed: 'Avstemningen er lukket', soundOn: 'Slå på lyd', soundOff: 'Lyd på', timer: 'Tid', timeUp: 'Tiden er ute!', voteBefore: 'Stem før viseren når deg!' },
  en: { join: 'Join: scan the code or go to', code: 'Room code', setup: 'Waiting for the Storyteller', night: 'Night', day: 'Day', ended: 'Game over', alive: 'alive', votes: 'votes to execute', board: 'Dream leaderboard', noScores: 'Clear obstacles to get on the list!', good: 'Good wins!', evil: 'Evil wins!', fullscreen: 'Fullscreen', closed: 'The room is closed.', noroom: 'Room not found.', joined: 'joined', reveal: 'Grim reveal', hands: 'Speaking order', noms: 'Nominations today', voteNow: 'Vote now on your computer!', voteClosed: 'The vote is closed', need: 'needed', onBlock: 'On the block', tie: 'Tie – nobody is on the block', executed: 'Executed today', noExec: 'Nobody executed today', votes2: 'votes', nominator: 'nominates', nominee: 'nominated', startsIn: 'The hand starts in', handAt: 'The hand is at', closed: 'The vote is closed', soundOn: 'Turn on sound', soundOff: 'Sound on', timer: 'Time', timeUp: 'Time is up!', voteBefore: 'Vote before the hand reaches you!' },
};

const S = { pub: null, room: null, claimed: {}, board: null, error: null, status: 'connecting', hands: [], vote: null, timer: null, offset: 0 };
const vtext = () => ({ nominator: T('nominator'), nominee: T('nominee'), startsIn: T('startsIn'), handAt: T('handAt'), closed: T('closed'), voteNow: '🗳 ' + T('voteNow') });
const nameOf = (id) => { const x = S.pub && S.pub.seats.find((y) => y.id === id); return x ? x.names.join(' + ') : '?'; };
const T = (k) => (TXT[S.pub && S.pub.lang === 'en' ? 'en' : 'no'][k]);
const code = (new URLSearchParams(location.search).get('room') || '').toUpperCase();

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
  return h('div', { class: 'grim-slot', style: `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%` },
    h('div', { class: 'token screen-token' + (seat.alive ? '' : ' dead') + (joined ? ' joined' : '') + (voted ? ' voted' : '') + (nominee ? ' nominee' : '') + (nominator ? ' nominator' : '') },
      h('span', { class: 'token-disc' },
        h('span', { class: 'token-num' }, String(i + 1)),
        h('span', { class: 'token-char' }, voted ? '✋' : nominee ? '⚖️' : initials),
        seat.alive ? null : h('span', { class: 'token-shroud', 'aria-hidden': 'true' }, '†'),
        handPos >= 0 ? h('span', { class: 'hand-badge' }, '✋' + (handPos + 1)) : null),
      h('span', { class: 'token-label' }, seat.names.join(' + '),
        seat.alive ? null : h('span', { class: 'ghost-vote' + (seat.ghostVote ? ' has' : '') }, seat.ghostVote ? '●' : '○'))));
}

function render() {
  const root = document.getElementById('screen');
  if (S.error) { root.replaceChildren(h('div', { class: 'screen-msg display' }, T(S.error) || S.error)); return; }
  if (!S.pub) { root.replaceChildren(h('div', { class: 'screen-msg display' }, '✦ Botc Helper')); return; }
  const p = S.pub;
  const ph = p.phase;
  applyTheme(ph.type);
  if (ph.type === 'ended') {
    root.replaceChildren(h('div', { class: 'screen screen-reveal' },
      revealCircle({ seats: p.seats, reveal: p.reveal || [], winner: p.winner, size: 150, text: { title: T('reveal'), good: T('good'), evil: T('evil') } }),
      h('button', { class: 'btn ghost small fs-btn', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen'))));
    return;
  }
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
              ph.type === 'day' || ph.type === 'night' ? h('span', { class: 'center-stat' }, `${alive} ${T('alive')} · ${Math.ceil(alive / 2)} ${T('votes')}`) : null,
              ph.type === 'setup' ? h('span', { class: 'center-stat' }, `${joinedN} / ${p.seats.length} ${T('joined')}`) : null,
              p.winner ? h('span', { class: 'display screen-winner ' + p.winner }, T(p.winner)) : null)),
          p.seats.map((seat, i) => seatToken(seat, i, n)))),
      h('aside', { class: 'screen-side' },
        timerCard(),
        S.vote && ph.type === 'day' && S.vote.open ? h('div', { class: 'vote-card-screen' + (S.vote.clock ? ' clock' : '') },
          h('div', { class: 'vcs-who display' }, h('span', { class: 'vc-nominator' }, nameOf(S.vote.nominatorId)), h('span', { class: 'vcs-arrow' }, ' ➜ '), h('span', { class: 'vc-nominee' }, nameOf(S.vote.nomineeId))),
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
          soundButton(),
          h('button', { class: 'btn ghost small', onclick: () => { try { document.documentElement.requestFullscreen(); } catch { /* */ } } }, '⛶ ' + T('fullscreen'))))));
  tick(true);
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
    h('div', { class: 'timer-bar' }, h('span', { id: 'screen-timer-bar', style: `width:${(100 * left * 1000 / Math.max(1, S.timer.durationMs)).toFixed(1)}%` })));
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
  // Timer
  const left = timerLeft();
  const el = document.getElementById('screen-timer');
  if (left !== null) {
    if (el) {
      el.textContent = left === 0 ? T('timeUp') : fmt(left);
      const card = el.closest('.timer-card');
      if (card) { card.classList.toggle('urgent', left <= 10); card.classList.toggle('up', left === 0); }
      const bar = document.getElementById('screen-timer-bar');
      if (bar) bar.style.width = `${(100 * left * 1000 / Math.max(1, S.timer.durationMs)).toFixed(1)}%`;
    }
    if (!fromRender && snd.timerSec !== left) {
      const endKey = S.timer.endsAt;
      if (left > 0 && left <= 10 && snd.timerSec !== null) sfx.tick();
      if (left === 0 && snd.timerEnd !== endKey && snd.timerSec !== null && snd.timerSec > 0) { snd.timerEnd = endKey; sfx.bell(); }
      snd.timerSec = left;
    }
  } else snd.timerSec = null;
}
setInterval(() => tick(false), 60);

// Lyder når noe skjer i spillet
function soundsFor(prev, m) {
  if (!prev) return;
  const a = prev.public; const b = m.public;
  if (a.phase.type !== b.phase.type || a.phase.number !== b.phase.number) {
    if (b.phase.type === 'night') sfx.gong();
    else if (b.phase.type === 'day') sfx.sunrise();
  }
  const pv = prev.vote; const nv = m.vote;
  if (nv && nv.open && (!pv || pv.id !== nv.id || !pv.open)) sfx.gavel();
  else if (nv && pv && nv.id === pv.id && nv.voters.length > pv.voters.length && !nv.clock) sfx.pop();
  if ((m.hands || []).length > (prev.hands || []).length) sfx.pop();
  const ea = a.day && a.day.executed; const eb = b.day && b.day.executed;
  if (eb && eb !== ea && eb !== 'none') sfx.boom();
  if (b.winner && b.winner !== a.winner) sfx.fanfare();
  const ra = (a.reveal || []).filter((x) => x.shown || x.character).length;
  const rb = (b.reveal || []).filter((x) => x.shown || x.character).length;
  if (rb > ra) sfx.reveal();
}
let lastPublic = null;

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
    d.block ? h('p', { class: 'strong' }, `${T('onBlock')}: ${nameOf(d.block.nomineeId)} (${d.block.votes})`) : d.tie ? h('p', { class: 'muted' }, T('tie')) : null,
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
        soundsFor(lastPublic, m);
        lastPublic = m;
        if (m.now) S.offset = m.now - Date.now();
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
