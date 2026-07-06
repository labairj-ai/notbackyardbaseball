import './style.css';
import { Game } from './game.js';
import { W, H } from './constants.js';

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const game  = new Game();
let dragging = false;

// ── Canvas sizing ─────────────────────────────────────────────────────────────
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w   = window.innerWidth;
  const h   = window.innerHeight;
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── Input helpers ─────────────────────────────────────────────────────────────
function toGame(e) {
  const r  = canvas.getBoundingClientRect();
  const src = e.touches ? (e.touches[0] ?? e.changedTouches[0]) : e;
  const scale = Math.min(r.width / W, r.height / H);
  const offsetX = (r.width - W * scale) / 2;
  const offsetY = (r.height - H * scale) / 2;
  return {
    x: (src.clientX - r.left - offsetX) / scale,
    y: (src.clientY - r.top - offsetY) / scale,
  };
}

canvas.addEventListener('touchstart', e => { e.preventDefault(); game.pointerDown(toGame(e)); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); game.pointerMove(toGame(e)); }, { passive: false });
canvas.addEventListener('touchend',   e => { e.preventDefault(); game.pointerUp(toGame(e));   }, { passive: false });
canvas.addEventListener('mousedown',  e => { dragging = true;  game.pointerDown(toGame(e)); });
canvas.addEventListener('mousemove',  e => { if (dragging) game.pointerMove(toGame(e)); });
canvas.addEventListener('mouseup',    e => { dragging = false; game.pointerUp(toGame(e));   });

// ── Game loop ─────────────────────────────────────────────────────────────────
let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 1 / 20);
  last = ts;

  const dpr = window.devicePixelRatio || 1;
  const cw  = canvas.width;
  const ch  = canvas.height;

  ctx.save();

  // Letterbox: uniform scale, centered, with background bars
  const scale   = Math.min(cw / W, ch / H);
  const offsetX = Math.floor((cw - W * scale) / 2);
  const offsetY = Math.floor((ch - H * scale) / 2);

  // Fill letterbox bars
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, cw, ch);

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  game.update(dt);
  game.draw(ctx);

  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
