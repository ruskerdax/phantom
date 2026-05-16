# Implementation Plan: UI Rework

## How to use this plan

This document is the source of truth for a multi-task UI rework. Tasks are designed to be handed off to coding agents (Claude Code, Codex, etc.) one at a time, in the order specified at the bottom.

**Agent contract for each task:**
1. Read the **Conventions** section in full before implementing.
2. Read the target task block in full.
3. Implement only what the task specifies. No bonus refactors, no speculative abstractions, no features outside the block.
4. If the outline is ambiguous mid-implementation, stop and ask rather than guess.
5. Verify the **Acceptance** criterion in a browser (open `phantom.html`).
6. Mark the task done in this file by adding ✅ next to its heading, and commit everything (code + plan edit) together.

**Project notes:** Vanilla JS, no build step, all globals (no modules). Test by opening `phantom.html` in a browser. Save format is being intentionally broken — playtesters will wipe saves; do not write migration code.

**Wireframe reference:** `docs/wireframes/Phantom Wireframes.html` (open in a browser; ←/→ flips screens). Variation picks listed in **Conventions** below tell the agent which `*-a / *-b / *-c` panel is canonical.

---

## Conventions

**File paths.** All UI code is under `ui/`. Screen modules live in `ui/screens/*.js`. Shared widgets in `ui/widgets.js`. Visual tokens in `ui/theme.css`. Layout/state in `ui/ui.css`. Theme bridge (CSS → canvas) in `ui/theme.js`.

**File naming.** Avoid creating files with the same basename in different directories. Before adding a new file, scan for existing basenames and choose a distinct name.

**State model.** All new state lives on the existing global `G` (declared in `state.js`). Group new fields into sub-objects where it improves readability (`G.run`, `G.totals`, `G.system`) but never refactor existing flat keys.

**Save format.** No migrations. Playtesters wipe; if the schema changes, expect data loss.

**Wireframe variation picks (canonical):**
| Screen | Pick | |
|---|---|---|
| 01 Title | 01-b | "current run" panel if alive, "last run" if destroyed; no kill-phrase line; no seed display |
| 02 Pause | 02-b | Right pane is the 06-b ship readout inline; no separate ship-config entry |
| 03 Friendly Base | 03-a | Tabs reduced to `services` (default) ∙ `shop` ∙ `refit` |
| 04 Shop | 04-a | Stat compare against all equipped slots |
| 05 Configurator/Refit | 05-b | ←/→ slot, ↑/↓ weapon; deferred-confirm pricing |
| 06 Ship Readout | 06-b | Read-only blueprint; reused inline by pause |
| 07 Slipgate | 07-b | Full-bleed map only, no list |
| 08 Rebuild | 08-c | Wreckage cinematic, last-3-chassis cards |
| 09 Options | 09-b | Two-pane category list left, settings right |
| 10 Controls | 10-a | Sectioned grid (movement / combat / ui) |
| 11 Shaders | 11-a | Clean stepper list, no preview canvas |
| 12 Cheats | 12-a | Grouped sections (ship / wallet / world) |
| 13 Banners | 13-c | Game-over only — sector-cleared banner removed |
| 14 Seed Input | 14-a | Cosmetic cleanup |
| 15 Clear Data | 15-a | Red modal, simple yes/no |

**Universal prompt rule.** Every footer/hint that mentions a control must show keyboard *and* gamepad bindings together via the `bindPrompt(actionId)` helper introduced in F-03. No hardcoded `'esc'` / `'enter'` strings; no orphan `<span class="kbd">` chips outside the helper.

**HUD parity.** Bars in the canvas HUD (hp / energy / shield) and DOM bars (sliders, stat compare) must read from a single source of truth — the `--bar-*` tokens introduced in F-01, exposed to canvas via `themeBarTokens()` (F-11).

**Theme reuse.** Don't introduce per-screen literal colors. Themes are switched via `theme-*` classes on the screen container; widgets recolor automatically through `--accent`. Add new tokens to `theme.css` rather than inlining hex.

**Combat-design memory (preserve at all times):**
- Delta-V coasting is sacred — don't add sustained-thrust energy costs.
- Don't propose blanket per-weapon range falloff.
- Don't rework `ec.spd` or fighter AI overrides.

**Assumptions made during planning:**
- "Lifetime kills" counts encounter and surface enemy *ships* destroyed by the player. Buildings excluded.
- "Sectors cleared" is **derived** from the objective system rather than a flat counter. Post-OVERWORLD F-04, `G.cleared` is `{bodyId: true}` (object/map), not an array, so `.length` no longer works. The derived value is `enterableBodies().filter(b => bodyObjectivesAllComplete(b.id)).length` — i.e. the count of habitable/uninhabitable bodies whose own objectives are all complete. Helper lives in `objectives.js` (see F-14).
- "Systems visited" (lifetime) = distinct seeds added to `G.visitedSeeds` (re-visits don't increment).
- Recent-chassis FIFO records on `finalizeRebuild` (chassis change is rebuild-only; refit cannot change chassis).
- News ticker producers in v1 are objective completions only — other sources (hostile contact, market changes) are deferred.
- Pause-time excluded from `G.run.activeMs` — accumulate only when `!G.paused`.

---

## Cross-plan notes (Overworld & Star System Overhaul)

The overworld + star system rework (`OVERWORLD_REWORK_PLAN.md`) replaces `LV` / `PP` with a single `BODIES[]` global and adds two new DOM screens. When implementing UI rework tasks that touch system data or body listings, defer to these rules:

- **No materialized `G.system.sites`.** Screens that need to list sites read directly from `BODIES[]` (planets + moons + gas giants + star), `AB[]`, `HBASE`, `SLIPGATE`. The "visited" flag is derived from `lvState[bodyId]` existing. There is no separate `G.system.sites` field to keep in sync.
- **SiteMap widget (F-09)** — nodes are: planets (parent bodies), gas giants, asteroid fields, BASE, HBASE, SLIPGATE. The star is not a node (it's at world center and not interactable). Moons are **not** nodes; they appear as a sub-list in the right-side info card when a planet is focused. This keeps the map navigable as system body counts grow.
- **System Map submenu (P4-02)** — the right-side info card uses the `BodySummaryPanel` widget (F-16). It renders fields appropriate to the focused node's kind (planet/moon → full body data; gas giant → kind/size only; HBASE → 'hostile base' + objectives; asteroid field → 'asteroid field' + objectives; BASE/SLIPGATE → label only). For planets, a moon sub-list follows the body summary; the **first row is the parent planet itself**, and remaining rows are its moons in orbital order. Confirming a SiteMap node opens the `body-info` screen as a **read-only popup** (no `enter` button when reached from system map). Confirming a moon sub-list row swaps the right-card content to that moon (no popup, no jump).
- **New registered DOM screen `body-info`** — added by the overworld rework. Entry popup shown before player enters a site (size, gravity, type/subtype, population density, atmosphere, objectives + an `enter` button). Pauses the world. Body content rendered via `BodySummaryPanel` (F-16). When mounted in `'inspect'` mode from the system map, the `enter` button is hidden.
- **New registered DOM screen `body-select`** — selection popup shown when ≥2 interactable sites are within the player's interaction radius. Lists each as a focusable row; confirming a row either opens `body-info` (for enterable bodies + HBASE + asteroid fields) or fires the direct-interact action (for BASE / SLIPGATE).

---

## Phase 0 — UI Foundations (sequential)

### F-01. Theme tokens ✅

**Goal:** Add tokens for new typography sizes, status colors, and the bar primitive used by HUD + DOM.

**Files:** `ui/theme.css`

**Outline:**
- Add to `:root`: `--fs-row-strong:16px`, `--fs-stat-large:18px`, `--fs-tab:12px`, `--fs-ticker:11px`, `--fs-section:11px`.
- Add: `--gap-loose:16px`, `--pad-section:14px`.
- Add: `--stat-up:var(--accent)`, `--stat-down:var(--accent-warn)`, `--stat-neutral:var(--text-dim)`, `--badge-locked:var(--text-disabled)`.
- Add: `--ticker-bg:rgba(0,20,12,0.85)`, `--compare-bar-bg:rgba(0,80,50,0.25)`.
- Add bar tokens (single source of truth): `--bar-empty:#1a2a22`, `--bar-fill:var(--accent-dim)`, `--bar-fill-active:var(--accent)`, `--bar-fill-warn:var(--accent-warn)`, `--bar-fill-danger:var(--accent-danger)`, `--bar-h:10px`, `--bar-slot-w:18px`, `--bar-gap:2px`.

**Depends on:** —

**Acceptance:** Existing screens render unchanged. `getComputedStyle(document.documentElement).getPropertyValue('--bar-fill-active')` returns the green token.

---

### F-02. BUILD constant ✅

**Goal:** Single-source-of-truth build version string for the title screen footer.

**Files:** `version.js` (NEW), `phantom.html`

**Outline:**
- New file `version.js` — declares `const BUILD = 'v0.5.0';`.
- Add `<script src="version.js"></script>` in `phantom.html` near the top of the script block, before any UI script.

**Depends on:** —

**Acceptance:** `BUILD` is readable from any other script. No duplicates of the constant.

---

### F-03. bindPrompt helper ✅

**Goal:** One helper that emits keyboard+gamepad prompts, replacing all ad-hoc footer-prompt builders.

**Files:** `ui/input-bridge.js`

**Outline:**
- Add `bindPrompt(actionId)` returning `'[esc/start]'` if both bound, `'[esc]'` keyboard-only, `'[start]'` gamepad-only, `'[—]'` if neither. Read from `BND[actionId]`; format with `fmtKey` / `fmtBtn`.
- Add `bindHint(actionId, action)` returning `${bindPrompt(actionId)} ${action}` (the standard footer pattern).
- Reduce `pausePromptDOM(action)` to a one-liner: `return bindHint('pause', action)`.

**Depends on:** —

**Acceptance:** Calling `bindPrompt('pause')` returns both bindings. `pausePromptDOM('to resume')` produces the same output as before for screens still using it.

---

### F-04. SectionHeader + KeyValueRow widgets ✅

**Goal:** Two non-focusable display widgets used by every grouped-content screen.

**Files:** `ui/widgets.js`, `ui/ui.css`

**Outline:**
- `class SectionHeader extends Widget` — `new SectionHeader({label, color})`. Renders small-uppercase label + 1px dashed underline (`--divider`). `focusable=false`.
- `class KeyValueRow extends Widget` — `new KeyValueRow({label, value, valueColor})`. `value` may be a function for dynamic rendering. Flex row, `space-between`. `focusable=false`.
- CSS in `ui.css` under a new `/* === REWORK ADDITIONS === */` banner: `.section-header { font-size:var(--fs-section); letter-spacing:.14em; text-transform:uppercase; color:var(--text-dim); border-bottom:1px dashed var(--divider); padding-bottom:2px; margin:var(--pad-section) 0 6px; }` and `.kv-row { display:flex; justify-content:space-between; gap:var(--gap); font-size:var(--fs-row-detail); padding:2px 0; } .kv-row .kv-label { color:var(--text-dim); } .kv-row .kv-value { color:var(--text-strong); font-weight:700; }`.

**Depends on:** F-01

**Acceptance:** Adding both widgets to a test screen renders correctly; vertical nav skips them.

---

### F-05. StatCompareRow widget ✅

**Goal:** Side-by-side stat compare row for shop detail.

**Files:** `ui/widgets.js`, `ui/ui.css`

**Outline:**
- `class StatCompareRow extends Widget` — `new StatCompareRow({label, current, candidate, unit, betterIsHigher})`. Layout: `[label] [bar current → bar candidate] [+delta]`. `focusable=false`.
- Delta colored by direction × `betterIsHigher`. Use `--stat-up` / `--stat-down`.
- CSS: `.stat-compare { display:grid; grid-template-columns:80px 1fr 60px; column-gap:var(--gap); row-gap:3px; font-size:var(--fs-row-detail); }` plus `.stat-compare .bar { height:var(--bar-h); background:var(--compare-bar-bg); position:relative; } .stat-compare .bar > .fill { position:absolute; inset:0 auto 0 0; background:var(--bar-fill-active); } .stat-compare .delta.up { color:var(--stat-up); } .stat-compare .delta.down { color:var(--stat-down); }`.

**Depends on:** F-01, F-04

**Acceptance:** Test row with `current=80, candidate=120, betterIsHigher=true` renders `+40` in green; reversed args render `-40` in orange.

---

### F-06. Tabs → TabBar rename ✅

**Goal:** Rename the existing non-focusable `Tabs` widget into a focusable `TabBar` with badges and migrate the only caller.

**Files:** `ui/widgets.js`, `ui/screens/base.js`, `ui/ui.css`

**Outline:**
- Rename class `Tabs` → `TabBar` in `ui/widgets.js`. Make it focusable; add `handle(input)` that consumes Left/Right and calls `onChange(tabId)`.
- New API: `new TabBar({tabs:[{id,label,badge?}], get, set, onChange})`. `badge` may be a function returning a number/string.
- Update `ui/screens/base.js` to construct a `TabBar` widget rather than rolling its own DOM (Phase 3 refit will fully migrate base — for this task, just keep behaviour identical).
- CSS: `.tab-bar { display:flex; gap:0; border-bottom:1.5px solid var(--accent-dim); } .tab-bar .tab { padding:6px 12px; font-size:var(--fs-tab); letter-spacing:.1em; text-transform:lowercase; color:var(--text-dim); border:1.5px solid transparent; border-bottom:none; } .tab-bar .tab.is-active { color:var(--accent); border-color:var(--accent-dim); border-bottom-color:var(--panel-bg); background:var(--panel-bg); } .tab-bar .tab .tab-badge { margin-left:6px; color:var(--accent); font-weight:700; }`.

**Depends on:** F-01

**Acceptance:** Friendly base tabs render and switch as before; no regressions.

---

### F-07. NewsTicker widget ✅

**Goal:** Pulsing dot + scrolling event ribbon.

**Files:** `ui/widgets.js`, `ui/ui.css`

**Outline:**
- `class NewsTicker extends Widget` — `new NewsTicker({items: () => [string, ...]})`. CSS-only animation, no JS tick. `focusable=false`. Hide the whole element when items list is empty.
- CSS: `.news-ticker { display:flex; align-items:center; gap:10px; padding:6px 10px; background:var(--ticker-bg); border:1px solid var(--accent-dim); font-size:var(--fs-ticker); overflow:hidden; }` plus `.news-ticker .pulse { width:8px; height:8px; flex-shrink:0; background:var(--accent); animation: ticker-pulse 1.4s ease-in-out infinite; } .news-ticker .track { display:inline-flex; gap:32px; white-space:nowrap; animation: ticker-scroll 30s linear infinite; }` plus `@keyframes ticker-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } } @keyframes ticker-scroll { from { transform:translateX(0) } to { transform:translateX(-50%) } }`.

**Depends on:** F-01

**Acceptance:** Test ticker with 3 items scrolls smoothly; pause does not reset its CSS animation.

---

### F-08. ShipDiagram widget ✅

**Goal:** SVG ship silhouette + slot pins reading from the existing canvas chassis polygon (no duplicate art).

**Files:** `ui/widgets.js`, `ui/ui.css`, `data/ships.js`, `draw.js` (or wherever canvas chassis is drawn)

**Outline:**
- Locate the canvas chassis polygon source. If it's a literal in `draw.js`, extract it into `data/ships.js` as `chassisPolygon(chassisId)` returning `[[x,y], ...]` in chassis-local coordinates. Update the canvas drawer to call this helper. **Single source of truth** — no duplicated coordinates anywhere.
- Slot positions: two slots stacked vertically, both centered on the longitudinal axis (slot 1 above, slot 2 below). For chassis with 3+ slots, lay them along the centerline at evenly-spaced y intervals. Add `chassisSlotPositions(chassisId)` helper alongside `chassisPolygon`.
- `class ShipDiagram extends Widget` — `new ShipDiagram({chassisId, loadout, focusedSlotId})`. Mutators: `setFocusedSlotId(id)`, `setLoadout(loadout)`. `focusable=false`.
- States per slot: `empty` (outlined circle), `equipped` (filled circle), `focused` (pulses with `--accent`).
- CSS: `.ship-diagram { width:100%; aspect-ratio:16/10; } .ship-diagram .hull { fill:none; stroke:var(--accent); stroke-width:1.5; vector-effect:non-scaling-stroke; } .ship-diagram .slot { fill:none; stroke:var(--accent-dim); stroke-width:1.2; } .ship-diagram .slot.is-equipped { fill:rgba(0,255,136,.12); stroke:var(--accent); } .ship-diagram .slot.is-focused { stroke:var(--accent); stroke-width:2; filter:drop-shadow(0 0 6px var(--accent)); animation: ship-slot-pulse 1.2s ease-in-out infinite; } @keyframes ship-slot-pulse { 0%,100% { opacity:1 } 50% { opacity:.55 } }`.

**Depends on:** F-04

**Acceptance:** Mounting `new ShipDiagram({chassisId:'kestrel', loadout:G.loadout, focusedSlotId:0})` renders the same silhouette as the canvas HUD. Calling `setFocusedSlotId(1)` pulses slot 2.

---

### F-09. SiteMap widget ✅

**Goal:** Single radar/star-map widget used by pause's system map (mode `'system'`) and slipgate (mode `'slipgate'`).

**Files:** `ui/widgets.js`, `ui/ui.css`

**Outline:**
- `class SiteMap extends Widget` — `new SiteMap({mode, nodes: () => [{id,x,y,kind,label}], get, set, onConfirm})`. Focusable; consumes ←/→/↑/↓ and Confirm.
- Directional nav: pressed direction picks the node whose angle to current focus is closest to that compass direction within ±90°. **If no node lies in the pressed quadrant, wrap to the closest node by angle.**
- For `mode:'slipgate'`, x/y is computed deterministically from each destination seed: `angle = (seed * 0x9E3779B1) >>> 0 / 0xFFFFFFFF * 2π`, `radius = 0.55 + ((seed >> 8) & 0xFF) / 512` of the canvas radius. Center node = current system.
- For `mode:'system'`, x/y comes from the caller (pre-computed from in-system body positions or laid out in a circle).
- CSS: `.site-map { width:100%; height:100%; } .site-map .node { fill:var(--text); } .site-map .node.is-current { fill:var(--accent); } .site-map .node.is-focused { stroke:var(--accent); stroke-width:2; filter:drop-shadow(0 0 6px var(--accent)); animation: ship-slot-pulse 1.2s ease-in-out infinite; } .site-map .orbit { fill:none; stroke:var(--divider); stroke-dasharray:3 4; }`.

**Depends on:** F-08 (reuses the slot-pulse keyframe)

**Acceptance:** With 8 deterministic neighbors, pressing each compass direction lands on a sensible node; no dead presses.

---

### F-10. RunSummaryPanel widget ✅

**Goal:** 2-column KV grid of run stats, used by title (current/last) and game-over banner.

**Files:** `ui/widgets.js`

**Outline:**
- `class RunSummaryPanel extends Widget` — `new RunSummaryPanel({mode})`. `mode:'current'` reads from `G.run`; `mode:'last'` reads from `G.lastRun.summary`. `focusable=false`.
- Stats rendered: seed (hex), credits earned, systems visited, sectors cleared, kills, deaths, time (`{hh}h {mm}m` from `activeMs`), stake bonus (`+{n}%` green). Empty/missing fields render as `—`. Note: `sectorsCleared` on `G.run` is **derived** from the objective system (see F-14), not a flat counter incremented on `G.cleared` mutations.
- For `mode:'last'`, also render `fate: destroyed` in red.

**Depends on:** F-04, F-12 (state surfaces — but ship the widget skeleton first; it'll just render `—` until F-12 lands)

**Acceptance:** Mounting `new RunSummaryPanel({mode:'current'})` after one kill shows `kills: 1`.

---

### F-11. HUD bar token bridge ✅

**Goal:** Canvas HUD bars read the same `--bar-*` tokens as DOM widgets.

**Files:** `ui/theme.js`, `draw.js`

**Outline:**
- In `ui/theme.js`, add `themeBarTokens()` returning `{empty, fill, fillActive, warn, danger, h, slotW, gap}` parsed from `getComputedStyle(document.documentElement)`. Cache the result and invalidate when the existing theme reader invalidates.
- In `draw.js`, find every literal hex color in the HUD bar drawing path (search for `'#1a2a22'`, `'#00ff88'`, `'#0a6'`, etc., near hp / shield / energy bar code). Replace each with the corresponding `themeBarTokens()` field.
- Don't change visual output — defaults must match the previous literals exactly.

**Depends on:** F-01

**Acceptance:** Side-by-side screenshot of HUD before/after is pixel-identical. Changing `--bar-fill-active` in dev tools updates HUD bars on the next frame.

---

### F-12. State surfaces on G ✅

**Goal:** New per-run, lifetime, and ephemeral state fields, grouped on G.

**Files:** `state.js`

**Outline:**
- Add to G init:
  - `G.run = {startMs:0, activeMs:0, kills:0, creditsEarned:0, sectorsCleared:0, deaths:0, objectivesDone:0, objectivesTotal:0, stakeBonusPct:0}` — per-run, reset on new run / charity rebuild. `sectorsCleared` is **derived** (see F-14): it is recomputed from the objective system on objective completion, not maintained on `G.cleared` mutations.
  - `G.totals = {kills:0, systemsVisited:0, stakeEarned:0}` — lifetime; never reset except Clear Data.
  - `G.lastRun = null` — `{seed, fate:'destroyed', summary:{...G.run, stakeLost}}` set on death.
  - `G.recentChassis = ['kestrel']` — FIFO max 3, most-recent first.
  - `G.lastDeath = null` — `{stakeLost:number}`, ephemeral (consumed by banner + rebuild).
  - `G.system = G.system || {}; G.system.events = []` — `[{ts, text}, ...]`, FIFO cap 16, ephemeral.
- Add a helper `resetRunCounters()` that zeroes `G.run` (called on new run, charity rebuild, and tutorial start).

**Depends on:** —

**Acceptance:** All fields exist on a fresh `G`. `resetRunCounters()` zeroes `G.run` without touching `G.totals` or `G.lastRun`.

---

### F-13. Save format extension ✅

**Goal:** Persist `G.totals`, `G.lastRun`, `G.recentChassis`, and (when a run is in progress) `G.run`.

**Files:** `save.js`

**Outline:**
- Extend `saveGame()` payload: write `totals`, `lastRun`, `recentChassis`, and `run` (omit `run` if `G.st === 'title'` and no save context).
- Extend `loadGame()` to read these keys, defaulting to the F-12 init values when missing.
- Do NOT migrate old saves. Per the project's wipe policy.
- `G.lastDeath` and `G.system.events` are **not** persisted.

**Depends on:** F-12

**Acceptance:** Save round-trips: kill an enemy, save, refresh — `G.totals.kills` matches.

---

### F-14. Counter wiring ✅

**Goal:** Bump the F-12 counters at the right events.

**Files:** `encounter.js`, `surface-enemies.js`, `state.js`, `objectives.js`, `gen.js`, `main.js`

**Outline:**
- `G.run.kills` and `G.totals.kills`: bump in `encKillShip` and the surface enemy kill sink (locate the existing kill handler that awards stake/credits).
- `G.run.creditsEarned`: bump on every `G.credits += n` (gross only, no decrements).
- `G.run.sectorsCleared`: **derived**, not maintained on `G.cleared` mutations. After OVERWORLD F-04, `G.cleared` is `{bodyId: true}` (object/map), so `.filter`/`.length` no longer apply. Add a helper `derivedSectorsCleared()` in `objectives.js` returning `enterableBodies().filter(b => bodyObjectivesAllComplete(b.id)).length`, where `bodyObjectivesAllComplete(bodyId)` is true iff every objective with `o.bodyId === bodyId` has `complete === true` (and there is at least one such objective; bodies with zero objectives are not counted). Recompute `G.run.sectorsCleared = derivedSectorsCleared()` inside `completeObjective(id)` (alongside the slipgate-unlock recompute), and on world load.
- `G.run.deaths`: bump in the function that transitions `G.st` to `dead_ow` / `dead_enc`.
- `G.run.objectivesDone` / `Total`: sync from `G.objectives` after `syncDerivedObjectives()`.
- `G.totals.systemsVisited`: when `gen.js` records a new seed in `G.visitedSeeds` (only on a previously-unseen seed).
- `G.totals.stakeEarned`: in `addStake(n)`, bump only when `n > 0`.
- `G.run.activeMs`: in `main.js` update loop, accumulate `dt` only when `!G.paused && G.st !== 'title' && G.st !== 'dead_*'`.

**Depends on:** F-12

**Acceptance:** Killing one enemy increments both `G.run.kills` and `G.totals.kills` to 1. Saving + reloading after one full sector clear shows `G.run.sectorsCleared` correctly.

---

### F-15. News ticker plumbing ✅

**Goal:** Append objective-completion events to `G.system.events`.

**Files:** `objectives.js`

**Outline:**
- Add a helper `bodyShortName(bodyId)` in `bodies.js` returning the lowercased body id (e.g. `'p1'`, `'m2.0'`) for non-special sites, `'hbase'` / `'asteroid field'` / `'base'` / `'slipgate'` for the others.
- Add `objectiveShortLabel(o)` in `objectives.js` returning the type-portion of the label only (e.g. `'reactor destroyed'`, `'surface targets destroyed'`, `'civilian residences'`). The existing `objectiveLabel(type, bodyId)` (OVERWORLD F-04) which produces `'P1 REACTOR DESTROYED'` is unchanged; `objectiveShortLabel` is a new lowercase, body-prefix-less variant.
- In the function that flips `objective.complete = true` (likely `completeObjective` or the equivalent), append: `G.system.events.unshift({ts:Date.now(), text:`objective complete · ${bodyShortName(o.bodyId)}: ${objectiveShortLabel(o)}`}); if (G.system.events.length > 16) G.system.events.length = 16;`.
- Result reads e.g. `objective complete · p1: reactor destroyed`.
- No other producers in v1. Hostile-contact and market-change events are deferred.

**Depends on:** F-12

**Acceptance:** Completing an objective adds one entry to `G.system.events` formatted as above; entry shows in the friendly base ticker after Phase 3 lands.

---

### F-16. BodySummaryPanel widget ✅

**Goal:** A single widget that renders a body's (or non-body site's) summary fields. Consumed by both the `body-info` DOM screen (OVERWORLD U-01) and the system-map right-side info card (P4-02), so the displayed field set stays in sync.

**Files:** `ui/widgets.js`, `ui/ui.css`

**Outline:**
- `class BodySummaryPanel extends Widget` — `new BodySummaryPanel({siteRef, layout, moonFocusId})`.
  - `siteRef` is one of: `{kind:'body', body}` for planets/moons/gas giants/star, `{kind:'hbase'}`, `{kind:'asteroid', idx}`, `{kind:'base'}`, `{kind:'slipgate'}`.
  - `layout ∈ {'inspect','enter','compact'}`. `'inspect'` is the system-map right-card variant; `'enter'` is the body-info popup variant; `'compact'` is for the moon sub-list rows.
  - `moonFocusId` is the currently-highlighted moon (or parent planet) row id when used inside a planet card with a moon sub-list. The widget itself does **not** own the moon sub-list — that lives in the consumer screen — but the widget exposes a hook so the consumer can swap which body it renders without re-mounting.
  - `focusable = false` for the panel itself. The consumer is responsible for any focusable rows (e.g. the moon sub-list rows or the `enter` button).
- Mutator: `setSiteRef(siteRef)` re-renders in place. Used by P4-02 when the moon sub-list selection changes.
- Renderers per `siteRef.kind`:
  - `'body'` with `body.kind ∈ {'habitable','uninhabitable'}` (a planet or moon): full panel — id label (`p1`, `m2.0`), `SectionHeader` per group, `KeyValueRow`s for `size`, `gravity` (descriptive label from size: 1=none, 2=very little, 3=some, 4=moderate, 5=high, 6=very high), `type` (kind), `subtype`, `population` (`populationClass`; `'uninhabited'` for uninhabitable), `atmosphere` (atmoKind). Objectives section via `objectivePanelRows({layout:'planet', bodyId:body.id})` (helper extended by OVERWORLD F-04 to accept `bodyId`).
  - `'body'` with `body.kind === 'gas_giant'`: minimal panel — id label, `KeyValueRow`s for `size` and `type: gas giant`. No atmosphere/gravity/population/objectives section.
  - `'body'` with `body.kind === 'star'`: not rendered (the star is not a site; the consumer should never pass a star siteRef).
  - `'hbase'`: header label `hostile base`, `KeyValueRow`s as available (e.g. ARMADA fleet still active), objectives section showing HBASE objective state.
  - `'asteroid'`: header label `asteroid field`, objectives section showing the field's objectives (if any). No size/atmosphere fields.
  - `'base'`: label `friendly base`, single descriptive line, no objectives.
  - `'slipgate'`: label `slipgate`, single descriptive line indicating locked/unlocked.
- Layout variant `'enter'` (body-info popup): adds primary `enter` button at the bottom + `back` button. `enter` routes via `enterPlanetByBodyId(body.id)` for bodies, `enterAsteroidField(idx)` for asteroid fields, existing direct-interact path for HBASE. Disabled when the site has no interactable surface (gas giants, star). `back` pops the screen.
- Layout variant `'inspect'` (from system map): no `enter`/`back` buttons; the widget is read-only display. The consumer screen owns its own back/return prompt.
- Layout variant `'compact'` (per-moon row in the sub-list): one-line summary — `{id} · {subtype || kind} · size {n}`. Used by the moon sub-list rows the consumer renders; the widget exposes this as a static helper `bodySummaryRowText(body)` so the sub-list can use it without instantiating a Widget per row.
- CSS in `ui/ui.css` under the rework banner: `.body-summary { display:flex; flex-direction:column; gap:6px; } .body-summary .bsp-id { font-size:var(--fs-section); color:var(--text-dim); letter-spacing:.12em; text-transform:uppercase; }` plus reuse of `.section-header` / `.kv-row` from F-04.

**Depends on:** F-04, OVERWORLD F-04 (objectivePanelRows accepts `bodyId`)

**Acceptance:** Mounting `new BodySummaryPanel({siteRef:{kind:'body', body:BODIES[1]}, layout:'inspect'})` on a habitable planet renders id, size, gravity, type, subtype, population, atmosphere, and the planet's objectives. Switching `setSiteRef` to a moon of that planet updates all fields in place. A gas-giant siteRef renders only id + size + `type: gas giant`. An `'asteroid'` siteRef renders only the asteroid-field header + objectives section.

---

## Phase 1 — Smallest blast radius (parallelizable)

These three validate the F-04 widgets and `bindPrompt` in real screens. After F-* is done, all three can be picked up in parallel.

### P1-01. Options two-pane ✅

**Goal:** 09-b layout — categories list left, settings for the focused category right.

**Files:** `ui/screens/options.js`

**Outline:**
- Replace single-column body with a 2-pane layout. Left: `Button` rows for `audio`, `video`, `gameplay`, `controls`, `shaders`, `danger`. Each focuses a category; switching mutates a screen-local `selectedCategory` and re-populates the right pane.
- Right pane content per category, prefixed by `SectionHeader`:
  - `audio`: sound effects (Slider), music (Slider).
  - `video`: visual fx (Cycle), shaders (Toggle, disabled if `!shaderSupported()`), fullscreen (Toggle).
  - `gameplay`: dynamic zoom (Toggle), cheat mode (Toggle).
  - `controls`: single Button → `openControlsMenu()`.
  - `shaders`: single Button → `openShaderMenu()` (disabled if `!shaderSupported()`).
  - `danger`: clear-game-data Button (red).
- Footer: `bindHint('left/right', 'category')` + `bindHint('confirm', 'select')` + `bindHint('cancel', 'back')`. Use `bindPrompt` everywhere — no hardcoded glyphs.
- Preserve `optFrom` round-trip (selecting a category, then returning, must hit the original caller).

**Depends on:** F-03, F-04

**Acceptance:** Selecting `audio` then `video` swaps the right pane without re-mounting the screen. Hidden behaviours (saving settings, sounds on toggle) unchanged.

---

### P1-02. Controls sectioned grid ✅

**Goal:** 10-a — group `ACT_DEFS` rows under `SectionHeader`s, sticky column headers, gamepad+keyboard prompts.

**Files:** `ui/screens/controls.js`, `data/...` (or wherever `ACT_DEFS` is defined)

**Outline:**
- Add a `section: 'movement' | 'combat' | 'ui'` field to each `ACT_DEFS` entry. Default missing entries to `'ui'`.
- Group `KeyBinder` rows by section, with a `SectionHeader` between groups.
- Sticky column headers `action | keyboard ▶ | gamepad`; highlight active column with `--accent` (existing `optCol` state).
- Footer: `bindHint('left/right', 'column')` + `bindHint('confirm', 'remap')` + `del clear` + `bindHint('cancel', 'back')`.

**Depends on:** F-03, F-04

**Acceptance:** Sections render in order; vertical nav skips headers; rebinding still works.

---

### P1-03. Cheats grouped sections ✅

**Goal:** 12-a — group existing rows under three section headers.

**Files:** `ui/screens/cheats.js`

**Outline:**
- Group existing rows under `SectionHeader`s with `color:'var(--accent-cheat)'`:
  - `ship`: repair ship, invincibility (Toggle).
  - `wallet`: add 100k credits, zero credits.
  - `world`: teleport to slipgate, jump to seed, unlock slipgate.
- Footer: `bindHint('cancel', 'back')`.

**Depends on:** F-03, F-04

**Acceptance:** All cheats still work; sections render with yellow underline.

---

## Phase 2 — Ship widgets

### P2-01. Ship Readout ✅

**Goal:** 06-b blueprint — silhouette left, KV-grouped stats right. Read-only. Reused by pause's right pane.

**Files:** `ui/screens/ship-config.js`

**Outline:**
- Custom 2-column body (override `populateBody`):
  - Left 340 px: `ShipDiagram` with callout lines + slot labels (use SVG `<text>` nodes positioned next to slot pins).
  - Right 1fr: stack of three `SectionHeader`-grouped `KeyValueRow` groups: `stats` (hull, thrust, mass, energy), `loadout` (slot 1, slot 2, ..., shield), `credits` (credits, stake).
- Single Button({label:'close', onConfirm:pop}). Confirm or Cancel closes.
- **Export `populateShipReadoutBody(panelEl)`** so pause (P4-01) can embed the same DOM.
- Footer: `bindHint('confirm', 'close')` + `bindHint('cancel', 'close')`.

**Depends on:** F-04, F-08

**Acceptance:** Open from pause; layout matches 06-b; loadout row count adjusts for chassis with 3 or 4 slots.

---

### P2-02. Refit configurator (SlotPicker + deferred confirm) ✅

**Goal:** 05-b layout. New input model: ←/→ change slot, ↑/↓ cycle weapon. Deferred confirm with summed-diff cost.

**Files:** `ui/widgets.js` (new SlotPicker), `ui/screens/equip-config.js`

**Outline:**
- New widget `class SlotPicker extends Widget` in `ui/widgets.js`:
  - State: `slotIdx` (0..n-1), `partChoiceIdx` (0..choices-1).
  - `handle(input)`:
    - `left/right` → `slotIdx ±1`, snap `partChoiceIdx` to current part for that slot.
    - `up/down` → `partChoiceIdx ±1`, write the new part into `flow.slots[slotIdx]` immediately.
  - Refresh: re-renders the right-pane info card with the new slot's choices.
- Refactor `makeShipConfigurator(opts)`:
  - Replace per-slot Cycle rows with one `SlotPicker` row + a small info card.
  - Add `flow.original = {slots, shieldId}` snapshot when refit opens.
  - Compute `flow.cost` on every change as: sum of `itemBuildPrice(part)` for slots in `flow.slots` that differ from `flow.original.slots`, plus shield build price if shield differs. A→B→A in one session = 0 cost.
  - Confirm Button label: `confirm · {creditLabel(flow.cost)}` — disabled when `G.credits < flow.cost`.
- Layout:
  - Top half: `ShipDiagram` with the focused slot pulsing.
  - Right pane (260 px): info card for the focused slot — `SectionHeader('slot {n} · {kind}')`, current part name, brief stats, choice list (focused choice highlighted).
  - Bottom: confirm Button + back Button.
- Two callers:
  - `equip-config` (refit, theme `info`): uses the new deferred-cost model. Apply on confirm: debit, mutate `G.loadout`, mutate `G.OW.s`. **Don't** push to `G.recentChassis` (refit can't change chassis).
  - `rebuild-config` (theme `warn`): keeps existing rebuild-cost behaviour (full re-build, not diff). Push to `G.recentChassis` in `finalizeRebuild`.
- Footer: `bindHint('left/right', 'slot')` + `bindHint('up/down', 'weapon')` + `bindHint('confirm', 'apply')` + `bindHint('cancel', 'back')`.

**Depends on:** F-03, F-04, F-08

**Acceptance:** Press ←/→: focused slot pulses on the diagram, choice list updates. Press ↑/↓: chosen part updates live, cost recomputes. A→B→A returns cost to 0.

---

## Phase 3 — Friendly Base

### P3-01. Base shell ✅

**Goal:** 03-a tab structure with the **`services` (default) ∙ `shop` ∙ `refit`** tabs only. No sites/objectives tabs.

**Files:** `ui/screens/base.js`

**Outline:**
- Header row: lbl `friendly base`, title `{currentSite.name}`. Right side: chip group `cr {credits}` ∙ `stake {stake}` ∙ `hull {hull%}`.
- Replace ad-hoc tab DOM with a single `TabBar` widget. Tabs: `[{id:'services', label:'services'}, {id:'shop', label:'shop'}, {id:'refit', label:'refit'}]`. `TabBar` is the first focusable widget; `onChange` re-runs the body builder for the new tab.
- Tab state on `G.baseTab` (string id, not number — update existing reads).
- News ticker (full-width, bottom of panel): `new NewsTicker({items: () => G.system.events.map(e => e.text)})`. Hide if list is empty.
- Footer: `bindHint('left/right', 'tab')` + `bindHint('up/down', 'select')` + `bindHint('confirm', 'open')` + `bindHint('cancel', 'leave')`.

**Depends on:** F-06, F-07

**Acceptance:** Tab cycle works; news ticker visible only when events exist; left/right while tabbar is focused changes tab.

---

### P3-02. Services tab ✅

**Goal:** Left list of services (focusable rows), right pane shows info + action for the focused service.

**Files:** `ui/screens/base.js`, `base.js`

**Outline:**
- Left rail (240 px): one `Button` per service. v1: only `repair hull`. Disable when `s.hp >= s.maxHp`. Right value: `{baseRepairCost(s)} cr` or `full`.
- Right pane:
  - `SectionHeader('about')`, descriptive text via `TextRow`.
  - `KeyValueRow`s: current hull, max hull, cost.
  - `SectionHeader('action')`, primary `Button({label:'repair', ...})` whose `disabled` mirrors affordability + already-full.
- Confirming the left row also fires the action (parity with the right-pane button).

**Depends on:** P3-01, F-04

**Acceptance:** Repair works from both the left list and the right action button; disabled when full or unaffordable.

---

### P3-03. Shop tab ✅

**Goal:** 04-a stat compare. Single confirm replacing the old buy-then-equip overlay.

**Files:** `ui/screens/base.js`, `base.js`

**Outline:**
- Same 240/1fr split as services.
- **Left:**
  - Category pill row at top: `chassis ∙ weapons ∙ shields`. Tracked on a screen-local `shopCat` field.
  - Item list for selected category. Row: `name` left; right value `★ eq` (green) / `cost cr` / `lock` glyph.
- **Right:**
  - Title row + `chip green "licensed"` if owned.
  - Preview placeholder (`<div class="ph">` for now; vector art deferred).
  - `SectionHeader('stat compare · current ▶ candidate')`.
  - Stack of `StatCompareRow`:
    - Chassis: hull, thrust, slots, mass.
    - Weapons: dmg, rate, heat, range, plus `ammo` and `magazine` rows **only when the candidate weapon has the corresponding field** (`ammoMax` / `magMax`, both introduced by WEAPONS F-03/F-04). Ammo row compares `current.ammoMax` (or `—` if energy-only) vs `candidate.ammoMax`; magazine row compares `current.magMax` vs `candidate.magMax`. **Render one row per equipped weapon slot**, label `slot {n}: {wp.name}` (or `(empty)`). Compare candidate against each.
    - Shields: strength, regen.
  - Cost row: `cost {n} cr` + `chip green can afford` / `chip red insufficient`.
  - Action row: for multi-slot weapons, a small `target slot` `Cycle` over compatible empty slots, then a `buy & equip` Button reading from the cycle. Single-slot or non-weapon items skip the cycle. Secondary `buy only` Button retained for license-only purchases.
- Locked items: row dim, prereq tag. Confirm on locked = footer flash with prereq text, no transaction.
- Delete the old `shop-action` overlay registration in `ui/screens/base.js`.

**Depends on:** P3-01, F-05

**Acceptance:** Buy + equip in one confirm; multi-slot weapon respects the target-slot Cycle; affordability chip recomputes when credits change.

---

### P3-04. Refit tab ✅

**Goal:** Embed `makeShipConfigurator` (P2-02) inside the refit tab.

**Files:** `ui/screens/base.js`

**Outline:**
- Refit tab body: mount the configurator with theme `info` and the deferred-confirm flow from P2-02.
- Confirm: debit and apply (no chassis change).
- Cancel: return to base tabs without applying. The `flow.original` snapshot is taken when the tab is first focused.

**Depends on:** P2-02, P3-01

**Acceptance:** Switching to refit mid-shop preserves shop tab state; confirming refit charges only the diff cost; cancelling reverts.

---

## Phase 4 — Pause + submenus

### P4-01. Pause two-pane ✅

**Goal:** 02-b layout. Right pane is the 06-b ship readout body inline. New menu items: `system map`, `info`. No `ship config` entry.

**Files:** `ui/screens/pause.js`

**Outline:**
- Custom DOM: panel split into `pause-menu` (220 px) and `pause-dash` (1fr).
- `pause-menu` items, in order:
  - `resume`
  - `system map` → sets `G.systemMapOpen = true` (input bridge mounts the new screen)
  - `info` → sets `G.infoOpen = true`
  - `options` → existing path
  - `cheats →` (only when `G.cheatMode`) — existing path
  - `quit to title` — existing path
- `pause-dash`: call `populateShipReadoutBody(this._dashEl)` from P2-01. Read-only.
- **Live energy %** in the readout (per spec): the energy `KeyValueRow` reads from the same source the canvas HUD uses (locate energy/battery on `G.OW.s`); color value `--accent-warn` when under 30%.
- Footer: existing (seed + cheat-mode tail when `G.cheatMode`).

**Depends on:** P2-01

**Acceptance:** ESC opens, ESC closes; ship dashboard refreshes on each open; selecting `system map` or `info` mounts the right submenu.

---

### P4-02. System Map submenu ✅

**Goal:** Pause submenu derived from 03-c radar — right rail removed, selected-site info card above the news ticker.

**Files:** `ui/screens/system-map.js` (NEW), `ui/input-bridge.js` (register), `state.js`

**Outline:**
- No materialized `G.system.sites` field. Read site data directly from `BODIES[]` (filter to `kind !== 'star'`), `AB[]`, `HBASE`, `SLIPGATE`, `BASE`.
- New screen `makeSystemMapScreen()`:
  - Top: lbl `system view · {seedHex}`, sub `docked at {currentSiteName}` (resolve from `G.lvBodyId` or special-site id).
  - Center: `SiteMap({mode:'system', nodes: () => systemMapNodes(), get/set: focused site id, onConfirm: id => openBodyInfoInspect(id)})`. `systemMapNodes()` returns one node per: each non-moon body in `BODIES[]` (planets and gas giants), each asteroid field in `AB[]`, plus HBASE / BASE / SLIPGATE. Each node carries `{id, x, y, kind, label}`; positions come from each entity's current overworld coordinates (via `bodyOWPos(b)` for bodies). Moons are intentionally excluded from top-level nodes (see right-card moon sub-list). The current docked site renders with `is-current` styling.
  - **Right-side info card** (replaces the old ad-hoc rendering): mount `BodySummaryPanel` (F-16) with `layout:'inspect'` and a `siteRef` derived from the focused node:
    - Body (planet or gas giant) → `{kind:'body', body: bodyById(focused.id)}`.
    - Asteroid field → `{kind:'asteroid', idx}`.
    - HBASE → `{kind:'hbase'}`.
    - BASE → `{kind:'base'}`.
    - SLIPGATE → `{kind:'slipgate'}`.
  - **Moon sub-list**: when the focused node is a planet (`body.kind ∈ {'habitable','uninhabitable'}`) AND the planet has at least one moon, render a focusable sub-list below the `BodySummaryPanel`:
    - **Row 0** is the parent planet itself (so the player can navigate back to viewing the parent after inspecting a moon). Label `↑ {parent.id}` to indicate it's the parent.
    - Rows 1..N are the planet's moons sorted by `orbit.r` ascending.
    - Each row uses `bodySummaryRowText(body)` (F-16 helper) — one-line summary `{id} · {subtype || kind} · size {n}`.
    - Up/Down navigate within the sub-list. Confirming a row **swaps the right-card content** (calls `setSiteRef` on the `BodySummaryPanel`); does NOT open a popup, does NOT change the SiteMap focus.
  - Gas giants, asteroid fields, HBASE, BASE, SLIPGATE focus → no moon sub-list section.
  - Footer: `NewsTicker` reading `G.system.events`.
- **`openBodyInfoInspect(id)`** helper (in `ui/screens/system-map.js`, exported): mounts the `body-info` DOM screen (OVERWORLD U-01) in `'inspect'` mode (no `enter` button). When dismissed, returns to the system map. Routes per node kind:
  - Body / asteroid / HBASE → mount `body-info` with the appropriate `siteRef`.
  - BASE / SLIPGATE → noop (those nodes have nothing further to inspect from the map; they're direct-interact in the overworld).
- Theme: default green.
- Footer prompts: `bindHint('directions', 'select')` + `bindHint('confirm', 'inspect')` + `bindHint('cancel', 'back')`.
- Register: `registerScreen('system-map', makeSystemMapScreen)`.

**Depends on:** F-09, F-15, F-16, P4-01, OVERWORLD U-01 (the `body-info` screen accepts an `'inspect'` mode)

**Acceptance:** Open from pause; directional input switches focused site; right card updates via `BodySummaryPanel` (showing size, population, atmosphere, gravity, objectives for planets; minimal data for gas giants; appropriate labels for HBASE/asteroid/BASE/SLIPGATE); moons of the focused planet appear in the sub-list with the parent as row 0; confirming a moon row swaps the right card; confirming the SiteMap node opens `body-info` in inspect mode; ticker scrolls; ESC returns to pause.

---

### P4-03. Info submenu ✅

**Goal:** Pause submenu showing lifetime totals.

**Files:** `ui/screens/info.js` (NEW), `ui/input-bridge.js` (register)

**Outline:**
- New screen `makeInfoScreen()`:
  - Title `info`.
  - Body: `SectionHeader('lifetime')` + `KeyValueRow`s for `enemies killed: G.totals.kills`, `systems visited: G.totals.systemsVisited`, `total stake earned: G.totals.stakeEarned`.
  - `// TODO encyclopedia` stub comment.
  - Single `Button({label:'back', onConfirm:pop})`.
- Register: `registerScreen('info', makeInfoScreen)`.

**Depends on:** F-12, F-14, P4-01

**Acceptance:** Lifetime totals survive run resets; only Clear Data zeroes them.

---

## Phase 5 — Death loop

### P5-01. Slipgate full-bleed map

**Goal:** 07-b — replace the existing list with a single full-bleed `SiteMap`.

**Files:** `ui/screens/slipgate.js`

**Outline:**
- Replace existing list body with `new SiteMap({mode:'slipgate', nodes: () => slipNeighborList().map(seed => ({id:seed, ...layout, kind:G.visitedSeeds.includes(seed)?'visited':'unknown', label:hex(seed)})), get/set: focused seed, onConfirm: seed => { ia(); jumpToSeed(seed, G.seed); }})`.
- Right rail (180 px): destination summary card — seed (hex), badges (`visited` / `unknown` / `← back`), distance (deterministic from seed pair). Use `--accent-slip` chips.
- Theme: `slip`.
- Footer: `bindHint('directions', 'select')` + `bindHint('confirm', 'jump')` + `bindHint('cancel', 'leave')`.

**Depends on:** F-09

**Acceptance:** With 8 neighbors, every direction press lands on a node; confirm jumps; cancel returns.

---

### P5-02. Game Over banner (cinematic; drop sector-cleared)

**Goal:** 13-c only. Capture `G.lastDeath.stakeLost` before zeroing `G.stake`. Snapshot `G.lastRun` on continue. **Delete the `banner-sector-cleared` registration entirely.**

**Files:** `ui/screens/banners.js`, the death-transition function (probably `state.js` / `encounter.js`)

**Outline:**
- In the function that sets `G.st = 'dead_*'` / `G.needsRebuild = true`: `G.lastDeath = {stakeLost: G.stake}; G.stake = 0;`. Run before mounting the banner.
- Rewrite `banner-game-over`:
  - Custom DOM: full-bleed black background, debris drift SVG (~18 random rotated rects), radial red glow.
  - Title huge red `GAME OVER` with text-shadow.
  - Subtitle dim red `— ph-{seedHex} protocol terminated —`.
  - **Stake-lost line** (large, red, centered): `stake lost · {G.lastDeath.stakeLost.toLocaleString()} cr`.
  - Stats line (small): `seed {seedHex} · {systemsVisited} systems · {kills} kills · {hh}h {mm}m`.
  - Blink prompt: `bindHint('confirm', 'continue')`.
- `onContinue`: `G.lastRun = {seed:G.seed, fate:'destroyed', summary:{...G.run, stakeLost: G.lastDeath.stakeLost}}; openRebuildMenu();`.
- Delete `registerScreen('banner-sector-cleared', ...)`. Audit for any callers (likely none) — sector clear should produce no banner.

**Depends on:** F-12, F-14

**Acceptance:** Death zeros stake before banner mounts; banner shows correct lost amount; confirm advances to rebuild; sector clear no longer triggers a banner.

---

### P5-03. Rebuild cinematic

**Goal:** 08-c. Last 3 chassis as cards, equal-width columns, most-recent center for N=3.

**Files:** `ui/screens/rebuild.js`

**Outline:**
- Background: full-bleed dark + debris drift SVG + radial orange glow.
- **Top-left:** small `cr {credits}` line.
- **Center top:** large orange `SHIP DESTROYED` heading.
- **Below heading:** large red `stake lost · {G.lastDeath.stakeLost.toLocaleString()} cr`.
- **Center body — chassis cards:**
  - Source: `G.recentChassis` filtered to licensed chassis (`hasLicense(id)`), max 3, most-recent first.
  - Layout — equal-width columns inside a fixed container:
    - N=1: single full-width column.
    - N=2: 50/50, most recent left.
    - N=3: 33/33/33, **most recent center**, 2nd most recent left, 3rd right.
  - Default focus = most-recent column.
  - Each card: chassis name; small `ShipDiagram`; `KeyValueRow` stats line; cost (or `free`); focused card shows `▶ rebuild` chip.
- **Below cards:** secondary chip row — `charity assistance` + red `quit to title`.
- Input model:
  - ←/→ between cards.
  - ↑/↓ between cards row and the secondary chip row.
  - Confirm on a card → `openRebuildConfig(ch)` (existing path; uses `makeShipConfigurator` with theme `warn`).
  - Confirm on `charity assistance` → `applyCharityRebuild()` (forfeit credits — stake already 0).
  - Confirm on `quit to title` → existing path.
- In `finalizeRebuild(rf, ch)`: prepend `ch.id` to `G.recentChassis`, dedupe, cap at 3.
- Footer: `bindHint('directions', 'select')` + `bindHint('confirm', 'rebuild')`.

**Depends on:** F-08, F-12, P5-02

**Acceptance:** Death → banner → rebuild flow lands on the most-recent chassis; choosing it routes to existing rebuild-config; charity still zeroes credits.

---

## Phase 6 — Title + cosmetic polish

### P6-01. Title screen with run summary

**Goal:** 01-b. Two-pane layout: menu left, current/last run panel right. `BUILD` in footer. No kill-phrase line, no seed.

**Files:** `ui/screens/title.js`

**Outline:**
- Custom DOM: 2-column. Left: logo + menu. Right: run-summary panel (or empty for clean install).
- **Right pane logic:**
  - If a save with `G.run.startMs > 0` exists and the ship is alive → `RunSummaryPanel({mode:'current'})`.
  - Else if `G.lastRun` is non-null → `RunSummaryPanel({mode:'last'})`.
  - Else → omit the right pane (clean install).
- **Menu (left):**
  - If save exists and player alive → `continue run` as item 0 (focused by default).
  - Always: `new run`, `options`, `credits` (placeholder; opens a stub screen — see below).
- **Footer (bottom-right):** `v${BUILD}`. Nothing else.
- **Universal hint** at bottom-center: `bindHint('up/down', 'select')` + `bindHint('confirm', 'open')`.
- Register a placeholder `credits` screen with one `TextRow('coming soon')` and a back Button.
- Remove the existing `kill phrase activated, execute phantom protocol` tagline DOM.

**Depends on:** F-02, F-10, F-12

**Acceptance:** Clean install renders only `new run / options / credits`. After a death, `last run` panel renders. Mid-run, `current run` panel + `continue run` item.

---

### P6-02. Seed Input cleanup

**Goal:** 14-a cosmetic refresh of the existing modal.

**Files:** `ui/screens/seed-input.js`, `ui/ui.css`

**Outline:**
- Title in `--accent`, subtitle dim.
- Input field: `border:1.5px solid var(--accent); background:#0a0d0a; color:var(--accent); font-size:24px; letter-spacing:6px; text-shadow:var(--glow); text-align:center;`.
- Reserve a 14 px error-line slot below the input so layout doesn't jump on validation fail.
- Two-button row at bottom: secondary `cancel` + primary `▶ confirm`.
- Keep the existing `<form>` keyboard handling.

**Depends on:** F-01

**Acceptance:** Validation error doesn't shift the buttons; visuals match 14-a.

---

### P6-03. Clear Data simple

**Goal:** 15-a. Verify the current `ButtonPair` matches; no friction additions.

**Files:** `ui/screens/clear-data.js`

**Outline:**
- Confirm the panel uses `theme-danger` and the existing `ButtonPair({left:'back', right:'confirm'})` defaults to `back`.
- No type-confirm friction.

**Depends on:** —

**Acceptance:** Default focus on `back`; Erase All requires deliberate selection + confirm.

---

### P6-04. Shaders clean

**Goal:** 11-a — preset name big at top, parameters as a stepper list. Keep current shader rendering pipeline.

**Files:** `ui/screens/shaders.js`

**Outline:**
- Render the preset Cycle as a centered title block above the parameters (instead of an inline row).
- Wrap parameter stack with a `SectionHeader('parameters · {presetName}')`.
- Tail: `reset parameters`, `return`.
- Footer: `bindHint('left/right', 'adjust')` + `bindHint('cancel', 'back')`.
- **No preview canvas.** Existing shader pipeline untouched.

**Depends on:** F-04

**Acceptance:** Adjusting a parameter affects the live game canvas as before. Preset cycle visible at top.

---

### P6-05. bindPrompt audit

**Goal:** Sweep every screen footer / hint for hardcoded keys; replace with `bindPrompt` / `bindHint`. Delete back-compat shims.

**Files:** every `ui/screens/*.js`

**Outline:**
- Grep for `kbd`, hardcoded `'esc'`/`'enter'`/`'tab'` strings, `pausePromptDOM`, `inputPromptLabel`. Replace each with `bindPrompt(actionId)` or `bindHint(actionId, action)`.
- After all callers are migrated, delete `pausePromptDOM` if it's no longer referenced.
- Bump `BUILD` to `v0.5.0` (or next version) in `version.js`.

**Depends on:** F-03, all P*

**Acceptance:** No hardcoded key strings remain in screen footers. Both keyboard and gamepad bindings appear in all hints when both are bound.

---

## Recommended execution order

**Sequential block A (Foundations):** F-01 → F-02 → F-03 → F-04 → F-05 → F-06 → F-07 → F-08 → F-09 → F-10 → F-11 → F-12 → F-13 → F-14 → F-15 → F-16.

**Parallelizable block B** (after A): P1-01, P1-02, P1-03 — three agents can take one each.

**Sequential block C:** P2-01 → P2-02.

**Sequential block D:** P3-01 → P3-02 → P3-03 → P3-04.

**Sequential block E:** P4-01 → P4-02 → P4-03 (parallelizable after P4-01 lands).

**Sequential block F:** P5-01, P5-02 → P5-03 (P5-01 can run in parallel with P5-02).

**Parallelizable block G** (after all prior blocks): P6-01, P6-02, P6-03, P6-04.

**Final sweep:** P6-05.

Total: 31 tasks (16 foundations + 15 screen tasks).
