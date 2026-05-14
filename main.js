'use strict';

var CV=document.getElementById('g'),cx=CV.getContext('2d');
function resizeGameCanvas(cssScale=GAME_CSS_SCALE){
  const ratioChanged=setCanvasPixelRatio(cssScale);
  const bw=Math.round(W*CANVAS_PIXEL_RATIO),bh=Math.round(H*CANVAS_PIXEL_RATIO);
  const sizeChanged=CV.width!==bw||CV.height!==bh;
  if(sizeChanged){CV.width=bw;CV.height=bh;}
  CV.style.width=W+'px';
  CV.style.height=H+'px';
  if(typeof effectsResize==='function')effectsResize(CV);
  if(typeof shaderResize==='function')shaderResize();
  if(ratioChanged&&typeof clearStarLayers==='function')clearStarLayers();
  return ratioChanged||sizeChanged;
}
resizeGameCanvas(1);

// True iff a DOM screen is registered for the current G.st/G.paused combination
// (i.e. the migrated UI owns this state and the legacy canvas menu should skip).
function uiOwnsCurrent(){
  const k = (typeof uiCurrentScreenKey === 'function') ? uiCurrentScreenKey() : '';
  return !!(k && UI_SCREEN_FACTORIES && UI_SCREEN_FACTORIES[k]);
}

// ===================== MAIN LOOP =====================
function update(){
  pollGP();

  // The DOM UI layer owns input for any state with a registered screen.
  // It mounts/unmounts based on G.st + overlay flags, consumes menu input,
  // and short-circuits the rest of update for menu/dialog frames.
  if(typeof uiUpdateFrame === 'function' && uiUpdateFrame()) return;

  if(G.seedInputOpen) return;

  const st=G.st;

  // Dead/transient gameplay states — wait for the rebuild trigger / banner.
  if(st==='dead_ow'||st==='dead_enc'||st==='dead_site') return;

  // Pause toggle — pressing the pause action while in gameplay opens the
  // pause screen on the next frame (when uiSyncWithGameState mounts it).
  if(iPause()){
    if(G.paused){
      // Should be unreachable: when paused the UI layer owns input. Falls
      // through here only if the pause screen factory is missing.
      G.paused=false; suppressMenuInput();
    } else {
      openPauseMenu(); suppressMenuInput();
    }
    return;
  }

  if(G.paused){
    // Same fallback as above; UI normally owns paused frames.
    return;
  }

  // Normal gameplay state machine.
  if(st==='overworld') updOW();
  else if(st==='enc_in'||st==='encounter'){
    if(st==='enc_in' && G.ENC.introTimer>0){
      G.ENC.introTimer--;
      if(G.ENC.introTimer===0) G.st='encounter';
    } else updEnc();
  }
  else if(st==='play'||st==='esc') updSite();

  if(G.fr%300===0 && (st==='overworld'||st==='encounter'||st==='play'||st==='esc')) saveGame();
}

// Backdrop for migrated menu states — the canvas content drawn behind a DOM
// screen. Fullscreen menus get a starfield; world-overlay menus (base/slipgate)
// get the overworld; paused gameplay keeps drawing the world frozen behind.
function drawMenuBackdrop(){
  cx.fillStyle='#000'; cx.fillRect(0,0,W,H);
  drStars();
}

function draw(){
  cx.setTransform(CANVAS_PIXEL_RATIO,0,0,CANVAS_PIXEL_RATIO,0,0);
  const st=G.st;
  const uiOwns = uiOwnsCurrent();

  // World-backdrop menus
  if(st==='base')     { if(uiOwns) drawOW(); return; }
  if(st==='slipgate') { if(uiOwns) drawOW(); return; }

  // Fullscreen menus / banners — DOM owns the menu, canvas paints the stars.
  if(st==='title'||st==='options'||st==='controls'||st==='shaders'||st==='rebuild'||st==='over'||st==='done'){
    if(uiOwns){
      drawMenuBackdrop();
      drGPI(8, H-8, 'left');
      return;
    }
    // Fallback: minimal "no UI registered" notice (shouldn't happen in normal play).
    drawMenuBackdrop();
    return;
  }

  // Gameplay states — always draw the world frame; pause panel layered on top.
  if(st==='overworld'||st==='dead_ow'){
    drawOW();
    if(st==='dead_ow') drawDeadShipBanner();
  }
  else if(st==='enc_in'||st==='encounter'||st==='dead_enc'){
    drawEnc();
    if(st==='dead_enc') drawDeadShipBanner();
  }
  else drawSite();

  // Paused: DOM pause panel takes precedence (UI owns the frame). Only fall
  // back to a no-op if no factory is registered for the paused-state.
}

// Inline death banner shared by overworld + encounter dead states. Drawn on
// canvas (transient state, not a menu); will move to a DOM banner later.
function drawDeadShipBanner(){
  cx.save();
  cx.fillStyle='rgba(0,0,0,.4)'; cx.fillRect(0,0,W,H);
  cx.fillStyle='#f43'; cx.shadowColor='#f43'; cx.shadowBlur=sb(14);
  cx.font='bold 26px MajorMonoDisplay, monospace';
  cx.textAlign='center';
  cx.fillText('ship destroyed', W/2, H/2);
  cx.restore();
}

// Display-synced render loop with fixed 60Hz simulation ticks. Gameplay values
// are tuned per tick, so update() must not run once per high-refresh display frame.
const SIM_STEP_MS=1000/60,SIM_MAX_FRAME_MS=250,SIM_MAX_STEPS=5;
let simAccumMs=0,lastLoopTs=null;
function shouldAccumulateRunActiveMs(){
  const st=G.st;
  return !G.paused&&st!=='title'&&!(typeof st==='string'&&st.startsWith('dead_'));
}
function trackFPS(ts){
  if(typeof ts!=='number') return;
  if(G.lastFrameTs){
    const dt=Math.max(1,Math.min(250,ts-G.lastFrameTs));
    G.frameMs+=(dt-G.frameMs)*.08;
    G.fps=1000/G.frameMs;
  }
  G.lastFrameTs=ts;
}
function loop(ts){
  if(typeof ts!=='number')ts=performance.now();
  if(lastLoopTs==null)lastLoopTs=ts;
  trackFPS(ts);

  const elapsed=Math.max(0,Math.min(SIM_MAX_FRAME_MS,ts-lastLoopTs));
  lastLoopTs=ts;
  simAccumMs+=elapsed;

  let steps=0;
  while(simAccumMs>=SIM_STEP_MS&&steps<SIM_MAX_STEPS){
    if(shouldAccumulateRunActiveMs())G.run.activeMs+=SIM_STEP_MS;
    update();
    if(typeof effectsTick==='function')effectsTick();
    musicUpdate();
    G.fr++;
    simAccumMs-=SIM_STEP_MS;
    steps++;
  }
  if(steps===SIM_MAX_STEPS)simAccumMs=0;

  if(typeof effectsBeginFrame==='function')effectsBeginFrame(CV);
  draw();
  if(typeof effectsEndFrame==='function')effectsEndFrame();
  if(typeof shaderPresentFrame==='function')shaderPresentFrame();
  requestAnimationFrame(loop);
}

function shouldSaveOnUnload(){
  const activeStates=['overworld','enc_in','encounter','play','esc','base','slipgate','rebuild','dead_ow','dead_enc','dead_site'];
  return !!(G.OW||G.ENC||G.site)&&(activeStates.includes(G.st)||((G.st==='options'||G.st==='controls'||G.st==='shaders')&&G.optFrom!=='title'));
}
window.addEventListener('beforeunload',()=>{ if(shouldSaveOnUnload()) saveGame(); });

// Boot — restore audio/settings from save, generate the tutorial world, init the
// post-process + DOM UI overlays, then start the main loop.
{
  const sv=loadSave(),shaderDefault=typeof shaderPreferredDefaultEnabled==='function'?shaderPreferredDefaultEnabled():false;
  if(sv){
    G.sfxVol=sv.sfxVol??7;G.musVol=sv.musVol??7;G.dynamicZoom=sv.dynamicZoom??true;
    G.renderQuality=normalizeRenderQuality(sv.renderQuality);G.gpAimMode=sv.gpAimMode==='absolute'?'absolute':'relative';
    G.shaderEnabled=typeof sv.shaderEnabled==='boolean'?sv.shaderEnabled:shaderDefault;
    G.shaderUiEnabled=sv.shaderUiEnabled!==false;
    G.shaderPresetId=normalizeShaderPresetId(sv.shaderPresetId);G.shaderParams=normalizeShaderParams(sv.shaderParams);
    G.effectsEnabled=sv.effectsEnabled!==false;G.effectSettings=normalizeEffectSettings(sv.effectSettings);
  }else{
    G.shaderEnabled=shaderDefault;G.shaderUiEnabled=true;G.shaderPresetId=SHADER_DEFAULT_PRESET_ID;G.shaderParams=normalizeShaderParams(null);
    G.effectsEnabled=true;G.effectSettings=normalizeEffectSettings(null);
  }
}
G.seed=TUTORIAL_SEED; genWorld(G.seed);
if(typeof shaderInit==='function'){shaderInit(CV);if(!shaderSupported())G.shaderEnabled=false;shaderApplyVisibility();}
if(typeof uiInit === 'function') uiInit();
requestAnimationFrame(loop);
