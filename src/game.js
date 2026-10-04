import { state } from './state.js';
import { CONFIG, SHIPS } from './config.js';
import { DOM, updateScoreDisplay, updateLivesDisplay } from './ui.js';

export function resetGame() {
  state.equippedShip = SHIPS.find(s => s.id === state.equippedShipId) || SHIPS[0];
  state.score = 0; 
  state.lives = state.equippedShip.baseLives + state.upgrades.lives; 
  state.wave = 1; 
  state.waveTimer = 0; 
  state.enemySpawnTimer = 0; 
  state.invincibleTimer = 0; 
  state.screenShake = 0;
  state.shipShield = state.equippedShipId === 'ironclad' ? 1 : 0; 
  state.shipShieldTimer = 0; 
  state.dashCooldown = 0; 
  state.dashTimer = 0; 
  state.isDashing = false;
  
  state.isGatlingFusion = false; 
  state.isCryoFusion = false; 
  state.isAntimatterFusion = false; 
  state.antimatterShotCounter = 0; 
  state.antimatterOrbs = [];
  
  DOM.fusionGatling.classList.add('hidden');
  DOM.fusionCryo.classList.add('hidden');
  DOM.fusionAntimatter.classList.add('hidden');
  
  state.bullets = []; 
  state.enemies = []; 
  state.particles = []; 
  state.floatingTexts = []; 
  state.powerUps = []; 
  state.coins = []; 
  state.damageFlashAlpha = 0; 
  state.freezeTimer = 0; 
  state.nukeFlashAlpha = 0; 
  state.rapidFireTimer = 0;
  state.enemyBullets = []; 
  state.bossActive = false; 
  state.boss = null; 
  state.bossWarningTimer = 0; 
  state.bossDeathTimer = 0; 
  state.stageClear = false;
  state.coinsEarnedInStage = 0; 
  state.livesLostInStage = 0;
  
  state.multiShotLevel = 1; 
  state.droneLevel = 1;
  DOM.multiShotHUDEl.textContent = 'LV.1';
  DOM.droneHUDEl.textContent = 'LV.1';

  state.player.x = CONFIG.WIDTH / 2; 
  state.player.y = CONFIG.HEIGHT - 100;
  state.mouseX = state.player.x; 
  state.mouseY = state.player.y;

  updateScoreDisplay(); 
  updateLivesDisplay(); 
  DOM.waveValueEl.textContent = '1';
}

export function startGame() {
  resetGame();
  DOM.startScreen.classList.add('hidden'); 
  DOM.gameOverScreen.classList.add('hidden'); 
  DOM.stageClearScreen.classList.add('hidden');
  state.gameRunning = true; 
  state.gamePaused = false;
  DOM.gameWrapper.style.cursor = state.isMouseDown ? 'none' : 'crosshair';
}

export function gameOver() {
  state.gameRunning = false;
  state.isMouseDown = false;
  DOM.gameWrapper.style.cursor = 'crosshair';
  if (state.score > state.highScore) { 
    state.highScore = state.score; 
    localStorage.setItem('spaceBlasterHighScoreV2', state.highScore); 
  }
  DOM.finalScoreEl.textContent = state.score.toLocaleString();
  DOM.highScoreTextEl.textContent = `Kỷ lục: ${state.highScore.toLocaleString()}`;
  DOM.gameOverScreen.classList.remove('hidden');
}

export function showStageClear() {
  state.stageClear = true;
  state.gameRunning = false;
  DOM.gameWrapper.style.cursor = 'crosshair';

  let stars = 1;
  if (state.livesLostInStage <= 1) stars = 2;
  if (state.livesLostInStage === 0 || state.score >= (state.currentStage * 15000)) stars = 3;

  DOM.stageStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  DOM.stageCoinsEarned.textContent = state.coinsEarnedInStage;
  DOM.stageScoreText.textContent = state.score.toLocaleString();

  if (!state.unlockedStages[state.currentStage] || state.unlockedStages[state.currentStage] < stars) {
    state.unlockedStages[state.currentStage] = stars;
  }
  if (state.currentStage < 3) {
    if (!state.unlockedStages[state.currentStage + 1]) state.unlockedStages[state.currentStage + 1] = 0;
  }
  localStorage.setItem('spaceBlasterStagesUnlocked', JSON.stringify(state.unlockedStages));

  DOM.stageClearScreen.classList.remove('hidden');
  DOM.stageClearScreen.style.display = 'flex';
}
