import { state } from './state.js';
import { CONFIG, BOSS_TYPES } from './config.js';
import { ctx } from './canvas.js';
import { spawnFloatingText, spawnParticle, spawnExplosion, hexToRgb } from './utils.js';
import { spawnEnemyType, spawnEnemy } from './enemies.js';
import { createBullet } from './entities.js';
import { playerTakeDamage } from './collisions.js';
import { DOM } from './ui.js';

export function createEnemyBullet(x, y, angle, speed, color = '#ff0000') {
  state.enemyBullets.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, size: 4, color });
}

export function updateEnemyBullets() {
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    let b = state.enemyBullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.x < 0 || b.x > CONFIG.WIDTH || b.y < 0 || b.y > CONFIG.HEIGHT) {
      state.enemyBullets.splice(i, 1);
      continue;
    }
    
    if (state.invincibleTimer <= 0) {
      const dist = Math.sqrt((state.player.x - b.x)**2 + (state.player.y - b.y)**2);
      if (dist < 15) {
        state.enemyBullets.splice(i, 1);
        playerTakeDamage();
        continue;
      }
    }
  }
}

export function drawEnemyBullets() {
  for (let b of state.enemyBullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
    ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10; ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export function startBossFight() {
  state.bossActive = true;
  state.bossWarningTimer = 180;
}

export function updateWave() {
  if (state.bossActive || state.stageClear || state.bossDeathTimer > 0) return;

  state.waveTimer++;
  if (state.waveTimer >= 1400) {
    state.waveTimer = 0; 
    state.wave++;
    if (state.wave <= 9) {
      DOM.waveValueEl.textContent = state.wave;
      spawnFloatingText(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 50, `WAVE ${state.wave}`, '#ffaa00');
      for (let i = 0; i < 40; i++) {
        spawnParticle(Math.random() * CONFIG.WIDTH, Math.random() * CONFIG.HEIGHT, {
          vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
          life: 40, size: 2.5, color: '255, 170, 0'
        });
      }
    } else {
      DOM.waveValueEl.textContent = "BOSS";
      startBossFight();
    }
  }
}

export function updateEnemies(dt) {
  if (state.freezeTimer > 0) return;
  
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.slowTimer > 0) e.slowTimer -= dt || 16;
    
    if (e.isBoss) {
      if (e.y < e.targetY) {
        e.y += 1.5;
      } else {
        e.x += e.speed * e.direction;
        if (e.x < 150 || e.x > CONFIG.WIDTH - 150) e.direction *= -1;

        if (e.hp <= e.maxHp / 2 && e.phase === 1) {
          e.phase = 2;
          e.speed *= 1.25;
          e.summonTimer = 0;
          spawnEnemyType('bomber', e.x - 80, e.y + 40);
          spawnEnemyType('bomber', e.x + 80, e.y + 40);
        }

        e.attackTimer++;
        if (e.phase === 2) {
          if (e.summonTimer === undefined) e.summonTimer = 0;
          e.summonTimer++;
          if (e.summonTimer >= 480) { // 8 seconds
            e.summonTimer = 0;
            spawnEnemyType('bomber', e.x - 80, e.y + 40);
            spawnEnemyType('bomber', e.x + 80, e.y + 40);
          }
        }

        if (e.phase === 1) {
          if (e.attackTimer >= 90) { // 1.5 seconds
            e.attackTimer = 0;
            const angleCenter = Math.PI / 2; // Straight down
            createEnemyBullet(e.x, e.y + 30, angleCenter - 0.2, 1.5 + state.currentStage*0.15);
            createEnemyBullet(e.x, e.y + 30, angleCenter, 1.5 + state.currentStage*0.15);
            createEnemyBullet(e.x, e.y + 30, angleCenter + 0.2, 1.5 + state.currentStage*0.15);
            if (state.currentStage > 1) {
                createEnemyBullet(e.x, e.y + 30, angleCenter - 0.4, 1.5 + state.currentStage*0.15);
                createEnemyBullet(e.x, e.y + 30, angleCenter + 0.4, 1.5 + state.currentStage*0.15);
            }
          }
        } else {
          if (e.attackTimer >= 40 - state.currentStage * 4) {
            e.attackTimer = 0;
            const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
            createEnemyBullet(e.x, e.y + 30, angle - 0.2, 2, '#ff0055');
            createEnemyBullet(e.x, e.y + 30, angle - 0.1, 2, '#ff0055');
            createEnemyBullet(e.x, e.y + 30, angle, 2, '#ff0055');
            createEnemyBullet(e.x, e.y + 30, angle + 0.1, 2, '#ff0055');
            createEnemyBullet(e.x, e.y + 30, angle + 0.2, 2, '#ff0055');
          }
        }
      }
      continue;
    }

    const moveSpeed = e.slowTimer > 0 ? e.speed * 0.4 : e.speed;
    e.y += moveSpeed;
    e.phase += 0.02;
    e.rotation += 0.03;

    if (e.pattern === 'sine') e.x = e.originX + Math.sin(e.phase) * e.amplitude;
    else if (e.pattern === 'zigzag') e.x = e.originX + Math.sin(e.phase * 2) * e.amplitude * 0.6;

    e.x = Math.max(e.type.width / 2 + 10, Math.min(CONFIG.WIDTH - e.type.width / 2 - 10, e.x));

    if (e.y > CONFIG.HEIGHT + 80) state.enemies.splice(i, 1);
  }
}

export function drawBossHUD() {
  if (!state.boss) return;
  const hpRatio = state.boss.hp / state.boss.maxHp;
  const w = 600;
  const h = 20;
  const x = CONFIG.WIDTH / 2 - w / 2;
  const y = 20;

  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(x, y, w, h);
  
  ctx.fillStyle = state.boss.phase === 2 ? '#ff0000' : '#ff0055';
  ctx.fillRect(x, y, w * hpRatio, h);
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  
  ctx.font = 'bold 16px Orbitron';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(state.boss.type.name, CONFIG.WIDTH / 2, y + 15);
}

export function updateBullets() {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    state.bullets[i].x += state.bullets[i].vx;
    state.bullets[i].y += state.bullets[i].vy;
    if (state.bullets[i].y < -30 || state.bullets[i].x < -30 || state.bullets[i].x > CONFIG.WIDTH + 30) {
      state.bullets.splice(i, 1);
    }
  }
}

export function drawBullets() {
  for (const b of state.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    const color = b.isDrone ? (state.isCryoFusion ? 'rgba(0, 255, 255,' : 'rgba(255, 0, 255,') : 
                  b.type === 'pierce' ? 'rgba(0, 255, 170,' : 
                  b.type === 'aoe' ? 'rgba(255, 170, 0,' : 
                  b.type === 'cryo' ? 'rgba(0, 255, 255,' : 'rgba(0, 255, 255,';
    
    const trailGrad = ctx.createLinearGradient(0, b.height, 0, -12);
    trailGrad.addColorStop(0, color + ' 0)');
    trailGrad.addColorStop(1, color + ' 0.9)');
    ctx.fillStyle = trailGrad;
    ctx.fillRect(-1.5, 0, 3, b.height + 12);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-b.width / 2, 0, b.width, b.height);

    if (CONFIG.GLOW_ENABLED) {
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
      glow.addColorStop(0, color + ' 0.5)'); glow.addColorStop(1, color + ' 0)');
      ctx.fillStyle = glow; ctx.fill();
    }
    
    ctx.restore();
  }
}

export function drawEnemies() {
  for (const e of state.enemies) {
    ctx.save();
    const rgb = hexToRgb(e.type.color1);
    if (CONFIG.GLOW_ENABLED) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.type.width, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.type.width);
      glow.addColorStop(0, `rgba(${rgb}, 0.4)`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fill();
      ctx.globalAlpha = 1;
    }
    e.type.draw(e);
    
    if (state.freezeTimer > 0 || e.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.type.width / 2 + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(112, 232, 255, 0.3)';
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawAntimatterOrbs() {
  for (let orb of state.antimatterOrbs) {
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI*2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#aa00ff';
    ctx.stroke();
    
    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(Date.now() * 0.01);
    ctx.beginPath();
    ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
    ctx.moveTo(0, -15); ctx.lineTo(0, 15);
    ctx.strokeStyle = '#ff00ff';
    ctx.stroke();
    ctx.restore();
  }
}

export function updateAntimatterOrbs() {
  for (let i = state.antimatterOrbs.length - 1; i >= 0; i--) {
    let orb = state.antimatterOrbs[i];
    orb.x += orb.vx;
    orb.y += orb.vy;
    orb.life--;
    
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      let e = state.enemies[j];
      if (!e.isBoss) {
        let dx = orb.x - e.x;
        let dy = orb.y - e.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 150) {
          e.x += dx * 0.05;
          e.y += dy * 0.05;
        }
        if (dist < orb.radius) {
          e.hp = 0; 
          spawnExplosion(e.x, e.y, hexToRgb(e.type.color1), 15, 1);
          state.enemies.splice(j, 1);
        }
      }
    }
    
    if (orb.life <= 0) {
       spawnExplosion(orb.x, orb.y, '170, 0, 255', 60, 2);
       // We'll need to triggerAoE, which is in collisions.js
       // We can dynamically import or pass it
       // Actually triggerAoE is in collisions, which is imported in loop.js? No.
       import('./collisions.js').then(module => {
          module.triggerAoE(orb.x, orb.y, 100, 5); 
       });
       state.antimatterOrbs.splice(i, 1);
    }
  }
}

