import { state, saveEconomy } from './state.js';
import { CONFIG, SHIPS, UPGRADE_COSTS } from './config.js';

// startGame is injected via setStartGameFn to avoid circular dependency
let _startGame = null;
export function setStartGameFn(fn) { _startGame = fn; }

export const DOM = {
  gameWrapper: document.getElementById('gameWrapper'),
  scoreValueEl: document.getElementById('scoreValue'),
  creditsValueEl: document.getElementById('creditsValue'),
  modalCreditsValueEl: document.getElementById('modalCreditsValue'),
  waveValueEl: document.getElementById('waveValue'),
  livesIconsEl: document.getElementById('livesIcons'),
  multiShotHUDEl: document.getElementById('multiShotHUD'),
  droneHUDEl: document.getElementById('droneHUD'),
  startScreen: document.getElementById('startScreen'),
  gameOverScreen: document.getElementById('gameOverScreen'),
  finalScoreEl: document.getElementById('finalScore'),
  highScoreTextEl: document.getElementById('highScoreText'),
  btnStageSelect: document.getElementById('btnStageSelect'),
  btnRestart: document.getElementById('btnRestart'),
  btnMenuFromGameOver: document.getElementById('btnMenuFromGameOver'),
  stageScreen: document.getElementById('stageScreen'),
  stageClearScreen: document.getElementById('stageClearScreen'),
  pauseScreen: document.getElementById('pauseScreen'),
  pauseGraphicText: document.getElementById('pauseGraphicText'),
  btnResume: document.getElementById('btnResume'),
  btnHomeFromPause: document.getElementById('btnHomeFromPause'),
  btnHelp: document.getElementById('btnHelp'),
  btnCloseHelp: document.getElementById('btnCloseHelp'),
  helpModal: document.getElementById('helpModal'),
  btnUpgrades: document.getElementById('btnUpgrades'),
  upgradesModal: document.getElementById('upgradesModal'),
  btnCloseUpgrades: document.getElementById('btnCloseUpgrades'),
  btnUpgradeLives: document.getElementById('btnUpgradeLives'),
  btnUpgradeMagnet: document.getElementById('btnUpgradeMagnet'),
  btnUpgradeBuff: document.getElementById('btnUpgradeBuff'),
  livesUpgradeLvlEl: document.getElementById('livesUpgradeLvl'),
  magnetUpgradeLvlEl: document.getElementById('magnetUpgradeLvl'),
  buffUpgradeLvlEl: document.getElementById('buffUpgradeLvl'),
  freezeHUDEl: document.getElementById('freezeHUD'),
  rapidFireHUDEl: document.getElementById('rapidFireHUD'),
  btnGraphics: document.querySelectorAll('.btn-graphic'),
  stageGrid: document.getElementById('stageGrid'),
  btnCloseStage: document.getElementById('btnCloseStage'),
  fusionGatling: document.getElementById('fusionGatling'),
  fusionCryo: document.getElementById('fusionCryo'),
  fusionAntimatter: document.getElementById('fusionAntimatter'),
  stageStars: document.getElementById('stageStars'),
  stageCoinsEarned: document.getElementById('stageCoinsEarned'),
  stageScoreText: document.getElementById('stageScoreText'),
  btnNextStage: document.getElementById('btnNextStage'),
  btnStageClearMenu: document.getElementById('btnStageClearMenu'),
  hangarScreen: document.getElementById('hangarScreen'),
  hangarCreditsValue: document.getElementById('hangarCreditsValue'),
  hangarGrid: document.getElementById('hangarGrid'),
  btnCloseHangar: document.getElementById('btnCloseHangar'),
  btnHangar: document.getElementById('btnHangar')
};

export function updateCreditsDisplay() {
  DOM.creditsValueEl.textContent = state.totalCredits.toLocaleString();
  if (DOM.modalCreditsValueEl) DOM.modalCreditsValueEl.textContent = state.totalCredits.toLocaleString();
}

export function updateUpgradesUI() {
  DOM.modalCreditsValueEl.textContent = state.totalCredits.toLocaleString();
  const setupBtn = (btn, lvlEl, type, maxLvl) => {
    const lvl = state.upgrades[type];
    lvlEl.textContent = `LV.${lvl}`;
    if (lvl >= maxLvl) {
      btn.textContent = 'MAX';
      btn.disabled = true;
    } else {
      const cost = UPGRADE_COSTS[type][lvl];
      btn.textContent = `${cost} 🪙`;
      btn.disabled = state.totalCredits < cost;
    }
  };
  setupBtn(DOM.btnUpgradeLives, DOM.livesUpgradeLvlEl, 'lives', 2);
  setupBtn(DOM.btnUpgradeMagnet, DOM.magnetUpgradeLvlEl, 'magnet', 5);
  setupBtn(DOM.btnUpgradeBuff, DOM.buffUpgradeLvlEl, 'buff', 5);
}

export function updateStageScreen() {
  DOM.stageGrid.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const isUnlocked = state.unlockedStages.hasOwnProperty(i);
    const stars = state.unlockedStages[i] || 0;
    const btn = document.createElement('div');
    btn.style.width = '120px'; btn.style.height = '120px';
    btn.style.background = isUnlocked ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    btn.style.border = isUnlocked ? '2px solid #00ffff' : '2px solid #555';
    btn.style.borderRadius = '10px';
    btn.style.display = 'flex'; btn.style.flexDirection = 'column'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
    btn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
    btn.style.transition = '0.2s';
    
    let starsHtml = '';
    if (isUnlocked) {
      starsHtml = `<div style="color: #ffd700; font-size: 20px; margin-top: 10px;">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
    } else {
      starsHtml = `<div style="color: #555; font-size: 20px; margin-top: 10px;">🔒</div>`;
    }

    btn.innerHTML = `
      <strong style="color: ${isUnlocked ? '#fff' : '#555'}; font-family: 'Orbitron'; font-size: 20px;">ẢI ${i}</strong>
      ${starsHtml}
    `;

    if (isUnlocked) {
      btn.addEventListener('mouseover', () => btn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)');
      btn.addEventListener('mouseout', () => btn.style.boxShadow = 'none');
      btn.addEventListener('click', () => {
        state.currentStage = i;
        DOM.stageScreen.classList.add('hidden');
        if (_startGame) _startGame();
      });
    }
    DOM.stageGrid.appendChild(btn);
  }
}

export function updateHangar() {
  DOM.hangarCreditsValue.textContent = state.totalCredits;
  DOM.hangarGrid.innerHTML = '';
  
  SHIPS.forEach(ship => {
    const isOwned = state.ownedShips.includes(ship.id);
    const isEquipped = state.equippedShipId === ship.id;
    
    const div = document.createElement('div');
    div.style.border = `2px solid ${ship.color}`;
    div.style.padding = '15px';
    div.style.borderRadius = '8px';
    div.style.background = isEquipped ? `rgba(${hexToRgbForHangar(ship.color)}, 0.2)` : 'rgba(0,0,0,0.5)';
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: ${ship.color}; font-size: 20px; font-family: 'Orbitron', sans-serif;">${ship.name}</strong>
          <div style="color: #ccc; font-size: 14px; margin-top: 5px; max-width: 350px;">${ship.desc}</div>
        </div>
        <div>
          ${isEquipped ? 
            `<button class="btn-restart" style="padding: 10px; font-size: 14px; background: #005500; cursor: default;">ĐANG TRANG BỊ</button>` : 
            isOwned ? 
            `<button class="btn-restart btn-equip" data-id="${ship.id}" style="padding: 10px; font-size: 14px;">TRANG BỊ</button>` : 
            `<button class="btn-restart btn-buy-ship" data-id="${ship.id}" data-price="${ship.price}" style="padding: 10px; font-size: 14px; color: #ffd700;">MUA: ${ship.price} 🪙</button>`
          }
        </div>
      </div>
    `;
    DOM.hangarGrid.appendChild(div);
  });
  
  document.querySelectorAll('.btn-equip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.equippedShipId = e.target.getAttribute('data-id');
      state.equippedShip = SHIPS.find(s => s.id === state.equippedShipId);
      localStorage.setItem('spaceBlasterEquippedShip', state.equippedShipId);
      updateHangar();
    });
  });
  
  document.querySelectorAll('.btn-buy-ship').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const price = parseInt(e.target.getAttribute('data-price'));
      if (state.totalCredits >= price) {
        state.totalCredits -= price;
        saveEconomy();
        state.ownedShips.push(id);
        localStorage.setItem('spaceBlasterOwnedShips', JSON.stringify(state.ownedShips));
        updateHangar();
      } else {
        alert("Không đủ vàng!");
      }
    });
  });
}

function hexToRgbForHangar(hex) {
  if (hex.length === 4) hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function updateScoreDisplay() { DOM.scoreValueEl.textContent = state.score.toLocaleString(); }
export function updateLivesDisplay() { DOM.livesIconsEl.textContent = '🚀'.repeat(Math.max(0, state.lives)); }
export function updatePauseGraphicText() {
  const gText = state.currentGraphic === 'HIGH' ? 'CAO' : state.currentGraphic === 'MED' ? 'VỪA' : 'THẤP';
  if (DOM.pauseGraphicText) DOM.pauseGraphicText.textContent = `Đồ họa hiện tại: ${gText} (Nhấn 1: THẤP, 2: VỪA, 3: CAO)`;
}

export function applyGraphicsSetting(level) {
  state.currentGraphic = level;
  DOM.btnGraphics.forEach(b => b.classList.toggle('active', b.dataset.level === level));
  
  if (level === 'HIGH') {
    CONFIG.STAR_COUNT = 250; CONFIG.MAX_PARTICLES = 400; CONFIG.GLOW_ENABLED = true; CONFIG.NEBULA_ENABLED = true;
  } else if (level === 'MED') {
    CONFIG.STAR_COUNT = 120; CONFIG.MAX_PARTICLES = 150; CONFIG.GLOW_ENABLED = false; CONFIG.NEBULA_ENABLED = true;
  } else if (level === 'LOW') {
    CONFIG.STAR_COUNT = 50; CONFIG.MAX_PARTICLES = 50; CONFIG.GLOW_ENABLED = false; CONFIG.NEBULA_ENABLED = false;
  }
  
  if (state.stars && state.stars.length > 0) {
    if (state.stars.length > CONFIG.STAR_COUNT) state.stars.length = CONFIG.STAR_COUNT;
    else if (state.stars.length < CONFIG.STAR_COUNT) {
      for(let i = state.stars.length; i < CONFIG.STAR_COUNT; i++) {
        state.stars.push({
          x: Math.random() * CONFIG.WIDTH, y: Math.random() * CONFIG.HEIGHT,
          size: Math.random() * 2.2 + 0.3, speed: Math.random() * 1.5 + 0.2,
          brightness: Math.random() * 0.7 + 0.3, twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    }
  }
}
