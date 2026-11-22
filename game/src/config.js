// Copper Bay — tuning and static data. One clear job: constants only.
export const WORLD = { w: 3400, h: 2600, road: 96, block: 208, seed: 7 };

export const DISTRICTS = [
  { id: 'portside', name: 'Portside', x: 0, y: 0, w: 1100, h: 900, ground: '#8a7a5c', road: '#4a4640', accent: '#d97b2b', label: 'PORTSIDE' },
  { id: 'oldtown', name: 'Old Town', x: 1100, y: 0, w: 1100, h: 900, ground: '#a08b62', road: '#55504a', accent: '#c9a227', label: 'OLD TOWN' },
  { id: 'downtown', name: 'Downtown', x: 2200, y: 0, w: 1200, h: 900, ground: '#7d7468', road: '#3f3d3a', accent: '#3fa7d6', label: 'DOWNTOWN' },
  { id: 'boardwalk', name: 'Boardwalk', x: 0, y: 900, w: 1700, h: 800, ground: '#d9c08a', road: '#6b6156', accent: '#e2607a', label: 'BOARDWALK' },
  { id: 'hills', name: 'The Hills', x: 1700, y: 900, w: 1700, h: 800, ground: '#6f7d4e', road: '#4c5540', accent: '#7fb069', label: 'THE HILLS' },
  { id: 'harbor', name: 'Harbor', x: 0, y: 1700, w: 3400, h: 900, ground: '#3d6a7d', road: '#37474f', accent: '#29b6f6', label: 'HARBOR' },
];
// Harbor row is water with docks; the other five districts are the playable land.

export const WEAPONS = [
  { id: 'fists', name: 'Fists', key: '1', rank: 0, dmg: 12, rate: 0.32, range: 46, ammo: Infinity, auto: false, spread: 0, color: '#e8b06a' },
  { id: 'pistol', name: 'Pistol', key: '2', rank: 0, dmg: 22, rate: 0.28, range: 340, ammo: Infinity, auto: false, spread: 0.05, color: '#cfd8dc' },
  { id: 'smg', name: 'SMG', key: '3', rank: 1, dmg: 13, rate: 0.09, range: 300, ammo: 240, auto: true, spread: 0.11, color: '#90a4ae' },
  { id: 'shotgun', name: 'Shotgun', key: '4', rank: 2, dmg: 16, rate: 0.75, range: 210, ammo: 48, auto: false, spread: 0.22, pellets: 6, color: '#a1887f' },
  { id: 'rifle', name: 'Rifle', key: '5', rank: 3, dmg: 46, rate: 0.16, range: 520, ammo: 120, auto: true, spread: 0.03, color: '#78909c' },
  { id: 'rpg', name: 'RPG', key: '6', rank: 4, dmg: 120, rate: 1.1, range: 460, ammo: 12, auto: false, spread: 0.01, explosive: true, color: '#8d6e63' },
];

export const CARS = [
  { id: 'rust', name: 'Rustbucket', tier: 0, price: 0, top: 240, accel: 150, grip: 0.86, hp: 100, color: '#8d6e63' },
  { id: 'sedan', name: 'Bay Sedan', tier: 1, price: 1500, top: 310, accel: 200, grip: 0.9, hp: 140, color: '#5c6bc0' },
  { id: 'sport', name: 'Copper Sport', tier: 2, price: 6000, top: 400, accel: 280, grip: 0.94, hp: 170, color: '#ef6c00' },
  { id: 'super', name: 'Solstice GT', tier: 3, price: 15000, top: 480, accel: 340, grip: 0.97, hp: 210, color: '#fdd835' },
];

export const CREW = [
  { id: 'lena', name: 'Lena', role: 'Getaway Driver', key: '7', cd: 45, desc: 'Nitro refill + cops lose your trail for 8s' },
  { id: 'marcus', name: 'Marcus', role: 'Muscle', key: '8', cd: 60, desc: 'Armor 10s + ram damage x3' },
  { id: 'tessa', name: 'Tessa', role: 'Hacker', key: '9', cd: 75, desc: 'Wanted level -2 instantly' },
];

export const RANKS = ['Rookie', 'Street', 'Hustler', 'Boss', 'Kingpin'];
export const RANK_XP = [0, 200, 600, 1400, 2600];

export const MISSIONS = [
  { id: 'm1', name: 'Hotwire', verb: 'Steal a car', pay: 300, xp: 120, desc: 'Steal the parked sport car and bring it to the garage.' },
  { id: 'm2', name: 'Shadow', verb: 'Tail the courier', pay: 450, xp: 160, desc: 'Follow the courier across town. Do not get spotted.' },
  { id: 'm3', name: 'Breakout', verb: 'Free the crew', pay: 600, xp: 200, desc: 'Ram the prison van until it stops, then grab Marcus.' },
  { id: 'm4', name: 'The Vault Job', verb: 'Rob the bank', pay: 1200, xp: 300, desc: 'Hit the Downtown bank. Loud or quiet — your call.' },
  { id: 'm5', name: 'Street Kings', verb: 'Win the race', pay: 900, xp: 260, desc: 'Beat three rivals through 6 checkpoints. Bet on yourself first.' },
  { id: 'm6', name: 'Harbor Run', verb: 'Boat chase', pay: 1000, xp: 280, desc: 'Outrun the harbor patrol boats to the far dock.' },
  { id: 'm7', name: 'Extraction', verb: 'Rescue Lena', pay: 1100, xp: 300, desc: 'Fight into the rival hideout and bring Lena out alive.' },
  { id: 'm8', name: 'Turf War', verb: 'Take the turf', pay: 1300, xp: 340, desc: 'Clear the Old Town block and hold it against waves.' },
  { id: 'm9', name: 'The Drop', verb: 'Smuggle the drop', pay: 1400, xp: 360, desc: 'Deliver the package across the city with the heat on.' },
  { id: 'm10', name: 'Kingpin', verb: 'Take down Kane', pay: 2500, xp: 600, desc: 'End Silas Kane: chase him down, then finish it.' },
];

export const RADIO = [
  { id: 'bayfm', name: 'Bay FM 88.5', mood: 'chill', bpm: 96, root: 220 },
  { id: 'rock', name: 'Copper Rock 101', mood: 'drive', bpm: 132, root: 110 },
  { id: 'neon', name: 'Neon Nights 96', mood: 'night', bpm: 118, root: 164.8 },
];

export const TUNING = {
  playerRun: 230, playerWalk: 150, playerHp: 100,
  wantedDecay: 0.02, wantedPerCrime: 1,
  copTop: 330, copAccel: 260, heliSpeed: 260,
  trafficCount: 26, pedCount: 40, parkedCount: 14,
  dayLength: 240, rainChance: 0.22,
  territoryIncome: 50, // $ per district per minute
  explosionRadius: 90, explosionDmg: 110,
};
