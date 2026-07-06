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

export function playHit(quality) {
  if (quality === 'PERFECT') {
    tone(700, 0.06, 'square', 0.28);
    setTimeout(() => tone(900, 0.18, 'square', 0.2), 40);
  } else if (quality === 'GOOD') {
    tone(520, 0.08, 'square', 0.22);
    setTimeout(() => tone(680, 0.14, 'square', 0.16), 40);
  } else {
    tone(320, 0.12, 'triangle', 0.16);
  }
}

export function playStrike() {
  tone(260, 0.12, 'sine', 0.18);
  setTimeout(() => tone(200, 0.25, 'sine', 0.15), 80);
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

export function playCatch() {
  tone(260, 0.05, 'square', 0.18);
  setTimeout(() => tone(160, 0.1, 'sine', 0.12), 35);
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

const BT = 60 / 136;        // beat duration at 136bpm
const E  = BT / 2;          // eighth note
const Q  = BT;               // quarter note
const DQ = BT * 1.5;         // dotted quarter
const H  = BT * 2;           // half note

// Original upbeat 8-bit baseball loop (C major pentatonic: C D E G A)
const MUSIC = [
  // Phrase A — bouncy ascending line
  [659,E],[523,E],[659,Q],[784,E],[659,E],
  [784,DQ],[523,E],[659,E],[440,DQ],[0,E],
  // Phrase B — higher register answer
  [784,E],[659,E],[784,Q],[880,E],[784,E],
  [880,DQ],[784,E],[659,E],[523,DQ],[0,E],
  // Phrase C — build up
  [523,E],[659,E],[784,E],[1047,Q],[880,E],
  [784,E],[659,E],[523,E],[440,E],[392,H],[0,E],
  // Phrase D — triumphant resolve
  [659,E],[784,E],[880,Q],[784,E],[659,E],
  [784,Q],[659,E],[523,E],[440,E],[330,H],[0,DQ],
];

function scheduleMusic() {
  if (!musicPlaying || !actx) return;
  const ahead = 0.12;
  while (nextNoteAt < actx.currentTime + ahead) {
    const [freq, dur] = MUSIC[noteIdx % MUSIC.length];
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
    noteIdx = (noteIdx + 1) % MUSIC.length;
  }
  scheduleTimer = setTimeout(scheduleMusic, 40);
}

export function startMusic() {
  if (musicPlaying) return;
  ac(); // ensure context
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
