'use strict';

// =============================================================================
// Game-over and sector-cleared banner screens.
// Both block until Enter/Confirm; sector-cleared also shows credits.
// =============================================================================

function makeBannerScreen({ id, title, sub, theme, onContinue }) {
  const screen = new Screen({ id, layout: 'transparent', theme });

  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const banner = document.createElement('div');
    banner.className = 'banner';

    const t = document.createElement('div');
    t.className = 'title';
    t.textContent = title;
    banner.appendChild(t);

    if (sub) {
      const s = document.createElement('div');
      s.className = 'sub';
      s.textContent = sub;
      banner.appendChild(s);
    }

    const prompt = document.createElement('div');
    prompt.className = 'prompt';
    prompt.textContent = 'enter / start to continue';
    banner.appendChild(prompt);

    const seed = document.createElement('div');
    seed.style.marginTop = '24px';
    seed.style.fontSize = 'var(--fs-footer)';
    seed.style.color = 'var(--text-footer)';
    seed.textContent = 'seed  ' + seedText(G.seed).toLowerCase();
    banner.appendChild(seed);

    el.appendChild(banner);
    this._el = el;
    return el;
  };

  screen.populateBody = function() { /* no body */ };
  screen.handle = function(input) {
    if (input.confirm || input.cancel) onContinue();
  };

  return screen;
}

registerScreen('banner-game-over', () => makeBannerScreen({
  id: 'banner-game-over',
  title: 'game over',
  theme: 'danger',
  onContinue: () => { ia(); openTitleMenu(); },
}));

registerScreen('banner-sector-cleared', () => makeBannerScreen({
  id: 'banner-sector-cleared',
  title: 'sector liberated!',
  sub: 'credits  ' + G.credits,
  theme: 'cheat',
  onContinue: () => {
    ia();
    G.stake = 0; G.credits = 0; G.cleared = clearedForBodies(); G.lvState = {};
    openTitleMenu();
  },
}));
