import { state } from './state.js';
import { spawnFloatingText, spawnExplosion, spawnParticle } from './utils.js';
import { updateScoreDisplay, DOM } from './ui.js';
import { triggerNuke } from './collisions.js';
import { CONFIG } from './config.js';
import { ctx } from './canvas.js';

export function spawnPowerUp(x, y) {
  const r = Math.random();
  let type = 'multi';
  if (r < 0.30) type = 'multi';
  else if (r < 0.55) type = 'drone';
  else if (r < 0.75) type = 'rapid';
  else if (r < 0.90) type = 'freeze';
  else type = 'nuke';

  state.powerUps.push({
    x, y,
    type,
    speed: 1.5,
    size: 16,
    phase: 0
  });
}

export function updatePowerUps() {
  const magnetRadius = 60 + state.upgrades.magnet * 40;
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const p = state.powerUps[i];
    
    const distToPlayer = Math.sqrt((state.player.x - p.x)**2 + (state.player.y - p.y)**2);
    if (distToPlayer < magnetRadius) {
      p.x += (state.player.x - p.x) * 0.015;
      p.y += (state.player.y - p.y) * 0.015;
    } else {
      p.y += p.speed;
    }
    
    p.phase += 0.08;

    if (Math.random() < 0.4 && state.currentGraphic !== 'LOW') {
      let colorStr = '255, 230, 0';
      if (p.type === 'drone') colorStr = '0, 255, 136';
      else if (p.type === 'rapid') colorStr = '255, 0, 127';
      else if (p.type === 'freeze') colorStr = '112, 232, 255';
      else if (p.type === 'nuke') colorStr = '255, 55, 0';
      
      spawnParticle(p.x + (Math.random() - 0.5) * 12, p.y + (Math.random() - 0.5) * 12, {
        vx: 0, vy: -0.5, life: 20, size: 1.5, color: colorStr
      });
    }

    const dist = Math.sqrt((state.player.x - p.x)**2 + (state.player.y - p.y)**2);
    if (dist < p.size + 24) {
      if (p.type === 'multi') {
        state.multiShotLevel = Math.min(5, state.multiShotLevel + 1);
        spawnFloatingText(p.x, p.y, "MULTI-SHOT UP!", '#ffe600');
        DOM.multiShotHUDEl.textContent = `LV.${state.multiShotLevel}`;
      } else if (p.type === 'drone') {
        state.droneLevel = Math.min(3, state.droneLevel + 1);
        spawnFloatingText(p.x, p.y, "DRONE UP!", '#00ff88');
        DOM.droneHUDEl.textContent = `LV.${state.droneLevel}`;
      } else if (p.type === 'rapid') {
        if (state.multiShotLevel >= 5 && !state.isGatlingFusion) {
          state.isGatlingFusion = true;
          spawnFloatingText(state.player.x, state.player.y, "⚡ VŨ KHÍ TỐI THƯỢNG ĐÃ TIẾN HÓA! ⚡", '#ffaa00');
          DOM.fusionGatling.classList.remove('hidden');
        } else {
          spawnFloatingText(p.x, p.y, "RAPID FIRE!", '#ff007f');
        }
        state.rapidFireTimer = 4000 + state.upgrades.buff * 600;
      } else if (p.type === 'freeze') {
        if (state.droneLevel >= 3 && !state.isCryoFusion) {
          state.isCryoFusion = true;
          spawnFloatingText(state.player.x, state.player.y, "⚡ VŨ KHÍ TỐI THƯỢNG ĐÃ TIẾN HÓA! ⚡", '#00ffff');
          DOM.fusionCryo.classList.remove('hidden');
        } else {
          spawnFloatingText(p.x, p.y, "FREEZE!", '#70e8ff');
        }
        state.freezeTimer = 4000 + state.upgrades.buff * 600;
      } else if (p.type === 'nuke') {
        if (state.multiShotLevel >= 5 && !state.isAntimatterFusion) {
          state.isAntimatterFusion = true;
          spawnFloatingText(state.player.x, state.player.y, "⚡ VŨ KHÍ TỐI THƯỢNG ĐÃ TIẾN HÓA! ⚡", '#aa00ff');
          DOM.fusionAntimatter.classList.remove('hidden');
        }
        triggerNuke();
      }
      
      state.score += 250;
      updateScoreDisplay();
      
      let explodeColor = '255, 230, 0';
      if (p.type === 'drone') explodeColor = '0, 255, 136';
      else if (p.type === 'rapid') explodeColor = '255, 0, 127';
      else if (p.type === 'freeze') explodeColor = '112, 232, 255';
      else if (p.type === 'nuke') explodeColor = '255, 55, 0';
      
      spawnExplosion(p.x, p.y, explodeColor, 15, 1.2);
      state.powerUps.splice(i, 1);
      continue;
    }

    if (p.y > CONFIG.HEIGHT + 30) state.powerUps.splice(i, 1);
  }
}

export function drawPowerUps() {
  for (const p of state.powerUps) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const phase = p.phase;
    
    if (p.type === 'multi') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 15;
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, phase, 0, Math.PI*2);
      ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, phase + Math.PI/2, 0, Math.PI*2);
      ctx.stroke();
      ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
      ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 1);
    } else if (p.type === 'drone') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15;
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 16, 0, phase, phase + Math.PI);
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 22, 0, -phase*1.2, -phase*1.2 + Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
      ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▲', 0, 1);
    } else if (p.type === 'rapid') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fillStyle = '#ff007f'; ctx.shadowColor = CONFIG.GLOW_ENABLED ? '#ff007f' : 'transparent'; ctx.shadowBlur = CONFIG.GLOW_ENABLED ? 15 : 0;
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 16, 0, phase, phase + Math.PI);
      ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('>>>', 0, 1);
    } else if (p.type === 'freeze') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fillStyle = '#70e8ff'; ctx.shadowColor = '#70e8ff'; ctx.shadowBlur = 15;
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 17, 0, phase, phase + Math.PI);
      ctx.strokeStyle = '#70e8ff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
      ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('❄', 0, 1);
    } else if (p.type === 'nuke') {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fillStyle = '#ff3700'; ctx.shadowColor = '#ff3700'; ctx.shadowBlur = 15;
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 20, 0, 0, Math.PI*2);
      ctx.strokeStyle = '#ff3700'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 12, 0, phase, phase + Math.PI);
      ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.font = 'bold 14px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('☢', 0, 1);
    }
    ctx.restore();
  }
}


