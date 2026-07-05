import {
  W, H, HOME, FIRST, SECOND, THIRD, MOUND, FX, FY, FENCE_R,
  FIELDER_HOMES, S, PITCHES, INNINGS, OUTS_PER_INNING,
  STRIKES_PER_OUT, BALLS_PER_WALK, CTRL_Y, HUD_H,
} from './constants.js';
import { drawField, highlightBase } from './field.js';
import { drawKid, PLAYER_TEAM, CPU_TEAM } from './characters.js';
import {
  drawScoreboard, drawControlsBg, drawSwingButton, drawPitchButtons,
  drawPitchButton, drawThrowButtons, drawMessage, drawCenterMessage,
  drawBatterInfo, drawStrikeZone, drawTapToContinue,
} from './ui.js';
import {
  playPitch, playSwing, playHit, playStrike, playBall,
  playOut, playRun, playHomeRun, playFoul, playWalk,
} from './sounds.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

const BASE_POS = [HOME, FIRST, SECOND, THIRD];

// ── Entity classes ────────────────────────────────────────────────────────────
class Ball {
  constructor() { this.reset(); }
  reset() {
    this.x = MOUND.x; this.y = MOUND.y;
    this.vx = 0; this.vy = 0;
    this.trail = [];
    this.active = false;
  }
  update(dt) {
    if (!this.active) return;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i / this.trail.length) * 0.35;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
    if (!this.active) return;
    // Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 3, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    // Ball
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Seam lines
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y, 4, -0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y, 4, Math.PI - 0.5, Math.PI + 0.5);
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
  }
  draw(ctx, team) {
    const bob = Math.sin(this.anim) * 2;
    drawKid(ctx, this.x, this.y - bob, this.color, team.secondary, this.skin, 13);
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
  }
  runTo(base) {
    this.targetBase = clamp(base, 0, 3);
    this.running = true;
  }
  update(dt) {
    if (!this.running || this.out || this.scored) return;
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
  draw(ctx, team) {
    if (this.scored || this.out) return;
    drawKid(ctx, this.x, this.y, team.primary, team.secondary, this.player.skin, 15);
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
  }

  _startHalfInning() {
    this.outs = 0; this.strikes = 0; this.balls = 0;
    this.runners = [];
    this._spawnFielders();
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
    // Travel from mound to home plate
    const totalDist = dist(MOUND, HOME);
    const travelTime = totalDist / pitch.speed;

    // Calculate ideal velocity
    this.ball.x  = MOUND.x; this.ball.y = MOUND.y;
    this.ball.vy = pitch.speed;
    this.ball.vx = 0;
    this.ball.active = true;
    this.ball.trail = [];

    // Curve adds horizontal drift over time — handled in update via _curveAccel
    this._curveAccel = pitch.curve * (Math.random() < 0.5 ? 1 : -1) * 1.5;
    this._pitchSpeed = pitch.speed;
    this.swingZoneActive = false;
    this.pitcherAnim = 1; // trigger wind-up
    playPitch();
    this._setState(S.PITCHING);
  }

  // Called when the player taps SWING
  _playerSwing() {
    if (this.state !== S.PITCHING || this.topInning) return; // not player's turn to bat
    playSwing();
    this.swingAnim = 1;

    // Evaluate hit quality based on ball proximity to plate
    const bally = this.ball.y;
    const platey = HOME.y;
    const diff = Math.abs(bally - platey);
    const ballx = this.ball.x;
    const platex = HOME.x;
    const xDiff = Math.abs(ballx - platex);

    let quality, hitPower;
    if (diff < 14 && xDiff < 18) {
      quality = 'PERFECT'; hitPower = rand(0.75, 1.0);
    } else if (diff < 28 && xDiff < 28) {
      quality = 'GOOD';    hitPower = rand(0.45, 0.75);
    } else if (diff < 45) {
      quality = 'WEAK';    hitPower = rand(0.2, 0.45);
    } else {
      // Swing and miss
      playStrike();
      this.strikes++;
      this._showMsg('SWING!', '#FFD700');
      this._checkCount();
      this.ball.active = false;
      this.ball.trail = [];
      if (this.state !== S.INNING_END) this._setState(S.PRE_PITCH);
      return;
    }

    // Check foul (ball far off plate x-axis on good/perfect)
    const isFoul = xDiff > 24 && quality !== 'WEAK';

    if (isFoul && this.strikes < 2) {
      playFoul();
      this.strikes++;
      this._showMsg('FOUL!', '#f4a261');
      this._checkCount();
      this.ball.active = false;
      this.ball.trail = [];
      if (this.state !== S.INNING_END) this._setState(S.PRE_PITCH);
      return;
    }

    // It's a hit!
    playHit(quality);

    // Determine hit direction angle (from home toward outfield)
    // Timing: early swing → pull right, late → oppo left
    const earlyLate = (bally - platey) / 20; // negative=early, positive=late
    const baseAngle = Math.PI * 1.5; // straight up from home (north)
    const pullOffset = -earlyLate * 0.5; // pull right = negative x in screen right
    const angle = baseAngle + pullOffset + rand(-0.35, 0.35);

    // Speed of hit
    const maxSpeed = 420 + this._batter.power * 20;
    const speed = hitPower * maxSpeed;
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;

    // Pre-determine outcome
    this._pendingOutcome = this._calcHitOutcome(quality, hitPower, speed);
    this._setState(S.HIT_ANIM);
    this._startFielderChase();
  }

  _calcHitOutcome(quality, power, speed) {
    const batter = this._batter;
    const luck = batter.luck / 10;
    const roll = Math.random() * 0.4 + power * 0.6 + luck * 0.15;

    if (roll > 0.97) return { type: 'homer',  bases: 4, label: 'HOME RUN!!',   color: '#FFD700' };
    if (roll > 0.82) return { type: 'triple', bases: 3, label: 'TRIPLE!!',     color: '#f4a261' };
    if (roll > 0.60) return { type: 'double', bases: 2, label: 'DOUBLE!',      color: '#4cc9f0' };
    if (roll > 0.30) return { type: 'single', bases: 1, label: 'SINGLE!',      color: '#7fff7f' };
    return              { type: 'out',    bases: 0, label: quality === 'WEAK' ? 'GROUNDOUT' : 'FLYOUT!', color: '#ff8f8f' };
  }

  _startFielderChase() {
    // Find nearest fielder to where ball is heading
    const bx = this.ball.x + this.ball.vx * 0.8;
    const by = this.ball.y + this.ball.vy * 0.8;
    let best = -1, bestD = Infinity;
    this.fielders.forEach((f, i) => {
      const d = Math.hypot(f.x - bx, f.y - by);
      if (d < bestD) { bestD = d; best = i; }
    });
    this.activeFielderIdx = best;
    if (best >= 0) {
      // Send fielder toward landing zone
      const landX = clamp(bx, FX - FENCE_R, FX + FENCE_R);
      const landY = clamp(by, HUD_H + 10, CTRL_Y - 10);
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
        this.ball.vx = Math.cos(angle) * speed;
        this.ball.vy = Math.sin(angle) * speed;
        const quality = power > 0.6 ? 'PERFECT' : power > 0.4 ? 'GOOD' : 'WEAK';
        playHit(quality);
        this._pendingOutcome = this._calcHitOutcome(quality, power, speed);
        this._setState(S.HIT_ANIM);
        this._startFielderChase();
      } else {
        // CPU misses
        playStrike();
        this.strikes++;
        this._showMsg('SWING!', '#FFD700');
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
        // Only auto-pitch when CPU is pitching (player bats)
        if (!this.topInning && this.stateTimer > 1.2) {
          this._beginPitch();
        }
        // When topInning=true, player pitches — wait for PITCH button tap
        break;

      case S.PITCHING: {
        // Apply curve acceleration
        this.ball.vx += this._curveAccel * dt * 1.8;

        // Activate swing zone when ball is approaching plate
        if (this.ball.y > HOME.y - 55) this.swingZoneActive = true;

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
        // Ball flies until it leaves field or 1.6 seconds
        const outOfBounds = this.ball.x < 10 || this.ball.x > W - 10 ||
          this.ball.y < HUD_H || this.ball.y > CTRL_Y;
        if (outOfBounds || this.stateTimer > 1.8) {
          this.ball.active = false;
          // Fielder "catches" ball
          if (this.activeFielderIdx >= 0) {
            this.fielders[this.activeFielderIdx].hasBall = true;
          }
          this._resolveHit();
          if (this.state !== S.INNING_END) this._setState(S.PLAY_RESULT);
        }
        break;
      }

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
          // Switch sides
          this.topInning = !this.topInning;
          if (!this.topInning && this.inning > INNINGS) {
            // Bottom of extra inning after last — game over
            this._setState(S.GAME_OVER);
          } else if (this.topInning) {
            // Moving to next inning's top
            this.inning++;
            if (this.inning > INNINGS) {
              // Was bottom of last inning
              this._setState(S.GAME_OVER);
            } else {
              this._startHalfInning();
            }
          } else {
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

    // Draw pitcher
    const pitchTeam = this.topInning ? this.playerTeam : this.cpuTeam;
    const pitchSkin = pitchTeam.players[0].skin;
    const pitcherBob = Math.sin(this.pitcherAnim * Math.PI) * -5;
    drawKid(ctx, MOUND.x, MOUND.y - 8 + pitcherBob, pitchTeam.primary, pitchTeam.secondary, pitchSkin, 15);

    // Draw batter
    const batTeam  = this.topInning ? this.cpuTeam : this.playerTeam;
    const batSkin  = this._batter.skin;
    const swingOff = this.swingAnim * 12;
    drawKid(ctx, HOME.x - 20 + swingOff, HOME.y - 5, batTeam.primary, batTeam.secondary, batSkin, 17);

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
    if (!this.topInning && (this.state === S.PRE_PITCH || this.state === S.PITCHING)) {
      drawBatterInfo(ctx, this._batter, batTeam.primary);
    }

    // Messages
    if (this.msgAlpha > 0) {
      drawMessage(ctx, this.msg, this.msgColor, 38, this.msgAlpha);
    }

    // State-specific overlays
    if (this.state === S.INNING_END) this._drawInningEnd(ctx);
    if (this.state === S.GAME_OVER)  this._drawGameOver(ctx);
    if (this.state === S.PLAY_RESULT && this.stateTimer > 1.5) {
      drawTapToContinue(ctx);
    }
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
          // CPU pitching, player waits
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#888';
          ctx.font = '15px monospace';
          ctx.fillText('GET READY...', W/2, CTRL_Y + 72);
          drawSwingButton(ctx, false);
        }
        break;

      case S.HIT_ANIM:
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('⚾', W/2, CTRL_Y + 72);
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
    ctx.fillText('notbackyardbaseball • tap anywhere to start', W/2, H - 20);
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

      case S.PLAY_RESULT:
      case S.INNING_END:
        // tap to advance (handled in update timer, but allow early skip)
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
}
