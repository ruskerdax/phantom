'use strict';

// =============================================================================
// Title screen — logo + tagline + menu (PLAY / OPTIONS).
// =============================================================================

function makeTitleScreen() {
  const screen = new Screen({
    id: 'title',
    layout: 'transparent',          // canvas backdrop (starfield) shows through
    theme: 'default',
  });

  // Custom DOM (we don't want a panel; logo and items are free-positioned)
  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme} title`;
    el.dataset.screen = this.id;

    const img = document.createElement('img');
    img.src = 'phantom.svg';
    img.alt = 'phantom';
    img.className = 'title-logo';
    el.appendChild(img);

    const tag = document.createElement('div');
    tag.className = 'title-tagline';
    tag.textContent = 'kill phrase activated, execute phantom protocol';
    el.appendChild(tag);

    const menu = document.createElement('div');
    menu.className = 'title-menu';
    el.appendChild(menu);
    this._panelBody = menu;

    this._el = el;
    return el;
  };

  screen.add(new Button({
    label: 'play game',
    onConfirm: () => { ia(); startFromSave(); },
  }));
  screen.add(new Button({
    label: 'options',
    onConfirm: () => { ia(); openOptionsMenu('title'); },
  }));

  return screen;
}

registerScreen('title', makeTitleScreen);
