import { state } from './state.js';
import { CONFIG } from './config.js';
import { canvas, ctx } from './canvas.js';
import { DOM, applyGraphicsSetting, updateCreditsDisplay } from './ui.js';
import { handleInput } from './input.js';
import { checkCollisions } from './collisions.js';
import { drawPlayer } from './entities.js';
import { updatePowerUps, drawPowerUps } from './powerups.js';
import { updateCoins, drawCoins } from './coins.js';
import { updateEnemyBullets, drawEnemyBullets, updateWave, updateEnemies, drawBossHUD, updateBullets, drawBullets, drawEnemies, drawAntimatterOrbs, updateAntimatterOrbs } from './loop.js';
import { spawnParticle, spawnExplosion, spawnFloatingText } from './utils.js';
import { showStageClear } from './game.js';
import { startGame } from './game.js'; // to ensure it can be triggered
import { BOSS_TYPES } from './enemies.js';

// ==================== STAR BACKGROUND ====================
function initStars() {
  state.stars = [];
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    state.stars.push({
      x: Math.random() * CONFIG.WIDTH,
      y: Math.random() * CONFIG.HEIGHT,
      size: Math.random() * 2.2 + 0.3,
      speed: Math.random() * 1.5 + 0.2,
      brightness: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
}

function updateStars() {
  for (const s of state.stars) {
    s.y += s.speed;
    s.twinklePhase += s.twinkleSpeed;
    if (s.y > CONFIG.HEIGHT) {
      s.y = -2;
      s.x = Math.random() * CONFIG.WIDTH;
    }
  }
}

function drawStars() {
  for (const s of state.stars) {
    const alpha = s.brightness * (0.6 + 0.4 * Math.sin(s.twinklePhase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
    ctx.fill();
    if (s.size > 1.5) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 180, 255, ${alpha * 0.15})`;
      ctx.fill();
    }
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= p.decay;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color}, ${alpha})`; ctx.fill();
  }
}

function updateFloatingTexts() {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  for (const ft of state.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = ft.color; ctx.textAlign = 'center';
    ctx.shadowColor = ft.color; ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  const dt = timestamp - state.lastTime;
  state.lastTime = timestamp;

  updateStars();
  ctx.fillStyle = '#020208'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  
  if (CONFIG.NEBULA_ENABLED) {
    const nebGrad1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 400);
    nebGrad1.addColorStop(0, 'rgba(30, 0, 70, 0.15)'); nebGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad1; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const nebGrad2 = ctx.createRadialGradient(1000, 600, 0, 1000, 600, 350);
    nebGrad2.addColorStop(0, 'rgba(0, 40, 80, 0.12)'); nebGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad2; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  drawStars();

  if (!state.gameRunning) return;
  if (state.gamePaused) {
    ctx.fillStyle = 'rgba(0, 0, 10, 0.6)'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    return;
  }

  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer--;
    if (state.bossWarningTimer % 20 < 10) {
      ctx.font = 'bold 48px Orbitron, sans-serif';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
      ctx.fillText('⚠️ CẢNH BÁO: DREADNOUGHT MK-I ĐANG TIẾP CẬN ⚠️', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
      ctx.shadowBlur = 0;
    }
    state.screenShake = 2; state.screenShakeIntensity = 10;
    
    if (state.bossWarningTimer === 0) {
      let bossHp = 100 + (state.currentStage - 1) * 30;
      state.boss = {
        x: CONFIG.WIDTH / 2,
        y: -100,
        targetY: 150,
        type: BOSS_TYPES[0],
        hp: bossHp,
        maxHp: bossHp,
        isBoss: true,
        phase: 1,
        speed: 2 + (state.currentStage - 1) * 0.5,
        direction: 1,
        attackTimer: 0,
        width: 140
      };
      state.enemies.push(state.boss);
    }
  }

  if (state.bossDeathTimer > 0) {
    state.bossDeathTimer--;
    state.screenShake = 10; state.screenShakeIntensity = 5;
    if (state.bossDeathTimer % 10 === 0) {
      spawnExplosion(state.bossDeathX + (Math.random()-0.5)*100, state.bossDeathY + (Math.random()-0.5)*80, '255, 0, 85', 30, 2);
    }
    if (state.bossDeathTimer === 0) {
      showStageClear();
    }
  }

  const shaking = state.screenShake > 0;
  if (shaking) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * state.screenShakeIntensity, (Math.random() - 0.5) * state.screenShakeIntensity);
    state.screenShake--;
  }

  handleInput();
  
  if (state.dashCooldown > 0) state.dashCooldown -= dt || 16;
  if (state.dashTimer > 0) {
    state.dashTimer -= dt || 16;
    if (state.dashTimer <= 0) state.isDashing = false;
  }
  
  if (state.equippedShipId === 'ironclad' && state.shipShield === 0) {
    state.shipShieldTimer += dt || 16;
    if (state.shipShieldTimer >= 12000) {
      state.shipShield = 1;
      state.shipShieldTimer = 0;
      spawnFloatingText(state.player.x, state.player.y - 30, "SHIELD READY", '#ffaa00');
    }
  } else {
    state.shipShieldTimer = 0;
  }
  
  if (state.invincibleTimer > 0) state.invincibleTimer--;
  
  if (state.rapidFireTimer > 0) {
    state.rapidFireTimer -= dt || 16;
    DOM.rapidFireHUDEl.textContent = `RAPID FIRE: ${(state.rapidFireTimer/1000).toFixed(1)}s`;
    DOM.rapidFireHUDEl.classList.remove('hidden');
  } else {
    DOM.rapidFireHUDEl.classList.add('hidden');
  }

  if (state.freezeTimer > 0) {
    state.freezeTimer -= dt || 16;
    DOM.freezeHUDEl.textContent = `FROZEN: ${(state.freezeTimer/1000).toFixed(1)}s`;
    DOM.freezeHUDEl.classList.remove('hidden');
  } else {
    DOM.freezeHUDEl.classList.add('hidden');
    if (!state.bossActive && state.bossDeathTimer <= 0) {
      state.enemySpawnTimer += dt || 16;
      const spawnInterval = Math.max(150, CONFIG.ENEMY_SPAWN_INTERVAL - (state.currentStage * 10 + state.wave * 20));
      if (state.enemySpawnTimer >= spawnInterval) {
        state.enemySpawnTimer = 0;
        import('./enemies.js').then(module => {
           module.spawnEnemy();
           if (state.wave >= 2 && Math.random() < 0.35) module.spawnEnemy();
           if (state.wave >= 3 && Math.random() < 0.35) module.spawnEnemy();
        });
      }
    }
  }

  updatePowerUps();
  updateCoins();
  updateEnemyBullets();
  updateBullets();
  updateAntimatterOrbs();
  updateEnemies(dt);
  updateParticles();
  updateFloatingTexts();
  updateWave();
  checkCollisions();

  drawPowerUps();
  drawCoins();
  drawEnemyBullets();
  drawBullets();
  drawAntimatterOrbs();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawFloatingTexts();
  drawBossHUD();

  if (shaking) ctx.restore();

  if (state.freezeTimer > 0) {
    const frostGrad = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.HEIGHT / 3, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH);
    frostGrad.addColorStop(0, 'rgba(112, 232, 255, 0)');
    frostGrad.addColorStop(1, `rgba(112, 232, 255, ${0.15 + Math.random() * 0.1})`);
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  if (state.damageFlashAlpha > 0.01) {
    const radGrad = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.HEIGHT / 3, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH / 2);
    radGrad.addColorStop(0, 'rgba(255, 0, 50, 0)');
    radGrad.addColorStop(1, `rgba(255, 0, 50, ${state.damageFlashAlpha})`);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    state.damageFlashAlpha *= 0.9;
  }

  if (state.nukeFlashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.nukeFlashAlpha})`;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    state.nukeFlashAlpha *= 0.85;
  }
}

// Init Game
import('./ui.js').then(module => {
  DOM.btnHelp.addEventListener('click', () => DOM.helpModal.classList.add('active'));
  DOM.btnCloseHelp.addEventListener('click', () => DOM.helpModal.classList.remove('active'));

  DOM.btnUpgrades.addEventListener('click', () => {
    module.updateUpgradesUI();
    DOM.upgradesModal.classList.add('active');
  });
  DOM.btnCloseUpgrades.addEventListener('click', () => DOM.upgradesModal.classList.remove('active'));
  
  DOM.btnStageSelect.addEventListener('click', () => {
    module.updateStageScreen();
    DOM.stageScreen.classList.remove('hidden');
    DOM.stageScreen.style.display = 'flex';
  });
  DOM.btnCloseStage.addEventListener('click', () => {
    DOM.stageScreen.classList.add('hidden');
  });
  
  DOM.btnGraphics.forEach(btn => {
    btn.addEventListener('click', (e) => applyGraphicsSetting(e.target.dataset.level));
  });
  
  [DOM.btnUpgradeLives, DOM.btnUpgradeMagnet, DOM.btnUpgradeBuff].forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      const maxLvl = type === 'lives' ? 2 : 5;
      const lvl = state.upgrades[type];
      const { UPGRADE_COSTS } = require('./config.js'); // Actually, ES6 import works differently. We can import it at top.
      import('./config.js').then(cfg => {
          if (lvl < maxLvl) {
            const cost = cfg.UPGRADE_COSTS[type][lvl];
            if (state.totalCredits >= cost) {
              state.totalCredits -= cost;
              state.upgrades[type]++;
              import('./state.js').then(s => s.saveEconomy());
              module.updateUpgradesUI();
            }
          }
      });
    });
  });
  
  DOM.btnRestart.addEventListener('click', startGame);
  DOM.btnNextStage.addEventListener('click', () => {
    state.currentStage++;
    startGame();
  });
  DOM.btnStageClearMenu.addEventListener('click', () => {
    DOM.stageClearScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
  });
  DOM.btnMenuFromGameOver.addEventListener('click', () => {
    DOM.gameOverScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
  });
  document.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !state.gameRunning && DOM.stageScreen.classList.contains('hidden') && DOM.startScreen.classList.contains('hidden') && DOM.hangarScreen.classList.contains('hidden')) {
       startGame();
    }
  });
  
  DOM.btnHangar.addEventListener('click', () => {
    module.updateHangar();
    DOM.hangarScreen.classList.remove('hidden');
    DOM.hangarScreen.style.display = 'flex';
  });
  DOM.btnCloseHangar.addEventListener('click', () => {
    DOM.hangarScreen.classList.add('hidden');
    DOM.hangarScreen.style.display = 'none';
  });
  
  if (DOM.btnResume) {
    import('./input.js').then(inp => {
      DOM.btnResume.addEventListener('click', inp.togglePause);
    });
  }
  if (DOM.btnHomeFromPause) {
    DOM.btnHomeFromPause.addEventListener('click', () => {
      state.gameRunning = false;
      state.gamePaused = false;
      DOM.pauseScreen.classList.add('hidden');
      DOM.startScreen.classList.remove('hidden');
    });
  }
});

initStars();
DOM.highScoreTextEl.textContent = `Kỷ lục: ${state.highScore.toLocaleString()}`;
updateCreditsDisplay();
requestAnimationFrame(gameLoop);
