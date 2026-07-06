import { SKINS } from './constants.js';

export const PLAYER_TEAM = {
  name: 'BACKYARD BOMBERS',
  primary:   '#e63946',
  secondary: '#fff',
  players: [
    { name: 'KYLE',   power: 9, speed: 5, eye: 7, skin: SKINS[0] },
    { name: 'JESS',   power: 5, speed: 9, eye: 9, skin: SKINS[1] },
    { name: 'MARCUS', power: 7, speed: 7, eye: 7, skin: SKINS[2] },
    { name: 'TARA',   power: 6, speed: 8, eye: 8, skin: SKINS[3] },
    { name: 'DEVON',  power:10, speed: 4, eye: 5, skin: SKINS[4] },
  ],
};

export const CPU_TEAM = {
  name: 'RIVAL RASCALS',
  primary:   '#1d3557',
  secondary: '#a8dadc',
  players: [
    { name: 'RICK',  power: 8, speed: 6, eye: 8, skin: SKINS[1] },
    { name: 'PAM',   power: 5, speed: 9, eye: 9, skin: SKINS[3] },
    { name: 'ZACH',  power: 9, speed: 5, eye: 6, skin: SKINS[0] },
    { name: 'LENA',  power: 6, speed: 8, eye: 8, skin: SKINS[2] },
    { name: 'OMAR',  power: 7, speed: 7, eye: 7, skin: SKINS[4] },
  ],
};

// Draw a cartoon "big head" kid character
export function drawKid(ctx, x, y, primary, secondary, skin, size = 20) {
  // Legs
  ctx.fillStyle = '#d0d0d0';
  ctx.beginPath(); ctx.roundRect(x - size*0.28, y,          size*0.22, size*0.52, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + size*0.06, y,          size*0.22, size*0.52, 3); ctx.fill();

  // Shoes
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.ellipse(x - size*0.17, y + size*0.52, size*0.16, size*0.08, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + size*0.17, y + size*0.52, size*0.16, size*0.08, 0, 0, Math.PI*2); ctx.fill();

  // Body / jersey
  ctx.fillStyle = primary;
  ctx.beginPath(); ctx.roundRect(x - size*0.38, y - size*0.68, size*0.76, size*0.72, size*0.1); ctx.fill();

  // Jersey number accent
  ctx.fillStyle = secondary;
  ctx.font = `bold ${size*0.3}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('9', x, y - size*0.35);

  // Arms
  ctx.fillStyle = primary;
  ctx.beginPath(); ctx.roundRect(x - size*0.56, y - size*0.6, size*0.2, size*0.4, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + size*0.36, y - size*0.6, size*0.2, size*0.4, 3); ctx.fill();

  // Head (big)
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, y - size*1.05, size*0.45, 0, Math.PI*2); ctx.fill();

  // Hat brim
  ctx.fillStyle = primary;
  ctx.beginPath(); ctx.ellipse(x, y - size*1.36, size*0.54, size*0.13, 0, 0, Math.PI*2); ctx.fill();

  // Hat crown
  ctx.beginPath(); ctx.roundRect(x - size*0.3, y - size*1.75, size*0.6, size*0.42, size*0.08); ctx.fill();

  // Hat logo dot
  ctx.fillStyle = secondary;
  ctx.beginPath(); ctx.arc(x, y - size*1.55, size*0.1, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - size*0.14, y - size*1.07, size*0.07, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + size*0.14, y - size*1.07, size*0.07, 0, Math.PI*2); ctx.fill();

  // Smile
  ctx.strokeStyle = '#444';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath(); ctx.arc(x, y - size*0.92, size*0.15, 0.1, Math.PI - 0.1); ctx.stroke();
}
