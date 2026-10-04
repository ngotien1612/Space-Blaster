import { state } from './state.js';
import { CONFIG } from './config.js';
import { DOM, applyGraphicsSetting, updatePauseGraphicText } from './ui.js';
import { spawnExplosion } from './utils.js';
import { canvas } from './canvas.js';
import { spawnBullet } from './entities.js';

export function togglePause() {
  state.gamePaused = !state.gamePaused;
  if (state.gamePaused) {
    DOM.pauseScreen.classList.remove('hidden');
    DOM.pauseScreen.style.display = 'flex';
    updatePauseGraphicText();
    DOM.gameWrapper.style.cursor = 'crosshair';
  } else {
    DOM.pauseScreen.classList.add('hidden');
    DOM.gameWrapper.style.cursor = state.isMouseDown ? 'none' : 'crosshair';
  }
}

export function triggerDash() {
  if (state.equippedShipId !== 'phantom' || state.dashCooldown > 0 || !state.gameRunning || state.gamePaused) return;
  state.isDashing = true;
  state.dashTimer = 400; 
  state.dashCooldown = 5000; 
  state.invincibleTimer = 24; 
  const angle = Math.atan2(state.mouseY - state.player.y, state.mouseX - state.player.x);
  state.dashTarget.x = Math.cos(angle);
  state.dashTarget.y = Math.sin(angle);
  spawnExplosion(state.player.x, state.player.y, '0, 255, 170', 15, 1);
}

export function handleInput() {
  let dx = 0, dy = 0;
  let usedKeyboard = false;

  if (state.keys['arrowleft'] || state.keys['a']) { dx -= 1; usedKeyboard = true; }
  if (state.keys['arrowright'] || state.keys['d']) { dx += 1; usedKeyboard = true; }
  if (state.keys['arrowup'] || state.keys['w']) { dy -= 1; usedKeyboard = true; }
  if (state.keys['arrowdown'] || state.keys['s']) { dy += 1; usedKeyboard = true; }

  if (state.isDashing) {
    state.player.x += state.dashTarget.x * 20;
    state.player.y += state.dashTarget.y * 20;
  } else if (usedKeyboard) {
    state.isUsingMouse = false;
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }
    state.player.x += dx * CONFIG.PLAYER_SPEED * state.equippedShip.speedMult;
    state.player.y += dy * CONFIG.PLAYER_SPEED * state.equippedShip.speedMult;
    state.mouseX = state.player.x;
    state.mouseY = state.player.y;
  } else if (state.isUsingMouse) {
    state.player.x += (state.mouseX - state.player.x) * 0.2 * state.equippedShip.speedMult;
    state.player.y += (state.mouseY - state.player.y) * 0.2 * state.equippedShip.speedMult;
  }

  state.player.x = Math.max(30, Math.min(CONFIG.WIDTH - 30, state.player.x));
  state.player.y = Math.max(40, Math.min(CONFIG.HEIGHT - 40, state.player.y));

  if (state.keys['Space'] || state.keys[' '] || state.isMouseDown) {
    spawnBullet();
  }
}

document.addEventListener('keydown', (e) => {
  state.keys[e.key.toLowerCase()] = true;
  state.keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if ((e.key.toLowerCase() === 'p' || e.key === 'Escape') && state.gameRunning) togglePause();
  if (e.key === 'Shift' && state.gameRunning) triggerDash();
  
  if (state.gameRunning && state.gamePaused) {
    if (e.key === '1') applyGraphicsSetting('LOW');
    if (e.key === '2') applyGraphicsSetting('MED');
    if (e.key === '3') applyGraphicsSetting('HIGH');
    updatePauseGraphicText();
  }
});

document.addEventListener('keyup', (e) => {
  state.keys[e.key.toLowerCase()] = false;
  state.keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (!state.gameRunning || state.gamePaused) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  state.mouseX = (e.clientX - rect.left) * scaleX;
  state.mouseY = (e.clientY - rect.top) * scaleY;
  state.isUsingMouse = true;
});

canvas.addEventListener('mousedown', (e) => {
  if (!state.gameRunning || state.gamePaused) return;
  if (e.button === 0) {
    state.isMouseDown = true;
    state.isUsingMouse = true;
    DOM.gameWrapper.style.cursor = 'none';
  } else if (e.button === 2) {
    triggerDash();
  }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    state.isMouseDown = false;
    DOM.gameWrapper.style.cursor = 'crosshair';
  }
});
