'use strict';

// =============================================================================
// Title screen (01-b) — two-pane: logo + menu left, run-summary panel right.
// Right pane shows current run if alive, last run if destroyed, omitted on
// clean install. Build version in bottom-right footer.
// =============================================================================

function makeTitleScreen() {
  const sv = (typeof loadSave === 'function') ? loadSave() : null;
  const aliveRun = !!(sv && sv.run && sv.run.startMs > 0 && !sv.needsRebuild);
  const hasLastRun = !!(sv && sv.lastRun && typeof sv.lastRun === 'object');

  // Populate G with persistent fields from save so RunSummaryPanel can read
  // them before the player has actually started a run via startFromSave().
  if (sv) {
    if (typeof normalizeRunState === 'function')    G.run = normalizeRunState(sv.run);
    if (typeof normalizeTotalsState === 'function') G.totals = normalizeTotalsState(sv.totals);
    G.lastRun = (sv.lastRun && typeof sv.lastRun === 'object') ? sv.lastRun : null;
    // Surface the saved seed so RunSummaryPanel's seed field reads correctly
    // before the player commits to continue/new run.
    if (Number.isFinite(sv.seed)) G.seed = sv.seed >>> 0;
  }

  const showCurrentPanel = aliveRun;
  const showLastPanel = !aliveRun && hasLastRun;

  const screen = new Screen({
    id: 'title',
    layout: 'transparent',          // canvas backdrop (starfield) shows through
    theme: 'default',
  });

  if (aliveRun) {
    screen.add(new Button({
      label: 'continue run',
      onConfirm: () => { ia(); startFromSave(); },
    }));
  }
  screen.add(new Button({
    label: 'new run',
    onConfirm: () => { ia(); startFromSave(); },
  }));
  screen.add(new Button({
    label: 'options',
    onConfirm: () => { ia(); openOptionsMenu('title'); },
  }));
  screen.add(new Button({
    label: 'credits',
    onConfirm: () => { ia(); uiPush(makeCreditsScreen()); },
  }));

  const runPanel = showCurrentPanel ? new RunSummaryPanel({ mode: 'current' })
                 : showLastPanel    ? new RunSummaryPanel({ mode: 'last' })
                 : null;
  if (runPanel) screen.add(runPanel);

  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme} title`;
    el.dataset.screen = this.id;
    // Override .screen.title's flex-end alignment so the two-pane split is centered.
    el.style.justifyContent = 'center';
    el.style.paddingBottom = '0';

    const split = document.createElement('div');
    split.style.display = 'grid';
    split.style.gridTemplateColumns = '1fr 1fr';
    split.style.columnGap = '64px';
    split.style.alignItems = 'center';
    split.style.justifyItems = 'center';
    split.style.width = '100%';
    split.style.maxWidth = '1100px';
    split.style.padding = '0 60px';
    split.style.boxSizing = 'border-box';

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.alignItems = 'center';
    leftCol.style.gap = '24px';

    const img = document.createElement('img');
    img.src = 'phantom.svg';
    img.alt = 'phantom';
    img.className = 'title-logo';
    // Static positioning instead of absolute (the old layout positioned it absolutely).
    img.style.position = 'static';
    img.style.transform = 'none';
    img.style.top = 'auto';
    img.style.left = 'auto';
    img.style.width = '420px';
    leftCol.appendChild(img);

    const menu = document.createElement('div');
    menu.className = 'title-menu';
    leftCol.appendChild(menu);
    this._menuEl = menu;

    const rightCol = document.createElement('div');
    rightCol.style.minWidth = '320px';
    rightCol.style.maxWidth = '460px';
    rightCol.style.width = '100%';
    this._rightEl = rightCol;

    split.appendChild(leftCol);
    split.appendChild(rightCol);
    el.appendChild(split);

    const hint = document.createElement('div');
    hint.style.position = 'absolute';
    hint.style.bottom = '18px';
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.fontSize = 'var(--fs-footer)';
    hint.style.color = 'var(--text-dim)';
    hint.style.letterSpacing = '.08em';
    el.appendChild(hint);
    this._hintEl = hint;

    const buildEl = document.createElement('div');
    buildEl.style.position = 'absolute';
    buildEl.style.bottom = '18px';
    buildEl.style.right = '24px';
    buildEl.style.fontSize = 'var(--fs-footer)';
    buildEl.style.color = 'var(--text-faint)';
    buildEl.style.letterSpacing = '.06em';
    buildEl.textContent = (typeof BUILD === 'string') ? BUILD : '';
    el.appendChild(buildEl);

    this._panelBody = menu;
    this._el = el;
    return el;
  };

  screen.populateBody = function() {
    if (!this._menuEl || !this._rightEl) return;
    this._menuEl.innerHTML = '';
    this._rightEl.innerHTML = '';
    for (const w of this.widgets) {
      if (w === runPanel) this._rightEl.appendChild(w.render());
      else this._menuEl.appendChild(w.render());
    }
  };

  const baseRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    baseRefresh();
    if (this._hintEl) {
      const txt = `${bindHint('up/down', 'select')}   ${bindHint('confirm', 'open')}`;
      if (this._hintEl.textContent !== txt) this._hintEl.textContent = txt;
    }
  };

  return screen;
}

registerScreen('title', makeTitleScreen);

// ---- Credits placeholder ---------------------------------------------------
function makeCreditsScreen() {
  const screen = new Screen({
    id: 'credits',
    layout: 'modal',
    theme: 'default',
    title: 'credits',
    footer: () => `${bindHint('confirm', 'back')}   ${bindHint('cancel', 'back')}`,
    onCancel: () => { uiPop(); },
  });

  screen.add(new TextRow({ text: 'coming soon' }));
  screen.add(new Button({ label: 'back', onConfirm: () => { uiPop(); } }));

  return screen;
}

registerScreen('credits', makeCreditsScreen);
