// Copper Bay — scripted self-test. One clear job: prove the sim works, headlessly.
import { WORLD } from './config.js';
import { newGame, update, saveGame, loadGame, enterCar, useCrew, raiseWanted, explode } from './world.js';
import { startMission, updateMission } from './missions.js';

const IDLE = {};

export function runSelftest() {
  const checks = [];
  const check = (name, fn) => {
    try { const r = fn(); checks.push({ name, pass: !!r, detail: typeof r === 'string' ? r : '' }); }
    catch (e) { checks.push({ name, pass: false, detail: String(e && e.message || e) }); }
  };

  check('city builds (roads, buildings, water)', () => {
    const g = newGame(7);
    return g.city.buildings.length > 100 && g.city.roadsV.length > 5 && g.city.water.h > 500;
  });
  check('player starts on foot with full HP', () => {
    const g = newGame(7);
    return !g.player.inCar && g.player.hp === 100;
  });
  check('enter car + drive moves the player', () => {
    const g = newGame(7); g.started = true;
    const car = g.cars.find((c) => c.kind === 'parked');
    g.player.x = car.x; g.player.y = car.y;
    enterCar(g, car);
    const x0 = g.player.x, y0 = g.player.y;
    for (let i = 0; i < 60; i++) update(g, 1 / 60, { up: true });
    return g.player.inCar && Math.hypot(g.player.x - x0, g.player.y - y0) > 50;
  });
  check('shooting fires bullets', () => {
    const g = newGame(7); g.started = true;
    g.player.weapon = 1;
    const before = g.shotsFired;
    update(g, 0.1, { shoot: true, aim: 0 });
    return g.shotsFired > before && g.bullets.length > 0;
  });
  check('wanted 3 spawns cops', () => {
    const g = newGame(7); g.started = true;
    raiseWanted(g, 3);
    update(g, 0.5, IDLE);
    return g.cops.length >= 3;
  });
  check('mission 1 completes (steal + deliver)', () => {
    const g = newGame(7); g.started = true;
    startMission(g);
    const car = g.cars.find((c) => c.missionCar);
    g.player.x = car.x; g.player.y = car.y;
    enterCar(g, car);
    update(g, 0.05, IDLE); updateMission(g, 0.05);
    const stageOk = g.mission && g.mission.stage === 1;
    g.player.car.x = g.city.garage.x; g.player.car.y = g.city.garage.y + 120;
    update(g, 0.05, IDLE); updateMission(g, 0.05);
    return stageOk && g.missionIdx === 1 && g.cash > 500;
  });
  check('mission 5 race completes via checkpoints', () => {
    const g = newGame(7); g.started = true;
    g.missionIdx = 4; startMission(g);
    for (let i = 0; i < 6; i++) {
      const cp = g.mission.data.checkpoints[g.mission.data.cp];
      g.player.x = cp.x; g.player.y = cp.y;
      updateMission(g, 0.05);
      if (!g.mission && i < 5) return 'ended early at cp ' + i;
    }
    return g.missionIdx === 5;
  });
  check('save/load round-trips cash', () => {
    const g = newGame(7); g.started = true;
    g.cash = 12345; saveGame(g);
    g.cash = 0; loadGame(g);
    return g.cash === 12345;
  });
  check('explosion damages a car', () => {
    const g = newGame(7); g.started = true;
    const car = g.cars.find((c) => c.kind === 'parked');
    const hp0 = car.hp;
    g.player.x = car.x + 500; g.player.y = car.y + 500;
    explode(g, car.x, car.y, 70, 60);
    return car.hp < hp0;
  });
  check('crew Tessa drops wanted by 2', () => {
    const g = newGame(7); g.started = true;
    raiseWanted(g, 4);
    useCrew(g, 'tessa');
    return g.wanted === 2;
  });
  check('pause freezes the clock', () => {
    const g = newGame(7); g.started = true;
    const t0 = g.time;
    g.paused = true; update(g, 1, IDLE);
    return g.time === t0;
  });
  check('5s of driving stays finite (no NaN)', () => {
    const g = newGame(7); g.started = true;
    const car = g.cars.find((c) => c.kind === 'parked');
    g.player.x = car.x; g.player.y = car.y;
    enterCar(g, car);
    for (let i = 0; i < 300; i++) update(g, 1 / 60, { up: true, right: i % 120 < 60 });
    return Number.isFinite(g.player.x) && Number.isFinite(g.player.y) && Number.isFinite(g.player.speed);
  });

  const pass = checks.filter((c) => c.pass).length;
  return { pass, fail: checks.length - pass, checks };
}
