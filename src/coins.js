import { state, saveEconomy } from './state.js';
import { ctx } from './canvas.js';
import { CONFIG } from './config.js';
import { spawnFloatingText, spawnParticle } from './utils.js';
import { updateCreditsDisplay } from './ui.js';

export function spawnCoins(x, y) {
  const count = Math.floor(Math.random() * 3) + 1;
  for(let i=0; i<count; i++) {
    state.coins.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 1) * 3,
      life: 800
    });
  }
}

export function updateCoins() {
  const magnetRadius = 60 + state.upgrades.magnet * 40;
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const c = state.coins[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.05; // gravity
    if (c.vy > 2.5) c.vy = 2.5;
    c.vx *= 0.98;
    c.life--;

    const dist = Math.sqrt((state.player.x - c.x)**2 + (state.player.y - c.y)**2);
    if (dist < magnetRadius) {
      c.vx += (state.player.x - c.x) * 0.015;
      c.vy += (state.player.y - c.y) * 0.015;
    }

    if (dist < 20) {
      state.totalCredits++;
      state.coinsEarnedInStage++;
      saveEconomy();
      updateCreditsDisplay();
      spawnFloatingText(c.x, c.y, "+1 C", '#ffd700');
      spawnParticle(c.x, c.y, { vx: 0, vy: -1, life: 15, size: 2, color: '255, 215, 0' });
      state.coins.splice(i, 1);
      continue;
    }

    if (c.y > CONFIG.HEIGHT + 30 || c.life <= 0) state.coins.splice(i, 1);
  }
}

export function drawCoins() {
  for (const c of state.coins) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2);
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.fill();
    ctx.restore();
  }
}
