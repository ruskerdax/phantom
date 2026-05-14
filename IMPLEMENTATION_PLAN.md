# Implementation Plan: Major Gameplay Expansion

## How to use this plan

This document is the source of truth for a multi-task gameplay expansion. Tasks are designed to be handed off to coding agents (Claude Code, Codex, etc.) one at a time, in the order specified at the bottom.

**Agent contract for each task:**
1. Read the **Conventions** section in full before implementing.
2. Read the target task block in full.
3. Implement only what the task specifies. No bonus refactors, no speculative abstractions, no features outside the block.
4. If the outline is ambiguous mid-implementation, stop and ask rather than guess.
5. Verify the **Acceptance** criterion in a browser (open `phantom.html`).
6. Mark the task done in this file by adding ✅ next to its heading, and commit everything (code + plan edit) together.

**Project notes:** Vanilla JS, no build step, all globals (no modules). Test by opening `phantom.html` in a browser. Save format is being intentionally broken — playtesters will wipe saves; do not write migration code.

---

## Conventions

**Registries** follow the existing `DEFENSE_CLASSES` / `SURFACE_ENEMY_CLASSES` pattern. New files:
- `data/building-types.js` — `BUILDING_CLASSES` registry (NEW)
- `buildings.js` — building runtime (NEW)
- `data/objective-types.js` — objective type defs (NEW)
- `objectives.js` — objective tracking runtime (NEW)
- `branching-tunnel.js` — generator + site mode (NEW, Phase 2)

**File naming:** Avoid creating files with the same basename in different directories. Data-only registries/type definitions should use an explicit suffix such as `*-types.js` or the already-established `*-classes.js`; runtime modules keep the plain domain name (`objectives.js`, `buildings.js`). Before adding a new file, scan for existing basenames and choose a distinct name.

**Save format:** Per-planet building state lives in `lvState[pi].buildings = {<classId>: <aliveBitfield>}` — bit `i` = whether the i-th building of this class on this site is alive. **Comment must be added in `save.js`** explaining the bitfield format. No save migration; playtesters wipe.

**Color generation:** HSL — H spaced ≥45° apart vs prior planets in same system, S ∈ [0.65, 0.92], L ∈ [0.45, 0.62]. `bg` derived by darkening `pcol` to L=0.04.

**Region tags:** terrain segments emit one of `'flat'|'hills'|'mountains'|'plateau'|'crater'`. Helpers `surfaceSlopeAt`, `surfaceRegionAt`, `surfaceFlatSpans`, `surfaceFlattishSpans(d, maxSlopeRad=Math.PI/6)`.

**Combat-design memory (preserve at all times):**
- Delta-V coasting is sacred — don't add sustained-thrust energy costs.
- Don't propose blanket per-weapon range falloff; ships always use weapons as defined in `weapons.js`.
- Don't rework `ec.spd` or fighter AI overrides.
- The new mechanics in this plan respect those rules; don't violate them while implementing.

**Assumptions made during planning**:
- Reactor 25% means 75% of planets have no `cave_reactor` objective. Some planets may end up with zero objectives. Required count is per-system, not per-planet.
- Dishes stay an independent surface roll (modify to be 25% probability). They migrate into `BUILDING_CLASSES` as the first entry in F-07.
- Tower placement order: structures-with-paired-towers first; the "2–5 random" pass runs last on remaining flat-ish ground.
- Drone caps are per-site: `SURFACE_DRONE_CAP=8`, `TUNNEL_DRONE_CAP=8`, independent of each other and of `SURFACE_ENEMY_CAP=12`.
- DEADB33F: procedural under the new system except orbital guns are forbidden.
- HBASE objective counts toward slipgate-unlock requirement.

---

## Phase 0 — Foundations (sequential)

### F-01. World size bump ✅

**Superseded by OVERWORLD_REWORK_PLAN.md F-03** — current canonical world size is `OW_W = OW_H = 16000` with orbits scaled via `orbitMaxR() = OW_W * 0.45`. The 6000² / 1600 numbers below describe the intermediate state that shipped with this task and are no longer current.

**Goal:** `OW_W = OW_H = 6000`; max orbital radius 1600.

**Files:** `util.js`, `gen.js`

**Outline:**
- Bump `OW_W`/`OW_H` to 6000.
- In `genOWBodies`/`genABodies`/`genHBaseBody`/`genSlipgateBody`: scale `minR` to ~400 (BASE floor ~825), `maxR` to 1600, slipgate hard radius 1600.
- Re-tune `orbitSpd` formula so far-out bodies don't crawl: `0.00060 - (orbitR-minR)/(maxR-minR) * 0.00045`.
- Verify camera clamp paths in `overworld.js:78-79` and `overworld.js:493` handle the new bounds.

**Depends on:** —

**Acceptance:** Default seed renders, ship visible at base, planets at expected radii, no off-world spawns.

---

### F-02. Variable planet count + procedural per-planet template ✅

**Superseded by OVERWORLD_REWORK_PLAN.md G-01 / G-02** — the 2d5 planet roll and `genPlanetTmpl` described below were the intermediate state. The current canonical generator is archetype-driven (`SYSTEM_ARCHETYPES`) and emits `BODIES[]` rather than `LV` / `PP`. Per-body kind/subtype/size/atmosphere/population come from the body roll, not from a planet template.

**Goal:** Replace fixed 3 with 2d5 (2–10) planets, each with a procedurally rolled template. Drop planet names.

**Files:** `gen.js`, `data/levels.js`, `overworld.js`, `site.js`, `save.js`, `state.js`

**Outline:**
- Delete `LV_TMPL`. Add `genPlanetTmpl(rng, prevColors)` returning `{pcol, col, bg, grav:rng.fl(.001,.008), pr:rng.int(28,36), nObs:rng.int(2,5), nEn:rng.int(3,7), nFu:rng.int(2,3), rxHp:rng.int(30,80)}`. Color rule per Conventions.
- `genWorld(seed)` rolls planet count = `rng.int(1,5)+rng.int(1,5)`. `LV` and `PP` become variable-length.
- `G.cleared` becomes derived from objectives (full handoff in F-05) but until then keep it as `Array(PP.length).fill(false)`.
- Audit `LV[0..2]` / `PP[0..2]` indexes — convert to dynamic loops. Hot spots: `overworld.js:59`, `overworld.js:254`, `save.js:14`, `site.js:247`.
- HUD banner: replace `(d.name||'')` displays with `'surface'`/`'cave'`/`'tunnel'` constants in `site.js:623`, `site.js:706`.
- Overworld planet label: render nothing (color disc only). Slipgate near-tooltip unchanged.

**Depends on:** F-01

**Acceptance:** Test seed with 8 planets renders 8 distinctly-hued planets, all enterable. No `LV[2]` index errors at planet-count<3.

---

### F-03. Asteroid fields = 1d4 − 1 ✅

**Superseded by OVERWORLD_REWORK_PLAN.md G-02** — canonical cap is `MAX_AST_FIELDS = 2` (0–2 fields per system). The 0–3 range described below was the intermediate state.

**Goal:** 0–3 asteroid fields per system.

**Files:** `gen.js`, `overworld.js`

**Outline:**
- `genABodies` returns variable-length array (0–3). Belt particles only generated if AB.length>0.
- `seedSystemFleets` Swarm-per-asteroid loop iterates `AB.length`.
- `updOW` aggro check + draw loop iterate `AB.length`.

**Depends on:** F-02

**Acceptance:** Test seeds with 0/1/2/3 fields all render and are enterable.

---

### F-04. Uniform site-spacing pass ✅

**Goal:** Single `MIN_SITE_SEP = 440` enforced across all sites (planets, asteroids, hbase, slipgate) — no two within that radius.

**Files:** `gen.js`

**Outline:**
- Replace per-body retry loops with one pass that places sites in order BASE → planets → asteroid fields → HBASE → SLIPGATE; each placement runs 60 attempts rejecting positions within `MIN_SITE_SEP` of any prior site.
- Fall back gracefully if budget exhausted (keep position; `console.warn`).

**Depends on:** F-03

**Acceptance:** Seed sweep verifies no two site centers within 440px.

---

### F-05. Objective system ✅

**Goal:** Replace `cleared`/`slipgateActive` aggregation with an objective registry. Render objective panel under credit/stake. Wire HBASE as an objective. Rename cheat.

**Files:** `data/objective-types.js` (NEW), `objectives.js` (NEW), `state.js`, `site.js`, `overworld.js`, `ui/screens/cheats.js`, `save.js`, `draw.js`

**Outline:**
- `OBJECTIVE_TYPES`:
  - `'cave_reactor'` (per-planet) — reactor destroyed
  - `'surface_targets'` (per-planet) — all dishes destroyed
  - `'civ_residences'` (per-planet) — ≥50% of residence point total destroyed
  - `'civ_infrastructure'` (per-planet) — ≥50% of infrastructure point total destroyed
  - `'hbase'` (per-system) — HBASE destroyed
- `genObjectives()` runs at end of `genWorld` after all sites populated. Emits one row per qualifying site. Order results consistently by `(planetIdx, type)` for deterministic display.
- `G.objectives = [{id, type, planetIdx?, complete:false, label, progressFn?}]`.
- `G.objectivesRequired = rng.int(1,2)+rng.int(1,2)+rng.int(1,2)` (3d2).
- `completeObjective(id)` flips complete, awards 250 stake, recomputes `slipgateActive = completedCount >= G.objectivesRequired || G.cheatSlipgateUnlocked`.
- Existing `completePlanetSite('cave')` and `completePlanetSite('targets')` route through `completeObjective` based on planet+type.
- `G.cleared[pi]` is now derived: planet's all objectives complete.
- New `drawObjectivesPanel(opts={layout:'planet'|'base-list-stub', planetIdx?})` draws checkmark list. Surface and overworld both call with `layout:'planet'`. Stub `'base-list-stub'` returns the data it would render so the future base-menu can reuse it.
- Cheat menu: rename `'clear all sectors'` → `'unlock slipgate'`; sets `G.cheatSlipgateUnlocked=true` (override); doesn't flip per-objective state.
- Save: persist objectives + `objectivesRequired` per system in `systemStates[seed]`.

**Depends on:** F-02, F-03, F-04

**Acceptance:** A test system with 6 generated objectives unlocks slipgate at the rolled count (3–6). HBASE destruction counts. "Cleared" label shows under any planet whose own objectives are all complete. Cheat unlocks slipgate without altering objective state.

---

### F-06. Surface terrain region system ✅

**Goal:** Generator emits surfaces composed of labeled discrete segments; ≥3 flat segments guaranteed. Provide query helpers.

**Files:** `data/levels.js`, `site.js`

**Outline:**
- Rewrite `genSurfaceTerrain(rng, worldW)`:
  1. Targets — flat 30%, hills 45%, mountains 20%, plateau 2.5%, crater 2.5%. Force flat count ≥3.
  2. Per-region width ranges (px): flat 200–600, hills 250–800, mountains 200–700, plateau 250–500, crater 200–450.
  3. Segment generators:
     - `flat`: tiny noise (±3px).
     - `hills`: low-frequency sin (amp 18–32, period ~ segment width).
     - `mountains`: jagged sawtooth + high-freq noise (amp 60–110).
     - `plateau`: hard step up by 35–60, flat top, hard step down.
     - `crater`: sharp step down 30–50, flat bottom, sharp step up.
  4. Smooth segment joins (1–2 sample blend).
  5. Wrap-around match: last segment height = first.
- Persist `surface.regions = [{x0, x1, kind}]`.
- Helpers in `site.js`:
  - `surfaceSlopeAt(d, x)` — radians.
  - `surfaceRegionAt(d, x)` — kind string.
  - `surfaceFlatSpans(d)` — `[{x0,x1}]` of region==='flat'|'plateau'|'crater'.
  - `surfaceFlattishSpans(d, maxSlope=Math.PI/6)` — slope-threshold spans.
- Optional dev overlay `drawTerrainRegions(d)` (commented-out call site in `drawSurface`) for verification.

**Depends on:** F-02

**Acceptance:** Sample-seed sweep confirms ≥3 flat segments per surface; mountains visibly jagged; plateaus/craters present.

---

### F-07. Building registry framework ✅

**Goal:** `BUILDING_CLASSES` registry + runtime; migrate dishes into it.

**Files:** `data/building-types.js` (NEW), `buildings.js` (NEW), `site.js`, `data/levels.js`, `save.js`

**Outline:**
- `BUILDING_CLASS_IDS` constants. `BUILDING_CLASSES` array with rows shaped:
  ```
  {id, name, hp, footprint:{w,h}, requiresFlat, requiresPower, indestructible,
   col, sc, drawSurface(b,site), drawTunnel?(b,site),
   onDestroyed?(site,b), placement:{contexts:['surface'|'tunnel'|'cave']}}
  ```
- First registered class: `DISH` — migrated from current surface dishes. `requiresFlat:false` (preserve current placement). `onDestroyed` flips relevant objective progress.
- `buildings.js` runtime:
  - `mkBuilding(classId, x, y, extra={})`.
  - `damageBuilding(site, b, dmg, x, y)` — shared destruction tone, debris, stake (`def.sc`), `onDestroyed` hook.
  - `buildingHitBox(b)` — AABB.
  - `siteBuildings(site)` — flat list of buildings active in current site.
- Hooks in `site.js`:
  - `surfaceBeamTargets`, `siteBeamTargets` push building targets.
  - `updSurfaceProjectiles` and the cave-projectile loop test buildings.
  - `surfaceExplodeMissile`/`siteExplodeMissile` apply splash to buildings.
- Save schema: `lvState[pi].buildings[classId]` = packed integer bitfield (alive=1). **Comment in `save.js`** describing format.
- Drop direct `dishes` arrays at gen time — now `surface.buildings` initialized from generator + DISH class.

**Depends on:** F-06

**Acceptance:** Surface dishes work identically (visual, targeting, destruction, objective trigger), but state is in `buildings.DISH` bitfield. Adding a new building class downstream is a one-row + one-draw-fn change.

---

### F-08. Powered-flag cascade ✅

**Goal:** Per-planet powered state derived from power-station alive count, propagated to entities flagged `requiresPower`.

**Files:** `state.js`, `site.js`, `defenses.js`, `buildings.js`

**Outline:**
- `planetIsPowered(pi)`: returns `true` iff no power stations exist on the planet OR ≥1 power station alive across surface AND tunnel sites of planet `pi`.
- `defenseIsPowered(site, def)`: planet powered AND defense not flagged `requiresPower:false`.
- Update `updateDefense` in `defenses.js` to skip firing when `requiresPower && !planetIsPowered(pi)`.
- Buildings with `requiresPower:true` consult same flag in their per-class `update`/`draw`.
- HUD: small "POWER OFFLINE" indicator under HUD when planet has powered entities AND power is gone.

**Depends on:** F-07

**Acceptance:** Console-toggling a synthetic alive bitfield deactivates powered behavior live.

---

## Phase 1 — Buildings (minimum-playable)

P1-01 and P1-02 are foundational; the rest can run in parallel after both land. P1-08 also needs P1-05.

### P1-01. Tower ✅

**Goal:** Add `TOWER` building (HP 100, mounts a turret on top, paired-with-structures + 2–5 random per surface).

**Files:** `data/building-types.js`, `data/levels.js`, `buildings.js`, `defenses.js`, `site.js`

**Outline:**
- `TOWER` row: `hp:100, footprint:{w:18,h:34}, requiresFlat:true, drawSurface:drawTower`. Visual: wide-short rectangle base + tapered narrower rectangle top + turret rendered at top.
- Placement helper `placePairedTower(rng, surface, anchorX, side)` for P1-02/03/06 reuse.
- Random pass last in `genSurface`: 2–5 placements on `surfaceFlattishSpans(d, Math.PI/6)`, min separation 90px, clear of all prior placements.
- Each tower stores `tower.turretId` linking to a `SURFACE_SENTINEL` defense entity at the tower top.
- Tower destruction `onDestroyed`: flip linked turret `alive=false`.
- Update `genSurfaceDefenses` to no longer place free-standing surface turrets — they only ride towers.
- Tower-mounted turrets carry `requiresPower:true`.

**Depends on:** F-07, F-08

**Acceptance:** Surface shows 2–5 towers + 0 free-standing turrets. Killing tower drops turret. Turret silent when planet unpowered.

---

### P1-02. Power station ✅

**Goal:** Add `POWER_STATION` (HP 50). 1–3 per surface; each spawns a paired tower.

**Files:** `data/building-types.js`, `data/levels.js`, `buildings.js`

**Outline:**
- Row: `hp:50, requiresFlat:true, drawSurface:…` (rectangle with electrical detail).
- Per-planet count: `rng.int(1,3)`.
- Each spawn calls `placePairedTower(rng, surface, station.x, 'right')` (or left).
- Cascade verified via F-08.

**Depends on:** P1-01

**Acceptance:** All-stations-destroyed flips planet powered=false; tower turrets stop firing; OFFLINE indicator shows.

---

### P1-03. Air defense base ✅

**Goal:** Add `AIR_DEFENSE_BASE` (HP 500); 20s skimmer/diver spawn cycle; cap `SURFACE_ENEMY_CAP=12`; pre-spawned guard skimmer with role-flagged respawn priority; 1–2 paired towers; re-enter top-up to 60% if alive.

**Files:** `data/building-types.js`, `data/levels.js`, `data/surface-enemy-classes.js`, `surface-enemies.js`, `buildings.js`

**Outline:**
- Building row: `hp:500, requiresFlat:true, requiresPower:false`.
- Per-planet rolling: 0–1 air defense bases (~30% probability).
- `SURFACE_ENEMY_CAP=12` exported constant.
- Per-frame logic in surface update: if any base alive AND `(skimmers+divers).length < SURFACE_ENEMY_CAP` AND `--base.spawnTimer<=0` (reset to 1200), spawn skimmer or diver (50/50) at base position with upward velocity. **Guard rule:** if `base.guardAlive===false`, the next spawn is forced to be the guard.
- Pre-spawn guard skimmer with `e.role='guard'`, `e.guardOf=base.idx`. New AI branch in `updSurfaceEnemy`: if `role==='guard'`, target stays within radius 200 of `guardOf` base, drift around it.
- Paired towers: always 1 next to base; 50% chance of a 2nd opposite side.
- On surface enter: if base alive AND `surfaceLiveSkimmersAndDivers < 0.6 * SURFACE_ENEMY_CAP`, spawn-fill to `0.6 * SURFACE_ENEMY_CAP` (mix split per current ratio).

**Depends on:** P1-01, P1-02

**Acceptance:** Base alive ⇒ guard always present; total skimmer+diver ≤ 12; re-enter populates to ≥7 if base alive; destroying base stops spawns.

---

### P1-04. Drone factory + Surface drone ✅

**Goal:** Add `DRONE_FACTORY` (HP 300). New `SURFACE_DRONE` enemy type / `BASE_DEFENSE_DRONE` class. 8-cap drones per site (independent from surface enemy cap).

**Files:** `data/building-types.js`, `data/surface-enemy-classes.js`, `surface-enemies.js`, `buildings.js`, `data/levels.js`

**Outline:**
- Building row: `hp:300, requiresFlat:true, requiresPower:false`.
- Per-planet: 0–1 surface factory (~25%).
- New surface enemy type `'surface_drone'`, class `BASE_DEFENSE_DRONE`: `hp:10, spd:1.6`, weapon = `'mining laser'` (use existing weapons system — must NOT bypass it). AI: patrol within ~250px of factory until LOS to player, then circle at radius 120.
- `SURFACE_DRONE_CAP=8`, `TUNNEL_DRONE_CAP=8` (latter unused until P2-05).
- Spawn rule: every 1200 frames, if `siteDrones < cap` AND factory alive, spawn at factory position with random small velocity. Skip if cap hit.
- Drones do NOT count toward `SURFACE_ENEMY_CAP`.

**Depends on:** P1-01, P1-02

**Acceptance:** Surface factory steadily produces drones up to 8 cap; LOS-react to player; destroying factory stops spawns; mining-laser fires through standard weapon system.

---

### P1-05. Civilian residences + infrastructure ✅

**Note:** The population-class distribution below (20% none / 20% sparse / 40% moderate / 20% dense) is **superseded by OVERWORLD_REWORK_PLAN.md G-02**, which moves population-class assignment onto the body roll itself with per-subtype overrides (default 20/40/30/10 none/sparse/moderate/dense; Continental → 60/40 mod/dense; Rocky → 50/30/20 none/sparse/mod; Machine → `'uninhabited'`). The building tables and placement rules below remain authoritative; only the population-class probabilities change when G-02 lands.

**Goal:** 8 residence + 8 infrastructure classes; per-planet population class roll; city-zone placement; 50%-by-points objective wiring.

**Files:** `data/building-types.js`, `data/levels.js`, `objectives.js`

**Outline:**
- Population class roll: 20% none / 20% sparse / 40% moderate / 20% dense (deterministic from seed).
- Target points: sparse `rng.int(20,40)`, moderate `rng.int(50,80)`, dense `rng.int(100,200)`.
- 8 residence rows (col `#88ff66`):

  | id | size | pts | hp |
  |----|------|-----|----|
  | BUNGALOW | small | 2 | 20 |
  | RANCH | small | 4 | 40 |
  | TOWNHOUSE | med | 6 | 60 |
  | MANSION | med | 8 | 80 |
  | CONDO | med | 10 | 100 |
  | HIGH_RISE | large | 12 | 120 |
  | HOTEL | wide | 16 | 160 |
  | ARCOLOGY | XL | 32 | 320 |

- 8 infrastructure rows (col `#ffeeaa`): CROP_DOME(2/20), FARMHOUSE(4/40), GOV(6/60), HOSPITAL(8/80), WAREHOUSE(10/100), FACTORY(12/120), SPACEPORT(16/160), ENTERTAINMENT(32/320).
- Visuals: simple silhouettes per class. Arcology = Eiffel-tower legs + ovoid top. Polish in P3-01.
- Placement:
  - City zones: 1 (sparse) / 2–3 (moderate) / 3–5 (dense). Each zone is a contiguous flat segment ≥250px wide, claimed entirely.
  - Within zone: dense packing, small spacing.
  - Sparse: only ≤CONDO; few HIGH_RISE allowed; no HOTEL/ARCOLOGY.
  - Moderate: HIGH_RISE OK, up to a few HOTEL, no ARCOLOGY.
  - Dense: anything, max 1 ARCOLOGY.
  - Smattering: ~20% of point budget placed solo on flat ground outside zones.
- Infrastructure: budget = residences/2, only if residences exist; same proportional class freq; placed in zones or adjacent flat stretches.
- Objective wiring: `genObjectives` emits `civ_residences` if planet has residences, `civ_infrastructure` if it has infrastructure. Completion check fires inside `damageBuilding` `onDestroyed` for residence/infra classes — recompute destroyed-points sum, complete objective when ≥50% of generated total.

**Depends on:** F-07, F-05

**Acceptance:** Dense planet produces ≥1 ARCOLOGY, several MANSION/HOTEL, populated zones; destroying ≥50% (point total) flips objective. Infrastructure tracked separately and ratio is 1:0.5.

---

### P1-06. Orbital gun ✅

**Goal:** `ORBITAL_GUN` building (HP 500) with surface placeholder visual + overworld firing logic. Forbidden on `DEADB33F`.

**Files:** `data/building-types.js`, `data/levels.js`, `overworld.js`, `state.js`

**Outline:**
- Building row: `hp:500, requiresFlat:true, requiresPower:false`.
- Per-planet roll: 0–1, ~12% probability; 0 if `seed === TUTORIAL_SEED`.
- Surface visual: large angled cannon. Spawns 2 paired towers + 2–3 extra surface enemies as defenders at gen time.
- Overworld behavior in `updOW`:
  - `ORBITAL_GUN_RANGE=700` (close to swarm aggro).
  - For each planet whose `lvState[pi].buildings.ORBITAL_GUN` has alive bits: tick `gun.cd` per gun (init 480). When player within range AND `cd<=0`: fire one projectile from planet center toward player's *current* position. Reset cd=480.
  - Projectile: `{x,y,vx,vy,l:180,dmg:150,from:pi}` in `G.OW.owGunShots[]`. `vx,vy` = unit-toward-player × 1.5.
  - Each frame: step shots, check ship-ship overlap (~12px), apply via `applyShipShieldDamage` then `applyShipDamage`. Expire on `l<=0` or off-world.
  - No collision with anything else.
  - Render: glowing slow projectile with short trail.

**Depends on:** P1-01, F-07

**Acceptance:** Orbital-gun planet fires when player approaches; player can dodge; destroying gun stops fire; DEADB33F never has guns; projectiles ignore other entities.

---

### P1-07. Laser defense ✅

**Goal:** Indestructible fence-style laser; 60-tick/s × 2dmg = 120dmg/s contact damage; cave/tunnel only; powered.

**Files:** `data/building-types.js`, `data/levels.js`, `buildings.js`, `site.js`

**Outline:**
- `LASER_DEFENSE` row: `indestructible:true, requiresPower:true, drawTunnel:drawLaserFence`. Stores `{a:{x,y}, b:{x,y}}` anchors.
- Cave generator addition (and Phase 2 branching tunnel generator): place 1–3 fences across path-narrow points. Skip first ~200px after entrance.
- **Power-station-reachable rule:** flood-fill from entrance treating laser fences as walls; reject placement if any power station is unreachable. (Per-spec: "ensure power stations are never placed behind laser defenses.")
- Player-collision: per-frame `dseg(s.x,s.y, fence.a.x,fence.a.y, fence.b.x,fence.b.y) < 4` AND `planetIsPowered(pi)` ⇒ apply 2 damage via standard `applyShipDamage` path (no shield bypass — first-pass treats it as raw hull damage; revisit if needed).
- Visual: thin pulsing line, brighter when active, dim when unpowered.

**Depends on:** P1-02, F-07

**Acceptance:** Cave with 2 fences + 1 station: ship takes ~2dmg/frame on contact when powered, can pass freely when station destroyed. No station ever placed behind a fence.

---

## Phase 2 — Branching tunnels (sequential)

### P2-01. Reactor existence roll (25%) ✅

**Goal:** Per planet: 25% reactor (existing tunnel→cave), 75% branching tunnel (no cave).

**Files:** `gen.js`, `data/levels.js`, `site.js`

**Outline:**
- In `genPlanetSites` (or its replacement at the planet level), roll: `tunnelKind = rng.next() < 0.25 ? 'reactor' : 'branching'`.
- If `'reactor'`: existing flow (linear tunnel + cave + cave_reactor objective).
- If `'branching'`: stub branching site type (Phase 2 fills in the generator). For now generate only an empty placeholder that can be entered without crash.
- Per-planet site list reflects the choice; surface entrance always present, points to `tunnel`.

**Depends on:** F-05

**Acceptance:** Sample seed shows ~25% reactor planets, ~75% branching planets; reactor planets emit `cave_reactor` objective, branching planets do not.

---

### P2-02. Branching tunnel generator ✅

**Goal:** Procedural branching tunnel world.

**Files:** `branching-tunnel.js` (NEW), `data/levels.js`

**Outline:**
- `genBranchingTunnel(rng, tmpl, seed)` returns `{kind:'branching', worldW, worldH, terrain, branches:[], clearings:[], ent:{x,y}}`.
- World size: `worldW = rng.int(2,4) * W`, `worldH = rng.int(3,5) * H`.
- Algorithm:
  1. Carve trunk from top entry downward.
  2. At 2–5 trunk depths, spawn lateral branches; each branch can sub-branch with diminishing chance.
  3. Mark branch terminals; pick 1–2 to expand into clearings (~screen-sized rectangular caverns with flat floors).
  4. Some branches loop: at each terminal, roll to extend toward another nearby terminal and join.
  5. Render terrain as a closed polygon (corridor walls). Reuse `pip` + `siteBoundarySegments`.
- Provide `pip`-compatible `terrain` polygon, empty `obs:[]`.

**Depends on:** P2-01, F-06

**Acceptance:** Test seeds produce traversable tunnels with 2–5 branches, ≥1 clearing, occasional loops, no unreachable rooms.

---

### P2-03. Branching tunnel site mode ✅

**Goal:** Plug branching tunnel into the site state machine.

**Files:** `site.js`, `state.js`, `main.js`

**Outline:**
- New site `mode:'branching'`. Treat collision/draw mostly like `'cave'` (closed polygon, `pip`, own `worldH`/`worldW`). No reactor.
- Top-edge exit (`s.y < 0`) returns to surface mouth.
- No bottom-edge exit.
- Save state arrays: `lvState[pi].branching = {buildings:{…}, en:[…]}`.
- Camera: `updateWorldCamera` with both `worldW` and `worldH` clamps.
- `enterTunnel` checks `p.tunnelKind`; routes to `enterBranchingTunnel` for the new mode (skipping the linear tunnel intermediate).

**Depends on:** P2-02

**Acceptance:** Player can enter, navigate, return to surface via top exit. No regressions on reactor planets.

---

### P2-04. Power substation in clearings

**Goal:** Place 0–1 power stations per branching tunnel in a clearing; integrate into planet powered cascade.

**Files:** `branching-tunnel.js`, `buildings.js`

**Outline:**
- Per branching tunnel: place 0–1 `POWER_STATION` (same class as P1-02) on a clearing's flat floor.
- Persist in `lvState[pi].branching.buildings.POWER_STATION` bitfield.
- `planetIsPowered(pi)` aggregates surface AND branching tunnel power stations (per spec: any one alive across whole planet keeps power up).
- Validate at gen time: with this station included, every other station remains reachable from its entrance (no fences walling it off, see P2-05).

**Depends on:** P2-03, P1-02

**Acceptance:** Tunnel station counts toward planet power; surface-only destruction doesn't kill power if a clearing station survives.

---

### P2-05. Drone factory + laser defense in branching tunnels

**Goal:** Allow `DRONE_FACTORY` in clearings (using `TUNNEL_DRONE_CAP=8` independent of surface); allow `LASER_DEFENSE` in tunnel corridors with reachability check.

**Files:** `branching-tunnel.js`, `surface-enemies.js`, `buildings.js`

**Outline:**
- Drone factory: 0–1 per branching tunnel, in a clearing (one max per clearing). Reuses building class.
- Tunnel drone spawning: same logic as P1-04 but reads `TUNNEL_DRONE_CAP`. Drones live only in this tunnel site (no wandering into caves — branching tunnels have no caves anyway).
- Laser defense: 1–3 per tunnel as path fences. **Reachability validation** per P1-07 final rule: flood-fill from entry treating fences as walls; reject placement if any power station is unreachable.

**Depends on:** P2-04, P1-04, P1-07

**Acceptance:** Clearings host functional drone factories; tunnel laser fences toggle with planet power; power stations always reachable.

---

## Phase 3 — Polish & Tuning

### P3-01. Visual polish

**Files:** `data/building-types.js`, `data/levels.js`

**Outline:** Refine each building silhouette per spec (Eiffel-tower-arcology, etc.); subtle region tinting at plateau/crater edges; dome scanline shimmer; laser-defense pulsing.

**Depends on:** All Phase 1.

---

### P3-02. Audio + stake balancing

**Files:** `audio.js`, per-class `onDestroyed` hooks, `overworld.js`

**Outline:** Per-class destruction tones scaled by size; orbital-gun firing tone in overworld; stake values balance pass.

**Depends on:** All Phase 1.

---

### P3-03. Performance pass

**Files:** various

**Outline:** Profile worst-case seed (10 planets, dense civ, 8 drones, 12 surface enemies, full towers, dome, lasers). Spatial-hash building lookups if linear scans dominate. Cache dome arc segments on site init.

**Depends on:** All Phase 2.

---

### P3-04. Save schema marker

**Files:** `save.js`

**Outline:** Add a `worldVersion` field; reset save on mismatch with a `console.warn` for playtesters.

**Depends on:** All prior phases.

---

## Recommended execution order

**Sequential block A (Foundations):** F-01 → F-02 → F-03 → F-04 → F-05 → F-06 → F-07 → F-08.

**Sequential block B (Building bedrock):** P1-01 → P1-02.

**Parallelizable block C** (after B; Claude + Codex can take different ones): P1-03, P1-04, P1-05, P1-06, P1-07.

**Sequential block D (Branching tunnels):** P2-01 → P2-02 → P2-03 → P2-04 → P2-05.

**Polish:** P3-01–P3-04.

Total: 25 tasks.

