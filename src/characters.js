import { SKINS } from './constants.js';

export const PLAYER_TEAM = {
  name: 'BACKYARD BOMBERS',
  primary:   '#e63946',
  secondary: '#fff',
  players: [
    { name: 'KYLE', power: 9, speed: 5, eye: 7, skin: SKINS[0],
      avatar: { type: 'dog', color: '#438f8d', cap: '#397f80' } },
    { name: 'JESS', power: 5, speed: 9, eye: 9, skin: SKINS[1],
      avatar: { type: 'fuzzy', color: '#168ba5', cap: '#277f91' } },
    { name: 'MARCUS', power: 7, speed: 7, eye: 7, skin: SKINS[2],
      avatar: { type: 'ghost', color: '#252a25', cap: '#a8241c' } },
    { name: 'TARA', power: 6, speed: 8, eye: 8, skin: SKINS[3],
      avatar: { type: 'alien', color: '#6d7162', cap: '#eee2bd' } },
    { name: 'DEVON', power:10, speed: 4, eye: 5, skin: SKINS[4],
      avatar: { type: 'flame', color: '#ed6b0b', cap: '#a8241c' } },
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

// Draw a cartoon player. Human-team avatars use reference-inspired creatures;
// CPU players retain the original kid design.
export function drawKid(ctx, x, y, primary, secondary, skin, size = 20, avatar = null) {
  const creature = avatar?.color ?? skin;
  const jersey = avatar ? '#eadfbd' : primary;
  const cap = avatar?.cap ?? primary;
  const logo = avatar ? '#a8241c' : secondary;

  // Legs
  ctx.fillStyle = avatar ? creature : '#d0d0d0';
  ctx.beginPath(); ctx.roundRect(x - size*0.28, y,          size*0.22, size*0.52, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + size*0.06, y,          size*0.22, size*0.52, 3); ctx.fill();

  // Shoes
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.ellipse(x - size*0.17, y + size*0.52, size*0.16, size*0.08, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + size*0.17, y + size*0.52, size*0.16, size*0.08, 0, 0, Math.PI*2); ctx.fill();

  // Body / jersey
  ctx.fillStyle = jersey;
  ctx.beginPath(); ctx.roundRect(x - size*0.38, y - size*0.68, size*0.76, size*0.72, size*0.1); ctx.fill();

  if (avatar) {
    ctx.strokeStyle = 'rgba(85,65,45,0.28)';
    ctx.lineWidth = Math.max(0.5, size * 0.025);
    [-0.22, 0, 0.22].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(x + size*offset, y - size*0.64);
      ctx.lineTo(x + size*offset, y - size*0.04);
      ctx.stroke();
    });
  }

  // Jersey logo
  ctx.fillStyle = logo;
  ctx.font = `bold ${size*0.34}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(avatar ? 'T' : '9', x, y - size*0.35);

  // Arms
  ctx.fillStyle = avatar ? creature : primary;
  ctx.beginPath(); ctx.roundRect(x - size*0.56, y - size*0.6, size*0.2, size*0.4, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + size*0.36, y - size*0.6, size*0.2, size*0.4, 3); ctx.fill();

  drawHead(ctx, x, y, size, avatar?.type, creature);

  // Hat brim
  ctx.fillStyle = cap;
  ctx.beginPath(); ctx.ellipse(x, y - size*1.36, size*0.54, size*0.13, 0, 0, Math.PI*2); ctx.fill();

  // Hat crown
  ctx.beginPath(); ctx.roundRect(x - size*0.3, y - size*1.75, size*0.6, size*0.42, size*0.08); ctx.fill();

  // Hat logo
  ctx.fillStyle = logo;
  ctx.font = `bold ${size*0.25}px serif`;
  ctx.fillText(avatar ? 'T' : '•', x, y - size*1.54);
}

function drawHead(ctx, x, y, size, type, color) {
  const cy = y - size*1.05;
  ctx.fillStyle = color;

  if (type === 'dog') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.58, size*.47, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + size*.48, cy - size*.22, size*.25, size*.48, -.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#173b3c';
    ctx.beginPath(); ctx.ellipse(x + size*.32, cy + size*.05, size*.12, size*.08, 0, 0, Math.PI*2); ctx.fill();
  } else if (type === 'ghost') {
    ctx.beginPath(); ctx.roundRect(x-size*.43, cy-size*.55, size*.86, size*1.04, size*.18); ctx.fill();
    ctx.fillStyle = '#090b09';
    ctx.beginPath(); ctx.ellipse(x-size*.17, cy-size*.12, size*.1, size*.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+size*.17, cy-size*.12, size*.1, size*.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, cy+size*.2, size*.12, size*.16, 0, 0, Math.PI*2); ctx.fill();
    return;
  } else if (type === 'alien') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.43, size*.58, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#d8d5ad';
    ctx.beginPath(); ctx.arc(x-size*.17, cy-size*.08, size*.13, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+size*.17, cy-size*.08, size*.13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#20231d';
    ctx.beginPath(); ctx.arc(x-size*.17, cy-size*.08, size*.055, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+size*.17, cy-size*.08, size*.055, 0, Math.PI*2); ctx.fill();
  } else if (type === 'fuzzy' || type === 'flame') {
    const points = 18;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = size * (i % 2 ? .48 : .58);
      const px = x + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    if (type === 'flame') {
      ctx.beginPath();
      ctx.moveTo(x-size*.28, cy-size*.4);
      ctx.lineTo(x-size*.05, cy-size*.85);
      ctx.lineTo(x+size*.1, cy-size*.42);
      ctx.lineTo(x+size*.32, cy-size*.72);
      ctx.lineTo(x+size*.38, cy-size*.3);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.arc(x, cy, size*.45, 0, Math.PI*2); ctx.fill();
  }

  ctx.fillStyle = type === 'fuzzy' || type === 'flame' ? '#e9bd35' : '#222';
  ctx.beginPath(); ctx.arc(x-size*.14, cy-size*.03, size*.07, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+size*.14, cy-size*.03, size*.07, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#34302b';
  ctx.lineWidth = size*.05;
  ctx.beginPath(); ctx.arc(x, cy+size*.12, size*.15, .15, Math.PI-.15); ctx.stroke();
}
