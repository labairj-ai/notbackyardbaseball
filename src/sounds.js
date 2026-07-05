let actx = null;

function ctx() {
  if (!actx) actx = new AudioContext();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, dur, type = 'sine', vol = 0.25, startFreq) {
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq ?? freq, c.currentTime);
    if (startFreq) osc.frequency.linearRampToValueAtTime(freq, c.currentTime + dur * 0.6);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch {}
}

export function playPitch()   { tone(280, 0.08, 'sine', 0.18); }
export function playSwing()   { tone(180, 0.12, 'sine', 0.15, 300); }

export function playHit(quality) {
  if (quality === 'PERFECT') {
    tone(700, 0.06, 'square', 0.3);
    setTimeout(() => tone(900, 0.18, 'square', 0.22), 40);
  } else if (quality === 'GOOD') {
    tone(520, 0.08, 'square', 0.25);
    setTimeout(() => tone(680, 0.14, 'square', 0.18), 40);
  } else {
    tone(320, 0.12, 'triangle', 0.18);
  }
}

export function playStrike() {
  tone(260, 0.12, 'sine', 0.2);
  setTimeout(() => tone(200, 0.25, 'sine', 0.18), 80);
}

export function playBall()    { tone(340, 0.1, 'sine', 0.12); }

export function playOut() {
  tone(300, 0.15, 'sine', 0.2);
  setTimeout(() => tone(220, 0.3, 'sine', 0.18), 120);
  setTimeout(() => tone(160, 0.4, 'sine', 0.15), 280);
}

export function playRun() {
  [440, 550, 660].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.22), i * 90));
}

export function playHomeRun() {
  [330, 440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.28), i * 70));
}

export function playFoul()    { tone(400, 0.08, 'triangle', 0.15); }

export function playWalk() {
  [350, 420].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.2), i * 100));
}
