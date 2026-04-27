# PHANTOM

> KILL PHRASE ACTIVATED, EXECUTE PHANTOM PROTOCOL

Phantom is a top-down space shooter inspired primarily by *Gravitar*, *Tyrian*, and *Brigador*. Fly an inertial-physics ship through a procedurally generated star system, fight fleets in open-space encounters, and descend into cave-site levels to liberate the sector.

Play the latest version [here](https://raw.githack.com/ruskerdax/phantom/master/phantom.html) (thanks, [Seth](https://github.com/sethrobinson)). You may need to clear your cache if you've played before.

## Running locally

Phantom is a single static HTML page with vanilla JavaScript — no build step, no dependencies, no package manager.

The simplest path is to open `phantom.html` directly in a browser:

```sh
open phantom.html        # macOS
xdg-open phantom.html    # Linux
start phantom.html       # Windows
```

If your browser blocks local script loading or you want a clean reload (Chrome is occasionally picky about `file://` URLs), serve the directory with any static server:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/phantom.html
```

Save data is stored in `localStorage` under the keys `phantom_save` and `phantom_bnd`. Clearing site data wipes your run.

## Controls

Keyboard defaults (rebindable in Options → Controls):

| Action          | Key       |
|-----------------|-----------|
| Rotate left     | `A`       |
| Rotate right    | `D`       |
| Thrust          | `W`       |
| Fire primary    | `J`       |
| Fire secondary  | `O`       |
| Shield (aux)    | `I`       |
| Pause           | `Esc`     |
| Confirm (menus) | `Enter`   |
| Navigate menus  | Arrow keys |

Gamepad is supported (Xbox layout by default — A/B/X/Y, Start). Button bindings are also rebindable. Plug in a controller and a prompt will appear on the title screen.

## Gameplay

- **Title → Slipgate**: New runs start on a fixed tutorial seed. Reach the slipgate to jump into the procedurally generated sector.
- **Overworld**: A large 2D system map with planets, a base, a slipgate, and patrolling fleets. Approach a fleet to drop into an encounter; approach a planet/cave site to descend.
- **Encounters**: Open-space arena combat against a fleet's composition. Enemies spawn relative to the contact angle from the overworld.
- **Cave sites**: Tyrian-vertical descent through procedurally generated cavern terrain — three named levels (`CAVERN PRIME`, `VORTEX STATION`, `CORE NEXUS`) with a reactor at the bottom. Clear all three to power the slipgate.
- **Base**: Spend credits on weapon/ship/aux licenses and rebuilds. License cost is one-time; build cost is paid per equipped instance.
- **Slipgate jumps**: Once activated, the slipgate lets you hop to neighboring system seeds. Visited seeds are remembered.

### Ships

Four chassis, each with different `maxHp` / `maxEnergy` / thrust profiles and weapon slot loadouts:

- **Kestrel Light** — balanced starter (kinetic + beam slots).
- **Sparrow Scout** — fast, energy-rich, fragile (one kinetic slot).
- **Ironclad Heavy** — heavy armor and dual kinetic slots, sluggish.
- **Viper Runner** — agile, with reverse thrusters.

### Weapons

- **Mass Driver** / **Railgun** — kinetic projectiles.
- **Pulse Laser** / **Particle Accelerator** — beam weapons (ray-cast, energy-gated; the PA charges before firing for a heavy hit).

### Aux

- **Standard Shield** / **Heavy Shield** — drains energy while active to deflect damage.

## Project layout

```
phantom.html        Entry point — loads scripts in order, sets up canvas + seed overlay.
main.js             Top-level update()/draw() loop, state-machine dispatch, pause/menu wiring.
state.js            Global G state object, ship factory, particle system, ray-cast laser.
util.js             Canvas dimensions (W/H, OW_W/OW_H, EW/EH) and geometry helpers.
input.js            Keyboard + gamepad polling, rebindable action bindings.
audio.js            WebAudio tone helpers.
draw.js             Shared rendering helpers (stars, scanlines, gamepad indicator).
save.js             localStorage save/load (`phantom_save`).
gen.js              Seeded RNG and world generation.
overworld.js        System map: planets, fleets, slipgate, encounter triggering.
encounter.js        Open-space fleet combat.
site.js             Cave-site descent levels.
base.js             Base UI: shop, licensing, rebuilds, ship config.
menus.js            Title, options, controls, slipgate, pause, rebuild screens.
data/ships.js       CHASSIS + AUX_ITEMS definitions.
data/weapons.js     WEAPON_TYPES behavior + WEAPONS stat blocks.
data/enemies.js     Enemy AI behaviors (interceptor, swarmer, capital, etc.).
data/levels.js      Cave-site templates + terrain generator.
```

The state machine is driven by `G.st` — `'title'`, `'overworld'`, `'encounter'`, `'play'` (site), `'base'`, `'slipgate'`, `'options'`, `'controls'`, `'rebuild'`, `'over'`, `'done'`, plus death sub-states. Both `update()` and `draw()` in `main.js` branch on it so only one subsystem runs per frame.

## Development

There's no toolchain — edit a `.js` file, reload the page, you're done. Scripts are loaded as plain `<script src>` tags in `phantom.html` in dependency order. Everything runs against a single 800×580 canvas, scaled to fit the viewport with `image-rendering: pixelated`.

If you add a new top-level script, remember to add a `<script>` tag in `phantom.html` *after* its dependencies.
