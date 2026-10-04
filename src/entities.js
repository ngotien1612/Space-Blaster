import { state, saveEconomy } from './state.js';
import { CONFIG, ENEMY_TYPES, BOSS_TYPES } from './config.js';
import { ctx } from './canvas.js';
import { spawnParticle, drawHPBar, spawnFloatingText, hexToRgb, spawnExplosion } from './utils.js';
import { updateScoreDisplay, updateLivesDisplay, DOM } from './ui.js';
import { triggerBossDeath, playerTakeDamage, triggerNuke } from './collisions.js';

export function createBullet(x, y, angle, isDrone = false) {
  const isPhantom = state.equippedShipId === 'phantom';
  const isIronclad = state.equippedShipId === 'ironclad';
  const speed = isPhantom ? 14 : isIronclad ? 8 : CONFIG.BULLET_SPEED;
  
  let typeStr = isPhantom ? 'pierce' : isIronclad ? 'aoe' : 'normal';
  if (isDrone && state.isCryoFusion) {
    typeStr = 'cryo';
  }
  
  let b = {
    x, y,
    width: isPhantom ? 2 : isIronclad ? 8 : 4,
    height: isPhantom ? 30 : isIronclad ? 10 : 16,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    angle, isDrone,
    type: typeStr
  };
  if (b.type === 'pierce') b.hitSet = new Set();
  state.bullets.push(b);
}

export function createAntimatterOrb(x, y) {
  state.antimatterOrbs.push({
    x, y,
    vx: 0,
    vy: -1.5,
    radius: 20,
    life: 180 
  });
}

export function spawnBullet() {
  const now = Date.now();
  const currentCooldown = state.isGatlingFusion ? 30 : (state.rapidFireTimer > 0 ? 30 : CONFIG.BULLET_COOLDOWN);
  if (now - state.lastBulletTime < currentCooldown) return;
  state.lastBulletTime = now;

  const rad = (deg) => deg * Math.PI / 180;
  const px = state.player.x, py = state.player.y - 24;

  if (state.isGatlingFusion) {
     state.gatlingAngle += state.gatlingDir * 0.15;
     if (state.gatlingAngle > 0.5) state.gatlingDir = -1;
     if (state.gatlingAngle < -0.5) state.gatlingDir = 1;
     
     createBullet(px, py, state.gatlingAngle - 0.1);
     createBullet(px, py, state.gatlingAngle);
     createBullet(px, py, state.gatlingAngle + 0.1);
  } else {
    if (state.multiShotLevel === 1) {
      createBullet(px, py, 0);
    } else if (state.multiShotLevel === 2) {
      createBullet(px - 12, py, 0);
      createBullet(px + 12, py, 0);
    } else if (state.multiShotLevel === 3) {
      createBullet(px, py, rad(-15));
      createBullet(px, py, 0);
      createBullet(px, py, rad(15));
    } else if (state.multiShotLevel === 4) {
      createBullet(px, py, rad(-20));
      createBullet(px, py, rad(-7));
      createBullet(px, py, rad(7));
      createBullet(px, py, rad(20));
    } else if (state.multiShotLevel >= 5) {
      createBullet(px, py, rad(-30));
      createBullet(px, py, rad(-15));
      createBullet(px, py, 0);
      createBullet(px, py, rad(15));
      createBullet(px, py, rad(30));
    }
  }
  
  if (state.isAntimatterFusion) {
    state.antimatterShotCounter++;
    if (state.antimatterShotCounter >= 10) {
      state.antimatterShotCounter = 0;
      createAntimatterOrb(px, py);
    }
  }

  if (state.droneLevel === 2) {
    createBullet(state.player.x + 45, state.player.y - 10, 0, true);
  } else if (state.droneLevel >= 3) {
    createBullet(state.player.x - 55, state.player.y + 12, 0, true);
    createBullet(state.player.x + 55, state.player.y + 12, 0, true);
  }

  if (state.currentGraphic !== 'LOW') {
    for (let i = 0; i < 4; i++) {
      spawnParticle(px, py, {
        vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3 - 1,
        life: 10 + Math.random() * 10, size: Math.random() * 3 + 1, color: '0, 255, 255'
      });
    }
  }
}

export function drawDrone(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.65, 0.65);
  
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-14, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(14, 12);
  ctx.closePath();
  
  const g = ctx.createLinearGradient(0, -20, 0, 12);
  if (state.isCryoFusion) {
    g.addColorStop(0, '#00ffff');
    g.addColorStop(1, '#0055aa');
  } else {
    g.addColorStop(0, '#ff00ff');
    g.addColorStop(1, '#5500aa');
  }
  ctx.fillStyle = g;
  ctx.fill();
  
  ctx.strokeStyle = state.isCryoFusion ? '#88ffff' : '#ff88ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  const thrustLen = 8 + Math.random() * 6;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(0, 6 + thrustLen);
  ctx.lineTo(4, 6);
  ctx.fillStyle = state.isCryoFusion ? '#ffffff' : '#00ffff';
  ctx.fill();

  ctx.restore();
}

export function drawPlayer() {
  const px = state.player.x;
  const py = state.player.y;
  const blinkAlpha = state.invincibleTimer > 0 ? (Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3) : 1;

  ctx.save();
  ctx.globalAlpha = blinkAlpha;

  // Thrusters
  state.player.thrusterPhase += 0.2;
  const thrustLen = 14 + Math.sin(state.player.thrusterPhase) * 6 + Math.random() * 4;
  const thrustGrad = ctx.createLinearGradient(px, py + 18, px, py + 18 + thrustLen);
  thrustGrad.addColorStop(0, 'rgba(0, 200, 255, 0.9)');
  thrustGrad.addColorStop(1, 'rgba(0, 50, 255, 0)');

  ctx.beginPath(); ctx.moveTo(px - 8, py + 18); ctx.lineTo(px - 4, py + 18 + thrustLen * 0.9); ctx.lineTo(px, py + 18); ctx.fillStyle = thrustGrad; ctx.fill();
  ctx.beginPath(); ctx.moveTo(px, py + 18); ctx.lineTo(px + 4, py + 18 + thrustLen * 0.9); ctx.lineTo(px + 8, py + 18); ctx.fillStyle = thrustGrad; ctx.fill();

  const cThrustLen = thrustLen * 1.3;
  const cGrad = ctx.createLinearGradient(px, py + 16, px, py + 16 + cThrustLen);
  cGrad.addColorStop(0, 'rgba(100, 255, 255, 0.95)'); cGrad.addColorStop(1, 'rgba(0, 50, 200, 0)');
  ctx.beginPath(); ctx.moveTo(px - 5, py + 16); ctx.lineTo(px, py + 16 + cThrustLen); ctx.lineTo(px + 5, py + 16); ctx.fillStyle = cGrad; ctx.fill();

  // Ship Hull
  ctx.beginPath();
  ctx.moveTo(px, py - 22);
  ctx.lineTo(px - 18, py + 16);
  ctx.lineTo(px - 6, py + 12);
  ctx.lineTo(px, py + 16);
  ctx.lineTo(px + 6, py + 12);
  ctx.lineTo(px + 18, py + 16);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(px, py - 22, px, py + 16);
  bodyGrad.addColorStop(0, '#00e5ff');
  bodyGrad.addColorStop(0.5, '#0077cc');
  bodyGrad.addColorStop(1, '#003366');
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wings
  ctx.fillStyle = '#0055aa';
  ctx.beginPath(); ctx.moveTo(px - 14, py + 6); ctx.lineTo(px - 24, py + 20); ctx.lineTo(px - 16, py + 16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px + 14, py + 6); ctx.lineTo(px + 24, py + 20); ctx.lineTo(px + 16, py + 16); ctx.fill();

  // Cockpit
  ctx.beginPath(); ctx.ellipse(px, py - 6, 4, 7, 0, 0, Math.PI * 2);
  const cockpitGrad = ctx.createRadialGradient(px, py - 8, 0, px, py - 6, 7);
  cockpitGrad.addColorStop(0, 'rgba(0, 255, 255, 0.9)'); cockpitGrad.addColorStop(1, 'rgba(0, 100, 200, 0.3)');
  ctx.fillStyle = cockpitGrad; ctx.fill();

  // Drones
  if (state.droneLevel === 2) {
    drawDrone(px + 45, py);
  } else if (state.droneLevel >= 3) {
    drawDrone(px - 55, py + 22);
    drawDrone(px + 55, py + 22);
  }
  
  if (state.rapidFireTimer > 0) {
    ctx.beginPath();
    ctx.ellipse(px, py + 5, 45 + Math.sin(Date.now() * 0.01) * 3, 50 + Math.cos(Date.now() * 0.01) * 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    if (CONFIG.GLOW_ENABLED) {
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 15;
    }
    ctx.stroke();
  }

  // Ship abilities
  if (state.equippedShipId === 'ironclad' && state.shipShield > 0) {
    ctx.beginPath();
    ctx.arc(px, py + 5, 30, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10; }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  if (state.equippedShipId === 'phantom' && state.dashCooldown > 0) {
    ctx.beginPath();
    ctx.arc(px, py + 5, 25, -Math.PI / 2, -Math.PI / 2 + (state.dashCooldown / 5000) * Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}
