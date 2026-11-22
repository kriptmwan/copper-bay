// Copper Bay — bootstrap, input, loop, menus. One clear job: wire everything together.
import { WORLD, CARS, WEAPONS } from './config.js';
import { newGame, update, saveGame, loadGame, enterCar, exitCar, useCrew, rankOf, addMessage } from './world.js';
import { startMission, updateMission, currentMissionDef } from './missions.js';
import { render } from './render.js';
import { AudioEngine } from './audio.js';
import { stageShot } from './shots.js';
import { runSelftest } from './selftest.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 1280, H = 800;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W; canvas.height = H;
}
window.addEventListener('resize', resize);
resize();

const audio = new AudioEngine();
let g = newGame(WORLD.seed);
g.audio = audio;
window.__game = g;

const keys = {};
const input = { up: false, down: false, left: false, right: false, shoot: false, aim: null, run: false, nitro: false, handbrake: false, wheel: false };
let mouse = { x: W / 2, y: H / 2 };
let garageOpen = false;
let mapZoom = false;

function worldAim() {
  const sx = (mouse.x - W / 2) / g.zoom + g.camX;
  const sy = (mouse.y - H / 2) / g.zoom + g.camY;
  return Math.atan2(sy - g.player.y, sx - g.player.x);
}

canvas.addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) input.shoot = true; audio.resume(); });
window.addEventListener('mouseup', (e) => { if (e.button === 0) input.shoot = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function nearestParkedCar() {
  let best = null, bd = 70;
  for (const c of g.cars) {
    if (c.kind !== 'parked' || c.burning) continue;
    const d = Math.hypot(c.x - g.player.x, c.y - g.player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function doInteract() {
  if (!g.player.inCar) {
    const car = nearestParkedCar();
    if (car) {
      enterCar(g, car);
      if (car.missionCar) addMessage(g, 'Stolen! Now lose the heat.', '#ffd54f');
      audio.pickup();
      return;
    }
    // Bank door (m4).
    if (g.mission && g.mission.id === 'm4' && g.mission.stage === 0) { g.interact = true; return; }
    // Garage door.
    if (Math.hypot(g.player.x - g.city.garage.x, g.player.y - g.city.garage.y) < 120) { garageOpen = true; return; }
  } else {
    exitCar(g);
  }
}

function garageKeys(code) {
  // 1-4 select/buy car, U upgrade, Esc close.
  const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
  if (idx >= 0) {
    const car = CARS[idx];
    if (g.ownedCars.includes(car.id)) {
      g.carIdx = idx;
      const p = g.player;
      const nc = { x: g.city.garage.x, y: g.city.garage.y + 120, angle: -Math.PI / 2, speed: 0, hp: car.hp, maxHp: car.hp, kind: 'parked', color: car.color, spec: car, stealable: false, driver: null, id: 990000 + idx };
      g.cars.push(nc);
      addMessage(g, car.name + ' ready at the garage.', '#a5d6a7');
    } else if (g.cash >= car.price) {
      g.cash -= car.price; g.ownedCars.push(car.id); g.carIdx = idx;
      addMessage(g, 'Bought ' + car.name + ' for $' + car.price, '#a5d6a7');
    } else addMessage(g, 'Not enough cash for ' + car.name + ' ($' + car.price + ')', '#ef5350');
    return;
  }
  if (code === 'KeyU') {
    const car = CARS[g.carIdx];
    const lvl = g.carUpgrades[car.id] || 0;
    if (lvl >= 3) { addMessage(g, car.name + ' is maxed out.', '#fff'); return; }
    if (g.cash < 800) { addMessage(g, 'Upgrade costs $800.', '#ef5350'); return; }
    g.cash -= 800; g.carUpgrades[car.id] = lvl + 1;
    addMessage(g, car.name + ' upgraded to level ' + (lvl + 1), '#a5d6a7');
  }
}

window.addEventListener('keydown', (e) => {
  audio.resume();
  if (e.code === 'Enter' && (!g.started || g.over)) {
    g = newGame(WORLD.seed); g.audio = audio; window.__game = g; garageOpen = false;
    g.started = true; return;
  }
  if (e.code === 'KeyC' && !g.started) {
    g.started = true;
    if (loadGame(g)) addMessage(g, 'Save loaded. Welcome back, Vic.', '#a5d6a7');
    return;
  }
  if (!g.started) return;
  keys[e.code] = true;
  if (garageOpen) {
    if (e.code === 'Escape') garageOpen = false;
    else garageKeys(e.code);
    return;
  }
  if (e.code === 'KeyP') { g.paused = !g.paused; return; }
  if (g.paused) return;
  if (e.code === 'KeyE') doInteract();
  if (e.code === 'KeyN') { if (!g.mission) startMission(g); else addMessage(g, 'Finish the current mission first.', '#fff'); }
  if (e.code === 'KeyR') { const st = audio.cycleStation(); addMessage(g, '♪ ' + st.name, '#fff'); }
  if (e.code === 'KeyM') { mapZoom = !mapZoom; g.zoom = mapZoom ? 0.35 : 1; }
  if (e.code === 'KeyF') { saveGame(g); addMessage(g, 'Game saved.', '#a5d6a7'); }
  if (e.code === 'KeyL') { if (loadGame(g)) addMessage(g, 'Save loaded.', '#a5d6a7'); }
  if (e.code === 'KeyG') {
    if (Math.hypot(g.player.x - g.city.garage.x, g.player.y - g.city.garage.y) < 160) garageOpen = true;
    else addMessage(g, 'Go to the garage (★ on the map) to open it.', '#fff');
  }
  if (e.code === 'KeyQ') input.wheel = true;
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= 6) {
      const w = WEAPONS[n - 1];
      if (rankOf(g) >= w.rank) g.player.weapon = n - 1;
      else addMessage(g, w.name + ' unlocks at rank ' + w.rank + '.', '#ef5350');
    }
    if (n === 7) useCrew(g, 'lena');
    if (n === 8) useCrew(g, 'marcus');
    if (n === 9) useCrew(g, 'tessa');
  }
  if (e.code === 'KeyB' && g.mission && g.mission.id === 'm5' && g.mission.stage === 0) {
    const bet = g.cash >= 500 ? 500 : g.cash >= 100 ? 100 : 0;
    if (bet > 0) { g.bet = bet; g.cash -= bet; addMessage(g, 'Bet $' + bet + ' on yourself. Win it back double.', '#ffd54f'); }
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'KeyQ') input.wheel = false;
});

function readInput() {
  input.up = keys.KeyW || keys.ArrowUp;
  input.down = keys.KeyS || keys.ArrowDown;
  input.left = keys.KeyA || keys.ArrowLeft;
  input.right = keys.KeyD || keys.ArrowRight;
  input.run = keys.ShiftLeft || keys.ShiftRight;
  input.nitro = keys.ShiftLeft || keys.ShiftRight;
  input.handbrake = keys.Space;
  input.aim = worldAim();
  if (g._forceWheel) input.wheel = true;
}

function drawGarage() {
  ctx.fillStyle = 'rgba(8,10,24,0.85)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("VIC'S GARAGE", W / 2, 120);
  ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
  ctx.fillText('Cash: $' + Math.floor(g.cash), W / 2, 160);
  CARS.forEach((c, i) => {
    const owned = g.ownedCars.includes(c.id);
    const y = 210 + i * 70;
    ctx.fillStyle = owned ? '#a5d6a7' : '#fff';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText((i + 1) + '. ' + c.name + '  —  Tier ' + c.tier + '  •  top ' + c.top + '  •  HP ' + c.hp + (owned ? '  [OWNED' + (g.carIdx === i ? ' — SELECTED' : '') + ']' : '  [$' + c.price + ']'), W / 2 - 320, y);
    ctx.fillStyle = '#90caf9'; ctx.font = '14px sans-serif';
    ctx.fillText('Upgrade level ' + (g.carUpgrades[c.id] || 0) + '/3 — press U ($800)', W / 2 - 320, y + 22);
  });
  ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('1-4 buy / select   •   U upgrade selected car   •   Esc close', W / 2, 520);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  readInput();
  if (!garageOpen && !g.paused) {
    update(g, dt, input);
    updateMission(g, dt);
    g.interact = false;
    audio.engine(g.player.inCar && Math.abs(g.player.speed) > 10, Math.abs(g.player.speed) / 480);
    audio.radioTick(dt, g.player.inCar);
  }
  render(g, ctx, W, H, input);
  if (garageOpen) drawGarage();
  requestAnimationFrame(frame);
}

// Shot / selftest modes (query params) — used by the build harness only.
const params = new URLSearchParams(location.search);
if (params.get('selftest') === '1') {
  const res = runSelftest();
  window.__selftest = res;
  document.title = 'SELFTEST ' + res.pass + '/' + (res.pass + res.fail);
} else if (params.get('shot')) {
  g.started = true;
  stageShot(g, params.get('shot'));
  window.__shot = params.get('shot');
}
requestAnimationFrame(frame);
