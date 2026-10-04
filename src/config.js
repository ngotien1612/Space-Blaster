export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  PLAYER_SPEED: 6,
  BULLET_SPEED: 6.5,
  BULLET_COOLDOWN: 150,     // ms
  ENEMY_BASE_SPEED: 0.55,
  ENEMY_SPAWN_INTERVAL: 450, // ms
  STAR_COUNT: 250,
  MAX_PARTICLES: 400,
  LIVES: 3,
  GLOW_ENABLED: true,
  NEBULA_ENABLED: true,
};

export const SHIPS = [
  { id: 'vanguard', name: 'TIÊN PHONG', desc: 'Cân bằng. Tốc độ chuẩn. Đạn Plasma.', price: 0, speedMult: 1, baseLives: 3, color: '#00ffff' },
  { id: 'ironclad', name: 'PHÁO ĐÀI', desc: 'Chậm. Máu trâu. Đạn Pháo nổ lan. Hồi lá chắn mỗi 12s.', price: 800, speedMult: 0.85, baseLives: 4, color: '#ffaa00' },
  { id: 'phantom', name: 'SÁT THỦ', desc: 'Máu mỏng. Cực nhanh. Đạn Laser xuyên thấu. Chuột phải/Shift lướt vô địch.', price: 1500, speedMult: 1.3, baseLives: 2, color: '#00ffaa' }
];

export const UPGRADE_COSTS = {
  lives: [200, 500],
  magnet: [100, 200, 400, 800, 1600],
  buff: [150, 300, 600, 1200, 2400]
};
