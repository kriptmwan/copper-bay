// Copper Bay — static city generation. One clear job: roads, blocks, buildings, water.
import { WORLD, DISTRICTS } from './config.js';
import { mulberry32, rngRange, rngInt, rngPick } from './random.js';

const PALETTES = {
  portside: ['#9c7a4a', '#7d6b52', '#b08a5a', '#6e5f45'],
  oldtown: ['#b59a6a', '#a08050', '#c4a878', '#8f7448'],
  downtown: ['#5a6b7d', '#4a5a6b', '#6b7d8f', '#3f4c5c', '#7d8ea0'],
  boardwalk: ['#d9b380', '#c9a06a', '#e0c090', '#b8935e'],
  hills: ['#8a9a6a', '#7a8a5a', '#9aaa7a', '#6a7a4a'],
};

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const roadsV = []; // vertical road center x
  const roadsH = []; // horizontal road center y
  const step = WORLD.block + WORLD.road;
  for (let x = WORLD.road / 2; x < WORLD.w; x += step) roadsV.push(x);
  for (let y = WORLD.road / 2; y < WORLD.h; y += step) roadsH.push(y);

  const buildings = [];
  const water = { x: 0, y: 1750, w: WORLD.w, h: WORLD.h - 1750 }; // harbor bay, south edge
  const docks = [];
  for (let x = 200; x < WORLD.w - 200; x += 420) docks.push({ x, y: 1750, w: 260, h: 120 });

  // Buildings fill each block between roads, skipping the harbor water strip.
  for (let bi = 0; bi < roadsV.length - 1; bi++) {
    for (let bj = 0; bj < roadsH.length - 1; bj++) {
      const x0 = roadsV[bi] + WORLD.road / 2 + 8;
      const y0 = roadsH[bj] + WORLD.road / 2 + 8;
      const x1 = roadsV[bi + 1] - WORLD.road / 2 - 8;
      const y1 = roadsH[bj + 1] - WORLD.road / 2 - 8;
      if (y0 > water.y - 40) continue; // harbor strip stays open
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const d = districtAt(cx, cy);
      const pal = PALETTES[d.id] || PALETTES.downtown;
      const n = rngInt(rng, 1, 3);
      for (let k = 0; k < n; k++) {
        const bw = rngRange(rng, 60, (x1 - x0) / n - 12);
        const bh = rngRange(rng, 60, (y1 - y0) - 16);
        const bx = x0 + (k * (x1 - x0)) / n + 6 + rngRange(rng, 0, 8);
        const by = y0 + 8 + rngRange(rng, 0, 10);
        buildings.push({
          x: bx, y: by, w: Math.min(bw, x1 - bx - 6), h: Math.min(bh, y1 - by - 6),
          color: rngPick(rng, pal), tall: d.id === 'downtown' ? rngRange(rng, 1.6, 2.6) : rngRange(rng, 0.8, 1.3),
          district: d.id, roof: rng() < 0.3,
        });
      }
      // A few parks in Boardwalk / Hills blocks.
      if ((d.id === 'boardwalk' || d.id === 'hills') && rng() < 0.4) {
        buildings.push({ x: x0 + 20, y: y0 + 20, w: 70, h: 60, color: '#5a7d3a', tall: 0.2, district: d.id, park: true });
      }
    }
  }

  const garage = { x: 1560, y: 420, w: 130, h: 90, name: "Vic's Garage" };
  const bank = { x: 2560, y: 300, w: 150, h: 110, name: 'Copper Bank' };
  const spawn = { x: 1560, y: 560, angle: -Math.PI / 2 };
  return { roadsV, roadsH, buildings, water, docks, garage, bank, spawn, seed };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[2];
}

export function onRoad(city, x, y) {
  const r = WORLD.road / 2;
  for (const rx of city.roadsV) if (Math.abs(x - rx) < r) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) < r) return true;
  return false;
}

export function inWater(city, x, y) {
  return x >= city.water.x && x < city.water.x + city.water.w && y >= city.water.y && y < city.water.y + city.water.h;
}

export function nearestRoadPoint(city, x, y) {
  let best = null, bd = 1e9;
  for (const rx of city.roadsV) for (const ry of city.roadsH) {
    const d = Math.hypot(x - rx, y - ry);
    if (d < bd) { bd = d; best = { x: rx, y: ry }; }
  }
  return best;
}

export function roadPoint(city, rng) {
  const rx = city.roadsV[Math.floor(rng() * city.roadsV.length)];
  const ry = city.roadsH[Math.floor(rng() * city.roadsH.length)];
  if (Math.random() < 0.5) return { x: rx + (rng() - 0.5) * 40, y: ry };
  return { x: rx, y: ry + (rng() - 0.5) * 40 };
}
