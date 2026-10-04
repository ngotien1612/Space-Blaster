import { state } from './state.js';
import { CONFIG } from './config.js';
import { ctx } from './canvas.js';
import { spawnFloatingText, spawnParticle, spawnExplosion, hexToRgb } from './utils.js';
import { spawnEnemyType, spawnEnemy, BOSS_TYPES } from './enemies.js';
import { createBullet } from './entities.js';
import { playerTakeDamage, triggerAoE } from './collisions.js';
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
  for (const b of state.enemyBullets) {
    // Trail
    const angle = Math.atan2(b.vy, b.vx);
    const trailLen = 14;
    const tg = ctx.createLinearGradient(
      b.x - Math.cos(angle) * trailLen, b.y - Math.sin(angle) * trailLen,
      b.x, b.y
    );
    tg.addColorStop(0, 'rgba(255,0,80,0)');
    tg.addColorStop(1, 'rgba(255,0,80,0.7)');
    ctx.beginPath();
    ctx.lineWidth = b.size * 1.5;
    ctx.strokeStyle = tg;
    ctx.moveTo(b.x - Math.cos(angle) * trailLen, b.y - Math.sin(angle) * trailLen);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Core
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = b.color; ctx.shadowBlur = 12; }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bright center
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
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
  const hpRatio = Math.max(0, state.boss.hp / state.boss.maxHp);
  const w = 640;
  const h = 22;
  const x = CONFIG.WIDTH / 2 - w / 2;
  const y = 18;
  const isPhase2 = state.boss.phase === 2;
  const barColor = isPhase2 ? '#ff0000' : '#ff0055';

  // Background track
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 4);
  ctx.fill();

  // Fill bar
  if (hpRatio > 0) {
    const barGrad = ctx.createLinearGradient(x, y, x + w, y);
    barGrad.addColorStop(0, isPhase2 ? '#ff4400' : '#ff0055');
    barGrad.addColorStop(0.5, isPhase2 ? '#ff0000' : '#cc0040');
    barGrad.addColorStop(1, isPhase2 ? '#880000' : '#660022');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w * hpRatio, h, 3);
    ctx.fill();
  }

  // Sheen highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w * hpRatio, h / 2);

  // Phase separator line at 50%
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.5, y + h);
  ctx.stroke();

  // Border
  ctx.strokeStyle = isPhase2 ? '#ff4400' : '#ff5588';
  ctx.lineWidth = 2;
  if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = barColor; ctx.shadowBlur = 12; }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Boss name
  ctx.font = 'bold 13px Orbitron, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = barColor; ctx.shadowBlur = 6;
  ctx.fillText(
    isPhase2 ? `☠ ${state.boss.type.name} — PHASE II ☠` : `⚡ ${state.boss.type.name}`,
    CONFIG.WIDTH / 2,
    y + h + 14
  );
  ctx.shadowBlur = 0;

  // HP number
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'right';
  ctx.fillText(`${state.boss.hp} / ${state.boss.maxHp}`, x + w - 4, y + h - 5);
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

    // Choose color per bullet type
    let coreColor, glowColor;
    if (b.isDrone && state.isCryoFusion) {
      coreColor = '#00ffff'; glowColor = 'rgba(0,255,255,';
    } else if (b.isDrone) {
      coreColor = '#ff00ff'; glowColor = 'rgba(255,0,255,';
    } else if (b.type === 'pierce') {
      coreColor = '#00ffaa'; glowColor = 'rgba(0,255,170,';
    } else if (b.type === 'aoe') {
      coreColor = '#ffaa00'; glowColor = 'rgba(255,170,0,';
    } else if (b.type === 'cryo') {
      coreColor = '#88eeff'; glowColor = 'rgba(100,220,255,';
    } else {
      coreColor = '#00e5ff'; glowColor = 'rgba(0,220,255,';
    }

    // Trail gradient (bottom to top)
    const trailGrad = ctx.createLinearGradient(0, b.height + 16, 0, -4);
    trailGrad.addColorStop(0, glowColor + '0)');
    trailGrad.addColorStop(1, glowColor + '0.85)');
    ctx.fillStyle = trailGrad;
    ctx.fillRect(-2, -4, 4, b.height + 20);

    // Main bullet body
    ctx.fillStyle = coreColor;
    ctx.fillRect(-b.width / 2, 0, b.width, b.height);

    // Bright core stripe
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-0.8, 2, 1.6, b.height - 4);

    // Tip flare
    if (CONFIG.GLOW_ENABLED) {
      ctx.beginPath();
      ctx.arc(0, 0, b.width + 3, 0, Math.PI * 2);
      const tipGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.width + 3);
      tipGrad.addColorStop(0, glowColor + '0.7)');
      tipGrad.addColorStop(1, glowColor + '0)');
      ctx.fillStyle = tipGrad;
      ctx.fill();
      ctx.shadowColor = coreColor; ctx.shadowBlur = 10;
      ctx.fillStyle = coreColor;
      ctx.beginPath(); ctx.arc(0, 0, b.width * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
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
  const t = Date.now() * 0.003;
  for (const orb of state.antimatterOrbs) {
    ctx.save();
    ctx.translate(orb.x, orb.y);

    // Accretion disk glow
    if (CONFIG.GLOW_ENABLED) {
      const diskGrad = ctx.createRadialGradient(0, 0, orb.radius * 0.5, 0, 0, orb.radius * 2.5);
      diskGrad.addColorStop(0, 'rgba(150,0,255,0.35)');
      diskGrad.addColorStop(0.5, 'rgba(80,0,180,0.15)');
      diskGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = diskGrad;
      ctx.beginPath(); ctx.arc(0, 0, orb.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core void
    ctx.beginPath(); ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000'; ctx.fill();
    ctx.strokeStyle = '#9900ff'; ctx.lineWidth = 2;
    if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 20; }
    ctx.stroke(); ctx.shadowBlur = 0;

    // Inner event horizon ring
    ctx.beginPath(); ctx.arc(0, 0, orb.radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,0,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();

    // Rotating energy arms
    ctx.save();
    ctx.rotate(t * 2.5);
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * orb.radius, Math.sin(a) * orb.radius);
      ctx.stroke();
    }
    ctx.restore();

    // Counter-rotating ring
    ctx.save();
    ctx.rotate(-t * 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius + 5, 0, Math.PI * 1.3);
    ctx.strokeStyle = 'rgba(200,100,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

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
       triggerAoE(orb.x, orb.y, 100, 5);
       state.antimatterOrbs.splice(i, 1);
    }
  }
}

