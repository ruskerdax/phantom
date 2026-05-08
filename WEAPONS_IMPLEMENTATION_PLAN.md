# Weapons Implementation Plan

## How to use this plan

This document is the source of truth for the weapons expansion. Tasks are designed to be handed off to coding agents (Claude Code, Codex, etc.) one at a time, in the order specified at the bottom.

**Agent contract for each task:**
1. Read the **Conventions** section in full before implementing.
2. Read the target task block in full.
3. Implement only what the task specifies. No bonus refactors, no speculative abstractions, no features outside the block.
4. If the outline is ambiguous mid-implementation, stop and ask rather than guess.
5. Verify the **Acceptance** criterion in a browser (open `phantom.html`).
6. Mark the task done in this file by adding ✅ next to its heading.

**Project notes:** Vanilla JS, no build step, all globals (no modules). Test by opening `phantom.html` in a browser. Save format may break for older saves — playtesters wipe.

---

## Conventions

### File naming
- Avoid creating files with the same basename in different directories. `data/weapons.js` already exists; new runtime modules use distinct names: `weapon-mechanics.js` (runtime helpers), `weapon-ai.js` (per-fire-mode AI policies).
- Data-only registries stay in `data/`. Runtime helpers are at the project root.

### Registry vs. runtime
- `data/weapons.js` is the **single source of truth** for weapon definitions and their **draws**. `WEAPON_MAP` lookups gate all enemy/defense/surface-enemy access (already enforced by `assertEnemyRegistry`/`assertSurfaceEnemyRegistry`/`assertDefenseRegistry`).
- **No inline weapons.** Enemies and defenses must reference `WEAPONS` rows by id. Asserts must catch any new code path that bypasses the registry.
- `MISSILE_TYPES` lives next to `WEAPONS` in `data/weapons.js`. Each visual missile variant adds one row.
- `WEAPON_TYPES` (fire-mode handlers), `runPlayerWeaponSlot`, `tryFire`, `spawnMissile`, and all per-mechanic helpers (charge, magazine, ammo, target-lock, ricochet, sticky, mine-trigger, heat-seek, persistent-projectile-radius) live in `weapon-mechanics.js` (NEW).
- Per-weapon AI firing policies live in `weapon-ai.js` (NEW), keyed by `wp.aiPolicy` (string). Policies decide press/release each frame for an enemy ship; the same player fire/tick code consumes synthesized button state.

### Per-slot ship state
- All per-slot weapon state is consolidated under `s.weapons[slot] = {cd, ammo, mag, charge, chargeFrames, pulsesLeft, pulseTimer, misLeft, misTimer, persistBeam, spool, reloading, reloadFrames, lockedTargetId, lockCooldowns, stickyMissileId, …}`. Old top-level fields (`s.scd`, `s.scd2`, `s.pulsesLeft`, `s.pulsesLeft2`, `s.misLeft`, `s.misTimer`, `s.pb`, `s.pb2`, etc.) are removed. Migration is mechanical (one pass over `weapon-mechanics.js`, `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`).
- Enemies share the same `e.weapons[]` shape so weapon mechanics treat both uniformly.

### Per-weapon input model
- Tap = press AND release within ≤8 frames (≈133ms). Hold = pressed past 8 frames. Each weapon's `fireMode` decides how to interpret tap/hold/release.
- Each slot maintains `s.weapons[slot].input = {pressed, pressedFrames, justReleased, releasedAfterFrames}` updated each frame inside `runPlayerWeaponSlot` from `iFir()` / `iFireSec()`.
- Pressing fire while charging counts as releasing (commit-fire). Each slot's input state is independent.
- Opening a menu / pause cancels active charges silently. Energy spent during charge is NOT refunded.

### Projectile tagging (for future WebGL effects)
- Every spawned bullet/missile/beam carries `wpId` (string id of the source weapon). Existing weapons (mass driver, railgun, pulse laser, mining laser, particle accelerator, rocket pod) get retro-tagged in F-10. The 2D draw layer ignores `wpId`; future shaders can switch on it.

### Ammo
- `wp.ammoMax` is set on weapons that carry ammo. Player and enemies both track `weapons[slot].ammo` from the weapon's `ammoMax` (no inline ammo overrides on enemy classes — `weapons.js` is the source of truth).
- Existing weapons that get ammo retrofitted in F-03: MASS DRIVER 400, RAILGUN 300, ROCKET POD 12. Energy weapons (PULSE LASER, MINING LASER, PARTICLE ACCELERATOR) stay energy-only; no `ammoMax`.
- Ammo persists across encounters and saves (`saveGame()` / `loadSave()`).
- Ammo refills to full ONLY in two cases:
  1. Player lands at BASE (any path that opens `openBaseMenu()`).
  2. Player exits a site or encounter (`encWin`, `returnPlanetToOverworld`). Surface↔cave↔tunnel transitions do NOT refill (`enterTunnel`, `enterCaveFromTunnel`, `enterSurface` from a tunnel exit).
- Death+rebuild starts the player at base, which already triggers the base refill — no special-case needed.

### Magazine
- `wp.magMax` set on magazine weapons. `weapons[slot].mag` tracks current rounds.
- Hold-to-reload: holding fire past 6 frames (≈100ms) when `mag < magMax` initiates a reload (3s per Flak spec). Reload pulls from reserve `ammo`. If reserve has fewer than the missing rounds, mag fills with what's available.
- Holding when `mag === magMax` does nothing until release.
- Manual reload before mag is empty IS allowed (top-off).
- Magazine reload progress visualized below ship (see Below-ship indicator stack).
- On site/encounter exit (D5), magazines auto-refill from reserve ammo before save.

### Charge
- `wp.chargeMin` (frames before fire becomes possible), `wp.chargeMax` (cap), `wp.chargeEnergyDrainPerFrame` (drain while charging), `wp.chargeHoldDrainPerFrame` (small drain while held at cap).
- Released below `chargeMin` = no fire, no refund.
- Charge progress visualized below ship.

### Target lock (Hydra)
- `wp.targetLockRange` (cycle range), `wp.lockBreakRange` (hysteresis), `wp.targetLockArc` (preferred-front arc).
- Lock state on `weapons[slot] = {lockedTargetId, lockCooldowns:Map<targetId,framesUntilEligible>}`.
- Cycle on tap; hold past 8 frames commits to fire. Lock breaks when target dies, leaves `lockBreakRange`, or 2s elapses since last cycle.
- Indicator: thin orange square (`#ffb060`, 1.5px, 30% opacity), side length `2 × (target.r + 6)`, axis-aligned.

### HUD layout
- **Top-right ammo line** (per ammo'd weapon, only when `ammo < ammoMax`): two rows under the existing energy/shield bars, format `WEAPON_NAME ammo/max` above a `▮▮▮▯▯▯▯` 8-cell bar. Slot 0 line is on top, slot 1 below it. Hidden in overworld.
- **Below-ship indicator stack** (top-down, all hidden when not active):
  1. Shield bar (existing, when shield not full).
  2. Slot 0 charge bar (when charging) OR slot 0 magazine display (when mag < magMax).
  3. Slot 1 charge bar OR slot 1 magazine display.
- **Magazine display**: ▮ per round, ▯ per spent round (e.g. `▮▮▮▯▯` = 3/5). Reload progress: a thin progress line directly under the magazine bar, fills left-to-right over reload duration.
- **Charge bar**: a thin progress line. Charge cap segment marked.

### Enemy depletion AI
Two flavors live in `enemy-ai.js`:
- `permanentDisengage(e)` — for enemies whose only weapon(s) are ammo-gated and fully depleted. Picks a flee direction once (with weave/bob), commits to it. Stops firing entirely. Despawns ONLY when the enemy is past the encounter boundary AND off-screen relative to the camera (no kill credit, no stake, no fuel-cell drop).
- `tempDisengage(e)` — for enemies with at least one energy weapon out of energy. Picks a flee direction with weave/bob. Will opportunistically fire if energy permits (e.g. between a depleted state and 20% recovery). Re-engages at energy ≥ 20% of `e.maxEnergy`.

An enemy enters disengage when no equipped weapon is currently usable (insufficient ammo on ammo'd weapons AND insufficient energy on energy weapons). It picks `permanentDisengage` if no equipped weapon CAN ever recover (i.e. all are out-of-ammo and there's no energy regen path), else `tempDisengage`.

### Combat-design memory (preserve at all times)
- Delta-V coasting is sacred — no sustained-thrust energy cost added.
- No blanket per-weapon range falloff. Per-weapon falloff fields are allowed but not required, and not introduced by this plan.
- Don't rework `ec.spd` or fighter AI overrides.
- The new mechanics in this plan respect those rules; don't violate them while implementing.

### Asserts
- New `assertWeaponRegistry()` runs at boot (called from `data/weapons.js` after `WEAPONS` is built). It verifies:
  - Each `fireMode` exists in `WEAPON_TYPES`.
  - Each weapon's `aiPolicy` (when present) exists in `WEAPON_AI_POLICIES`.
  - Per-fire-mode required fields are present (e.g. `'charged'` requires `chargeMin`, `chargeMax`; `'magazine'` requires `magMax`; `'ammo'` requires `ammoMax`; etc.).
- Existing registry asserts (`assertEnemyRegistry`, `assertSurfaceEnemyRegistry`, `assertDefenseRegistry`) continue to enforce no-inline-weapons.

---

## Assumptions made during planning
- Tap = ≤8 frames; hold = >8 frames. Matches ~133ms human tap window. Tunable.
- Reload duration baseline 3s (180 frames) per Flak spec.
- Charge weapons never stack. Two charge weapons in both slots = each slot has its own independent charge state and below-ship bar.
- All 12 new weapons fit existing slot types (kinetic / energy / missile). No chassis changes required.
- License/build prices are placeholders; final tuning is the user's task.
- `playerOnly` flag is NOT introduced. Enemy classes will be assigned weapons manually downstream.
- Surface↔cave↔tunnel transitions explicitly do NOT auto-reload magazines or refill ammo.
- Existing enemy classes (Morrigan, Calypso, Lancer, Arrow, Spark, Atlas, Robinson) gain energy capacity per F-08; mass driver / mining laser / railgun / particle accelerator users will all stop firing under sustained pressure once energy/ammo deplete, but normal engagements should not deplete them.

---

## Phase 0 — Foundations

Sequential block: F-01 → F-02. After F-02, F-03 through F-11 can run in parallel.

### F-01. Slot state consolidation ✅

**Goal:** Replace per-slot top-level ship fields (`s.scd`, `s.scd2`, `s.pulsesLeft`, `s.pulsesLeft2`, `s.pulseTimer`, `s.pulseTimer2`, `s.misLeft`, `s.misLeft2`, `s.misTimer`, `s.misTimer2`, `s.pb`, `s.pb2`) with a single `s.weapons[]` array. Mirror the same shape on enemies.

**Files:** `state.js`, `data/weapons.js` (split runtime out — see F-02), `weapon-mechanics.js` (NEW shell), `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`, `encounter.js`, `site.js`, `save.js`

**Outline:**
- `mkShip` initializes `s.weapons = [mkWeaponSlot(), mkWeaponSlot()]` with `{cd:0, ammo:null, mag:null, charge:0, chargeFrames:0, pulsesLeft:0, pulseTimer:0, misLeft:0, misTimer:0, persistBeam:null, spool:0, reloading:false, reloadFrames:0, lockedTargetId:null, lockCooldowns:new Map(), stickyMissileId:null, input:{pressed:false, pressedFrames:0, justReleased:false, releasedAfterFrames:0}}`.
- `mkEncEnemy` and surface-enemy / defense factories build a `weapons:[mkWeaponSlot()]` (single slot) on each enemy. Multi-weapon enemies (future) extend this.
- Migrate every read/write of the old fields to `s.weapons[slot].xxx`. Hot paths: `runPlayerWeaponSlot`, `WEAPON_TYPES.projectile.fire/tick`, `WEAPON_TYPES.beam.tick`, `WEAPON_TYPES.missile.fire/tick`, encounter/surface enemy fire dispatchers (`enemyUpdate` in `encounter-enemies.js`, `fireSurfaceEnemy*`, `fireDefense*`).
- `copyShipEnergyState`, `mkShip`, etc. unchanged in semantics; just move ship-state initialization to use the new shape.
- `saveGame` does NOT serialize `s.weapons[]` yet (ammo persistence lands in F-03).

**Depends on:** —

**Acceptance:** All existing weapons fire identically (cooldowns, pulse beams, missile salvos, charged particle accelerator). No console warnings about undefined `s.scd` / `s.pulsesLeft` / etc.

---

### F-02. Per-weapon input model + runtime split ✅

**Goal:** Move runtime helpers out of `data/weapons.js` into `weapon-mechanics.js` (NEW). Add per-slot input tracking inside `runPlayerWeaponSlot` so weapons can react to tap vs. hold vs. release.

**Files:** `data/weapons.js`, `weapon-mechanics.js` (NEW), `phantom.html` (script tag)

**Outline:**
- Create `weapon-mechanics.js`. Move `MISSILE_TYPES` stays in `data/weapons.js` (registry-side). Move out of `data/weapons.js` into `weapon-mechanics.js`: `WEAPON_TYPES`, `spawnMissile`, `tryFire`, `runPlayerWeaponSlot`, `weaponEffectiveRange`, `weaponCooldownFrames`, `beamHitPadding`. Keep `WEAPONS`, `WEAPON_MAP`, `MISSILE_TYPES`, and per-weapon draws in `data/weapons.js`.
- Add `<script src="weapon-mechanics.js"></script>` to `phantom.html` AFTER `data/weapons.js`.
- Inside `runPlayerWeaponSlot`, before dispatching to `wt.fire`/`wt.tick`, compute the slot's input frame:
  ```
  const slotW = s.weapons[slot];
  const heldNow = slot===0 ? iFir() : iFireSec();
  if(heldNow){ slotW.input.pressedFrames = (slotW.input.pressed?slotW.input.pressedFrames+1:1); slotW.input.justReleased=false; }
  else { slotW.input.justReleased = !!slotW.input.pressed; slotW.input.releasedAfterFrames = slotW.input.pressedFrames; slotW.input.pressedFrames = 0; }
  slotW.input.pressed = heldNow;
  ```
- Define `TAP_FRAMES=8` as a `weapon-mechanics.js` constant.
- Existing `'projectile'` / `'beam'` / `'missile'` fire modes retain their current "fire on press while cd ready" semantics by reading `slotW.input.pressed` — no behavior change for legacy weapons.

**Depends on:** F-01

**Acceptance:** Existing weapons fire the same. `s.weapons[0].input.pressedFrames` increments while fire is held, resets on release.

---

### F-03. Ammo system + retroactive ammo on existing weapons + top-right HUD ✅

**Goal:** Add `wp.ammoMax` field and player + enemy ammo state. Retrofit MASS DRIVER (400), RAILGUN (300), ROCKET POD (12). Refill at base + on site/encounter exit. Top-right HUD ammo lines.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `state.js`, `save.js`, `base.js`, `encounter.js`, `site.js`, `draw.js`

**Outline:**
- Add `ammoMax` to MASS DRIVER (400), RAILGUN (300), ROCKET POD (12). Energy weapons remain unchanged.
- `weapon-mechanics.js` exports:
  - `weaponHasAmmo(wp)` → `wp.ammoMax !== undefined`.
  - `currentAmmoForSlot(s, slot)` → `s.weapons[slot].ammo` (or `null` if no ammo).
  - `consumeAmmo(s, slot, n=1)` — decrements, clamps to 0.
  - `refillAmmoForLoadout(s)` — sets each `s.weapons[i].ammo` to `wpSlot(i)?.ammoMax ?? null`. Called from base entry and site/encounter exit hooks.
  - `tryFire` is extended to check ammo before firing; returns false if `ammo<=0`.
- `mkShip` initializes `s.weapons[i].ammo` from `wpSlot(i)?.ammoMax ?? null` (full at start).
- Save/load: `saveGame` serializes `currentAmmo: [ammo0, ammo1]` on the active ship. `startFromSave` restores onto the rehydrated ship; missing data → full.
- Refill hooks: call `refillAmmoForLoadout(G.OW.s)` from `openBaseMenu()`, and call it from inside `encWin` and `returnPlanetToOverworld` BEFORE save.
- HUD: `drHUD` adds an `ammoHUD(s, x, y)` call below the existing shield bar. For each slot whose weapon has `ammoMax` AND `ammo < ammoMax`, render two rows:
  - Row 1: `WEAPON_NAME  ammo/max` in `#aaffcc`, right-aligned.
  - Row 2: 8-cell bar `▮▮▮▯▯▯▯▯` filled to `ammo/max`, right-aligned, color `#0f8` if `ammo > max*.2` else `#f40`.
  - Two slot lines stacked: slot 0 above slot 1. Bottom edge of slot-1 row = top edge of slot-0 (slot 0 always shown above slot 1, regardless of which has ammo).
  - Hidden in `G.st === 'overworld'`.
- Enemy ammo state: each enemy that mounts an ammo'd weapon initializes `e.weapons[0].ammo = wp.ammoMax`. `tryFire` already returns false on insufficient ammo for enemies with `weapons[].ammo` set.

**Depends on:** F-02

**Acceptance:** Mass driver runs out at 400 shots. HUD shows `MASS DRIVER 380/400` + bar after 20 shots. Landing at base refills to 400. Exiting an encounter via `encWin` refills. Save+reload preserves mid-fight ammo. Enemy mounting mass driver runs out at 400 shots.

---

### F-04. Magazine system + below-ship indicator stack ✅

**Goal:** Add `wp.magMax` and reload state. Implement the below-ship indicator stack (shield + slot 0 + slot 1 vertically).

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `draw.js`, `state.js`, `save.js`, `encounter.js`, `site.js`

**Outline:**
- `weapon-mechanics.js`:
  - `weaponHasMagazine(wp)` → `wp.magMax !== undefined`.
  - `consumeMag(s, slot)` — decrements, refuses below 0.
  - `beginReload(s, slot)` — sets `weapons[slot].reloading=true`, `reloadFrames=ceil(wp.reloadSec*60)`.
  - `tickReload(s, slot)` — decrements `reloadFrames`; when 0, fills `mag` to `magMax` from `ammo` (clamping to whatever `ammo` allows). Clears `reloading`.
  - `refillMagsForLoadout(s)` — called alongside ammo refill hooks; fills mag from ammo.
- Magazine weapons fire by consuming `mag` first (the weapon's fire mode tracks this). When `mag === 0`, taps produce a "click" tone, no fire.
- Manual reload: while `mag < magMax` and `pressedFrames > 6` and `!reloading`, `beginReload` is called by the weapon's `fire` handler. Holding when `mag === magMax` does nothing.
- Below-ship indicator stack (`drawSlotBelowShipIndicators(s, slot, x, baseY)` in `draw.js`):
  - Shield bar (existing) at the top of the stack — keep current `drShip` rendering, but factor the stack offsets so charge/mag stack below it.
  - For each slot 0, then slot 1, render the slot's below-ship element if active:
    - Charge bar (F-05).
    - Magazine bar: 1px-thick row of `magMax` cells, ▮ (filled) and ▯ (empty), each cell ~4px wide × 4px tall, color `#aaffcc`.
    - Reload progress: a thin 1px line below the magazine bar, fills left-to-right at `reloadFrames` percent. Disappears when reload completes.
  - Each item is hidden when at full / not active. Stack collapses (no gap) so only active items contribute height.
- Save: serialize `currentMag: [mag0, mag1]` and `currentReloading: [{reloading,reloadFrames},…]`. Restore on load.

**Depends on:** F-02, F-03

**Acceptance:** Equip a synthetic test weapon (or wait for F-04 dependents) and verify mag bar renders below ship while not full. Reload progress bar fills over 3s and refills mag from reserve ammo.

---

### F-05. Charge state + below-ship charge indicator ✅

**Goal:** Add charge timer state and the charge progress indicator. Energy drain during charge.

**Files:** `weapon-mechanics.js`, `data/weapons.js`, `draw.js`, `state.js`, `save.js`

**Outline:**
- Add fields to charge weapons (defined in P2-01 / P2-02):
  - `chargeMin` (frames before release becomes valid).
  - `chargeMax` (frames where charge caps).
  - `chargeEnergyDrainPerFrame` (energy drained while charging; 0 if no drain).
  - `chargeHoldDrainPerFrame` (small drain while held at cap).
- `weapon-mechanics.js`:
  - `tickCharge(s, slot, wp)` — if `pressed`, increments `chargeFrames`, drains energy. If at cap, applies `chargeHoldDrainPerFrame`. If energy hits 0, freezes charge (does not auto-fire).
  - `chargeProgress(s, slot, wp)` → `[0..1]` for the indicator.
  - `chargeReady(s, slot, wp)` → `chargeFrames >= chargeMin`.
- Below-ship charge bar in `draw.js`: thin 1px progress line, ~28px wide. Marker at `chargeMin` (small notch), end at `chargeMax` (cap). Color `#9df` while building, `#fb0` while held at cap.
- Cancellation: if menu opens (`G.paused` or `G.st!=='play'/'encounter'/'esc'`), reset `chargeFrames=0`, no fire.

**Depends on:** F-02

**Acceptance:** A test charge weapon visibly charges over 2s, the bar grows, and pressing cancel/menu resets the charge.

---

### F-06. Target lock state + selection square ✅

**Goal:** Per-slot target lock for missile weapons that need a designated target (Hydra). Cycle on tap, lock, fire on hold.

**Files:** `weapon-mechanics.js`, `draw.js`, `encounter.js`, `site.js`

**Outline:**
- `weapon-mechanics.js`:
  - `eligibleLockTargets(s, ctx, wp)` — returns enemies + turrets within `wp.targetLockRange` from ship; preferred = within `wp.targetLockArc` ahead of ship facing. Excludes buildings/asteroids/friendlies.
  - `cycleLockTarget(s, slot, wp, ctx)` — picks next eligible target not on cooldown; sets `weapons[slot].lockedTargetId`. Adds previous target id to `lockCooldowns` map with 90-frame skip.
  - `tickLock(s, slot, wp, ctx)` — breaks lock if `dist > wp.lockBreakRange` or target dead/missing; decrements all cooldowns; clears entire `lockCooldowns` map after 2s without cycling/firing.
  - `lockedTargetEntity(s, slot, ctx)` — resolves `lockedTargetId` to a live entity reference for damage/aim purposes.
- Indicator in `draw.js`: `drawTargetLockSquare(target, col='#ffb060')` — axis-aligned square outline, side `2*(target.r + 6)`, line width 1.5, `globalAlpha=.3`. Drawn from each render context (encounter, site) when player has an active lock.
- Encounter and site `runPlayerWeaponSlot` ctx gains `lockTargets:()=>[…]` provider for the policy.

**Depends on:** F-02

**Acceptance:** With a test target-lock weapon equipped, tapping fire cycles through enemies in encounter (selection square moves to each), no double-cycle within 90 frames. Holding fire (no fire mechanic yet — wait for Hydra) keeps the lock visible.

---

### F-07. Mechanics helpers ✅

**Goal:** Add reusable helpers for ricochet, sticky, mine-trigger, heat-seek, and persistent-projectile-radius. Used by the weapons in Phases 1–4.

**Files:** `weapon-mechanics.js`

**Outline:**
- **Ricochet (`stepRicochetBullet(b, ctx, walls)`):** advances a bullet that may bounce off level geometry up to `b.ricochetsLeft` times. On geometry hit, reflect velocity around segment normal, decrement `ricochetsLeft`. On enemy/building/turret hit, expire as normal. Returns true when consumed.
- **Sticky (`stickProjectile(m, target, kind)`):** stores `m.stuckTo = {kind:'enemy'|'building'|'turret'|'terrain', id, offsetX, offsetY}`. Each frame, if kind is enemy and target is alive, redraw at target's position + offset. Detached if target dies (kind becomes 'free-fall' until terrain hit).
- **Mine-trigger (`mineTriggerCheck(m, ctx)`):** returns the first eligible enemy within `m.triggerR`. Eligible per side: enemy mines target the player; player mines target enemies (no friendlies, no asteroids, no buildings). Triggered mine sets `m.triggered=true`, `m.triggerTimer = m.triggerDelay`, and starts pursuing the trigger entity at `m.pursuitAccel` up to `m.pursuitMaxSpd`. Explodes when `triggerTimer` reaches 0 OR mine collides with terrain/target.
- **Heat-seek (`heatSeekTurn(m, ctx, opts)`):** finds nearest enemy in `ctx`; turns `m.a` toward it by up to `m.seekTurnRate` rad/frame; if no enemy, no turn. Caller still applies `m.spd` -> `m.maxSpd` ramp.
- **Persistent-projectile-radius (`persistentProjectileTick(p, ctx)`):** for projectiles with `p.innerR` and optional `p.outerR`. Damages enemies/buildings/turrets within `innerR` at `p.innerDmgPerTick` (every tick). For each enemy/turret within `outerR` (and outside `innerR`), every `p.outerTickInterval` frames, draws a beam line from `p` to the entity (added to `ctx.lsb`) and applies `p.outerDmgPerTick`. Lines are NOT drawn for entities outside `outerR`. Projectile expires only on terrain (`wHit` / `surfaceTerrainSegments` collision), never on entity hit.
- All helpers operate on the same `ctx` shape that `runPlayerWeaponSlot` already builds (so they work in encounter, surface, and cave/tunnel without per-context branches).

**Depends on:** F-02

**Acceptance:** Helpers each have a small inline test path (e.g. instantiate a projectile, step it, observe expected behavior). No weapons consume these yet — that's later phases.

---

### F-08. Enemy ammo + energy state + depletion AI ✅

**Goal:** Enemies track ammo and energy. When unable to fire, they disengage per the rules in Conventions.

**Files:** `data/enemies.js`, `data/surface-enemy-classes.js`, `data/defense-classes.js`, `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`, `enemy-ai.js`

**Outline:**
- Per-enemy energy capacity: add `energyMax` (number, scaled with class size — e.g. Morrigan 30, Calypso 40, Atlas 80, Robinson 120) and `energyRegenPerSec` (e.g. Morrigan 4, Calypso 5, Atlas 6, Robinson 7) to OETs marked `energy:true`. Surface-enemy and defense classes whose weapons cost energy get equivalents.
- `mkEncEnemy` / `mkSurfaceEnemy` / `mkDefense` initialize `e.energy = e.energyMax` (when defined) and `e.weapons[0].ammo = wp.ammoMax` (when defined).
- Each frame, `tickEnemyEnergy(e)` regens up to cap. `tryFire` already deducts energyCost when enemies have an `energy` field — extend to ALSO deduct ammo from `e.weapons[0].ammo` when the weapon has `ammoMax`.
- `enemy-ai.js` adds:
  - `enemyCanFireAnyWeapon(e)` — true iff any equipped weapon currently has both energy (≥ `energyCost`) and ammo (≥ 1, or no `ammoMax`).
  - `enemyCanRecover(e)` — true iff any equipped weapon is energy-only (no `ammoMax` requirement that's depleted) AND `e.energyMax > 0`. Determines temp vs. permanent disengage.
  - `permanentDisengage(e, ctx)` and `tempDisengage(e, ctx)` — set `e.disengaging=true`, pick a flee direction (if not already set), apply weave/bob, suppress fire. `tempDisengage` allows opportunistic fire when energy permits but stays below 20%; clears `disengaging` when energy ≥ 20%.
  - Despawn rule for `permanentDisengage`: when enemy is past encounter boundary AND off-screen relative to camera, set `alive=false` (no kill credit, no stake, no `addStake`, no fuel-cell drop). Surface/cave/tunnel — flee toward sky/exit and despawn similarly when off-screen + past world edge.
- Update `enemyUpdate` (encounter), `updSurfaceEnemy`, `updateDefense` to call `enemyTickDisengage(e)` BEFORE the existing AI movement step. If `e.disengaging`, the disengage motion replaces the role's normal `update`. Defenses don't disengage (they're stationary) — they just stop firing when depleted.
- Tag the existing ammo'd weapons (mass driver / railgun / rocket pod after F-03) so all enemies using them now consume ammo.
- Set energy regen tuning so a normal engagement does NOT deplete an existing class — depletion only triggers under sustained kite-pressure.

**Depends on:** F-03, F-07 (helpers reused for fleeing motion if needed)

**Acceptance:** Spawn a Morrigan with mass driver and watch it fire ~400 times before disengaging (permanent — flees, despawns when off-screen + boundary). Spawn a Robinson (energy weapon) with low energy_max (override for testing) and watch it temp-disengage at 0 energy, re-engage at 20%.

---

### F-09. Weapon AI policy registry

**Goal:** Add `weapon-ai.js` (NEW) with a `WEAPON_AI_POLICIES` keyed by string id. Each policy decides press/release each frame for a non-player ship using a given weapon. Existing fire modes get default policies that match current behavior.

**Files:** `weapon-ai.js` (NEW), `phantom.html`, `data/weapons.js`, `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`

**Outline:**
- `WEAPON_AI_POLICIES = { 'tap': {…}, 'tap-cooldown': {…}, 'beam-pulse': {…}, 'missile-salvo': {…} }`. Each policy exports:
  - `update(e, slot, wp, ctx)` — sets `e.weapons[slot].input` field as if the AI "pressed" or "released" this frame. The same fire/tick code from `weapon-mechanics.js` then runs.
- Default policies (existing weapons):
  - `'tap'` — for ammo'd projectile weapons; sets pressed when target is in arc + range and cooldown is ready.
  - `'beam-pulse'` — for beam weapons; same trigger condition.
  - `'missile-salvo'` — for missile weapons; same trigger condition.
- Existing kinetic/beam/missile weapons get an `aiPolicy` field assigned (default to one of the three above). `assertWeaponRegistry` errors if any weapon has no policy assigned.
- Refactor `enemyUpdate` (encounter), `fireSurfaceEnemyWeapon`, `fireDefenseWeapon` to: (1) advance `e.weapons[slot]` cooldowns, (2) call the policy's `update`, (3) defer to the same fire-mode handler the player uses. Existing fire-mode handlers in those files become thin wrappers that just call into `weapon-mechanics.js` `WEAPON_TYPES[fireMode].fire`/`tick` with the synthesized input.
- This unifies player and enemy weapon code paths. Future fire modes (charged / sticky-detonate / target-lock / spool / magazine / mine) only have to be added once.

**Depends on:** F-01, F-02, F-08

**Acceptance:** Existing enemy classes fire identically to before. No console errors. Policies dispatch is observable via a `ENEMY_AI_TRACE` flag (optional debug).

---

### F-10. wpId tagging on existing weapons' projectiles/missiles/beams

**Goal:** Add `wpId` (source weapon id, string) to every existing bullet, missile, and beam-line spawn for forward compatibility with the WebGL effects layer.

**Files:** `weapon-mechanics.js`, `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`, `encounter.js`, `site.js`

**Outline:**
- Player bullet spawn (`WEAPON_TYPES.projectile.fire`): add `wpId: wp.id` to the pushed object.
- Player missile spawn (`spawnMissile`): add `wpId: wp.id`.
- Player beam record (`WEAPON_TYPES.beam.tick`): add `wpId: wp.id` to the `lsb.push({…})` line.
- Enemy bullet/missile/beam spawn paths in `encounter-enemies.js`, `surface-enemies.js`, `defenses.js`: add `wpId: ewp.id` (or `wp.id`).
- The 2D draw layer ignores `wpId`. No visual change.

**Depends on:** F-01

**Acceptance:** `console.log(enc.bul[0].wpId)` shows `'mass driver'` after firing the default loadout. Same for missiles, beams, enemy bullets. No regressions.

---

### F-11. assertWeaponRegistry + magazine/ammo refill on exit hooks

**Goal:** Wire the auto-refill on site/encounter exit (D5). Add a registry assert that catches misconfigured weapons.

**Files:** `weapon-mechanics.js`, `data/weapons.js`, `encounter.js`, `site.js`, `base.js`

**Outline:**
- `assertWeaponRegistry()` runs after `WEAPONS` is built. Verifies:
  - Each weapon's `fireMode` exists in `WEAPON_TYPES`.
  - `aiPolicy` (when present) exists in `WEAPON_AI_POLICIES`. Required for any weapon used by enemies; optional for player-only weapons.
  - For `ammoMax` ≠ undefined, value > 0.
  - For `magMax` ≠ undefined, value > 0 AND `ammoMax` is set (mag weapons must have reserve).
  - For `chargeMin`/`chargeMax`, `chargeMin > 0` AND `chargeMax >= chargeMin`.
- Refill hooks:
  - `encWin` calls `refillAmmoForLoadout(enc.s)` AND `refillMagsForLoadout(enc.s)` BEFORE `copyShipEnergyState(enc.s, ow.s)`.
  - `returnPlanetToOverworld` calls them on `site.s` BEFORE the `copyShipEnergyState`.
  - `openBaseMenu` calls them on `G.OW.s` (already refills energy via `fillShipEnergy`; add ammo/mag).
  - `enterTunnel`, `enterCaveFromTunnel`, `enterSurface` from a tunnel exit — do NOT call refill.

**Depends on:** F-02, F-03, F-04, F-09

**Acceptance:** Boot the game; no assert thrown. Fire mass driver in encounter to 350/400, exit via `encWin` — overworld HUD shows 400/400. Cave→tunnel transition does NOT refill.

---

## Phase 1 — Simple weapons (parallelizable, after Phase 0)

### P1-01. Plasma Blaster

**Goal:** Add PLASMA BLASTER to `WEAPONS` registry. Energy-only, projectile fire mode, fast cooldown.

**Files:** `data/weapons.js`

**Outline:**
- Row: `{id:'plasma blaster', name:'PLASMA BLASTER', wpnType:'energy', fireMode:'projectile', dmg:20, cd:0.1, spd:10, life:60, energyCost:3, aiPolicy:'tap', buyable:true, licensePrice:2000, buildPrice:300, drawProjectile:(b)=>{ /* bright cyan ball #0ff with glow */ }}`.
- `drawProjectile` co-located with the row in `data/weapons.js`. Encounter/site bullet draw branches on `wp?.drawProjectile` if present, else falls back to the existing `drBullet` (white).

**Depends on:** Phase 0

**Acceptance:** Equip PLASMA BLASTER in slot 1 (energy slot). Fires 10 shots/sec while energy lasts. Drains battery at 30 energy/sec. Bright cyan projectile renders.

---

### P1-02. Ion Blaster

**Goal:** Add ION BLASTER. Energy-only persistent projectile that damages anything inside its radius per tick. Single radius (no outer trace).

**Files:** `data/weapons.js`, `weapon-mechanics.js`

**Outline:**
- New fire mode `'persistent-projectile'` in `WEAPON_TYPES` (uses the F-07 `persistentProjectileTick` helper).
- Row: `{id:'ion blaster', name:'ION BLASTER', wpnType:'energy', fireMode:'persistent-projectile', innerR:16, innerDmgPerTick:2, outerR:0, spd:4, life:80, cd:0.3, energyCost:3, aiPolicy:'tap', buyable:true, licensePrice:2200, buildPrice:320, drawProjectile:(p)=>{ /* small pulsing energy ball */ }}`.
- Projectile expires only on terrain hit (per F-07 helper). Each enemy/building inside `innerR` takes 2 dmg/tick.

**Depends on:** Phase 0

**Acceptance:** Equip ION BLASTER. Pressing fire spawns a slow-moving persistent ball that ticks damage on enemies it overlaps. Ball expires on terrain or after 80 frames. Multiple balls can overlap an enemy and stack tick damage.

---

### P1-03. Tungsten Slugthrower

**Goal:** Add TUNGSTEN SLUGTHROWER. Kinetic projectile that ricochets off level geometry up to 3 times.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- Row: `{id:'tungsten slugthrower', name:'TUNGSTEN SLUGTHROWER', wpnType:'kinetic', fireMode:'projectile', dmg:25, cd:1.0, spd:12, life:100, ammoMax:100, ricochetsMax:3, aiPolicy:'tap', buyable:true, licensePrice:2400, buildPrice:340, drawProjectile:(b)=>{ /* cyan dot + motion-blur trail */ }}`.
- `WEAPON_TYPES.projectile.fire` initializes `b.ricochetsLeft = wp.ricochetsMax ?? 0`.
- Encounter/site projectile loops: when `ricochetsLeft > 0`, on terrain hit (instead of expiring), reflect velocity around segment normal and decrement; only expire on entity hit or `l<=0` or all ricochets exhausted. Use F-07 `stepRicochetBullet` helper.
- Ricochet only off level geometry (terrain segments + cave/tunnel boundary segments + asteroid surfaces). Buildings/enemies/turrets — bullet expires on hit.
- Damage stays at 25 across all ricochets (no falloff).

**Depends on:** Phase 0 (F-07)

**Acceptance:** Fire TUNGSTEN at a wall — bullet bounces up to 3 times before expiring. Hits an enemy along any segment for 25 damage. Ammo consumes 1 per shot.

---

### P1-04. Heat Seeker

**Goal:** Add HEAT SEEKER missile. Targets the closest enemy automatically (no manual target lock). Buildings/turrets/asteroids ignored.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- New `MISSILE_TYPES['heat-seeker']` row: distinct visual (e.g. red glow tip).
- Row: `{id:'heat seeker', name:'HEAT SEEKER', wpnType:'missile', fireMode:'missile', missileType:'heat-seeker', dmg:50, expDmg:60, expR:45, cd:3.0, spd:2, maxSpd:8, accel:0.18, life:160, hp:20, salvo:1, salvoCd:6, ammoMax:8, seek:true, seekTurnRate:0.06, seekTargetKinds:['enemy'], aiPolicy:'missile-salvo', buyable:true, licensePrice:2800, buildPrice:380}`.
- `updEncMissiles` / `updSurfaceMissiles` / `updSiteMissiles`: when `m.seek === true`, call `heatSeekTurn(m, ctx, {kinds:m.seekTargetKinds||['enemy']})` (F-07 helper). The helper turns `m.a` toward the closest qualifying entity by up to `seekTurnRate` rad/frame.
- If no qualifying entity, `m.a` unchanged (flies straight).

**Depends on:** Phase 0 (F-07)

**Acceptance:** Fire HEAT SEEKER. Missile bends toward the nearest enemy in encounter. Doesn't bend toward turrets or buildings. Re-targets if current target dies mid-flight.

---

## Phase 2 — Charge weapons (parallelizable, after Phase 0)

### P2-01. Ion Cannon

**Goal:** Add ION CANNON. Hold-to-charge energy weapon that fires a persistent projectile with two radii and dynamic-radius growth based on charge time.

**Files:** `data/weapons.js`, `weapon-mechanics.js`

**Outline:**
- New fire mode `'charged-persistent-projectile'` in `WEAPON_TYPES`:
  - On press: start `chargeFrames` ticking (via `tickCharge`).
  - On release (pressedFrames >= chargeMin): spawn a persistent projectile with radii scaled by charge progress.
  - On release (pressedFrames < chargeMin): no fire (energy already drained, no refund).
  - On press while menu opened: cancel charge.
- Row: `{id:'ion cannon', name:'ION CANNON', wpnType:'energy', fireMode:'charged-persistent-projectile', chargeMin:6, chargeMax:120, chargeEnergyDrainPerFrame:0.125, chargeHoldDrainPerFrame:0.04, innerRMin:12, innerRMax:36, outerRMin:30, outerRMax:90, innerDmgPerTick:1, outerDmgPerTick:1, outerTickInterval:4, spd:3, life:90, aiPolicy:null, buyable:true, licensePrice:5000, buildPrice:700, drawProjectile:(p)=>{ /* pulsing core; lightning rays drawn only to entities currently in outerR */ }}`.
  - 25% Kestrel battery (60) at cap = 15 energy → drain `15 / 120 = 0.125`/frame.
  - `aiPolicy: null` — Ion Cannon is not used by enemies (per K2, manual assignment). Registry assert allows null when the weapon is never referenced by an enemy class; CI assert at boot does NOT require all weapons have policies, only weapons referenced by enemies.
- Persistent projectile (uses F-07 `persistentProjectileTick`): inner radius does 1 dmg/tick to anything inside; outer radius draws a beam line from projectile center to each entity inside outerR (but outside innerR) every 4 ticks, applying 1 dmg per beam-tick. Beam line is added to `ctx.lsb` and rendered by the existing beam-line layer.
- Lightning rays appear ONLY when there's a target inside outerR. No always-on radiating rays.
- Projectile only expires on terrain.
- Visual: pulsing core grows with charge level. Color `#9df` core, white center.

**Depends on:** Phase 0 (F-05, F-07)

**Acceptance:** Hold fire to charge — bar grows below ship. Release at 100ms+ to fire small projectile; at 2s to fire large. Energy drains during charge, drains slowly while held at cap. Lightning lines draw to enemies in outer radius. No fire if released before 100ms.

---

### P2-02. Arc Caster

**Goal:** Add ARC CASTER. Hold-to-charge energy weapon that fires a narrow cone with a chain effect.

**Files:** `data/weapons.js`, `weapon-mechanics.js`

**Outline:**
- New fire mode `'charged-cone-chain'`:
  - On press: charge ticks.
  - On release (>= chargeMin): fire cone, apply chain.
  - On release (< chargeMin): cancel; energy NOT spent.
- Row: `{id:'arc caster', name:'ARC CASTER', wpnType:'energy', fireMode:'charged-cone-chain', chargeMin:36, chargeMax:36, chargeEnergyDrainPerFrame:0, chargeHoldDrainPerFrame:0, fireEnergyCost:8, coneAngleRad:Math.PI/9, coneLength:320, primaryDmg:32, chainHopMaxDist:80, chainDamages:[15,8], chainHopsMax:2, cd:0.8, aiPolicy:null, buyable:true, licensePrice:5500, buildPrice:760, drawArc:(srcX,srcY,a,points)=>{ /* lightning bolt — jagged polyline through cone primary then along chain hops */ }}`.
  - 600ms minimum = 36 frames.
  - 20° cone = `Math.PI / 9`.
  - 32/15/8 damage with 2-hop chain max.
  - Energy spent only on actual fire (8 energy on release).
- Fire logic:
  - Find all enemies/turrets inside the 20° × 320px cone from ship nose. Apply `primaryDmg` to each.
  - For each primary-hit enemy, find the nearest enemy within `chainHopMaxDist`, NOT already hit. Apply `chainDamages[0] = 15`. Repeat for second hop with `chainDamages[1] = 8`.
  - Each enemy hit at most once per cast.
  - Buildings/asteroids do NOT chain (turrets do, per spec — turrets are valid chain targets).
- Visual: a brief lightning bolt polyline (life ~10 frames) added to a new visual array `ctx.arc` (or piggy-back on `ctx.lsb` with a dedicated draw style). Add a small flash at each hit point.

**Depends on:** Phase 0 (F-05)

**Acceptance:** Hold fire 600ms+, release. A cone of damage applies to enemies in front; chain effect visibly arcs to nearest 2 enemies. Released before 600ms = no fire, no energy lost.

---

## Phase 3 — Magazine + spool weapons (parallelizable, after Phase 0)

### P3-01. Flak Cannon

**Goal:** Add FLAK CANNON. Magazine-based burst weapon. Tap = burst. Hold while mag<5 = reload.

**Files:** `data/weapons.js`, `weapon-mechanics.js`

**Outline:**
- New fire mode `'magazine-burst'`:
  - On tap (release within ≤8 frames AND `mag>0`): fire one burst (8 projectiles in 30° arc), consume 1 mag.
  - On hold (>8 frames) AND `mag<magMax` AND not reloading: `beginReload(s, slot)` (3s).
  - On hold AND `mag===magMax`: do nothing (wait for release).
  - On tap AND `mag===0`: click sound, no fire.
- Row: `{id:'flak cannon', name:'FLAK CANNON', wpnType:'kinetic', fireMode:'magazine-burst', dmg:5, spd:12, life:30, burstCount:8, burstSpread:Math.PI*30/180, cd:0.15, magMax:5, ammoMax:100, reloadSec:3.0, aiPolicy:null, buyable:true, licensePrice:3200, buildPrice:420}`.
- Burst spawn: 8 bullets at random angles within ±15° of aim, each carrying `wpId:'flak cannon'`, `dmg:5`, `spd:12`, `life:30 frames` (so range = 30*12 = 360px).
- Manual reload allowed at any `mag<magMax`. Reload pulls `magMax - mag` from reserve `ammo`; if reserve has fewer, mag fills with what's available.
- Cooldown 0.15s between consecutive taps when held — but per G10.1, holding a full mag does NOT auto-fire bursts. So the 0.15s cd applies only between taps.
- Below-ship: magazine bar always shown when `mag<magMax`. Reload progress bar appears under the magazine bar during reload.

**Depends on:** Phase 0 (F-04)

**Acceptance:** Tap fire → 8-projectile burst, mag goes 5→4. Tap 5 times — mag at 0; further taps click. Hold fire — reload starts, 3s progress bar fills, mag returns to 5/5 (consumes 5 reserve). Tap, then tap again 0.15s later — both fire.

---

### P3-02. Rotary Autocannon

**Goal:** Add ROTARY AUTOCANNON. Spool-up weapon that fires sustained rapid bullets in a 2° cone.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `audio.js`

**Outline:**
- New fire mode `'spooled-projectile'`:
  - On press: increment `spool` by 1/frame (spool ramps over `spoolFrames` = 6 to reach 1.0).
  - On release: decrement `spool` by 1/frame (decays back to 0 over the same duration).
  - When `spool >= 1.0` AND held: fire 1 bullet per `cd` frames (8 shots/sec → cd=7 frames-rounded, but use 7.5 frames via accumulator if exact rate matters; rounding to 8 is acceptable).
  - When `spool > 0` AND repressed before fully decayed: spool re-ramps from current value (faster ready time on quick re-press).
- Row: `{id:'rotary autocannon', name:'ROTARY AUTOCANNON', wpnType:'kinetic', fireMode:'spooled-projectile', dmg:5, spd:12, life:80, cd:7, spoolFrames:6, fireSpread:Math.PI*1/180, ammoMax:500, aiPolicy:null, buyable:true, licensePrice:3800, buildPrice:480}`.
- Each fire consumes 1 ammo. Spool-up does NOT consume ammo.
- Sound (`audio.js`): on first frame of spool, start a high rising sine tone (e.g. `toneRise(800, 1400, .1, 'sine', .04)`). While spool == 1.0 AND firing, sustain at 1400 Hz with periodic chuf (existing `tone(...)` per shot is fine). On release, drop pitch back from 1400→800 over the decay window.
- Visual: small white bullet, slight muzzle flash at fire offset.

**Depends on:** Phase 0

**Acceptance:** Hold fire — 100ms windup, then 8 shots/sec sustained. Release — spool decays. Tap-tap-tap rapidly — second press has shorter time-to-fire than the first. Audio rises on spool, sustains during fire, lowers on release.

---

## Phase 4 — Stateful projectile weapons (parallelizable, after Phase 0)

### P4-01. Shredder Shot

**Goal:** Add SHREDDER SHOT. Slow slug; tap-fire while in flight = detonate into shotgun spread.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- New fire mode `'detonate-projectile'`:
  - On tap AND no active slug: fire a new slug. `s.weapons[slot].activeSlugId = slug.id`.
  - On tap AND active slug exists (alive in flight): detonate (spawn 8 pellets at slug position, in 25° arc around slug velocity vector). Slug removed.
  - On slug hit (terrain/enemy/building): slug deals `slugDmg` and removes itself; `activeSlugId` cleared. Detonation no longer possible.
  - On slug expire (life ends): slug removed; `activeSlugId` cleared.
  - Cooldown `cd` starts when slug detonates / impacts / expires (not on initial fire).
- Row: `{id:'shredder shot', name:'SHREDDER SHOT', wpnType:'kinetic', fireMode:'detonate-projectile', slugDmg:20, slugSpd:4, slugLife:90, pelletCount:8, pelletDmg:8, pelletSpd:12, pelletLife:30, pelletArcRad:Math.PI*25/180, ammoMax:40, cd:0.4, aiPolicy:null, buyable:true, licensePrice:3000, buildPrice:400, drawSlug:(b)=>{ /* 6px glowing bullet */ }, drawPellet:(b)=>{ /* small white bullet */ }}`.
- Each slug fire = 1 ammo. Detonation costs nothing.
- Encounter/site bullet loops: pellets are normal short-life bullets (use existing projectile hit logic). Slug carries `slug:true` flag and is rendered with `drawSlug`.
- AI policy `'detonate-projectile'` (in `weapon-ai.js`): enemy fires slug at target if cd ready and ammo > 0; on next frame after slug travels ~half its life, sends a synthesized tap to detonate. Simple and predictable.

**Depends on:** Phase 0

**Acceptance:** Tap fire — slug spawns. Tap fire mid-flight — slug detonates into 8 pellets in 25° cone of slug travel direction. Slug hits an enemy — 20 damage, no detonation possible. Cooldown begins on detonate/impact, not on fire.

---

### P4-02. Hull Buster

**Goal:** Add HULL BUSTER. Sticky missile, no direct-hit damage, alt-tap detonates for area damage. Heavy gravity ("bomb") on planet/cave/tunnel.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- `MISSILE_TYPES['hull-buster']` — distinct visual (e.g. `#ff4` body with thicker fin).
- New fire mode `'sticky-missile-detonate'`:
  - On tap AND no active hull-buster (`stickyMissileId === null`): fire missile, set `stickyMissileId`.
  - On tap AND active missile exists: trigger detonation sequence (100ms delay, then explode).
  - On missile expire (life ends without sticking): clear `stickyMissileId`, start cooldown 4s.
  - On missile detonate complete: clear `stickyMissileId`, start cooldown 4s.
  - Cannot fire next missile until cooldown elapses AND no active sticky.
- Row: `{id:'hull buster', name:'HULL BUSTER', wpnType:'missile', fireMode:'sticky-missile-detonate', missileType:'hull-buster', dmg:0, expDmg:100, expR:75, cd:4.0, spd:3, maxSpd:5, accel:0.05, life:240, hp:25, ammoMax:8, gravityScale:'bomb', detonateDelayFrames:6, aiPolicy:null, buyable:true, licensePrice:3500, buildPrice:460}`.
- Direct-hit damage = 0 (missile does NOT deal `dmg` on contact). Instead, on contact:
  - Enemy: stick (offset relative to enemy). If enemy moves, missile follows.
  - Building / turret: stick at point of contact.
  - Terrain: stick at point of contact.
  - If sticks to enemy and enemy dies before detonate: missile detaches, becomes free-fall under gravity until terrain or detonate.
- Detonation: 100ms (6 frames) red-flash visual delay, then standard explosion (`expDmg=100` to direct stuck target + radius damage to anything in `expR=75`).
- Gravity: `gravityScale: 'bomb'` interpreted as a fixed bomb-fall constant (e.g. 0.3 px/frame² downward, much heavier than the 0.001–0.008 planet gravity that the player ship feels). Identical to MAG MINE's gravity (P4-03). Define as `BOMB_GRAVITY = 0.3` in `weapon-mechanics.js` — but per user, do NOT make it a const intended to encompass all weapons of similar fall rate. Each weapon (hull buster, mag mine) reads `BOMB_GRAVITY` for now; future weapons may diverge.
- Encounter (zero-G space): no gravity applied; missile drifts per its launch velocity.
- AI policy `'sticky-detonate'` (in `weapon-ai.js`): fires when target in arc + range; after a fixed delay (e.g. 30 frames), synthesizes a second tap to detonate. Simple.

**Depends on:** Phase 0 (F-07 sticky helper)

**Acceptance:** Fire HULL BUSTER at enemy. Missile sticks, follows enemy. Tap fire again — 100ms delay, then explosion deals 100 damage at point + 75px radius. Cooldown 4s after detonate. On planet surface, missile falls visibly faster than the ship.

---

### P4-03. Mag Mine Launcher

**Goal:** Add MAG MINE LAUNCHER. Deploys a mine that triggers on enemies in close radius, then pursues+explodes.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- `MISSILE_TYPES['mag-mine']` — distinct (spiked sphere visual).
- New fire mode `'mine-deploy'`:
  - On tap: launch mine. Mine has initial velocity = `vmine = vship × 1.1 + nose × 0.5`.
  - Cooldown after launch (cd field).
- Mine state machine:
  - `armed` — drifting, gravity applied per `BOMB_GRAVITY`. Also sticks to terrain on collision (becomes stationary armed).
  - `triggered` — after first eligible enemy enters `triggerR=50px`, mine pursues at `pursuitAccel=0.2/frame`, max `pursuitMaxSpd=8`. Timer counts down `triggerDelay=60 frames` before forced explosion.
  - `exploded` — applies `expDmg=100` in `expR=60`, removes self.
- Eligibility (per F-07 `mineTriggerCheck`): player-launched mines target enemies only (no buildings, no friendlies, no asteroids, no self). No friendly fire. No self-injury.
- 30s self-destruct (1800 frames) if never triggered: explodes (NOT harmless — applies `expDmg` at mine position).
- Row: `{id:'mag mine launcher', name:'MAG MINE LAUNCHER', wpnType:'missile', fireMode:'mine-deploy', missileType:'mag-mine', expDmg:100, expR:60, cd:1.5, spd:0, maxSpd:0, accel:0, life:1800, hp:30, ammoMax:5, triggerR:50, triggerDelay:60, pursuitAccel:0.2, pursuitMaxSpd:8, gravityScale:'bomb', aiPolicy:'mine-deploy', buyable:true, licensePrice:3400, buildPrice:440}`.
- Visual: small spiked sphere, pulsing red light when armed; solid red blink when triggered; standard explosion on detonate.
- Gravity: same as Hull Buster — reads `BOMB_GRAVITY`.

**Depends on:** Phase 0 (F-07 mine-trigger helper)

**Acceptance:** Fire MAG MINE in encounter. Mine drifts (or falls in surface). Enemy approaches within 50px — mine pursues, accelerating, explodes after 60 frames. No trigger from buildings or player. After 30s without trigger, mine explodes at its location.

---

## Phase 5 — Targeting weapons (after Phase 0)

### P5-01. Hydra Micro Missiles

**Goal:** Add HYDRA. Tap-cycle target lock, hold to launch 4-then-4 missile salvos that initially fire backward, then turn and accelerate toward locked target.

**Files:** `data/weapons.js`, `weapon-mechanics.js`, `encounter.js`, `site.js`

**Outline:**
- `MISSILE_TYPES['hydra']` — small, fast-looking visual.
- New fire mode `'target-lock-burst-burst'`:
  - On tap (release within ≤8 frames): cycle target via F-06 helper; no fire.
  - On hold past 8 frames AND `lockedTargetId` exists AND `ammo>0`: launch first burst of 4 missiles. Set `weapons[slot].secondBurstFrame = G.fr + 6` (100ms later). Consume 1 ammo. Reset trigger on release.
  - On hold past 8 frames AND no lock: error tone, no fire, no ammo consumed.
  - Each frame: if `secondBurstFrame === G.fr`, launch second burst of 4 missiles toward the same locked target. Clear `secondBurstFrame`. (No additional ammo for second burst — both bursts come from the single ammo charge.)
- Row: `{id:'hydra', name:'HYDRA MICRO MISSILES', wpnType:'missile', fireMode:'target-lock-burst-burst', missileType:'hydra', dmg:8, expDmg:5, expR:18, cd:1.5, spd:1.5, maxSpd:7, accel:0.18, life:140, hp:8, ammoMax:5, burstCount:4, burstCount2:4, secondBurstDelayFrames:6, targetLockRange:800, lockBreakRange:1000, targetLockArc:Math.PI/4, launchPhase1Frames:24, launchSpread:Math.PI/4, seekTurnRate:0.18, seekTargetKinds:['enemy','turret'], aiPolicy:null, buyable:true, licensePrice:4800, buildPrice:600}`.
- Missile launch (per burst): each missile spawns from ship rear (`x - sin(a)*8, y + cos(a)*8`) with initial velocity = `-shipNose × 1.5 + lateralSpread`. Lateral spread randomized within ±22.5° (`launchSpread/2`).
- Missile two-phase update (in `updEncMissiles` etc.):
  - Phase 1 (frame 0–24): velocity per launch vector; speed ramps via `accel`.
  - Phase 2 (frame 25+): heat-seek toward `lockedTargetEntity` (or, if dead, toward last known position; if last position invalid, fly straight). Use F-07 `heatSeekTurn` with `seekTurnRate`.
- Damage: 8 direct, 5 in 18px explosion.
- Lifetime: 140 frames per missile. If target dies before missile arrives, missile flies on last heading until life expires.
- Selection square (F-06): drawn while `lockedTargetId` is non-null.

**Depends on:** Phase 0 (F-06, F-07)

**Acceptance:** Tap fire — selection box cycles to next enemy in 800px range, prefers targets in front. Hold fire — 4 missiles launch backward, spread, then turn and seek the locked target. 100ms later, 4 more missiles launch the same way. Total 8 missiles per fire, 1 ammo consumed. 5 fires before reserve depleted.

---

## Phase 6 — Polish

### P6-01. Audio polish

**Files:** `data/weapons.js`, `audio.js`, `weapon-mechanics.js`

**Outline:** Replace placeholder `tone(...)` calls with weapon-distinctive audio. Per-weapon fire tones, charge tones (Ion Cannon ramping pitch, Arc Caster capacitor whine), reload click (Flak), sticky-attach thud (Hull Buster), mine-trigger ping (Mag Mine), Hydra launch zip + seeker drone. Centralize in a `WEAPON_SOUNDS` table keyed by weapon id.

**Depends on:** All Phase 1–5.

---

### P6-02. Shop grouping by weapon type

**Files:** `base.js`, `ui/screens/base.js`

**Outline:** In the WEAPONS shop tab, group items by `wpnType`: KINETIC, then ENERGY, then MISSILE, with a 1-line section divider. Each group sorted by `licensePrice` ascending. Note: the shop UI is due for a total overhaul soon — keep this minimally invasive (one filter+sort pass), no DOM restructure.

**Depends on:** All Phase 1–5.

---

### P6-03. Balance pass

**Files:** `data/weapons.js`

**Outline:** Tuning sweep on damage, cd, ammo, energy cost, and license/build prices. No new mechanics. Document any final values in a comment block at the top of `WEAPONS`.

**Depends on:** All Phase 1–5.

---

## Recommended execution order

**Phase 0 sequential block:** F-01 → F-02.

**Phase 0 parallelizable block** (after F-02): F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-11. Within this block, F-09 depends on F-08; F-11 depends on F-03/F-04/F-09. Other tasks are independent.

**Phase 1** (parallel, after Phase 0): P1-01, P1-02, P1-03, P1-04.

**Phase 2** (parallel, after Phase 0): P2-01, P2-02.

**Phase 3** (parallel, after Phase 0): P3-01, P3-02.

**Phase 4** (parallel, after Phase 0): P4-01, P4-02, P4-03.

**Phase 5** (after Phase 0): P5-01.

**Phase 6** (after all weapons): P6-01, P6-02, P6-03.

Total: 11 foundation tasks + 12 weapon tasks + 3 polish tasks = **26 tasks**.
