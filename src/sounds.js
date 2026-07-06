let actx = null;

function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, dur, type = 'sine', vol = 0.25, startFreq, at) {
  try {
    const c = ac();
    const t0 = at ?? c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq ?? freq, t0);
    if (startFreq) osc.frequency.linearRampToValueAtTime(freq, t0 + dur * 0.6);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {}
}

// ── Sound effects ──────────────────────────────────────────────────────────────

export function playPitch()   { tone(280, 0.08, 'sine', 0.16); }
export function playSwing()   { tone(180, 0.12, 'sine', 0.14, 320); }

// Crack of the bat — sharp noise transient + resonant wood tone
export function playHit(quality) {
  try {
    const c = ac(); const now = c.currentTime;
    const crackLen = Math.floor(c.sampleRate * 0.05);
    const crackBuf = c.createBuffer(1, crackLen, c.sampleRate);
    const cd = crackBuf.getChannelData(0);
    for (let i = 0; i < crackLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackLen, 1.2);
    const crackSrc = c.createBufferSource(); crackSrc.buffer = crackBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass';
    hp.frequency.value = quality === 'PERFECT' ? 3500 : quality === 'GOOD' ? 2200 : 1000;
    const cg = c.createGain();
    const vol = quality === 'PERFECT' ? 0.62 : quality === 'GOOD' ? 0.48 : 0.34;
    cg.gain.setValueAtTime(vol, now); cg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    crackSrc.connect(hp); hp.connect(cg); cg.connect(c.destination); crackSrc.start(now);
    const osc = c.createOscillator(); const og = c.createGain(); osc.type = 'triangle';
    const baseF = quality === 'PERFECT' ? 700 : quality === 'GOOD' ? 520 : 360;
    osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.32, now + 0.16);
    og.gain.setValueAtTime(0.3, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(og); og.connect(c.destination); osc.start(now); osc.stop(now + 0.17);
  } catch {}
}

// Ball smacking the catcher's glove — low leather thump (called strike)
export function playStrike() {
  try {
    const c = ac(); const now = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.1);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    const src = c.createBufferSource(); src.buffer = buf;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(lp); lp.connect(g); g.connect(c.destination); src.start(now);
    const osc = c.createOscillator(); const og = c.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now); osc.frequency.exponentialRampToValueAtTime(62, now + 0.07);
    og.gain.setValueAtTime(0.3, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(og); og.connect(c.destination); osc.start(now); osc.stop(now + 0.07);
  } catch {}
}

// Swing-and-miss: bat swoosh through air + catcher glove catch
export function playSwingMiss() {
  try {
    const c = ac(); const now = c.currentTime;
    // Whoosh
    const wLen = Math.floor(c.sampleRate * 0.07);
    const wBuf = c.createBuffer(1, wLen, c.sampleRate);
    const wd = wBuf.getChannelData(0);
    for (let i = 0; i < wLen; i++) wd[i] = (Math.random() * 2 - 1) * (1 - i / wLen);
    const wSrc = c.createBufferSource(); wSrc.buffer = wBuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.7;
    const wg = c.createGain();
    wg.gain.setValueAtTime(0.25, now); wg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    wSrc.connect(bp); bp.connect(wg); wg.connect(c.destination); wSrc.start(now);
    // Glove thump (100ms later)
    const tLen = Math.floor(c.sampleRate * 0.09);
    const tBuf = c.createBuffer(1, tLen, c.sampleRate);
    const td = tBuf.getChannelData(0);
    for (let i = 0; i < tLen; i++) td[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tLen, 1.6);
    const tSrc = c.createBufferSource(); tSrc.buffer = tBuf;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 580;
    const tg = c.createGain();
    tg.gain.setValueAtTime(0.45, now + 0.1); tg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    tSrc.connect(lp); lp.connect(tg); tg.connect(c.destination); tSrc.start(now + 0.1);
    const osc = c.createOscillator(); const og = c.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now + 0.1); osc.frequency.exponentialRampToValueAtTime(58, now + 0.17);
    og.gain.setValueAtTime(0.28, now + 0.1); og.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(og); og.connect(c.destination); osc.start(now + 0.1); osc.stop(now + 0.17);
  } catch {}
}

export function playBall() { tone(340, 0.1, 'sine', 0.11); }

export function playOut() {
  tone(300, 0.14, 'sine', 0.18);
  setTimeout(() => tone(220, 0.28, 'sine', 0.15), 110);
  setTimeout(() => tone(160, 0.38, 'sine', 0.12), 260);
}

export function playRun() {
  [440, 550, 660].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.2), i * 90));
}

export function playHomeRun() {
  [330, 440, 550, 660, 880, 1100].forEach((f, i) =>
    setTimeout(() => tone(f, 0.18, 'square', 0.26), i * 65)
  );
}

export function playFoul()   { tone(400, 0.08, 'triangle', 0.13); }

export function playWalk() {
  [350, 420].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.18), i * 100));
}

export function playThrow() {
  tone(700, 0.04, 'sine', 0.12, 1000);
  setTimeout(() => tone(350, 0.1, 'sine', 0.08), 50);
}

// Fielder catches the ball — leather bandpass snap
export function playCatch() {
  try {
    const c = ac(); const now = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.08);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.38, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(now);
    const osc = c.createOscillator(); const og = c.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
    og.gain.setValueAtTime(0.2, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(og); og.connect(c.destination); osc.start(now); osc.stop(now + 0.06);
  } catch {}
}

export function playSafe() {
  [392, 494, 587].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.16), i * 80));
}

export function playSlide() {
  try {
    const c = ac();
    const len = Math.floor(c.sampleRate * 0.18);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.28;
    const src = c.createBufferSource();
    const g = c.createGain();
    g.gain.setValueAtTime(1, c.currentTime);
    src.buffer = buf;
    src.connect(g);
    g.connect(c.destination);
    src.start();
  } catch {}
}

export function playInningBell() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sine', 0.16), i * 170));
  setTimeout(() => tone(1047, 0.55, 'sine', 0.13), 560);
}

export function playGameFinale(win) {
  const notes = win
    ? [523, 659, 784, 1047, 880, 784, 659, 1047]
    : [440, 392, 349, 330, 294];
  notes.forEach((f, i) => setTimeout(() => tone(f, win ? 0.2 : 0.32, 'square', 0.22), i * 130));
}

// ── Background music ───────────────────────────────────────────────────────────
// Uses Web Audio look-ahead scheduler for glitch-free looping

let musicPlaying = false;
let scheduleTimer = null;
let noteIdx = 0;
let nextNoteAt = 0;
let currentSong = null;
let currentInning = null;
let lastSongIdx = -1;

const BT = 60 / 136;        // beat duration at 136bpm
const E  = BT / 2;
const Q  = BT;
const DQ = BT * 1.5;
const H  = BT * 2;

// Song A — original bouncy loop
const MUSIC_A = [
  [659,E],[523,E],[659,Q],[784,E],[659,E],
  [784,DQ],[523,E],[659,E],[440,DQ],[0,E],
  [784,E],[659,E],[784,Q],[880,E],[784,E],
  [880,DQ],[784,E],[659,E],[523,DQ],[0,E],
  [523,E],[659,E],[784,E],[1047,Q],[880,E],
  [784,E],[659,E],[523,E],[440,E],[392,H],[0,E],
  [659,E],[784,E],[880,Q],[784,E],[659,E],
  [784,Q],[659,E],[523,E],[440,E],[330,H],[0,DQ],
];

// Song B — march/fanfare feel
const MUSIC_B = [
  [659,DQ],[523,E],[659,Q],[784,E],[659,E],
  [784,Q],[880,E],[784,E],[659,H],[0,E],
  [523,E],[523,E],[659,Q],[784,E],[523,E],
  [659,DQ],[523,E],[440,H],[0,E],
  [523,E],[659,E],[784,E],[880,E],[784,E],[659,E],
  [523,Q],[659,E],[523,E],[440,H],[0,E],
  [784,E],[880,E],[1047,Q],[880,E],[784,E],
  [659,Q],[523,E],[440,E],[523,H],[0,DQ],
];

// Song C — slower country/ballpark feel (lower register)
const MUSIC_C = [
  [330,Q],[392,Q],[440,DQ],[392,E],
  [330,H],[0,Q],[0,E],
  [392,Q],[440,Q],[523,DQ],[440,E],
  [392,H],[0,Q],[0,E],
  [523,E],[587,E],[659,Q],[587,E],[523,E],
  [440,Q],[392,E],[330,E],[392,H],[0,E],
  [523,E],[587,E],[659,E],[784,Q],[659,E],
  [587,E],[523,Q],[440,DQ],[330,E],[392,H],[0,E],
];

// Song D — fast/energetic
const MUSIC_D = [
  [523,E],[659,E],[784,E],[523,E],[659,E],[784,E],
  [880,Q],[784,Q],[659,Q],[0,E],
  [659,E],[784,E],[880,E],[659,E],[784,E],[880,E],
  [1047,Q],[880,Q],[784,Q],[0,E],
  [440,E],[523,E],[659,E],[784,E],[659,E],[523,E],
  [440,Q],[392,E],[330,E],[392,H],[0,E],
  [330,E],[392,E],[440,E],[523,E],[587,E],[659,E],
  [784,Q],[659,Q],[523,H],[0,DQ],
];

const SONGS = [MUSIC_A, MUSIC_B, MUSIC_C, MUSIC_D];

function scheduleMusic() {
  if (!musicPlaying || !actx || !currentSong) return;
  const ahead = 0.12;
  while (nextNoteAt < actx.currentTime + ahead) {
    const [freq, dur] = currentSong[noteIdx % currentSong.length];
    if (freq > 0) {
      try {
        const osc = actx.createOscillator();
        const g   = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.068, nextNoteAt);
        g.gain.exponentialRampToValueAtTime(0.001, nextNoteAt + dur * 0.82);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(nextNoteAt);
        osc.stop(nextNoteAt + dur);
      } catch {}
    }
    nextNoteAt += dur;
    noteIdx = (noteIdx + 1) % currentSong.length;
  }
  scheduleTimer = setTimeout(scheduleMusic, 40);
}

// Pick one random song per inning, avoiding an immediate repeat.
export function startMusic(inning) {
  if (musicPlaying && currentInning === inning) return;
  stopMusic();
  let songIdx = Math.floor(Math.random() * SONGS.length);
  if (SONGS.length > 1 && songIdx === lastSongIdx) {
    songIdx = (songIdx + 1 + Math.floor(Math.random() * (SONGS.length - 1))) % SONGS.length;
  }
  lastSongIdx = songIdx;
  currentInning = inning;
  currentSong = SONGS[songIdx];
  ac();
  musicPlaying = true;
  noteIdx = 0;
  nextNoteAt = actx.currentTime + 0.08;
  scheduleMusic();
}

export function stopMusic() {
  musicPlaying = false;
  if (scheduleTimer) clearTimeout(scheduleTimer);
  scheduleTimer = null;
}
