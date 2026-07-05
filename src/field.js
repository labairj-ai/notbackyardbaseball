import { FX, FY, HOME, FIRST, SECOND, THIRD, MOUND, FENCE_R, HUD_H, CTRL_Y, W } from './constants.js';

export function drawField(ctx) {
  // Sky background behind field
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, HUD_H, W, CTRL_Y - HUD_H);

  // Bleachers / stands ring
  ctx.beginPath();
  ctx.arc(FX, FY, FENCE_R + 22, 0, Math.PI * 2);
  ctx.fillStyle = '#2b1d11';
  ctx.fill();

  // Outfield grass with stripes
  const stripeCount = 10;
  const stripeW = (FENCE_R * 2) / stripeCount;
  ctx.save();
  ctx.beginPath();
  ctx.arc(FX, FY, FENCE_R, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2a6b2a' : '#316e31';
    ctx.fillRect(FX - FENCE_R + i * stripeW, FY - FENCE_R, stripeW, FENCE_R * 2);
  }
  ctx.restore();

  // Warning track
  ctx.beginPath();
  ctx.arc(FX, FY, FENCE_R, 0, Math.PI * 2);
  ctx.arc(FX, FY, FENCE_R - 16, 0, Math.PI * 2, true);
  ctx.fillStyle = '#8b6519';
  ctx.fill();

  // Outfield fence line
  ctx.beginPath();
  ctx.arc(FX, FY, FENCE_R, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4a437';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Foul lines (extend from home through outfield)
  const foulLen = FENCE_R + 15;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  // 3rd base line (goes upper-left from home)
  ctx.beginPath();
  ctx.moveTo(HOME.x, HOME.y);
  ctx.lineTo(HOME.x - foulLen * 0.717, HOME.y - foulLen * 0.717);
  ctx.stroke();
  // 1st base line (goes upper-right from home)
  ctx.beginPath();
  ctx.moveTo(HOME.x, HOME.y);
  ctx.lineTo(HOME.x + foulLen * 0.717, HOME.y - foulLen * 0.717);
  ctx.stroke();
  ctx.setLineDash([]);

  // Infield dirt (full diamond fill)
  ctx.beginPath();
  ctx.moveTo(HOME.x, HOME.y);
  ctx.lineTo(FIRST.x, FIRST.y);
  ctx.lineTo(SECOND.x, SECOND.y);
  ctx.lineTo(THIRD.x, THIRD.y);
  ctx.closePath();
  ctx.fillStyle = '#b5651d';
  ctx.fill();

  // Infield grass cutout (inner square rotated)
  const gx = FX, gy = FY;
  const gr = 68;
  ctx.beginPath();
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(Math.PI / 4);
  ctx.rect(-gr, -gr, gr * 2, gr * 2);
  ctx.restore();
  ctx.fillStyle = '#2a6b2a';
  ctx.fill();

  // Pitcher's mound
  ctx.beginPath();
  ctx.ellipse(MOUND.x, MOUND.y, 18, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c2804a';
  ctx.fill();
  ctx.strokeStyle = '#a0602a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pitcher's rubber
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(MOUND.x - 9, MOUND.y - 2.5, 18, 5, 2);
  ctx.fill();

  // Base paths (chalk lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(HOME.x, HOME.y);
  ctx.lineTo(FIRST.x, FIRST.y);
  ctx.lineTo(SECOND.x, SECOND.y);
  ctx.lineTo(THIRD.x, THIRD.y);
  ctx.closePath();
  ctx.stroke();

  // Bases
  drawBase(ctx, FIRST.x,  FIRST.y,  false);
  drawBase(ctx, SECOND.x, SECOND.y, false);
  drawBase(ctx, THIRD.x,  THIRD.y,  false);
  drawHomePlate(ctx, HOME.x, HOME.y);

  // Batter's boxes
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(HOME.x - 30, HOME.y - 16, 22, 32);
  ctx.strokeRect(HOME.x +  8, HOME.y - 16, 22, 32);
}

function drawBase(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawHomePlate(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.lineTo( 9, -8);
  ctx.lineTo( 9,  0);
  ctx.lineTo( 0,  8);
  ctx.lineTo(-9,  0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Highlight a base (occupied or target)
export function highlightBase(ctx, baseIdx, color = '#FFD700') {
  const positions = [HOME, FIRST, SECOND, THIRD];
  const pos = positions[baseIdx];
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}
