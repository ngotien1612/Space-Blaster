import { state } from './state.js';
import { spawnExplosion, spawnFloatingText, spawnParticle, hexToRgb } from './utils.js';
import { updateScoreDisplay, updateLivesDisplay } from './ui.js';
import { spawnPowerUp } from './powerups.js';
import { spawnCoins } from './coins.js';
import { gameOver } from './game.js';

// Forward-declared to avoid circular issues — actual impl below
export function triggerBossDeath(e) {
  if (state.bossActive === false) return; // prevent double-fire
  state.boss = null;
  state.bossActive = false;
  state.bossDeathTimer = 90;
  state.bossDeathX = e.x;
  state.bossDeathY = e.y;
  // Remove boss from enemies array
  const idx = state.enemies.indexOf(e);
  if (idx !== -1) state.enemies.splice(idx, 1);
  state.enemies = state.enemies.filter(en => !en.isBoss);
  state.enemyBullets = [];
  for (let i = 0; i < 5; i++) spawnCoins(e.x + (Math.random()-0.5)*60, e.y + (Math.random()-0.5)*40);
  spawnPowerUp(e.x, e.y);
  state.score += 10000;
  updateScoreDisplay();
}

export function playerTakeDamage() {
  if (state.invincibleTimer > 0) return false;
  if (state.shipShield > 0) {
    state.shipShield--;
    state.invincibleTimer = 60;
    spawnExplosion(state.player.x, state.player.y, '255, 170, 0', 25, 1);
    spawnFloatingText(state.player.x, state.player.y - 20, "BLOCKED!", '#ffaa00');
    return false;
  }
  spawnExplosion(state.player.x, state.player.y, '0, 200, 255', 40, 1.8);
  state.lives--;
  state.livesLostInStage++;
  updateLivesDisplay();
  state.damageFlashAlpha = 0.8;
  state.screenShake = 20;
  state.screenShakeIntensity = 10;
  if (state.lives <= 0) {
    gameOver();
    return true;
  } else {
    state.invincibleTimer = 120;
    return false;
  }
}

export function triggerAoE(x, y, radius, damage) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const dist = Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2);
    if (dist < radius) {
      e.hp -= damage;
      if (e.hp <= 0) {
        if (e.isBoss) {
          triggerBossDeath(e);
          break;
        }
        const sc = e.type.score * state.wave;
        state.score += sc;
        spawnExplosion(e.x, e.y, hexToRgb(e.type.color1), 20, 1.2);
        spawnFloatingText(e.x, e.y - 15, `+${sc}`, e.type.color1);
        const dropRate = 0.15 + Math.random() * 0.15;
        if (Math.random() < dropRate) spawnPowerUp(e.x, e.y);
        if (Math.random() < 0.65) spawnCoins(e.x, e.y);
        state.enemies.splice(i, 1);
      }
    }
  }
  updateScoreDisplay();
}

export function triggerNuke() {
  state.nukeFlashAlpha = 1;
  state.screenShake = 30;
  state.screenShakeIntensity = 15;
  let nukeScore = 0;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.isBoss) {
      e.hp -= 60;
      if (e.hp <= 0) {
        triggerBossDeath(e);
        break;
      } else {
        spawnExplosion(e.x, e.y, '255, 100, 100', 30, 2);
      }
    } else {
      nukeScore += e.type.score * state.wave;
      spawnExplosion(e.x, e.y, hexToRgb(e.type.color1), 20, 1.5);
      if (Math.random() < 0.65) spawnCoins(e.x, e.y);
      state.enemies.splice(i, 1);
    }
  }
  if (nukeScore > 0) {
    state.score += nukeScore;
    updateScoreDisplay();
    spawnFloatingText(1280 / 2, 720 / 2, `NUKE +${nukeScore.toLocaleString()}!`, '#ff3700');
  }
}

export function triggerBomberExplosion(x, y) {
  spawnExplosion(x, y, '255, 50, 0', 50, 2.5);
  state.screenShake = 15;
  state.screenShakeIntensity = 8;

  const distToPlayer = Math.sqrt((x - state.player.x) ** 2 + (y - state.player.y) ** 2);
  if (distToPlayer < 120 && state.invincibleTimer <= 0) {
    playerTakeDamage();
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const otherE = state.enemies[i];
    if (otherE.x === x && otherE.y === y) continue; // skip the bomber itself
    const d = Math.sqrt((x - otherE.x) ** 2 + (y - otherE.y) ** 2);
    if (d < 140) {
      otherE.hp -= 15;
      if (otherE.hp <= 0) {
        if (otherE.isBoss) {
          triggerBossDeath(otherE);
          break;
        }
        state.score += otherE.type.score * state.wave;
        spawnExplosion(otherE.x, otherE.y, hexToRgb(otherE.type.color1), 20, 1.2);
        spawnFloatingText(otherE.x, otherE.y - 15, "CHAIN KILL", '#ff2200');
        if (Math.random() < 0.65) spawnCoins(otherE.x, otherE.y);
        state.enemies.splice(i, 1);
      }
    }
  }
  updateScoreDisplay();
}

export function checkCollisions() {
  // Bullet vs Enemy
  bulletLoop: for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      const hitRadius = e.type.width / 2 + 4;
      if (Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2) >= hitRadius) continue;

      if (b.type === 'pierce') {
        if (b.hitSet.has(e)) continue;
        b.hitSet.add(e);
        e.hp -= 1;
        spawnParticle(b.x, b.y, { vx: 0, vy: 0, life: 8, size: 6, color: '0, 255, 170' });
      } else if (b.type === 'aoe') {
        state.bullets.splice(bi, 1);
        spawnExplosion(b.x, b.y, '255, 170, 0', 10, 1.2);
        triggerAoE(b.x, b.y, 70, 1);
        continue bulletLoop;
      } else if (b.type === 'cryo') {
        state.bullets.splice(bi, 1);
        e.hp -= 1;
        e.slowTimer = 120;
        spawnParticle(b.x, b.y, { vx: 0, vy: 0, life: 8, size: 6, color: '0, 255, 255' });
      } else {
        // normal bullet
        state.bullets.splice(bi, 1);
        e.hp -= 1;
        spawnParticle(b.x, b.y, { vx: 0, vy: 0, life: 8, size: 6, color: '255, 255, 255' });
      }

      // Check kill (pierce bullet stays in array, others already spliced)
      if (e.hp <= 0) {
        const enemyScore = e.type.score * state.wave;
        state.score += enemyScore;
        updateScoreDisplay();

        if (e.isBoss) {
          triggerBossDeath(e);
          continue bulletLoop;
        }

        if (e.type.name === 'bomber') {
          triggerBomberExplosion(e.x, e.y);
        } else {
          const big = e.type.name === 'supertank';
          spawnExplosion(e.x, e.y, hexToRgb(e.type.color1), big ? 50 : 25, big ? 2 : 1.2);
          spawnFloatingText(e.x, e.y - 20, `+${enemyScore}`, e.type.color1);
          state.screenShake = big ? 10 : 5;
          state.screenShakeIntensity = big ? 6 : 3;
          const dropRate = 0.15 + Math.random() * 0.15;
          if (Math.random() < dropRate) spawnPowerUp(e.x, e.y);
          if (Math.random() < 0.65) spawnCoins(e.x, e.y);
        }
        state.enemies.splice(ei, 1);
        if (b.type !== 'pierce') continue bulletLoop;
      }
    }
  }

  // Enemy vs Player
  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    const dist = Math.sqrt((state.player.x - e.x) ** 2 + (state.player.y - e.y) ** 2);

    // Bomber proximity detonate
    if (e.type.name === 'bomber' && dist < 90) {
      state.enemies.splice(ei, 1);
      triggerBomberExplosion(e.x, e.y);
      continue;
    }

    if (state.invincibleTimer > 0) continue;

    if (dist < e.type.width / 2 + 14) {
      if (e.isBoss) {
        if (playerTakeDamage()) return;
      } else {
        if (e.type.name === 'bomber') {
          state.enemies.splice(ei, 1);
          triggerBomberExplosion(e.x, e.y);
        } else {
          state.enemies.splice(ei, 1);
          if (playerTakeDamage()) return;
        }
      }
    }
  }
}
