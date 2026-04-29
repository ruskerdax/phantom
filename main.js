'use strict';

var CV=document.getElementById('g'),cx=CV.getContext('2d');
CV.width=W;CV.height=H;

// ===================== MAIN LOOP =====================
function update(){
  pollGP();
  if(G.seedInputOpen)return;
  const st=G.st;
  if(st==='options'){updOptionsMenu();return;}
  if(st==='controls'){updControlsMenu();return;}
  if(st==='title'){updTitleMenu();return;}
  if(st==='rebuild'){updRebuild();return;}
  if(st==='over'||st==='done'){if(iEnter()){ia();if(st==='over'){G.st='title';}else{G.stake=0;G.credits=0;G.cleared=[false,false,false];G.lvState={};G.st='title';}}return;}
  if(st==='dead_ow'||st==='dead_enc'||st==='dead_site')return;
  if(st==='base'){updBase();return;}
  if(st==='slipgate'){
    const m=menuInput({fireConfirms:false});
    if(G.slipgateActive){
      const isTutFirst=G.seed===TUTORIAL_SEED&&!G.tutorialDone;
      if(isTutFirst){
        if(m.up)G.slipSel=0;
        if(m.down)G.slipSel=1;
      } else {
        const nb=slipNeighborList();
        if(m.up)G.slipSel=Math.max(0,G.slipSel-1);
        if(m.down)G.slipSel=Math.min(nb.length-1,G.slipSel+1);
      }
      if(m.confirm){
        ia();
        if(isTutFirst){
          if(G.slipSel===1){returnToOverworld();return;}
          G.tutorialDone=true;
          jumpToSeed((Math.random()*0xFFFFFFFF)>>>0,TUTORIAL_SEED);
        } else {
          const nb=slipNeighborList();
          jumpToSeed(nb[G.slipSel],G.seed);
        }
        return;
      }
    }
    if(m.cancel)returnToOverworld();
    return;
  }
  if(iPause()){
    if(G.paused){
      if(G.cheatSub){G.cheatSub=false;suppressMenuInput();}
      else if(G.showShipConfig){G.showShipConfig=false;}
      else{G.paused=false;suppressMenuInput();}
    }
    else{G.paused=true;G.pauseSel=0;G.cheatSub=false;G.showShipConfig=false;suppressMenuInput();}
    return;
  }
  if(G.paused){
    updPauseMenu(st);
    return;
  }
  if(st==='overworld')updOW();
  else if(st==='enc_in'||st==='encounter'){if(st==='enc_in'&&G.ENC.introTimer>0){G.ENC.introTimer--;if(G.ENC.introTimer===0)G.st='encounter';}else updEnc();}
  else if(st==='play'||st==='esc')updSite();
  if(G.fr%300===0&&(st==='overworld'||st==='encounter'||st==='play'||st==='esc'))saveGame();
}

function draw(){
  const st=G.st;
  if(st==='title')return drawTitle();
  if(st==='options'){drawOptions();if(G.clearDataSel!==undefined)return drawClearDataDialog();return;}
  if(st==='controls')return drawControls();
  if(st==='over')return drawScreen('GAME OVER','','#f40','ENTER OR START TO CONTINUE');
  if(st==='rebuild')return drawRebuild();
  if(st==='done')return drawScreen('SECTOR LIBERATED!','CREDITS  '+G.credits,'#fd0','ENTER OR START TO PLAY AGAIN');
  if(st==='base')return drawBaseMenu();
  if(st==='slipgate')return drawSlipgateMenu();
  if(st==='overworld'||st==='dead_ow'){drawOW();if(st==='dead_ow'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else if(st==='enc_in'||st==='encounter'||st==='dead_enc'){drawEnc();if(st==='dead_enc'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else drawSite();
  scanlines();
  if(G.paused)drawPause();
}

// Standard browser game loop: update all logic, render the current frame, advance the frame counter,
// then schedule the next iteration via requestAnimationFrame (targets 60fps, synced to the display).
function trackFPS(ts){
  if(typeof ts!=='number')return;
  if(G.lastFrameTs){
    const dt=Math.max(1,Math.min(250,ts-G.lastFrameTs));
    G.frameMs+=(dt-G.frameMs)*.08;
    G.fps=1000/G.frameMs;
  }
  G.lastFrameTs=ts;
}
function loop(ts){trackFPS(ts);update();draw();G.fr++;requestAnimationFrame(loop);}
function shouldSaveOnUnload(){
  const activeStates=['overworld','enc_in','encounter','play','esc','base','slipgate','rebuild','dead_ow','dead_enc','dead_site'];
  return !!(G.OW||G.ENC||G.site)&&(activeStates.includes(G.st)||((G.st==='options'||G.st==='controls')&&G.optFrom!=='title'));
}
window.addEventListener('beforeunload',()=>{if(shouldSaveOnUnload())saveGame();});
// Restore audio settings from save, then show title (game starts on PLAY GAME)
{const sv=loadSave();if(sv){G.sfxVol=sv.sfxVol??10;G.musVol=sv.musVol??10;G.dynamicZoom=sv.dynamicZoom??true;G.renderQuality=normalizeRenderQuality(sv.renderQuality);}}
G.seed=TUTORIAL_SEED;genWorld(G.seed);
loop();
