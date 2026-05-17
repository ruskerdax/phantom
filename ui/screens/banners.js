'use strict';

// =============================================================================
// Game-over banner — cinematic full-bleed scene shown after death.
// G.lastDeath is captured at death-time in state.js killShip; this screen
// renders it and routes to the rebuild flow on confirm.
// =============================================================================

registerScreen('banner-game-over', () => {
  const screen = new Screen({ id: 'banner-game-over', layout: 'fullscreen', theme: 'danger' });

  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme} banner-game-over`;
    el.dataset.screen = this.id;

    const bg = document.createElement('div');
    bg.className = 'banner-gameover-bg';
    el.appendChild(bg);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 580');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('class', 'banner-gameover-debris');
    let rs = (G.seed >>> 0) || 0x9e3779b1;
    const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 0x100000000; };
    for (let i = 0; i < 18; i++) {
      const x = rnd() * 800, y = rnd() * 580, sz = 2 + rnd() * 10, ang = rnd() * 360;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', y);
      r.setAttribute('width', sz);
      r.setAttribute('height', sz * 0.5);
      r.setAttribute('fill', 'none');
      r.setAttribute('stroke', 'rgba(184,74,58,.6)');
      r.setAttribute('transform', `rotate(${ang} ${x} ${y})`);
      svg.appendChild(r);
    }
    el.appendChild(svg);

    const glow = document.createElement('div');
    glow.className = 'banner-gameover-glow';
    el.appendChild(glow);

    const content = document.createElement('div');
    content.className = 'banner-gameover-content';

    const title = document.createElement('div');
    title.className = 'banner-gameover-title';
    title.textContent = 'GAME OVER';
    content.appendChild(title);

    const seedHex = seedText(G.seed).toLowerCase();

    const sub = document.createElement('div');
    sub.className = 'banner-gameover-sub';
    sub.textContent = `— ph-${seedHex} protocol terminated —`;
    content.appendChild(sub);

    const stakeLine = document.createElement('div');
    stakeLine.className = 'banner-gameover-stake';
    const lost = (G.lastDeath?.stakeLost || 0).toLocaleString();
    stakeLine.textContent = `stake lost · ${lost} cr`;
    content.appendChild(stakeLine);

    const statsLine = document.createElement('div');
    statsLine.className = 'banner-gameover-stats';
    const mins = Math.floor((G.run?.activeMs || 0) / 60000);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const sys = G.totals?.systemsVisited || 0;
    const kills = G.run?.kills || 0;
    statsLine.textContent = `seed ${seedHex} · ${sys} systems · ${kills} kills · ${hh}h ${mm}m`;
    content.appendChild(statsLine);

    const prompt = document.createElement('div');
    prompt.className = 'banner-gameover-prompt';
    prompt.textContent = bindHint('confirm', 'continue');
    content.appendChild(prompt);

    el.appendChild(content);
    this._el = el;
    this._promptEl = prompt;
    return el;
  };

  screen.populateBody = function() {};
  screen.refresh = function() {
    if (this._promptEl) this._promptEl.textContent = bindHint('confirm', 'continue');
  };
  screen.handle = function(input) {
    if (input.confirm || input.cancel) {
      ia();
      G.lastRun = {
        seed: G.seed,
        fate: 'destroyed',
        summary: { ...G.run, stakeLost: (G.lastDeath?.stakeLost || 0) },
      };
      openRebuildMenu();
    }
  };

  return screen;
});
