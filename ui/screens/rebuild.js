'use strict';

// =============================================================================
// Rebuild menus.
// Phase 1 (key 'rebuild'):       chassis selection cinematic (08-c).
// Phase 2 (key 'rebuild-config'): ship configurator (shared with equip flow).
//
// Cinematic: full-bleed dark scene, "SHIP DESTROYED" heading, stake-lost line,
// last-3-chassis cards, secondary chip row (charity / quit to title).
// =============================================================================

function _rebuildRecentCards() {
  const list = Array.isArray(G.recentChassis) ? G.recentChassis : [];
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (seen.has(id)) continue;
    if (!hasLicense(id)) continue;
    const ch = CHASSIS.find(c => c.id === id);
    if (!ch) continue;
    seen.add(id);
    out.push(ch);
    if (out.length === 3) break;
  }
  return out;
}

// Maps a chassis array (most-recent first) to display order:
//   N=1 -> [most_recent]
//   N=2 -> [most_recent, 2nd_recent]
//   N=3 -> [2nd_recent, most_recent, 3rd_recent]
function _rebuildDisplayOrder(cards) {
  if (cards.length === 3) return [cards[1], cards[0], cards[2]];
  return cards.slice();
}

// Index of the most-recent chassis within the display layout (default focus).
function _rebuildDefaultFocusIdx(n) {
  return n === 3 ? 1 : 0;
}

function makeRebuildScreen() {
  if (!G.rebuildFlow) G.rebuildFlow = { phase: 'chassis', sel: 0 };

  const screen = new Screen({
    id: 'rebuild',
    layout: 'fullscreen',
    theme: 'warn',
    onCancel: null,
  });

  const cards = _rebuildRecentCards();
  const display = _rebuildDisplayOrder(cards);
  screen._cards = display;
  screen._focus = { row: 'cards', idx: _rebuildDefaultFocusIdx(display.length) };
  if (display.length === 0) screen._focus = { row: 'chips', idx: 0 };
  screen._diagrams = [];

  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme} rebuild-cinematic`;
    el.dataset.screen = this.id;

    const bg = document.createElement('div');
    bg.className = 'rebuild-bg';
    el.appendChild(bg);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 580');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('class', 'rebuild-debris');
    let rs = ((G.seed >>> 0) ^ 0xa5a5a5a5) >>> 0;
    const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 0x100000000; };
    for (let i = 0; i < 18; i++) {
      const x = rnd() * 800, y = rnd() * 580, sz = 2 + rnd() * 10, ang = rnd() * 360;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', y);
      r.setAttribute('width', sz);
      r.setAttribute('height', sz * 0.5);
      r.setAttribute('fill', 'none');
      r.setAttribute('stroke', 'rgba(255,136,68,.55)');
      r.setAttribute('transform', `rotate(${ang} ${x} ${y})`);
      svg.appendChild(r);
    }
    el.appendChild(svg);

    const glow = document.createElement('div');
    glow.className = 'rebuild-glow';
    el.appendChild(glow);

    const credits = document.createElement('div');
    credits.className = 'rebuild-credits';
    el.appendChild(credits);
    this._creditsEl = credits;

    const heading = document.createElement('div');
    heading.className = 'rebuild-heading';
    heading.textContent = 'SHIP DESTROYED';
    el.appendChild(heading);

    const stakeLost = document.createElement('div');
    stakeLost.className = 'rebuild-stake';
    const lost = (G.lastDeath?.stakeLost || 0).toLocaleString();
    stakeLost.textContent = `stake lost · ${lost} cr`;
    el.appendChild(stakeLost);

    const cardRow = document.createElement('div');
    cardRow.className = 'rebuild-card-row';
    cardRow.dataset.count = String(this._cards.length);
    el.appendChild(cardRow);
    this._cardRowEl = cardRow;
    this._cardEls = [];

    for (let i = 0; i < this._cards.length; i++) {
      const ch = this._cards[i];
      const card = document.createElement('div');
      card.className = 'rebuild-card';

      const name = document.createElement('div');
      name.className = 'rebuild-card-name';
      name.textContent = (ch.name || ch.id).toLowerCase();
      card.appendChild(name);

      const diagWrap = document.createElement('div');
      diagWrap.className = 'rebuild-card-diagram';
      const diag = new ShipDiagram({ chassisId: ch.id, loadout: { weapons: [] }, focusedSlotId: null });
      diagWrap.appendChild(diag.render());
      card.appendChild(diagWrap);
      this._diagrams.push(diag);

      const stats = new KeyValueRow({
        label: 'stats',
        value: chassisStatsText(ch, { slots: false }).toLowerCase(),
      });
      card.appendChild(stats.render());

      const cost = document.createElement('div');
      cost.className = 'rebuild-card-cost';
      const price = ch.buildPrice ?? 0;
      cost.textContent = price === 0 ? 'free' : `${price} cr`;
      card.appendChild(cost);

      const chip = document.createElement('div');
      chip.className = 'rebuild-card-chip';
      chip.textContent = '▶ rebuild';
      card.appendChild(chip);

      cardRow.appendChild(card);
      this._cardEls.push(card);
    }

    if (this._cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'rebuild-empty';
      empty.textContent = 'no licensed chassis available';
      cardRow.appendChild(empty);
    }

    const chipRow = document.createElement('div');
    chipRow.className = 'rebuild-chip-row';
    el.appendChild(chipRow);
    this._chipRowEl = chipRow;

    const charity = document.createElement('div');
    charity.className = 'chip rebuild-chip';
    charity.textContent = 'charity assistance';
    chipRow.appendChild(charity);

    const quit = document.createElement('div');
    quit.className = 'chip chip-bad rebuild-chip rebuild-chip-quit';
    quit.textContent = 'quit to title';
    chipRow.appendChild(quit);

    this._chipEls = [charity, quit];

    const footer = document.createElement('div');
    footer.className = 'rebuild-footer';
    el.appendChild(footer);
    this._footerEl = footer;

    this._el = el;
    return el;
  };

  screen.populateBody = function() {};

  screen.refresh = function() {
    if (!this._el) return;
    if (this._creditsEl) this._creditsEl.textContent = `cr ${G.credits}`;
    for (let i = 0; i < this._cardEls.length; i++) {
      const focused = this._focus.row === 'cards' && this._focus.idx === i;
      this._cardEls[i].classList.toggle('is-focused', focused);
    }
    for (let i = 0; i < this._chipEls.length; i++) {
      const focused = this._focus.row === 'chips' && this._focus.idx === i;
      this._chipEls[i].classList.toggle('is-focused', focused);
    }
    if (this._footerEl) {
      this._footerEl.textContent =
        bindHint('directions', 'select') + '   ' + bindHint('confirm', 'rebuild');
    }
  };

  screen.tick = function() { this.refresh(); };

  screen.handle = function(input) {
    const cardN = this._cards.length;
    const chipN = this._chipEls.length;
    if (input.left || input.right) {
      const delta = input.right ? 1 : -1;
      if (this._focus.row === 'cards' && cardN > 0) {
        this._focus.idx = (this._focus.idx + delta + cardN) % cardN;
      } else if (this._focus.row === 'chips' && chipN > 0) {
        this._focus.idx = (this._focus.idx + delta + chipN) % chipN;
      }
      this.refresh();
      return;
    }
    if (input.up || input.down) {
      if (this._focus.row === 'cards' && chipN > 0) {
        this._focus = { row: 'chips', idx: 0 };
      } else if (this._focus.row === 'chips' && cardN > 0) {
        this._focus = { row: 'cards', idx: _rebuildDefaultFocusIdx(cardN) };
      }
      this.refresh();
      return;
    }
    if (input.confirm) {
      if (this._focus.row === 'cards' && cardN > 0) {
        const ch = this._cards[this._focus.idx];
        ia();
        openRebuildConfig(ch);
        return;
      }
      if (this._focus.row === 'chips') {
        if (this._focus.idx === 0) {
          ia();
          applyCharityRebuild();
        } else {
          ia();
          G.rebuildFlow = null; G.ENC = null; G.site = null;
          openTitleMenu();
          saveGame();
        }
        return;
      }
    }
  };

  return screen;
}

registerScreen('rebuild', makeRebuildScreen);

// -----------------------------------------------------------------------------
// rebuild-config — phase 2; reuses ship configurator with rebuild-specific
// pricing and finalize behavior.
// -----------------------------------------------------------------------------

function makeRebuildConfigScreen() {
  return makeShipConfigurator({
    id: 'rebuild-config',
    theme: 'warn',
    flow: () => G.rebuildFlow,
    priceText: () => {
      const rf = G.rebuildFlow;
      if (!rf) return '';
      const cost = rebuildTotalCost(rf.chassisId, rf.shieldId);
      const ok = G.credits >= cost;
      return `cost: ${cost === 0 ? 'free' : cost + ' cr'}` + (ok ? '' : '   — insufficient credits');
    },
    confirmLabel: () => {
      const rf = G.rebuildFlow;
      if (!rf) return 'rebuild';
      const cost = rebuildTotalCost(rf.chassisId, rf.shieldId);
      return 'rebuild  ' + (cost === 0 ? 'free' : cost + ' cr');
    },
    onConfirm: () => {
      const rf = G.rebuildFlow;
      const ch = CHASSIS.find(c => c.id === rf.chassisId);
      if (!ch) { G.rebuildFlow = null; return; }
      finalizeRebuild(rf, ch);
    },
    onCancel: () => { G.rebuildFlow.phase = 'chassis'; },
  });
}

registerScreen('rebuild-config', makeRebuildConfigScreen);
