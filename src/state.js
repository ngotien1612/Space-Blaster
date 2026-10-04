import { CONFIG, SHIPS } from './config.js';

let storedUpgrades = JSON.parse(localStorage.getItem('spaceBlasterUpgrades')) || {};

export const state = {
  gameRunning: false,
  gamePaused: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('spaceBlasterHighScoreV2')) || 0,
  totalCredits: parseInt(localStorage.getItem('spaceBlasterCredits')) || 0,
  storedUpgrades,
  upgrades: {
    lives: storedUpgrades.lives || 0,
    magnet: storedUpgrades.magnet || 0,
    buff: storedUpgrades.buff || 0
  },
  lives: CONFIG.LIVES + (storedUpgrades.lives || 0),
  
  unlockedStages: JSON.parse(localStorage.getItem('spaceBlasterStagesUnlocked')) || { 1: 0 },
  currentStage: 1,
  coinsEarnedInStage: 0,
  livesLostInStage: 0,
  
  bossActive: false,
  boss: null,
  bossWarningTimer: 0,
  bossDeathTimer: 0,
  bossDeathX: 0,
  bossDeathY: 0,
  stageClear: false,
  
  wave: 1,
  waveTimer: 0,
  enemySpawnTimer: 0,
  lastBulletTime: 0,
  
  screenShake: 0,
  screenShakeIntensity: 0,
  invincibleTimer: 0,
  damageFlashAlpha: 0,
  freezeTimer: 0,
  nukeFlashAlpha: 0,
  rapidFireTimer: 0,
  currentGraphic: 'HIGH',
  
  multiShotLevel: 1,
  droneLevel: 1,
  
  stars: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  powerUps: [],
  coins: [],
  floatingTexts: [],
  
  ownedShips: JSON.parse(localStorage.getItem('spaceBlasterOwnedShips')) || ['vanguard'],
  equippedShipId: localStorage.getItem('spaceBlasterEquippedShip') || 'vanguard',
  equippedShip: SHIPS.find(s => s.id === (localStorage.getItem('spaceBlasterEquippedShip') || 'vanguard')) || SHIPS[0],
  
  shipShield: 0,
  shipShieldTimer: 0,
  dashCooldown: 0,
  dashTimer: 0,
  isDashing: false,
  dashTarget: { x: 0, y: 0 },
  
  isGatlingFusion: false,
  isCryoFusion: false,
  isAntimatterFusion: false,
  antimatterShotCounter: 0,
  antimatterOrbs: [],
  gatlingAngle: 0,
  gatlingDir: 1,
  
  keys: {},
  mouseX: CONFIG.WIDTH / 2,
  mouseY: CONFIG.HEIGHT - 100,
  isMouseDown: false,
  isUsingMouse: false,
  
  player: {
    x: 1280 / 2,
    y: 720 - 100,
    width: 40,
    height: 44,
    thrusterPhase: 0,
  },
  
  lastTime: 0
};

export function saveEconomy() {
  localStorage.setItem('spaceBlasterCredits', state.totalCredits);
  localStorage.setItem('spaceBlasterUpgrades', JSON.stringify(state.upgrades));
  // Note: updateCreditsDisplay needs to be called after this in components that import saveEconomy
}

