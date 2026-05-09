// All remaining screens (03-15). Injects sections into #screens.
(function() {
'use strict';

const SCREENS = document.getElementById('screens');

function addScreen({label, file, blurb, variations}) {
  const sec = document.createElement('section');
  sec.className = 'screen';
  sec.setAttribute('data-screen-label', label);
  const head = `
    <div class="screen-head">
      <h2>${label.replace(/^\d+\s+/, '').toLowerCase()}</h2>
      <span class="file">${file}</span>
      <span class="blurb">${blurb}</span>
    </div>`;
  const cards = variations.map((v, i) => {
    const num = label.match(/^\d+/)[0] + '·' + 'abc'[i];
    const kindClass = ['safe','stretch','wild'][i];
    const kindLabel = ['safe','stretch','wildcard'][i];
    return `
      <div class="card">
        <div class="card-label">
          <span class="num">${num}</span>
          <span class="kind ${kindClass}">${kindLabel}</span>
          <span class="desc">${v.desc}</span>
        </div>
        <div class="frame">${v.html}</div>
      </div>`;
  }).join('');
  sec.innerHTML = head + '<div class="row">' + cards + '</div>';
  SCREENS.appendChild(sec);
}

// shared snippets
const SCRIM = '<div class="scrim"></div>';
const TAG = (t) => `<div class="corner-tag">${t}</div>`;

// =============== 03 FRIENDLY BASE (the big one) ===============
addScreen({
  label: '03 Friendly Base',
  file: 'screens/base.js · the hub — sites, objectives, shop, news ticker',
  blurb: 'this is the brain of the system. shop is just one tab. surface where to go, what to do, and what\'s happening.',
  variations: [
  {
    desc: 'two-column hub: sites left, focused-site detail right, news ticker bottom, shop is a tab.',
    html: SCRIM + TAG('hub · v1') + `
      <div style="position:absolute; top:18px; left:24px; right:24px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div class="title-tx" style="color:var(--green); font-size:18px;">friendly base · helios station</div>
          <div class="lbl">system · 7e3a82c1 · sector 04</div>
        </div>
        <div style="text-align:right; font-size:11px;">
          <span class="dim">credits</span> <strong>8,420</strong> &nbsp; <span class="dim">stake</span> <strong>1,200</strong>
        </div>
      </div>
      <div style="position:absolute; top:62px; left:24px; right:24px;">
        <div style="display:flex; gap:1px; border-bottom:1px solid var(--ink-soft);">
          <div class="chip solid green" style="border-radius:0; padding:4px 10px;">sites</div>
          <div class="chip" style="border-radius:0; padding:4px 10px;">shop</div>
          <div class="chip" style="border-radius:0; padding:4px 10px;">objectives</div>
          <div class="chip" style="border-radius:0; padding:4px 10px;">services</div>
        </div>
      </div>
      <div style="position:absolute; top:96px; bottom:60px; left:24px; right:24px; display:flex; gap:14px;">
        <div style="flex:0 0 240px; border:1px solid var(--ink-soft); padding:8px;">
          <div class="lbl">sites in system · 4</div>
          <div class="menuline focus"><span class="ptr">▶</span>helios station <span class="v">★ here</span></div>
          <div class="menuline"><span class="ptr">▶</span>asteroid belt <span class="v">3 obj</span></div>
          <div class="menuline" style="color:var(--red);"><span class="ptr">▶</span>hostile base <span class="v">⚠</span></div>
          <div class="menuline"><span class="ptr">▶</span>derelict freighter <span class="v">?</span></div>
          <div class="menuline" style="color:var(--purple);"><span class="ptr">▶</span>slipgate <span class="v">→</span></div>
        </div>
        <div style="flex:1; border:1px solid var(--ink); padding:10px; background:rgba(31,138,91,.04);">
          <div class="lbl" style="color:var(--green);">selected · helios station</div>
          <div class="title-tx" style="font-size:14px; margin:2px 0 6px;">friendly trading hub</div>
          <div class="note s dim">a militia outpost. repair, refit, recruit. open trade.</div>
          <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:8px 0;" />
          <div class="lbl">objectives here · 2</div>
          <div style="font-size:11px; margin-top:2px;">
            <div>· deliver salvage · <span style="color:var(--green);">ready</span> <span class="dim">+800 cr</span></div>
            <div>· talk to dock master <span class="dim">side</span></div>
          </div>
          <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:8px 0;" />
          <div class="lbl">services</div>
          <div style="font-size:11px;"><span class="dim">repair hull</span> · 240 cr &nbsp;·&nbsp; <span class="dim">refuel</span> · 60 cr</div>
        </div>
      </div>
      <div style="position:absolute; bottom:24px; left:24px; right:24px;" class="ticker">
        <span class="pulse"></span><span class="dim">news ▮</span>
        <div style="overflow:hidden; flex:1;"><div class="ticker-track">
          <span>· hostile activity reported in sector 06 ·</span>
          <span>· cygnus chassis license now stocked at helios ·</span>
          <span>· stake bonus applied: +5% on completion ·</span>
          <span>· hostile activity reported in sector 06 ·</span>
          <span>· cygnus chassis license now stocked at helios ·</span>
        </div></div>
      </div>
      <div style="position:absolute; bottom:6px; right:24px; font-size:10px;" class="lbl">
        <span class="kbd">←→</span> tab · <span class="kbd">↑↓</span> select · <span class="kbd">enter</span> open · <span class="kbd">esc</span> leave
      </div>
      <div class="callout green" style="left:280px; top:64px;">↑ tabs are sticky;<br>shop is just one of them</div>
      <div class="callout" style="left:14px; bottom:80px;">↑ ticker scrolls<br>system events</div>
    `
  },
  {
    desc: 'list of sites collapses; selected site full-bleeds with objectives + actions inline. shop a sub-tab.',
    html: SCRIM + TAG('hub · v2 · "site cards"') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; align-items:center; justify-content:space-between; padding-bottom:6px; border-bottom:1px solid var(--ink-soft);">
        <div>
          <div class="lbl">friendly base ▮ system 7e3a82c1</div>
          <div class="title-tx" style="color:var(--green); font-size:16px;">helios station</div>
        </div>
        <div class="row-h gap-4" style="font-size:10px;">
          <span class="chip green">cr 8,420</span><span class="chip">stake 1,200</span><span class="chip">hull 76%</span>
        </div>
      </div>
      <div style="position:absolute; top:78px; left:24px; right:24px; display:flex; gap:6px; font-size:10px;">
        <span class="chip solid">▶ this site</span>
        <span class="chip">⊙ system map</span>
        <span class="chip">∷ shop</span>
        <span class="chip">⌖ objectives · 5</span>
        <span class="chip">⚙ services</span>
      </div>
      <div style="position:absolute; top:108px; left:24px; right:24px; bottom:62px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <div class="sketch p-12">
          <div class="lbl">about</div>
          <div class="note s">militia outpost. trade is open.<br>refit your chassis here.</div>
          <div class="lbl" style="margin-top:8px;">services</div>
          <div class="menuline focus" style="padding-left:0;"><span class="ptr">▶</span>repair hull <span class="v">240 cr</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>refuel <span class="v">60 cr</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>open shop <span class="v">→</span></div>
        </div>
        <div class="sketch-2 p-12">
          <div class="lbl">objectives at helios</div>
          <div style="font-size:11px; line-height:1.7;">
            <div><span class="chip green">ready</span> deliver salvage <span class="dim">· +800 cr</span></div>
            <div><span class="chip">side</span> talk to dock master</div>
          </div>
          <div class="lbl" style="margin-top:10px;">elsewhere in system</div>
          <div style="font-size:11px; line-height:1.7;">
            <div><span class="chip orange">main</span> clear hostile base <span class="dim">→ sector boss</span></div>
            <div><span class="chip">opt</span> scavenge derelict</div>
            <div><span class="chip">opt</span> mine asteroids · 0/15</div>
          </div>
        </div>
      </div>
      <div style="position:absolute; bottom:24px; left:24px; right:24px;" class="ticker">
        <span class="pulse"></span><span class="dim">events ▮</span>
        <div style="overflow:hidden; flex:1;"><div class="ticker-track">
          <span>· cygnus license now stocked ·</span>
          <span>· hostile patrol spotted near asteroid belt ·</span>
          <span>· stake bonus: +5% on objective completion ·</span>
          <span>· cygnus license now stocked ·</span>
        </div></div>
      </div>
      <div style="position:absolute; bottom:6px; right:24px; font-size:10px;" class="lbl">
        <span class="kbd">←→</span> tab · <span class="kbd">enter</span> action · <span class="kbd">esc</span> leave
      </div>
      <div class="callout green" style="left:160px; top:130px; max-width:170px;">objectives split:<br>"here" vs "in system"</div>
    `
  },
  {
    desc: 'diegetic radar: current site at center, sites orbiting as nodes; shop / news / objectives docked panels.',
    html: SCRIM + TAG('hub · v3 · "radar"') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center;">
        <div class="lbl">system view ▮ 7e3a82c1 · sector 04</div>
        <div class="lbl green">▮ docked at helios station ▮</div>
      </div>
      <!-- radar -->
      <div style="position:absolute; left:160px; top:60px; width:420px; height:340px;">
        <svg viewBox="0 0 420 340" style="width:100%; height:100%;">
          <circle cx="210" cy="170" r="160" fill="none" stroke="#bcb29a" stroke-dasharray="3 4" />
          <circle cx="210" cy="170" r="100" fill="none" stroke="#bcb29a" stroke-dasharray="3 4" />
          <circle cx="210" cy="170" r="40"  fill="none" stroke="#bcb29a" stroke-dasharray="3 4" />
          <line x1="210" y1="10" x2="210" y2="330" stroke="#dcd2b8" />
          <line x1="50"  y1="170" x2="370" y2="170" stroke="#dcd2b8" />
          <!-- current -->
          <circle cx="210" cy="170" r="9" fill="#1f8a5b" />
          <circle cx="210" cy="170" r="16" fill="none" stroke="#1f8a5b" />
          <text x="222" y="174" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">helios ★</text>
          <!-- nodes -->
          <circle cx="120" cy="110" r="6" fill="#1f1a14" /><text x="58"  y="106" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">asteroids</text>
          <circle cx="320" cy="115" r="6" fill="#b84a3a" /><text x="335" y="112" font-family="JetBrains Mono" font-size="10" fill="#b84a3a">hostile ⚠</text>
          <circle cx="335" cy="240" r="6" fill="#1f1a14" /><text x="345" y="244" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">derelict</text>
          <circle cx="100" cy="245" r="7" fill="#7a52a8" /><text x="40"  y="262" font-family="JetBrains Mono" font-size="10" fill="#7a52a8">slipgate</text>
        </svg>
      </div>
      <!-- left rail -->
      <div style="position:absolute; left:24px; top:60px; width:130px; border-left:2px solid var(--ink); padding-left:8px;">
        <div class="lbl">sites · 4</div>
        <div class="menuline focus" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>helios</div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>asteroids</div>
        <div class="menuline" style="padding-left:0; font-size:11px; color:var(--red);"><span class="ptr">▶</span>hostile</div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>derelict</div>
        <div class="menuline" style="padding-left:0; font-size:11px; color:var(--purple);"><span class="ptr">▶</span>slipgate</div>
      </div>
      <!-- right rail -->
      <div style="position:absolute; right:24px; top:60px; width:140px; border-right:2px solid var(--ink); padding-right:8px; text-align:right;">
        <div class="lbl">shortcuts</div>
        <div class="menuline" style="font-size:11px; justify-content:flex-end;">shop ⊙</div>
        <div class="menuline" style="font-size:11px; justify-content:flex-end;">repair ⌬</div>
        <div class="menuline" style="font-size:11px; justify-content:flex-end;">objectives ⌖</div>
        <div class="lbl" style="margin-top:8px;">stats</div>
        <div style="font-size:10px;">cr <strong>8,420</strong></div>
        <div style="font-size:10px;">stake <strong>1,200</strong></div>
        <div style="font-size:10px;">hull <span style="color:var(--green);">76%</span></div>
      </div>
      <div style="position:absolute; left:24px; right:24px; bottom:48px;" class="sketch p-8">
        <div class="lbl">selected · helios station</div>
        <div class="note s">trading hub. open. <span class="dim">repair · refuel · shop · 2 objectives.</span></div>
      </div>
      <div style="position:absolute; bottom:14px; left:24px; right:24px;" class="ticker">
        <span class="pulse"></span><span class="dim">news ▮</span>
        <div style="overflow:hidden; flex:1;"><div class="ticker-track">
          <span>· hostile activity in sector 06 ·</span>
          <span>· cygnus chassis stocked ·</span>
          <span>· hostile activity in sector 06 ·</span>
          <span>· cygnus chassis stocked ·</span>
        </div></div>
      </div>
      <div class="callout purple" style="left:18px; top:280px; max-width:140px;">slipgate is a "site",<br>not a separate menu</div>
      <div class="callout green" style="right:170px; top:200px; max-width:140px;">selected node<br>pulses on radar</div>
    `
  }
  ]
});

// =============== 04 SHOP ===============
addScreen({
  label: '04 Shop',
  file: 'screens/base.js (shop tab) · sub-screen of friendly base',
  blurb: 'visual previews + side-by-side compare + clear pricing/affordability + faster equip flow.',
  variations: [
  {
    desc: 'tabs at top, item list left, candidate detail+preview right with current-vs-candidate stat compare.',
    html: SCRIM + TAG('shop · v1 compare') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--ink-soft); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--green); font-size:14px;">shop · helios station</div>
        <div style="font-size:11px;"><span class="dim">credits</span> <strong>8,420</strong></div>
      </div>
      <div style="position:absolute; top:50px; left:24px; right:24px; display:flex; gap:1px;">
        <div class="chip solid green" style="border-radius:0; padding:4px 12px;">chassis</div>
        <div class="chip" style="border-radius:0; padding:4px 12px;">weapons</div>
        <div class="chip" style="border-radius:0; padding:4px 12px;">shields</div>
      </div>
      <div style="position:absolute; top:80px; left:24px; right:24px; bottom:50px; display:flex; gap:12px;">
        <div style="flex:0 0 220px; border:1px solid var(--ink-soft); padding:6px;">
          <div class="lbl">chassis · 5</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>scout <span class="v" style="color:var(--green);">★ eq</span></div>
          <div class="menuline focus" style="padding-left:0;"><span class="ptr">▶</span>cygnus <span class="v">3,200</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>vanguard <span class="v">5,800</span></div>
          <div class="menuline" style="padding-left:0; color:var(--ink-faint);"><span class="ptr">▶</span>nova <span class="v">12k 🔒</span></div>
          <div class="menuline" style="padding-left:0; color:var(--ink-faint);"><span class="ptr">▶</span>phantom <span class="v">— ?</span></div>
        </div>
        <div style="flex:1; border:1px solid var(--ink); padding:8px;">
          <div class="row-h between">
            <div class="title-tx" style="font-size:13px;">cygnus mk ii</div>
            <div class="chip green">licensed</div>
          </div>
          <div class="ph" style="height:90px; margin-top:6px;">[ chassis silhouette ]</div>
          <div class="lbl" style="margin-top:8px;">stat compare ▮ current ▶ candidate</div>
          <div style="display:grid; grid-template-columns:80px 1fr 60px; row-gap:3px; column-gap:8px; font-size:11px; margin-top:4px;">
            <span class="dim">hull</span><span>180 ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ <strong>240</strong></span><span style="color:var(--green);">+60</span>
            <span class="dim">thrust</span><span>120 ▮▮▮▮▮▮▮▮▮▮ <strong>95</strong></span><span style="color:var(--red);">−25</span>
            <span class="dim">slots</span><span>2 → <strong>3</strong></span><span style="color:var(--green);">+1</span>
            <span class="dim">mass</span><span>40 → <strong>62</strong></span><span style="color:var(--red);">+22</span>
          </div>
          <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:8px 0;" />
          <div class="row-h between">
            <div class="lbl">cost</div>
            <div><strong>3,200</strong> <span class="dim">cr</span> &nbsp; <span class="chip green">can afford</span></div>
          </div>
          <div class="row-h gap-8" style="margin-top:8px;">
            <div class="chip solid green" style="padding:4px 14px;">▶ buy &amp; equip</div>
            <div class="chip" style="padding:4px 12px;">buy only</div>
          </div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:24px; right:24px;" class="lbl row-h between">
        <span><span class="kbd">←→</span> tab · <span class="kbd">↑↓</span> item · <span class="kbd">enter</span> buy &amp; equip</span>
        <span><span class="kbd">esc</span> back to base</span>
      </div>
      <div class="callout green" style="left:240px; top:300px; max-width:150px;">single confirm =<br>buy + equip in one</div>
      <div class="callout" style="right:24px; bottom:54px; max-width:150px;">"buy only" still<br>available for hoarders</div>
    `
  },
  {
    desc: 'item carousel — big preview tile center, prev/next arrows, locked items show prerequisite badges.',
    html: SCRIM + TAG('shop · v2 carousel') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center;">
        <div class="title-tx" style="color:var(--green); font-size:14px;">shop · weapons</div>
        <div style="font-size:10px;" class="lbl"><span class="kbd">←→</span> browse · <span class="kbd">tab</span> category</div>
      </div>
      <div style="position:absolute; top:50px; left:24px; right:24px; display:flex; gap:8px; font-size:10px;">
        <span class="chip">chassis</span><span class="chip solid green">weapons</span><span class="chip">shields</span><span class="chip">upgrades</span>
        <span class="chip" style="margin-left:auto;">cr 8,420</span>
      </div>
      <div style="position:absolute; top:90px; left:24px; right:24px; bottom:80px; display:flex; align-items:center; gap:8px;">
        <div style="font-size:30px; color:var(--ink-faint);">◀</div>
        <div style="flex:0 0 130px; opacity:.45;">
          <div class="ph" style="height:120px;">plasma mk i</div>
          <div class="text-c lbl" style="margin-top:4px;">previous</div>
        </div>
        <div style="flex:1; border:2px solid var(--green); background:rgba(31,138,91,.08); padding:10px; height:100%; display:flex; flex-direction:column;">
          <div class="row-h between">
            <div class="title-tx" style="font-size:14px;">plasma mk ii</div>
            <div class="row-h gap-4"><span class="chip green">licensed</span><span class="chip">slot · light</span></div>
          </div>
          <div class="ph" style="flex:1; margin:8px 0; background:repeating-linear-gradient(135deg, rgba(31,138,91,.06) 0 6px, transparent 6px 12px); border-color:var(--green);">[ weapon render · spinning ]</div>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; font-size:10px;">
            <div><span class="dim">dmg</span> <strong>22</strong> <span style="color:var(--green);">▲</span></div>
            <div><span class="dim">rate</span> <strong>4/s</strong></div>
            <div><span class="dim">heat</span> <strong>med</strong></div>
            <div><span class="dim">range</span> <strong>far</strong></div>
          </div>
          <div class="note s" style="margin-top:6px;">overheats fast. punchy mid-range.</div>
        </div>
        <div style="flex:0 0 130px; opacity:.45;">
          <div class="ph" style="height:120px;">rail · mk i 🔒</div>
          <div class="text-c lbl" style="margin-top:4px;">next</div>
        </div>
        <div style="font-size:30px; color:var(--ink-faint);">▶</div>
      </div>
      <div style="position:absolute; bottom:32px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center;">
        <div><span class="dim">build cost</span> <strong>1,800 cr</strong> &nbsp; <span class="chip green">can afford</span></div>
        <div class="row-h gap-8">
          <span class="chip solid green" style="padding:4px 14px;">▶ buy &amp; equip</span>
          <span class="chip" style="padding:4px 10px;">equip later</span>
        </div>
      </div>
      <div style="position:absolute; bottom:10px; left:0; right:0; text-align:center;" class="lbl">2 / 7 ▮ ◌◌●◌◌◌◌</div>
      <div class="callout" style="left:30px; top:140px; max-width:140px;">peek at neighbors<br>(blurred preview)</div>
      <div class="callout red" style="right:34px; top:148px; max-width:140px;">🔒 = locked,<br>shows prereq inline</div>
    `
  },
  {
    desc: 'gallery grid — items as tiles with affordability halo; press → to open detail panel.',
    html: SCRIM + TAG('shop · v3 grid') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div>
          <div class="title-tx" style="color:var(--green); font-size:14px;">shop · cygnus station</div>
          <div class="lbl">gallery view</div>
        </div>
        <div class="row-h gap-4" style="font-size:10px;">
          <span class="chip">chassis</span><span class="chip solid green">all</span><span class="chip">weapons</span><span class="chip">shields</span>
        </div>
      </div>
      <div style="position:absolute; top:62px; left:24px; right:24px; bottom:80px; display:grid; grid-template-columns:repeat(4, 1fr); grid-template-rows:repeat(2, 1fr); gap:8px;">
        ${[
          {n:'scout', t:'chassis', cost:'★ eq', state:'eq'},
          {n:'cygnus', t:'chassis', cost:'3,200', state:'focus'},
          {n:'vanguard', t:'chassis', cost:'5,800', state:'ok'},
          {n:'nova', t:'chassis', cost:'12k 🔒', state:'lock'},
          {n:'plasma i', t:'weapon', cost:'★ eq', state:'eq'},
          {n:'plasma ii', t:'weapon', cost:'1,800', state:'ok'},
          {n:'rail i', t:'weapon', cost:'2,400', state:'ok'},
          {n:'shield-a', t:'shield', cost:'900', state:'ok'},
        ].map(it => {
          const colorByState = {eq:'var(--green)', focus:'var(--green)', ok:'var(--ink)', lock:'var(--ink-faint)'}[it.state];
          const bg = it.state === 'focus' ? 'rgba(31,138,91,.10)' : 'transparent';
          const border = it.state === 'focus' ? '2px solid var(--green)' : '1px solid var(--ink-soft)';
          const tag = it.state === 'eq' ? '<span class="chip green" style="font-size:8px;">eq</span>' :
                      it.state === 'lock' ? '<span class="chip" style="font-size:8px; color:var(--ink-faint);">🔒</span>' : '';
          return `
            <div style="border:${border}; background:${bg}; padding:6px; display:flex; flex-direction:column; color:${colorByState};">
              <div class="row-h between"><span class="lbl" style="color:inherit;">${it.t}</span>${tag}</div>
              <div class="ph" style="flex:1; margin:4px 0; border-color:currentColor;">${it.n}</div>
              <div class="row-h between" style="font-size:10px;">
                <strong>${it.n}</strong>
                <span style="color:${it.state==='focus'?'var(--green)':'inherit'};">${it.cost}</span>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="position:absolute; bottom:24px; left:24px; right:24px;" class="sketch p-8">
        <div class="row-h between">
          <div><strong>cygnus</strong> · chassis · 3,200 cr · <span class="chip green">can afford</span></div>
          <div class="row-h gap-6"><span class="chip solid green">▶ buy &amp; equip</span><span class="chip">buy only</span></div>
        </div>
      </div>
      <div style="position:absolute; bottom:6px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓←→</span> select · <span class="kbd">enter</span> buy</div>
      <div class="callout green" style="left:330px; top:80px; max-width:130px;">focused tile glows;<br>halo = green if affordable</div>
    `
  }
  ]
});

// =============== 05 SHIP CONFIGURATOR (the user's specific request) ===============
addScreen({
  label: '05 Ship Configurator',
  file: 'screens/equip-config.js · ship picture + slot assignment',
  blurb: 'YOU asked for a picture of the ship with slots. all three variations lead with the silhouette.',
  variations: [
  {
    desc: 'ship silhouette top, slot rows below as cycles. focused slot highlights on the ship.',
    html: SCRIM + TAG('config · v1') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between; border-bottom:1px solid var(--ink-soft); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--green); font-size:14px;">configure · cygnus mk ii</div>
        <div class="lbl">build cost · <strong>3,200 cr</strong></div>
      </div>
      <!-- ship -->
      <div style="position:absolute; top:54px; left:24px; right:24px; height:200px; border:1px solid var(--ink-soft); background:rgba(31,138,91,.04);">
        <svg viewBox="0 0 600 200" class="ship-svg" style="width:100%; height:100%;" preserveAspectRatio="xMidYMid meet">
          <polygon points="300,20 480,140 380,170 300,150 220,170 120,140" />
          <polygon points="300,20 360,80 300,90 240,80" class="filled" style="fill:var(--ink);"/>
          <line x1="300" y1="90" x2="300" y2="150" />
          <!-- slot pins -->
          <circle cx="190" cy="120" r="14" class="green pulse-soft" />
          <text x="190" y="124" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f8a5b">1</text>
          <circle cx="410" cy="120" r="14" />
          <text x="410" y="124" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">2</text>
          <circle cx="300" cy="160" r="11" />
          <text x="300" y="164" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#1f1a14">s</text>
          <line x1="190" y1="106" x2="190" y2="60" class="green dashed"/>
          <text x="180" y="55" font-family="JetBrains Mono" font-size="10" fill="#1f8a5b">slot 1 · light</text>
        </svg>
      </div>
      <!-- slot rows -->
      <div style="position:absolute; top:266px; left:24px; right:24px; bottom:60px;">
        <div class="lbl">loadout</div>
        <div class="menuline focus"><span class="ptr">▶</span>slot 1 [light] <span class="v">◄ <strong style="color:var(--green);">plasma · mk ii</strong> ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>slot 2 [light] <span class="v">◄ (empty) ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>shield <span class="v">◄ shield-a ►</span></div>
        <div class="row-h gap-12" style="margin-top:14px;">
          <span class="chip solid green" style="padding:4px 14px;">▶ confirm · 3,200 cr</span>
          <span class="chip">back</span>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:24px; right:24px;" class="lbl row-h between">
        <span><span class="kbd">←→</span> cycle · <span class="kbd">enter</span> confirm</span>
        <span><span class="kbd">esc</span> cancel</span>
      </div>
      <div class="callout green" style="left:30px; top:90px; max-width:140px;">focused slot pulses<br>on the ship</div>
      <div class="callout" style="right:30px; top:90px; max-width:140px;">slot type printed<br>next to pin</div>
    `
  },
  {
    desc: 'ship center, slot list orbits it; selected slot expands into a weapon picker on the right.',
    html: SCRIM + TAG('config · v2 split') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div class="title-tx" style="color:var(--green); font-size:14px;">configure · cygnus mk ii</div>
        <div class="lbl">cost <strong>3,200 cr</strong> · <span style="color:var(--green);">affordable</span></div>
      </div>
      <div style="position:absolute; top:50px; left:24px; right:300px; bottom:60px;">
        <div style="position:relative; width:100%; height:100%;">
          <svg viewBox="0 0 380 360" class="ship-svg" style="width:100%; height:100%;" preserveAspectRatio="xMidYMid meet">
            <polygon points="190,40 320,200 250,260 190,240 130,260 60,200" />
            <polygon points="190,40 240,120 190,130 140,120" class="filled" style="fill:var(--ink);"/>
            <line x1="190" y1="130" x2="190" y2="240" />
            <circle cx="105" cy="190" r="14" class="green" />
            <text x="105" y="194" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#1f8a5b" font-weight="700">1</text>
            <circle cx="275" cy="190" r="14" />
            <text x="275" y="194" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#1f1a14">2</text>
            <circle cx="190" cy="270" r="12" />
            <text x="190" y="274" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">sh</text>
            <line x1="91" y1="190" x2="20" y2="190" class="green dashed"/>
          </svg>
          <div class="lbl green" style="position:absolute; left:8px; top:178px;">▶ slot 1</div>
        </div>
      </div>
      <div style="position:absolute; right:24px; top:50px; width:260px; bottom:60px; border:1.5px solid var(--green); padding:8px; background:rgba(31,138,91,.06);">
        <div class="lbl green">slot 1 · light · selecting</div>
        <div class="title-tx" style="font-size:13px; margin-top:2px;">plasma · mk ii</div>
        <div class="ph" style="height:80px; margin:6px 0; border-color:var(--green);">[ weapon preview ]</div>
        <div style="font-size:11px; line-height:1.6;">
          <div class="row-h between"><span class="dim">dmg</span><span><strong>22</strong> <span style="color:var(--green);">▲ +6</span></span></div>
          <div class="row-h between"><span class="dim">rate</span><span><strong>4/s</strong></span></div>
          <div class="row-h between"><span class="dim">heat</span><span>med</span></div>
        </div>
        <hr style="border:0; border-top:1px dashed var(--green); margin:8px 0;" />
        <div class="lbl">choices · 3</div>
        <div class="menuline focus" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>plasma mk ii</div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>plasma mk i</div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>(empty)</div>
        <div style="position:absolute; bottom:8px; left:8px; right:8px;">
          <div class="chip solid green text-c" style="display:block; padding:4px;">▶ assign</div>
        </div>
      </div>
      <div style="position:absolute; bottom:18px; left:24px; right:24px;" class="lbl row-h between">
        <span><span class="kbd">↑↓</span> slot · <span class="kbd">←→</span> weapon · <span class="kbd">enter</span> assign</span>
        <span class="row-h gap-6"><span class="chip solid green">confirm 3,200</span><span class="chip">back</span></span>
      </div>
      <div class="callout green" style="left:240px; top:80px; max-width:140px;">slot picker stays<br>open as you cycle</div>
    `
  },
  {
    desc: 'cockpit-style: looking out at the ship in dock, slots wired with glowing lines to part list.',
    html: `<div class="full" style="background:#070b09;"></div>` + `
      <div style="position:absolute; top:12px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div class="crt" style="font-size:11px;">▮ refit bay · cygnus mk ii ▮</div>
        <div class="crt" style="font-size:11px;">cost · 3200 cr</div>
      </div>
      <div class="full" style="background:radial-gradient(ellipse at 50% 90%, rgba(31,138,91,.18), transparent 60%); pointer-events:none;"></div>
      <!-- ship -->
      <svg viewBox="0 0 800 580" style="position:absolute; inset:0; width:100%; height:100%;">
        <polygon points="400,160 580,360 470,420 400,400 330,420 220,360" fill="none" stroke="#58b389" stroke-width="1.5" />
        <polygon points="400,160 460,250 400,260 340,250" fill="#1f8a5b" opacity=".25" stroke="#58b389" />
        <line x1="400" y1="260" x2="400" y2="400" stroke="#58b389" stroke-width="1.2" />
        <circle cx="295" cy="345" r="16" fill="rgba(31,138,91,.25)" stroke="#1f8a5b" stroke-width="1.5" />
        <circle cx="505" cy="345" r="16" fill="none" stroke="#58b389" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="400" cy="430" r="13" fill="none" stroke="#58b389" stroke-width="1.2" stroke-dasharray="3 3"/>
        <!-- wires -->
        <path d="M 295 345 Q 180 345 140 380 L 80 420" fill="none" stroke="#1f8a5b" stroke-width="1.2"/>
        <path d="M 505 345 Q 620 345 660 380 L 720 420" fill="none" stroke="#58b389" stroke-width="1" stroke-dasharray="2 4"/>
        <path d="M 400 430 Q 400 510 380 530" fill="none" stroke="#58b389" stroke-width="1" stroke-dasharray="2 4"/>
      </svg>
      <!-- slot labels and chips -->
      <div style="position:absolute; left:24px; bottom:120px; color:var(--green-soft);" class="crt">
        ◀ slot 1 · plasma mk ii
      </div>
      <div style="position:absolute; right:24px; bottom:120px; text-align:right; color:var(--green-soft);" class="crt">
        slot 2 · empty ▶
      </div>
      <div style="position:absolute; left:50%; bottom:14px; transform:translateX(-50%);" class="crt">shield · shield-a</div>
      <!-- left rail = parts -->
      <div style="position:absolute; left:24px; top:60px; width:140px; color:var(--green-soft);">
        <div class="lbl" style="color:var(--green);">parts ▮ slot 1</div>
        <div class="crt" style="margin:1px 0; padding:1px 4px; background:rgba(31,138,91,.2); border-left:2px solid var(--green);">▶ plasma mk ii</div>
        <div class="crt" style="margin:1px 0; padding:1px 4px; opacity:.6;">  plasma mk i</div>
        <div class="crt" style="margin:1px 0; padding:1px 4px; opacity:.6;">  (empty)</div>
      </div>
      <!-- right rail = stats -->
      <div style="position:absolute; right:24px; top:60px; width:160px; text-align:right; color:var(--green-soft);">
        <div class="lbl" style="color:var(--green);">stats ▮ delta</div>
        <div class="crt" style="font-size:10px;">hull 240 ▲</div>
        <div class="crt" style="font-size:10px;">thrust 95 ▼</div>
        <div class="crt" style="font-size:10px;">dmg 22 ▲</div>
        <div class="crt" style="font-size:10px;">slots 3</div>
      </div>
      <div style="position:absolute; left:50%; top:60px; transform:translateX(-50%); display:flex; gap:8px;">
        <div class="crt" style="border:1px solid var(--green); background:rgba(31,138,91,.2); padding:3px 12px;">▶ confirm 3200 cr</div>
        <div class="crt" style="border:1px solid #3a5a48; padding:3px 12px; opacity:.7;">  cancel</div>
      </div>
      <div class="callout green" style="left:170px; top:380px; max-width:130px;">parts ⟶ wired ⟶ slots<br>(diegetic)</div>
    `
  }
  ]
});

// =============== 06 SHIP READOUT ===============
addScreen({
  label: '06 Ship Readout',
  file: 'screens/ship-config.js · read-only summary',
  blurb: 'just letting the player look at their ship. should feel like reading a manifest, not a form.',
  variations: [
  {
    desc: 'cleaned-up kv-list with section dividers (chassis · loadout · stats · history).',
    html: SCRIM + TAG('readout · v1') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; text-align:center;">
        <div class="title-tx" style="color:var(--green); font-size:18px;">ship configuration</div>
        <div class="lbl">manifest · ph-9421</div>
      </div>
      <div style="position:absolute; top:80px; left:60px; right:60px; bottom:60px; display:flex; flex-direction:column; gap:10px;">
        <div>
          <div class="lbl" style="border-bottom:1px dashed var(--ink-soft); padding-bottom:2px;">chassis</div>
          <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:24px; row-gap:2px; margin-top:4px; font-size:12px;">
            <span class="dim">name</span><span class="strong">cygnus mk ii</span>
            <span class="dim">hull</span><span class="strong">240 / 240</span>
            <span class="dim">thrust</span><span class="strong">95</span>
            <span class="dim">slots</span><span class="strong">3</span>
          </div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px dashed var(--ink-soft); padding-bottom:2px;">loadout</div>
          <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:24px; row-gap:2px; margin-top:4px; font-size:12px;">
            <span class="dim">slot 1 [light]</span><span class="strong">plasma · mk ii</span>
            <span class="dim">slot 2 [light]</span><span class="dim">— empty —</span>
            <span class="dim">shield</span><span class="strong">shield-a</span>
          </div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px dashed var(--ink-soft); padding-bottom:2px;">history</div>
          <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:24px; row-gap:2px; margin-top:4px; font-size:12px;">
            <span class="dim">systems visited</span><span class="strong">6</span>
            <span class="dim">sectors cleared</span><span class="strong">2</span>
            <span class="dim">credits</span><span class="strong">8,420</span>
          </div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">enter</span> / <span class="kbd">esc</span> close</div>
    `
  },
  {
    desc: 'ship picture left, stats grouped to the right of it like a blueprint callout sheet.',
    html: SCRIM + TAG('readout · v2 blueprint') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div class="title-tx" style="color:var(--green); font-size:14px;">ship · cygnus mk ii</div>
        <div class="lbl">manifest · ph-9421</div>
      </div>
      <div style="position:absolute; top:50px; left:24px; bottom:50px; width:340px; border:1px dashed var(--ink-soft); padding:10px;">
        <svg viewBox="0 0 320 280" class="ship-svg" style="width:100%; height:100%;">
          <polygon points="160,30 280,180 220,230 160,210 100,230 40,180" />
          <polygon points="160,30 200,100 160,110 120,100" class="filled" style="fill:var(--ink);"/>
          <line x1="160" y1="110" x2="160" y2="210" />
          <circle cx="80" cy="170" r="10" class="green" />
          <circle cx="240" cy="170" r="10" />
          <circle cx="160" cy="245" r="9" />
          <!-- callouts -->
          <line x1="80" y1="160" x2="80" y2="80" class="dashed" />
          <text x="76" y="76" text-anchor="end" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">slot 1</text>
          <line x1="240" y1="160" x2="290" y2="120" class="dashed" />
          <text x="290" y="116" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">slot 2</text>
          <line x1="160" y1="254" x2="270" y2="270" class="dashed" />
          <text x="270" y="274" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">shield</text>
        </svg>
      </div>
      <div style="position:absolute; top:50px; right:24px; bottom:50px; width:300px; padding-left:10px; border-left:2px solid var(--green);">
        <div class="lbl green">stats</div>
        <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:24px; row-gap:3px; margin-top:4px; font-size:12px;">
          <span class="dim">hull</span><span class="strong">240 / 240</span>
          <span class="dim">thrust</span><span class="strong">95</span>
          <span class="dim">mass</span><span class="strong">62</span>
          <span class="dim">energy</span><span class="strong">120</span>
        </div>
        <div class="lbl green" style="margin-top:14px;">loadout</div>
        <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:24px; row-gap:3px; margin-top:4px; font-size:12px;">
          <span class="dim">slot 1</span><span class="strong">plasma mk ii</span>
          <span class="dim">slot 2</span><span class="dim">empty</span>
          <span class="dim">shield</span><span class="strong">shield-a</span>
        </div>
        <div class="lbl green" style="margin-top:14px;">credits</div>
        <div style="font-size:14px;"><strong>8,420</strong> cr · stake 1,200</div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">enter</span> / <span class="kbd">esc</span> close</div>
    `
  },
  {
    desc: 'typewriter scroll — manifest types itself onto the screen line by line.',
    html: `<div class="full" style="background:#070b09;"></div>` + `
      <div style="position:absolute; top:18px; left:30px; right:30px;">
        <div class="crt" style="font-size:10px;">▮ ship manifest · ph-9421 · 2026.05.09 ▮</div>
      </div>
      <div style="position:absolute; top:50px; left:30px; right:30px; bottom:50px; font-family:var(--mono); color:#58b389; font-size:13px; line-height:1.7; letter-spacing:.04em;">
        <div>> chassis ............ <span style="color:#1f8a5b; font-weight:700;">cygnus mk ii</span></div>
        <div>> hull ............... 240 / 240</div>
        <div>> thrust ............. 95</div>
        <div>> slots .............. 3 (light, light, light)</div>
        <div>> </div>
        <div>> slot 1 (light) ..... plasma · mk ii</div>
        <div>> slot 2 (light) ..... <span style="opacity:.5;">— empty —</span></div>
        <div>> slot 3 (light) ..... <span style="opacity:.5;">— empty —</span></div>
        <div>> shield ............. shield-a</div>
        <div>> </div>
        <div>> credits ............ 8,420</div>
        <div>> stake .............. 1,200</div>
        <div>> systems visited .... 6</div>
        <div>> sectors cleared .... 2</div>
        <div>> </div>
        <div class="blink">> _</div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center; color:#58b389; font-size:10px; letter-spacing:.18em;">[enter] / [esc] close</div>
      <div class="callout green" style="left:30px; top:120px; max-width:140px; color:#aaa;">animates in line by<br>line on open</div>
    `
  }
  ]
});

// =============== 07 SLIPGATE ===============
addScreen({
  label: '07 Slipgate',
  file: 'screens/slipgate.js · system jump · purple theme',
  blurb: 'hybrid map + list — pick the destination spatially, confirm details on the side.',
  variations: [
  {
    desc: 'mini map of neighbors as nodes top, list below — both sync to the same selection.',
    html: SCRIM + TAG('slipgate · v1') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between; border-bottom:1px solid var(--purple); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--purple); font-size:16px;">slipgate</div>
        <div class="lbl" style="color:var(--purple);">5 neighboring systems</div>
      </div>
      <div style="position:absolute; top:54px; left:24px; right:24px; height:240px; border:1px dashed var(--purple); background:rgba(122,82,168,.04);">
        <svg viewBox="0 0 700 240" style="width:100%; height:100%;">
          <!-- current -->
          <circle cx="350" cy="120" r="14" fill="#7a52a8" />
          <circle cx="350" cy="120" r="22" fill="none" stroke="#7a52a8" stroke-dasharray="3 3" />
          <text x="350" y="156" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#1f1a14">★ here</text>
          <text x="350" y="170" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#6b5f4f">7e3a82c1</text>
          <!-- neighbors -->
          <line x1="350" y1="120" x2="160" y2="60" stroke="#7a52a8" stroke-dasharray="3 4"/>
          <circle cx="160" cy="60" r="9" fill="#1f1a14" />
          <text x="160" y="42" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">a4 ★ visited</text>
          <line x1="350" y1="120" x2="540" y2="60" stroke="#7a52a8" stroke-dasharray="3 4"/>
          <circle cx="540" cy="60" r="11" fill="#7a52a8" stroke="#7a52a8" stroke-width="2"/>
          <text x="540" y="42" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#7a52a8" font-weight="700">▶ 8c · selected</text>
          <line x1="350" y1="120" x2="120" y2="200" stroke="#7a52a8" stroke-dasharray="3 4"/>
          <circle cx="120" cy="200" r="9" fill="#1f1a14" />
          <text x="120" y="222" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">b9 · ← back</text>
          <line x1="350" y1="120" x2="600" y2="200" stroke="#7a52a8" stroke-dasharray="3 4"/>
          <circle cx="600" cy="200" r="9" fill="#1f1a14" />
          <text x="600" y="222" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">2f</text>
          <line x1="350" y1="120" x2="350" y2="220" stroke="#7a52a8" stroke-dasharray="3 4"/>
          <circle cx="350" cy="220" r="9" fill="#1f1a14" />
          <text x="350" y="240" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#1f1a14">d1</text>
        </svg>
      </div>
      <div style="position:absolute; top:308px; left:24px; right:24px; bottom:50px; display:flex; gap:12px;">
        <div style="flex:1; border:1px solid var(--ink-soft); padding:6px;">
          <div class="lbl">neighbors</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>a4d2 7f9b <span class="v">★ visited</span></div>
          <div class="menuline focus" style="padding-left:0;"><span class="ptr" style="color:var(--purple);">▶</span>8c11 b240 <span class="v" style="color:var(--purple);">▶ selected</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>b921 30c6 <span class="v">← back</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>2f04 a18d</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>d150 ee72</div>
        </div>
        <div style="flex:0 0 220px; border:1.5px solid var(--purple); padding:6px; background:rgba(122,82,168,.06);">
          <div class="lbl" style="color:var(--purple);">destination</div>
          <div class="title-tx" style="color:var(--purple); font-size:13px;">8c11 · b240</div>
          <div class="note s dim" style="margin-top:4px;">unknown system</div>
          <div class="note s dim">no prior intel</div>
          <div style="margin-top:8px;" class="chip" style="background:var(--purple); color:white; padding:4px 8px;">▶ engage jump</div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→↑↓</span> select · <span class="kbd">enter</span> jump · <span class="kbd">esc</span> leave</div>
    `
  },
  {
    desc: 'full-bleed star map; sidebar shrinks to a thin rail with selected info.',
    html: SCRIM + TAG('slipgate · v2 full map') + `
      <div class="full" style="background:#0e0a18;"></div>
      <div style="position:absolute; top:12px; left:20px; right:20px; display:flex; justify-content:space-between; color:var(--purple);">
        <div class="lbl" style="color:#cc99ff;">slipgate ▮ system 7e3a82c1</div>
        <div class="lbl" style="color:#cc99ff;">5 neighbors</div>
      </div>
      <svg viewBox="0 0 800 580" style="position:absolute; inset:0; width:100%; height:100%;">
        <!-- starfield -->
        ${Array.from({length:60}).map(()=>`<circle cx="${Math.random()*800}" cy="${Math.random()*580}" r="${0.6+Math.random()*1.2}" fill="rgba(204,153,255,.4)"/>`).join('')}
        <!-- here -->
        <circle cx="400" cy="290" r="20" fill="rgba(204,153,255,.25)" stroke="#cc99ff"/>
        <circle cx="400" cy="290" r="6" fill="#cc99ff" />
        <text x="400" y="328" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#cc99ff">★ here</text>
        <!-- nodes -->
        <line x1="400" y1="290" x2="180" y2="140" stroke="#7a52a8" stroke-dasharray="2 4"/>
        <circle cx="180" cy="140" r="6" fill="#cc99ff"/>
        <text x="180" y="120" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#cc99ff">a4 visited</text>
        <line x1="400" y1="290" x2="620" y2="160" stroke="#cc99ff" stroke-width="2"/>
        <circle cx="620" cy="160" r="9" fill="#cc99ff" stroke="#fff" stroke-width="2"/>
        <text x="620" y="140" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#fff" font-weight="700">▶ 8c selected</text>
        <line x1="400" y1="290" x2="170" y2="430" stroke="#7a52a8" stroke-dasharray="2 4"/>
        <circle cx="170" cy="430" r="6" fill="#cc99ff"/>
        <text x="170" y="450" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#cc99ff">b9 ← back</text>
        <line x1="400" y1="290" x2="640" y2="440" stroke="#7a52a8" stroke-dasharray="2 4"/>
        <circle cx="640" cy="440" r="6" fill="#cc99ff"/>
        <text x="640" y="460" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#cc99ff">2f</text>
        <line x1="400" y1="290" x2="380" y2="510" stroke="#7a52a8" stroke-dasharray="2 4"/>
        <circle cx="380" cy="510" r="6" fill="#cc99ff"/>
        <text x="380" y="530" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="#cc99ff">d1</text>
      </svg>
      <div style="position:absolute; right:14px; top:54px; width:170px; border:1px solid #cc99ff; background:rgba(122,82,168,.3); padding:8px; color:#fff;">
        <div class="lbl" style="color:#cc99ff;">destination</div>
        <div style="font-family:var(--mono); font-weight:700; font-size:14px;">8c11·b240</div>
        <div style="font-size:10px; opacity:.7; margin-top:4px;">unknown · no intel</div>
        <hr style="border:0; border-top:1px solid #7a52a8; margin:6px 0;" />
        <div class="lbl" style="color:#cc99ff;">distance</div>
        <div style="font-size:11px;">2.4 ly</div>
        <div style="margin-top:6px; background:#cc99ff; color:#1f1a14; padding:4px; text-align:center; font-weight:700; letter-spacing:.1em;">▶ engage</div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center; color:#cc99ff; font-size:10px; letter-spacing:.18em;">[←→↑↓] select node · [enter] jump · [esc] leave</div>
      <div class="callout purple" style="left:30px; top:200px; max-width:130px;">no list — map IS<br>the picker</div>
    `
  },
  {
    desc: 'list of "inbox-style" cards — each neighbor a card with intel, danger, last-visited badge.',
    html: SCRIM + TAG('slipgate · v3 cards') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div class="title-tx" style="color:var(--purple); font-size:16px;">slipgate · 5 neighbors</div>
        <div class="lbl">tap a system to inspect</div>
      </div>
      <div style="position:absolute; top:54px; left:24px; right:24px; bottom:50px; display:flex; flex-direction:column; gap:6px;">
        ${[
          {seed:'a4d2 7f9b', tag:'★ visited', dist:'1.2 ly', intel:'friendly base · 2 sites', focus:false, color:'var(--ink)'},
          {seed:'8c11 b240', tag:'unknown',   dist:'2.4 ly', intel:'no intel — slipspace distortion', focus:true, color:'var(--purple)'},
          {seed:'b921 30c6', tag:'← back',    dist:'1.8 ly', intel:'previous system',  focus:false, color:'var(--ink)'},
          {seed:'2f04 a18d', tag:'rumor: hostile', dist:'3.1 ly', intel:'⚠ pirate broadcast detected', focus:false, color:'var(--red)'},
          {seed:'d150 ee72', tag:'rumor: rich',    dist:'2.0 ly', intel:'mineral signatures · asteroid heavy', focus:false, color:'var(--orange)'},
        ].map(it => `
          <div style="border:${it.focus ? '2px solid var(--purple)' : '1px solid var(--ink-soft)'};
                      background:${it.focus ? 'rgba(122,82,168,.08)' : 'transparent'};
                      padding:6px 10px; display:grid; grid-template-columns: 30px 1fr auto auto; gap:10px; align-items:center;">
            <span style="color:${it.color}; font-weight:700;">${it.focus ? '▶' : ''}</span>
            <div>
              <div style="font-family:var(--mono); font-size:12px; font-weight:700; color:${it.color};">${it.seed}</div>
              <div class="note s dim">${it.intel}</div>
            </div>
            <span class="chip" style="border-color:${it.color}; color:${it.color};">${it.tag}</span>
            <span class="lbl">${it.dist}</span>
          </div>
        `).join('')}
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓</span> select · <span class="kbd">enter</span> jump · <span class="kbd">esc</span> leave</div>
      <div class="callout purple" style="right:30px; bottom:90px; max-width:140px;">card-per-system —<br>shows danger / rumors</div>
    `
  }
  ]
});

// =============== 08 REBUILD ===============
addScreen({
  label: '08 Rebuild',
  file: 'screens/rebuild.js · post-death · orange theme',
  blurb: 'destruction is dramatic but the menu kills the moment. lean into it.',
  variations: [
  {
    desc: 'tightened list with chassis stats inline; charity row distinct; quit at the bottom.',
    html: SCRIM + TAG('rebuild · v1') + `
      <div style="position:absolute; top:30px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--orange); font-size:36px; letter-spacing:.18em;">ship destroyed</div>
        <div class="lbl" style="color:var(--orange); margin-top:4px;">select replacement hull</div>
      </div>
      <div style="position:absolute; top:140px; left:50px; right:50px; bottom:50px; border:1.5px solid var(--orange); padding:12px; background:rgba(201,119,50,.04);">
        <div class="row-h between" style="font-size:11px;">
          <span class="dim">credits <strong>8,420</strong> · stake <strong>1,200</strong></span>
          <span class="lbl">seed 7e3a82c1</span>
        </div>
        <hr style="border:0; border-top:1px dashed var(--orange); margin:6px 0;" />
        <div class="lbl">licensed chassis · 3</div>
        <div class="menuline focus" style="padding-left:0;"><span class="ptr" style="color:var(--orange);">▶</span>scout · h120 t140 s2 <span class="v" style="color:var(--orange);">free</span></div>
        <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>cygnus · h180 t120 s2 <span class="v">2,800 cr</span></div>
        <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>vanguard · h240 t95 s3 <span class="v">5,800 cr</span></div>
        <hr style="border:0; border-top:1px dashed var(--orange); margin:8px 0;" />
        <div class="menuline" style="padding-left:0; color:var(--ink-2);"><span class="ptr">▶</span>charity assistance <span class="v dim">forfeit cr · default ship free</span></div>
        <div class="menuline" style="padding-left:0; color:var(--red); margin-top:6px;"><span class="ptr">▶</span>quit to title</div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓</span> select · <span class="kbd">enter</span> rebuild</div>
    `
  },
  {
    desc: 'chassis cards side by side — preview + stats, charity / quit secondary.',
    html: SCRIM + TAG('rebuild · v2 cards') + `
      <div style="position:absolute; top:24px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--orange); font-size:30px; letter-spacing:.18em;">ship destroyed</div>
        <div class="lbl" style="color:var(--orange);">select replacement hull · cr 8,420 · stake 1,200</div>
      </div>
      <div style="position:absolute; top:120px; left:24px; right:24px; bottom:90px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
        ${[
          {n:'scout', stats:'h120 t140 s2', cost:'free', focus:false},
          {n:'cygnus', stats:'h180 t120 s2', cost:'2,800', focus:true},
          {n:'vanguard', stats:'h240 t95 s3', cost:'5,800', focus:false},
        ].map(c => `
          <div style="border:${c.focus ? '2px solid var(--orange)' : '1px solid var(--ink-soft)'};
                      background:${c.focus ? 'rgba(201,119,50,.06)' : 'transparent'};
                      padding:10px; display:flex; flex-direction:column;">
            <div class="title-tx" style="font-size:13px; color:${c.focus?'var(--orange)':'var(--ink)'};">${c.n}</div>
            <div class="ph" style="flex:1; margin:6px 0; min-height:80px; ${c.focus?'border-color:var(--orange);':''}">[ silhouette ]</div>
            <div class="lbl">stats</div>
            <div style="font-size:10px;">${c.stats}</div>
            <div class="lbl" style="margin-top:6px;">cost</div>
            <div style="font-size:13px; font-weight:700; color:${c.cost==='free'?'var(--green)':'var(--ink)'};">${c.cost}</div>
            ${c.focus ? '<div class="chip solid" style="background:var(--orange); color:white; margin-top:6px; text-align:center; padding:3px;">▶ rebuild</div>' : ''}
          </div>`).join('')}
      </div>
      <div style="position:absolute; bottom:38px; left:24px; right:24px; display:flex; justify-content:center; gap:24px;">
        <span class="chip" style="padding:4px 14px;">charity assistance</span>
        <span class="chip red" style="padding:4px 14px;">quit to title</span>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> chassis · <span class="kbd">enter</span> rebuild</div>
    `
  },
  {
    desc: 'wreckage cinematic — debris drifts, "ship destroyed" big, options fade in over the scene.',
    html: `<div class="full" style="background:#1a0d05;"></div>` + `
      <svg viewBox="0 0 800 580" style="position:absolute; inset:0; width:100%; height:100%;">
        ${Array.from({length:30}).map((_,i)=>{
          const x=Math.random()*800, y=Math.random()*580, s=2+Math.random()*8;
          return `<rect x="${x}" y="${y}" width="${s}" height="${s*0.6}" fill="none" stroke="rgba(201,119,50,.5)" transform="rotate(${Math.random()*360} ${x} ${y})"/>`;
        }).join('')}
      </svg>
      <div class="full" style="background:radial-gradient(ellipse at 50% 50%, rgba(201,119,50,.15), transparent 70%); pointer-events:none;"></div>
      <div style="position:absolute; top:60px; left:0; right:0; text-align:center;">
        <div style="font-family:var(--mono); font-weight:700; font-size:54px; letter-spacing:.22em; color:#ffaa66; text-shadow:0 0 20px rgba(255,170,102,.5);">SHIP DESTROYED</div>
        <div style="font-family:var(--mono); font-size:11px; color:#ffd0a0; letter-spacing:.18em; margin-top:8px;">— recovery beacon active —</div>
      </div>
      <div style="position:absolute; top:200px; left:50%; transform:translateX(-50%); width:480px; padding:14px; border:1px solid #ff8844; background:rgba(0,0,0,.55);">
        <div class="lbl" style="color:#ffaa66;">incoming hull options</div>
        <div style="margin-top:6px; font-family:var(--mono); font-size:12px; line-height:1.7; color:#ffd0a0;">
          <div style="background:rgba(201,119,50,.2); padding:3px 6px; color:#fff; font-weight:700;">▶ scout · h120 t140 · free</div>
          <div style="padding:3px 6px;">  cygnus · h180 t120 · 2,800 cr</div>
          <div style="padding:3px 6px;">  vanguard · h240 t95 · 5,800 cr</div>
        </div>
        <hr style="border:0; border-top:1px solid #6a3010; margin:8px 0;" />
        <div style="font-family:var(--mono); font-size:11px; color:#ffd0a0;">
          <div style="padding:2px 6px;">  charity assistance · forfeit all credits</div>
          <div style="padding:2px 6px; color:#ff6a6a;">  quit to title</div>
        </div>
      </div>
      <div style="position:absolute; bottom:30px; left:0; right:0; text-align:center; color:#ffd0a0; font-size:11px; letter-spacing:.18em;">credits 8,420 · stake 1,200 · seed 7e3a82c1</div>
      <div style="position:absolute; bottom:8px; left:0; right:0; text-align:center; color:#ffd0a0; font-size:10px; letter-spacing:.18em;">[↑↓] select · [enter] rebuild</div>
      <div class="callout orange" style="left:24px; top:380px; max-width:140px;">debris animates;<br>panel fades in last</div>
    `
  }
  ]
});

// =============== 09 OPTIONS ===============
addScreen({
  label: '09 Options',
  file: 'screens/options.js · settings root',
  blurb: 'today it\'s 11 rows in one column. group it.',
  variations: [
  {
    desc: 'grouped sections with subtle dividers — audio, video, gameplay, danger.',
    html: SCRIM + TAG('options · v1') + `
      <div style="position:absolute; top:20px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--green); font-size:18px;">options</div>
      </div>
      <div style="position:absolute; top:60px; left:80px; right:80px; bottom:50px; display:flex; flex-direction:column; gap:10px;">
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--ink-soft); padding-bottom:2px;">audio</div>
          <div class="menuline focus"><span class="ptr">▶</span>sound effects <span class="v">▮▮▮▮▮▮▯▯▯▯</span></div>
          <div class="menuline"><span class="ptr">▶</span>music <span class="v">▮▮▮▮▯▯▯▯▯▯</span></div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--ink-soft); padding-bottom:2px;">video</div>
          <div class="menuline"><span class="ptr">▶</span>visual fx <span class="v">◄ full ►</span></div>
          <div class="menuline"><span class="ptr">▶</span>shaders <span class="v">on</span></div>
          <div class="menuline"><span class="ptr">▶</span>fullscreen <span class="v">off</span></div>
          <div class="menuline"><span class="ptr">▶</span>shader settings →</div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--ink-soft); padding-bottom:2px;">gameplay</div>
          <div class="menuline"><span class="ptr">▶</span>dynamic zoom <span class="v">on</span></div>
          <div class="menuline"><span class="ptr">▶</span>cheat mode <span class="v">off</span></div>
          <div class="menuline"><span class="ptr">▶</span>controls →</div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--red); padding-bottom:2px; color:var(--red);">danger</div>
          <div class="menuline" style="color:var(--red);"><span class="ptr">▶</span>clear game data</div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> adjust · <span class="kbd">esc</span> back</div>
    `
  },
  {
    desc: 'two-pane: categories list left, settings for current category right.',
    html: SCRIM + TAG('options · v2 split') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; border-bottom:1px solid var(--ink-soft); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">options</div>
      </div>
      <div style="position:absolute; top:54px; left:24px; right:24px; bottom:50px; display:flex; gap:14px;">
        <div style="flex:0 0 160px; border-right:1px dashed var(--ink-soft); padding-right:8px;">
          <div class="menuline focus" style="padding-left:0;"><span class="ptr">▶</span>audio</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>video</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>gameplay</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>controls</div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>shaders</div>
          <div class="menuline" style="padding-left:0; color:var(--red);"><span class="ptr">▶</span>danger</div>
        </div>
        <div style="flex:1; padding:6px;">
          <div class="lbl green">audio</div>
          <div class="menuline focus" style="padding-left:0;"><span class="ptr">▶</span>sound effects <span class="v">▮▮▮▮▮▮▯▯▯▯  6/10</span></div>
          <div class="menuline" style="padding-left:0;"><span class="ptr">▶</span>music <span class="v">▮▮▮▮▯▯▯▯▯▯  4/10</span></div>
          <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:14px 0;" />
          <div class="note s dim">sound effects fire on menu navigation, weapons, ui state. music is the procedural ambient bed.</div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓</span> category / setting · <span class="kbd">←→</span> adjust</div>
    `
  },
  {
    desc: '"console" feel — settings rendered as a key=value list, edit inline.',
    html: `<div class="full" style="background:#070b09;"></div>` + `
      <div style="position:absolute; top:18px; left:30px; right:30px;">
        <div class="crt" style="font-size:12px;">▮ phantom.options ▮</div>
      </div>
      <div style="position:absolute; top:50px; left:30px; right:30px; bottom:40px; font-family:var(--mono); color:#58b389; font-size:13px; line-height:1.7;">
        <div><span style="color:#3a5a48;"># audio</span></div>
        <div><span style="color:#fff; background:rgba(31,138,91,.3); padding:0 4px;">▶ sfx_volume   = 6</span></div>
        <div>  music_volume = 4</div>
        <div><span style="color:#3a5a48;"># video</span></div>
        <div>  visual_fx    = full</div>
        <div>  shaders      = true</div>
        <div>  fullscreen   = false</div>
        <div><span style="color:#3a5a48;"># gameplay</span></div>
        <div>  dynamic_zoom = true</div>
        <div>  cheat_mode   = false</div>
        <div><span style="color:#3a5a48;"># sub-menus</span></div>
        <div>  controls     ↳ open</div>
        <div>  shaders.cfg  ↳ open</div>
        <div><span style="color:#b84a3a;"># danger</span></div>
        <div style="color:#ff7a6a;">  clear_save   ↳ confirm</div>
      </div>
      <div style="position:absolute; bottom:12px; left:0; right:0; text-align:center; color:#58b389; font-size:10px; letter-spacing:.18em;">[←→] adjust · [esc] back</div>
      <div class="callout green" style="left:30px; bottom:60px; max-width:130px; color:#aaa;">.cfg-file metaphor —<br>"hacker" feel</div>
    `
  }
  ]
});

// =============== 10 CONTROLS ===============
addScreen({
  label: '10 Controls',
  file: 'screens/controls.js · keyboard / gamepad rebinding',
  blurb: 'today: a single grid of 12+ rows. add structure and a focused-binding preview.',
  variations: [
  {
    desc: 'sectioned grid (move · combat · ui), per-row clearer focus, header row highlights active column.',
    html: SCRIM + TAG('controls · v1') + `
      <div style="position:absolute; top:14px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--green); font-size:18px;">controls</div>
      </div>
      <div style="position:absolute; top:48px; left:30px; right:30px; bottom:60px; font-size:11px;">
        <div style="display:grid; grid-template-columns:1fr 140px 140px; column-gap:18px; padding:4px 8px; border-bottom:1px solid var(--ink); font-weight:700;" class="lbl">
          <span>action</span><span class="text-c green">keyboard ▶</span><span class="text-c">gamepad</span>
        </div>
        ${[
          {sec:'movement', rows:[['thrust','w','LS↑'],['brake','s','LS↓'],['turn left','a','LS←'],['turn right','d','LS→']]},
          {sec:'combat',   rows:[['fire primary','space','rt'],['fire secondary','shift','lt'],['target lock','q','lb'],['cycle weapon','tab','rb']]},
          {sec:'ui',       rows:[['pause','esc','start'],['ship config','c','select'],['slipgate','f','y']]},
        ].map(s => `
          <div class="lbl" style="margin-top:6px; color:var(--ink-2); padding:0 8px;">${s.sec}</div>
          ${s.rows.map((r,i) => `
            <div style="display:grid; grid-template-columns:1fr 140px 140px; column-gap:18px; padding:3px 8px; ${i===0&&s.sec==='combat'?'background:rgba(31,138,91,.12);':''}">
              <span style="${i===0&&s.sec==='combat'?'color:var(--green); font-weight:700;':''}">${i===0&&s.sec==='combat'?'▶ ':''}${r[0]}</span>
              <span class="text-c" style="${i===0&&s.sec==='combat'?'color:var(--green); font-weight:700;':''}">[${r[1]}]</span>
              <span class="text-c dim">[${r[2]}]</span>
            </div>`).join('')}
        `).join('')}
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> column · <span class="kbd">enter</span> remap · <span class="kbd">del</span> clear · <span class="kbd">esc</span> back</div>
    `
  },
  {
    desc: 'list left, big "binding preview" on right showing current key + remap state.',
    html: SCRIM + TAG('controls · v2 preview') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; border-bottom:1px solid var(--ink-soft); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">controls</div>
      </div>
      <div style="position:absolute; top:54px; left:24px; right:24px; bottom:50px; display:flex; gap:12px;">
        <div style="flex:0 0 280px; border:1px solid var(--ink-soft); padding:6px; font-size:11px;">
          ${['thrust','brake','turn left','turn right','fire primary','fire secondary','target lock','cycle weapon','pause','ship config','slipgate'].map((a,i)=>`
            <div class="${i===4?'menuline focus':'menuline'}" style="padding-left:0;">
              <span class="ptr">▶</span>${a}<span class="v">${i===4?'space ▮ rt':['w','s','a','d','space','shift','q','tab','esc','c','f'][i]+' ▮ ◌'}</span>
            </div>`).join('')}
        </div>
        <div style="flex:1; border:1.5px solid var(--green); padding:12px; background:rgba(31,138,91,.06);">
          <div class="lbl green">action</div>
          <div class="title-tx" style="color:var(--green); font-size:18px;">fire primary</div>
          <hr style="border:0; border-top:1px dashed var(--green); margin:10px 0;" />
          <div class="lbl">keyboard</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="kbd" style="font-size:18px; padding:8px 18px;">space</div>
            <span class="dim">·</span>
            <span class="lbl">[enter] remap · [del] clear</span>
          </div>
          <div class="lbl" style="margin-top:14px;">gamepad</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="kbd" style="font-size:18px; padding:8px 18px;">RT · right trigger</div>
          </div>
          <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:14px 0;" />
          <div class="note s dim">discharges current weapon. held = continuous fire on auto-cycle weapons.</div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓</span> action · <span class="kbd">←→</span> column · <span class="kbd">enter</span> remap</div>
    `
  },
  {
    desc: 'diegetic — keyboard + controller diagrams; keys glow green when their action is focused.',
    html: SCRIM + TAG('controls · v3 diagrams') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; display:flex; justify-content:space-between;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">controls · diagrammed</div>
        <div class="lbl"><span class="kbd">tab</span> switch device</div>
      </div>
      <!-- keyboard -->
      <div style="position:absolute; top:54px; left:24px; right:24px; height:170px; border:1px solid var(--ink); padding:8px;">
        <div class="lbl green">keyboard</div>
        <svg viewBox="0 0 700 130" style="width:100%; height:130px; margin-top:4px;">
          ${(() => {
            const keys = [
              ['esc','q','w','e','r','t','y','u','i','o','p'],
              ['tab','a','s','d','f','g','h','j','k','l',';'],
              ['shift','z','x','c','v','b','n','m',',','.','/'],
              ['','','','space','space','space','space','space','space','','','']
            ];
            const focused = ['w','space'];
            let svg = '';
            keys.forEach((row,r)=>{
              row.forEach((k,c)=>{
                if(!k) return;
                const x = c*60+10, y=r*30+8, w = k==='space'?60:54;
                const isFocus = focused.includes(k);
                svg += `<rect x="${x}" y="${y}" width="${w}" height="24" rx="3" fill="${isFocus?'#1f8a5b':'transparent'}" stroke="${isFocus?'#1f8a5b':'#1f1a14'}"/>`;
                svg += `<text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${isFocus?'#fff':'#1f1a14'}">${k}</text>`;
              });
            });
            return svg;
          })()}
        </svg>
      </div>
      <!-- controller -->
      <div style="position:absolute; top:240px; left:24px; right:240px; bottom:60px; border:1px solid var(--ink-soft); padding:8px;">
        <div class="lbl">gamepad</div>
        <svg viewBox="0 0 360 130" style="width:100%; height:100%;">
          <rect x="20" y="40" width="320" height="60" rx="30" fill="none" stroke="#1f1a14"/>
          <circle cx="80" cy="70" r="14" fill="none" stroke="#1f1a14"/><text x="80" y="74" text-anchor="middle" font-family="JetBrains Mono" font-size="9">LS</text>
          <circle cx="220" cy="80" r="10" fill="none" stroke="#1f1a14"/><text x="220" y="84" text-anchor="middle" font-family="JetBrains Mono" font-size="8">RS</text>
          <circle cx="280" cy="50" r="10" fill="#1f8a5b"/><text x="280" y="54" text-anchor="middle" font-family="JetBrains Mono" font-size="8" fill="white">RT</text>
          <circle cx="280" cy="80" r="8" fill="none" stroke="#1f1a14"/><text x="280" y="83" text-anchor="middle" font-family="JetBrains Mono" font-size="8">A</text>
          <circle cx="305" cy="65" r="8" fill="none" stroke="#1f1a14"/><text x="305" y="68" text-anchor="middle" font-family="JetBrains Mono" font-size="8">B</text>
        </svg>
      </div>
      <!-- right rail = action list -->
      <div style="position:absolute; right:24px; top:240px; width:200px; bottom:60px; border:1px dashed var(--ink-soft); padding:8px;">
        <div class="lbl">actions</div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>thrust <span class="v">w · LS↑</span></div>
        <div class="menuline focus" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>fire primary <span class="v">space · rt</span></div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>brake <span class="v">s · LS↓</span></div>
        <div class="menuline" style="padding-left:0; font-size:11px;"><span class="ptr">▶</span>pause <span class="v">esc · start</span></div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓</span> action · <span class="kbd">enter</span> remap</div>
      <div class="callout green" style="right:240px; top:230px; max-width:140px;">selected action's keys<br>glow on the diagram</div>
    `
  }
  ]
});

// =============== 11 SHADERS ===============
addScreen({
  label: '11 Shaders',
  file: 'screens/shaders.js · presets + parameters',
  blurb: 'parameter list with no preview is opaque. show the effect.',
  variations: [
  {
    desc: 'preset name big at top, params as a clean stepper list, status row at bottom.',
    html: SCRIM + TAG('shaders · v1') + `
      <div style="position:absolute; top:14px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--green); font-size:18px;">shaders</div>
      </div>
      <div style="position:absolute; top:54px; left:60px; right:60px; bottom:60px;">
        <div class="lbl">preset</div>
        <div class="title-tx" style="font-size:24px; color:var(--green); margin-bottom:8px;">◄ phosphor crt ►</div>
        <div class="row-h gap-8" style="font-size:11px;">
          <span class="chip green">active</span><span class="chip">shader ui</span>
        </div>
        <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:14px 0;" />
        <div class="lbl">parameters · 5</div>
        <div class="menuline focus"><span class="ptr">▶</span>scanline strength <span class="v">◄ <strong>0.65</strong> ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>glow radius <span class="v">◄ 1.20 ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>chromatic aberration <span class="v">◄ 0.04 ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>vignette <span class="v">◄ 0.30 ►</span></div>
        <div class="menuline"><span class="ptr">▶</span>noise <span class="v">◄ 0.10 ►</span></div>
        <hr style="border:0; border-top:1px dashed var(--ink-soft); margin:14px 0;" />
        <div class="row-h gap-12">
          <span class="chip" style="padding:4px 10px;">reset parameters</span>
          <span class="chip solid green" style="padding:4px 10px;">return</span>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> adjust · <span class="kbd">esc</span> back</div>
    `
  },
  {
    desc: 'preview window left (live mini-canvas), preset + params stack on the right.',
    html: SCRIM + TAG('shaders · v2 preview') + `
      <div style="position:absolute; top:14px; left:24px; right:24px; border-bottom:1px solid var(--ink-soft); padding-bottom:6px;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">shaders</div>
      </div>
      <div style="position:absolute; top:54px; left:24px; right:24px; bottom:50px; display:flex; gap:14px;">
        <div style="flex:0 0 320px; display:flex; flex-direction:column; gap:8px;">
          <div class="ph" style="height:200px; background:linear-gradient(180deg, #0a0d0a, #050805); border-color:var(--green); position:relative;">
            <span style="color:var(--green); text-shadow:0 0 8px rgba(31,138,91,.5); font-size:14px; letter-spacing:.2em;">live preview</span>
            <div class="full" style="background:repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,.04) 2px 3px);"></div>
          </div>
          <div class="lbl">preset</div>
          <div class="row-h gap-4">
            <div class="chip" style="padding:3px 8px;">crt</div>
            <div class="chip solid green" style="padding:3px 8px;">phosphor</div>
            <div class="chip" style="padding:3px 8px;">vector</div>
            <div class="chip" style="padding:3px 8px;">none</div>
          </div>
        </div>
        <div style="flex:1; padding-left:8px; border-left:1px dashed var(--ink-soft);">
          <div class="lbl">parameters · phosphor crt</div>
          ${['scanline strength · 0.65','glow radius · 1.20','chromatic aberration · 0.04','vignette · 0.30','noise · 0.10'].map((p,i)=>`
            <div class="${i===0?'menuline focus':'menuline'}" style="padding-left:0; font-size:11px;">
              <span class="ptr">▶</span>${p.split('·')[0]}
              <span class="v">◄ <strong>${p.split('·')[1].trim()}</strong> ►</span>
            </div>`).join('')}
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> adjust · live preview updates</div>
    `
  },
  {
    desc: 'preset cards in a row at top, faders below — like a compact synth panel.',
    html: SCRIM + TAG('shaders · v3 synth') + `
      <div style="position:absolute; top:14px; left:24px; right:24px;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">shaders ▮ phosphor crt</div>
      </div>
      <div style="position:absolute; top:48px; left:24px; right:24px; display:flex; gap:6px;">
        ${['none','crt','phosphor','vector','plasma'].map((p,i)=>`
          <div style="flex:1; border:${i===2?'2px solid var(--green)':'1px solid var(--ink-soft)'};
                      background:${i===2?'rgba(31,138,91,.08)':'transparent'};
                      padding:8px; text-align:center; font-family:var(--mono); font-size:11px; ${i===2?'color:var(--green); font-weight:700;':''}">
            <div class="ph" style="height:30px; margin-bottom:4px; border:none; background:#0a0d0a;"></div>
            ${p}
          </div>`).join('')}
      </div>
      <div style="position:absolute; top:160px; left:24px; right:24px; bottom:60px; display:grid; grid-template-columns:repeat(5, 1fr); gap:14px;">
        ${[['scanline','0.65',true],['glow','1.20',false],['aberration','0.04',false],['vignette','0.30',false],['noise','0.10',false]].map(([n,v,f])=>`
          <div style="display:flex; flex-direction:column; align-items:center;">
            <div class="lbl">${n}</div>
            <div style="position:relative; width:30px; flex:1; min-height:140px; border:1px solid ${f?'var(--green)':'var(--ink-soft)'}; margin:6px 0;">
              <div style="position:absolute; bottom:0; left:0; right:0; height:55%; background:${f?'var(--green)':'var(--ink-2)'}; opacity:${f?'.4':'.3'};"></div>
              <div style="position:absolute; left:-6px; right:-6px; top:45%; height:3px; background:${f?'var(--green)':'var(--ink)'};"></div>
            </div>
            <div style="font-family:var(--mono); font-weight:700; font-size:12px; color:${f?'var(--green)':'var(--ink)'};">${v}</div>
            ${f?'<div class="lbl green">▶ focus</div>':''}
          </div>`).join('')}
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">←→</span> param · <span class="kbd">↑↓</span> adjust · <span class="kbd">esc</span> back</div>
    `
  }
  ]
});

// =============== 12 CHEATS ===============
addScreen({
  label: '12 Cheats',
  file: 'screens/cheats.js · yellow theme · pause submenu',
  blurb: 'feels developer-y. lean into that.',
  variations: [
  {
    desc: 'tighter list with grouped sections (ship · wallet · world · flags).',
    html: SCRIM + TAG('cheats · v1') + `
      <div style="position:absolute; top:14px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--yellow); font-size:18px;">cheats</div>
        <div class="lbl" style="color:var(--yellow);">cheat mode active</div>
      </div>
      <div style="position:absolute; top:60px; left:60px; right:60px; bottom:50px; display:flex; flex-direction:column; gap:8px;">
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--yellow); color:var(--yellow); padding-bottom:2px;">ship</div>
          <div class="menuline focus"><span class="ptr" style="color:var(--yellow);">▶</span>repair ship</div>
          <div class="menuline"><span class="ptr">▶</span>invincibility <span class="v">off</span></div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--yellow); color:var(--yellow); padding-bottom:2px;">wallet</div>
          <div class="menuline"><span class="ptr">▶</span>add 10k credits</div>
          <div class="menuline"><span class="ptr">▶</span>zero credits</div>
        </div>
        <div>
          <div class="lbl" style="border-bottom:1px solid var(--yellow); color:var(--yellow); padding-bottom:2px;">world</div>
          <div class="menuline"><span class="ptr">▶</span>teleport to slipgate</div>
          <div class="menuline"><span class="ptr">▶</span>jump to seed…</div>
          <div class="menuline"><span class="ptr">▶</span>unlock slipgate</div>
        </div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">esc</span> back</div>
    `
  },
  {
    desc: 'two-column grid of cheats, status indicators on toggles.',
    html: SCRIM + TAG('cheats · v2 grid') + `
      <div style="position:absolute; top:14px; left:0; right:0; text-align:center;">
        <div class="title-tx" style="color:var(--yellow); font-size:16px;">cheats</div>
      </div>
      <div style="position:absolute; top:48px; left:30px; right:30px; bottom:50px; display:grid; grid-template-columns:1fr 1fr; gap:8px; align-content:start;">
        ${[
          {n:'repair ship', kind:'action', focus:true},
          {n:'invincibility', kind:'toggle', state:'off'},
          {n:'add 10k credits', kind:'action'},
          {n:'zero credits', kind:'action'},
          {n:'teleport slipgate', kind:'action'},
          {n:'jump to seed…', kind:'action'},
          {n:'unlock slipgate', kind:'action'},
          {n:'cheat mode', kind:'toggle', state:'on'},
        ].map(c=>`
          <div style="border:${c.focus?'2px solid var(--yellow)':'1px solid #665500'};
                      background:${c.focus?'rgba(184,154,26,.08)':'transparent'};
                      padding:6px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center; color:${c.focus?'var(--yellow)':'var(--ink-2)'};">
            <span>${c.focus?'▶ ':''}${c.n}</span>
            ${c.kind==='toggle'?`<span class="chip" style="border-color:${c.state==='on'?'var(--yellow)':'var(--ink-faint)'}; color:${c.state==='on'?'var(--yellow)':'var(--ink-faint)'};">${c.state}</span>`:'<span class="lbl">▶</span>'}
          </div>`).join('')}
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center;" class="lbl"><span class="kbd">↑↓←→</span> select · <span class="kbd">enter</span> activate</div>
    `
  },
  {
    desc: 'debug console — slash-commands rendered, cheats triggered like a tilde-prompt.',
    html: `<div class="full" style="background:#0d0a05;"></div>` + `
      <div style="position:absolute; top:18px; left:30px; right:30px;">
        <div style="color:#ffee44; font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-shadow:0 0 6px rgba(255,238,68,.4);">▮ debug console ▮ cheat mode ▮</div>
      </div>
      <div style="position:absolute; top:50px; left:30px; right:30px; bottom:60px; font-family:var(--mono); color:#ffee44; font-size:13px; line-height:1.7;">
        <div style="opacity:.5;">// available commands</div>
        <div>  /repair</div>
        <div>  /invincible &lt;on|off&gt;</div>
        <div>  /credits +10000</div>
        <div>  /credits 0</div>
        <div>  /jump &lt;seed&gt;</div>
        <div>  /teleport slipgate</div>
        <div>  /unlock slipgate</div>
        <div style="margin-top:14px; opacity:.5;">// recent</div>
        <div style="color:#fff;">> /repair</div>
        <div style="opacity:.7;">  ✓ ship hull restored</div>
        <div style="color:#fff;">> /credits +10000</div>
        <div style="opacity:.7;">  ✓ credits = 18,420</div>
        <div style="margin-top:14px;"><span style="background:rgba(255,238,68,.2); padding:0 4px; border-left:2px solid #ffee44;">> /<span class="blink">_</span></span></div>
      </div>
      <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center; color:#ffee44; font-size:10px; letter-spacing:.18em; opacity:.7;">[↑↓] history · [tab] complete · [esc] back</div>
      <div class="callout yellow" style="right:30px; top:200px; max-width:130px;">discoverable through<br>autocomplete</div>
    `
  }
  ]
});

// =============== 13 BANNERS ===============
addScreen({
  label: '13 Banners',
  file: 'screens/banners.js · game over · sector cleared',
  blurb: 'today: text + "press enter". add a run summary so each death/win has weight.',
  variations: [
  {
    desc: 'big title, blink prompt, seed printed (current with tighter type).',
    html: SCRIM + TAG('banner · v1') + `
      <div class="full" style="background:rgba(0,0,0,.4);"></div>
      <div style="position:absolute; top:50%; left:0; right:0; transform:translateY(-50%); text-align:center;">
        <div style="font-family:var(--mono); font-weight:700; font-size:64px; letter-spacing:.18em; color:var(--red);">game over</div>
        <div class="blink" style="margin-top:24px; font-family:var(--mono); font-size:12px; color:var(--ink-soft); letter-spacing:.2em;">enter / start to continue</div>
        <div style="margin-top:30px; font-family:var(--mono); font-size:11px; color:var(--ink-faint); letter-spacing:.18em;">seed 7e3a82c1</div>
      </div>
    `
  },
  {
    desc: 'banner + run summary stats grid (hostile kills, systems visited, credits earned, time).',
    html: SCRIM + TAG('banner · v2 summary') + `
      <div class="full" style="background:rgba(0,0,0,.5);"></div>
      <div style="position:absolute; top:50px; left:0; right:0; text-align:center;">
        <div style="font-family:var(--mono); font-weight:700; font-size:46px; letter-spacing:.18em; color:var(--yellow);">sector liberated!</div>
        <div class="lbl" style="color:var(--yellow); margin-top:6px;">— run summary —</div>
      </div>
      <div style="position:absolute; top:170px; left:80px; right:80px; bottom:80px; border:1.5px solid var(--yellow); background:rgba(184,154,26,.06); padding:18px; display:grid; grid-template-columns:1fr 1fr; gap:10px 30px; font-family:var(--mono); font-size:14px;">
        <span class="dim">credits earned</span><span style="color:var(--yellow); font-weight:700; text-align:right;">12,480</span>
        <span class="dim">systems visited</span><span style="text-align:right; font-weight:700;">6</span>
        <span class="dim">enemies down</span><span style="text-align:right; font-weight:700;">42</span>
        <span class="dim">objectives</span><span style="text-align:right; font-weight:700;">8 / 10</span>
        <span class="dim">deaths</span><span style="text-align:right; font-weight:700;">2</span>
        <span class="dim">time</span><span style="text-align:right; font-weight:700;">1h 24m</span>
        <span class="dim">seed</span><span style="text-align:right;">7e3a82c1</span>
        <span class="dim">stake bonus</span><span style="text-align:right; color:var(--green); font-weight:700;">+5%</span>
      </div>
      <div class="blink" style="position:absolute; bottom:30px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:12px; color:var(--ink-soft); letter-spacing:.2em;">enter / start to continue</div>
    `
  },
  {
    desc: 'cinematic — full-bleed scene (stars / explosion debris) with title overlay typing in.',
    html: `<div class="full" style="background:#0a0608;"></div>` + `
      <svg viewBox="0 0 800 580" style="position:absolute; inset:0; width:100%; height:100%;">
        ${Array.from({length:80}).map(()=>`<circle cx="${Math.random()*800}" cy="${Math.random()*580}" r="${0.4+Math.random()*1}" fill="rgba(255,180,160,${0.2+Math.random()*0.5})"/>`).join('')}
        ${Array.from({length:18}).map((_,i)=>{
          const x=Math.random()*800, y=Math.random()*580, s=2+Math.random()*10;
          return `<rect x="${x}" y="${y}" width="${s}" height="${s*0.5}" fill="none" stroke="rgba(184,74,58,.6)" transform="rotate(${Math.random()*360} ${x} ${y})"/>`;
        }).join('')}
      </svg>
      <div class="full" style="background:radial-gradient(ellipse at center, rgba(184,74,58,.2), transparent 70%); pointer-events:none;"></div>
      <div style="position:absolute; top:120px; left:0; right:0; text-align:center;">
        <div style="font-family:var(--mono); font-weight:700; font-size:90px; letter-spacing:.16em; color:#ff4040; text-shadow:0 0 30px rgba(255,64,64,.6);">GAME OVER</div>
      </div>
      <div style="position:absolute; bottom:140px; left:0; right:0; text-align:center; color:#ffd0d0;">
        <div style="font-family:var(--mono); font-size:13px; letter-spacing:.16em; opacity:.8;">— ph-9421 protocol terminated —</div>
        <div style="font-family:var(--mono); font-size:11px; letter-spacing:.12em; margin-top:14px; opacity:.6;">seed 7e3a82c1 · 6 systems · 42 kills · 1h 24m</div>
      </div>
      <div class="blink" style="position:absolute; bottom:50px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:12px; color:#ff8080; letter-spacing:.22em;">[ enter ] continue</div>
      <div class="callout red" style="left:30px; top:60px; max-width:140px; color:#ffaaaa;">title types in,<br>scene fades up</div>
    `
  }
  ]
});

// =============== 14 SEED INPUT ===============
addScreen({
  label: '14 Seed Input',
  file: 'screens/seed-input.js · cheat menu / new run',
  blurb: 'a tiny dialog. it can be more interesting than a text box.',
  variations: [
  {
    desc: 'cleaned-up version of current — input field, error line, two buttons.',
    html: SCRIM + TAG('seed · v1') + `
      <div class="full" style="background:rgba(0,0,0,.55);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:380px; background:var(--paper); border:1.5px solid var(--ink); padding:18px;">
        <div class="title-tx" style="color:var(--green); text-align:center; font-size:16px;">set seed</div>
        <div class="lbl text-c" style="margin:2px 0 12px;">up to 8 hex digits — leave blank for random</div>
        <div style="border:1.5px solid var(--green); background:#0a0d0a; color:var(--green); font-family:var(--mono); font-size:24px; letter-spacing:6px; text-align:center; padding:10px; text-shadow:0 0 8px rgba(31,138,91,.5);">7e3a82c1<span class="blink">|</span></div>
        <div class="lbl" style="color:var(--red); margin-top:6px; min-height:14px; text-align:center;">&nbsp;</div>
        <div class="row-h gap-12 center-x" style="margin-top:8px;">
          <span class="chip" style="padding:6px 18px;">cancel</span>
          <span class="chip solid green" style="padding:6px 18px;">▶ confirm</span>
        </div>
      </div>
    `
  },
  {
    desc: 'seed input + a tiny preview box showing what the seed "looks like" (placeholder pattern).',
    html: SCRIM + TAG('seed · v2 preview') + `
      <div class="full" style="background:rgba(0,0,0,.6);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:480px; background:var(--paper); border:1.5px solid var(--ink); padding:18px;">
        <div class="title-tx" style="color:var(--green); text-align:center; font-size:16px;">set seed</div>
        <div class="lbl text-c" style="margin:2px 0 12px;">deterministic — same seed, same galaxy</div>
        <div style="display:flex; gap:14px;">
          <div style="flex:1;">
            <div style="border:1.5px solid var(--green); background:#0a0d0a; color:var(--green); font-family:var(--mono); font-size:22px; letter-spacing:5px; text-align:center; padding:10px; text-shadow:0 0 8px rgba(31,138,91,.5);">7e3a82c1<span class="blink">|</span></div>
            <div class="lbl text-c" style="margin-top:6px;">8 hex digits · 0-9 / a-f</div>
            <div class="lbl text-c" style="color:var(--ink-faint); margin-top:2px;">blank = random</div>
          </div>
          <div style="flex:0 0 130px; border:1px dashed var(--ink-soft); padding:8px;">
            <div class="lbl">preview</div>
            <svg viewBox="0 0 100 100" style="width:100%; aspect-ratio:1;">
              ${Array.from({length:25}).map((_,i)=>`<circle cx="${(i*37)%90+5}" cy="${(i*53)%90+5}" r="${1+(i%3)}" fill="#1f8a5b" opacity=".5"/>`).join('')}
            </svg>
            <div class="lbl text-c">approx layout</div>
          </div>
        </div>
        <div class="row-h gap-12 center-x" style="margin-top:14px;">
          <span class="chip" style="padding:5px 18px;">cancel</span>
          <span class="chip solid green" style="padding:5px 18px;">▶ jump</span>
        </div>
      </div>
      <div class="callout green" style="left:80px; top:140px; max-width:140px;">seed → procedural<br>layout sketch</div>
    `
  },
  {
    desc: 'tape-style: 8 hex digit slots, focused slot pulses, characters click into place.',
    html: SCRIM + TAG('seed · v3 tape') + `
      <div class="full" style="background:rgba(0,0,0,.6);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); text-align:center;">
        <div class="title-tx" style="color:var(--green); font-size:16px;">set seed</div>
        <div class="lbl" style="color:var(--green); margin:6px 0 18px;">▮ slipspace coordinate input ▮</div>
        <div style="display:flex; gap:6px; justify-content:center;">
          ${'7e3a82c1'.split('').map((c,i)=>`
            <div style="width:48px; height:64px; border:${i===4?'2px solid var(--green)':'1px solid var(--ink-soft)'};
                        background:${i===4?'rgba(31,138,91,.15)':'#0a0d0a'};
                        color:var(--green); font-family:var(--mono); font-size:32px; font-weight:700;
                        display:flex; align-items:center; justify-content:center;
                        text-shadow:0 0 6px rgba(31,138,91,.5); ${i===4?'animation: blink 1s steps(2) infinite;':''}">
              ${c}
            </div>`).join('')}
        </div>
        <div class="lbl" style="margin-top:14px;">${'12345678'.split('').map(n => `<span style="display:inline-block; width:54px;">${n}</span>`).join('')}</div>
        <div class="lbl" style="margin-top:6px;"><span class="kbd">←→</span> slot · <span class="kbd">↑↓</span> change · <span class="kbd">tab</span> randomize · <span class="kbd">enter</span> jump</div>
        <div class="row-h gap-12 center-x" style="margin-top:18px;">
          <span class="chip" style="padding:5px 18px;">cancel</span>
          <span class="chip solid green" style="padding:5px 18px;">randomize</span>
          <span class="chip solid" style="background:var(--green); padding:5px 18px;">▶ jump</span>
        </div>
      </div>
      <div class="callout green" style="left:30px; bottom:60px; max-width:160px;">per-digit tumblers —<br>satisfying with kbd/gp</div>
    `
  }
  ]
});

// =============== 15 CLEAR DATA ===============
addScreen({
  label: '15 Clear Data',
  file: 'screens/clear-data.js · destructive confirmation',
  blurb: 'destructive confirmations should be clear, slightly inconvenient, and reversible-feeling.',
  variations: [
  {
    desc: 'red panel with clear yes/no, default selection on "back".',
    html: SCRIM + TAG('clear · v1') + `
      <div class="full" style="background:rgba(0,0,0,.6);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:380px; background:var(--paper); border:1.5px solid var(--red); padding:18px;">
        <div class="title-tx" style="color:var(--red); text-align:center; font-size:16px;">clear all game data?</div>
        <div class="text-c" style="margin:14px 0; font-size:12px;">are you sure?<br><span class="dim">this will reset the game.</span></div>
        <div class="row-h gap-12 center-x">
          <span class="chip solid green" style="padding:5px 18px;">▶ back</span>
          <span class="chip" style="padding:5px 18px; border-color:var(--red); color:var(--red);">confirm</span>
        </div>
      </div>
    `
  },
  {
    desc: 'lists exactly what will be cleared (saves, settings, bindings) — informative dread.',
    html: SCRIM + TAG('clear · v2 detailed') + `
      <div class="full" style="background:rgba(0,0,0,.6);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:440px; background:var(--paper); border:1.5px solid var(--red); padding:18px;">
        <div class="title-tx" style="color:var(--red); text-align:center; font-size:16px;">clear all game data?</div>
        <div class="lbl text-c" style="color:var(--red); margin:2px 0 12px;">this cannot be undone</div>
        <div style="font-size:11px; line-height:1.7;">
          <div class="row-h between"><span class="dim">▮ run save</span><span class="strong">7e3a82c1 · 1h 24m</span></div>
          <div class="row-h between"><span class="dim">▮ stake</span><span class="strong">1,200 cr</span></div>
          <div class="row-h between"><span class="dim">▮ visited systems</span><span class="strong">6</span></div>
          <div class="row-h between"><span class="dim">▮ chassis licenses</span><span class="strong">2</span></div>
          <div class="row-h between"><span class="dim">▮ control bindings</span><span class="strong">custom</span></div>
          <div class="row-h between"><span class="dim">▮ audio + shader settings</span><span class="strong">custom</span></div>
        </div>
        <div class="row-h gap-12 center-x" style="margin-top:16px;">
          <span class="chip solid green" style="padding:5px 18px;">▶ keep</span>
          <span class="chip" style="padding:5px 18px; border-color:var(--red); color:var(--red);">erase all</span>
        </div>
      </div>
    `
  },
  {
    desc: 'type "ERASE" to confirm — friction proportional to consequence.',
    html: SCRIM + TAG('clear · v3 type-confirm') + `
      <div class="full" style="background:rgba(0,0,0,.7);"></div>
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:420px; background:var(--paper); border:1.5px solid var(--red); padding:18px;">
        <div class="title-tx" style="color:var(--red); text-align:center; font-size:16px;">clear all game data?</div>
        <div class="text-c" style="margin:8px 0; font-size:12px;">type <strong style="color:var(--red); letter-spacing:.2em;">ERASE</strong> to confirm.</div>
        <div style="border:1.5px solid var(--red); background:#1a0808; color:var(--red); font-family:var(--mono); font-size:22px; letter-spacing:6px; text-align:center; padding:10px; text-shadow:0 0 6px rgba(184,74,58,.5);">ERAS<span class="blink">_</span></div>
        <div class="lbl text-c" style="margin-top:6px; color:var(--red);">4 / 5 chars</div>
        <div class="row-h gap-12 center-x" style="margin-top:14px;">
          <span class="chip solid green" style="padding:5px 18px;">▶ cancel</span>
          <span class="chip" style="padding:5px 18px; border-color:var(--ink-faint); color:var(--ink-faint);">erase (locked)</span>
        </div>
      </div>
      <div class="callout red" style="left:30px; bottom:80px; max-width:160px;">"erase" only enables<br>once typed correctly</div>
    `
  }
  ]
});

})();
