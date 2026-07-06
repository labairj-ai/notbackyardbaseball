import {
  W, H, HOME, FIRST, SECOND, THIRD, MOUND, FX, FY, FENCE_R,
  FIELDER_HOMES, S, PITCHES, INNINGS, OUTS_PER_INNING,
  STRIKES_PER_OUT, BALLS_PER_WALK, CTRL_Y, HUD_H, THROW_POSITIONS,
} from './constants.js';
import { drawField, highlightBase } from './field.js';
import { drawKid, PLAYER_TEAM, CPU_TEAM } from './characters.js';
import {
  drawScoreboard, drawControlsBg, drawSwingButton, drawSwingModeButtons,
  drawPitchButtons, drawPitchButton, drawThrowButtons, drawThrowDecision,
  drawRunnerAdvance, drawMessage, drawCenterMessage, drawBatterInfo,
  drawStrikeZone, drawTapToContinue,
} from './ui.js';
import {
  playPitch, playSwing, playHit, playStrike, playSwingMiss, playBall,
  playOut, playRun, playHomeRun, playFoul, playWalk,
  playThrow, playCatch, playSafe, playSlide, playInningBell, playGameFinale,
  startMusic, stopMusic,
} from './sounds.js';

// ── Build info ────────────────────────────────────────────────────────────────
const BUILD_STAMP = __BUILD_TIME__;
function buildLabel() {
  try {
    const d = new Date(BUILD_STAMP);
    return d.toLocaleString('en-US', {
      timeZone: 'America/New_York', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }) + ' ET';
  } catch { return ''; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

const BASE_POS = [HOME, FIRST, SECOND, THIRD];
const PERSPECTIVE = 0.28;  // height → upward screen-offset ratio
const ARC_GRAVITY = 360;   // px/s²

// ── Entity classes ────────────────────────────────────────────────────────────
class Ball {
  constructor() { this.reset(); }
  reset() {
    this.x = MOUND.x; this.y = MOUND.y;
    this.vx = 0; this.vy = 0;
    this.vz = 0;       // upward velocity (px/s)
    this.height = 0;   // current height above ground
    this.inArc = false;
    this.landX = null; this.landY = null;
    this.trail = [];
    this.active = false;
  }
  update(dt) {
    if (!this.active) return;
    const renderY = this.y - this.height * PERSPECTIVE;
    this.trail.push({ x: this.x, y: renderY });
    if (this.trail.length > 14) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.inArc) {
      this.height += this.vz * dt;
      this.vz -= ARC_GRAVITY * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.inArc = false;
        this.active = false; // ball has landed
      }
    }
  }
  draw(ctx) {
    // Landing target ring (pulsing)
    if (this.inArc && this.landX !== null) {
      const pulse = 0.3 + Math.sin(Date.now() / 120) * 0.18;
      ctx.beginPath();
      ctx.arc(this.landX, this.landY, 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,0,${pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.landX, this.landY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,0,${pulse * 0.8})`;
      ctx.fill();
    }
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i / this.trail.length) * 0.3;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
    if (!this.active) return;
    const renderY = this.y - this.height * PERSPECTIVE;
    // Ground shadow — scales down as ball rises
    if (this.inArc) {
      const fade = Math.max(0.05, 0.5 * (1 - this.height / 150));
      const sw   = Math.max(2, 7 * (1 - this.height / 200));
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, sw, sw * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fill();
    }
    // Ball (grows slightly when high — parallax pop)
    const sz = 6 + this.height * 0.02;
    ctx.beginPath();
    ctx.ellipse(this.x + 1, renderY + 2, sz * 0.55, sz * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, renderY, sz, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(this.x - 2, renderY, sz * 0.6, -0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x + 2, renderY, sz * 0.6, Math.PI - 0.5, Math.PI + 0.5);
    ctx.stroke();
  }
}

class Fielder {
  constructor(home, color, skin) {
    this.hx = home.x; this.hy = home.y;
    this.x = home.x;  this.y = home.y;
    this.role = home.role;
    this.color = color;
    this.skin = skin;
    this.tx = home.x;  this.ty = home.y; // target
    this.speed = rand(130, 165);
    this.hasBall = false;
    this.anim = 0;
    this.throwAnim = 0;
  }
  update(dt) {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) {
      const spd = Math.min(this.speed, d / dt);
      this.x += (dx / d) * spd * dt;
      this.y += (dy / d) * spd * dt;
      this.anim += dt * 8;
    }
    this.hasBall && (this.anim = 0);
    if (this.throwAnim > 0) this.throwAnim = Math.max(0, this.throwAnim - dt * 2.8);
  }
  draw(ctx, team) {
    const bob = Math.sin(this.anim) * 2;
    const lean = Math.sin(this.throwAnim * Math.PI) * 5;
    drawKid(ctx, this.x + lean, this.y - bob, this.color, team.secondary, this.skin, 13);
    if (this.throwAnim > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - 12, this.y - 22);
      ctx.lineTo(this.x - 22, this.y - 18);
      ctx.stroke();
    }
    if (this.hasBall) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  moveTo(x, y)  { this.tx = x; this.ty = y; }
  returnHome()  { this.tx = this.hx; this.ty = this.hy; }
}

class Runner {
  constructor(player, base) {
    this.player = player;
    this.base = base;   // current base (0=home, 1=1B, 2=2B, 3=3B)
    this.x = BASE_POS[base].x;
    this.y = BASE_POS[base].y;
    this.targetBase = base;
    this.running = false;
    this.out = false;
    this.scored = false;
    this._anim = 0;
  }
  runTo(base) {
    this.targetBase = clamp(base, 0, 3);
    this.running = true;
  }
  update(dt) {
    if (this.out || this.scored) return;
    if (this.running) {
      this._anim = (this._anim + dt * 2.2) % 2;
      const target = BASE_POS[this.targetBase];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      const spd = (this.player.speed / 9) * 145 + 50;
      if (d < 4) {
        this.x = target.x; this.y = target.y;
        this.base = this.targetBase;
        this.running = false;
      } else {
        this.x += (dx / d) * spd * dt;
        this.y += (dy / d) * spd * dt;
      }
    }
  }
  draw(ctx, team) {
    if (this.scored || this.out) return;
    // Running bob: two bounces per stride cycle
    const bob = this.running ? Math.abs(Math.sin(this._anim * Math.PI)) * 5 : 0;
    drawKid(ctx, this.x, this.y - bob, team.primary, team.secondary, this.player.skin, 15);
  }
}

// ── Main Game class ───────────────────────────────────────────────────────────
export class Game {
  constructor() {
    this.playerTeam = PLAYER_TEAM;
    this.cpuTeam    = CPU_TEAM;
    this._resetGame();
  }

  // ── Init / Reset ────────────────────────────────────────────────────────────
  _resetGame() {
    this.state = S.MENU;
    this.inning = 1;
    this.topInning = true; // true = CPU bats (top), false = player bats (bottom)
    this.outs = 0;
    this.strikes = 0;
    this.balls = 0;
    this.score = { player: 0, cpu: 0 };
    this.inningScores = { player: Array(INNINGS).fill(null), cpu: Array(INNINGS).fill(null) };
    this.playerBatIdx = 0;
    this.cpuBatIdx    = 0;

    this.ball      = new Ball();
    this.runners   = [];   // active base runners
    this.fielders  = [];
    this.activeFielderIdx = -1;

    this.selectedPitchIdx = 0;
    this.pitchReady = false;   // player pressed PITCH
    this.swingZoneActive = false;

    this.msg        = '';
    this.msgColor   = '#fff';
    this.msgAlpha   = 0;
    this.msgTimer   = 0;

    this.stateTimer = 0;
    this.animTimer  = 0;

    // hit outcome queued before animation plays
    this._pendingOutcome = null;
    // batter swing animation
    this.swingAnim = 0;  // 0-1
    this.swingDir  = 1;  // 1 = swinging
    this.pitcherAnim = 0;
    this.swingMode = 'normal';  // 'normal' | 'power'
    this._throwAnim = null;
  }

  _startHalfInning() {
    this.outs = 0; this.strikes = 0; this.balls = 0;
    this.runners = [];
    this._spawnFielders();
    startMusic(this.inning);
    this._setState(S.PRE_PITCH);
  }

  _spawnFielders() {
    // CPU always fields when player bats; player fields when CPU bats
    const fieldsForCpu = !this.topInning; // player bats bottom = CPU fields
    const team = fieldsForCpu ? this.cpuTeam : this.playerTeam;
    const skins = team.players.map(p => p.skin);
    this.fielders = FIELDER_HOMES.map((h, i) =>
      new Fielder(h, team.primary, skins[i % skins.length])
    );
    this.activeFielderIdx = -1;
  }

  _setState(s) {
    this.state = s;
    this.stateTimer = 0;
  }

  // Current batter reference
  get _batter() {
    if (!this.topInning) {
      return this.playerTeam.players[this.playerBatIdx % this.playerTeam.players.length];
    }
    return this.cpuTeam.players[this.cpuBatIdx % this.cpuTeam.players.length];
  }

  _advanceBatterIdx() {
    if (!this.topInning) this.playerBatIdx++;
    else this.cpuBatIdx++;
  }

  // ── Core state transitions ──────────────────────────────────────────────────

  _beginPitch() {
    const pitch = PITCHES[this.selectedPitchIdx];
    const T = dist(MOUND, HOME) / pitch.speed;

    // Strike / ball location — each pitch type has different accuracy
    const strikeRates = [0.68, 0.50, 0.60];
    const isStrike = Math.random() < strikeRates[this.selectedPitchIdx];

    let targetX;
    if (isStrike) {
      targetX = HOME.x + rand(-14, 14);
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      const maxOff = [26, 36, 30][this.selectedPitchIdx];
      targetX = HOME.x + side * rand(18, maxOff);
    }

    // Curveball / change-up: ball initially swerves in the opposite direction then breaks
    // toward targetX — creates the late-break visual. Fastball is straight.
    const swerveMax = [0, rand(18, 28), rand(7, 14)][this.selectedPitchIdx];
    const swerveDir = Math.random() < 0.5 ? 1 : -1;
    const swerve = swerveMax * swerveDir;

    // vx0 sends ball (targetX + swerve) initially; _curveAccel corrects back to targetX
    // x(T) = MOUND.x + vx0*T + 0.9*_curveAccel*T²  →  set to targetX
    const xDisp = targetX - MOUND.x;
    const vx0 = (xDisp + swerve) / T;
    this._curveAccel = -swerve / (0.9 * T * T);

    this.ball.x  = MOUND.x; this.ball.y = MOUND.y;
    this.ball.vy = pitch.speed;
    this.ball.vx = vx0;
    this.ball.active = true;
    this.ball.trail = [];
    this.ball.inArc = false;
    this.ball.height = 0;

    this._pitchSpeed = pitch.speed;
    this.swingZoneActive = false;
    this.pitcherAnim = 1;
    playPitch();
    this._setState(S.PITCHING);
  }

  // Called when the player taps SWING
  _playerSwing() {
    if (this.state !== S.PITCHING || this.topInning) return;
    this.swingAnim = 1;

    const bally = this.ball.y;
    const diff  = Math.abs(bally - HOME.y);
    const xDiff = Math.abs(this.ball.x - HOME.x);

    // Power swing = 72% of normal window (harder to make contact, but better outcomes)
    const wm = this.swingMode === 'power' ? 0.72 : 1.0;

    let quality, hitPower;
    if (diff < 22 * wm && xDiff < 32 * wm) {
      quality = 'PERFECT'; hitPower = rand(0.75, 1.0);
    } else if (diff < 55 * wm && xDiff < 52 * wm) {
      quality = 'GOOD';    hitPower = rand(0.45, 0.78);
    } else if (diff < 90 * wm && xDiff < 72 * wm) {
      quality = 'WEAK';    hitPower = rand(0.2, 0.48);
    } else {
      playSwingMiss();
      this.strikes++;
      this._showMsg('STRIKE!', '#FFD700');
      this._checkCount();
      this.ball.active = false; this.ball.trail = [];
      if (this.state !== S.INNING_END) this._setState(S.PRE_PITCH);
      return;
    }

    // Hit direction — compute before foul check so ground spread can affect it
    const earlyLate = (bally - HOME.y) / 20;
    let hitAngle = Math.PI * 1.5 + (-earlyLate * 0.5) + rand(-0.35, 0.35);

    // Foul ball logic
    let isFoul = false;
    if (quality === 'WEAK') {
      // Ground balls: extra angular spread can roll foul down the lines
      hitAngle += rand(-0.6, 0.6);
      const leftFoul  = Math.PI * 1.25;  // toward 3B
      const rightFoul = Math.PI * 1.75;  // toward 1B
      isFoul = hitAngle < leftFoul || hitAngle > rightFoul;
    } else {
      // Fly/line drive: foul if pulled too far off-center
      isFoul = xDiff > 50;
    }

    if (isFoul) {
      playFoul();
      this._showMsg('FOUL BALL!', '#f4a261');
      if (this.strikes < 2) this.strikes++;
      this.ball.active = false; this.ball.trail = [];
      if (this.state !== S.INNING_END) this._setState(S.PRE_PITCH);
      return;
    }

    // It's a hit! Power swing boosts hitPower for extra-base potential
    if (this.swingMode === 'power') hitPower = Math.min(1.0, hitPower * 1.25);
    playSwing();
    playHit(quality);

    const maxSpeed = 420 + this._batter.power * 20;
    const speed = hitPower * maxSpeed;

    this._pendingOutcome = this._calcHitOutcome(quality, hitPower, speed);
    this._launchArc(hitAngle, hitPower);
    this._setState(S.HIT_ANIM);
    this._startFielderChase();
  }

  _launchArc(angle, power) {
    // Landing distances (px from HOME) by outcome type
    const LAND_DISTS   = { homer: 320, triple: 260, double: 195, single: 105, out: 60 };
    const FLIGHT_TIMES = { homer: 2.5, triple: 2.0, double: 1.55, single: 1.05, out: 0.55 };
    const type = this._pendingOutcome.type;
    const dist = LAND_DISTS[type]   + rand(-12, 12);
    const ft   = FLIGHT_TIMES[type] + rand(-0.08, 0.08);

    const lx = HOME.x + Math.cos(angle) * dist;
    const ly = HOME.y + Math.sin(angle) * dist;

    this.ball.x  = HOME.x;
    this.ball.y  = HOME.y;
    this.ball.vx = (lx - HOME.x) / ft;
    this.ball.vy = (ly - HOME.y) / ft;
    this.ball.height = 0;
    this.ball.vz     = 0.5 * ARC_GRAVITY * ft;
    this.ball.inArc  = true;
    this.ball.active = true;
    this.ball.trail  = [];
    this.ball.landX  = lx;
    this.ball.landY  = ly;
  }

  _spawnBurst(x, y, n, colors) {
    return Array.from({ length: n }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(55, 230);
      const life  = rand(0.7, 2.0);
      return { x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        ay: 210,
        color: colors[randInt(0, colors.length - 1)],
        size: rand(2.5, 8), life, maxLife: life };
    });
  }

  _startHomerCelebration(batter, team) {
    const HOMER_COLORS = ['#FFD700','#FFA500','#FF6347','#FF69B4','#87CEEB','#98FB98','#fff','#f4a261'];
    this._homer = {
      batter, team,
      phase: 0, progress: 0,
      x: HOME.x, y: HOME.y - 5,
      done: false,
      particles: this._spawnBurst(HOME.x, HOME.y, 45, HOMER_COLORS),
    };
    this._setState(S.HOMER_RUN);
  }

  _drawHomerCelebration(ctx) {
    const h = this._homer;
    if (!h) return;

    // Atmospheric golden wash over field
    ctx.fillStyle = 'rgba(255,195,0,0.07)';
    ctx.fillRect(0, HUD_H, W, CTRL_Y - HUD_H);

    // Particles
    h.particles.forEach(p => {
      if (p.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    });

    // Glow each base the runner has passed
    [FIRST, SECOND, THIRD].forEach((base, i) => {
      if (i < h.phase) {
        const g = ctx.createRadialGradient(base.x, base.y, 0, base.x, base.y, 22);
        g.addColorStop(0, 'rgba(255,215,0,0.55)');
        g.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(base.x, base.y, 22, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Running character
    if (!h.done && h.batter && h.team) {
      const bob = Math.sin(this.animTimer * 14) * 3;
      drawKid(ctx, h.x, h.y - bob, h.team.primary, h.team.secondary, h.batter.skin, 20);
    }

    // "HOME RUN!!!" banner
    const pulse = 1 + Math.sin(this.animTimer * 5.5) * 0.055;
    ctx.save();
    ctx.translate(W / 2, 186);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.roundRect(-122, -30, 244, 60, 14); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(-122, -30, 244, 60, 14); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 35px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('HOME RUN!!!', 0, 0);
    ctx.restore();

    // Orbiting sparkle dots
    for (let i = 0; i < 10; i++) {
      const a  = this.animTimer * 2.1 + i * (Math.PI * 2 / 10);
      const r  = 108 + Math.sin(this.animTimer * 3 + i) * 14;
      const sx = W / 2 + Math.cos(a) * r;
      const sy = 186 + Math.sin(a) * (r * 0.28);
      const ss = 2.8 + Math.sin(this.animTimer * 4.5 + i) * 1.5;
      const sa = 0.45 + Math.sin(this.animTimer * 6 + i * 0.8) * 0.35;
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,0,${sa})`; ctx.fill();
    }
  }

  _handleThrow(baseIdx) {
    if (this.state !== S.THROW_DECISION) return;
    const targetBase = [1, 2, 3, 0][baseIdx];
    const basePos = BASE_POS[targetBase];
    const fielder = this.activeFielderIdx >= 0 ? this.fielders[this.activeFielderIdx] : null;

    const fromX = fielder ? fielder.x : MOUND.x;
    const fromY = fielder ? fielder.y : MOUND.y;
    const throwDist = Math.hypot(basePos.x - fromX, basePos.y - fromY);
    const throwTime = throwDist / 340;  // throw speed px/s

    // Pre-compute outcome (ball is in flight, runners keep running)
    let outRunner = null;
    this.runners.forEach(r => {
      if (r.out || r.scored) return;
      if (r.targetBase === targetBase) {
        const runDist  = Math.hypot(r.x - basePos.x, r.y - basePos.y);
        const runSpeed = (r.player.speed / 9) * 145 + 50;
        if (throwTime < runDist / runSpeed && runDist > 8) outRunner = r;
      }
    });

    if (fielder) {
      fielder.hasBall = false;
      fielder.throwAnim = 1;
    }
    playThrow();

    // Animate ball flying to the base
    const duration = Math.max(0.22, Math.min(throwTime, 0.75));
    this._throwAnim = { fromX, fromY, toX: basePos.x, toY: basePos.y,
                        progress: 0, duration, outRunner, targetBase };
    this.ball.reset();
    this.ball.x = fromX; this.ball.y = fromY;
    this.ball.vx = 0; this.ball.vy = 0;
    this.ball.active = true; this.ball.inArc = false; this.ball.height = 0;
    this._setState(S.THROW_ANIM);
  }

  _handleRunnerAdvance(runnerIdx) {
    if (this.state !== S.RUNNER_ADVANCE) return;
    const runner = this.runners[runnerIdx];
    if (!runner || runner.out || runner.scored) return;

    const nextBase = runner.targetBase + 1;
    const fielder  = this.activeFielderIdx >= 0 ? this.fielders[this.activeFielderIdx] : null;

    if (nextBase >= 4) {
      // Try to score — check if fielder can nail them at home
      let thrownOut = false;
      if (fielder) {
        const throwDist = Math.hypot(fielder.x - HOME.x, fielder.y - HOME.y);
        const runDist   = Math.hypot(runner.x - HOME.x, runner.y - HOME.y);
        const runSpeed  = (runner.player.speed / 9) * 145 + 50;
        if ((throwDist / 340) < (runDist / runSpeed) - 0.2) thrownOut = true;
      }
      if (thrownOut) {
        runner.out = true;
        playOut();
        setTimeout(() => playSlide(), 200);
        this.outs++;
        this._showMsg('OUT AT HOME!', '#ff8f8f');
        this.runners = this.runners.filter(r => !r.out);
        this._checkInning();
        if (this.state === S.INNING_END) return;
      } else {
        runner.scored = true;
        this.score.player++;
        const inn = this.inning - 1;
        this.inningScores.player[inn] = (this.inningScores.player[inn] ?? 0) + 1;
        playRun();
        this._showMsg('+1 RUN!', '#FFD700');
        this.runners = this.runners.filter(r => !r.scored);
      }
    } else {
      runner.runTo(nextBase);
      this._showMsg('SEND IT!', '#4cc9f0');
    }
    this._setState(S.PLAY_RESULT);
  }

  _calcHitOutcome(quality, power, speed) {
    const luck = (this._batter.luck ?? 5) / 10;
    const roll = Math.random() * 0.22 + power * 0.78 + luck * 0.12;
    const mk = (type, bases, label, color) => ({ type, bases, label, color });

    if (this.swingMode === 'power') {
      // Power swing: more extra-base hits, less likely to get singles
      if (roll > 0.88) return mk('homer',  4, 'HOME RUN!!',   '#FFD700');
      if (roll > 0.73) return mk('triple', 3, 'TRIPLE!!',     '#f4a261');
      if (roll > 0.52) return mk('double', 2, 'DOUBLE!',      '#4cc9f0');
      if (roll > 0.20) return mk('single', 1, 'SINGLE!',      '#7fff7f');
    } else {
      // Normal swing: more singles/doubles, homers rare but possible
      if (roll > 0.96) return mk('homer',  4, 'HOME RUN!!',   '#FFD700');
      if (roll > 0.86) return mk('triple', 3, 'TRIPLE!!',     '#f4a261');
      if (roll > 0.63) return mk('double', 2, 'DOUBLE!',      '#4cc9f0');
      if (roll > 0.20) return mk('single', 1, 'SINGLE!',      '#7fff7f');
    }
    return mk('out', 0, quality === 'WEAK' ? 'GROUNDOUT' : 'FLYOUT!', '#ff8f8f');
  }

  _startFielderChase() {
    const lx = this.ball.landX ?? (this.ball.x + this.ball.vx * 0.8);
    const ly = this.ball.landY ?? (this.ball.y + this.ball.vy * 0.8);
    let best = -1, bestD = Infinity;
    this.fielders.forEach((f, i) => {
      const d = Math.hypot(f.hx - lx, f.hy - ly);
      if (d < bestD) { bestD = d; best = i; }
    });
    this.activeFielderIdx = best;
    if (best >= 0) {
      const landX = clamp(lx, FX - FENCE_R + 5, FX + FENCE_R - 5);
      const landY = clamp(ly, HUD_H + 10, CTRL_Y - 10);
      this.fielders[best].moveTo(landX, landY);
    }
  }

  _resolveHit() {
    const outcome = this._pendingOutcome;
    if (!outcome) return;

    if (outcome.type === 'out') {
      playOut();
      this.outs++;
      this._showMsg(outcome.label, outcome.color);
      this._advanceBatterIdx();
      this._resetCount();
      this._checkInning();
    } else {
      // Advance runners first
      let runsScored = 0;
      this.runners.forEach(r => {
        const newBase = r.base + outcome.bases;
        if (newBase >= 4) {
          r.scored = true;
          runsScored++;
        } else {
          r.runTo(newBase);
        }
      });
      this.runners = this.runners.filter(r => !r.scored);

      // Place batter as new runner
      if (outcome.bases < 4) {
        const newRunner = new Runner(this._batter, 0);
        newRunner.runTo(outcome.bases);
        this.runners.push(newRunner);
      } else {
        runsScored++; // batter scores on HR
        if (outcome.type === 'homer') playHomeRun();
      }

      // Score runs
      if (!this.topInning) {
        this.score.player += runsScored;
        const inn = this.inning - 1;
        this.inningScores.player[inn] = (this.inningScores.player[inn] ?? 0) + runsScored;
      } else {
        this.score.cpu += runsScored;
        const inn = this.inning - 1;
        this.inningScores.cpu[inn] = (this.inningScores.cpu[inn] ?? 0) + runsScored;
      }
      if (runsScored > 0 && outcome.type !== 'homer') playRun();

      this._showMsg(outcome.label, outcome.color);
      this._advanceBatterIdx();
      this._resetCount();
    }
    this._pendingOutcome = null;
  }

  _checkCount() {
    if (this.strikes >= STRIKES_PER_OUT) {
      playOut();
      this.outs++;
      this._showMsg('STRIKEOUT!', '#ff8f8f');
      this._advanceBatterIdx();
      this._resetCount();
      this._checkInning();
    } else if (this.balls >= BALLS_PER_WALK) {
      playWalk();
      this._showMsg('WALK!', '#4cc9f0');
      // Advance runner from walk
      const newRunner = new Runner(this._batter, 0);
      newRunner.runTo(1);
      this.runners.push(newRunner);
      this._advanceBatterIdx();
      this._resetCount();
    }
  }

  _resetCount() {
    this.strikes = 0;
    this.balls = 0;
  }

  _checkInning() {
    if (this.outs >= OUTS_PER_INNING) {
      this.runners = [];
      this._setState(S.INNING_END);
    }
  }

  _showMsg(text, color = '#fff', dur = 1.6) {
    this.msg = text; this.msgColor = color;
    this.msgAlpha = 1; this.msgTimer = dur;
  }

  // CPU auto-swing logic
  _cpuSwing() {
    const bally = this.ball.y;
    const ballx = this.ball.x;
    const diff   = Math.abs(bally - HOME.y);
    const xDiff  = Math.abs(ballx - HOME.x);
    const cpuEye = this._batter.eye / 10;

    // CPU swings if ball is near plate, biased by eye stat
    if (diff < 30 && xDiff < 30 && Math.random() < cpuEye * 1.1) {
      this.swingAnim = 1;
      playSwing();
      const hitRoll = Math.random();
      if (hitRoll < cpuEye * 0.8) {
        const power = rand(0.25, 0.85);
        const angle = Math.PI * 1.5 + rand(-0.5, 0.5);
        const speed = power * (380 + this._batter.power * 18);
        const quality = power > 0.6 ? 'PERFECT' : power > 0.4 ? 'GOOD' : 'WEAK';
        playHit(quality);
        this._pendingOutcome = this._calcHitOutcome(quality, power, speed);
        this._launchArc(angle, power);
        this._setState(S.HIT_ANIM);
        this._startFielderChase();
      } else {
        // CPU misses
        playSwingMiss();
        this.strikes++;
        this._showMsg('STRIKE!', '#FFD700');
        this._checkCount();
      }
    } else if (diff > 40 || xDiff > 30) {
      // CPU takes the pitch
      const isBall = diff > 38 || xDiff > 28;
      if (isBall) {
        playBall();
        this.balls++;
        this._checkCount();
      } else {
        playStrike();
        this.strikes++;
        this._showMsg('CALLED STRIKE', '#FFD700');
        this._checkCount();
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(dt) {
    this.stateTimer += dt;
    this.animTimer  += dt;

    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      this.msgAlpha = clamp(this.msgTimer / 0.4, 0, 1);
    }

    if (this.swingAnim > 0) this.swingAnim = Math.max(0, this.swingAnim - dt * 3);
    if (this.pitcherAnim > 0) this.pitcherAnim = Math.max(0, this.pitcherAnim - dt * 2.5);

    this.ball.update(dt);
    this.fielders.forEach(f => f.update(dt));
    this.runners.forEach(r => r.update(dt));

    switch (this.state) {
      case S.MENU:
        break;

      case S.PRE_PITCH:
        // CPU pitches (player bats): pick random pitch type and fire
        if (!this.topInning && this.stateTimer > 1.2) {
          this.selectedPitchIdx = randInt(0, 2);
          this._beginPitch();
        }
        // When topInning=true, player pitches — wait for PITCH button tap
        break;

      case S.PITCHING: {
        // Apply curve acceleration
        this.ball.vx += this._curveAccel * dt * 1.8;

        // Activate swing zone early so kids can see it and react
        if (this.ball.y > HOME.y - 100) this.swingZoneActive = true;

        // Ball passed plate — auto-evaluate for CPU hitter
        if (this.ball.y > HOME.y + 20) {
          if (this.topInning) {
            // CPU bats: auto swing
            this._cpuSwing();
            if (this.state === S.PITCHING) {
              // CPU didn't swing or miss — re-queue
              this.ball.active = false;
              this.ball.trail = [];
              this._setState(S.PRE_PITCH);
            }
          } else {
            // Player bats: ball missed (no swing) = ball or called strike
            const xOff = Math.abs(this.ball.x - HOME.x);
            if (xOff < 22) {
              playStrike();
              this.strikes++;
              this._showMsg('CALLED STRIKE', '#FFD700');
              this._checkCount();
            } else {
              playBall();
              this.balls++;
              this._checkCount();
            }
            this.ball.active = false;
            this.ball.trail = [];
            if (this.state !== S.INNING_END) this._setState(S.PRE_PITCH);
          }
        }
        break;
      }

      case S.HIT_ANIM: {
        const ballLanded = !this.ball.active && !this.ball.inArc && this.stateTimer > 0.15;
        if (ballLanded || this.stateTimer > 3.8) {
          this.ball.active = false;
          if (this.activeFielderIdx >= 0) {
            this.fielders[this.activeFielderIdx].hasBall = true;
            playCatch();
          }
          const preOutcome  = this._pendingOutcome;
          const homerBatter = preOutcome?.type === 'homer' ? this._batter : null;
          const homerTeam   = preOutcome?.type === 'homer'
            ? (this.topInning ? this.cpuTeam : this.playerTeam) : null;
          this._resolveHit();
          if (this.state === S.INNING_END) break;

          if (preOutcome?.type === 'homer') {
            this._startHomerCelebration(homerBatter, homerTeam);
          } else if (this.topInning && preOutcome?.type !== 'out' && this.runners.length > 0) {
            this._setState(S.THROW_DECISION);
          } else if (!this.topInning && preOutcome?.type !== 'out') {
            this._setState(S.RUNNER_ADVANCE);
          } else {
            this._setState(S.PLAY_RESULT);
          }
        }
        break;
      }

      case S.HOMER_RUN: {
        const HOMER_COLORS = ['#FFD700','#FFA500','#FF6347','#FF69B4','#87CEEB','#98FB98','#fff'];
        const BASES = [HOME, FIRST, SECOND, THIRD, HOME];
        const LEG = 0.82;
        const h = this._homer;
        if (!h) { this._setState(S.PLAY_RESULT); break; }

        // Update particles
        h.particles.forEach(p => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vy += p.ay * dt; p.life -= dt;
        });
        h.particles = h.particles.filter(p => p.life > 0);

        // Trail sparkles near runner
        if (!h.done && Math.random() < 0.65) {
          const life = rand(0.28, 0.7);
          h.particles.push({ x: h.x + rand(-10,10), y: h.y + rand(-10,10),
            vx: rand(-35,35), vy: rand(-70,-10), ay: 60,
            color: HOMER_COLORS[randInt(0,6)], size: rand(1.5,4.5), life, maxLife: life });
        }

        // Advance runner along base circuit
        if (!h.done) {
          h.progress += dt / LEG;
          if (h.progress >= 1) {
            h.progress = 0;
            h.phase++;
            const burstBase = BASES[Math.min(h.phase, 4)];
            h.particles.push(...this._spawnBurst(burstBase.x, burstBase.y, 28, HOMER_COLORS));
            if (h.phase >= 4) { h.done = true; h.x = HOME.x; h.y = HOME.y - 5; }
          }
          if (!h.done) {
            h.x = lerp(BASES[h.phase].x, BASES[h.phase+1].x, h.progress);
            h.y = lerp(BASES[h.phase].y, BASES[h.phase+1].y, h.progress);
          }
        }
        if (h.done && this.stateTimer > 4 * LEG + 1.2) this._setState(S.PLAY_RESULT);
        break;
      }

      case S.THROW_DECISION:
        if (this.stateTimer > 2.8) this._setState(S.PLAY_RESULT);
        break;

      case S.THROW_ANIM: {
        const t = this._throwAnim;
        if (!t) {
          this._setState(S.PLAY_RESULT);
          break;
        }
        t.progress = Math.min(1, t.progress + dt / t.duration);
        const eased = 1 - Math.pow(1 - t.progress, 2);
        this.ball.x = lerp(t.fromX, t.toX, eased);
        this.ball.y = lerp(t.fromY, t.toY, eased);
        this.ball.height = Math.sin(t.progress * Math.PI) * 28;
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y - this.ball.height * PERSPECTIVE });
        if (this.ball.trail.length > 14) this.ball.trail.shift();

        if (t.progress >= 1) {
          this.ball.active = false;
          playCatch();
          if (t.outRunner && !t.outRunner.out && !t.outRunner.scored) {
            t.outRunner.out = true;
            this.outs++;
            playSlide();
            playOut();
            this._showMsg('OUT!', '#ff8f8f');
            this.runners = this.runners.filter(r => !r.out);
            this._checkInning();
          } else {
            playSafe();
            this._showMsg('SAFE!', '#7fff7f');
          }
          this._throwAnim = null;
          if (this.state !== S.INNING_END) this._setState(S.PLAY_RESULT);
        }
        break;
      }

      case S.RUNNER_ADVANCE:
        if (this.stateTimer > 2.8) this._setState(S.PLAY_RESULT);
        break;

      case S.PLAY_RESULT:
        if (this.stateTimer > 2.2) {
          // Clear fielder hasBall, return home
          this.fielders.forEach(f => { f.hasBall = false; f.returnHome(); });
          this.ball.reset();
          this.ball.x = MOUND.x; this.ball.y = MOUND.y;
          if (this.outs >= OUTS_PER_INNING) {
            this._setState(S.INNING_END);
          } else {
            this._setState(S.PRE_PITCH);
          }
        }
        break;

      case S.INNING_END:
        if (this.stateTimer > 2.8) {
          this.topInning = !this.topInning;
          if (!this.topInning && this.inning > INNINGS) {
            playGameFinale(this.score.player >= this.score.cpu);
            stopMusic();
            this._setState(S.GAME_OVER);
          } else if (this.topInning) {
            this.inning++;
            if (this.inning > INNINGS) {
              playGameFinale(this.score.player >= this.score.cpu);
              stopMusic();
              this._setState(S.GAME_OVER);
            } else {
              playInningBell();
              this._startHalfInning();
            }
          } else {
            playInningBell();
            this._startHalfInning();
          }
        }
        break;

      case S.GAME_OVER:
        break;
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw(ctx) {
    ctx.clearRect(0, 0, W, H);

    if (this.state === S.MENU) {
      this._drawMenu(ctx);
      return;
    }

    // Field + scoreboard
    drawField(ctx);
    drawScoreboard(ctx, this);

    // Highlight occupied bases
    this.runners.forEach(r => {
      if (!r.out && !r.scored) highlightBase(ctx, r.base, '#FFD700');
    });

    // Draw fielders
    const defTeam = this.topInning ? this.playerTeam : this.cpuTeam;
    this.fielders.forEach(f => f.draw(ctx, defTeam));

    // Draw runners
    const runTeam = this.topInning ? this.cpuTeam : this.playerTeam;
    this.runners.forEach(r => r.draw(ctx, runTeam));

    // Draw batter (only during active at-bat — disappears once play resolves)
    if (this.state === S.PRE_PITCH || this.state === S.PITCHING || this.state === S.HIT_ANIM) {
      const batTeam  = this.topInning ? this.cpuTeam : this.playerTeam;
      const batSkin  = this._batter.skin;
      const swingOff = this.swingAnim * 12;
      const bx = HOME.x - 20 + swingOff;
      const by = HOME.y - 5;
      this._drawBat(ctx, bx, by, this.swingAnim);
      drawKid(ctx, bx, by, batTeam.primary, batTeam.secondary, batSkin, 17);
    }

    // Ball
    this.ball.draw(ctx);

    // Strike zone (faint)
    if (this.state === S.PITCHING && !this.topInning) {
      drawStrikeZone(ctx, 0.35 + Math.sin(this.animTimer * 4) * 0.1);
    }

    // Controls area
    drawControlsBg(ctx);
    this._drawControls(ctx);

    // Batter info (only when player is batting — avoids overlap with pitch buttons)
    if (!this.topInning && this.state === S.PITCHING) {
      drawBatterInfo(ctx, this._batter, batTeam.primary);
    }

    // Messages
    if (this.msgAlpha > 0) {
      drawMessage(ctx, this.msg, this.msgColor, 38, this.msgAlpha);
    }

    // Homer celebration overlay (drawn above everything on field)
    if (this.state === S.HOMER_RUN) this._drawHomerCelebration(ctx);

    // State-specific overlays
    if (this.state === S.INNING_END) this._drawInningEnd(ctx);
    if (this.state === S.GAME_OVER)  this._drawGameOver(ctx);
    if (this.state === S.PLAY_RESULT && this.stateTimer > 1.5) {
      drawTapToContinue(ctx);
    }
  }

  _drawBat(ctx, x, y, swingAnim) {
    // Pivot at batter's hands (right side, arm height, size-17 character)
    const hx = x + 9;
    const hy = y - 9;
    // Angle: 0.6 = ready/cocked (lower-right), sweeps CCW to -1.55 = follow-through (upper)
    const angle = swingAnim === 0 ? 0.6 : lerp(0.6, -1.55, 1 - swingAnim);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    // Handle shaft (behind the pivot, negative direction)
    ctx.fillStyle = '#7B4A1E';
    ctx.beginPath();
    ctx.roundRect(-12, -2.2, 15, 5, 2);
    ctx.fill();

    // Knob at handle end
    ctx.fillStyle = '#4A2008';
    ctx.beginPath();
    ctx.arc(-12, 0.5, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Barrel (forward, positive direction)
    ctx.fillStyle = '#C4883A';
    ctx.beginPath();
    ctx.roundRect(3, -5, 22, 10, 4.5);
    ctx.fill();

    // Barrel end cap
    ctx.beginPath();
    ctx.arc(25, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle wood grain lines on barrel
    ctx.strokeStyle = 'rgba(90,45,8,0.32)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      const gx = 7 + i * 6;
      ctx.beginPath(); ctx.moveTo(gx, -4); ctx.lineTo(gx, 4); ctx.stroke();
    }

    ctx.restore();
  }

  _drawControls(ctx) {
    switch (this.state) {
      case S.PITCHING:
        if (!this.topInning) {
          // Player batting — show swing button
          drawSwingButton(ctx, this.swingZoneActive);
        } else {
          // Player pitching — pitch is in flight, nothing to tap
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#4cc9f0';
          ctx.font = '16px monospace';
          ctx.fillText('⚾  PITCH IN FLIGHT...', W/2, CTRL_Y + 72);
        }
        break;

      case S.PRE_PITCH:
        if (this.topInning) {
          // Player pitching (CPU bats) — show pitch selector + pitch button
          drawPitchButtons(ctx, this.selectedPitchIdx);
          drawPitchButton(ctx);
        } else {
          // Choose contact vs. power before the CPU delivers.
          drawSwingModeButtons(ctx, this.swingMode);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#aaa';
          ctx.font = '12px monospace';
          ctx.fillText('CHOOSE YOUR SWING', W/2, CTRL_Y + 92);
        }
        break;

      case S.HIT_ANIM:
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('⚾', W/2, CTRL_Y + 72);
        break;

      case S.HOMER_RUN:
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 17px monospace';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('ROUNDING THE BASES!', W/2, CTRL_Y + 50);
        ctx.font = '13px monospace';
        ctx.fillStyle = '#f4a261';
        ctx.fillText("that's a DINGER!", W/2, CTRL_Y + 78);
        break;

      case S.THROW_DECISION:
        drawThrowDecision(ctx, this);
        break;

      case S.THROW_ANIM:
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4cc9f0';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('THROWING...', W/2, CTRL_Y + 72);
        break;

      case S.RUNNER_ADVANCE:
        drawRunnerAdvance(ctx, this);
        break;

      case S.PLAY_RESULT:
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#888';
        ctx.font = '14px monospace';
        ctx.fillText('', W/2, CTRL_Y + 72);
        break;
    }
  }

  _drawMenu(ctx) {
    // Background
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 173) % W);
      const sy = ((i * 97)  % H);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.random() < 0.1 ? 2 : 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.1})`;
      ctx.fill();
    }

    // Mini field
    ctx.save();
    ctx.translate(W/2, 280);
    ctx.scale(0.45, 0.45);
    ctx.translate(-W/2, -FY);
    drawField(ctx);
    ctx.restore();

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(30, 55, W - 60, 90, 16);
    ctx.fill();

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#e63946';
    ctx.fillText('NOT', W/2, 80);
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('BACKYARD', W/2, 112);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('BASEBALL', W/2, 140);

    // Teams preview
    [PLAYER_TEAM, CPU_TEAM].forEach((team, i) => {
      const ty = 220 + i * 52;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(40, ty, W - 80, 44, 10);
      ctx.fill();
      ctx.strokeStyle = team.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, ty, W - 80, 44, 10);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = team.primary;
      ctx.fillText(team.name, 58, ty + 16);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(team.players.map(p => p.name).join('  '), 58, ty + 32);

      // Draw tiny kid
      drawKid(ctx, W - 65, ty + 22, team.primary, team.secondary, team.players[0].skin, 12);
    });

    // Innings badge
    ctx.fillStyle = '#1a3a6b';
    ctx.beginPath();
    ctx.roundRect(W/2 - 60, 335, 120, 30, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${INNINGS} INNINGS`, W/2, 350);

    // Play button
    const pulse = 1 + Math.sin(this.animTimer * 2) * 0.04;
    ctx.save();
    ctx.translate(W/2, 430);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.roundRect(-90, -32, 180, 64, 18);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-90, -32, 180, 64, 18);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('▶ PLAY BALL!', 0, 0);
    ctx.restore();

    // Credits
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';
    ctx.fillText('notbackyardbaseball', W/2, H - 30);
    ctx.fillStyle = '#333';
    ctx.font = '10px monospace';
    ctx.fillText(`v ${buildLabel()}`, W/2, H - 14);
  }

  _drawInningEnd(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    const label = this.topInning
      ? `TOP ${this.inning} OVER`
      : `BOTTOM ${this.inning} OVER`;

    drawCenterMessage(ctx, [
      { text: label,                      size: 28, color: '#FFD700', gap: 42 },
      { text: `${this.playerTeam.name}`,  size: 16, color: this.playerTeam.primary, gap: 36 },
      { text: `${this.score.player}  —  ${this.score.cpu}`, size: 32, color: '#fff', gap: 42 },
      { text: `${this.cpuTeam.name}`,     size: 16, color: this.cpuTeam.primary, gap: 36 },
    ], H/2 - 60);
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    const win = this.score.player > this.score.cpu;
    const tie = this.score.player === this.score.cpu;
    const headline = tie ? "IT'S A TIE!" : win ? 'YOU WIN! 🏆' : 'YOU LOSE!';
    const headColor = tie ? '#FFD700' : win ? '#7fff7f' : '#ff8f8f';

    drawCenterMessage(ctx, [
      { text: 'GAME OVER',  size: 22, color: '#aaa',      gap: 48 },
      { text: headline,     size: 36, color: headColor,   gap: 56 },
      { text: `${this.playerTeam.name}`, size: 14, color: this.playerTeam.primary, gap: 34 },
      { text: `${this.score.player}  —  ${this.score.cpu}`, size: 32, color: '#fff', gap: 48 },
      { text: `${this.cpuTeam.name}`,    size: 14, color: this.cpuTeam.primary, gap: 56 },
    ], H/2 - 100);

    // Play again button
    const pulse = 1 + Math.sin(this.animTimer * 2.5) * 0.03;
    ctx.save();
    ctx.translate(W/2, H/2 + 130);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#1d6e2e';
    ctx.beginPath();
    ctx.roundRect(-80, -25, 160, 50, 14);
    ctx.fill();
    ctx.strokeStyle = '#5ec97a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-80, -25, 160, 50, 14);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PLAY AGAIN', 0, 0);
    ctx.restore();
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  pointerDown(p) {
    switch (this.state) {
      case S.MENU:
        this._startHalfInning();
        break;

      case S.GAME_OVER:
        this._resetGame();
        this._startHalfInning();
        break;

      case S.PRE_PITCH:
        if (this.topInning) {
          // Player pitching — check pitch type buttons
          this._handlePitchTypeSelect(p);
          // Check PITCH button
          if (this._hitPitchButton(p)) {
            this._beginPitch();
          }
        } else {
          this._handleSwingModeSelect(p);
        }
        break;

      case S.PITCHING:
        if (!this.topInning) {
          // Player batting — swing button
          if (this._hitSwingButton(p)) {
            this._playerSwing();
          }
        }
        break;

      case S.THROW_DECISION: {
        const tr = 38; // hit radius for throw buttons
        THROW_POSITIONS.forEach((pos, i) => {
          if (Math.hypot(p.x - pos.x, p.y - pos.y) < tr) this._handleThrow(i);
        });
        break;
      }

      case S.RUNNER_ADVANCE: {
        const active = this.runners.filter(r => !r.out && !r.scored);
        active.forEach((runner, i) => {
          if (i > 2) return;
          const ry = CTRL_Y + 30 + i * 44;
          const bx = W - 118, by = ry - 2, bw = 100, bh = 36;
          if (p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh) {
            this._handleRunnerAdvance(this.runners.indexOf(runner));
          }
        });
        break;
      }

      case S.PLAY_RESULT:
      case S.INNING_END:
        break;
    }
  }

  pointerMove(_p) {}
  pointerUp(_p)   {}

  // Button hit-tests
  _hitSwingButton(p) {
    const bx = W/2 - 80, by = CTRL_Y + 30, bw = 160, bh = 80;
    return p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh;
  }

  _hitPitchButton(p) {
    const bx = W/2 - 80, by = CTRL_Y + 100, bw = 160, bh = 50;
    return p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh;
  }

  _handlePitchTypeSelect(p) {
    const bw = 110, bh = 62, gap = 8;
    const totalW = PITCHES.length * bw + (PITCHES.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const by = CTRL_Y + 22;
    PITCHES.forEach((_, i) => {
      const bx = startX + i * (bw + gap);
      if (p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh) {
        this.selectedPitchIdx = i;
      }
    });
  }

  _handleSwingModeSelect(p) {
    const gap = 8, bh = 52;
    const bw = (W - 20 - gap) / 2;
    const y = CTRL_Y + 18;
    ['normal', 'power'].forEach((mode, i) => {
      const bx = 10 + i * (bw + gap);
      if (p.x >= bx && p.x <= bx + bw && p.y >= y && p.y <= y + bh) {
        this.swingMode = mode;
      }
    });
  }
}
