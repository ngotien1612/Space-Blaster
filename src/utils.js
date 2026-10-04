import { CONFIG } from './config.js';
import { state } from './state.js';
import { ctx } from './canvas.js';

export function hexToRgb(hex) {
  if (hex.length === 4) hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function drawHPBar(x, y, w, hp, maxHp, border = false) {
  const ratio = hp / maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffaa00' : '#ff3344';
  ctx.fillRect(x - w / 2, y, w * ratio, 5);
  if (border) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, 5);
  }
}

export function spawnParticle(x, y, opts = {}) {
  if (state.particles.length >= CONFIG.MAX_PARTICLES) return;
  state.particles.push({
    x, y,
    vx: opts.vx || (Math.random() - 0.5) * 4,
    vy: opts.vy || (Math.random() - 0.5) * 4,
    life: opts.life || 30, maxLife: opts.life || 30,
    size: opts.size || 2, color: opts.color || '255, 200, 50', decay: opts.decay || 1,
  });
}

export function spawnExplosion(x, y, color = '255, 150, 50', count = 20, intensity = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 1) * intensity;
    spawnParticle(x, y, {
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 25, size: Math.random() * 4 + 1.5, color,
    });
  }
}

export function spawnFloatingText(x, y, text, color = '#00ffff') {
  state.floatingTexts.push({ x, y, text, color, life: 50, maxLife: 50, vy: -1.2 });
}
