import { state } from './state.js';
import { CONFIG } from './config.js';
import { ctx } from './canvas.js';
import { drawHPBar, spawnExplosion, spawnParticle, hexToRgb } from './utils.js';

export const ENEMY_TYPES = [
  { name: 'scout', width: 30, height: 30, hp: 1, score: 100, color1: '#ff4466', color2: '#aa1133', draw: drawEnemyScout },
  { name: 'fighter', width: 36, height: 36, hp: 2, score: 200, color1: '#ff8800', color2: '#aa5500', draw: drawEnemyFighter },
  { name: 'tank', width: 42, height: 42, hp: 4, score: 400, color1: '#cc44ff', color2: '#7700aa', draw: drawEnemyTank },
  { name: 'bomber', width: 38, height: 38, hp: 5, score: 300, color1: '#ff2200', color2: '#aa0000', draw: drawEnemyBomber },
  { name: 'supertank', width: 64, height: 64, hp: 25, score: 1000, color1: '#00ffaa', color2: '#007744', draw: drawEnemySuperTank },
];

export const BOSS_TYPES = [
  { name: 'DREADNOUGHT MK-I', width: 140, height: 80, hp: 250, score: 5000, color1: '#ff0055', color2: '#aa0022', draw: drawBossDreadnought }
];

export function drawEnemyScout(e) {
  const { x, y } = e;
  ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x - 14, y - 10); ctx.lineTo(x - 5, y - 6);
  ctx.lineTo(x, y - 14); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x + 14, y - 10); ctx.closePath();
  const g = ctx.createLinearGradient(x, y - 14, x, y + 14);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,100,120,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 2, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 2, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#ff0033'; ctx.fill();
}

export function drawEnemyFighter(e) {
  const { x, y } = e;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + Math.cos(angle) * 16; const py = y + Math.sin(angle) * 16;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,150,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  
  ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 24, y + 6); ctx.lineTo(x - 14, y + 4); ctx.closePath(); ctx.fillStyle = e.type.color2; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + 24, y + 6); ctx.lineTo(x + 14, y + 4); ctx.closePath(); ctx.fillStyle = e.type.color2; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffdd44'; ctx.fill();
}

export function drawEnemyTank(e) {
  const { x, y } = e;
  ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 20, y); ctx.lineTo(x, y + 20); ctx.lineTo(x - 20, y); ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(200,100,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,200,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#ff88ff'; ctx.fill();
  
  if (e.hp > 1) drawHPBar(x, y - 28, 30, e.hp, e.type.hp);
}

export function drawEnemyBomber(e) {
  const { x, y } = e;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i + e.rotation;
    const r = i % 2 === 0 ? 18 : 10;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#ffbb00'; ctx.lineWidth = 1.5; ctx.stroke();
  
  const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.3;
  ctx.beginPath(); ctx.arc(x, y, 6 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#ffff00'; ctx.fill();
  
  if (e.hp < e.type.hp) drawHPBar(x, y - 24, 26, e.hp, e.type.hp);
}

export function drawEnemySuperTank(e) {
  const { x, y } = e;
  ctx.beginPath();
  for(let i=0; i<8; i++){
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    const r = 32;
    const px = x + Math.cos(angle)*r;
    const py = y + Math.sin(angle)*r;
    if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x,y,0, x,y,32);
  g.addColorStop(0, e.type.color1); g.addColorStop(1, e.type.color2);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#00ffaa'; ctx.stroke();
  
  ctx.beginPath(); ctx.rect(x-14, y-14, 28, 28);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fillStyle = '#00ffaa'; ctx.fill();
  
  drawHPBar(x, y - 42, 50, e.hp, e.type.hp, true);
}

export function drawBossDreadnought(e) {
  const { x, y, phase } = e;
  ctx.save();
  ctx.translate(x, y);
  
  if (phase === 2) {
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
  }
  
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(70, -20); ctx.lineTo(70, 20); ctx.lineTo(30, 40);
  ctx.lineTo(-30, 40); ctx.lineTo(-70, 20); ctx.lineTo(-70, -20); ctx.closePath();
  
  const g = ctx.createLinearGradient(0, -40, 0, 40);
  g.addColorStop(0, phase === 2 ? '#ff0000' : e.type.color1);
  g.addColorStop(1, '#330011');
  ctx.fillStyle = g; ctx.fill();
  
  ctx.strokeStyle = '#ff88aa'; ctx.lineWidth = 3; ctx.stroke();
  
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2);
  ctx.fillStyle = phase === 2 ? '#ff0000' : '#ff0055'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
  
  ctx.restore();
}

export function spawnEnemyType(name, x, y) {
  const type = ENEMY_TYPES.find(t => t.name === name);
  let speed = CONFIG.ENEMY_BASE_SPEED + 0.5;
  state.enemies.push({
    x, y, type, hp: type.hp, speed, pattern: 'straight', phase: 0, amplitude: 0, originX: x, rotation: 0
  });
}

export function spawnEnemy() {
  let typeIndex = 0;
  const diff = state.currentStage * 2 + state.wave; 
  const r = Math.random();
  if (diff >= 7) {
    if (r < 0.1) typeIndex = 4;
    else if (r < 0.25) typeIndex = 3;
    else if (r < 0.5) typeIndex = 2;
    else if (r < 0.75) typeIndex = 1;
    else typeIndex = 0;
  } else if (diff >= 4) {
    if (r < 0.15) typeIndex = 3;
    else if (r < 0.35) typeIndex = 2;
    else if (r < 0.65) typeIndex = 1;
    else typeIndex = 0;
  } else {
    if (r < 0.3) typeIndex = 1;
  }
  
  const type = ENEMY_TYPES[typeIndex];

  const speedMultiplier = 1 + (state.currentStage - 1) * 0.2 + (state.wave - 1) * 0.1;
  let speed = (CONFIG.ENEMY_BASE_SPEED + Math.random() * 0.8) * speedMultiplier;
  
  if (type.name === 'supertank') speed *= 0.45;

  const patterns = ['straight', 'sine', 'zigzag'];
  let pattern = patterns[Math.floor(Math.random() * (diff >= 5 ? 3 : 1))];
  if (type.name === 'supertank') pattern = 'straight';

  state.enemies.push({
    x: Math.random() * (CONFIG.WIDTH - 100) + 50,
    y: -type.height,
    type,
    hp: type.hp,
    speed,
    pattern,
    phase: Math.random() * Math.PI * 2,
    amplitude: 40 + Math.random() * 50,
    originX: 0,
    rotation: 0,
  });
  state.enemies[state.enemies.length - 1].originX = state.enemies[state.enemies.length - 1].x;
}
