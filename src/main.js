import { state } from './state.js';
import { CONFIG, UPGRADE_COSTS } from './config.js';
import { canvas, ctx } from './canvas.js';
import { DOM, applyGraphicsSetting, updateCreditsDisplay, updateUpgradesUI } from './ui.js';
import { handleInput } from './input.js';
import { checkCollisions } from './collisions.js';
import { drawPlayer, spawnBullet } from './entities.js';
import { updatePowerUps, drawPowerUps } from './powerups.js';
import { updateCoins, drawCoins } from './coins.js';
import { updateEnemyBullets, drawEnemyBullets, updateWave, updateEnemies, drawBossHUD, updateBullets, drawBullets, drawEnemies, drawAntimatterOrbs, updateAntimatterOrbs } from './loop.js';
import { spawnParticle, spawnExplosion, spawnFloatingText } from './utils.js';
import { showStageClear, startGame, continueEndless } from './game.js';
import { BOSS_TYPES, spawnEnemy } from './enemies.js';
import { saveEconomy } from './state.js';
import { updateStageScreen, updateHangar } from './ui.js';
import { togglePause } from './input.js';

// ==================== STAR BACKGROUND ====================
function initStars() {
  state.stars = [];
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    state.stars.push({
      x: Math.random() * CONFIG.WIDTH,
      y: Math.random() * CONFIG.HEIGHT,
      size: Math.random() * 2.5 + 0.3,
      speed: Math.random() * 1.5 + 0.2,
      brightness: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.03 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.15 ? `${180 + Math.random()*75|0}, ${180 + Math.random()*75|0}, 255` : '200, 220, 255',
    });
  }
}

function updateStars() {
  for (const s of state.stars) {
    s.y += s.speed;
    s.twinklePhase += s.twinkleSpeed;
    if (s.y > CONFIG.HEIGHT + 2) {
      s.y = -2;
      s.x = Math.random() * CONFIG.WIDTH;
    }
  }
}

function drawStars() {
  for (const s of state.stars) {
    const alpha = s.brightness * (0.5 + 0.5 * Math.sin(s.twinklePhase));
    // Core
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
    ctx.fill();
    // Soft halo for larger stars
    if (s.size > 1.4) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.color}, ${alpha * 0.12})`;
      ctx.fill();
    }
    // Cross-flare for the brightest stars
    if (s.size > 2.0 && s.brightness > 0.75) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = `rgba(${s.color}, 1)`;
      ctx.lineWidth = 0.5;
      const len = s.size * 4;
      ctx.beginPath();
      ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
      ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
      ctx.stroke();
      ctx.restore();
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
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
    ctx.fill();
  }
}

function updateFloatingTexts() {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  for (const ft of state.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 10;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Draw a scrolling grid for depth effect
let gridOffset = 0;
function drawSpaceGrid() {
  if (!CONFIG.NEBULA_ENABLED) return;
  gridOffset = (gridOffset + 0.3) % 80;
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 0.5;
  for (let y = -80 + gridOffset; y < CONFIG.HEIGHT + 80; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.WIDTH, y); ctx.stroke();
  }
  for (let x = 0; x < CONFIG.WIDTH; x += 120) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.HEIGHT); ctx.stroke();
  }
  ctx.restore();
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(timestamp - state.lastTime, 50); // cap dt to avoid huge jumps
  state.lastTime = timestamp;

  // Background
  ctx.fillStyle = '#030310';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  if (CONFIG.NEBULA_ENABLED) {
    // Deep nebula layers
    const nebGrad1 = ctx.createRadialGradient(180, 280, 0, 180, 280, 480);
    nebGrad1.addColorStop(0, 'rgba(25, 0, 65, 0.25)');
    nebGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad1;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const nebGrad2 = ctx.createRadialGradient(1100, 550, 0, 1100, 550, 420);
    nebGrad2.addColorStop(0, 'rgba(0, 30, 70, 0.2)');
    nebGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad2;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const nebGrad3 = ctx.createRadialGradient(640, 360, 0, 640, 360, 600);
    nebGrad3.addColorStop(0, 'rgba(10, 0, 30, 0.1)');
    nebGrad3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad3;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  drawSpaceGrid();
  updateStars();
  drawStars();

  if (!state.gameRunning) return;

  if (state.gamePaused) {
    ctx.fillStyle = 'rgba(0, 0, 10, 0.65)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    return;
  }

  // Boss warning phase
  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer--;

    // Draw pulsing warning text
    if (state.bossWarningTimer % 20 < 10) {
      const warnAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.02);
      ctx.save();
      ctx.globalAlpha = warnAlpha;
      ctx.font = 'bold 38px Orbitron, sans-serif';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 30;
      ctx.fillText('⚠ CẢNH BÁO: DREADNOUGHT MK-I ĐANG TIẾP CẬN ⚠', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    state.screenShake = 2;
    state.screenShakeIntensity = 6;

    if (state.bossWarningTimer === 0) {
      const bossHp = 100 + (state.currentStage - 1) * 50;
      state.boss = {
        x: CONFIG.WIDTH / 2,
        y: -120,
        targetY: 150,
        type: BOSS_TYPES[0],
        hp: bossHp,
        maxHp: bossHp,
        isBoss: true,
        phase: 1,
        speed: 1.8 + (state.currentStage - 1) * 0.4,
        direction: 1,
        attackTimer: 0,
        summonTimer: 0,
        width: 140
      };
      state.enemies.push(state.boss);
    }
  }

  // Boss death cinematic
  if (state.bossDeathTimer > 0) {
    state.bossDeathTimer--;
    state.screenShake = 12;
    state.screenShakeIntensity = 6;
    if (state.bossDeathTimer % 8 === 0) {
      spawnExplosion(
        state.bossDeathX + (Math.random() - 0.5) * 120,
        state.bossDeathY + (Math.random() - 0.5) * 90,
        '255, 0, 85', 35, 2.2
      );
    }
    if (state.bossDeathTimer === 0) {
      showStageClear();
    }
  }

  // Screen shake
  const shaking = state.screenShake > 0;
  if (shaking) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * state.screenShakeIntensity,
      (Math.random() - 0.5) * state.screenShakeIntensity
    );
    state.screenShake--;
  }

  // Input
  handleInput();

  // Dash cooldown
  if (state.dashCooldown > 0) state.dashCooldown -= dt;
  if (state.dashTimer > 0) {
    state.dashTimer -= dt;
    if (state.dashTimer <= 0) state.isDashing = false;
  }

  // Ironclad shield regen
  if (state.equippedShipId === 'ironclad' && state.shipShield === 0) {
    state.shipShieldTimer += dt;
    if (state.shipShieldTimer >= 12000) {
      state.shipShield = 1;
      state.shipShieldTimer = 0;
      spawnFloatingText(state.player.x, state.player.y - 30, "SHIELD READY", '#ffaa00');
    }
  } else {
    state.shipShieldTimer = 0;
  }

  if (state.invincibleTimer > 0) state.invincibleTimer--;

  // Timer HUDs
  if (state.rapidFireTimer > 0) {
    state.rapidFireTimer -= dt;
    DOM.rapidFireHUDEl.textContent = `RAPID FIRE: ${(state.rapidFireTimer / 1000).toFixed(1)}s`;
    DOM.rapidFireHUDEl.classList.remove('hidden');
  } else {
    DOM.rapidFireHUDEl.classList.add('hidden');
  }

  if (state.freezeTimer > 0) {
    state.freezeTimer -= dt;
    DOM.freezeHUDEl.textContent = `FREEZE: ${(state.freezeTimer / 1000).toFixed(1)}s`;
    DOM.freezeHUDEl.classList.remove('hidden');
  } else {
    DOM.freezeHUDEl.classList.add('hidden');
  }

  // Enemy spawning — ONLY when not in boss warning/fight/death
  const canSpawn = !state.bossActive && state.bossDeathTimer <= 0 && state.bossWarningTimer <= 0;
  if (canSpawn && state.freezeTimer <= 0) {
    state.enemySpawnTimer += dt;
    const spawnInterval = Math.max(150, CONFIG.ENEMY_SPAWN_INTERVAL - (state.currentStage * 10 + state.wave * 20));
    if (state.enemySpawnTimer >= spawnInterval) {
      state.enemySpawnTimer = 0;
      spawnEnemy();
      if (state.wave >= 2 && Math.random() < 0.35) spawnEnemy();
      if (state.wave >= 3 && Math.random() < 0.35) spawnEnemy();
    }
  }

  // Update everything
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

  // Draw everything
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

  // Full-screen overlays
  if (state.freezeTimer > 0) {
    const frostGrad = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 100, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.8);
    frostGrad.addColorStop(0, 'rgba(112, 232, 255, 0)');
    frostGrad.addColorStop(1, `rgba(112, 232, 255, ${0.12 + Math.random() * 0.06})`);
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Ice crystal vignette border
    ctx.strokeStyle = 'rgba(112, 232, 255, 0.35)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, CONFIG.WIDTH - 8, CONFIG.HEIGHT - 8);
  }

  if (state.damageFlashAlpha > 0.01) {
    const radGrad = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.HEIGHT / 3, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.65);
    radGrad.addColorStop(0, 'rgba(255, 0, 50, 0)');
    radGrad.addColorStop(1, `rgba(255, 0, 50, ${state.damageFlashAlpha})`);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    state.damageFlashAlpha *= 0.88;
  }

  if (state.nukeFlashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.nukeFlashAlpha})`;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    state.nukeFlashAlpha *= 0.82;
  }
}

// ==================== INIT LISTENERS ====================
DOM.btnHelp.addEventListener('click', () => DOM.helpModal.classList.add('active'));
DOM.btnCloseHelp.addEventListener('click', () => DOM.helpModal.classList.remove('active'));

DOM.btnUpgrades.addEventListener('click', () => {
  updateUpgradesUI();
  DOM.upgradesModal.classList.add('active');
});
DOM.btnCloseUpgrades.addEventListener('click', () => DOM.upgradesModal.classList.remove('active'));

DOM.btnStageSelect.addEventListener('click', () => {
  updateStageScreen();
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
    if (lvl < maxLvl) {
      const cost = UPGRADE_COSTS[type][lvl];
      if (state.totalCredits >= cost) {
        state.totalCredits -= cost;
        state.upgrades[type]++;
        saveEconomy();
        updateCreditsDisplay();
        updateUpgradesUI();
      }
    }
  });
});

DOM.btnRestart.addEventListener('click', startGame);

DOM.btnNextStage.addEventListener('click', () => {
  state.currentStage++;
  continueEndless();
});

DOM.btnStageClearMenu.addEventListener('click', () => {
  DOM.stageClearScreen.classList.add('hidden');
  DOM.stageClearScreen.style.display = 'none';
  DOM.startScreen.classList.remove('hidden');
});

DOM.btnMenuFromGameOver.addEventListener('click', () => {
  DOM.gameOverScreen.classList.add('hidden');
  DOM.startScreen.classList.remove('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !state.gameRunning &&
      DOM.stageScreen.classList.contains('hidden') &&
      DOM.startScreen.classList.contains('hidden') &&
      DOM.hangarScreen.classList.contains('hidden')) {
    startGame();
  }
});

if (DOM.btnHangar) {
  DOM.btnHangar.addEventListener('click', () => {
    updateHangar();
    DOM.hangarScreen.classList.remove('hidden');
    DOM.hangarScreen.style.display = 'flex';
  });
}
if (DOM.btnCloseHangar) {
  DOM.btnCloseHangar.addEventListener('click', () => {
    DOM.hangarScreen.classList.add('hidden');
    DOM.hangarScreen.style.display = 'none';
  });
}

if (DOM.btnResume) {
  DOM.btnResume.addEventListener('click', togglePause);
}
if (DOM.btnHomeFromPause) {
  DOM.btnHomeFromPause.addEventListener('click', () => {
    state.gameRunning = false;
    state.gamePaused = false;
    DOM.pauseScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
  });
}

// ==================== BOOT ====================
initStars();
DOM.highScoreTextEl.textContent = `Kỷ lục: ${state.highScore.toLocaleString()}`;
updateCreditsDisplay();
requestAnimationFrame(gameLoop);
