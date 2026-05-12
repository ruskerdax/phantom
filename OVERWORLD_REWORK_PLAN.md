# Implementation Plan: Overworld & Star System Overhaul

## How to use this plan

This document is the source of truth for the overworld + star-system rework. Tasks are designed to be handed off to coding agents (Claude Code, Codex, etc.) one at a time, in the order specified at the bottom.

**Agent contract for each task:**
1. Read the **Conventions** section in full before implementing.
2. Read the target task block in full.
3. Implement only what the task specifies. No bonus refactors, no speculative abstractions, no features outside the block.
4. If the outline is ambiguous mid-implementation, stop and ask rather than guess.
5. Verify the **Acceptance** criterion in a browser (open `phantom.html`).
6. Mark the task done in this file by adding ✅ next to its heading, and commit everything (code + plan edit) together.

**Project notes:** Vanilla JS, no build step, all globals (no modules). Test by opening `phantom.html` in a browser. Save format is being intentionally broken — playtesters will wipe saves; do not write migration code.

This plan runs in parallel with IMPLEMENTATION_PLAN.md (which establishes buildings + objectives + branching tunnels) and UI_REWORK_PLAN.md (which establishes the DOM screen stack). It assumes everything in IMPLEMENTATION_PLAN.md Phase 0 (F-01..F-08) and Phase 1 (P1-01..P1-08) has landed; specifically it depends on the `BUILDING_CLASSES` registry, the `OBJECTIVE_TYPES` registry, the objective panel, the building destruction hooks, and the surface region system. It does **not** require the UI rework to be complete — the screens added here register through the existing `registerScreen` pipeline and work whether the UI rework is mid-flight or finished.

---

## Conventions

### Terminology (binding)
- **Celestial body** ("body") — `BODIES[i]`. A star, planet, or moon. Has `{kind, subtype, size, parentId, orbit, ...}`.
- **Planet** — a body with `parentId === <starId>`. May be a gas giant.
- **Moon** — a body whose `parentId` is another (non-star) body.
- **Site** — anything the player can interact with on the overworld. Includes enterable bodies (size 1-6), HBASE, asteroid fields, BASE, SLIPGATE. Gas giants and the star are bodies but **not** sites.
- **Stage** — a non-overworld gameplay screen: encounter, surface, tunnel, cave.

### Body kinds and subtypes (binding)
- `kind: 'star' | 'gas_giant' | 'habitable' | 'uninhabitable'`. No `'planet'` or `'moon'` kind — planet vs. moon is determined by `parentId`.
- `subtype`:
  - `star`: none (size 15-20, fixed at world center)
  - `gas_giant`: none (size 7-10)
  - `habitable`: `'desert' | 'arctic' | 'continental' | 'rocky' | 'ocean'` (size 2-4)
  - `uninhabitable`: `'barren' | 'volcanic' | 'liquid' | 'machine'` (size 1-6)
- Continental requires size 3-4. Other habitable subtypes accept size 2-4. Uninhabitable subtypes accept any size 1-6.

### File paths
- `data/bodies.js` (NEW) — body kind/subtype registries, palettes, atmosphere defs, per-size tables.
- `data/system-types.js` (NEW) — star system archetype defs.
- `bodies.js` (NEW) — runtime body helpers (lookup, gravity, interaction).
- `spatial.js` (NEW) — overworld spatial hash + viewport culling helpers.
- `ui/screens/body-info.js` (NEW) — site info popup.
- `ui/screens/body-select.js` (NEW) — multi-site selection popup.
- Modified: `state.js`, `gen.js`, `overworld.js`, `site.js`, `util.js`, `data/levels.js`, `save.js`, `objectives.js`, `data/objective-types.js`, `data/building-types.js`, `main.js`.

**File naming:** Before adding a new file, scan for existing basenames and choose a distinct name. Runtime modules use the plain domain name (`bodies.js`); data-only registries use the `data/` directory.

### Data structure (binding)

`BODIES[]` replaces the previous `LV`, `PP`, `AB`, `HBASE`, and `SLIPGATE` globals. Each entry:

```
{
  id,              // stable string, e.g. 'star', 'p0', 'p1', 'm1.0', 'm1.1'
  kind,            // 'star' | 'gas_giant' | 'habitable' | 'uninhabitable'
  subtype,         // (per kind table above) or null for star/gas_giant
  size,            // integer; per-kind range
  parentId,        // 'star' for planets, planet id for moons; null for the star
  orbit: {r, a, spd}, // around parent center; spd uses bucket table (see G-04)
  palette: {primary, secondary, sea, atmo, bg},  // hex strings; sea is null when no sea
  atmoKind,        // 'none'|'trace'|'thin'|'moderate'|'thick' (null for star + gas_giant)
  populationClass, // 'none'|'sparse'|'moderate'|'dense' for habitable; 'uninhabited' for uninhabitable; null for star/gas_giant
  level,           // {surface, tunnel?, cave?} for enterable bodies; null for star/gas_giant
  pr,              // overworld draw radius (derived from size; see Conventions: Draw radii)
}
```

Special non-body sites stay as their own globals (`BASE`, `HBASE`, `SLIPGATE`, `AB[]`) but their orbits live alongside `BODIES[]` for layout purposes (see B-02).

### Size tables (binding, tweakable as named constants)

- `BODY_SIZE_BY_KIND`:
  - star: `[15, 20]`
  - gas_giant: `[7, 10]`
  - habitable: `[2, 4]`
  - uninhabitable: `[1, 6]`
- `MOON_SIZE_CAP_BY_PARENT_SIZE`:
  - parent size 3-5 → moon size 1
  - parent size 6-8 → moon size 1-2
  - parent size 9-10 → moon size 1-3
- `SURFACE_SCREEN_MULT_BY_SIZE` (multiplier vs. a current planet's `screens`, which is `rng.int(8,14)`):
  - `[null, 1, 2, 2.5, 3, 3.5, 4]` — index by size 1-6 (size 1 = 1×, size 6 = 4×).
- `BODY_DRAW_RADIUS = 10 + size * 6` for all bodies (size 1 = 16 px, size 10 = 70 px, size 15 = 100 px, size 20 = 130 px).

### Gravity tables (binding, tweakable as named constants)

- `FELT_GRAVITY_BY_SIZE = [null, 0, 0.002, 0.005, 0.009, 0.014, 0.020]` — index by size 1-6. Applied as `s.vy += FELT_GRAVITY_BY_SIZE[size]` per frame on surface/tunnel/cave when alive.
- Overworld gravity well: `force = K * size² / dist²` toward each body, additive across all bodies + star. `K_STAR = 500 * (OW_W / 6000)` (scales with world expansion); `K_BODY_FACTOR = 0.02` (so `K_body = K_STAR * K_BODY_FACTOR`).
- Star always kills on contact (`dist < 22`). Other bodies (gas giants, planets, moons) cause **no** overworld contact damage (existing planet "enter" check is only firing-while-near, not collision).

### Atmosphere (binding, tweakable as named constants)

- `ATMO_KINDS = ['none','trace','thin','moderate','thick']`.
- `ATMO_DRAG_PER_FRAME = {none:1.0, trace:0.998, thin:0.994, moderate:0.988, thick:0.978}` — applied as `s.vx *= mult; s.vy *= mult` per frame on surface, tunnel, cave.
- `ATMO_DRAG_CAVE_TUNNEL_FACTOR = 0.5` — drag in tunnel/cave is `1 - (1 - surfaceDrag) * 0.5` (i.e., 50% as strong as surface). Easier to compute as `multInCave = 1 - (1 - mult) * 0.5`.
- `ATMO_STAR_OPACITY = {none:1.0, trace:0.85, thin:0.55, moderate:0.25, thick:0.05}` — applied to the surface background star draw alpha.
- `ATMO_RANGE_BY_SUBTYPE`:
  - `desert`: `['thin','moderate','thick']`
  - `arctic`: `['thin','moderate']`
  - `continental`: `['moderate']`
  - `rocky`: `['none','trace']`
  - `ocean`: `['moderate','thick']`
  - `barren`: `['none','trace']`
  - `volcanic`: `['none','trace','thin','moderate','thick']`
  - `liquid`: `['moderate','thick']`
  - `machine`: `['trace','thin','moderate']`
- Atmosphere kind is rolled uniformly from the subtype range.
- Atmosphere color (`palette.atmo`) is derived: `seaColor ?? primaryColor`.

### Palettes (binding, used in B-02)

Each subtype is encoded as a named palette in `data/bodies.js` — a small array of hex strings from which the per-body color triplet `{primary, secondary, sea?}` is drawn deterministically by seed. Color tweaking is per-array, not per-body.

```
SUBTYPE_PALETTES = {
  desert:      {terrain:['#f4e6c4','#e8d5a0','#d4b878','#c19a55','#a67c3a','#7a5a2a','#c4795a','#a8553a'], sea:null},
  arctic:      {terrain:['#f4f8fc','#e0e8f0','#c8d8e8','#a8c8e0','#80b8d0','#b8e8f0','#88c0d8'],          sea:null},
  continental: {terrain:['#88c060','#6ab048','#4a9028','#287018','#1a5818'],                              sea:['#5090d0','#3870b0','#2858a0','#184078']},
  rocky:       {terrain:['#d8d8d4','#c0c0bc','#8090a0','#607080','#b09080','#806858','#685040'],          sea:null},
  ocean:       {terrain:['#6a5040','#888070','#9c8068'],                                                  sea:['#5090d0','#3870b0','#2858a0','#184078','#d8d088','#c0b870','#a8b860','#8aa850']},
  barren:      {terrain:['#d8d8d4','#c0c0bc','#8090a0','#607080','#b09080','#806858','#685040'],          sea:null},
  volcanic:    {terrain:['#383028','#50443c','#685850','#80706a'],                                        sea:['#ff6020','#ffa040']},  // 'sea' here is lava
  liquid:      {terrain:['#383038','#504048','#685058'],                                                  sea:['#8050a8','#604078','#4ca878','#3a8060','#d8c860','#b0a040','#d88040','#b06020']},
  machine:     {terrain:['#d0d4d8','#b8c0c4','#a0a8ac','#888c90'],                                        sea:['#404848','#283030','#d8e840','#c0d030','#50e068','#38b050']},
  gas_giant:   {bands:['#80a8d0','#607890','#b0b4b8','#909498','#88b478','#688858','#b89880','#907058','#d8c878','#b0a058','#d8a878','#b08058','#d08868','#a86848']},
  star:        {core:['#ffffff'], warm:{inner:['#fffbe8'], mid:['#ffe87a'], outer:['#ffcc40']}, cool:{inner:['#f7fcff'], mid:['#dff1ff'], outer:['#bcdfff']}},
}
```

The body picks `primary` and `secondary` as two distinct entries from `terrain`, and (when subtype has sea) `sea` as one entry from `sea`. Two adjacent picks via deterministic seed.
For stars, pick exactly one family (`warm` or `cool`) per star and take `inner`/`mid`/`outer` only from that family (never mix yellow mids with blue outers, or blue mids with yellow outers).

### Save format (binding)

- `lvState` becomes `lvState[bodyId]` keyed by stable body id (string), not array-indexed by planet number.
- `G.cleared` becomes `G.cleared = {bodyId: true}` (object/map), not an array.
- `G.systemStates[seed]` persists `lvState`, `cleared`, `objectives`, `objectivesRequired`, `cheatSlipgateUnlocked`, `hbCleared`, `hbState`, plus new field `systemArchetype` (the rolled archetype id, for debug only — it's derivable from seed).
- BODIES[] is **never persisted** — always regenerated from seed at world-load.
- `lastLocation.kind === 'planet'` keeps a numeric index for back-compat… no, drop that. Change `lastLocation` to `{seed, bodyId, kind:'body'|'base'|'slipgate'|'asteroid'|'hbase'}`. `'body'` is the new general kind covering planets+moons; `index` is dropped.
- No save migration. Wipe.

### System archetypes (binding)

```
SYSTEM_ARCHETYPES = [
  {id:'compact_rocky', weight:0.50, hu:[5,10], gas:[0,1]},
  {id:'solar_like',    weight:0.30, hu:[3, 6], gas:[2,5]},
  {id:'giant_heavy',   weight:0.20, hu:[1, 3], gas:[4,8]},
]
```
- `hu` = habitable/uninhabitable body count range (uniform random).
- `gas` = gas giant count range (uniform random).
- Rolled once per system via `seedChild(seed, 0x4000)`.

### Goldilocks zone (binding)

A body's orbit qualifies for the habitable roll when `orbitR ∈ [GOLDILOCKS_INNER * maxR, GOLDILOCKS_OUTER * maxR]`, where `GOLDILOCKS_INNER = 0.35`, `GOLDILOCKS_OUTER = 0.65`. Outside this band, a size-2-4 body is uninhabitable; inside, it rolls 50/50 habitable vs uninhabitable. Continental requires this band too (already implied since Continental is habitable).

### Subtype weight tables (binding, applied independently)

```
SUBTYPE_WEIGHTS = {
  habitable:     {desert:15, arctic:30, continental:5, rocky:35, ocean:15},   // sums to 100
  uninhabitable: {barren:75, volcanic:12.5, liquid:12.5, machine:2.5},        // sums to 100
}
```
- When Continental or Machine is excluded (mutex or size constraint), the remaining weights renormalize automatically.
- Continental + Machine mutex: tracked on `system.lockouts = {continental:false, machine:false}` after each body roll.

### Orbital speed buckets (binding)

- `ORBITAL_SPEED_BUCKETS.planet = [0.00040, 0.00050, 0.00060, 0.00070, 0.00080, 0.00090, 0.00100, 0.00110]` — 8 values.
- `ORBITAL_SPEED_BUCKETS.moon = ORBITAL_SPEED_BUCKETS.planet.map(s => s * 5)` — 8 values, 5× planet speeds.
- Assignment rule: sort bodies by `orbitR` ascending. For each body, pick a bucket whose value differs from the previous (sorted-neighbor) body's bucket. If all buckets fall through, just take the next bucket modulo 8 to break ties.
- Moons are assigned per-parent separately (sorted by their orbit-around-parent radius).
- Direction is uniformly clockwise — encoded as positive `orbit.spd` (existing rendering already advances `orbitA + frame * orbitSpd`).

### Tutorial seed (binding)

`TUTORIAL_SEED = 0xDEADB33F` overrides the system-type roll. Fixed composition:
- Compact rocky.
- 3 enterable bodies: 1 Continental (size 3 or 4, placed in Goldilocks band) + 1 Desert (size 2 or 3) + 1 Barren (size 1 or 2).
- 2 gas giants (size 7-10), each with rolled moon counts via standard formula (G-03). Place beyond Goldilocks band.
- 1 asteroid field placed between innermost-gas-giant and middle planet.
- Desert planet has 2 moons (rolled via standard formula but truncated to 2).
- Barren planet has 1 moon (same, truncated to 1).
- Continental moons unchanged (will roll 0+).
- Orbital speeds + subtypes still use bucket / palette rolls (deterministic by `seedChild(TUTORIAL_SEED, …)`).

### Combat-design memory (preserve at all times)
- Delta-V coasting is sacred — don't add sustained-thrust energy costs.
- Don't propose blanket per-weapon range falloff; ships always use weapons as defined in `weapons.js`.
- Don't rework `ec.spd` or fighter AI overrides.
- The new mechanics in this plan respect those rules; don't violate them while implementing.

### Assumptions made during planning
- Optimization (F-01) runs **before** the world-size expansion (F-03). Without culling, the larger world will tank framerates.
- Body cap (`MAX_BODY_COUNT = 60`) is applied during moon generation — when reached, halt moon spawning (no retroactive trimming).
- Asteroid fields and HBASE are sites, not bodies; they get info popups (W1, W2) but do not participate in body-kind/subtype rolls.
- BASE and SLIPGATE bypass the info popup and use the existing direct-fire-to-interact prompt (W3).
- "Cleared" no longer hides a planet — it adds a label and is re-enterable. Building destruction state persists per planet via `lvState` (already implemented).

---

## Phase 0 — Optimization & Foundations (sequential)

### F-01. Spatial hash + viewport culling ✅

**Goal:** Stop drawing and updating off-screen overworld objects. Add a spatial hash for proximity queries. This unblocks the world-size expansion in F-03.

**Files:** `spatial.js` (NEW), `overworld.js`, `util.js`

**Outline:**
- `spatial.js`: a fixed-cell spatial hash sized to a configurable bucket dim (`SPATIAL_BUCKET = 800`). API: `mkSpatial(worldW, worldH)`, `spatialAdd(g, x, y, payload)`, `spatialClear(g)`, `spatialQueryRect(g, x0, y0, x1, y1, out)`, `spatialQueryRadius(g, x, y, r, out)`. Buckets stored as a `Map<bucketKey, payload[]>`. Reused each frame after `spatialClear`.
- In `overworld.js`, build `G.OW.spatial` lazily on first frame after `initOW`. Re-populate inside `updOW` before any iteration that depends on it:
  - planets (currently `for(let i=0;i<LV.length;i++)` in `updOW` and `drawOW`)
  - asteroid fields
  - fleets
  - HBASE, BASE, SLIPGATE
- Iteration replacement: in `updOW`, replace the linear nearP / nearAst / nearHBase / nearSlipgate loops with `spatialQueryRadius(g, s.x, s.y, MAX_INTERACT_R, out)` and filter by entity kind. In `drawOW`, compute camera-bounds rect `(cam.x - 60, cam.y - 60, cam.x + W + 60, cam.y + H + 60)` and only draw entities returned by `spatialQueryRect`.
- Add `OW_CULL_PAD = 60` for the rect query margin.
- Orbital path drawing in `drawOWOrbitGuides` is the most expensive static pass — split into per-body draws and skip a body's orbit ring when both that body's expected screen position **and** the player are outside the ring's bounding box. Approximation: skip when the player's camera rect doesn't intersect the orbit's bounding annulus.
- Asteroid belt: continue using the existing per-frame draw, but skip if `AB.length === 0` (already done) and add a one-line check that camera rect intersects `(OW_W/2 - maxAbR, OW_H/2 - maxAbR, …)`.
- **No** changes to the dust/particle layer (per user: low-impact).
- Iteration generalization: the new spatial hash takes `{x, y, r, kind, ref}` payloads. `kind` ∈ `'planet' | 'asteroid' | 'fleet' | 'base' | 'hbase' | 'slipgate' | 'body'`. The `'body'` kind is added in B-04 when BODIES[] lands; for now only the existing kinds are populated.
- `OW_INDICATOR_RANGE = 900` → bump to `Math.max(900, Math.min(OW_W, OW_H) * 0.15)` so off-screen indicators scale with world size.

**Depends on:** —

**Acceptance:** Default seed renders identically to before. Framerate measurement (in-browser perf tab) shows the per-frame `drawOW` cost dropping when the player is in a corner of the map (away from most bodies). `console.log(spatialQueryRadius(...).length)` returns the expected count near each body.

---

### F-02. BODIES[] data structure & body registry ✅

**Goal:** Introduce `BODIES[]` as the single source of truth for celestial-body data. Define the kind/subtype registry, palettes, atmosphere tables, and size-derived helpers. No generation logic yet — that lands in Phase 1.

**Files:** `data/bodies.js` (NEW), `data/system-types.js` (NEW), `bodies.js` (NEW), `state.js`

**Outline:**
- `data/bodies.js`:
  - Declare `BODY_KINDS = ['star','gas_giant','habitable','uninhabitable']`.
  - Declare `BODY_SUBTYPES = {habitable:['desert','arctic','continental','rocky','ocean'], uninhabitable:['barren','volcanic','liquid','machine']}`.
  - `BODY_SIZE_BY_KIND = {star:[15,20], gas_giant:[7,10], habitable:[2,4], uninhabitable:[1,6]}`.
  - `CONTINENTAL_SIZE_RANGE = [3,4]`.
  - `MOON_SIZE_CAP_BY_PARENT_SIZE` — function `moonMaxSize(parentSize)` returning 1 (parent 3-5), 2 (parent 6-8), or 3 (parent 9-10). Parent size <3 → 0 (no moons).
  - `SURFACE_SCREEN_MULT_BY_SIZE = [null, 1, 2, 2.5, 3, 3.5, 4]` (size 1-6, null for unused index 0).
  - `FELT_GRAVITY_BY_SIZE = [null, 0, 0.002, 0.005, 0.009, 0.014, 0.020]` (size 1-6).
  - `BODY_DRAW_BASE_PX = 10`, `BODY_DRAW_PER_SIZE_PX = 6`. `bodyDrawRadius(size) = BODY_DRAW_BASE_PX + size * BODY_DRAW_PER_SIZE_PX`.
  - `SUBTYPE_PALETTES = { ... }` (literal hex arrays per Conventions: Palettes).
  - `ATMO_KINDS`, `ATMO_DRAG_PER_FRAME`, `ATMO_DRAG_CAVE_TUNNEL_FACTOR`, `ATMO_STAR_OPACITY`, `ATMO_RANGE_BY_SUBTYPE` (per Conventions: Atmosphere).
  - `SUBTYPE_WEIGHTS = { ... }` (per Conventions: Subtype weight tables).
  - `ORBITAL_SPEED_BUCKETS = {planet:[…8 values…], moon:[…planet × 5…]}` (per Conventions: Orbital speed buckets).
  - `MAX_BODY_COUNT = 60`.
  - `GOLDILOCKS_INNER = 0.35`, `GOLDILOCKS_OUTER = 0.65`.
  - `assertBodiesRegistry()` validates: every `BODY_KIND` has a size range; every habitable/uninhabitable subtype has a palette entry; weight tables sum to ~100; bucket lists are length 8. Called at module load (same pattern as `assertBuildingRegistry`).
- `data/system-types.js`:
  - `SYSTEM_ARCHETYPES = [...]` per Conventions: System archetypes.
  - `SYSTEM_ARCHETYPE_MAP` keyed by id.
  - `rollSystemArchetype(rng)` — picks weighted (0.5/0.3/0.2) using single roll.
  - `assertSystemTypeRegistry()` — weights sum to 1; counts are valid integer ranges.
- `bodies.js`:
  - `var BODIES = [];` global.
  - `bodyById(id)` — linear scan (fast enough at ≤60).
  - `enterableBodies()` — returns bodies with `kind === 'habitable'` or `kind === 'uninhabitable'`.
  - `planetsOf(parentId)` — returns bodies with `parentId === parentId` (used for moons of a planet).
  - `bodyChildren(id)` — alias for `planetsOf` (sometimes reads better).
  - `bodyOWPos(b)` — `parentId === null` → `{x: OW_W/2, y: OW_H/2}` (star); else parent position + `(cos/sin)*orbit.r` based on `parentOWPos + orbitA + G.owFr * orbitSpd`. Recursive: parent of a moon is a planet whose own position needs computing first. Cache per-frame in `b._cachedPos` and invalidate at frame start.
  - `bodyOWGravityVector(b, x, y)` — `{ax, ay}` for additive overworld wells (used in F-06).
- `state.js`: replace `let LV=[]; let PP=[]; let AB=[]; let AB_BELT=[]; let HBASE=null; let SLIPGATE=null;` with `let BODIES=[]; let AB=[]; let AB_BELT=[]; let HBASE=null; let SLIPGATE=null;` (asteroid/HBASE/SLIPGATE remain as non-body sites for now; PP and LV are gone). Keep `BASE=null;`.

**Depends on:** F-01

**Acceptance:** `BODIES = []` exists at boot; `bodyDrawRadius(1) === 16`, `bodyDrawRadius(10) === 70`, `bodyDrawRadius(20) === 130`. `assertBodiesRegistry()` and `assertSystemTypeRegistry()` pass at boot. No game-state regression (BODIES is empty, gen still calls old code paths until F-03/G-* swap it).

---

### F-03. World size scaling ✅

**Goal:** Increase `OW_W`/`OW_H` to scale with body count. Tune orbit radii to fit. Verify culling from F-01 keeps perf in check.

**Files:** `util.js`, `state.js`, `gen.js`, `overworld.js`

**Outline:**
- `util.js`: replace `const OW_W=6000, OW_H=6000;` with `let OW_W=16000, OW_H=16000;`. Add `function setOWBounds(w, h){ OW_W = w; OW_H = h; if(G?.OW?.spatial) G.OW.spatial = null; }` (spatial hash is nulled so it rebuilds at next-frame size).
- `state.js`: `ORBIT_MIN_R` becomes a base value `1000`. `ORBIT_MAX_R` becomes a function `orbitMaxR()` returning `OW_W * 0.45` (so the outermost slipgate sits at 7200 of 16000, with 800-px outer padding).
- `gen.js`: at the top of `genWorld`, compute final world size after counting bodies. Until G-01 lands, leave the default at 16000². When G-01 lands, the formula becomes `OW_W = OW_H = max(16000, 7000 + bodyCount * 250)` and is set via `setOWBounds` before any positioning.
- `overworld.js`: confirm `cam` clamps respect the new bounds (the existing `Math.min(OW_W-W, …)` works because OW_W is referenced live). Verify the corner brake zone (`bz=600`) doesn't need tuning at 16k — it's a soft edge, fine. Bump `OW_INDICATOR_RANGE` calc per F-01.
- Update `genHBaseBody`, `genSlipgateBody`, `genABodies`, and `genOWBodies` to use `orbitMaxR()` instead of the constant.
- Slipgate gets the outermost orbit slot: after all other placement, slipgate's `orbit.r = max(otherOrbits) + 400 + rng.fl(0, 200)`. It no longer has a hardcoded `ORBIT_MAX_R`.

**Depends on:** F-01, F-02

**Acceptance:** Default seed renders. Slipgate is the outermost site (verified by `console.log(SLIPGATE.orbitR)` exceeding every planet/asteroid/HBASE orbitR). Framerate ≥ pre-rework on the same seed (culling from F-01 absorbs the size bump).

---

### F-04. Save format pivot to bodyId ✅

**Goal:** Replace numeric-index keying in `lvState` / `cleared` / `lastLocation` with stable body ids.

**Files:** `save.js`, `state.js`, `objectives.js`, `site.js`

**Outline:**
- `save.js`:
  - `defaultSave()`: `cleared: {}` (was `[]`), `lvState: {}` (unchanged shape but now keyed by string).
  - `normalizeLastLocation`: accept `{seed, kind, bodyId?}`. `kind ∈ ['base','slipgate','body','asteroid','hbase']` (planet → body). Drop `index`.
  - Bump `SAVE_KEY` to `'phantom_save_v3'` so old saves don't conflict (per "no migration" — playtesters wipe).
- `state.js`:
  - `recordLastLocation(kind, bodyId=null)` writes `{seed: G.seed, kind, bodyId}`.
  - `spawnPointForLastLocation(loc)` looks up by `bodyId` via `bodyById(loc.bodyId)`.
  - `clearedForPlanets(src)` becomes `clearedForBodies(src)` returning `{}` (object) keyed by id; helpers that previously took an index now take an id.
  - `planetState(pi)` → `bodyLevelState(bodyId)`.
- `objectives.js`:
  - `objectiveId(type, bodyId=null)` (was `planetIdx`). `objectiveLabel(type, bodyId=null)` derives label from `bodyById(bodyId)?.id?.toUpperCase()` like `"P1 REACTOR DESTROYED"` (using planet's index in `BODIES`, e.g. P1, M3 etc.).
  - All `o.planetIdx` references → `o.bodyId`.
  - `syncPlanetCleared(bodyId)`, `syncAllPlanetCleared` iterates `enterableBodies()`.
- `site.js`: replace `G.lv` (numeric) with `G.lvBodyId` (string). Update `enterPlanet`, `completePlanetSite`, etc. Where existing code uses `G.lv` as an array index into `LV`/`PP`/`G.cleared`, update to a `bodyById` lookup.
- `G.lv` deprecation: search-and-replace across all touchpoints (`overworld.js:262`, `site.js`, etc.) to `G.lvBodyId`. The site state object also carries `site.bodyId` (was `site.planet`).

**Depends on:** F-02, F-03

**Acceptance:** Save round-trips a one-objective-complete state across browser refresh. `G.lvBodyId` is a string. `G.cleared.p2 === true` after completing all objectives on body `p2`. Old save key (`phantom_save_v2`) is ignored.

---

### F-05. UI_REWORK_PLAN.md notes ✅

**Goal:** Update UI_REWORK_PLAN.md so that the screens it adds (SiteMap, system map screen, RunSummaryPanel-as-it-relates-to-bodies) match the new body system.

**Files:** `UI_REWORK_PLAN.md`

**Outline:**
- Append a section after the `Assumptions made during planning` block titled `### Cross-plan notes (Overworld & Star System Overhaul)`:
  - **SiteMap widget (F-09)** — only **planets** (parent bodies) are nodes. Moons are not nodes on the map; they appear as a sub-list in the right-side info card when a planet is focused. Asteroid fields, BASE, HBASE remain as their own nodes (not children).
  - **System Map submenu (P4-02)** — the right-side info card has two sections: `selected · <planet>` (kind/subtype, atmosphere, gravity, objectives) and a moon sub-list (navigable up/down) where the first row is the parent planet itself.
  - **`G.system.sites` shape change** — was a flat list of `{id, name, kind, objectives, visited}`. Now `kind ∈ {'planet','gas_giant','asteroid','base','hbase','slipgate'}` (no `'moon'`); each planet entry includes `moons: [{id, kind, subtype, size, atmoKind, populationClass, objectives}]`.
  - **New registered DOM screen `body-info`** — entry popup shown before player enters a site (size, gravity, type/subtype, population density, atmosphere, objectives + an `enter` button). Pauses the world.
  - **New registered DOM screen `body-select`** — selection popup shown when multiple interactable sites are within the player's interaction radius. Lists each as a focusable row; confirming a row either opens `body-info` (for enterable bodies) or fires the direct-interact action (for BASE / SLIPGATE).
- No code changes — pure plan doc edits.

**Depends on:** —

**Acceptance:** UI_REWORK_PLAN.md contains the new notes section; existing UI rework tasks (P4-02, F-09) reference the changes consistently when read.

---

## Phase 1 — System & body generation (sequential)

### G-01. System archetype roll & body count

**Goal:** Replace the fixed 2d5-planets roll with the archetype-driven body count.

**Files:** `gen.js`

**Outline:**
- New `function rollSystemComposition(seed)`:
  - `const arch = rollSystemArchetype(mkRNG(seedChild(seed, 0x4000)))`.
  - `const huRng = mkRNG(seedChild(seed, 0x4001))`, `gasRng = mkRNG(seedChild(seed, 0x4002))`.
  - `huCount = huRng.int(arch.hu[0], arch.hu[1])`.
  - `gasCount = gasRng.int(arch.gas[0], arch.gas[1])`.
  - Returns `{archetypeId: arch.id, huCount, gasCount}`.
- `genWorld(seed)`:
  - If `seed === TUTORIAL_SEED`, skip the roll and use the hardcoded composition from G-05.
  - Else call `rollSystemComposition(seed)`.
  - Set `OW_W = OW_H = max(16000, 7000 + (1 + huCount + gasCount) * 250)` via `setOWBounds`, before placement.
- Store on `G.systemFlavor.archetypeId` for save/debug; persist in `systemStates[seed].systemArchetype` for cross-reference.

**Depends on:** F-02, F-03

**Acceptance:** Random seed sweep verifies the archetype roll lands on 0.50/0.30/0.20 frequencies (eyeball over 100 seeds). World size scales: a system with 12 bodies has `OW_W ≈ 16000`; a system with 25 bodies has `OW_W ≈ 13250` → clamped to 16000 floor.

---

### G-02. Body kind/subtype generation pipeline

**Goal:** Roll each non-moon body's size, kind (habitable / uninhabitable / gas_giant), subtype, palette, atmosphere. Enforce Goldilocks band, size-range constraints, and Continental/Machine mutex.

**Files:** `gen.js`, `bodies.js`

**Outline:**
- New `function rollHUBody(seed, sysLockouts, orbitR, maxR)`:
  - `rng = mkRNG(seed)`.
  - `size = rng.int(1, 6)` (preliminary uninhabitable range — habitable narrows in next steps).
  - Determine kind:
    - If size ≥ 2 AND size ≤ 4 AND `orbitR ∈ [GOLDILOCKS_INNER*maxR, GOLDILOCKS_OUTER*maxR]` → 50% habitable, 50% uninhabitable.
    - Else → always uninhabitable.
  - If habitable: pick subtype by weighted `SUBTYPE_WEIGHTS.habitable`, filtered: drop Continental if `size < 3` or `sysLockouts.continental`, drop nothing else.
    - If pool empty after filter, fall through to uninhabitable.
    - On Continental pick: set `sysLockouts.continental = true; sysLockouts.machine = true;` (mutex extends to Machine).
  - If uninhabitable: pick subtype by `SUBTYPE_WEIGHTS.uninhabitable`, filtered: drop Machine if `sysLockouts.machine`.
    - On Machine pick: set `sysLockouts.machine = true; sysLockouts.continental = true;`.
  - Roll palette colors deterministically (two distinct entries for terrain, one for sea if applicable).
  - Roll atmosphere kind uniformly from `ATMO_RANGE_BY_SUBTYPE[subtype]`. Star and gas giants don't reach this fn.
  - Roll `populationClass` for habitable: 20% none / 40% sparse / 30% moderate / 10% dense (uniform per body). Uninhabitable → `'uninhabited'`. Override: Continental → 60% moderate / 40% dense (never none/sparse). Rocky → 50% none / 30% sparse / 20% moderate (never dense). Machine → `'uninhabited'` (literally; populated with drone factories, not civilians).
  - Returns `{kind, subtype, size, palette, atmoKind, populationClass}`.
- New `function rollGasGiant(seed)`:
  - `size = rng.int(7, 10)`, `kind = 'gas_giant'`, no subtype.
  - Palette from `SUBTYPE_PALETTES.gas_giant.bands` (pick 2-3 bands for the body's visual).
  - No atmo, no populationClass.
- New `function rollStar(seed)`:
  - `size = rng.int(15, 20)`, kind `'star'`, palette from `SUBTYPE_PALETTES.star`. No subtype.
- `genWorld(seed)` body-generation block (after archetype roll):
  1. Initialize `BODIES = []` with star: `BODIES.push({id:'star', ...rollStar(...)})`.
  2. Initialize empty `placedOrbits = []`, `sysLockouts = {continental:false, machine:false}`.
  3. Pre-reserve slot 0 as habitable: roll the **first** HU body with a forced-habitable retry loop (up to 10 attempts). If it lands on uninhabitable after the retries, fall back to forcing a Continental in the Goldilocks band (size 3 picked deterministically).
  4. Roll remaining `huCount - 1` HU bodies. Each gets an orbit radius via `rollOrbit(rng, placedOrbits)` (see G-04).
  5. Roll `gasCount` gas giants. Their orbit radii are constrained to `≥ 0.5 * maxR` (outer half only).
  6. Sort BODIES (planets only) by `orbit.r` ascending. Assign stable ids `p0, p1, …` in that order.
  7. Generate per-body `level` (surface, tunnel, cave) via existing `genPlanet` path — but the input now is `(body, seedChild(seed, 0x7000+i))` instead of a `tmpl`. The level generator pulls `worldW` scale, atmosphere, palette, etc. from the body. See S-01 for surface-size scaling. Gas giants and stars get no `level`.
- Asteroid fields (existing `genABodies`) — keep existing 0-3 range but cap at 2 per system (`MAX_AST_FIELDS = 2`). Place between innermost gas giant and middle planet when possible; fall back to current placement if no gas giants exist.
- HBASE & SLIPGATE placement unchanged in concept (special non-body sites), but their orbits are placed in the same `placedOrbits` pass to avoid collision.
- Drop `genPlanetTmpl` entirely. The `nObs / nEn / nFu / rxHp / grav / pr / pcol / col / bg` fields it generated are now derived from the body (`pr = bodyDrawRadius(size)`, `grav = FELT_GRAVITY_BY_SIZE[size]`, palette directly from body, counts deterministic per subtype — see S-01 for surface, existing genCaveLevel still takes `nObs/nEn/nFu/rxHp` as integers from body fields).
- Add `bodySurfaceCounts(body)` in `bodies.js`: returns `{nObs, nEn, nFu, rxHp}` derived from size and subtype. Use existing ranges for backward compat: `nObs = rng.int(2 + size, 5 + size)`, etc.

**Depends on:** G-01

**Acceptance:** A seed sweep verifies: (a) every system has ≥1 habitable body; (b) no system has both Continental and Machine; (c) habitable bodies always sit in the Goldilocks band; (d) gas giants always sit beyond `0.5 * maxR`; (e) subtype distribution roughly matches the weight tables over 200 seeds.

---

### G-03. Moon generation

**Goal:** For each planet (non-star, non-gas-giant when applicable), roll moon count and per-moon size. Enforce body cap (60).

**Files:** `gen.js`, `bodies.js`

**Outline:**
- New `function moonCountForSize(rng, parentSize)`:
  - If `parentSize < 3` → 0.
  - Dice formula: roll `2dN - 2` where `N = ceil((parentSize + 2) / 2)`. For parent size 3 → 2d3-2 (range 0-4, peak 2); size 6 → 2d4-2 (range 0-6, peak 3); size 10 → 2d6-2 (range 0-10, peak 5).
  - Cap at `parentSize`.
- New `function rollMoonSize(rng, parentSize)`:
  - Start at 1. While `currentSize < moonMaxSize(parentSize)`, roll 25% to upgrade. Stop on first non-upgrade or when cap hit.
  - Distribution at parent size 9-10: 75% size 1 / 18.75% size 2 / 6.25% size 3.
- New `function rollMoonForPlanet(seed, parentBody)`:
  - Determine size via `rollMoonSize`. Size-1 moon → roll subtype from uninhabitable table only. Size ≥ 2 → use the standard 50/50 habitable roll (but moons don't depend on Goldilocks — moons always allow the habitable roll because they're in the parent's local frame).
  - Apply the same Continental/Machine mutex as planets (`sysLockouts` is global to the system).
  - Roll palette, atmosphere, populationClass.
  - Roll orbit radius around parent: `pr_parent * 2.2 + rng.fl(0, pr_parent * 2.5)`, with `pr_parent = bodyDrawRadius(parentSize)`.
  - Roll orbit speed bucket from `ORBITAL_SPEED_BUCKETS.moon` (5× planet speeds).
- Moon-spawning order: iterate planets sorted by `orbit.r` ascending (closest to star first), spawn each planet's moons in that order. When `BODIES.length === MAX_BODY_COUNT`, halt all further moon spawning.
- Tutorial seed (G-05) clamps moon count for the Desert (2) and Barren (1) planets after rolling.
- Each moon gets a stable id `m<parentIndex>.<moonIndexWithinParent>` (e.g., `m2.0`).
- Continue calling existing `genPlanet`-equivalent on each moon to generate level data (surface + tunnel + cave per S-01 scaling). Size-1 moons get a small surface (1× current planet width per the new size table).

**Depends on:** G-02

**Acceptance:** Sample seed produces a system where: closest planets to the star get moons first; moon count distribution matches the dice formula over 100 seeds; `BODIES.length ≤ 60`; size-3 parent's moons are all size 1; size-10 parent's moons follow 75/18.75/6.25.

---

### G-04. Orbital speed buckets & staggered placement

**Goal:** Assign orbital radii and speeds such that no two adjacent orbits share a bucket (staggers visual motion).

**Files:** `gen.js`, `bodies.js`

**Outline:**
- `rollOrbit(rng, placedOrbits, options={})`:
  - `options.minR / maxR` clamps. `options.zone` ('inner', 'outer', 'goldilocks') restricts placement.
  - Pick a candidate radius via `rng.fl(minR, maxR)`. Reject if any prior orbit is within `MIN_ORBIT_SEPARATION = bodyDrawRadius(maxSize) + 24` px. Up to 30 attempts; on exhaustion, accept anyway (log warn).
- `assignOrbitalSpeed(body, neighborBuckets, isMoon)`:
  - Buckets array = `ORBITAL_SPEED_BUCKETS.moon` if moon else `ORBITAL_SPEED_BUCKETS.planet`.
  - Sort all bodies (of the same parent) by `orbit.r` ascending. For each, pick a bucket that's not equal to the prior body's bucket; if all 8 buckets fall through (shouldn't happen with reasonable counts), use the next bucket modulo 8.
  - `body.orbit.spd = buckets[chosenIdx]`.
- After body placement, run `assignOrbitalSpeed` for: planets (parented to star), then moons-of-planet-1, moons-of-planet-2, etc. independently.
- Existing `orbitSpdFor(orbitR)` is now obsolete. Remove. Replace all call sites with bucket-based assignment.

**Depends on:** G-03

**Acceptance:** Sample seed with 8 planets: no two adjacent planets share an `orbit.spd`. Moons orbit visibly faster than planets (verify by eye in a browser). `console.log(BODIES.map(b => b.orbit.spd))` shows the bucket values.

---

### G-05. Tutorial seed override

**Goal:** Force a deterministic composition for `TUTORIAL_SEED = 0xDEADB33F`.

**Files:** `gen.js`

**Outline:**
- New `function genTutorialSystem(seed)`:
  - Star: size rolled normally from `seedChild(seed, 0x4100)`.
  - 3 planets:
    - Continental (size 3 from `seedChild(seed, 0x4101)`), placed in Goldilocks band.
    - Desert (size 2 or 3, deterministic), placed inner.
    - Barren (size 1 or 2, deterministic), placed inner-most.
  - 2 gas giants placed beyond `0.5 * maxR`; subtype band-palettes rolled normally.
  - 1 asteroid field between innermost gas giant and middle planet.
  - Moons:
    - Desert: 2 moons (clamp moon count rolled via standard formula).
    - Barren: 1 moon (clamp).
    - Continental: standard roll (0+).
    - Gas giants: standard roll.
  - All orbital speeds assigned via standard bucket logic.
- `genWorld(seed)`: branch on `seed === TUTORIAL_SEED` and call `genTutorialSystem` instead of the archetype-driven path.
- HBASE present (existing tutorial path keeps HBASE active). SLIPGATE present at outermost orbit per F-03.

**Depends on:** G-04

**Acceptance:** Loading `phantom.html` with the tutorial seed renders the fixed composition: 1 star, 3 named-type planets, 2 gas giants, 1 asteroid field, expected moon counts. Re-loading produces an identical layout.

---

## Phase 2 — Surface scaling & new terrain (sequential)

### S-01. Per-size surface worldW scaling

**Goal:** Surface size scales with body `size`, replacing the fixed `screens = rng.int(8, 14)` roll.

**Files:** `data/levels.js`, `bodies.js`, `site.js`

**Outline:**
- `genSurface(body, seed, sites)`:
  - `const baseScreens = mkRNG(seedChild(seed, 0x7400)).int(8, 14);`
  - `const mult = SURFACE_SCREEN_MULT_BY_SIZE[body.size] || 1;`
  - `const screens = Math.round(baseScreens * mult);`
  - `const worldW = screens * W;`
  - All other surface metrics (terrain regions, building zones, defense counts) continue to scale with `worldW` via existing per-region width ranges. Drone factory / civ zone counts implicitly scale because they're rolled against `surfaceFlatSpans(d)` length.
- Ocean and Liquid subtypes: pass a flag `surface.dominantSea = true` to the region generator (consumed in S-02) so 75-90% of segments are sea.
- Update `genTunnel`, `genCaveLevel` — for moons with `size < 3`, use the lower bound of `worldH` (no need to lengthen the underground for tiny bodies).

**Depends on:** G-05

**Acceptance:** A size-1 surface is roughly current-planet width (8-14 screens). A size-6 surface is 4× wider (32-56 screens). Existing surface gameplay (turrets, towers, civilians, dishes) populates correctly at all sizes.

---

### S-02. Sea region kind

**Goal:** Introduce `'sea'` as a new surface region kind. Sea is flat geometry but with special damage/visual rules (handled in P-04).

**Files:** `data/levels.js`, `site.js`

**Outline:**
- Add `'sea'` to `SURFACE_REGION_DEFS`. Width range matches `'flat'` (200-600 px). Weight 0 by default — sea placement is **not** part of the random `pickSurfaceRegionKind` roll.
- New `applySeaToSurfaceRegions(surface, body, rng)`:
  - Continental: convert 1-3 random `flat` regions to `sea`.
  - Ocean: convert ~85% of regions to `sea`, leaving 10-25% as island clusters of 1-3 contiguous `flat`/`plateau` regions.
  - Volcanic: convert 0-2 random small `flat` regions to `sea` (lava sea, palette uses subtype `sea` array).
  - Liquid: same as Ocean.
  - Machine: convert 0-2 random `flat` regions to `sea`. Sea color uses cool gray dark or neon green/yellow per subtype palette.
  - Other subtypes (Desert, Arctic, Rocky, Barren): no sea.
- `surfaceFlatSpans(d)` continues to treat `sea` regions as flat (buildings can sit on islands; sea segments aren't candidates for building placement — exclude via filter in caller).
- `genTerrainSea(rng, terrain, region, y0, y1)`: emits a perfectly flat segment at `(y0+y1)/2` plus tiny noise (±1 px). Persists `region.kind = 'sea'`.
- `surfaceRegionAt(d, x)` already returns the kind — no change.
- Building placement helpers (`placeCivBuildingsInZone`, etc.) gain a guard: skip any zone whose region kind is `'sea'`.

**Depends on:** S-01

**Acceptance:** A Continental body has 1-3 sea segments amidst the land; an Ocean body is mostly sea with small islands; buildings only appear on non-sea regions.

---

### S-03. Volcano generator (normal + active)

**Goal:** Convert qualifying mountains to volcanoes. Some volcanoes become active (uninhabitable only).

**Files:** `data/levels.js`, `bodies.js`

**Outline:**
- After `genSurfaceTerrain` returns, post-process the mountain regions:
  - For each `mountains` region, find every peak with both-side slopes steeper than ~0.5 rad.
  - Per body:
    - `volcanic` subtype: 10% chance per qualifying peak.
    - other uninhabitable subtypes: 1% chance.
    - habitable subtypes: 1% chance.
  - For each converted peak, emit a small basin (drawn as normal terrain — 4-6 points dipping down ~10-20 px, forming a shallow crater rim) and a `volcano` data entry `{x, y, peakY, basinPts:[…], active, lavaY, …}`.
- `active` flag (per converted volcano):
  - `volcanic` subtype: 25% chance.
  - other uninhabitable subtypes: 10% chance.
  - **Habitable subtypes: 0%** (never active on habitable bodies).
- Persist on `surface.volcanoes = [{x, y, basinPts, active, lavaY, ...}]`.
- Lava line: just the y-coordinate inside the basin at which the glowing orange line is drawn (the basin geometry is part of the regular terrain polygon).
- Draw layering: in `drawSurface`, after drawing terrain, iterate `surface.volcanoes` and stroke a glowing orange line from basin-left to basin-right at `lavaY`. Active volcanoes pulse slightly.

**Depends on:** S-02

**Acceptance:** A Volcanic surface has ~10% of mountains converted (visible glowing crater openings); other uninhabitable bodies have rare conversions; Habitable bodies have rare conversions but none are active.

---

### S-04. Active volcano fireball runtime

**Goal:** Active volcanoes spawn fireballs at randomized intervals. Fireballs are a new projectile kind.

**Files:** `site.js`, `data/levels.js` (visual hook only)

**Outline:**
- New per-volcano state on `surface.volcanoes[i]`: `{nextFireballFrame: rng.int(60, 180)}`.
- New site array: `site.fireballs = []`. Each fireball `{x, y, vx, vy, l, dmg:30, fromVolcano:i}`.
- New tick in `updSurface` (or wherever surface-update is dispatched):
  - For each active volcano, `if (--v.nextFireballFrame <= 0)` → spawn a fireball at `(v.x, v.lavaY)` with `vy = rng.fl(-4, -2.5)` (upward), `vx = rng.fl(-2, 2)`, `l = 240`. Reset timer.
  - Per-frame: each fireball `vy += 0.18` (gravity), `x += vx; y += vy; l--`. Despawn when `y > terrainAt(x)` (lands) or `l <= 0`.
  - Collision: if `Math.hypot(s.x - fb.x, s.y - fb.y) < shipShieldHitRadius(s)` → standard shield-first damage path with `kind:'fireball'`. Removes fireball.
- Visual: glowing orange/red dot trailing particle (existing `boomAt` trick on emit and despawn).
- Audio: brief `tone(180, .15, 'sawtooth', .06)` on emit.

**Depends on:** S-03

**Acceptance:** Standing near an active volcano on a Volcanic surface produces periodic fireballs that arc and threaten the ship; ship takes 30 dmg on contact (shield-first).

---

### S-05. Machine world surface generation

**Goal:** Machine surfaces always have 4-8 drone factories. Civilian residences/infrastructure don't spawn on Machine worlds.

**Files:** `data/levels.js`, `data/building-types.js`, `objectives.js`

**Outline:**
- In `genSurface`, branch on `body.subtype === 'machine'`:
  - Skip `genSurfaceCivilians`.
  - Force `surface.civPopulation = 'uninhabited'` (display label "uninhabited" — same as other uninhabitable bodies; per V3).
  - Override drone-factory count: 4-8 placed via the existing placement logic (loop with attempts, similar to civilian placement). The standard 0-1 random drone factory on non-machine bodies is unaffected.
- `data/building-types.js`: add `category: 'infrastructure'` to `DRONE_FACTORY` row. This intentionally makes drone factories count toward `civ_infrastructure` objectives on **non-machine** bodies (because the 50% threshold is per-body). On machine worlds, the **new** `machine_factories` objective takes precedence (see O-03).
- `objectives.js` (preview of O-03): on machine bodies, emit `MACHINE_FACTORIES` objective instead of `CIV_INFRASTRUCTURE`.

**Depends on:** S-04, P1-04 from IMPLEMENTATION_PLAN.md (drone factory class exists)

**Acceptance:** Machine-world surface has 4-8 drone factories, zero civilian residences/infrastructure, populationClass label "uninhabited" in the info popup.

---

## Phase 3 — Physics & camera (parallelizable after Phase 2)

### P-01. Felt gravity per size

**Goal:** Apply `FELT_GRAVITY_BY_SIZE[body.size]` as gravity on surface, tunnel, and cave instead of the per-body `tmpl.grav` value.

**Files:** `site.js`, `data/levels.js` (drop `grav` field), `bodies.js`

**Outline:**
- `bodies.js`: `feltGravityForBody(body) { return FELT_GRAVITY_BY_SIZE[body.size] || 0; }`. Index 1-6 only; bodies size 7+ don't have surfaces.
- `site.js`: in the surface/tunnel/cave gravity tick (search for current `tmpl.grav` reference), replace with `feltGravityForBody(site.body)`.
- Drop the `grav` field from `bodySurfaceCounts(body)` and from the body's `level.surface`. Tunnels/caves use the same value.

**Depends on:** F-04

**Acceptance:** Size-1 surface has zero gravity (ship floats freely). Size-6 surface drags the ship down noticeably faster than current default. Tweaking `FELT_GRAVITY_BY_SIZE[4]` and reloading changes only size-4 bodies.

---

### P-02. Atmospheric drag

**Goal:** Apply per-frame velocity multiplier on the ship based on `body.atmoKind` in surface / tunnel / cave. Caves and tunnels get 50% of surface drag.

**Files:** `site.js`, `bodies.js`

**Outline:**
- `bodies.js`: `dragMultForBody(body, stage)`:
  - `const base = ATMO_DRAG_PER_FRAME[body.atmoKind] || 1`.
  - If `stage === 'surface'` → `base`.
  - If `stage === 'tunnel' || stage === 'cave'` → `1 - (1 - base) * ATMO_DRAG_CAVE_TUNNEL_FACTOR`.
- `site.js`: in the per-frame ship update for site mode, after thrust/gravity, apply `s.vx *= mult; s.vy *= mult` where `mult` comes from `dragMultForBody(site.body, site.d.kind)`.
- No drag in overworld (vacuum). No drag in encounter (separate space).

**Depends on:** P-01

**Acceptance:** A `thick`-atmosphere body slows the ship noticeably in surface; a `none`-atmosphere body has no drag. In a cave, drag is half as strong as the same body's surface.

---

### P-03. Background star opacity per atmosphere

**Goal:** Make background stars fade with atmosphere thickness in the surface stage.

**Files:** `site.js` (or wherever surface star background is drawn — check `drStars` callers)

**Outline:**
- In `drawSurface`, before drawing the star background, set `cx.globalAlpha = ATMO_STAR_OPACITY[site.body.atmoKind] || 1` and restore after.
- Tunnel/cave: no stars (per Conventions). Confirm existing code already skips stars in those stages — if not, gate the call.

**Depends on:** P-02

**Acceptance:** A `thick`-atmo body shows nearly no background stars; a `none`-atmo body shows full starfield.

---

### P-04. Sea damage + ripple

**Goal:** Sea segments deal half-damage of hard terrain (`(spd/divisor) * 25` instead of `* 50`) on contact, and emit a ripple visual.

**Files:** `site.js`, `data/levels.js` (visual)

**Outline:**
- `SEA_DAMAGE_PER_SPEED = 25` (vs hard terrain `50` in `applyShipBounce`).
- In `applyShipBounce`, detect whether the impacted region is `sea`:
  - At collision normal/point, do `surfaceRegionAt(site.d, x)`. If `'sea'`, use `25 * (spd/divisor)` instead of `50 * (spd/divisor)`.
- New particle helper `emitSeaRipple(site, x, y, seaColor)`:
  - Spawns 3 expanding semicircle particles on `site.pts` with `{kind:'ripple', x, y, r:6, vr:0.6, l:24, c:seaColor}`.
- Update `updPts`/`drPts` to handle the new `kind:'ripple'` (semicircle arc draw, fading alpha).
- Visual only on contact (per H4).

**Depends on:** S-02

**Acceptance:** Hitting a sea segment at the same speed as hard terrain produces ~half damage; a ring of ripple semicircles expands and fades on contact.

---

### P-05. Volcano lava-line damage

**Goal:** Inactive/active volcanoes' lava lines deal 20 damage on contact (shield-first).

**Files:** `site.js`

**Outline:**
- Per-frame in `updSurface`, after ship motion:
  - For each volcano in `site.surface.volcanoes`, do a segment-distance check from ship to the lava line (basin-left x to basin-right x at `lavaY`). If `dist < shipShieldHitRadius(s)`, apply 20 damage via `applyShipDamage` with `kind:'lava'`. Cooldown per-volcano: 30 frames between hits to avoid stunlock.

**Depends on:** S-03

**Acceptance:** Touching the lava line on a volcano deals 20 damage, shield-first; ship takes damage about twice per second on sustained contact.

---

### P-06. Additive overworld gravity wells

**Goal:** Every body (planets, gas giants, moons) contributes a gravity vector to the player ship in the overworld, additive across all wells + the star.

**Files:** `overworld.js`, `bodies.js`

**Outline:**
- `bodyOWGravityVector(body, sx, sy)`:
  - `const p = bodyOWPos(body); const dx = p.x - sx, dy = p.y - sy; const dist = Math.hypot(dx, dy) || 1;`
  - `const K = body.kind === 'star' ? K_STAR : K_STAR * K_BODY_FACTOR * (body.size * body.size) / 25;`
  - `return {ax: dx * K / (dist * dist * dist), ay: dy * K / (dist * dist * dist)};`
- In `updOW`, after the existing `applyShipThrust`/`drainEnergy` block, replace the single-star pull (`s.vx += sdx*500/...`) with:
  - `for (const b of BODIES) { const g = bodyOWGravityVector(b, s.x, s.y); s.vx += g.ax; s.vy += g.ay; }`
  - Preserve the star instant-kill check (`dist < 22` for the star only).
- `K_STAR = 500 * (OW_W / 6000)` (scales with world); `K_BODY_FACTOR = 0.02`. Both exposed as named constants in `bodies.js`.

**Depends on:** F-03, F-04

**Acceptance:** Flying near a planet visibly tugs the ship (weakly). Approaching the star still kills. Slingshot maneuver works around larger planets (size 6) but barely registers around moons (size 1).

---

### P-07. Surface camera zoom enhancement

**Goal:** Zoom out 20% on top of the existing surface zoom; +10% more at the chassis max speed.

**Files:** `site.js`

**Outline:**
- In `cameraZoomTarget('surface', s)` (or the surface-specific branch in `updateWorldCamera`):
  - Base zoom = existing computed value × 0.8 (zoom-out is a smaller zoom factor; 0.8 = 20% more zoomed-out).
  - At chassis max speed: scale to ×0.7 (an additional 10% out from the new base). Speed ratio = `Math.min(1, Math.hypot(s.vx, s.vy) / chassisMaxLinearSpeed(s))`.
  - Final zoom = base × (1 - speedRatio * (1 - 0.7/0.8)) — i.e., interp from 0.8 (rest) to 0.7 (max speed).
- `chassisMaxLinearSpeed(s)` helper in `state.js`: `Math.max(ch.thrust.fwd, ch.thrust.rev, ch.thrust.strafeL, ch.thrust.strafeR) * 30` (rough cap; existing code already converges to this without an explicit constant).
- Surface body size **does not** affect zoom (per R3).

**Depends on:** P-06

**Acceptance:** Landing on any surface starts at the new wider zoom; flying at max speed zooms out further by ~10% relative to the zoom at rest. Dynamic-zoom toggle still works (when off, the camera doesn't apply the speed-interp).

---

## Phase 4 — Site interaction & UI (sequential)

### U-01. body-info DOM screen

**Goal:** New `body-info` registered DOM screen displayed when player fires near a single interactable body. Pauses the world.

**Files:** `ui/screens/body-info.js` (NEW), `ui/input-bridge.js`

**Outline:**
- `makeBodyInfoScreen()`:
  - Title row: `body.subtype || body.kind` (e.g., "DESERT") + small id label (`p3`).
  - Body: a grouped column of `KeyValueRow` widgets (per UI rework F-04):
    - `size: <size>`
    - `gravity: <felt label>` (mapped from size: 1=none, 2=very little, 3=some, 4=moderate, 5=high, 6=very high)
    - `type: <kind>` + `subtype: <subtype>`
    - `population: <populationClass>` ("uninhabited" for machine + all uninhabitable)
    - `atmosphere: <atmoKind>`
  - `SectionHeader('objectives')` + one row per objective on this body (using `objectivePanelRows({layout:'planet', bodyId})` — extend `objectives.js` to accept `bodyId` instead of `planetIdx`).
  - Bottom buttons: `enter` (primary) + `back` (cancel). `enter` calls the existing planet-entry path via `enterPlanetByBodyId(bodyId)`.
  - For cleared planets: show objectives section with all ✓; the `enter` button still works.
- `registerScreen('body-info', makeBodyInfoScreen)`.
- On open, pause the world (`G.paused = true`); on close, resume.
- Theme: default green.

**Depends on:** F-04, UI rework F-04 (SectionHeader / KeyValueRow widgets) — if UI rework hasn't landed, use raw DOM with classnames matching the rest of the screen pipeline.

**Acceptance:** Pressing fire near a planet opens the body-info screen. Pressing the enter button starts the surface descent. The back button returns to the overworld unpaused.

---

### U-02. body-select DOM screen

**Goal:** When the player's interaction zone contains ≥2 interactable sites, show a selection screen first.

**Files:** `ui/screens/body-select.js` (NEW), `ui/input-bridge.js`

**Outline:**
- `makeBodySelectScreen()`:
  - Header: `select site` + small dim hint `<N sites in range>`.
  - Body: one focusable row per nearby site. Each row shows `kind` label + `subtype` label (for bodies) or `'hostile base'` / `'asteroid field'` (for non-body sites). Pulse the focused row with `--accent`.
  - Confirming a row:
    - If the row is a body (habitable/uninhabitable) → mount `body-info` for that body (back from body-info returns here).
    - If the row is HBASE → mount `body-info` for HBASE (per W1: type "hostile base", objectives).
    - If the row is an asteroid field → mount `body-info` for the asteroid field (per W2: type "asteroid field").
    - If the row is BASE → directly dock (existing `openBaseMenu()` flow).
    - If the row is SLIPGATE → directly open slipgate (existing `openSlipgateMenu()` flow).
  - Cancel returns to overworld unpaused.
- `registerScreen('body-select', makeBodySelectScreen)`.
- Pauses the world.

**Depends on:** U-01

**Acceptance:** Approaching a planet that overlaps with HBASE and a moon shows a 3-row selector; choosing the moon opens its body-info; choosing HBASE opens HBASE's body-info; cancel returns to overworld.

---

### U-03. Cleared planet visual + re-entry

**Goal:** Cleared planets stay rendered in normal color; show a `cleared` label below the body if it had objectives. Player can re-enter freely.

**Files:** `overworld.js`, `site.js`

**Outline:**
- `drawOW`: in the per-body draw loop (currently `for(let i=0;i<LV.length;i++)`), replace the existing "dashed gray + 'cleared' text" branch with:
  - Always draw the body in its normal palette.
  - If `G.cleared[body.id] === true` AND the body had at least one objective at world-gen: render a small `cleared` label below the body (similar to current near-prompt style: green-ish, font 10 px).
- Remove the gating in the nearP loop that skips cleared planets — the body is always interactable.
- `enterPlanetByBodyId(bodyId)` (existing planet-entry function refactored): drop the `G.cleared` check; always allow entry.
- Surface re-entry: the existing `lvState` persistence already remembers destroyed building bits and dead enemies — no changes needed per U3 in our discussion. Drone factories and air defense bases stop spawning their reinforcements when destroyed (already implemented).

**Depends on:** F-04

**Acceptance:** Clear a planet, leave to overworld; the planet is now labeled `cleared` and is still enterable; entering shows destroyed buildings and no respawned enemies.

---

### U-04. Multi-body interaction detection

**Goal:** Wire the spatial-hash proximity query to detect single vs. multiple interactable sites and route to the right popup.

**Files:** `overworld.js`

**Outline:**
- In `updOW`, replace the existing per-kind nearP / nearAst / nearHBase / nearSlipgate flags with a single `ow.nearSites = []` of `{kind, ref}`.
- Each frame, query `spatialQueryRadius(g, s.x, s.y, MAX_INTERACT_R)` and filter to: enterable bodies (within `body.pr + 28`), HBASE, asteroid fields, BASE, SLIPGATE.
- `MAX_INTERACT_R` = largest `body.pr + 28` plus margin (≈110).
- When `iFir()` fires:
  - `if (ow.nearSites.length === 0)` → no-op.
  - `if (ow.nearSites.length === 1)`:
    - If the single site is BASE → existing `openBaseMenu` path.
    - If SLIPGATE → existing `openSlipgateMenu` path.
    - Otherwise (body, HBASE, asteroid) → open `body-info`.
  - `if (ow.nearSites.length >= 2)` → open `body-select`.
- Keep the existing "[ fire to enter ]" overworld text prompt — show it on the nearest single site, or "[ fire to choose ]" when multi.

**Depends on:** U-02, U-03

**Acceptance:** Single-site approach shows direct popup or direct interact; multi-site approach shows the selector. No more `nearP`/`nearAst`/`nearHBase`/`nearSlipgate` legacy flags.

---

## Phase 5 — Fleets & objectives (parallelizable)

### O-01. Swarm spawn rule update

**Goal:** Swarms only spawn at machine worlds and asteroid fields, never at normal planets.

**Files:** `overworld.js`, `data/fleets.js`

**Outline:**
- `seedSystemFleets(px, py)`:
  - Keep: 2 Hunters orbiting at mid-system, 1 Patrol, 1 ARMADA at HBASE (if HBASE not cleared).
  - Replace the "1 Swarm per uncleared cave" loop with:
    - For each body where `body.subtype === 'machine'`, spawn `MACHINE_SWARM_CAP = 2` Swarms orbiting that body.
    - For each asteroid field, spawn 1 Swarm orbiting that field (one-shot per system visit).
- Machine-world swarms get a new `f.spawnedAtMachine = bodyId` field; asteroid-field swarms get `f.spawnedAtAsteroid = idx`. Used by O-02 for respawn detection.

**Depends on:** Phase 1 complete (machine bodies exist).

**Acceptance:** A system with no machine worlds and no asteroid fields has zero Swarms. A system with 1 machine + 1 asteroid field has 3 Swarms at gen time (2 at machine, 1 at asteroid).

---

### O-02. Machine-world Swarm respawn timer

**Goal:** Swarms killed at a machine world respawn until all drone factories on that world are destroyed. Timer scales with remaining factories.

**Files:** `overworld.js`, `bodies.js`

**Outline:**
- New per-body state `body.machineSwarmRespawnTimer = 0` (init 0, ticks down).
- In `updOW`, for each machine body, every frame:
  - Count `aliveDroneFactories(body)` from `lvState[body.id].buildings.DRONE_FACTORY` bitfield.
  - If `aliveDroneFactories === 0`: no respawn. Clear the timer.
  - Else:
    - Count alive Swarms with `f.spawnedAtMachine === body.id`. If `< MACHINE_SWARM_CAP`:
      - If `respawnTimer <= 0`: spawn 1 Swarm orbiting the body, tagged `spawnedAtMachine = body.id`. Reset timer: `timer = MACHINE_SWARM_RESPAWN_BASE - aliveDroneFactories * MACHINE_SWARM_RESPAWN_PER_FACTORY` (clamped ≥ 60 frames so it's never instant).
      - Else `respawnTimer--`.
- Constants: `MACHINE_SWARM_RESPAWN_BASE = 3600` (60s), `MACHINE_SWARM_RESPAWN_PER_FACTORY = 360` (6s).
- Asteroid-field swarms: no respawn (existing one-shot logic).

**Depends on:** O-01, P1-04 (drone factory class)

**Acceptance:** Kill a machine-world swarm, wait ~30s with all factories alive → respawns. Destroy all drone factories on the machine world → existing swarms stay but no new ones spawn after a kill.

---

### O-03. MACHINE_FACTORIES objective type

**Goal:** Add a new objective type triggered on machine worlds — destroy all drone factories.

**Files:** `data/objective-types.js`, `objectives.js`, `data/building-types.js`

**Outline:**
- `data/objective-types.js`: add to `OBJECTIVE_TYPE_IDS`: `MACHINE_FACTORIES: 'machine_factories'`. Add to `OBJECTIVE_TYPES`: `{id: …, scope: 'planet', name: 'DRONE FACTORIES'}`.
- `objectives.js`:
  - In `genObjectives`, after the existing per-body checks, add: if `bodyById(id).subtype === 'machine'`, emit the `MACHINE_FACTORIES` objective.
  - Suppress `CIV_INFRASTRUCTURE` on machine bodies — they don't get the 50%-destruction objective; they get the all-destroyed objective.
- `data/building-types.js`: drone factory's `onDestroyed` hook checks if the building is on a machine body. If so, recompute alive count; on zero, complete the `MACHINE_FACTORIES` objective for that body.
- Use the existing destruction hook pattern (matches `_civObjectiveOnDestroyed` style).

**Depends on:** S-05, F-04

**Acceptance:** A machine body in a generated system has a `MACHINE_FACTORIES` objective listed in the info popup and in the objectives panel. Destroying all factories flips it complete and contributes to slipgate unlock.

---

## Recommended execution order

**Sequential block A (Foundations):** F-01 → F-02 → F-03 → F-04 → F-05.

**Sequential block B (Generation):** G-01 → G-02 → G-03 → G-04 → G-05.

**Sequential block C (Surface scaling + terrain):** S-01 → S-02 → S-03 → S-04 → S-05.

**Parallelizable block D (Physics + camera):** P-01, P-02, P-03, P-04, P-05, P-06, P-07 — once C lands, all of P can run concurrently (assign one agent per task).

**Sequential block E (UI / interaction):** U-01 → U-02 → U-03 → U-04.

**Parallelizable block F (Fleets + objectives):** O-01 → O-02 (sequential pair), O-03 in parallel.

**Total:** 28 tasks (5 + 5 + 5 + 7 + 4 + 3 - F-05 doc-only counts but still a task slot).

---

## Notes for downstream work (not in scope for this plan)

- **O'Neill cylinder space habitats** (user, Q&A round 2 A2) — a future site kind, not a body. Slot into the spatial hash with `kind:'habitat'` when added.
- **Per-volcano audio polish** — currently a single `tone()` on emit; richer effects deferred.
- **Body-info popup richness** — visited flag, current threats, etc. deferred (user C1).
- **Gas giant moon-of-moon spawning** — not in scope; moons only orbit non-moon bodies.
- **Sea audio on contact** — deferred (user H4).
