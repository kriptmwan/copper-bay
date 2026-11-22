// Copper Bay — story missions. One clear job: ten mission state machines.
import { MISSIONS, WORLD, TUNING } from './config.js';
import { dist, angTo, rngRange, rngPick, clamp } from './random.js';
import { addMessage, gainCash, gainRespect, raiseWanted, explode, damageCar } from './world.js';
import { roadPoint, nearestRoadPoint } from './city.js';

export function currentMissionDef(g) { return MISSIONS[g.missionIdx] || null; }

export function startMission(g) {
  const def = currentMissionDef(g);
  if (!def || g.mission) return false;
  const m = { id: def.id, name: def.name, stage: 0, t: 0, data: {}, msg: def.desc };
  g.mission = m; g.missionTimer = 0;
  addMessage(g, 'MISSION: ' + def.name + ' — ' + def.desc, '#ffd54f');
  if (g.audio) g.audio.mission();
  if (def.id === 'm1') {
    m.target = g.cars.find((c) => c.missionCar) || g.cars[0];
    m.msg = 'Steal the orange sport car.';
  }
  if (def.id === 'm2') {
    const c = g.cars.find((c2) => c2.kind === 'traffic') || g.cars[0];
    c.kind = 'courier'; c.target = roadPoint(g.city, g.rng);
    m.target = c; m.data.spotted = 0; m.data.wps = 0;
    m.data.waypoints = [roadPoint(g.city, g.rng), roadPoint(g.city, g.rng), roadPoint(g.city, g.rng), roadPoint(g.city, g.rng)];
    m.msg = 'Tail the courier. Stay close — but not TOO close.';
  }
  if (def.id === 'm3') {
    const p = roadPoint(g.city, g.rng);
    const van = { x: p.x, y: p.y, angle: 0, speed: 0, hp: 300, maxHp: 300, kind: 'van', color: '#546e7a', target: roadPoint(g.city, g.rng), driver: null, id: 999001 };
    g.cars.push(van); m.target = van;
    m.msg = 'Ram the prison van until it stops.';
  }
  if (def.id === 'm4') {
    m.target = { x: g.city.bank.x + g.city.bank.w / 2, y: g.city.bank.y + g.city.bank.h / 2 };
    m.msg = 'Go to the Copper Bank (Downtown) and press E at the door.';
  }
  if (def.id === 'm5') {
    m.data.checkpoints = [];
    let p = { x: g.player.x, y: g.player.y };
    for (let i = 0; i < 6; i++) { const q = roadPoint(g.city, g.rng); m.data.checkpoints.push(q); p = q; }
    m.data.cp = 0; m.data.rivals = [];
    for (let i = 0; i < 3; i++) {
      const rp = roadPoint(g.city, g.rng);
      const r = { x: rp.x, y: rp.y, angle: 0, speed: 0, hp: 120, maxHp: 120, kind: 'rival', color: rngPick(g.rng, ['#e53935', '#8e24aa', '#00897b']), target: m.data.checkpoints[0], cp: 0, driver: null, id: 999100 + i };
      g.cars.push(r); m.data.rivals.push(r);
    }
    m.target = m.data.checkpoints[0];
    m.msg = 'Race! Hit all 6 checkpoints before the rivals.';
  }
  if (def.id === 'm6') {
    m.data.dest = { x: 3150, y: 1900 };
    m.data.timeLeft = 90;
    m.target = m.data.dest;
    raiseWanted(g, 2);
    m.msg = 'Harbor Run: reach the far dock in 90s. The patrol boats are on you.';
  }
  if (def.id === 'm7') {
    m.data.hideout = { x: 1350, y: 500 };
    m.target = m.data.hideout;
    m.data.shooters = [];
    for (let i = 0; i < 6; i++) {
      const s = { x: 1350 + rngRange(g.rng, -120, 120), y: 500 + rngRange(g.rng, -120, 120), angle: 0, speed: 40, hp: 60, rival: true, shootCd: rngRange(g.rng, 0.5, 2), color: '#e53935', panic: 0, target: null };
      g.peds.push(s); m.data.shooters.push(s);
    }
    m.msg = 'Fight into the hideout and clear the gang.';
  }
  if (def.id === 'm8') {
    m.data.zone = { x: 1350, y: 500 };
    m.data.wave = 0; m.data.shooters = []; m.data.spawned = 0;
    m.target = m.data.zone;
    m.msg = 'Hold the Old Town block. Waves incoming.';
  }
  if (def.id === 'm9') {
    m.data.pickup = { x: 500, y: 300 };
    m.data.drop = { x: 2900, y: 1400 };
    m.data.timeLeft = 100; m.data.hasPackage = false;
    m.target = m.data.pickup;
    m.msg = 'Pick up the package at Portside, then deliver it.';
  }
  if (def.id === 'm10') {
    const rp = roadPoint(g.city, g.rng);
    const kane = { x: rp.x, y: rp.y, angle: 0, speed: 0, hp: 400, maxHp: 400, kind: 'kane', color: '#212121', target: roadPoint(g.city, g.rng), driver: null, id: 999200 };
    g.cars.push(kane); m.target = kane; m.data.kane = kane;
    m.msg = 'Chase Kane down. Ram him or shoot his car apart.';
  }
  return true;
}

function completeMission(g) {
  const def = currentMissionDef(g);
  const m = g.mission;
  let pay = def.pay, bonus = '';
  if (def.id === 'm4' && g.kills === m.data.killsAtStart) { pay += 300; bonus = ' (quiet bonus +$300)'; }
  if (def.id === 'm5' && g.bet > 0) { pay += g.bet * 2; bonus = ' (bet won +$' + g.bet * 2 + ')'; g.bet = 0; }
  gainCash(g, pay); gainRespect(g, def.xp);
  addMessage(g, 'MISSION COMPLETE: ' + def.name + ' +$' + pay + ' +' + def.xp + ' respect' + bonus, '#a5d6a7');
  if (g.audio) g.audio.mission();
  if (def.id === 'm5') g.racesWon++;
  if (def.id === 'm8') { g.territory.oldtown = true; addMessage(g, 'Old Town is YOURS. Income flowing.', '#a5d6a7'); }
  if (def.id === 'm10') { g.won = true; g.over = true; }
  g.mission = null; g.missionIdx++;
  return true;
}

function failMission(g, reason) {
  addMessage(g, 'MISSION FAILED: ' + reason, '#ef5350');
  if (g.audio) g.audio.fail();
  if (g.mission && g.mission.id === 'm5') g.bet = 0;
  g.mission = null;
  return false;
}

function rivalShoot(g, s, dt) {
  s.shootCd -= dt;
  const d = dist(s.x, s.y, g.player.x, g.player.y);
  if (s.shootCd <= 0 && d < 340 && s.hp > 0) {
    s.shootCd = 1.6;
    const a = angTo(s.x, s.y, g.player.x, g.player.y);
    g.bullets.push({ x: s.x, y: s.y, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, t: 0.6, dmg: 7, cop: true });
  }
}

export function updateMission(g, dt) {
  const m = g.mission;
  if (!m) return;
  m.t += dt;
  const p = g.player;
  if (m.id === 'm1') {
    if (m.stage === 0) {
      if (p.inCar && p.car === m.target) { m.stage = 1; m.target = { x: g.city.garage.x, y: g.city.garage.y + 120 }; m.msg = 'Take it to the garage.'; addMessage(g, 'Nice. Now bring it home.', '#ffd54f'); }
    } else if (dist(p.x, p.y, m.target.x, m.target.y) < 90) completeMission(g);
  }
  if (m.id === 'm2') {
    const c = m.target;
    if (!c || c.hp <= 0) return failMission(g, 'The courier got away.');
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < 60) { m.data.spotted += dt; m.msg = 'TOO CLOSE — back off!'; if (m.data.spotted > 2.5) return failMission(g, 'You were spotted.'); }
    else if (d > 320) return failMission(g, 'You lost the courier.');
    else m.msg = 'Tail the courier. Stay in the 60–320 range.';
    if (!c.target || dist(c.x, c.y, c.target.x, c.target.y) < 30) {
      if (m.data.wps >= m.data.waypoints.length - 1) return completeMission(g);
      m.data.wps++; c.target = m.data.waypoints[m.data.wps];
    }
    c.angle += clamp(((Math.atan2(c.target.y - c.y, c.target.x - c.x) - c.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.8 * dt, 1.8 * dt);
    c.speed = 130;
    c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
  }
  if (m.id === 'm3') {
    const van = m.target;
    if (m.stage === 0) {
      if (!van.target || dist(van.x, van.y, van.target.x, van.target.y) < 30) van.target = roadPoint(g.city, g.rng);
      van.angle += clamp(((Math.atan2(van.target.y - van.y, van.target.x - van.x) - van.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.5 * dt, 1.5 * dt);
      van.speed = 150;
      van.x += Math.cos(van.angle) * van.speed * dt; van.y += Math.sin(van.angle) * van.speed * dt;
      if (van.hp <= 120) { van.speed = 0; m.stage = 1; m.msg = 'It stopped! Get to the van on foot.'; addMessage(g, 'Van stopped. Grab Marcus!', '#ffd54f'); }
      if (dist(p.x, p.y, van.x, van.y) > 1600) return failMission(g, 'The van escaped.');
    } else if (!p.inCar && dist(p.x, p.y, van.x, van.y) < 60) completeMission(g);
  }
  if (m.id === 'm4') {
    if (m.stage === 0) {
      m.data.killsAtStart = m.data.killsAtStart ?? g.kills;
      if (dist(p.x, p.y, m.target.x, m.target.y) < 90 && g.interact) { m.stage = 1; m.data.timer = 20; raiseWanted(g, 3); m.msg = 'Vault opening… hold 20s!'; addMessage(g, 'ALARM! Hold the vault 20 seconds!', '#ef5350'); }
    } else if (m.stage === 1) {
      m.data.timer -= dt;
      m.msg = 'Vault: ' + Math.ceil(m.data.timer) + 's — stay near the bank!';
      if (dist(p.x, p.y, m.target.x, m.target.y) > 260) return failMission(g, 'You left the bank mid-robbery.');
      if (m.data.timer <= 0) { m.stage = 2; m.target = { x: g.city.garage.x, y: g.city.garage.y + 120 }; m.msg = 'Lose the heat — get to the garage!'; }
    } else if (dist(p.x, p.y, m.target.x, m.target.y) < 90) completeMission(g);
  }
  if (m.id === 'm5') {
    const cp = m.data.checkpoints[m.data.cp];
    m.target = cp;
    for (const r of m.data.rivals) {
      if (!r.target || dist(r.x, r.y, r.target.x, r.target.y) < 40) {
        if (r.cp >= m.data.checkpoints.length - 1) return failMission(g, 'A rival finished first.');
        r.cp++; r.target = m.data.checkpoints[r.cp];
      }
      r.angle += clamp(((Math.atan2(r.target.y - r.y, r.target.x - r.x) - r.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -2 * dt, 2 * dt);
      r.speed = 200 + r.cp * 8;
      r.x += Math.cos(r.angle) * r.speed * dt; r.y += Math.sin(r.angle) * r.speed * dt;
    }
    if (dist(p.x, p.y, cp.x, cp.y) < 70) {
      m.data.cp++;
      if (m.data.cp >= m.data.checkpoints.length) return completeMission(g);
      addMessage(g, 'Checkpoint ' + m.data.cp + '/6', '#ffd54f');
    }
    m.msg = 'Race: checkpoint ' + (m.data.cp + 1) + '/6';
  }
  if (m.id === 'm6') {
    m.data.timeLeft -= dt;
    m.msg = 'Harbor Run: ' + Math.ceil(m.data.timeLeft) + 's to the far dock!';
    if (m.data.timeLeft <= 0) return failMission(g, 'Too slow — the patrol boxed you in.');
    if (dist(p.x, p.y, m.data.dest.x, m.data.dest.y) < 110) completeMission(g);
  }
  if (m.id === 'm7') {
    for (const s of m.data.shooters) if (s.hp > 0) rivalShoot(g, s, dt);
    const alive = m.data.shooters.filter((s) => s.hp > 0).length;
    if (alive === 0) {
      if (m.stage === 0) { m.stage = 1; const lena = { x: 1350, y: 500, angle: 0, speed: 0, hp: 30, panic: 0, target: null, color: '#81d4fa' }; g.peds.push(lena); m.data.lena = lena; m.target = { x: 1350, y: 500 }; m.msg = 'All clear — grab Lena!'; }
      else if (dist(p.x, p.y, 1350, 500) < 60) completeMission(g);
    } else m.msg = 'Clear the gang: ' + alive + ' left.';
  }
  if (m.id === 'm8') {
    const alive = m.data.shooters.filter((s) => s.hp > 0).length;
    if (m.data.wave < 3 && alive === 0 && m.data.spawned === m.data.wave * 4) {
      m.data.wave++;
      for (let i = 0; i < 4; i++) {
        const s = { x: 1350 + rngRange(g.rng, -200, 200), y: 500 + rngRange(g.rng, -200, 200), angle: 0, speed: 55, hp: 70, rival: true, shootCd: rngRange(g.rng, 0.5, 2), color: '#e53935', panic: 0, target: null };
        g.peds.push(s); m.data.shooters.push(s);
      }
      m.data.spawned = m.data.wave * 4;
      addMessage(g, 'Wave ' + m.data.wave + '/3!', '#ef5350');
    }
    for (const s of m.data.shooters) if (s.hp > 0) rivalShoot(g, s, dt);
    if (m.data.wave === 3 && alive === 0) completeMission(g);
    else m.msg = 'Turf War: wave ' + m.data.wave + '/3 — ' + alive + ' rivals left.';
    if (dist(p.x, p.y, m.data.zone.x, m.data.zone.y) > 400) m.msg = 'Get back to the block!';
  }
  if (m.id === 'm9') {
    m.data.timeLeft -= dt;
    if (m.data.timeLeft <= 0) return failMission(g, 'The drop went cold.');
    if (!m.data.hasPackage) {
      m.target = m.data.pickup;
      if (dist(p.x, p.y, m.data.pickup.x, m.data.pickup.y) < 70) { m.data.hasPackage = true; m.target = m.data.drop; raiseWanted(g, 2); addMessage(g, 'Package secured. Deliver it — cops are coming.', '#ffd54f'); }
      m.msg = 'Pick up the package: ' + Math.ceil(m.data.timeLeft) + 's';
    } else {
      m.target = m.data.drop;
      m.msg = 'Deliver the package: ' + Math.ceil(m.data.timeLeft) + 's';
      if (dist(p.x, p.y, m.data.drop.x, m.data.drop.y) < 80) completeMission(g);
    }
  }
  if (m.id === 'm10') {
    const kane = m.data.kane;
    if (m.stage === 0) {
      if (!kane.target || dist(kane.x, kane.y, kane.target.x, kane.target.y) < 40) kane.target = roadPoint(g.city, g.rng);
      kane.angle += clamp(((Math.atan2(kane.target.y - kane.y, kane.target.x - kane.x) - kane.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -2.2 * dt, 2.2 * dt);
      kane.speed = 260;
      kane.x += Math.cos(kane.angle) * kane.speed * dt; kane.y += Math.sin(kane.angle) * kane.speed * dt;
      if (kane.hp <= 120) {
        kane.speed = 0; m.stage = 1;
        for (let i = 0; i < 4; i++) {
          const s = { x: kane.x + rngRange(g.rng, -100, 100), y: kane.y + rngRange(g.rng, -100, 100), angle: 0, speed: 50, hp: 80, rival: true, shootCd: 1, color: '#212121', panic: 0, target: null };
          g.peds.push(s); (m.data.guards = m.data.guards || []).push(s);
        }
        m.msg = "Kane's car is done — finish him and his guards!";
        addMessage(g, "Kane is out of the car. End it.", '#ef5350');
      }
    } else {
      const alive = (m.data.guards || []).filter((s) => s.hp > 0).length;
      for (const s of m.data.guards || []) if (s.hp > 0) rivalShoot(g, s, dt);
      m.msg = 'Finish Kane: ' + alive + ' guards left.';
      if (alive === 0) completeMission(g);
    }
  }
}
