'use strict';

// ===================== OVERWORLD =====================
function owEnemyPos(t,px,py,minDist=600){
  let x,y,attempts=0;
  do{const a=Math.random()*Math.PI*2,d=480+Math.random()*360;
    x=Math.max(40,Math.min(OW_W-40,OW_W/2+Math.cos(a)*d));
    y=Math.max(40,Math.min(OW_H-40,OW_H/2+Math.sin(a)*d));
    attempts++;
  }while(px!=null&&Math.hypot(x-px,y-py)<minDist&&attempts<30);
  return{t,x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function initOW(energy,sx,sy){
  const bp=owPos(BASE);
  const px=sx??bp.x,py=sy??bp.y;
  G.OW={s:mkShip(px,py),en:[owEnemyPos(0,px,py),owEnemyPos(1,px,py),owEnemyPos(2,px,py),owEnemyPos(3,px,py)],fu:[],pts:[],nearP:-1,nearBase:false,nearAst:-1,wanderTimer:2700,swarmTimer:1800};
  G.OW.s.energy=energy??G.OW.s.maxEnergy;G.OW.s.inv=120;
  G.st='overworld';
}
function owKillShip(){
  const ow=G.OW,s=ow.s;if(!s.alive)return;
  s.alive=false;boomAt(ow.pts,s.x,s.y,'#fff',28);boomAt(ow.pts,s.x,s.y,'#fa0',16);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_ow';saveGame();
  setTimeout(()=>{G.st='rebuild';},1800);
}
function doRebuildFinalize(){
  const bp=owPos(BASE);G.ENC=null;G.site=null;G.bounty=0;
  if(!G.OW){initOW(activeChassisObj().maxEnergy);return;}
  G.OW.s=mkShip(bp.x,bp.y);G.OW.s.inv=180;
  G.OW.en=[owEnemyPos(0,bp.x,bp.y),owEnemyPos(1,bp.x,bp.y),owEnemyPos(2,bp.x,bp.y),owEnemyPos(3,bp.x,bp.y)];
  G.OW.wanderTimer=2700;G.OW.swarmTimer=1800;
  G.st='overworld';saveGame();tone(660,.2,'sine',.08);
}
function jumpToSeed(newSeed,sourceSeed){
  const energy=G.OW.s.energy;
  // Snapshot departing system state.
  G.systemStates[G.seed>>>0]={cleared:[...G.cleared],slipgateActive:G.slipgateActive,hbCleared:G.hbCleared,hbState:G.hbState,lvState:G.lvState};
  G.prevSeed=sourceSeed;
  G.seed=newSeed>>>0;
  // Restore destination state if previously visited, else fresh.
  const prev=G.systemStates[G.seed];
  if(prev){G.cleared=[...prev.cleared];G.slipgateActive=prev.slipgateActive;G.hbCleared=prev.hbCleared;G.hbState=prev.hbState;G.lvState=prev.lvState;}
  else{G.cleared=[false,false,false];G.slipgateActive=false;G.hbCleared=false;G.hbState=null;G.lvState={};}
  G.bounty=0;G.slipMsg=0;
  genWorld(G.seed);
  if(!G.visitedSeeds.includes(G.seed))G.visitedSeeds.push(G.seed);
  const sgp=owPos(SLIPGATE);
  initOW(energy,sgp.x,sgp.y);
  saveGame();
  tone(300,.15,'sine',.07);setTimeout(()=>tone(500,.15,'sine',.07),160);setTimeout(()=>tone(800,.4,'sine',.07),330);
}
function slipNeighborList(){
  const list=genNeighbors(G.seed);
  if(G.prevSeed!=null&&!list.includes(G.prevSeed))list[0]=G.prevSeed;
  return list;
}
function owStartEnc(idx){
  const ow=G.OW,e=ow.en[idx],et=OET[e.t],ec=et.enc;
  const ens=[];
  if(ec.groups){
    const spawns=[];
    for(const grp of ec.groups){
      if(grp.chance!==undefined&&Math.random()>grp.chance)continue;
      spawns.push(grp);
    }
    const total=spawns.reduce((s,g)=>s+g.cnt,0);
    let ei=0;
    for(const sp of spawns){
      const gec=OET[sp.t].enc,initCd=Math.round(WEAPONS[gec.fire.wpn].cd*60);
      for(let i=0;i<sp.cnt;i++){
        const x=total===1?EW-160:EW-200+Math.cos((ei/total)*Math.PI*2)*60;
        const y=total===1?EH/2+(Math.random()*80-40):EH/2+Math.sin((ei/total)*Math.PI*2)*60;
        ens.push(mkEncEnemy(sp.t,x,y,initCd+ei*18));
        ei++;
      }
    }
  } else {
    const initCd=Math.round(WEAPONS[ec.fire.wpn].cd*60);
    if(ec.cnt===1){
      ens.push(mkEncEnemy(e.t,EW-160,EH/2+(Math.random()*80-40),initCd));
    } else {
      for(let i=0;i<ec.cnt;i++){const a=(i/ec.cnt)*Math.PI*2;ens.push(mkEncEnemy(e.t,EW-200+Math.cos(a)*60,EH/2+Math.sin(a)*60,initCd+i*18));}
    }
  }
  const rng=mkRNG(seedChild(G.seed,200+idx));
  const rocks=[];
  let rockCount=0;for(let i=0;i<8;i++)if(rng.fl(0,1)<.25)rockCount++;
  const spawnX=EW*.08,spawnY=EH/2,minSpawnDist=120;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  for(let i=0;i<rockCount;i++){
    let rx,ry,attempts=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);attempts++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&attempts<30);
    const tier=rng.int(0,2);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(EW*.08,EH/2);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  const label=ec.groups?et.name+' ENCOUNTER':(ec.cnt>1?'SWARM ATTACK':et.name+' ENCOUNTER');
  G.ENC={owIdx:idx,et:e.t,label,
    s:encShip,en:ens,rocks,bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2)}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startAstEnc(){
  const ow=G.OW;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  const rocks=[];
  const rockCount=8+Math.floor(Math.random()*13);
  const spawnX=EW*.08,spawnY=EH/2,minSpawnDist=120;
  for(let i=0;i<rockCount;i++){
    let rx,ry,att=0;
    do{rx=60+Math.random()*(EW-120);ry=60+Math.random()*(EH-120);att++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&att<30);
    const tier=Math.floor(Math.random()*3);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:(Math.random()-.5)*1.1,vy:(Math.random()-.5)*1.1,r:td.r[0]+Math.random()*td.r[1],hp:td.hp,maxHp:td.hp,tier});
  }
  const ens=[];
  const saucerEc=OET[0].enc,initCd=Math.round(WEAPONS[saucerEc.fire.wpn].cd*60);
  for(let i=0;i<3;i++){
    if(Math.random()<.35){
      const a=(i/3)*Math.PI*2;
      ens.push(mkEncEnemy(0,EW-200+Math.cos(a)*60,EH/2+Math.sin(a)*60,initCd+i*18));
    }
  }
  const encShip=mkShip(spawnX,spawnY);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  G.ENC={owIdx:null,isAst:true,et:0,label:'ASTEROID FIELD',
    s:encShip,en:ens,rocks,bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:ens.length?70:0,cleared:!ens.length,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2)}};
  G.st=ens.length?'enc_in':'encounter';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startHBaseEnc(){
  const ow=G.OW,ew=EW*2,eh=EH*2,HEX_R=150,hx=ew/2,hy=eh/2;
  const hbs=G.hbState;
  const softpts=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3+Math.PI/6,d=HEX_R*Math.sqrt(3)/2;
    return{x:hx+Math.cos(a)*d,y:hy+Math.sin(a)*d,hp:1,alive:hbs?hbs.softpts[i]:true};
  });
  const initCd=Math.round(WEAPONS[0].cd*60);
  const turrets=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return{x:hx+Math.cos(a)*HEX_R,y:hy+Math.sin(a)*HEX_R,a:a,timer:initCd+i*22,alive:hbs?hbs.turrets[i]:true};
  });
  const hexPoly=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return[hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R];});
  const encShip=mkShip(ew*.08,eh/2);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  G.ENC={owIdx:null,isHBase:true,et:0,label:'HOSTILE BASE',
    s:encShip,en:[],rocks:[],bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew,eh,hbase:{HEX_R,hx,hy,softpts,turrets,hexPoly},
    cam:{x:Math.max(0,hx-W/2),y:Math.max(0,hy-H/2)}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function owEdgePos(t){
  const m=60,edge=Math.floor(Math.random()*4);
  let x,y;
  if(edge===0){x=m+Math.random()*(OW_W-m*2);y=m;}
  else if(edge===1){x=m+Math.random()*(OW_W-m*2);y=OW_H-m;}
  else if(edge===2){x=m;y=m+Math.random()*(OW_H-m*2);}
  else{x=OW_W-m;y=m+Math.random()*(OW_H-m*2);}
  return{t,x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function owHBaseSwarmPos(){
  const hbp=owPos(HBASE);
  const a=Math.random()*Math.PI*2,d=200+Math.random()*150;
  const x=Math.max(40,Math.min(OW_W-40,hbp.x+Math.cos(a)*d));
  const y=Math.max(40,Math.min(OW_H-40,hbp.y+Math.sin(a)*d));
  return{t:1,x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function updOW(){
  G.owFr++;if(G.slipMsg>0)G.slipMsg--;const ow=G.OW;updPts(ow.pts);
  if(--ow.wanderTimer<=0){ow.wanderTimer=2700;ow.en.push(owEdgePos(Math.random()<.5?0:2));}
  if(!G.hbCleared&&--ow.swarmTimer<=0){ow.swarmTimer=1800;ow.en.push(owHBaseSwarmPos());}
  for(let i=ow.fu.length-1;i>=0;i--){const f=ow.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,OW_W);f.y=wrap(f.y+f.vy,OW_H);if(Math.hypot(ow.s.x-f.x,ow.s.y-f.y)<20&&ow.s.alive){pickupEnergy(ow.s,f.x,f.y,ow.pts,'#0f8');ow.fu.splice(i,1);}}
  const s=ow.s;if(!s.alive)return;
  s.a+=iRot()*(s.energy>0?.075:.0375);s.shld=false;
  // sin(angle) = X component, -cos(angle) = Y component: canvas Y increases downward, so "forward" is -cos.
  if(iThr()){const tm=activeChassisObj().thrMul,thr=s.energy>0?.09*tm:.01;s.vx+=Math.sin(s.a)*thr;s.vy-=Math.cos(s.a)*thr;if(s.energy>0)s.energy=Math.max(0,s.energy-.035);}
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  const maxSpd=sdist<220?7:4.2;
  // Normalize velocity vector then scale to maxSpd — the standard way to cap speed without distorting direction.
  const sp=Math.hypot(s.vx,s.vy);if(sp>maxSpd){s.vx=s.vx/sp*maxSpd;s.vy=s.vy/sp*maxSpd;}}
  {const bz=600;
  if(s.x<bz&&s.vx<0)s.vx*=s.x/bz;
  if(s.x>OW_W-bz&&s.vx>0)s.vx*=(OW_W-s.x)/bz;
  if(s.y<bz&&s.vy<0)s.vy*=s.y/bz;
  if(s.y>OW_H-bz&&s.vy>0)s.vy*=(OW_H-s.y)/bz;}
  s.x=Math.max(0,Math.min(OW_W,s.x+s.vx));s.y=Math.max(0,Math.min(OW_H,s.y+s.vy));
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  // Inverse-square gravity well at the star (world center). Force grows rapidly as the ship gets close;
  // flying into the star kills the ship instantly.
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  if(sdist<22){owKillShip();return;}
  s.vx+=sdx*500/(sdist*sdist*sdist);s.vy+=sdy*500/(sdist*sdist*sdist);}
  const bp=owPos(BASE);ow.nearBase=Math.hypot(s.x-bp.x,s.y-bp.y)<BASE.r+28;
  ow.nearP=-1;
  for(let i=0;i<LV.length;i++){if(G.cleared[i])continue;const pp=owPos(PP[i]);if(Math.hypot(s.x-pp.x,s.y-pp.y)<LV[i].pr+28){ow.nearP=i;break;}}
  ow.nearAst=-1;
  for(let ai=0;ai<2;ai++){const ap=owPos(AB[ai]);if(Math.hypot(s.x-ap.x,s.y-ap.y)<AB[ai].r+28){ow.nearAst=ai;break;}}
  ow.nearHBase=false;
  if(!G.hbCleared){const hbp=owPos(HBASE);if(Math.hypot(s.x-hbp.x,s.y-hbp.y)<HBASE.r+28)ow.nearHBase=true;}
  {const sgp=owPos(SLIPGATE);ow.nearSlipgate=Math.hypot(s.x-sgp.x,s.y-sgp.y)<SLIPGATE.r+28;}
  const owFired=iFir();
  if(owFired&&ow.nearBase){G.credits+=G.bounty;G.bounty=0;G.baseSel=0;G.baseTab=0;G.shopSel=0;G.shopActionId=null;G.equipFlow=null;G.baseEnterFr=G.fr;G.st='base';return;}
  if(owFired&&ow.nearP>=0){G.lv=ow.nearP;enterLv();return;}
  if(owFired&&ow.nearAst>=0){startAstEnc();return;}
  if(owFired&&ow.nearHBase){startHBaseEnc();return;}
  if(owFired&&ow.nearSlipgate){G.slipSel=0;G.st='slipgate';return;}
  for(let i=0;i<ow.en.length;i++){
    const e=ow.en[i];if(!e.alive)continue;
    const et=OET[e.t];e.spin+=.04+e.t*.015;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1;
    const ta=Math.atan2(dx,-dy);
    e.a+=angDiff(e.a,ta)*.07;
    e.vx+=Math.sin(e.a)*et.owSpd*.05;e.vy-=Math.cos(e.a)*et.owSpd*.05;
    e.vx*=.970;e.vy*=.970;const es=Math.hypot(e.vx,e.vy);if(es>et.owSpd){e.vx=e.vx/es*et.owSpd;e.vy=e.vy/es*et.owSpd;}
    e.x=wrap(e.x+e.vx,OW_W);e.y=wrap(e.y+e.vy,OW_H);
    if(e.flash>0)e.flash--;
    if(s.inv<=0&&dist<et.trigR){
      if(s.shld){e.vx-=(dx/dist)*3;e.vy-=(dy/dist)*3;e.flash=12;}
      else{owStartEnc(i);return;}
    }
  }
}

function drBase(near){
  const{r}=BASE,{x,y}=owPos(BASE),pu=.5+.5*Math.sin(G.fr*.05);
  cx.save();
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=6+pu*10;cx.lineWidth=1.5;
  cx.beginPath();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;i?cx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):cx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  cx.closePath();cx.stroke();
  cx.lineWidth=1;
  cx.beginPath();cx.moveTo(x-r*1.6,y);cx.lineTo(x-r,y);cx.moveTo(x+r,y);cx.lineTo(x+r*1.6,y);cx.stroke();
  cx.beginPath();cx.moveTo(x,y-r*1.6);cx.lineTo(x,y-r);cx.moveTo(x,y+r);cx.lineTo(x,y+r*1.6);cx.stroke();
  cx.shadowBlur=0;cx.fillStyle='#aaccff';cx.font='bold 10px monospace';cx.textAlign='center';
  cx.fillText('BASE',x,y-r-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText('[ FIRE TO DOCK ]',x,y+r+16);}
  cx.restore();
}
function drSlipgate(near){
  const{x,y}=owPos(SLIPGATE),pu=.5+.5*Math.sin(G.fr*.045);
  const active=G.slipgateActive;
  const col=active?'#cc99ff':'#aa99cc';
  cx.save();
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=(active?10:6)+pu*(active?22:14);cx.lineWidth=2.5;
  cx.beginPath();cx.ellipse(x,y,28,17,0,0,Math.PI*2);cx.stroke();
  cx.lineWidth=1.2;cx.globalAlpha=.55;
  cx.beginPath();cx.ellipse(x,y,20,12,0,0,Math.PI*2);cx.stroke();
  cx.globalAlpha=1;cx.shadowBlur=0;cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';
  cx.fillText('SLIPGATE',x,y-28-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText(active?'[ FIRE TO JUMP ]':'[ FIRE TO ENTER ]',x,y+28+16);}
  cx.restore();
}
function drawSlipgateMenu(){
  drawOW();
  const active=G.slipgateActive;
  const col='#cc99ff',dimCol='#aa99cc';
  cx.save();cx.textAlign='center';
  if(!active){
    const pw=400,ph=200,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=dimCol;cx.shadowColor=dimCol;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=12;cx.fillStyle=dimCol;cx.font='bold 22px monospace';cx.fillText('SLIPGATE',W/2,py+40);
    cx.shadowBlur=0;cx.fillStyle='#8877aa';cx.font='bold 15px monospace';
    cx.fillText('Clear all sectors to activate the slipgate.',W/2,py+112);
    cx.fillStyle='#334';cx.font='11px monospace';cx.fillText('ESC TO LEAVE',W/2,py+ph-14);
  } else if(G.seed===TUTORIAL_SEED&&!G.tutorialDone){
    const pw=400,ph=240,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=12;cx.fillStyle=col;cx.font='bold 22px monospace';cx.fillText('SLIPGATE',W/2,py+40);
    cx.shadowBlur=0;cx.fillStyle='#8877aa';cx.font='12px monospace';
    cx.fillText('Slipspace coordinates are unstable.',W/2,py+76);
    cx.fillText('Destination unknown.',W/2,py+94);
    cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=8;cx.font='bold 14px monospace';
    cx.fillText('▶  JUMP — SLIPSPACE DISTORTION',W/2,py+148);
    cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.fillText('ESC TO LEAVE',W/2,py+ph-14);
  } else {
    const nb=slipNeighborList(),N=nb.length;
    const rowH=30,ph=160+N*rowH,pw=400,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=10;cx.fillStyle=col;cx.font='bold 20px monospace';cx.fillText('SLIPGATE',W/2,py+30);
    cx.shadowBlur=0;cx.fillStyle='#776688';cx.font='11px monospace';
    cx.fillText(N+' NEIGHBORING SYSTEM'+(N===1?'':'S')+' DETECTED',W/2,py+50);
    for(let i=0;i<N;i++){
      const n=nb[i],sel=i===G.slipSel;
      const hexStr=n.toString(16).toUpperCase().padStart(8,'0');
      const tag=(n===G.prevSeed?'  ← BACK':'')+(G.visitedSeeds.includes(n)?'  ★':'');
      cx.fillStyle=sel?col:'#776688';cx.shadowColor=col;cx.shadowBlur=sel?8:0;
      cx.font=sel?'bold 13px monospace':'12px monospace';
      cx.fillText((sel?'▶ ':'  ')+hexStr+tag,W/2,py+80+i*rowH);
    }
    const divY=py+88+N*rowH;
    cx.shadowBlur=0;cx.strokeStyle='#332244';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(px+20,divY);cx.lineTo(px+pw-20,divY);cx.stroke();
    const setSeedSel=G.slipSel===N;
    cx.fillStyle=setSeedSel?col:'#554466';cx.shadowColor=col;cx.shadowBlur=setSeedSel?8:0;
    cx.font=setSeedSel?'bold 13px monospace':'12px monospace';
    cx.fillText((setSeedSel?'▶ ':'  ')+'SET SEED',W/2,divY+22);
    cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.fillText('ESC TO LEAVE',W/2,py+ph-12);
  }
  cx.restore();
}

function drawOW(){
  cx.fillStyle='#000008';cx.fillRect(0,0,W,H);drStars();
  const ow=G.OW,s=ow.s;
  const camX=Math.max(0,Math.min(OW_W-W,s.x-W/2));
  const camY=Math.max(0,Math.min(OW_H-H,s.y-H/2));
  drDust(camX-(ow.pcx??camX),camY-(ow.pcy??camY));ow.pcx=camX;ow.pcy=camY;
  cx.save();cx.translate(-camX,-camY);
  {cx.save();cx.lineWidth=1;cx.globalAlpha=.65;
  const arrowBodies=[['#aaccff',BASE.orbitR,BASE],...PP.map((b,i)=>[LV[i].pcol,b.orbitR,b]),...(G.hbCleared?[]:[[`#ff4444`,HBASE.orbitR,HBASE]]),['#aa99cc',SLIPGATE.orbitR,SLIPGATE]];
  cx.setLineDash([4,2]);
  for(const[col,r]of arrowBodies){
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=6;
    cx.beginPath();cx.arc(OW_W/2,OW_H/2,r,0,Math.PI*2);cx.stroke();
  }
  cx.strokeStyle='#998877';cx.shadowColor='#998877';cx.shadowBlur=6;
  cx.beginPath();cx.arc(OW_W/2,OW_H/2,AB[0].orbitR,0,Math.PI*2);cx.stroke();
  cx.setLineDash([]);
  const arrowSpd=0.00173,N=40,arrowGap=0.2;
  cx.font='14px monospace';cx.textAlign='center';cx.textBaseline='alphabetic';
  const _gm=cx.measureText('❯'),_gOff=(_gm.actualBoundingBoxAscent-_gm.actualBoundingBoxDescent)/2;
  for(const[col,r,b]of arrowBodies){
    const bodyA=b.orbitA+G.owFr*b.orbitSpd;
    cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=8;
    for(let i=0;i<N;i++){
      const phase=(G.fr*arrowSpd+i*Math.PI/N)%Math.PI;
      if(phase<arrowGap)continue;
      const fade=phase>Math.PI*.8?1-(phase-Math.PI*.8)/(Math.PI*.2):1;
      cx.globalAlpha=.49*fade;
      for(const dir of[1,-1]){
        const a=bodyA+Math.PI+dir*phase;
        const ax=OW_W/2+Math.cos(a)*r,ay=OW_H/2+Math.sin(a)*r;
        const rot=Math.atan2(dir*Math.cos(a),-dir*Math.sin(a));
        cx.save();cx.translate(ax,ay);cx.rotate(rot);cx.scale(1,2/3);
        cx.fillText('❯',0,_gOff);
        cx.restore();
      }
    }
    cx.globalAlpha=.49;
  }
  cx.restore();}
  {cx.save();cx.globalAlpha=.6;cx.strokeStyle='#776655';cx.lineWidth=0.8;cx.shadowColor='#554433';cx.shadowBlur=2;
  const abOrbitR=AB[0].orbitR,abSpd=AB[0].orbitSpd;
  for(const p of AB_BELT){
    const a=p.a+G.owFr*abSpd;
    const bx=OW_W/2+Math.cos(a)*(abOrbitR+p.dr),by=OW_H/2+Math.sin(a)*(abOrbitR+p.dr);
    cx.beginPath();
    for(let i=0;i<p.sides;i++){const pa=(i/p.sides)*Math.PI*2+p.rot;i?cx.lineTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv):cx.moveTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv);}
    cx.closePath();cx.stroke();
  }
  cx.restore();}
  {const sx2=OW_W/2,sy2=OW_H/2,SR=40,pu=.5+.5*Math.sin(G.fr*.04);
  cx.save();cx.translate(sx2,sy2);
  // outer glow
  cx.shadowColor='#ffe070';cx.shadowBlur=80+pu*60;
  // limb darkening gradient
  const grad=cx.createRadialGradient(0,0,0,0,0,SR);
  grad.addColorStop(0,'#ffffff');grad.addColorStop(0.5,'#fffbe8');
  grad.addColorStop(0.82,'#ffe87a');grad.addColorStop(1,'#ffcc40');
  cx.fillStyle=grad;cx.beginPath();cx.arc(0,0,SR,0,Math.PI*2);cx.fill();
  cx.shadowBlur=0;
  cx.restore();}
  for(let i=0;i<LV.length;i++){
    const p=owPos(PP[i]),d=LV[i];
    if(G.cleared[i]){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();cx.fillStyle='#223';cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();cx.fillStyle='#446';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('CLEARED',p.x,p.y+3);cx.setLineDash([]);cx.restore();continue;}
    const pu=.5+.5*Math.sin(G.fr*.05+i);cx.save();cx.shadowColor=d.pcol;cx.shadowBlur=8+pu*14;
    cx.strokeStyle=d.pcol;cx.lineWidth=1.5;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();
    cx.fillStyle=d.bg;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();
    cx.strokeStyle=d.col;cx.lineWidth=.8;cx.globalAlpha=.4;
    [[-8,-6,5],[7,4,7],[-4,9,4],[10,-8,3]].forEach(([cx2,cy,r])=>{cx.beginPath();cx.arc(p.x+cx2,p.y+cy,r,0,Math.PI*2);cx.stroke();});
    cx.globalAlpha=1;cx.fillStyle=d.col;cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText(d.name,p.x,p.y-d.pr-8);cx.restore();
    if(ow.nearP===i){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.textAlign='center';cx.fillText('[ FIRE TO ENTER ]',p.x,p.y+d.pr+16);cx.restore();}
  }
  for(let ai=0;ai<2;ai++){const ap=owPos(AB[ai]);
    cx.save();cx.strokeStyle='#998877';cx.shadowColor='#776655';cx.shadowBlur=5;cx.lineWidth=1.2;
    for(const[ox,oy,r2]of[[-14,-9,11],[9,-16,8],[16,6,10],[-9,13,9],[19,-5,7],[1,17,6],[-17,5,8],[8,11,7]]){
      cx.beginPath();
      for(let i=0;i<8;i++){const a2=(i/8)*Math.PI*2,rr=r2*(1+.2*Math.sin(a2*3+r2));
        i?cx.lineTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr):cx.moveTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr);}
      cx.closePath();cx.stroke();}
    cx.fillStyle='#998877';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('ASTEROID FIELD',ap.x,ap.y-40);
    cx.restore();
    if(ow.nearAst===ai){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.textAlign='center';cx.fillText('[ FIRE TO ENTER ]',ap.x,ap.y+44);cx.restore();}}
  {const hbp=owPos(HBASE),HEX_R_OW=20;
  if(G.hbCleared){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.fillStyle='#446';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('CLEARED',hbp.x,hbp.y+3);cx.setLineDash([]);cx.restore();}
  else{const pu=.5+.5*Math.sin(G.fr*.07);cx.save();cx.strokeStyle='#e05109';cx.shadowColor='#e05109';cx.shadowBlur=6+pu*8;cx.lineWidth=1.5;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.shadowBlur=0;cx.fillStyle='#e05109';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('HOSTILE BASE',hbp.x,hbp.y-HEX_R_OW-8);if(ow.nearHBase){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText('[ FIRE TO ENTER ]',hbp.x,hbp.y+HEX_R_OW+16);}cx.restore();}}
  for(const e of ow.en)if(e.alive)OET[e.t].drawOW(e);
  for(const f of ow.fu)drEnergy(f.x,f.y,'#0f8');
  drPts(ow.pts);
  drBase(ow.nearBase);
  drSlipgate(ow.nearSlipgate);
  if(s.alive)drShip(s.x,s.y,s.a,s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),s.energy,s.inv,G.fr);
  cx.restore();
  drHUD(s.energy,s.maxEnergy,s.hp,s.maxHp);
  if(G.slipMsg>0){
    const alpha=Math.min(1,G.slipMsg/40);
    cx.save();cx.globalAlpha=alpha;
    cx.fillStyle='rgba(4,0,12,.82)';cx.fillRect(W/2-200,H/2-32,400,52);
    cx.strokeStyle='#cc99ff';cx.shadowColor='#cc99ff';cx.shadowBlur=14;cx.lineWidth=1;cx.strokeRect(W/2-200,H/2-32,400,52);
    cx.fillStyle='#cc99ff';cx.font='bold 14px monospace';cx.textAlign='center';cx.shadowBlur=10;
    cx.fillText('SLIPGATE ACTIVATED',W/2,H/2-8);
    cx.shadowBlur=0;cx.fillStyle='#9977bb';cx.font='11px monospace';
    cx.fillText('The slipgate is now open. Find it at the outer rim.',W/2,H/2+14);
    cx.restore();
  }
}
