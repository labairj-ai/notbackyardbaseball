import { W, H, HUD_H, CTRL_Y, INNINGS, PITCHES, THROW_POSITIONS } from './constants.js';

// ── Scoreboard ────────────────────────────────────────────────────────────────
export function drawScoreboard(ctx, gs) {
  // Background
  ctx.fillStyle = '#0d1f3c';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#1a3a6b';
  ctx.fillRect(0, HUD_H - 2, W, 2);

  // Team names
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = gs.playerTeam.primary;
  ctx.fillText(gs.playerTeam.name, 10, 18);
  ctx.fillStyle = gs.cpuTeam.primary;
  ctx.fillText(gs.cpuTeam.name, 10, 38);
  ctx.fillStyle = '#aaa';
  ctx.fillText('INNING', 10, 56);

  // Inning boxes
  const boxW = 22, boxH = 17, startX = 135;
  for (let i = 0; i < INNINGS; i++) {
    const bx = startX + i * (boxW + 3);
    const active = i + 1 === gs.inning;
    ctx.fillStyle = active ? '#1a3a6b' : '#0d1f3c';
    ctx.fillRect(bx, 8, boxW, boxH);
    ctx.strokeStyle = active ? '#4cc9f0' : '#2a4a7b';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, 8, boxW, boxH);

    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(i + 1, bx + boxW / 2, 8 + boxH / 2 + 1);

    // Player score this inning
    const ps = gs.inningScores.player[i];
    ctx.fillStyle = ps > 0 ? '#7fff7f' : '#ccc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(ps ?? '-', bx + boxW / 2, 28);

    // CPU score this inning
    const cs = gs.inningScores.cpu[i];
    ctx.fillStyle = cs > 0 ? '#ff8f8f' : '#ccc';
    ctx.fillText(cs ?? '-', bx + boxW / 2, 47);

    // Inning number label
    ctx.fillStyle = active ? '#4cc9f0' : '#666';
    ctx.font = '9px monospace';
    ctx.fillText(i + 1, bx + boxW / 2, 58);
  }

  // Total scores
  const rx = startX + INNINGS * (boxW + 3) + 8;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(gs.score.player, rx + 12, 28);
  ctx.fillText(gs.score.cpu, rx + 12, 47);
  ctx.fillStyle = '#888';
  ctx.font = '9px monospace';
  ctx.fillText('R', rx + 12, 14);
  ctx.fillText('R', rx + 12, 57);

  // Inning indicator + top/bottom
  const ix = rx + 40;
  ctx.fillStyle = '#aaa';
  ctx.font = '10px monospace';
  ctx.fillText(gs.topInning ? '▲' : '▼', ix, 15);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(gs.inning, ix, 32);
  ctx.fillStyle = '#aaa';
  ctx.font = '9px monospace';
  ctx.fillText('INN', ix, 48);

  // Count (balls / strikes / outs)
  const cx2 = ix + 36;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aaa';
  ctx.font = '9px monospace';
  ctx.fillText('B', cx2, 12);
  ctx.fillText('S', cx2, 28);
  ctx.fillText('O', cx2, 44);

  drawDots(ctx, cx2 + 10, 10,  gs.balls,   4, '#4cc9f0', 7);
  drawDots(ctx, cx2 + 10, 26,  gs.strikes, 3, '#FFD700', 7);
  drawDots(ctx, cx2 + 10, 42,  gs.outs,    3, '#e63946', 7);
}

function drawDots(ctx, x, y, filled, total, color, r) {
  const gap = r * 2.4;
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(x + i * gap, y + r / 2, r / 2, 0, Math.PI * 2);
    ctx.fillStyle = i < filled ? color : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
}

// ── Control area background ───────────────────────────────────────────────────
export function drawControlsBg(ctx) {
  ctx.fillStyle = '#0d1f3c';
  ctx.fillRect(0, CTRL_Y, W, H - CTRL_Y);
  ctx.fillStyle = '#1a3a6b';
  ctx.fillRect(0, CTRL_Y, W, 2);
}

// ── Buttons ───────────────────────────────────────────────────────────────────
export function drawSwingButton(ctx, active) {
  const bx = W / 2 - 80, by = CTRL_Y + 30, bw = 160, bh = 80;
  const glow = active ? 1 : 0;

  if (active) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
  }

  // Button bg
  const grad = ctx.createRadialGradient(W/2, by + bh/2, 10, W/2, by + bh/2, bw);
  grad.addColorStop(0, active ? '#e63946' : '#b52a36');
  grad.addColorStop(1, active ? '#9e1a24' : '#7a1018');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16);
  ctx.fill();

  ctx.strokeStyle = active ? '#FFD700' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = active ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${active ? 30 : 26}px monospace`;
  ctx.fillText('SWING!', W/2, by + bh/2);
}

export function drawPitchButtons(ctx, selectedIdx) {
  const bw = 110, bh = 62, gap = 8;
  const totalW = PITCHES.length * bw + (PITCHES.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const by = CTRL_Y + 22;

  PITCHES.forEach((p, i) => {
    const bx = startX + i * (bw + gap);
    const sel = i === selectedIdx;

    ctx.fillStyle = sel ? p.color : '#1a3a6b';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.fill();

    ctx.strokeStyle = sel ? '#fff' : p.color;
    ctx.lineWidth = sel ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.stroke();

    ctx.fillStyle = sel ? '#fff' : p.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 13px monospace`;
    ctx.fillText(p.label, bx + bw/2, by + bh/2 - 4);
    ctx.font = '10px monospace';
    ctx.fillStyle = sel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)';
    ctx.fillText(['⚡ FAST', '↩ CURVES', '🐢 SLOW'][i], bx + bw/2, by + bh/2 + 13);
  });
}

export function drawPitchButton(ctx) {
  const bx = W/2 - 80, by = CTRL_Y + 100, bw = 160, bh = 50;
  ctx.fillStyle = '#1d6e2e';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.strokeStyle = '#5ec97a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('PITCH!', W/2, by + bh/2);
}

const THROW_LABELS = ['1B', '2B', '3B', 'HOME'];
const THROW_COLORS = ['#f4a261', '#4cc9f0', '#a8dadc', '#e63946'];
const THROW_R = 30;

// Throw buttons shown when fielder has ball (player fielding)
export function drawThrowButtons(ctx) {
  THROW_POSITIONS.forEach((pos, i) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, THROW_R, 0, Math.PI * 2);
    ctx.fillStyle = THROW_COLORS[i];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, THROW_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(THROW_LABELS[i], pos.x, pos.y);
  });
}

// Throw decision overlay (player fielding — choose where to throw after CPU hit)
export function drawThrowDecision(ctx, gs) {
  const timeLeft = Math.max(0, 2.8 - gs.stateTimer);
  const pct = timeLeft / 2.8;

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('THROW TO:', W / 2, CTRL_Y + 15);

  // Countdown bar
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(20, CTRL_Y + 4, W - 40, 5);
  ctx.fillStyle = pct > 0.4 ? '#4cc9f0' : '#e63946';
  ctx.fillRect(20, CTRL_Y + 4, (W - 40) * pct, 5);

  THROW_POSITIONS.forEach((pos, i) => {
    const hasRunner = gs.runners.some(r => !r.out && !r.scored && r.targetBase === i);

    if (hasRunner) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, THROW_R, 0, Math.PI * 2);
    ctx.fillStyle = hasRunner ? THROW_COLORS[i] : `${THROW_COLORS[i]}66`;
    ctx.fill();
    ctx.strokeStyle = hasRunner ? '#FFD700' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = hasRunner ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, THROW_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = hasRunner ? '#fff' : 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${hasRunner ? 14 : 12}px monospace`;
    ctx.fillText(THROW_LABELS[i], pos.x, pos.y - (hasRunner ? 4 : 0));
    if (hasRunner) {
      ctx.font = '10px monospace';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('RUN!', pos.x, pos.y + 12);
    }
  });
}

// Runner advance panel (player batting — choose to send runners after hit)
export function drawRunnerAdvance(ctx, gs) {
  const timeLeft = Math.max(0, 2.8 - gs.stateTimer);
  const pct = timeLeft / 2.8;

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#7fff7f';
  ctx.fillText('ADVANCE RUNNERS?', W / 2, CTRL_Y + 15);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(20, CTRL_Y + 4, W - 40, 5);
  ctx.fillStyle = pct > 0.4 ? '#7fff7f' : '#f4a261';
  ctx.fillRect(20, CTRL_Y + 4, (W - 40) * pct, 5);

  const BASE_NAMES = ['HOME', '1ST', '2ND', '3RD'];
  const active = gs.runners.filter(r => !r.out && !r.scored);

  if (active.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '13px monospace';
    ctx.fillText('NO RUNNERS', W / 2, CTRL_Y + 80);
    return;
  }

  active.forEach((runner, i) => {
    if (i > 2) return; // max 3 rows in panel
    const ry = CTRL_Y + 30 + i * 44;
    const nb = runner.targetBase + 1;
    const nextLabel = nb >= 4 ? 'SCORE!' : `→ ${BASE_NAMES[nb]}`;

    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(runner.player.name, 16, ry + 8);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`on ${BASE_NAMES[runner.targetBase]}`, 16, ry + 22);

    // Advance button
    const bx = W - 118, by = ry - 2, bw = 100, bh = 36;
    ctx.fillStyle = nb >= 4 ? '#1d6e2e' : '#1a3a6b';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = nb >= 4 ? '#5ec97a' : '#4cc9f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(nextLabel, bx + bw / 2, by + bh / 2);
  });
}

// ── Messages / Popups ─────────────────────────────────────────────────────────
export function drawMessage(ctx, text, color = '#fff', size = 36, alpha = 1) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size}px monospace`;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(text, W/2 + 2, H/2 + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, W/2, H/2);
  ctx.restore();
}

export function drawCenterMessage(ctx, lines, y = H/2) {
  lines.forEach((line, i) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${line.size ?? 22}px monospace`;
    ctx.fillStyle = line.color ?? '#fff';
    ctx.fillText(line.text, W/2, y + i * (line.gap ?? 36));
  });
}

// ── Batter info ───────────────────────────────────────────────────────────────
export function drawBatterInfo(ctx, player, teamColor) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = teamColor;
  ctx.fillText(`▶ ${player.name}`, 10, CTRL_Y + 15);
  // Power / speed pips
  ctx.font = '10px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(`PWR`, 10, CTRL_Y + 30);
  drawStatBar(ctx, 44, CTRL_Y + 26, player.power, '#e63946');
  ctx.fillText(`SPD`, 10, CTRL_Y + 44);
  drawStatBar(ctx, 44, CTRL_Y + 40, player.speed, '#4cc9f0');
}

function drawStatBar(ctx, x, y, val, color) {
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.rect(x + i * 8, y, 6, 7);
    ctx.fillStyle = i < val ? color : 'rgba(255,255,255,0.1)';
    ctx.fill();
  }
}

// ── Pitch zone indicator ──────────────────────────────────────────────────────
export function drawStrikeZone(ctx, alpha = 0.25) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(HOME.x - 20, HOME.y - 28, 40, 32);
  ctx.restore();
}

// lazy import for drawStrikeZone
import { HOME } from './constants.js';

// ── Tap to continue ───────────────────────────────────────────────────────────
export function drawTapToContinue(ctx, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(Date.now() / 350));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('TAP TO CONTINUE', W/2, CTRL_Y + 120);
  ctx.restore();
}
