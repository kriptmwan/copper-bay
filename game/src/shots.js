// Copper Bay — screenshot staging. One clear job: deterministic live scenes for the 4 shots.
import { CARS } from './config.js';
import { raiseWanted, enterCar, explode } from './world.js';
import { startMission } from './missions.js';

function putInCar(g, specId, x, y, angle, speed) {
  const spec = CARS.find((c) => c.id === specId);
  const car = { x, y, angle, vx: 0, vy: 0, speed, hp: spec.hp, maxHp: spec.hp, kind: 'parked', color: spec.color, spec, stealable: false, driver: null, id: 980000 + Math.floor(Math.random() * 1000) };
  g.cars.push(car);
  g.player.x = x; g.player.y = y;
  enterCar(g, car);
  return car;
}

export function stageShot(g, name) {
  const p = g.player;
  if (name === 'chase') {
    // Cross-district high-speed chase at dusk: wanted 4, heli, roadblocks, GPS line.
    g.clock = 17.5 * 3600; g.raining = false; g.rainTimer = 60;
    putInCar(g, 'sport', 300, g.city.roadsH[2], 0, 350);
    g._shotChase = true;
    g.missionIdx = 5; startMission(g); // Harbor Run: far target, GPS line across the city
    raiseWanted(g, 4);
    g.camX = p.x; g.camY = p.y; g.zoom = 1;
  } else if (name === 'drift') {
    // Boardwalk corner drift, midday sun: tire smoke + fleeing pedestrian.
    g.clock = 12 * 3600; g.raining = false; g.rainTimer = 60;
    putInCar(g, 'sport', 500, g.city.roadsH[4], 0, 170);
    g._shotDrift = true;
    const ped = g.peds[0];
    if (ped) { ped.x = p.x + 200; ped.y = p.y + 25; ped.panic = 3; }
    g.camX = p.x; g.camY = p.y; g.zoom = 1;
  } else if (name === 'combat') {
    // Night rain firefight: weapon wheel open, muzzle flash, explosion, burning car.
    g.clock = 22 * 3600; g.raining = true; g.rainTimer = 60;
    g.respect = 1400; // rank 3: rifle unlocked
    p.weapon = 4;
    p.x = 2400; p.y = 400; p.angle = 0;
    g._forceWheel = true; g._shotCombat = true;
    raiseWanted(g, 3);
    const car = { x: p.x + 140, y: p.y - 60, angle: 0.4, vx: 0, vy: 0, speed: 0, hp: 0, maxHp: 100, kind: 'wreck', color: '#ef6c00', spec: CARS[2], stealable: false, driver: null, id: 980001, burning: true };
    g.cars.push(car);
    g.wrecks.push({ x: car.x, y: car.y, angle: car.angle, color: car.color, t: 30 });
    explode(g, p.x + 120, p.y + 40, 70, 40);
    g.camX = p.x; g.camY = p.y; g.zoom = 1;
  } else if (name === 'world') {
    // Zoomed-out live city: all 5 districts, water, roads, traffic, GPS route.
    g.clock = 10 * 3600; g.raining = false; g.rainTimer = 60;
    putInCar(g, 'sedan', 1700, g.city.roadsH[3], 0, 220);
    g._shotChase = true;
    g.missionIdx = 5; startMission(g);
    raiseWanted(g, 1);
    g.zoom = 0.35; g.camX = p.x; g.camY = p.y;
  }
}
