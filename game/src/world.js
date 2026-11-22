// Copper Bay — live simulation. One clear job: player, cars, peds, police, wanted, economy.
import { WORLD, TUNING, WEAPONS, CARS, CREW, RANKS, RANK_XP } from './config.js';
import { mulberry32, rngRange, rngInt, rngPick, clamp, dist, angTo, angDiff } from './random.js';
import { buildCity, districtAt, onRoad, inWater, nearestRoadPoint, roadPoint } from './city.js';

export function newGame(seed) {
  const rng = mulberry32(seed || WORLD.seed);
  const city = buildCity(seed || WORLD.seed);
  const g = {
    rng, city, time: 0, clock: 8 * 3600, raining: false, rainTimer: 30,
    cash: 500, respect: 0, wanted: 0, wantedHeat: 0, lostTimer: 0,
    territory: { portside: false, oldtown: false, downtown: false, boardwalk: false, hills: false },
    ownedCars: ['rust'], carIdx: 0, carUpgrades: { rust: 0 },
    bet: 0, missionIdx: 0, mission: null, missionMsg: '', missionTimer: 0,
    paused: false, over: false, won: false, started: false,
    kills: 0, racesWon: 0, stunts: 0, shotsFired: 0,
    crewCd: { lena: 0, marcus: 0, tessa: 0 }, armorTimer: 0, nitro: 100,
    camX: city.spawn.x, camY: city.spawn.y, zoom: 1,
    player: {
      x: city.spawn.x, y: city.spawn.y, angle: -Math.PI / 2, vx: 0, vy: 0,
      hp: 100, armor: 0, inCar: false, car: null, speed: 0, weapon: 1, ammo: {},
      drift: 0, fireCd: 0, muzzle: 0, dead: false,
    },
    cars: [], peds: [], cops: [], heli: null, swat: [],
    particles: [], pickups: [], bullets: [], wrecks: [], roadblocks: [],
    boats: [], messages: [], stats: { playtestRuns: 0 },
  };
  WEAPONS.forEach((w) => { g.player.ammo[w.id] = w.ammo === Infinity ? Infinity : w.ammo; });
  spawnTraffic(g, TUNING.trafficCount);
  spawnPeds(g, TUNING.pedCount);
  spawnParked(g, TUNING.parkedCount);
  spawnBoats(g, 5);
  return g;
}

function makeCar(g, x, y, angle, kind, spec) {
  const c = { x, y, angle, vx: 0, vy: 0, speed: 0, kind: kind || 'traffic', hp: spec ? spec.hp : 100, maxHp: spec ? spec.hp : 100, color: spec ? spec.color : rngPick(g.rng, ['#b0bec5', '#90a4ae', '#78909c', '#a1887f', '#cfd8dc']), spec: spec || null, target: null, stuck: 0, burning: false, driver: null, id: Math.floor(g.rng() * 1e9) };
  return c;
}

function spawnTraffic(g, n) {
  for (let i = 0; i < n; i++) {
    const p = roadPoint(g.city, g.rng);
    const c = makeCar(g, p.x, p.y, g.rng() * Math.PI * 2, 'traffic');
    c.target = roadPoint(g.city, g.rng);
    g.cars.push(c);
  }
}
function spawnPeds(g, n) {
  for (let i = 0; i < n; i++) {
    const p = roadPoint(g.city, g.rng);
    g.peds.push({ x: p.x + rngRange(g.rng, -30, 30), y: p.y + rngRange(g.rng, -30, 30), angle: g.rng() * Math.PI * 2, speed: rngRange(g.rng, 20, 45), hp: 30, panic: 0, target: null, color: rngPick(g.rng, ['#e57373', '#81c784', '#64b5f6', '#fff176', '#ba68c8', '#4db6ac']) });
  }
}
function spawnParked(g, n) {
  for (let i = 0; i < n; i++) {
    const p = roadPoint(g.city, g.rng);
    const spec = i === 0 ? CARS[2] : rngPick(g.rng, CARS);
    const c = makeCar(g, p.x + rngRange(g.rng, -20, 20), p.y + rngRange(g.rng, -20, 20), rngInt(g.rng, 0, 3) * Math.PI / 2, 'parked', spec);
    c.stealable = true; c.missionCar = i === 0;
    g.cars.push(c);
  }
}
function spawnBoats(g, n) {
  for (let i = 0; i < n; i++) {
    g.boats.push({ x: rngRange(g.rng, 300, WORLD.w - 300), y: rngRange(g.rng, 1850, WORLD.h - 150), angle: g.rng() * Math.PI * 2, speed: rngRange(g.rng, 40, 90), hp: 80, kind: i === 0 ? 'patrol' : 'civil' });
  }
}

export function addMessage(g, text, color) {
  g.messages.push({ text, color: color || '#fff', t: 4 });
  if (g.messages.length > 5) g.messages.shift();
}

export function rankOf(g) {
  let r = 0;
  for (let i = 0; i < RANK_XP.length; i++) if (g.respect >= RANK_XP[i]) r = i;
  return r;
}
export function rankName(g) { return RANKS[rankOf(g)]; }

export function gainRespect(g, n) { g.respect += n; }
export function gainCash(g, n) { g.cash += n; }

export function raiseWanted(g, n) {
  g.wanted = clamp(g.wanted + n, 0, 5);
  g.wantedHeat = 6;
}

export function useCrew(g, id) {
  const crew = CREW.find((c) => c.id === id);
  if (!crew || g.crewCd[id] > 0) return false;
  g.crewCd[id] = crew.cd;
  if (id === 'lena') { g.nitro = 100; g.lostTimer = 8; addMessage(g, 'Lena: "Lose them — I cut the cameras!"', '#81d4fa'); }
  if (id === 'marcus') { g.armorTimer = 10; addMessage(g, 'Marcus: "Nobody touches you. Drive!"', '#ffb74d'); }
  if (id === 'tessa') { g.wanted = Math.max(0, g.wanted - 2); addMessage(g, 'Tessa: "Wanted level scrubbed. You owe me."', '#ce93d8'); }
  return true;
}

export function enterCar(g, car) {
  if (!car || car.kind === 'cop' || car.burning) return false;
  const p = g.player;
  p.inCar = true; p.car = car; car.kind = 'player'; car.driver = p;
  car.hp = Math.max(car.hp, 1);
  return true;
}
export function exitCar(g) {
  const p = g.player;
  if (!p.inCar || !p.car) return;
  const c = p.car;
  p.x = c.x + Math.cos(c.angle + Math.PI / 2) * 40;
  p.y = c.y + Math.sin(c.angle + Math.PI / 2) * 40;
  p.angle = c.angle; p.inCar = false; p.car = null; c.kind = 'parked'; c.driver = null; c.speed = 0;
}

export function explode(g, x, y, radius, dmg) {
  const R = radius || TUNING.explosionRadius;
  for (let i = 0; i < 26; i++) {
    g.particles.push({ kind: 'fire', x: x + rngRange(g.rng, -R / 2, R / 2), y: y + rngRange(g.rng, -R / 2, R / 2), vx: rngRange(g.rng, -60, 60), vy: rngRange(g.rng, -60, 60), t: rngRange(g.rng, 0.4, 0.9), max: 0.9, size: rngRange(g.rng, 8, 22), color: rngPick(g.rng, ['#ff9800', '#ff5722', '#ffc107', '#e64a19']) });
  }
  for (let i = 0; i < 12; i++) {
    g.particles.push({ kind: 'smoke', x, y, vx: rngRange(g.rng, -30, 30), vy: rngRange(g.rng, -50, -10), t: rngRange(g.rng, 1, 2), max: 2, size: rngRange(g.rng, 14, 26), color: '#616161' });
  }
  damageArea(g, x, y, R, dmg || TUNING.explosionDmg, null);
}

function damageArea(g, x, y, R, dmg, src) {
  for (const c of g.cars) {
    if (dist(c.x, c.y, x, y) < R + 20) damageCar(g, c, dmg, src);
  }
  for (const p of g.peds) {
    if (dist(p.x, p.y, x, y) < R) { p.hp -= dmg; if (p.hp <= 0) g.kills++; }
  }
  const pl = g.player;
  if (!pl.inCar && dist(pl.x, pl.y, x, y) < R) hurtPlayer(g, dmg * 0.5);
  if (pl.inCar && pl.car && dist(pl.car.x, pl.car.y, x, y) < R) damageCar(g, pl.car, dmg, src);
}

export function damageCar(g, car, dmg, src) {
  if (car.burning) return;
  car.hp -= dmg;
  if (car.hp <= 0) {
    car.burning = true; car.hp = 0;
    explode(g, car.x, car.y, 70, 60);
    g.wrecks.push({ x: car.x, y: car.y, angle: car.angle, color: car.color, t: 30 });
    if (car.kind === 'player') { exitCar(g); addMessage(g, 'Your car is toast!', '#ef5350'); }
    if (car.kind === 'cop') { g.kills++; raiseWanted(g, 0); }
    car.kind = 'wreck';
  }
}

export function hurtPlayer(g, dmg) {
  if (g.armorTimer > 0) dmg *= 0.25;
  const p = g.player;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, dmg); p.armor -= absorbed; dmg -= absorbed; }
  p.hp -= dmg;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; g.over = true; }
}

function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    if (b.park) continue;
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) {
      const dxl = x - (b.x - r), dxr = (b.x + b.w + r) - x;
      const dyt = y - (b.y - r), dyb = (b.y + b.h + r) - y;
      const m = Math.min(dxl, dxr, dyt, dyb);
      if (m === dxl) return { x: b.x - r, y };
      if (m === dxr) return { x: b.x + b.w + r, y };
      if (m === dyt) return { x, y: b.y - r };
      return { x, y: b.y + b.h + r };
    }
  }
  return null;
}

function updatePlayer(g, dt, input) {
  const p = g.player;
  if (p.dead) return;
  p.fireCd -= dt; p.muzzle = Math.max(0, p.muzzle - dt);
  if (p.inCar && p.car) {
    const car = p.car, spec = car.spec || CARS[0];
    const up = (spec.accel + (g.carUpgrades[spec.id] || 0) * 40) * (1 + (g.carUpgrades[spec.id] || 0) * 0.08);
    const top = spec.top + (g.carUpgrades[spec.id] || 0) * 30;
    const fwd = (g._shotDrift || g._shotChase) ? 1 : (input.up ? 1 : input.down ? -0.6 : 0);
    car.speed += fwd * up * dt;
    car.speed -= car.speed * (input.down ? 1.6 : 0.5) * dt;
    if (Math.abs(car.speed) > top) car.speed = Math.sign(car.speed) * top;
    let steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (g._shotDrift) steer = Math.sin(g.time * 6) * 0.08;
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * spec.grip * 2.4 * dt * dir * clamp(Math.abs(car.speed) / 120, 0, 1);
    // Drift: handbrake drops grip, lays smoke.
    if ((input.handbrake || g._shotDrift) && Math.abs(car.speed) > 150) {
      car.angle += steer * 1.6 * dt * dir;
      p.drift += dt;
      if (g.rng() < 0.7) g.particles.push({ kind: 'smoke', x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, vx: rngRange(g.rng, -20, 20), vy: rngRange(g.rng, -20, 20), t: 0.9, max: 0.9, size: 12, color: '#bdbdbd' });
      if (p.drift > 1.2 && g.stunts < 999) { g.stunts++; gainRespect(g, 5); p.drift = 0; addMessage(g, 'Drift! +5 respect', '#fff176'); }
    }
    if (input.nitro && g.nitro > 0 && Math.abs(car.speed) > 50) {
      car.speed += Math.sign(car.speed) * 260 * dt; g.nitro = Math.max(0, g.nitro - 40 * dt);
    } else g.nitro = Math.min(100, g.nitro + 6 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const hit = collideBuildings(g.city, car.x, car.y, 20);
    if (hit) { if (Math.abs(car.speed) > 220) { damageCar(g, car, 12); g.audio && g.audio.crash(); } car.x = hit.x; car.y = hit.y; car.speed *= -0.3; }
    if (inWater(g.city, car.x, car.y)) { car.x -= Math.cos(car.angle) * car.speed * dt; car.y -= Math.sin(car.angle) * car.speed * dt; car.speed *= 0.5; }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = Math.abs(car.speed);
    // Ram peds / cars.
    for (const ped of g.peds) if (dist(ped.x, ped.y, car.x, car.y) < 26 && Math.abs(car.speed) > 80) { ped.hp = 0; g.kills++; raiseWanted(g, 1); ped.panic = 2; }
    for (const c of g.cars) {
      if (c === car || c.kind === 'wreck') continue;
      if (dist(c.x, c.y, car.x, car.y) < 34) {
        const d = Math.abs(car.speed) > 200 ? 25 : 6;
        damageCar(g, c, d); car.speed *= 0.7;
        if (g.armorTimer > 0) damageCar(g, c, 40);
        if (c.kind === 'cop') raiseWanted(g, 1);
      }
    }
  } else {
    const sp = input.run ? TUNING.playerRun : TUNING.playerWalk;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; p.angle = Math.atan2(my, mx); }
    p.x += mx * sp * dt; p.y += my * sp * dt;
    p.x = clamp(p.x, 20, WORLD.w - 20); p.y = clamp(p.y, 20, WORLD.h - 20);
    const hit = collideBuildings(g.city, p.x, p.y, 12);
    if (hit) { p.x = hit.x; p.y = hit.y; }
    if (inWater(g.city, p.x, p.y)) { p.x -= mx * sp * dt; p.y -= my * sp * dt; }
    if (input.aim) p.angle = input.aim;
    if (input.shoot) shoot(g);
    if (g._shotCombat) {
      const c = g.cops[0];
      if (c) { p.angle = angTo(p.x, p.y, c.x, c.y); if (p.fireCd <= 0) shoot(g); }
    }
    p.speed = len > 0 ? sp : 0;
  }
}

export function shoot(g) {
  const p = g.player;
  const w = WEAPONS[p.weapon];
  if (p.fireCd > 0 || rankOf(g) < w.rank) return;
  if (w.ammo !== Infinity && (p.ammo[w.id] || 0) <= 0) { addMessage(g, w.name + ' is dry — grab ammo', '#ef5350'); p.fireCd = 0.4; return; }
  p.fireCd = w.rate; p.muzzle = 0.06; g.shotsFired++;
  if (w.ammo !== Infinity) p.ammo[w.id]--;
  g.audio && g.audio.shoot(w.id);
  if (w.id === 'fists') {
    for (const ped of g.peds) if (dist(ped.x, ped.y, p.x, p.y) < 50) { ped.hp -= w.dmg; if (ped.hp <= 0) g.kills++; }
    for (const c of g.cops) if (dist(c.x, c.y, p.x, p.y) < 50) { c.hp -= w.dmg; if (c.hp <= 0) { g.kills++; raiseWanted(g, 1); } }
    return;
  }
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const a = p.angle + (g.rng() - 0.5) * w.spread * 2;
    const bx = p.x + Math.cos(a) * 18, by = p.y + Math.sin(a) * 18;
    g.bullets.push({ x: bx, y: by, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, t: w.range / 900, dmg: w.dmg, explosive: !!w.explosive });
  }
  raiseWanted(g, 0); // shooting in public draws heat via heat timer, not stars directly
  g.wantedHeat = Math.max(g.wantedHeat, 3);
}

function updateBullets(g, dt) {
  for (const b of g.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt;
    let dead = b.t <= 0;
    if (collideBuildings(g.city, b.x, b.y, 2)) dead = true;
    if (!dead && b.cop) {
      const pl = g.player;
      if (!pl.inCar && dist(pl.x, pl.y, b.x, b.y) < 14) { hurtPlayer(g, b.dmg); dead = true; }
      else if (pl.inCar && pl.car && dist(pl.car.x, pl.car.y, b.x, b.y) < 22) { damageCar(g, pl.car, b.dmg); dead = true; }
    }
    if (!dead) {
      for (const c of g.cops) {
        if (dist(c.x, c.y, b.x, b.y) < 20) { c.hp -= b.dmg; if (c.hp <= 0) { g.kills++; raiseWanted(g, 1); } dead = true; break; }
      }
    }
    if (!dead) for (const c of g.cars) {
      if (c.kind === 'wreck' || c.kind === 'player') continue;
      if (dist(c.x, c.y, b.x, b.y) < 20) { damageCar(g, c, b.dmg); dead = true; break; }
    }
    if (!dead) for (const p of g.peds) {
      if (p.hp > 0 && dist(p.x, p.y, b.x, b.y) < 12) { p.hp -= b.dmg; if (p.hp <= 0) { g.kills++; raiseWanted(g, 1); } dead = true; break; }
    }
    if (dead && b.explosive) explode(g, b.x, b.y, 80, 100);
    b.dead = dead;
  }
  g.bullets = g.bullets.filter((b) => !b.dead);
}

function updateTraffic(g, dt) {
  for (const c of g.cars) {
    if (c.kind !== 'traffic') continue;
    const d = dist(c.x, c.y, g.player.x, g.player.y);
    if (d > 1400) { const p = roadPoint(g.city, g.rng); c.x = p.x; c.y = p.y; c.target = roadPoint(g.city, g.rng); continue; }
    if (!c.target || dist(c.x, c.y, c.target.x, c.target.y) < 30) c.target = roadPoint(g.city, g.rng);
    const want = angTo(c.x, c.y, c.target.x, c.target.y);
    c.angle += clamp(angDiff(c.angle, want), -1.8 * dt, 1.8 * dt);
    c.speed = 110;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    const hit = collideBuildings(g.city, c.x, c.y, 18);
    if (hit) { c.x = hit.x; c.y = hit.y; c.target = roadPoint(g.city, g.rng); }
  }
}

function updatePeds(g, dt) {
  for (const p of g.peds) {
    if (p.hp <= 0) continue;
    const d = dist(p.x, p.y, g.player.x, g.player.y);
    if (p.panic > 0 || (d < 120 && (g.wanted >= 2 || g.player.muzzle > 0))) p.panic = Math.max(p.panic, 1.5);
    p.panic = Math.max(0, p.panic - dt);
    const sp = p.panic > 0 ? p.speed * 2.4 : p.speed;
    if (!p.target || dist(p.x, p.y, p.target.x, p.target.y) < 20 || g.rng() < 0.002) {
      p.target = p.panic > 0 ? { x: p.x + (g.player.x > p.x ? -300 : 300), y: p.y + (g.player.y > p.y ? -300 : 300) } : roadPoint(g.city, g.rng);
    }
    const a = angTo(p.x, p.y, p.target.x, p.target.y);
    p.angle += clamp(angDiff(p.angle, a), -3 * dt, 3 * dt);
    p.x += Math.cos(p.angle) * sp * dt; p.y += Math.sin(p.angle) * sp * dt;
    const hit = collideBuildings(g.city, p.x, p.y, 8);
    if (hit) { p.x = hit.x; p.y = hit.y; }
    if (d > 1500) { const q = roadPoint(g.city, g.rng); p.x = q.x; p.y = q.y; }
  }
  g.peds = g.peds.filter((p) => p.hp > 0 || g.rng() < 0.999);
}

function updatePolice(g, dt) {
  // Heat: committing crimes raises wanted; quiet time decays it.
  g.wantedHeat = Math.max(0, g.wantedHeat - dt);
  if (g.wantedHeat <= 0 && g.wanted > 0 && g.lostTimer <= 0) {
    g.wanted = Math.max(0, g.wanted - TUNING.wantedDecay * dt);
  }
  g.lostTimer = Math.max(0, g.lostTimer - dt);
  const want = g.lostTimer > 0 ? 0 : Math.ceil(g.wanted);
  // Spawn / despawn cops to match wanted.
  const targetCops = want === 0 ? 0 : want === 1 ? 2 : want === 2 ? 3 : want === 3 ? 4 : want === 4 ? 5 : 6;
  while (g.cops.length < targetCops) {
    const a = g.rng() * Math.PI * 2;
    const x = g.player.x + Math.cos(a) * 600, y = g.player.y + Math.sin(a) * 600;
    const swat = want >= 5 && g.cops.length >= 4;
    g.cops.push({ x: clamp(x, 40, WORLD.w - 40), y: clamp(y, 40, WORLD.h - 40), angle: a, speed: 0, hp: swat ? 220 : 120, kind: swat ? 'swat' : 'cop', shootCd: rngRange(g.rng, 1, 2) });
  }
  while (g.cops.length > targetCops) g.cops.pop();
  for (const c of g.cops) {
    const d = dist(c.x, c.y, g.player.x, g.player.y);
    const wantA = angTo(c.x, c.y, g.player.x, g.player.y);
    c.angle += clamp(angDiff(c.angle, wantA), -2.6 * dt, 2.6 * dt);
    c.speed = Math.min(TUNING.copTop + want * 12, c.speed + TUNING.copAccel * dt);
    c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
    const hit = collideBuildings(g.city, c.x, c.y, 18);
    if (hit) { c.x = hit.x; c.y = hit.y; c.speed *= 0.5; }
    if (d < 26 && g.player.inCar) { damageCar(g, g.player.car, 30 * dt); c.speed *= 0.6; }
    if (d < 22 && !g.player.inCar) { hurtPlayer(g, 14 * dt); c.speed *= 0.5; }
    // Cops shoot when close and player is on foot.
    c.shootCd -= dt;
    if (c.shootCd <= 0 && d < 320 && !g.player.inCar) {
      c.shootCd = 1.4;
      g.bullets.push({ x: c.x, y: c.y, vx: Math.cos(wantA) * 700, vy: Math.sin(wantA) * 700, t: 0.5, dmg: 6, cop: true });
    }
    if (c.hp <= 0) { explode(g, c.x, c.y, 60, 40); }
  }
  g.cops = g.cops.filter((c) => c.hp > 0);
  // Heli at wanted 4+.
  if (want >= 4 && !g.heli) g.heli = { x: g.player.x, y: g.player.y - 200, angle: 0, shootCd: 2 };
  if (want < 4) g.heli = null;
  if (g.heli) {
    g.heli.x += (g.player.x - g.heli.x) * 0.8 * dt;
    g.heli.y += (g.player.y - 200 - g.heli.y) * 0.8 * dt;
    g.heli.shootCd -= dt;
    if (g.heli.shootCd <= 0) { g.heli.shootCd = 2.2; g.audio && g.audio.siren(); }
  }
  // Roadblocks at wanted 3+: parked cop cars ahead of the player on their road.
  if (want >= 3 && g.roadblocks.length < want - 2 && g.player.inCar) {
    const ahead = { x: g.player.x + Math.cos(g.player.angle) * 500, y: g.player.y + Math.sin(g.player.angle) * 500 };
    const rp = nearestRoadPoint(g.city, ahead.x, ahead.y);
    g.roadblocks.push({ x: rp.x, y: rp.y, angle: g.player.angle + Math.PI / 2, hp: 200 });
  }
  if (want < 3) g.roadblocks = [];
  for (const rb of g.roadblocks) {
    if (g.player.inCar && dist(rb.x, rb.y, g.player.car.x, g.player.car.y) < 34) {
      damageCar(g, g.player.car, 40); rb.hp -= 60; g.player.car.speed *= 0.2;
      g.audio && g.audio.crash();
    }
  }
  g.roadblocks = g.roadblocks.filter((rb) => rb.hp > 0);
}

function updateBoats(g, dt) {
  for (const b of g.boats) {
    b.x += Math.cos(b.angle) * b.speed * dt; b.y += Math.sin(b.angle) * b.speed * dt;
    if (b.y > WORLD.h - 100 || b.y < 1800 || b.x < 100 || b.x > WORLD.w - 100) b.angle += Math.PI * 0.7;
    if (b.kind === 'patrol' && g.mission && g.mission.id === 'm6') {
      const d = dist(b.x, b.y, g.player.x, g.player.y);
      if (d < 400) { const a = angTo(b.x, b.y, g.player.x, g.player.y); b.angle += clamp(angDiff(b.angle, a), -1.5 * dt, 1.5 * dt); b.speed = 200; }
    }
  }
}

function updateEconomy(g, dt) {
  // Passive territory income, once per minute per owned district.
  g._incomeTimer = (g._incomeTimer || 0) + dt;
  if (g._incomeTimer >= 60) {
    g._incomeTimer = 0;
    const owned = Object.values(g.territory).filter(Boolean).length;
    if (owned > 0) { const inc = owned * TUNING.territoryIncome; g.cash += inc; addMessage(g, 'Territory income +$' + inc, '#a5d6a7'); }
  }
  for (const k of Object.keys(g.crewCd)) g.crewCd[k] = Math.max(0, g.crewCd[k] - dt);
  g.armorTimer = Math.max(0, g.armorTimer - dt);
  for (const m of g.messages) m.t -= dt;
  g.messages = g.messages.filter((m) => m.t > 0);
  for (const p of g.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  g.particles = g.particles.filter((p) => p.t > 0);
  for (const w of g.wrecks) w.t -= dt;
  g.wrecks = g.wrecks.filter((w) => w.t > 0);
  // Day/night + weather.
  g.time += dt; g.clock = (g.clock + dt * (86400 / TUNING.dayLength)) % 86400;
  g.rainTimer -= dt;
  if (g.rainTimer <= 0) { g.raining = g.rng() < 0.5; g.rainTimer = rngRange(g.rng, 25, 70); }
}

export function update(g, dt, input) {
  if (g.paused || g.over || !g.started) return;
  dt = Math.min(dt, 0.05);
  updatePlayer(g, dt, input);
  updateBullets(g, dt);
  updateTraffic(g, dt);
  updatePeds(g, dt);
  updatePolice(g, dt);
  updateBoats(g, dt);
  updateEconomy(g, dt);
  // Camera follows the player.
  const p = g.player;
  g.camX += (p.x - g.camX) * Math.min(1, dt * 5);
  g.camY += (p.y - g.camY) * Math.min(1, dt * 5);
  if (g.mission) g.missionTimer += dt;
}

export function saveGame(g) {
  const s = { cash: g.cash, respect: g.respect, wanted: g.wanted, missionIdx: g.missionIdx, territory: g.territory, ownedCars: g.ownedCars, carIdx: g.carIdx, carUpgrades: g.carUpgrades, kills: g.kills, x: g.player.x, y: g.player.y, clock: g.clock };
  try { localStorage.setItem('copper-bay-save', JSON.stringify(s)); return true; } catch { return false; }
}
export function loadGame(g) {
  try {
    const s = JSON.parse(localStorage.getItem('copper-bay-save') || 'null');
    if (!s) return false;
    g.cash = s.cash; g.respect = s.respect; g.wanted = s.wanted; g.missionIdx = s.missionIdx;
    g.territory = s.territory; g.ownedCars = s.ownedCars; g.carIdx = s.carIdx; g.carUpgrades = s.carUpgrades;
    g.kills = s.kills || 0; g.player.x = s.x; g.player.y = s.y; g.clock = s.clock;
    return true;
  } catch { return false; }
}
