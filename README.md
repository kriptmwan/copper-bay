# Copper Bay

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/kriptmwan/copper-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/kriptmwan/copper-bay/reward.svg)](https://make.fun/bounty/gta6-01)

**Copper Bay** is a 2D top-down open-world crime game for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun. You are Vic Marlow, fresh out of the game and back in the sun-baked coastal city of Copper Bay — five districts, one rival kingpin, and a crew that owes you.

## What is in the game

- **A complete open world** — Portside, Old Town, Downtown, Boardwalk, The Hills, and the Harbor bay, all connected by a road grid you can drive end to end. Traffic, pedestrians, parked cars, boats, docks, parks.
- **10 story missions, each a different verb** — steal a car, tail a courier without being spotted, ram a prison van free, rob the Downtown bank (loud or quiet), win a 6-checkpoint street race (bet on yourself), outrun harbor patrol boats, fight into a rival hideout, hold a turf block through three waves, smuggle a drop across the city with the heat on, and finally take down Silas Kane.
- **Wanted 0–5** — cops chase and ram, roadblocks at 3+, a police helicopter at 4+, SWAT at 5. Lay low and the heat decays; call Tessa to scrub it.
- **6-weapon wheel** — fists, pistol, SMG, shotgun, rifle, RPG — unlocked by respect rank, with ammo, muzzle flash, and explosions.
- **3 crew abilities** — Lena (getaway: nitro + lose the tail), Marcus (armor + ram damage), Tessa (hacker: wanted −2).
- **Territory + passive income** — take districts and they pay you every minute.
- **Garage** — 4 vehicle tiers (Rustbucket → Solstice GT) to buy and upgrade, plus nitro and drift handling with tire smoke.
- **Radio, day/night, rain** — three synthesized stations, a full day cycle with headlights at night, and rain that wets the streets.
- **Save / load** — your cash, respect, territory, garage, and missions persist in the browser.

## How to play

Serve the game locally (`node serve.ts`, then open http://localhost:8080) or play the built copy. Keyboard + mouse on desktop Chrome.

| Key | Action |
| --- | --- |
| WASD / arrows | Drive / walk |
| Mouse + click | Aim / shoot |
| E | Enter or exit a car, use the bank door, open the garage |
| Q (hold) | Weapon wheel |
| 1–6 | Weapons |
| 7 / 8 / 9 | Lena / Marcus / Tessa |
| Shift | Nitro (in car) |
| Space | Handbrake drift |
| N | Start the next mission |
| B | Bet on yourself (race) |
| G | Garage (near the ★) |
| R | Radio station |
| M | Full-map zoom |
| P | Pause |
| F / L | Save / load |

## Tech

Plain HTML + ES modules, no libraries, no network requests, no build step. `game/src/` is split by one clear job per file: `config` (tuning), `random` (seeded RNG), `city` (map generation), `audio` (synthesized sound), `world` (simulation), `missions` (the 10 story missions), `render` (canvas + HUD), `shots` (screenshot staging), `selftest` (headless checks), `main` (bootstrap + input).

Run the self-test in a browser: `game/index.html?selftest=1` — it reports pass/fail in the page title and on `window.__selftest`.

## License

MIT — see [LICENSE](LICENSE).
