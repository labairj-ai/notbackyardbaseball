import { SKINS } from './constants.js';

const CREATURE_POOL = [
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

    // Additional reference-inspired players from the supplied images.
    { name: 'GIGGLES', power: 8, speed: 6, eye: 8, skin: SKINS[0],
      avatar: { type: 'teeGoblin', color: '#d5a038', cap: '#b9821d' } },
    { name: 'FETCH', power: 4, speed:10, eye: 7, skin: SKINS[1],
      avatar: { type: 'pup', color: '#d9b15c', cap: '#c99331' } },
    { name: 'INKY', power: 7, speed: 6, eye: 9, skin: SKINS[2],
      avatar: { type: 'octo', color: '#438f8d', cap: '#397f80' } },
    { name: 'EMBER', power:10, speed: 3, eye: 5, skin: SKINS[3],
      avatar: { type: 'flame', color: '#f26a08', cap: '#a8241c' } },
    { name: 'NIBS', power: 5, speed: 8, eye: 8, skin: SKINS[4],
      avatar: { type: 'redCritter', color: '#b53135', cap: '#8d2328' } },
    { name: 'PUDGE', power: 8, speed: 4, eye: 9, skin: SKINS[0],
      avatar: { type: 'orangeOrb', color: '#c46b2c', cap: '#8f421d' } },
    { name: 'SMOKEY', power: 6, speed: 6, eye:10, skin: SKINS[1],
      avatar: { type: 'chimney', color: '#242620', cap: '#a8241c' } },
    { name: 'BLIP', power: 4, speed: 9, eye: 9, skin: SKINS[2],
      avatar: { type: 'bean', color: '#3e9384', cap: '#277f91' } },
];

function clonePlayer(player) {
  return {
    ...player,
    avatar: player.avatar ? { ...player.avatar } : null,
  };
}

function shuffledPlayers() {
  const copy = CREATURE_POOL.map(clonePlayer);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createRandomTeams() {
  const players = shuffledPlayers();
  return {
    playerTeam: {
      name: 'BACKYARD BOMBERS',
      primary:   '#e63946',
      secondary: '#fff',
      players: players.slice(0, 5),
    },
    cpuTeam: {
      name: 'RIVAL RASCALS',
      primary:   '#1d3557',
      secondary: '#a8dadc',
      players: players.slice(5, 10),
    },
  };
}

export const PLAYER_TEAM = {
  name: 'BACKYARD BOMBERS',
  primary:   '#e63946',
  secondary: '#fff',
  players: CREATURE_POOL.slice(0, 5).map(clonePlayer),
};

export const CPU_TEAM = {
  name: 'RIVAL RASCALS',
  primary:   '#1d3557',
  secondary: '#a8dadc',
  players: CREATURE_POOL.slice(5, 10).map(clonePlayer),
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
  } else if (type === 'teeGoblin') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.55, size*.48, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x-size*.08, cy-size*.45);
    ctx.quadraticCurveTo(x+size*.08, cy-size*1.03, x+size*.22, cy-size*.45);
    ctx.fill();
    ctx.fillStyle = '#3b2516';
    ctx.beginPath(); ctx.arc(x-size*.15, cy-size*.02, size*.055, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+size*.15, cy-size*.02, size*.055, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = size*.045;
    ctx.strokeStyle = '#3b2516';
    ctx.beginPath(); ctx.arc(x, cy+size*.08, size*.28, 0.12, Math.PI-0.12); ctx.stroke();
    return;
  } else if (type === 'pup') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.46, size*.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x-size*.28, cy-size*.08, size*.17, size*.26, .6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+size*.28, cy-size*.08, size*.17, size*.26, -.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a2d18';
    ctx.beginPath(); ctx.ellipse(x, cy+size*.07, size*.11, size*.07, 0, 0, Math.PI*2); ctx.fill();
  } else if (type === 'octo') {
    ctx.beginPath(); ctx.ellipse(x, cy-size*.04, size*.48, size*.55, 0, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = size*.12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    [-.34, -.16, .08, .28].forEach((offset, i) => {
      ctx.beginPath();
      ctx.moveTo(x + size*offset, cy + size*.32);
      ctx.quadraticCurveTo(
        x + size*(offset + (i % 2 ? .2 : -.15)),
        cy + size*.66,
        x + size*(offset + (i % 2 ? .34 : -.28)),
        cy + size*.9
      );
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
  } else if (type === 'redCritter') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.42, size*.62, -.1, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = size*.055;
    ctx.strokeStyle = color;
    [-.25, .08].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(x + size*offset, cy - size*.48);
      ctx.quadraticCurveTo(x + size*(offset + .03), cy - size*.9, x + size*(offset + .18), cy - size*1.08);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(x+size*.34, cy+size*.28);
    ctx.quadraticCurveTo(x+size*.73, cy+size*.42, x+size*.64, cy+size*.82);
    ctx.stroke();
  } else if (type === 'orangeOrb') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.56, size*.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = size*.055;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x-size*.55, cy-size*.08); ctx.lineTo(x-size*.85, cy-size*.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+size*.55, cy-size*.08); ctx.lineTo(x+size*.85, cy-size*.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, cy+size*.48); ctx.lineTo(x-size*.1, cy+size*.9); ctx.stroke();
  } else if (type === 'chimney') {
    ctx.beginPath(); ctx.roundRect(x-size*.38, cy-size*.6, size*.76, size*1.05, size*.08); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = size*.06;
    ctx.beginPath(); ctx.arc(x-size*.06, cy-size*.86, size*.25, 4.8, 6.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+size*.1, cy-size*1.02, size*.2, 4.3, 5.7); ctx.stroke();
  } else if (type === 'bean') {
    ctx.beginPath(); ctx.ellipse(x, cy, size*.43, size*.6, .1, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = size*.055;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x-size*.43, cy); ctx.lineTo(x-size*.7, cy+size*.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+size*.43, cy); ctx.lineTo(x+size*.7, cy+size*.04); ctx.stroke();
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
