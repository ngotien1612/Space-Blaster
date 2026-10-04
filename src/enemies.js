import { state } from './state.js';
import { CONFIG } from './config.js';
import { ctx } from './canvas.js';
import { drawHPBar, spawnParticle, hexToRgb } from './utils.js';

export const ENEMY_TYPES = [
  { name: 'scout',     width: 30, height: 30, hp: 1,  score: 100,  color1: '#ff4466', color2: '#aa1133', draw: drawEnemyScout },
  { name: 'fighter',   width: 36, height: 36, hp: 2,  score: 200,  color1: '#ff8800', color2: '#aa5500', draw: drawEnemyFighter },
  { name: 'tank',      width: 42, height: 42, hp: 4,  score: 400,  color1: '#cc44ff', color2: '#7700aa', draw: drawEnemyTank },
  { name: 'bomber',    width: 38, height: 38, hp: 5,  score: 300,  color1: '#ff2200', color2: '#770000', draw: drawEnemyBomber },
  { name: 'supertank', width: 64, height: 64, hp: 25, score: 1000, color1: '#00ffaa', color2: '#007744', draw: drawEnemySuperTank },
];

export const BOSS_TYPES = [
  { name: 'DREADNOUGHT MK-I', width: 140, height: 80, hp: 250, score: 5000, color1: '#ff0055', color2: '#aa0022', draw: drawBossDreadnought }
];

// ─── SCOUT ────────────────────────────────────────────────────────────────────
export function drawEnemyScout(e) {
  const { x, y } = e;

  // Engine exhaust
  const exLen = 6 + Math.random() * 5;
  const exGrad = ctx.createLinearGradient(x, y + 10, x, y + 10 + exLen);
  exGrad.addColorStop(0, 'rgba(255,80,80,0.9)');
  exGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(x - 4, y + 10); ctx.lineTo(x, y + 10 + exLen); ctx.lineTo(x + 4, y + 10);
  ctx.fillStyle = exGrad; ctx.fill();

  // Hull
  ctx.beginPath();
  ctx.moveTo(x, y + 14);
  ctx.lineTo(x - 14, y - 8);
  ctx.lineTo(x - 5, y - 4);
  ctx.lineTo(x, y - 14);
  ctx.lineTo(x + 5, y - 4);
  ctx.lineTo(x + 14, y - 8);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - 14, x, y + 14);
  g.addColorStop(0, e.type.color1);
  g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill();

  if (CONFIG.GLOW_ENABLED) {
    ctx.strokeStyle = e.type.color1; ctx.lineWidth = 1; ctx.shadowColor = e.type.color1; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(255,100,120,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Eye core
  ctx.beginPath(); ctx.arc(x, y - 2, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 2, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#ff0033'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 2, 1, 0, Math.PI * 2); ctx.fillStyle = '#ff8888'; ctx.fill();
}

// ─── FIGHTER ──────────────────────────────────────────────────────────────────
export function drawEnemyFighter(e) {
  const { x, y } = e;

  // Thruster glow
  if (CONFIG.GLOW_ENABLED) {
    const glowGrad = ctx.createRadialGradient(x, y + 5, 0, x, y + 5, 22);
    glowGrad.addColorStop(0, 'rgba(255,140,0,0.18)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(x, y + 5, 22, 0, Math.PI * 2); ctx.fill();
  }

  // Hexagonal body
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px2 = x + Math.cos(a) * 17;
    const py2 = y + Math.sin(a) * 17;
    if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 17);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = e.type.color1; ctx.lineWidth = 1.5;
  if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = e.type.color1; ctx.shadowBlur = 8; }
  ctx.stroke(); ctx.shadowBlur = 0;

  // Wing pylons
  ctx.fillStyle = e.type.color2;
  ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.lineTo(x - 28, y + 8); ctx.lineTo(x - 15, y + 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 17, y - 2); ctx.lineTo(x + 28, y + 8); ctx.lineTo(x + 15, y + 5); ctx.closePath(); ctx.fill();

  // Central core
  ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 5.5);
  coreGrad.addColorStop(0, '#fff'); coreGrad.addColorStop(1, '#ffcc00');
  ctx.fillStyle = coreGrad; ctx.fill();
}

// ─── TANK ─────────────────────────────────────────────────────────────────────
export function drawEnemyTank(e) {
  const { x, y } = e;
  const t = Date.now() * 0.002;

  // Aura pulse
  if (CONFIG.GLOW_ENABLED) {
    const pulse = 0.5 + 0.5 * Math.sin(t);
    ctx.beginPath(); ctx.arc(x, y, 26 + pulse * 4, 0, Math.PI * 2);
    const aura = ctx.createRadialGradient(x, y, 8, x, y, 30);
    aura.addColorStop(0, 'rgba(204,68,255,0.0)'); aura.addColorStop(1, `rgba(204,68,255,${0.08 * pulse})`);
    ctx.fillStyle = aura; ctx.fill();
  }

  // Diamond body
  ctx.beginPath();
  ctx.moveTo(x, y - 22); ctx.lineTo(x + 22, y); ctx.lineTo(x, y + 22); ctx.lineTo(x - 22, y);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#dd77ff'; ctx.lineWidth = 2;
  if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 12; }
  ctx.stroke(); ctx.shadowBlur = 0;

  // Inner rotating ring
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 1.5);
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(255,200,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // Core gem
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(x, y, 0, x, y, 5);
  cg.addColorStop(0, '#fff'); cg.addColorStop(1, '#ff88ff');
  ctx.fillStyle = cg; ctx.fill();

  if (e.hp > 1) drawHPBar(x, y - 30, 32, e.hp, e.type.hp);
}

// ─── BOMBER ───────────────────────────────────────────────────────────────────
export function drawEnemyBomber(e) {
  const { x, y } = e;
  const t = Date.now() * 0.008;
  const pulse = 1 + Math.sin(t) * 0.35;

  // Danger aura
  if (CONFIG.GLOW_ENABLED) {
    const aura = ctx.createRadialGradient(x, y, 0, x, y, 28 * pulse);
    aura.addColorStop(0, 'rgba(255,60,0,0.20)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, 28 * pulse, 0, Math.PI * 2); ctx.fill();
  }

  // Star-burst body
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + e.rotation;
    const r = i % 2 === 0 ? 19 : 10;
    const bx = x + Math.cos(a) * r;
    const by = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 19);
  g.addColorStop(0, '#ff4400'); g.addColorStop(1, '#770000');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 1.5; ctx.stroke();

  // Pulsating bomb core
  ctx.beginPath(); ctx.arc(x, y, 7 * pulse, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(x, y, 0, x, y, 7 * pulse);
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.4, '#ffff00'); cg.addColorStop(1, '#ff4400');
  ctx.fillStyle = cg;
  if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 15; }
  ctx.fill(); ctx.shadowBlur = 0;

  if (e.hp < e.type.hp) drawHPBar(x, y - 27, 30, e.hp, e.type.hp);
}

// ─── SUPER TANK ───────────────────────────────────────────────────────────────
export function drawEnemySuperTank(e) {
  const { x, y } = e;
  const t = Date.now() * 0.0015;

  // Massive glow
  if (CONFIG.GLOW_ENABLED) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 55);
    glow.addColorStop(0, 'rgba(0,255,170,0.15)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 55, 0, Math.PI * 2); ctx.fill();
  }

  // Outer octagon
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 8;
    const bx = x + Math.cos(a) * 34;
    const by = y + Math.sin(a) * 34;
    if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
  g.addColorStop(0, '#22ffcc'); g.addColorStop(0.5, '#00aa66'); g.addColorStop(1, '#003322');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 3;
  if (CONFIG.GLOW_ENABLED) { ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 15; }
  ctx.stroke(); ctx.shadowBlur = 0;

  // Rotating inner square
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t);
  ctx.beginPath(); ctx.rect(-15, -15, 30, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  // Rotating outer ring segments
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-t * 0.7);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.arc(0, 0, 34, a, a + Math.PI / 4);
    ctx.strokeStyle = 'rgba(0,255,180,0.6)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();

  // Core
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(x, y, 0, x, y, 8);
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#00ffaa');
  ctx.fillStyle = cg; ctx.fill();

  drawHPBar(x, y - 45, 55, e.hp, e.type.hp, true);
}

// ─── BOSS DREADNOUGHT ─────────────────────────────────────────────────────────
export function drawBossDreadnought(e) {
  const { x, y, phase } = e;
  const t = Date.now() * 0.002;
  ctx.save();
  ctx.translate(x, y);

  const isPhase2 = phase === 2;

  // Ambient engine glow
  if (CONFIG.GLOW_ENABLED) {
    const ambGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
    ambGrad.addColorStop(0, isPhase2 ? 'rgba(255,0,0,0.25)' : 'rgba(255,0,85,0.18)');
    ambGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ambGrad; ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = isPhase2 ? '#ff0000' : '#ff0055';
    ctx.shadowBlur = 25;
  }

  // Side engine exhausts
  for (const [ex, ey] of [[-65, 0], [65, 0]]) {
    const exLen = 20 + Math.random() * 15;
    const exGrad = ctx.createLinearGradient(ex, ey, ex, ey + exLen);
    exGrad.addColorStop(0, 'rgba(255,150,0,0.9)');
    exGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.moveTo(ex - 5, ey + 5); ctx.lineTo(ex, ey + exLen); ctx.lineTo(ex + 5, ey + 5);
    ctx.fillStyle = exGrad; ctx.fill();
  }

  // Main hull
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(72, -20);
  ctx.lineTo(75, 0);
  ctx.lineTo(72, 22);
  ctx.lineTo(30, 42);
  ctx.lineTo(-30, 42);
  ctx.lineTo(-72, 22);
  ctx.lineTo(-75, 0);
  ctx.lineTo(-72, -20);
  ctx.closePath();
  const hullGrad = ctx.createLinearGradient(0, -42, 0, 42);
  hullGrad.addColorStop(0, isPhase2 ? '#ff2200' : '#cc0044');
  hullGrad.addColorStop(0.5, isPhase2 ? '#880000' : '#660022');
  hullGrad.addColorStop(1, '#1a0008');
  ctx.fillStyle = hullGrad; ctx.fill();
  ctx.strokeStyle = isPhase2 ? '#ff4400' : '#ff5588'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;

  // Armor plates / panel lines
  ctx.strokeStyle = `rgba(${isPhase2 ? '255,80,80' : '255,120,150'}, 0.4)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-50, -15); ctx.lineTo(-30, -35); ctx.moveTo(50, -15); ctx.lineTo(30, -35);
  ctx.moveTo(-45, 10); ctx.lineTo(-65, 5); ctx.moveTo(45, 10); ctx.lineTo(65, 5);
  ctx.moveTo(-20, 35); ctx.lineTo(-20, 15); ctx.moveTo(20, 35); ctx.lineTo(20, 15);
  ctx.stroke();

  // Wing tip accent lights
  for (const [lx, ly] of [[-72, 0], [72, 0], [-30, 42], [30, 42]]) {
    const blink = Math.sin(t * 3 + lx) > 0;
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = blink ? (isPhase2 ? '#ff2200' : '#ff0055') : '#440011';
    ctx.fill();
  }

  // Central reactor core — rotating
  ctx.save();
  ctx.rotate(t * 2);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const rx = Math.cos(a) * 12; const ry = Math.sin(a) * 12;
    if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.strokeStyle = isPhase2 ? '#ff4400' : '#ff0055'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  // Inner core glow
  const coreRad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
  coreRad.addColorStop(0, '#ffffff');
  coreRad.addColorStop(0.4, isPhase2 ? '#ff2200' : '#ff0055');
  coreRad.addColorStop(1, isPhase2 ? 'rgba(150,0,0,0.4)' : 'rgba(100,0,40,0.4)');
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = coreRad; ctx.fill();

  // Phase 2 warning ring pulse
  if (isPhase2) {
    const ringPulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.beginPath(); ctx.arc(0, 0, 22 + ringPulse * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,0,0,${0.5 * ringPulse})`;
    ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.restore();
}

// ─── SPAWN HELPERS ────────────────────────────────────────────────────────────
export function spawnEnemyType(name, x, y) {
  const type = ENEMY_TYPES.find(t => t.name === name);
  if (!type) return;
  const speed = CONFIG.ENEMY_BASE_SPEED + 0.5;
  state.enemies.push({
    x, y, type, hp: type.hp, speed,
    pattern: 'straight', phase: 0, amplitude: 0, originX: x, rotation: 0
  });
}

export function spawnEnemy() {
  const diff = state.currentStage * 2 + state.wave;
  const r = Math.random();
  let typeIndex = 0;

  if (diff >= 7) {
    if (r < 0.10) typeIndex = 4;
    else if (r < 0.25) typeIndex = 3;
    else if (r < 0.50) typeIndex = 2;
    else if (r < 0.75) typeIndex = 1;
  } else if (diff >= 4) {
    if (r < 0.15) typeIndex = 3;
    else if (r < 0.35) typeIndex = 2;
    else if (r < 0.65) typeIndex = 1;
  } else {
    if (r < 0.30) typeIndex = 1;
  }

  const type = ENEMY_TYPES[typeIndex];
  const speedMult = 1 + (state.currentStage - 1) * 0.2 + (state.wave - 1) * 0.08;
  let speed = (CONFIG.ENEMY_BASE_SPEED + Math.random() * 0.8) * speedMult;
  if (type.name === 'supertank') speed *= 0.45;

  const patterns = ['straight', 'sine', 'zigzag'];
  let pattern = patterns[Math.floor(Math.random() * (diff >= 5 ? 3 : 2))];
  if (type.name === 'supertank') pattern = 'straight';

  const ex = Math.random() * (CONFIG.WIDTH - 100) + 50;
  state.enemies.push({
    x: ex, y: -type.height,
    type, hp: type.hp, speed,
    pattern, phase: Math.random() * Math.PI * 2,
    amplitude: 40 + Math.random() * 60,
    originX: ex, rotation: 0,
  });
}
