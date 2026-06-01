const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const shieldEl = document.getElementById("shield");
const levelEl = document.getElementById("level");
const distanceEl = document.getElementById("distance");
const missionEl = document.getElementById("mission");
const bestEl = document.getElementById("best");
const toastEl = document.getElementById("toast");
const staminaFill = document.getElementById("stamina-fill");
const overlay = document.getElementById("overlay");
const overlayKicker = overlay.querySelector(".kicker");
const overlayTitle = overlay.querySelector("h1");
const overlayCopy = document.getElementById("overlay-copy");
const resultPanel = document.getElementById("result");
const finalScoreEl = document.getElementById("final-score");
const finalDistanceEl = document.getElementById("final-distance");
const finalBestEl = document.getElementById("final-best");
const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause");
const muteButton = document.getElementById("mute");
const leftButton = document.getElementById("left");
const rightButton = document.getElementById("right");
const upButton = document.getElementById("up");
const downButton = document.getElementById("down");
const boostButton = document.getElementById("boost");
const fireButton = document.getElementById("fire");

const STORAGE_KEY = "orbit-runner-best";
const missions = [
  { text: "Ambil 5 kristal", gems: 5, reward: "Perisai +1" },
  { text: "Tahan combo x5", combo: 5, reward: "Boost penuh" },
  { text: "Capai 900 m", distance: 900, reward: "Magnet aktif" },
  { text: "Ambil 18 kristal", gems: 18, reward: "Slow field" },
  { text: "Capai 1800 m", distance: 1800, reward: "Bonus skor" }
];

const state = {
  running: false,
  paused: false,
  ended: false,
  muted: false,
  width: 960,
  height: 600,
  dpr: 1,
  time: 0,
  last: 0,
  score: 0,
  best: Number(localStorage.getItem(STORAGE_KEY) || 0),
  combo: 1,
  shield: 1,
  level: 1,
  distance: 0,
  gemsCollected: 0,
  missionIndex: 0,
  spawnTimer: 0,
  gemTimer: 0,
  powerTimer: 0,
  droneTimer: 0,
  enemyTimer: 0,
  shake: 0,
  boost: 1,
  boostCooldown: 0,
  slowField: 0,
  magnet: 0,
  toastTimer: 0,
  fireCooldown: 0,
  keys: new Set(),
  hazards: [],
  gems: [],
  powers: [],
  bullets: [],
  enemies: [],
  enemyBullets: [],
  particles: [],
  trails: [],
  stars: []
};

const player = {
  x: 480,
  y: 500,
  vx: 0,
  vy: 0,
  radius: 18,
  invincible: 0,
  tilt: 0,
  tripleShot: 0,
  rapidFire: 0,
  spreadShot: 0,
  piercing: 0
};

let audioContext;
let dragPointerId = null;

function resize() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.floor(rect.width * state.dpr);
  canvas.height = Math.floor(rect.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  player.y = Math.max(player.radius + 70, Math.min(state.height - Math.max(86, state.height * 0.14), player.y));
  player.x = Math.max(player.radius + 10, Math.min(state.width - player.radius - 10, player.x));
  seedStars();
}

function seedStars() {
  const target = Math.floor((state.width * state.height) / 3600);
  while (state.stars.length < target) {
    state.stars.push({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      r: Math.random() * 1.9 + 0.25,
      speed: Math.random() * 34 + 12,
      tone: Math.random()
    });
  }
  state.stars.length = target;
}

function reset() {
  state.running = true;
  state.paused = false;
  state.ended = false;
  state.time = 0;
  state.last = performance.now();
  state.score = 0;
  state.combo = 1;
  state.shield = 1;
  state.level = 1;
  state.distance = 0;
  state.gemsCollected = 0;
  state.missionIndex = 0;
  state.spawnTimer = 0.2;
  state.gemTimer = 0.45;
  state.powerTimer = 4.8;
  state.droneTimer = 10;
  state.shake = 0;
  state.boost = 1;
  state.boostCooldown = 0;
  state.slowField = 0;
  state.magnet = 0;
  state.toastTimer = 0;
  state.fireCooldown = 0;
  state.enemyTimer = 8.5;
  player.tripleShot = 0;
  player.rapidFire = 0;
  player.spreadShot = 0;
  player.piercing = 0;
  state.hazards = [];
  state.gems = [];
  state.powers = [];
  state.bullets = [];
  state.enemies = [];
  state.enemyBullets = [];
  state.particles = [];
  state.trails = [];
  player.x = state.width / 2;
  player.y = state.height - Math.max(86, state.height * 0.14);
  player.vx = 0;
  player.vy = 0;
  player.invincible = 1.35;
  player.tilt = 0;
  pauseButton.textContent = "II";
  overlay.classList.add("hidden");
  resultPanel.hidden = true;
  showToast("Orbit dibuka");
  updateHud();
}

function playTone(freq, duration, type = "sine", gain = 0.04) {
  if (state.muted) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioContext.createOscillator();
  const volume = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  volume.gain.setValueAtTime(gain, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(volume);
  volume.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score).toLocaleString("id-ID");
  comboEl.textContent = `x${state.combo}`;
  shieldEl.textContent = state.shield.toString();
  levelEl.textContent = state.level.toString();
  distanceEl.textContent = `${Math.floor(state.distance)} m`;
  missionEl.textContent = currentMission()?.text || "Survive";
  bestEl.textContent = Math.floor(state.best).toLocaleString("id-ID");
}

function currentMission() {
  return missions[state.missionIndex];
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  state.toastTimer = 2.2;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function difficulty() {
  return 1 + state.time / 38 + state.level * 0.08;
}

function spawnHazard(kind = "rock") {
  const scale = difficulty();
  const size = kind === "drone" ? rand(18, 24) : rand(14, 34);
  state.hazards.push({
    kind,
    x: rand(size, state.width - size),
    y: -size,
    radius: size,
    vy: (kind === "drone" ? rand(95, 130) : rand(120, 210)) * scale,
    vx: kind === "drone" ? rand(-90, 90) : rand(-38, 38),
    spin: rand(-3.4, 3.4),
    angle: rand(0, Math.PI * 2),
    phase: rand(0, Math.PI * 2)
  });
}

function spawnGem() {
  state.gems.push({
    x: rand(26, state.width - 26),
    y: -24,
    radius: 12,
    vy: rand(105, 178) * (1 + state.level * 0.02),
    pulse: rand(0, Math.PI * 2)
  });
}

function spawnPower() {
  const types = ["shield", "magnet", "slow", "triple", "rapid", "spread", "piercing"];
  state.powers.push({
    type: types[Math.floor(rand(0, types.length))],
    x: rand(34, state.width - 34),
    y: -28,
    radius: 16,
    vy: rand(88, 138),
    pulse: 0
  });
}

function spawnEnemy() {
  const scale = difficulty();
  state.enemies.push({
    x: rand(60, state.width - 60),
    y: -30,
    radius: 20,
    vy: rand(80, 140) * scale,
    vx: rand(-60, 60),
    shootTimer: rand(2.5, 4.5),
    health: 3
  });
}

function burst(x, y, color, amount = 12, speed = 160) {
  for (let i = 0; i < amount; i++) {
    state.particles.push({
      x,
      y,
      vx: rand(-speed, speed),
      vy: rand(-speed, speed * 0.7),
      life: rand(0.35, 0.9),
      maxLife: 0.9,
      color,
      radius: rand(2, 5)
    });
  }
}

function enemyShoot(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  const speed = 240;
  state.enemyBullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: 5,
    life: 2.0
  });
  playTone(280, 0.06, "square", 0.015);
}

function shoot() {
  if (state.fireCooldown > 0) return;
  const cooldown = player.rapidFire > 0 ? 0.08 : 0.18;
  state.fireCooldown = cooldown;
  
  const baseSpeed = -720;
  const baseLateral = 18;
  
  const addBullet = (offsetX, angle) => {
    const vx = offsetX + (angle !== 0 ? Math.sin(angle) * 120 : 0);
    const vy = baseSpeed + (angle !== 0 ? Math.cos(angle) * 80 : 0);
    state.bullets.push({
      x: player.x + offsetX,
      y: player.y - 24,
      vx: vx,
      vy: vy,
      radius: player.piercing > 0 ? 5 : 4,
      life: player.piercing > 0 ? 1.5 : 1.1,
      piercing: player.piercing > 0
    });
  };
  
  if (player.tripleShot > 0) {
    // Center bullet
    addBullet(0, 0);
    // Left bullet
    addBullet(-12, -0.3);
    // Right bullet
    addBullet(12, 0.3);
  } else if (player.spreadShot > 0) {
    // Spread shot - 5 bullets
    for (let i = -2; i <= 2; i++) {
      addBullet(i * 8, i * 0.2);
    }
  } else {
    // Normal shot - 2 bullets
    addBullet(-7, 0);
    addBullet(7, 0);
  }
  
  playTone(880, 0.04, "square", 0.018);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function update(dt) {
  if (!state.running || state.paused) return;

  const slowFactor = state.slowField > 0 ? 0.58 : 1;
  state.time += dt;
  state.distance += dt * (70 + state.level * 5);
  state.score += dt * (8 + state.combo * 1.7 + state.level);
  state.level = Math.max(1, Math.floor(state.distance / 420) + 1);
  state.spawnTimer -= dt;
  state.gemTimer -= dt;
  state.powerTimer -= dt;
  state.droneTimer -= dt;
  state.enemyTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 22);
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
  state.boost = Math.min(1, state.boost + dt * 0.18);
  state.slowField = Math.max(0, state.slowField - dt);
  state.magnet = Math.max(0, state.magnet - dt);
  state.toastTimer = Math.max(0, state.toastTimer - dt);
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.tripleShot = Math.max(0, player.tripleShot - dt);
  player.rapidFire = Math.max(0, player.rapidFire - dt);
  player.spreadShot = Math.max(0, player.spreadShot - dt);
  player.piercing = Math.max(0, player.piercing - dt);

  if (state.toastTimer <= 0) toastEl.classList.remove("show");

  const left = state.keys.has("arrowleft") || state.keys.has("a");
  const right = state.keys.has("arrowright") || state.keys.has("d");
  const up = state.keys.has("arrowup") || state.keys.has("w");
  const down = state.keys.has("arrowdown") || state.keys.has("s");
  const boost = state.keys.has(" ") || state.keys.has("shift");
  const firing = state.keys.has("f") || state.keys.has("enter");
  const target = (right ? 1 : 0) - (left ? 1 : 0);
  const verticalTarget = (down ? 1 : 0) - (up ? 1 : 0);
  const boostActive = boost && state.boost > 0.04 && state.boostCooldown <= 0;
  const acceleration = boostActive ? 2450 : 1580;
  const verticalAcceleration = boostActive ? 1900 : 1250;
  const maxSpeed = boostActive ? 720 : 470;
  const maxVerticalSpeed = boostActive ? 540 : 360;
  player.vx += target * acceleration * dt;
  player.vy += verticalTarget * verticalAcceleration * dt;
  player.vx *= Math.pow(boostActive ? 0.008 : 0.0012, dt);
  player.vy *= Math.pow(boostActive ? 0.012 : 0.0018, dt);
  player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  player.vy = Math.max(-maxVerticalSpeed, Math.min(maxVerticalSpeed, player.vy));
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(player.radius + 10, Math.min(state.width - player.radius - 10, player.x));
  player.y = Math.max(player.radius + 72, Math.min(state.height - player.radius - 74, player.y));
  player.tilt += ((player.vx / maxSpeed) - player.tilt) * Math.min(1, dt * 10);

  if (firing) shoot();

  if (boostActive) {
    state.boost = Math.max(0, state.boost - dt * 0.48);
    state.trails.push({ x: player.x, y: player.y + 18, life: 0.28, maxLife: 0.28 });
    if (state.boost <= 0.04) state.boostCooldown = 0.65;
  }

  if (state.spawnTimer <= 0) {
    spawnHazard();
    state.spawnTimer = Math.max(0.16, 0.84 - state.time * 0.008 - state.level * 0.018);
  }
  if (state.droneTimer <= 0) {
    spawnHazard("drone");
    state.droneTimer = rand(6.4, 9.4);
  }
  if (state.gemTimer <= 0) {
    spawnGem();
    state.gemTimer = rand(0.38, 0.78);
  }
  if (state.powerTimer <= 0) {
    spawnPower();
    state.powerTimer = rand(8, 13);
  }
  if (state.enemyTimer <= 0 && state.level >= 10) {
    spawnEnemy();
    state.enemyTimer = rand(5.5, 8.5);
  }

  updateObjects(dt, slowFactor);
  hitHazards();
  hitEnemies();
  hitEnemyBullets();
  collectItems();
  checkMission();
  updateHud();
  updateStamina();
}

function updateObjects(dt, slowFactor) {
  for (const star of state.stars) {
    star.y += star.speed * dt * (0.8 + state.level * 0.03);
    if (star.y > state.height) {
      star.y = -4;
      star.x = Math.random() * state.width;
    }
  }

  for (const hazard of state.hazards) {
    hazard.phase += dt * 2.4;
    hazard.x += (hazard.vx + (hazard.kind === "drone" ? Math.sin(hazard.phase) * 72 : 0)) * dt;
    hazard.y += hazard.vy * dt * slowFactor;
    hazard.angle += hazard.spin * dt;
    if (hazard.x < hazard.radius || hazard.x > state.width - hazard.radius) hazard.vx *= -1;
  }

  for (const gem of state.gems) {
    if (state.magnet > 0) {
      const pull = Math.max(0, 1 - distance(player, gem) / 240);
      gem.x += (player.x - gem.x) * pull * dt * 4.5;
      gem.y += (player.y - gem.y) * pull * dt * 2.8;
    }
    gem.y += gem.vy * dt;
    gem.pulse += dt * 8;
  }

  for (const power of state.powers) {
    power.y += power.vy * dt;
    power.pulse += dt * 7;
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }

  for (const enemy of state.enemies) {
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0) {
      enemyShoot(enemy);
      enemy.shootTimer = rand(2.2, 3.8);
    }
  }

  for (const ebullet of state.enemyBullets) {
    ebullet.x += ebullet.vx * dt;
    ebullet.y += ebullet.vy * dt;
    ebullet.life -= dt;
  }

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 220 * dt;
    particle.life -= dt;
  }

  for (const trail of state.trails) {
    trail.life -= dt;
  }

  state.hazards = state.hazards.filter((item) => item.y < state.height + 90);
  state.gems = state.gems.filter((item) => item.y < state.height + 60);
  state.powers = state.powers.filter((item) => item.y < state.height + 60);
  state.bullets = state.bullets.filter((item) => item.life > 0 && item.y > -30);
  state.enemies = state.enemies.filter((item) => item.y < state.height + 90);
  state.enemyBullets = state.enemyBullets.filter((item) => item.life > 0);
  state.particles = state.particles.filter((item) => item.life > 0);
  state.trails = state.trails.filter((item) => item.life > 0);
}

function hitHazards() {
  for (let b = state.bullets.length - 1; b >= 0; b--) {
    const bullet = state.bullets[b];
    for (let h = state.hazards.length - 1; h >= 0; h--) {
      const hazard = state.hazards[h];
      if (distance(bullet, hazard) < bullet.radius + hazard.radius * 0.82) {
        state.bullets.splice(b, 1);
        state.hazards.splice(h, 1);
        state.score += hazard.kind === "drone" ? 160 : 95;
        state.combo = Math.min(12, state.combo + 1);
        burst(hazard.x, hazard.y, hazard.kind === "drone" ? "#57d9ff" : "#ff6b6b", 18, 190);
        playTone(hazard.kind === "drone" ? 420 : 260, 0.08, "sawtooth", 0.025);
        break;
      }
    }
  }
}

function collectItems() {
  for (let i = state.gems.length - 1; i >= 0; i--) {
    const gem = state.gems[i];
    if (distance(player, gem) < player.radius + gem.radius) {
      state.gems.splice(i, 1);
      state.gemsCollected += 1;
      state.combo = Math.min(12, state.combo + 1);
      state.score += 48 * state.combo;
      burst(gem.x, gem.y, "#ffd166", 16);
      playTone(520 + state.combo * 36, 0.08, "triangle", 0.035);
    }
  }

  for (let i = state.powers.length - 1; i >= 0; i--) {
    const power = state.powers[i];
    if (distance(player, power) < player.radius + power.radius) {
      state.powers.splice(i, 1);
      collectPower(power);
    }
  }

  if (player.invincible > 0) return;
  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const hazard = state.hazards[i];
    if (distance(player, hazard) < player.radius + hazard.radius * 0.82) {
      state.hazards.splice(i, 1);
      state.combo = 1;
      state.shake = 10;
      burst(player.x, player.y, "#ff6b6b", 26, 210);
      playTone(120, 0.2, "sawtooth", 0.045);
      if (state.shield > 0) {
        state.shield -= 1;
        player.invincible = 1.18;
        showToast("Perisai pecah");
      } else {
        endGame();
      }
      return;
    }
  }
}

function hitEnemies() {
  for (let b = state.bullets.length - 1; b >= 0; b--) {
    const bullet = state.bullets[b];
    for (let e = state.enemies.length - 1; e >= 0; e--) {
      const enemy = state.enemies[e];
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        state.bullets.splice(b, 1);
        enemy.health -= 1;
        burst(bullet.x, bullet.y, "#ffd166", 10);
        playTone(620, 0.06, "triangle", 0.02);
        if (enemy.health <= 0) {
          state.enemies.splice(e, 1);
          state.score += 250 + state.combo * 50;
          state.combo = Math.min(12, state.combo + 1);
          burst(enemy.x, enemy.y, "#ff6b6b", 24, 180);
          playTone(320, 0.12, "square", 0.035);
        }
        break;
      }
    }
  }
}

function hitEnemyBullets() {
  if (player.invincible > 0) return;
  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const ebullet = state.enemyBullets[i];
    if (distance(player, ebullet) < player.radius + ebullet.radius) {
      state.enemyBullets.splice(i, 1);
      state.combo = 1;
      state.shake = 8;
      burst(player.x, player.y, "#ff6b6b", 20, 190);
      playTone(140, 0.15, "sawtooth", 0.04);
      if (state.shield > 0) {
        state.shield -= 1;
        player.invincible = 1.18;
        showToast("Perisai pecah!");
      } else {
        endGame();
      }
      return;
    }
  }
}

function updateStamina() {
  staminaFill.style.width = (state.boost * 100) + "%";
}

function collectPower(power) {
  if (power.type === "shield") {
    state.shield = Math.min(4, state.shield + 1);
    showToast("Perisai +1");
    burst(power.x, power.y, "#7ee081", 20);
  }
  if (power.type === "magnet") {
    state.magnet = 7;
    showToast("Magnet aktif");
    burst(power.x, power.y, "#57d9ff", 20);
  }
  if (power.type === "slow") {
    state.slowField = 5.5;
    showToast("Slow field");
    burst(power.x, power.y, "#a78bfa", 20);
  }
  // Skill upgrades
  if (power.type === "triple") {
    player.tripleShot = 12;
    player.spreadShot = 0;
    showToast("Triple Shot!");
    burst(power.x, power.y, "#ffd166", 24, 200);
  }
  if (power.type === "rapid") {
    player.rapidFire = 10;
    showToast("Rapid Fire!");
    burst(power.x, power.y, "#ff8c42", 24, 200);
  }
  if (power.type === "spread") {
    player.spreadShot = 12;
    player.tripleShot = 0;
    showToast("Spread Shot!");
    burst(power.x, power.y, "#ff6b6b", 24, 200);
  }
  if (power.type === "piercing") {
    player.piercing = 8;
    showToast("Piercing Shots!");
    burst(power.x, power.y, "#a78bfa", 24, 200);
  }
  state.score += 165;
  playTone(760, 0.16, "sine", 0.045);
}

function checkMission() {
  const mission = currentMission();
  if (!mission) return;

  const complete =
    (mission.gems && state.gemsCollected >= mission.gems) ||
    (mission.combo && state.combo >= mission.combo) ||
    (mission.distance && state.distance >= mission.distance);

  if (!complete) return;

  state.score += 350 + state.missionIndex * 120;
  if (state.missionIndex === 0) state.shield = Math.min(4, state.shield + 1);
  if (state.missionIndex === 1) state.boost = 1;
  if (state.missionIndex === 2) state.magnet = 8;
  if (state.missionIndex === 3) state.slowField = 6;
  showToast(`Misi selesai: ${mission.reward}`);
  state.missionIndex += 1;
}

function endGame() {
  state.running = false;
  state.ended = true;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem(STORAGE_KEY, String(state.best));
  startButton.textContent = "Main lagi";
  overlayKicker.textContent = "Skor akhir";
  overlayTitle.textContent = Math.floor(state.score).toLocaleString("id-ID");
  overlayCopy.textContent = "Orbit runtuh, tapi rekor masih bisa dikejar.";
  finalScoreEl.textContent = Math.floor(state.score).toLocaleString("id-ID");
  finalDistanceEl.textContent = `${Math.floor(state.distance)} m`;
  finalBestEl.textContent = Math.floor(state.best).toLocaleString("id-ID");
  resultPanel.hidden = false;
  overlay.classList.remove("hidden");
  updateHud();
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "▶" : "II";
  if (state.paused) {
    overlayKicker.textContent = "Jeda";
    overlayTitle.textContent = "Paused";
    overlayCopy.textContent = "Tekan lanjut untuk kembali ke orbit.";
    startButton.textContent = "Lanjut";
    resultPanel.hidden = true;
    overlay.classList.remove("hidden");
  } else {
    state.last = performance.now();
    overlay.classList.add("hidden");
  }
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
  }
  ctx.clearRect(-20, -20, state.width + 40, state.height + 40);
  drawBackground();
  drawTrails();
  drawBullets();
  drawItems();
  drawEnemies();
  drawEnemyBullets();
  drawPlayer();
  drawParticles();
  drawBoostMeter();
  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#0a1020");
  gradient.addColorStop(0.5, "#131b2a");
  gradient.addColorStop(1, "#060810");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(87, 217, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let y = (state.time * 42) % 74; y < state.height; y += 74) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(state.width * 0.28, y + 18, state.width * 0.72, y - 18, state.width, y + 8);
    ctx.stroke();
  }

  const centerX = state.width * 0.5;
  const centerY = state.height * 0.58;
  ctx.strokeStyle = "rgba(255, 209, 102, 0.08)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 160 + i * 92, 58 + i * 32, -0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const star of state.stars) {
    ctx.fillStyle = star.tone > 0.72 ? "rgba(255,209,102,0.85)" : "rgba(247,244,235,0.72)";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.slowField > 0) {
    ctx.fillStyle = "rgba(167, 139, 250, 0.08)";
    ctx.fillRect(0, 0, state.width, state.height);
  }
}

function drawItems() {
  for (const gem of state.gems) {
    const glow = 1 + Math.sin(gem.pulse) * 0.16;
    ctx.save();
    ctx.translate(gem.x, gem.y);
    ctx.rotate(Math.PI / 4 + gem.pulse * 0.08);
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 18;
    ctx.fillRect(-gem.radius * glow, -gem.radius * glow, gem.radius * 2 * glow, gem.radius * 2 * glow);
    ctx.restore();
  }

  for (const power of state.powers) {
    const color = power.type === "shield" ? "#7ee081" : power.type === "magnet" ? "#57d9ff" : "#a78bfa";
    ctx.save();
    ctx.translate(power.x, power.y);
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}33`;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, power.radius + Math.sin(power.pulse) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const hazard of state.hazards) {
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate(hazard.angle);
    if (hazard.kind === "drone") {
      ctx.fillStyle = "#101826";
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-hazard.radius, -hazard.radius * 0.65, hazard.radius * 2, hazard.radius * 1.3, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(-hazard.radius * 0.42, -3, hazard.radius * 0.84, 6);
    } else {
      ctx.fillStyle = "#647182";
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const points = 10;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radius = hazard.radius * (i % 2 ? 0.68 : 1);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTrails() {
  for (const trail of state.trails) {
    const alpha = Math.max(0, trail.life / trail.maxLife);
    ctx.fillStyle = `rgba(87, 217, 255, ${alpha * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(trail.x, trail.y, 15 + alpha * 16, 9 + alpha * 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBullets() {
  ctx.save();
  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 14;
  for (const bullet of state.bullets) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.roundRect(bullet.x - 3, bullet.y - 12, 6, 18, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 209, 102, 0.24)";
    ctx.beginPath();
    ctx.roundRect(bullet.x - 6, bullet.y - 3, 12, 24, 6);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  ctx.save();
  for (const enemy of state.enemies) {
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 18;
    
    // Enemy ship body (red, different design from player)
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 18);
    ctx.lineTo(0, 8);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    
    // Wing accents (orange)
    ctx.fillStyle = "#ff8c42";
    ctx.beginPath();
    ctx.moveTo(-16, 12);
    ctx.lineTo(-22, 16);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 12);
    ctx.lineTo(22, 16);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit (white dot)
    ctx.fillStyle = "#f7f4eb";
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Thruster (different from player)
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.lineTo(0, 26);
    ctx.lineTo(6, 16);
    ctx.closePath();
    ctx.fill();
    
    // Health indicator bar above enemy
    const healthPercent = enemy.health / 3;
    ctx.strokeStyle = enemy.health >= 3 ? "#7ee081" : enemy.health === 2 ? "#ffd166" : "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -28);
    ctx.lineTo(12, -28);
    ctx.stroke();
    
    ctx.strokeStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -28);
    ctx.lineTo(-12 + 24 * healthPercent, -28);
    ctx.stroke();
    
    ctx.translate(-enemy.x, -enemy.y);
  }
  ctx.restore();
}

function drawEnemyBullets() {
  ctx.save();
  ctx.shadowColor = "#ff6b6b";
  ctx.shadowBlur = 10;
  for (const ebullet of state.enemyBullets) {
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(ebullet.x, ebullet.y, ebullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 107, 107, 0.4)";
    ctx.beginPath();
    ctx.arc(ebullet.x, ebullet.y, ebullet.radius + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt * 0.34);
  if (player.invincible > 0) ctx.globalAlpha = 0.58 + Math.sin(state.time * 22) * 0.24;
  ctx.shadowColor = "#57d9ff";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#57d9ff";
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(18, 20);
  ctx.lineTo(0, 12);
  ctx.lineTo(-18, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f7f4eb";
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(-8, 18);
  ctx.lineTo(0, 31 + Math.sin(state.time * 18) * 4);
  ctx.lineTo(8, 18);
  ctx.fill();
  if (state.shield > 0 || player.invincible > 0) {
    ctx.strokeStyle = "rgba(126, 224, 129, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (state.magnet > 0) {
    ctx.strokeStyle = "rgba(87, 217, 255, 0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 84 + Math.sin(state.time * 5) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Skill indicators
  if (player.tripleShot > 0) {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 50 + Math.sin(state.time * 10) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.rapidFire > 0) {
    ctx.strokeStyle = "rgba(255, 140, 66, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 45 + Math.sin(state.time * 12) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.spreadShot > 0) {
    ctx.strokeStyle = "rgba(255, 107, 107, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 55 + Math.sin(state.time * 9) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.piercing > 0) {
    ctx.strokeStyle = "rgba(167, 139, 250, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 40 + Math.sin(state.time * 11) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoostMeter() {
  // Stamina bar handled by HTML element at bottom
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
  state.last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function setTouch(button, key) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    state.keys.add(key);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", () => state.keys.delete(key));
  button.addEventListener("pointercancel", () => state.keys.delete(key));
  button.addEventListener("lostpointercapture", () => state.keys.delete(key));
}

canvas.addEventListener("pointerdown", (event) => {
  dragPointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  moveTowardPointer(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === dragPointerId) moveTowardPointer(event);
});

canvas.addEventListener("pointerup", () => {
  dragPointerId = null;
  state.keys.delete("arrowleft");
  state.keys.delete("arrowright");
  state.keys.delete("arrowup");
  state.keys.delete("arrowdown");
});

canvas.addEventListener("pointercancel", () => {
  dragPointerId = null;
  state.keys.delete("arrowleft");
  state.keys.delete("arrowright");
  state.keys.delete("arrowup");
  state.keys.delete("arrowdown");
});

function moveTowardPointer(event) {
  if (!state.running || state.paused) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  state.keys.delete("arrowleft");
  state.keys.delete("arrowright");
  state.keys.delete("arrowup");
  state.keys.delete("arrowdown");
  if (x < player.x - 18) state.keys.add("arrowleft");
  if (x > player.x + 18) state.keys.add("arrowright");
  if (y < player.y - 18) state.keys.add("arrowup");
  if (y > player.y + 18) state.keys.add("arrowdown");
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", "f", "enter", " ", "shift", "p", "escape"].includes(key)) event.preventDefault();
  if ((key === "p" || key === "escape") && state.running) togglePause();
  if (key === " " && !state.running) reset();
  state.keys.add(key);
});
window.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));

startButton.addEventListener("click", () => {
  startButton.blur();
  if (state.paused) {
    togglePause();
    return;
  }
  overlayKicker.textContent = "Arcade survival";
  overlayTitle.textContent = "Orbit Runner";
  overlayCopy.textContent = "Terbang bebas, tembak meteor, ambil power-up, dan tahan orbit selama mungkin.";
  startButton.textContent = "Mulai";
  reset();
});

pauseButton.addEventListener("click", () => {
  pauseButton.blur();
  togglePause();
});

muteButton.addEventListener("click", () => {
  state.muted = !state.muted;
  muteButton.setAttribute("aria-label", state.muted ? "Nyalakan suara" : "Matikan suara");
  muteButton.textContent = state.muted ? "X" : "♪";
});

setTouch(leftButton, "arrowleft");
setTouch(rightButton, "arrowright");
setTouch(upButton, "arrowup");
setTouch(downButton, "arrowdown");
setTouch(boostButton, " ");
setTouch(fireButton, "f");

bestEl.textContent = Math.floor(state.best).toLocaleString("id-ID");
resize();
updateHud();
requestAnimationFrame((now) => {
  state.last = now;
  draw();
  requestAnimationFrame(loop);
});
