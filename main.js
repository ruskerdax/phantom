'use strict';

var CV=document.getElementById('g'),cx=CV.getContext('2d');
CV.width=W;CV.height=H;

// ===================== MAIN LOOP =====================
function update(){
  pollGP();
  if(G.seedInputOpen)return;
  const st=G.st;
  if(st==='options'){
    const m=menuInput();
    if(m.up)G.optSel=Math.max(0,G.optSel-1);
    if(m.down)G.optSel=Math.min(6,G.optSel+1);
    if(G.optSel===0){
      if(m.left){G.sfxVol=Math.max(0,G.sfxVol-1);tone(900,.04,'square',.05);}
      if(m.right){G.sfxVol=Math.min(10,G.sfxVol+1);tone(900,.04,'square',.05);}
    } else if(G.optSel===1){
      if(m.left)G.musVol=Math.max(0,G.musVol-1);
      if(m.right)G.musVol=Math.min(10,G.musVol+1);
    } else if(G.optSel===2){
      if(m.confirm||m.right){G.ctrlSel=0;G.optCol=0;G.optListen=null;G.st='controls';return;}
    } else if(G.optSel===3){
      if(m.confirm||m.left||m.right){G.cheatMode=!G.cheatMode;tone(G.cheatMode?1200:400,.08,'square',.05);}
    } else if(G.optSel===4){
      if(m.confirm||m.right){showSeedInput(v=>{G.customSeed=v;});}
    } else if(G.optSel===5){
      if(m.confirm||m.left||m.right){
        if(!document.fullscreenElement){document.documentElement.requestFullscreen();}
        else{document.exitFullscreen();}
        tone(G.fullscreen?400:1200,.08,'square',.05);
      }
    } else if(G.optSel===6){
      if(m.confirm){resetSave();G.st=G.optFrom==='title'?'title':'title';G.paused=false;tone(220,.3,'sawtooth',.1);}
    }
    if(m.cancel){G.st=G.optFrom;if(G.optFrom!=='title')G.paused=true;}
    return;
  }
  if(st==='controls'){
    if(G.optListen){
      if(jp('Escape')||GP.startj){G.optListen=null;GP.startj=false;}
      return;
    }
    const m=menuInput();
    const nRows=ACT_DEFS.length+1;
    if(m.up)G.ctrlSel=Math.max(0,G.ctrlSel-1);
    if(m.down)G.ctrlSel=Math.min(nRows-1,G.ctrlSel+1);
    if(m.left)G.optCol=0;
    if(m.right)G.optCol=1;
    if(m.confirm){
      if(G.ctrlSel===ACT_DEFS.length){
        ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});saveBND();
      } else {
        G.optListen=G.optCol===0?'key':'btn';
      }
    }
    if(m.clear&&G.ctrlSel<ACT_DEFS.length){const b=BND[ACT_DEFS[G.ctrlSel].id];if(G.optCol===0)b.key=null;else b.btn=null;saveBND();}
    if(m.cancel){G.st='options';G.optListen=null;}
    return;
  }
  if(st==='title'){
    const m=menuInput();
    if(m.up)G.titleSel=0;
    if(m.down)G.titleSel=1;
    if(m.confirm){ia();if(G.titleSel===0)startFromSave();else{G.optFrom='title';G.st='options';}}
    return;
  }
  if(st==='rebuild'){updRebuild();return;}
  if(st==='over'||st==='done'){if(iEnter()){ia();if(st==='over'){G.st='title';}else{G.bounty=0;G.credits=0;G.cleared=[false,false,false];G.lvState={};G.st='title';}}return;}
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
        if(m.down)G.slipSel=Math.min(nb.length,G.slipSel+1);
      }
      if(m.confirm){
        ia();
        if(isTutFirst){
          if(G.slipSel===1){G.st='overworld';return;}
          G.tutorialDone=true;
          jumpToSeed((Math.random()*0xFFFFFFFF)>>>0,TUTORIAL_SEED);
        } else {
          const nb=slipNeighborList();
          if(G.slipSel<nb.length){jumpToSeed(nb[G.slipSel],G.seed);}
          else{showSeedInput(v=>{if(v!=null)jumpToSeed(v,null);});}
        }
        return;
      }
    }
    if(m.cancel)G.st='overworld';
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
    const m=menuInput();
    if(G.showShipConfig&&m.confirm){G.showShipConfig=false;return;}
    if(G.cheatSub){
      const CITEMS=cheatItems();
      if(m.up)G.cheatSubSel=Math.max(0,G.cheatSubSel-1);
      if(m.down)G.cheatSubSel=Math.min(CITEMS.length-1,G.cheatSubSel+1);
      if(m.confirm){
        if(G.cheatSubSel===0){G.OW.s.hp=G.OW.s.maxHp;G.OW.s.energy=G.OW.s.maxEnergy;if(G.ENC){G.ENC.s.hp=G.ENC.s.maxHp;G.ENC.s.energy=G.ENC.s.maxEnergy;}tone(660,.2,'sine',.08);G.paused=false;G.cheatSub=false;}
        else if(G.cheatSubSel===1){const sgp=owPos(SLIPGATE);G.OW.s.x=sgp.x;G.OW.s.y=sgp.y;G.OW.s.vx=0;G.OW.s.vy=0;if(G.ENC){G.ENC=null;G.site=null;}G.st='overworld';G.paused=false;G.cheatSub=false;}
        else if(G.cheatSubSel===2){showSeedInput(v=>{if(v!=null){G.paused=false;G.cheatSub=false;jumpToSeed(v,null);}});}
        else if(G.cheatSubSel===3){G.cleared=[true,true,true];G.slipgateActive=true;G.slipMsg=360;if(G.ENC){G.ENC=null;G.site=null;}G.st='overworld';G.paused=false;G.cheatSub=false;}
        else if(G.cheatSubSel===4){G.credits+=10000;tone(880,.15,'sine',.07);G.paused=false;G.cheatSub=false;}
        else if(G.cheatSubSel===5){G.credits=0;tone(220,.15,'sawtooth',.07);G.paused=false;G.cheatSub=false;}
        else if(G.cheatSubSel===6){G.invincible=!G.invincible;tone(G.invincible?1200:400,.08,'square',.05);}
        else if(G.cheatSubSel===7){G.cheatSub=false;}
      }
      return;
    }
    const PITEMS=pauseItems();
    if(m.up)G.pauseSel=Math.max(0,G.pauseSel-1);
    if(m.down)G.pauseSel=Math.min(PITEMS.length-1,G.pauseSel+1);
    if(m.confirm){
      if(G.pauseSel===0){G.paused=false;}
      else if(G.pauseSel===1){G.showShipConfig=true;}
      else if(G.pauseSel===2){G.optFrom=st;G.paused=false;G.st='options';}
      else if(G.cheatMode&&G.pauseSel===3){G.cheatSub=true;G.cheatSubSel=0;}
      else if(G.pauseSel===PITEMS.length-1){G.paused=false;G.ENC=null;G.site=null;G.st='title';}
    }
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
  if(st==='options')return drawOptions();
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
function loop(){update();draw();G.fr++;requestAnimationFrame(loop);}
// Restore audio settings from save, then show title (game starts on PLAY GAME)
{const sv=loadSave();if(sv){G.sfxVol=sv.sfxVol??10;G.musVol=sv.musVol??10;}}
G.seed=TUTORIAL_SEED;genWorld(G.seed);
loop();
