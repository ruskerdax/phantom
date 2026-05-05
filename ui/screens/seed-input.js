'use strict';

// =============================================================================
// Seed-input modal (HTML <form> for proper text input).
// Replaces the legacy showSeedInput() that lived in phantom.html.
//
// API: showSeedInput(onConfirm) — sets G.seedInputOpen and stashes the callback;
// the screen mounts on the next frame. Submitting fires onConfirm with a seed
// or null (random); cancelling fires no callback.
// =============================================================================

let _SEED_INPUT_CB = null;

function showSeedInput(onConfirm) {
  _SEED_INPUT_CB = onConfirm;
  G.seedInputOpen = true;
}

function makeSeedInputScreen() {
  const screen = new Screen({
    id: 'seed-input',
    layout: 'modal',
    theme: 'default',
    title: 'set seed',
    subtitle: 'up to 8 hex digits — leave blank for random',
  });

  let inputEl = null;
  let errEl = null;

  // Cleanly close: clear flag (so input bridge unmounts) and reset callback.
  function close(result) {
    const cb = _SEED_INPUT_CB;
    _SEED_INPUT_CB = null;
    G.seedInputOpen = false;
    if (cb && result !== undefined) cb(result);
  }

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.alignItems = 'center';
    form.style.gap = '12px';
    form.style.padding = '12px 0';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-input';
    input.maxLength = 8;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'random';
    input.value = (G.customSeed != null) ? G.customSeed.toString(16).toUpperCase().padStart(8, '0') : '';
    inputEl = input;

    const err = document.createElement('div');
    err.className = 'input-error';
    errEl = err;

    const btnRow = document.createElement('div');
    btnRow.className = 'button-pair';
    btnRow.style.marginTop = '0';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'button is-focused';
    submit.textContent = 'confirm';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button';
    cancel.textContent = 'cancel';
    btnRow.appendChild(cancel); btnRow.appendChild(submit);

    form.appendChild(input);
    form.appendChild(err);
    form.appendChild(btnRow);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const val = input.value.trim().toUpperCase();
      if (val === '') { close(null); return; }
      if (!/^[0-9A-F]{1,8}$/.test(val)) { err.textContent = 'enter up to 8 hex digits (0-9, a-f)'; return; }
      close(parseInt(val, 16) >>> 0);
    });
    cancel.addEventListener('click', () => close());

    this._panelBody.appendChild(form);
  };

  screen.onMount = function() {
    setTimeout(() => inputEl && inputEl.focus(), 30);
    document.addEventListener('keydown', escListener, true);
  };
  screen.onUnmount = function() {
    document.removeEventListener('keydown', escListener, true);
  };
  function escListener(e) {
    if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  }

  // Block menu input from reaching anything else (the form takes keyboard).
  screen.handle = function(_input) { /* noop */ };
  screen.tick = function() { /* noop */ };

  return screen;
}

registerScreen('seed-input', makeSeedInputScreen);
