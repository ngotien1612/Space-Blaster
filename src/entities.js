import { state } from './state.js';
import { CONFIG } from './config.js';
import { ctx } from './canvas.js';
import { spawnParticle, drawHPBar, spawnFloatingText, hexToRgb, spawnExplosion } from './utils.js';
import { updateScoreDisplay, updateLivesDisplay, DOM } from './ui.js';
import { triggerBossDeath, playerTakeDamage, triggerNuke } from './collisions.js';

export function createBullet(x, y, angle, isDrone = false) {
  const isPhantom = state.equippedShipId === 'phantom';
  const isIronclad = state.equippedShipId === 'ironclad';
  const speed = isPhantom ? 14 : isIronclad ? 8 : CONFIG.BULLET_SPEED;

  let typeStr = isPhantom ? 'pierce' : isIronclad ? 'aoe' : 'normal';
  if (isDrone && state.isCryoFusion) typeStr = 'cryo';

  const b = {
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
    radius: 22,
    life: 200
  });
}

export function spawnBullet() {
  const now = Date.now();
  const currentCooldown = state.isGatlingFusion ? 28 : (state.rapidFireTimer > 0 ? 28 : CONFIG.BULLET_COOLDOWN);
  if (now - state.lastBulletTime < currentCooldown) return;
  state.lastBulletTime = now;

  const rad = (deg) => deg * Math.PI / 180;
  const px = state.player.x, py = state.player.y - 24;

  if (state.isGatlingFusion) {
    state.gatlingAngle += state.gatlingDir * 0.12;
    if (state.gatlingAngle > 0.55) state.gatlingDir = -1;
    if (state.gatlingAngle < -0.55) state.gatlingDir = 1;
    createBullet(px, py, state.gatlingAngle - 0.12);
    createBullet(px, py, state.gatlingAngle);
    createBullet(px, py, state.gatlingAngle + 0.12);
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
    createBullet(state.player.x + 48, state.player.y - 8, 0, true);
  } else if (state.droneLevel >= 3) {
    createBullet(state.player.x - 58, state.player.y + 14, 0, true);
    createBullet(state.player.x + 58, state.player.y + 14, 0, true);
  }

  if (state.currentGraphic !== 'LOW') {
    for (let i = 0; i < 3; i++) {
      spawnParticle(px, py, {
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2.5 - 0.5,
        life: 8 + Math.random() * 8,
        size: Math.random() * 2.5 + 0.8,
        color: '0, 230, 255'
      });
    }
  }
}

export function drawDrone(x, y) {
  ctx.save();
  ctx.translate(x, y);

  const isCryo = state.isCryoFusion;
  const mainColor = isCryo ? '#00ffff' : '#dd00ff';
  const darkColor = isCryo ? '#003366' : '#330066';
  const accentColor = isCryo ? '#88ffff' : '#ff88ff';

  // Engine glow
  if (CONFIG.GLOW_ENABLED) {
    ctx.beginPath();
    ctx.arc(0, 4, 14, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(0, 4, 0, 0, 4, 14);
    glowGrad.addColorStop(0, isCryo ? 'rgba(0,200,255,0.25)' : 'rgba(200,0,255,0.25)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fill();
  }

  ctx.scale(0.7, 0.7);

  // Hull
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-13, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(13, 10);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -20, 0, 10);
  g.addColorStop(0, mainColor);
  g.addColorStop(1, darkColor);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cockpit gem
  ctx.beginPath();
  ctx.ellipse(0, -6, 3, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Thruster flame
  const thrustLen = 8 + Math.random() * 8;
  const tfGrad = ctx.createLinearGradient(0, 8, 0, 8 + thrustLen);
  tfGrad.addColorStop(0, isCryo ? 'rgba(255,255,255,0.95)' : 'rgba(0,255,255,0.95)');
  tfGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(-4, 8);
  ctx.lineTo(0, 8 + thrustLen);
  ctx.lineTo(4, 8);
  ctx.fillStyle = tfGrad;
  ctx.fill();

  ctx.restore();
}

export function drawPlayer() {
  const px = state.player.x;
  const py = state.player.y;
  const now = Date.now();
  const blinkAlpha = state.invincibleTimer > 0 ? (Math.sin(now * 0.025) > 0 ? 1 : 0.25) : 1;

  ctx.save();
  ctx.globalAlpha = blinkAlpha;

  // Ship-type-specific color scheme
  const isIronclad = state.equippedShipId === 'ironclad';
  const isPhantom = state.equippedShipId === 'phantom';
  const hullTop = isIronclad ? '#ffcc44' : isPhantom ? '#00ffcc' : '#00e5ff';
  const hullMid = isIronclad ? '#cc7700' : isPhantom ? '#007755' : '#0077cc';
  const hullBot = isIronclad ? '#663300' : isPhantom ? '#003322' : '#003366';
  const glowColor = isIronclad ? '#ffaa00' : isPhantom ? '#00ffaa' : '#00ffff';

  // Engine glow aura
  if (CONFIG.GLOW_ENABLED) {
    const auraGrad = ctx.createRadialGradient(px, py + 10, 0, px, py + 10, 55);
    auraGrad.addColorStop(0, `rgba(${hexToRgb(glowColor)}, 0.12)`);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(px, py + 10, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thruster flames
  state.player.thrusterPhase += 0.22;
  const thrustT = state.player.thrusterPhase;
  const thrustLen = 16 + Math.sin(thrustT) * 7 + Math.random() * 5;
  const cThrustLen = thrustLen * 1.45;

  // Side thrusters
  for (const [ox, ow] of [[-7, 5], [2, 5]]) {
    const tg = ctx.createLinearGradient(px + ox, py + 18, px + ox, py + 18 + thrustLen);
    tg.addColorStop(0, isIronclad ? 'rgba(255,200,50,0.9)' : 'rgba(0,200,255,0.9)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(px + ox, py + 18);
    ctx.lineTo(px + ox + ow * 0.4, py + 18 + thrustLen);
    ctx.lineTo(px + ox + ow, py + 18);
    ctx.fillStyle = tg;
    ctx.fill();
  }

  // Center thruster
  const cg = ctx.createLinearGradient(px, py + 16, px, py + 16 + cThrustLen);
  cg.addColorStop(0, isPhantom ? 'rgba(0,255,200,0.95)' : 'rgba(120,255,255,0.95)');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(px - 5, py + 16);
  ctx.lineTo(px, py + 16 + cThrustLen);
  ctx.lineTo(px + 5, py + 16);
  ctx.fillStyle = cg;
  ctx.fill();

  // Wing extensions
  ctx.fillStyle = hullBot;
  ctx.beginPath();
  ctx.moveTo(px - 15, py + 8);
  ctx.lineTo(px - 28, py + 22);
  ctx.lineTo(px - 18, py + 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + 15, py + 8);
  ctx.lineTo(px + 28, py + 22);
  ctx.lineTo(px + 18, py + 18);
  ctx.closePath();
  ctx.fill();

  // Main hull
  ctx.beginPath();
  ctx.moveTo(px, py - 24);
  ctx.lineTo(px - 19, py + 16);
  ctx.lineTo(px - 7, py + 12);
  ctx.lineTo(px, py + 17);
  ctx.lineTo(px + 7, py + 12);
  ctx.lineTo(px + 19, py + 16);
  ctx.closePath();
  const bodyGrad = ctx.createLinearGradient(px, py - 24, px, py + 17);
  bodyGrad.addColorStop(0, hullTop);
  bodyGrad.addColorStop(0.5, hullMid);
  bodyGrad.addColorStop(1, hullBot);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Hull edge glow stroke
  if (CONFIG.GLOW_ENABLED) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = `rgba(${hexToRgb(glowColor)}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Center spine line
  ctx.beginPath();
  ctx.moveTo(px, py - 20);
  ctx.lineTo(px, py + 14);
  ctx.strokeStyle = `rgba(${hexToRgb(glowColor)}, 0.35)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(px, py - 8, 4.5, 8, 0, 0, Math.PI * 2);
  const ckGrad = ctx.createRadialGradient(px - 1, py - 11, 0, px, py - 8, 8);
  ckGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  ckGrad.addColorStop(0.4, `rgba(${hexToRgb(glowColor)}, 0.7)`);
  ckGrad.addColorStop(1, `rgba(${hexToRgb(hullMid)}, 0.2)`);
  ctx.fillStyle = ckGrad;
  ctx.fill();

  // Weapon intake vents
  ctx.fillStyle = `rgba(${hexToRgb(glowColor)}, 0.6)`;
  ctx.fillRect(px - 8, py + 2, 4, 6);
  ctx.fillRect(px + 4, py + 2, 4, 6);

  // Drones
  if (state.droneLevel === 2) {
    drawDrone(px + 52, py + 2);
  } else if (state.droneLevel >= 3) {
    drawDrone(px - 62, py + 22);
    drawDrone(px + 62, py + 22);
  }

  // Rapid fire aura ring
  if (state.rapidFireTimer > 0) {
    const t = now * 0.008;
    ctx.beginPath();
    ctx.ellipse(px, py + 5, 48 + Math.sin(t) * 4, 52 + Math.cos(t) * 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#ff007f'; ctx.shadowBlur = 15; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Second inner ring
    ctx.beginPath();
    ctx.ellipse(px, py + 5, 38 + Math.cos(t * 1.3) * 3, 42 + Math.sin(t * 1.3) * 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,0,127,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Ironclad shield
  if (isIronclad && state.shipShield > 0) {
    const shieldPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
    ctx.beginPath();
    ctx.arc(px, py + 2, 35, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,170,0,${0.6 + shieldPulse * 0.4})`;
    ctx.lineWidth = 2;
    if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 18; }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,170,0,${0.06 + shieldPulse * 0.06})`;
    ctx.fill();

    // Hexagonal segments on shield
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + now * 0.001;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * 35, py + 2 + Math.sin(a) * 35, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,200,50,0.5)';
      ctx.fill();
    }
  }

  // Phantom dash cooldown arc
  if (isPhantom && state.dashCooldown > 0) {
    const ratio = state.dashCooldown / 5000;
    ctx.beginPath();
    ctx.arc(px, py + 2, 28, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,255,170,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}
