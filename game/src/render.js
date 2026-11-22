// Copper Bay — canvas rendering. One clear job: draw the world, HUD and screens.
import { WORLD, DISTRICTS, WEAPONS, RADIO, TUNING, MISSIONS } from './config.js';
import { clamp, dist } from './random.js';
import { districtAt } from './city.js';
import { rankName } from './world.js';

function nightAlpha(clock) {
  const h = (clock / 3600) % 24;
  const day = clamp(Math.sin(((h - 6) / 12) * Math.PI), 0, 1);
  return (1 - day) * 0.5;
}
function clockStr(clock) {
  const h = Math.floor((clock / 3600) % 24), m = Math.floor((clock / 60) % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function drawCar(ctx, x, y, angle, color, opts) {
  const o = opts || {};
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-22 + 4, -11 + 5, 44, 22);
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-16, -13, 10, 5); ctx.fillRect(-16, 8, 10, 5);
  ctx.fillRect(8, -13, 10, 5); ctx.fillRect(8, 8, 10, 5);
  // body
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-22, -11, 44, 22, 6); ctx.fill();
  // windshield + roof
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(6, -8, 6, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-6, -8, 12, 16);
  if (o.police) {
    ctx.fillStyle = '#fff'; ctx.fillRect(-22, -11, 12, 22);
    ctx.fillStyle = o.flash ? '#f44336' : '#2196f3';
    ctx.fillRect(-4, -4, 6, 8);
    ctx.fillStyle = '#111'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PD', -16, 3);
  }
  if (o.swat) { ctx.fillStyle = '#37474f'; ctx.fillRect(-22, -11, 44, 22); ctx.fillStyle = '#eceff1'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SWAT', 0, 3); }
  if (o.burning) { ctx.fillStyle = 'rgba(255,87,34,0.8)'; ctx.beginPath(); ctx.arc(-6, 0, 8 + Math.random() * 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawPed(ctx, x, y, angle, color, panic) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3, 3.5, 0, Math.PI * 2); ctx.fill();
  if (panic > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -12); }
  ctx.restore();
}

function drawMinimap(ctx, g, x, y, size) {
  const s = size / WORLD.w;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.85)';
  ctx.beginPath(); ctx.roundRect(x - 6, y - 6, size + 12, size + 12, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
  // districts
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.id === 'harbor' ? '#1d4e63' : d.accent + '55';
    ctx.fillRect(x + d.x * s, y + d.y * s, d.w * s, d.h * s);
  }
  // roads
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  for (const rx of g.city.roadsV) { ctx.beginPath(); ctx.moveTo(x + rx * s, y); ctx.lineTo(x + rx * s, y + size); ctx.stroke(); }
  for (const ry of g.city.roadsH) { ctx.beginPath(); ctx.moveTo(x, y + ry * s); ctx.lineTo(x + size, y + ry * s); ctx.stroke(); }
  // GPS route: straight line player -> target
  if (g.mission && g.mission.target) {
    const t = g.mission.target;
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x + g.player.x * s, y + g.player.y * s); ctx.lineTo(x + t.x * s, y + t.y * s); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(x + t.x * s, y + t.y * s, 4, 0, Math.PI * 2); ctx.fill();
  }
  // territory
  for (const d of DISTRICTS) {
    if (g.territory[d.id]) { ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', x + (d.x + d.w / 2) * s, y + (d.y + d.h / 2) * s); }
  }
  // cops
  ctx.fillStyle = '#ef5350';
  for (const c of g.cops) { ctx.beginPath(); ctx.arc(x + c.x * s, y + c.y * s, 2.5, 0, Math.PI * 2); ctx.fill(); }
  // player arrow
  ctx.save(); ctx.translate(x + g.player.x * s, y + g.player.y * s); ctx.rotate(g.player.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function render(g, ctx, W, H, input) {
  const cam = { x: g.camX, y: g.camY, z: g.zoom };
  const vw = W / cam.z, vh = H / cam.z;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.scale(cam.z, cam.z);
  ctx.translate(W / (2 * cam.z) - cam.x, H / (2 * cam.z) - cam.y);
  const x0 = cam.x - vw / 2 - 60, y0 = cam.y - vh / 2 - 60, x1 = cam.x + vw / 2 + 60, y1 = cam.y + vh / 2 + 60;

  // Ground by district.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.id === 'harbor' ? '#1d4e63' : d.ground;
    ctx.fillRect(Math.max(d.x, x0), Math.max(d.y, y0), Math.min(d.x + d.w, x1) - Math.max(d.x, x0), Math.min(d.y + d.h, y1) - Math.max(d.y, y0));
  }
  // Water shimmer.
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const wy = 1800 + i * 90 + Math.sin(g.time * 0.7 + i) * 6;
    ctx.beginPath(); ctx.moveTo(x0, wy); ctx.lineTo(x1, wy + Math.sin(i * 2) * 10); ctx.stroke();
  }
  // Docks.
  ctx.fillStyle = '#6d4c41';
  for (const d of g.city.docks) ctx.fillRect(d.x, d.y - 30, d.w, d.h);
  ctx.fillStyle = '#8d6e63';
  for (const d of g.city.docks) for (let px = d.x + 10; px < d.x + d.w; px += 30) ctx.fillRect(px, d.y - 30, 4, d.h);

  // Roads.
  ctx.fillStyle = '#3a3a3a';
  for (const rx of g.city.roadsV) ctx.fillRect(rx - WORLD.road / 2, y0, WORLD.road, y1 - y0);
  for (const ry of g.city.roadsH) ctx.fillRect(x0, ry - WORLD.road / 2, x1 - x0, WORLD.road);
  // Road markings.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([18, 22]);
  for (const rx of g.city.roadsV) { ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y1); ctx.stroke(); }
  for (const ry of g.city.roadsH) { ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke(); }
  ctx.setLineDash([]);
  // District labels on the ground.
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    if (d.id === 'harbor') continue;
    if (d.x + d.w < x0 || d.x > x1 || d.y + d.h < y0 || d.y > y1) continue;
    ctx.fillText(d.label, d.x + d.w / 2, d.y + d.h / 2);
  }
  // Garage + bank markers.
  ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("★ GARAGE", g.city.garage.x, g.city.garage.y - 12);
  ctx.fillStyle = '#90caf9'; ctx.fillText('⬢ BANK', g.city.bank.x + 75, g.city.bank.y - 12);

  // Buildings.
  for (const b of g.city.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    if (b.park) {
      ctx.fillStyle = '#5a7d3a'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(b.x + 20, b.y + 20, 10, 0, Math.PI * 2); ctx.arc(b.x + 50, b.y + 40, 12, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 8 * b.tall, b.y + 10 * b.tall, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(b.x, b.y, b.w, 6);
    if (b.roof) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(b.x + b.w / 3, b.y + b.h / 3, b.w / 3, b.h / 3); }
  }
  // Wrecks.
  for (const w of g.wrecks) drawCar(ctx, w.x, w.y, w.angle, '#424242', { burning: true });

  // Mission target beacon.
  if (g.mission && g.mission.target) {
    const t = g.mission.target;
    const pulse = 1 + Math.sin(g.time * 4) * 0.15;
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(t.x, t.y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▼', t.x, t.y - 34);
  }
  // Roadblocks.
  for (const rb of g.roadblocks) drawCar(ctx, rb.x, rb.y, rb.angle, '#eceff1', { police: true, flash: Math.floor(g.time * 4) % 2 === 0 });
  // Boats.
  for (const b of g.boats) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    ctx.fillStyle = b.kind === 'patrol' ? '#1565c0' : '#eceff1';
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37474f'; ctx.fillRect(-8, -5, 16, 10);
    ctx.restore();
  }
  // Cars.
  for (const c of g.cars) {
    if (c.kind === 'wreck') continue;
    if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
    if (c.kind === 'courier') drawCar(ctx, c.x, c.y, c.angle, '#7e57c2', {});
    else if (c.kind === 'van') drawCar(ctx, c.x, c.y, c.angle, '#546e7a', {});
    else if (c.kind === 'rival') drawCar(ctx, c.x, c.y, c.angle, c.color, {});
    else if (c.kind === 'kane') drawCar(ctx, c.x, c.y, c.angle, '#212121', {});
    else if (c.kind === 'player') drawCar(ctx, c.x, c.y, c.angle, c.color, {});
    else if (c.kind === 'parked') drawCar(ctx, c.x, c.y, c.angle, c.color, {});
    else drawCar(ctx, c.x, c.y, c.angle, c.color, {});
  }
  // Cops.
  for (const c of g.cops) drawCar(ctx, c.x, c.y, c.angle, c.kind === 'swat' ? '#37474f' : '#eceff1', { police: c.kind !== 'swat', swat: c.kind === 'swat', flash: Math.floor(g.time * 4 + c.x) % 2 === 0 });
  // Heli + spotlight.
  if (g.heli) {
    ctx.fillStyle = 'rgba(255,255,200,0.10)';
    ctx.beginPath(); ctx.ellipse(g.player.x, g.player.y, 150, 110, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(g.heli.x, g.heli.y);
    ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HELI', g.heli.x, g.heli.y - 22);
  }
  // Peds.
  for (const p of g.peds) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    drawPed(ctx, p.x, p.y, p.angle, p.rival ? '#e53935' : p.color, p.panic);
  }
  // Bullets.
  ctx.fillStyle = '#ffeb3b';
  for (const b of g.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  // Particles.
  for (const pt of g.particles) {
    ctx.globalAlpha = clamp(pt.t / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.kind === 'smoke' ? (1.6 - pt.t / pt.max) : 1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Player on foot.
  const pl = g.player;
  if (!pl.inCar && !pl.dead) {
    drawPed(ctx, pl.x, pl.y, pl.angle, '#ff9800', 0);
    ctx.fillStyle = '#ff9800'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VIC', pl.x, pl.y - 14);
    if (pl.muzzle > 0) {
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(pl.x + Math.cos(pl.angle) * 20, pl.y + Math.sin(pl.angle) * 20, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Night tint + headlights.
  const na = nightAlpha(g.clock);
  if (na > 0.02) {
    ctx.fillStyle = 'rgba(8,10,40,' + na.toFixed(2) + ')';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (pl.inCar && pl.car) {
      ctx.fillStyle = 'rgba(255,244,180,0.14)';
      ctx.beginPath(); ctx.moveTo(pl.x, pl.y);
      ctx.arc(pl.x, pl.y, 320, pl.angle - 0.35, pl.angle + 0.35); ctx.closePath(); ctx.fill();
    }
  }
  // Rain (screen space, after world transform reset below).
  ctx.restore();

  if (g.raining) {
    ctx.strokeStyle = 'rgba(174,194,224,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const rx = (i * 97 + g.time * 700) % (W + 40);
      const ry = (i * 57 + g.time * 900) % (H + 40);
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 8, ry + 18); ctx.stroke();
    }
  }

  // ---------- HUD ----------
  if (g.started) {
    // Top-left: cash / respect / wanted.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(12, 12, 250, 64, 8); ctx.fill();
    ctx.fillStyle = '#a5d6a7'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('$' + Math.floor(g.cash).toLocaleString('en-US'), 24, 38);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText(rankName(g) + '  •  ' + g.respect + ' respect', 24, 58);
    ctx.font = 'bold 20px sans-serif';
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < Math.ceil(g.wanted) ? '#ffd54f' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', 24 + i * 24, 78); }
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText('WANTED', 150, 76);

    // Minimap.
    drawMinimap(ctx, g, W - 206, 12, 188);

    // Bottom-left: health / armor / weapon.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(12, H - 92, 300, 80, 8); ctx.fill();
    ctx.fillStyle = '#ef5350'; ctx.fillRect(24, H - 76, 180 * clamp(pl.hp / 100, 0, 1), 10);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(24, H - 76, 180, 10);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('HP ' + Math.ceil(pl.hp), 210, H - 66);
    if (pl.armor > 0) { ctx.fillStyle = '#90caf9'; ctx.fillRect(24, H - 60, 180 * clamp(pl.armor / 100, 0, 1), 6); }
    const w = WEAPONS[pl.weapon];
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 14px sans-serif';
    const ammo = pl.ammo[w.id] === Infinity ? '∞' : pl.ammo[w.id];
    ctx.fillText(w.name + '  [' + ammo + ']', 24, H - 34);
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText('1-6 weapons • Q wheel • E enter car • 7/8/9 crew • R radio • M map', 24, H - 18);

    // Bottom-right: radio / clock / speed.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(W - 260, H - 92, 248, 80, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('♪ ' + RADIO[g.audio ? g.audio.station : 0].name, W - 24, H - 66);
    ctx.font = '13px sans-serif';
    ctx.fillText(clockStr(g.clock) + (g.raining ? '  •  RAIN' : '  •  CLEAR'), W - 24, H - 46);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText(Math.round(pl.speed * 0.36) + ' km/h', W - 24, H - 20);

    // Objective banner.
    const obj = g.mission ? (g.mission.name + ': ' + g.mission.msg) : (g.missionIdx >= 10 ? 'All missions done — free roam!' : 'Press N to start mission: ' + MISSIONS[g.missionIdx].name);
    if (g.mission || g.missionIdx < 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const tw = ctx.measureText(obj).width;
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2 - 14, 12, tw + 28, 30, 8); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(obj, W / 2, 32);
    }
    // Messages.
    ctx.textAlign = 'center';
    g.messages.forEach((m, i) => {
      ctx.globalAlpha = clamp(m.t, 0, 1);
      ctx.fillStyle = m.color; ctx.font = 'bold 15px sans-serif';
      ctx.fillText(m.text, W / 2, 62 + i * 22);
    });
    ctx.globalAlpha = 1;
    // Nitro bar.
    if (pl.inCar) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 100, H - 34, 200, 12, 6); ctx.fill();
      ctx.fillStyle = '#29b6f6'; ctx.fillRect(W / 2 - 98, H - 32, 196 * clamp(g.nitro / 100, 0, 1), 8);
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText('NITRO (Shift)', W / 2, H - 38);
    }
    // Weapon wheel.
    if (input && input.wheel) {
      ctx.save(); ctx.translate(W / 2, H / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 130, 0, Math.PI * 2); ctx.fill();
      WEAPONS.forEach((wp, i) => {
        const a = (i / WEAPONS.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * 85, y = Math.sin(a) * 85;
        ctx.fillStyle = i === pl.weapon ? '#ffd54f' : '#fff';
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText((i + 1) + ' ' + wp.name, x, y);
      });
      ctx.restore();
    }
  }

  // ---------- Screens ----------
  if (!g.started) {
    ctx.fillStyle = 'rgba(8,10,24,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff9800'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('COPPER BAY', W / 2, H / 2 - 110);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('A sun-baked open-world crime story  •  5 districts  •  10 missions', W / 2, H / 2 - 70);
    ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
    const lines = [
      'WASD drive / walk  •  Mouse aim  •  Click shoot  •  E enter car  •  Q weapon wheel',
      '1-6 weapons  •  7 Lena  8 Marcus  9 Tessa  •  Shift nitro  •  Space handbrake drift',
      'N next mission  •  G garage  •  R radio  •  P pause  •  F save  •  L load',
      '',
      'ENTER — start a new game        C — continue saved game',
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 30 + i * 24));
    return;
  }
  if (g.paused) {
    ctx.fillStyle = 'rgba(8,10,24,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 60);
    ctx.font = '15px sans-serif';
    const owned = g.ownedCars.map((id) => CARS.find((c) => c.id === id).name).join(', ');
    const lines = [
      'Garage: ' + owned,
      'Territory owned: ' + (Object.values(g.territory).filter(Boolean).length) + '/5 districts',
      'Missions done: ' + g.missionIdx + '/10   •   Kills: ' + g.kills + '   •   Races won: ' + g.racesWon,
      '',
      'Press P to resume  •  G garage  •  F save  •  L load',
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 10 + i * 24));
    return;
  }
  if (g.over) {
    ctx.fillStyle = 'rgba(20,4,4,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = g.won ? '#a5d6a7' : '#ef5350'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(g.won ? 'KINGPIN OF COPPER BAY' : 'BUSTED', W / 2, H / 2 - 40);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
    ctx.fillText(g.won ? 'Silas Kane is finished. The city is yours, Vic.' : 'Vic went down. The city forgets fast.', W / 2, H / 2);
    ctx.fillText('Missions ' + g.missionIdx + '/10  •  $' + Math.floor(g.cash) + '  •  ' + g.kills + ' kills', W / 2, H / 2 + 30);
    ctx.fillText('Press ENTER to play again', W / 2, H / 2 + 70);
  }
}
