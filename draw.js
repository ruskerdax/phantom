'use strict';

// Static starfield, regenerated from the current system seed.
let STARS=[],DUST=[];
const SCOLS=['#ffffff','#aaaaff','#ffeebb','#aaffee','#ffaaaa'];
const RENDER_PROFILES={
  full:{starCount:220,twinkleCount:72,dustCount:140,scanlines:true,scanlineAlpha:.035,particleAlphaStep:0},
  reduced:{starCount:130,twinkleCount:28,dustCount:80,scanlines:true,scanlineAlpha:.022,particleAlphaStep:.12},
  minimal:{starCount:70,twinkleCount:0,dustCount:40,scanlines:false,scanlineAlpha:0,particleAlphaStep:.18},
};
const STAR_LAYERS={},SCANLINE_LAYERS={};

function renderProfile(){return RENDER_PROFILES[renderQuality()]||RENDER_PROFILES.full;}
function mkLayer(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function clearStarLayers(){for(const k in STAR_LAYERS)delete STAR_LAYERS[k];}
function genBackground(seed){
  seed=seed>>>0;
  clearStarLayers();
  const sr=mkRNG(seedChild(seed,0x5100)),dr=mkRNG(seedChild(seed,0x5101));
  STARS=[];for(let i=0;i<220;i++)STARS.push({x:sr.fl(0,W),y:sr.fl(0,H),r:sr.fl(.3,1.7),ph:sr.fl(0,Math.PI*2),ci:sr.int(0,SCOLS.length-1)});
  DUST=[];for(let i=0;i<140;i++)DUST.push({x:dr.fl(0,W),y:dr.fl(0,H),r:dr.fl(.4,2.0),depth:dr.fl(.15,.85)});
}
function getStarLayer(){
  const q=renderQuality(),p=renderProfile();
  if(STAR_LAYERS[q])return STAR_LAYERS[q];
  const c=mkLayer(),g=c.getContext('2d');
  for(let i=0;i<p.starCount&&i<STARS.length;i++){
    const s=STARS[i];
    g.globalAlpha=i<p.twinkleCount?.24:.62;g.fillStyle=SCOLS[s.ci];
    g.beginPath();g.arc(s.x,s.y,s.r,0,Math.PI*2);g.fill();
  }
  g.globalAlpha=1;STAR_LAYERS[q]=c;return c;
}
function getScanlineLayer(){
  const q=renderQuality(),p=renderProfile();
  if(!p.scanlines)return null;
  if(SCANLINE_LAYERS[q])return SCANLINE_LAYERS[q];
  const c=mkLayer(),g=c.getContext('2d');
  g.globalAlpha=p.scanlineAlpha;g.fillStyle='#000';
  for(let y=0;y<H;y+=2)g.fillRect(0,y,W,1);
  g.globalAlpha=1;SCANLINE_LAYERS[q]=c;return c;
}
// Motion dust - screen-space parallax particles, drift opposite player velocity
genBackground(0);

function dynZoomOn(){return G.dynamicZoom!==false;}
function cameraZoomTarget(mode,s){
  if(!dynZoomOn())return 1;
  const sp=Math.hypot(s?.vx||0,s?.vy||0);
  if(mode==='overworld')return Math.max(.82,1.02-Math.min(1,sp/7)*.20);
  if(mode==='site')return Math.max(.92,1-Math.min(1,sp/5.5)*.08);
  return 1;
}
function encounterZoomTarget(enc){
  if(!dynZoomOn())return 1;
  const s=enc?.s;if(!s)return 1;
  const tor=enc&&!enc.isHBase&&!enc.cleared;
  let far=0,alive=0;
  for(const e of enc.en||[]){
    if(!e.alive)continue;
    alive++;
    far=Math.max(far,tor?toroidalDistance(e.x,e.y,s.x,s.y,enc.ew,enc.eh):Math.hypot(e.x-s.x,e.y-s.y));
  }
  if(enc.isHBase){
    for(const t of enc.hbase?.turrets||[]){
      if(!t.alive)continue;
      alive++;
      far=Math.max(far,Math.hypot(t.x-s.x,t.y-s.y));
    }
    for(const sp of enc.hbase?.softpts||[]){
      if(!sp.alive)continue;
      alive++;
      far=Math.max(far,Math.hypot(sp.x-s.x,sp.y-s.y));
    }
  }
  if(alive===0)return .98;
  const distT=Math.max(0,Math.min(1,(far-220)/900));
  const countT=Math.max(0,Math.min(1,(alive-1)/5));
  return Math.max(.50,Math.min(1.08,1.08-distT*.62-countT*.12));
}
function updateWorldCamera(cam,fx,fy,worldW,worldH,targetZ=1,ax=.5,ay=.5,smooth=.12){
  if(!cam)cam={x:0,y:0,z:1};
  if(!Number.isFinite(cam.z)||cam.z<=0)cam.z=1;
  if(smooth>=1)cam.z=targetZ;else cam.z+=(targetZ-cam.z)*smooth;
  const viewW=W/cam.z,viewH=H/cam.z;
  const minX=worldW>viewW?0:(worldW-viewW)/2,maxX=worldW>viewW?worldW-viewW:minX;
  const minY=worldH>viewH?0:(worldH-viewH)/2,maxY=worldH>viewH?worldH-viewH:minY;
  const tx=Math.max(minX,Math.min(maxX,fx-viewW*ax));
  const ty=Math.max(minY,Math.min(maxY,fy-viewH*ay));
  if(smooth>=1){cam.x=tx;cam.y=ty;}
  else{cam.x+=(tx-cam.x)*smooth;cam.y+=(ty-cam.y)*smooth;}
  return cam;
}
function updateToroidalWorldCamera(cam,fx,fy,worldW,worldH,targetZ=1,ax=.5,ay=.5,smooth=.12){
  if(!cam)cam={x:fx-W*.5,y:fy-H*.5,z:1};
  if(!Number.isFinite(cam.z)||cam.z<=0)cam.z=1;
  if(smooth>=1)cam.z=targetZ;else cam.z+=(targetZ-cam.z)*smooth;
  const viewW=W/cam.z,viewH=H/cam.z;
  const refX=(Number.isFinite(cam.x)?cam.x:fx-viewW*ax)+viewW*ax;
  const refY=(Number.isFinite(cam.y)?cam.y:fy-viewH*ay)+viewH*ay;
  const tx=wrapCoordNear(fx,refX,worldW)-viewW*ax;
  const ty=wrapCoordNear(fy,refY,worldH)-viewH*ay;
  if(smooth>=1){cam.x=tx;cam.y=ty;}
  else{cam.x+=(tx-cam.x)*smooth;cam.y+=(ty-cam.y)*smooth;}
  return cam;
}
function drawToroidalCopies(x,y,r,worldW,worldH,cam,fn){
  const z=cam?.z||1,left=cam.x,top=cam.y,right=cam.x+W/z,bottom=cam.y+H/z;
  const kx0=Math.ceil((left-r-x)/worldW),kx1=Math.floor((right+r-x)/worldW);
  const ky0=Math.ceil((top-r-y)/worldH),ky1=Math.floor((bottom+r-y)/worldH);
  for(let kx=kx0;kx<=kx1;kx++)for(let ky=ky0;ky<=ky1;ky++)fn(x+kx*worldW,y+ky*worldH,kx,ky);
}
function drawToroidalSegmentCopies(x1,y1,x2,y2,pad,worldW,worldH,cam,fn){
  const z=cam?.z||1,left=cam.x,top=cam.y,right=cam.x+W/z,bottom=cam.y+H/z;
  const minX=Math.min(x1,x2),maxX=Math.max(x1,x2),minY=Math.min(y1,y2),maxY=Math.max(y1,y2);
  const kx0=Math.ceil((left-pad-maxX)/worldW),kx1=Math.floor((right+pad-minX)/worldW);
  const ky0=Math.ceil((top-pad-maxY)/worldH),ky1=Math.floor((bottom+pad-minY)/worldH);
  for(let kx=kx0;kx<=kx1;kx++)for(let ky=ky0;ky<=ky1;ky++){
    const ox=kx*worldW,oy=ky*worldH;
    fn(x1+ox,y1+oy,x2+ox,y2+oy,kx,ky);
  }
}
function applyWorldCamera(cam){
  const z=cam?.z||1;
  cx.scale(z,z);cx.translate(-(cam?.x||0),-(cam?.y||0));
}
function indicatorProjection(opts,t){
  const cam=opts.cam||{x:0,y:0,z:1},z=cam.z||1,p=opts.player;
  let wx=t.x,wy=t.y,dx=t.x-p.x,dy=t.y-p.y;
  if(opts.toroidal){
    const viewW=W/z,viewH=H/z;
    const vp=toroidalPointNear(p.x,p.y,cam.x+viewW*.5,cam.y+viewH*.5,opts.worldW,opts.worldH);
    const wt=toroidalPointNear(t.x,t.y,vp.x,vp.y,opts.worldW,opts.worldH);
    wx=wt.x;wy=wt.y;dx=wx-vp.x;dy=wy-vp.y;
  }
  const dist=Math.hypot(dx,dy);
  if((opts.maxRange!=null&&dist>opts.maxRange)||dist<=0)return null;
  const r=(t.r||0)*z,sx=(wx-cam.x)*z,sy=(wy-cam.y)*z;
  if(sx+r>=0&&sx-r<=W&&sy+r>=0&&sy-r<=H)return null;
  const psx=((opts.toroidal?wx-dx:p.x)-cam.x)*z,psy=((opts.toroidal?wy-dy:p.y)-cam.y)*z;
  return{sx,sy,psx,psy,dist};
}
function indicatorEdgePoint(ox,oy,dx,dy,inset){
  ox=Math.max(inset,Math.min(W-inset,ox));
  oy=Math.max(inset,Math.min(H-inset,oy));
  let best=Infinity,edge='right';
  if(dx>0){const t=(W-inset-ox)/dx;if(t>=0&&t<best){best=t;edge='right';}}
  else if(dx<0){const t=(inset-ox)/dx;if(t>=0&&t<best){best=t;edge='left';}}
  if(dy>0){const t=(H-inset-oy)/dy;if(t>=0&&t<best){best=t;edge='bottom';}}
  else if(dy<0){const t=(inset-oy)/dy;if(t>=0&&t<best){best=t;edge='top';}}
  if(!Number.isFinite(best))best=0;
  return{x:Math.max(inset,Math.min(W-inset,ox+dx*best)),y:Math.max(inset,Math.min(H-inset,oy+dy*best)),edge};
}
function collectOffscreenIndicators(opts){
  const out=[],inset=opts?.inset??22;
  if(!opts?.player||!opts?.cam||!opts?.targets)return out;
  for(const t of opts.targets){
    if(t.alive===false)continue;
    const pr=indicatorProjection(opts,t);if(!pr)continue;
    const dx=pr.sx-pr.psx,dy=pr.sy-pr.psy,len=Math.hypot(dx,dy);
    if(len<=0)continue;
    const p=indicatorEdgePoint(pr.psx,pr.psy,dx,dy,inset);
    out.push({x:p.x,y:p.y,edge:p.edge,a:Math.atan2(dy,dx),col:t.col||'#f44',scale:Math.max(.85,Math.min(1.35,(t.r||12)/13)),dist:pr.dist});
  }
  return out;
}
function spaceIndicatorGroup(g,inset,gap){
  const vertical=g[0]?.edge==='left'||g[0]?.edge==='right';
  const key=vertical?'y':'x',min=inset,max=(vertical?H:W)-inset;
  g.sort((a,b)=>a[key]-b[key]);
  for(let i=1;i<g.length;i++)if(g[i][key]-g[i-1][key]<gap)g[i][key]=g[i-1][key]+gap;
  const over=g.length?g[g.length-1][key]-max:0;
  if(over>0)for(const it of g)it[key]-=over;
  for(let i=0;i<g.length;i++)g[i][key]=Math.max(min,Math.min(max,i?Math.max(g[i][key],g[i-1][key]+gap):g[i][key]));
}
function drawIndicatorChevron(x,y,a,col,scale=1,alpha=1){
  const size=10*scale,ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux;
  const q=renderQuality();
  cx.save();
  cx.globalAlpha=alpha;
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=q==='minimal'?0:q==='reduced'?4:8;
  cx.lineWidth=1.7;cx.lineCap='round';cx.lineJoin='round';
  cx.beginPath();
  cx.moveTo(x-ux*size*.75+px*size*.55,y-uy*size*.75+py*size*.55);
  cx.lineTo(x+ux*size*.75,y+uy*size*.75);
  cx.lineTo(x-ux*size*.75-px*size*.55,y-uy*size*.75-py*size*.55);
  cx.stroke();
  cx.restore();
}
function drawOffscreenIndicators(indicators,opts={}){
  if(!indicators?.length)return;
  const inset=opts.inset??22,gap=opts.gap??18;
  const groups={left:[],right:[],top:[],bottom:[]};
  for(const it of indicators)groups[it.edge]?.push({...it});
  const pulse=.78+.22*Math.sin(G.fr*.12);
  for(const edge of Object.keys(groups)){
    const g=groups[edge];if(!g.length)continue;
    spaceIndicatorGroup(g,inset,gap);
    for(const it of g)drawIndicatorChevron(it.x,it.y,it.a,it.col,it.scale,pulse*(opts.alpha??.86));
  }
}

function drStars(scroll=0){
  const layer=getStarLayer(),p=renderProfile();
  const dx=((scroll%W)+W)%W;
  if(dx===0)cx.drawImage(layer,0,0);
  else{cx.drawImage(layer,dx,0);cx.drawImage(layer,dx-W,0);}
  for(let i=0;i<p.twinkleCount&&i<STARS.length;i++){
    const s=STARS[i],x=(s.x+scroll)%W;
    const phase=s.ph+G.fr*(.018+s.ci*.002);
    const tw=.5-.5*Math.cos(phase);
    const eased=tw*tw*(3-2*tw);
    cx.globalAlpha=.03+eased*.92;
    cx.fillStyle=SCOLS[s.ci];
    cx.beginPath();cx.arc(x<0?x+W:x,s.y,s.r+eased*.45,0,Math.PI*2);cx.fill();
  }
  cx.globalAlpha=1;
}
function drDust(vx,vy){
  const spd=Math.sqrt(vx*vx+vy*vy);if(spd>6){const s=6/spd;vx*=s;vy*=s;}
  const p=renderProfile(),n=Math.min(p.dustCount,DUST.length);
  if(n<=0)return;
  cx.strokeStyle='#cce4ff';cx.fillStyle='#cce4ff';cx.lineCap='round';
  for(let i=0;i<n;i++){
    const d=DUST[i];
    d.x=((d.x-vx*d.depth)%W+W)%W;
    d.y=((d.y-vy*d.depth)%H+H)%H;
    cx.globalAlpha=.12+d.depth*.2;
    const streak=spd*d.depth;
    if(streak>1){
      // draw a short streak in the direction the dust appears to trail
      cx.lineWidth=d.r*.9;
      cx.beginPath();cx.moveTo(d.x,d.y);cx.lineTo(d.x+vx*d.depth*2.5,d.y+vy*d.depth*2.5);cx.stroke();
    } else {
      cx.beginPath();cx.arc(d.x,d.y,d.r,0,Math.PI*2);cx.fill();
    }
  }
  cx.globalAlpha=1;
}
function drPts(pts){
  const step=renderProfile().particleAlphaStep;
  for(const p of pts){
    let a=Math.max(0,p.l/p.ml);
    if(step>0)a=Math.ceil(a/step)*step;
    cx.globalAlpha=a;cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,1.5,0,Math.PI*2);cx.fill();
  }
  cx.globalAlpha=1;
}
// Ship is a triangle in local space (tip at y=-10, pointing up), then translate() moves the canvas origin to
// the ship's world position and rotate() spins the local axes to face angle a. Invincibility blinks by
// skipping alternate 2-frame windows (fr%4 >= 2).
function drShip(x,y,a,ship,thr,energy,inv,fr){
  if(inv>0&&fr%4>=2)return;
  const thrust=typeof thr==='object'&&thr?thr:{forward:!!thr};
  const def=shieldDefForShip(ship);
  const shieldMax=ship?.shieldMaxHp||def?.hp||0;
  const shieldFrac=def&&ship?.shieldId&&shieldMax>0?Math.max(0,Math.min(1,(ship.shieldHp||0)/shieldMax)):1;
  const showShieldBar=def&&ship?.shieldId&&shieldFrac<1;
  cx.save();cx.translate(x,y);cx.rotate(a);
  const shieldFlash=Math.max(0,Math.min(1,(ship?.shieldFlash||0)/SHIELD_FLASH_FRAMES));
  const shieldActive=ship?.shieldId&&ship.shieldEnabled!==false&&!ship.shieldOffline&&ship.shieldHp>0;
  const shieldVisible=def&&ship?.shieldId&&(shieldActive||shieldFlash>0);
  if(shieldVisible){
    const shieldR=shipShieldHitRadius(ship,def);
    const half=(def.coverageDeg*Math.PI/180)/2;
    const flashEase=shieldFlash*shieldFlash;
    cx.strokeStyle=`rgba(130,220,255,${.34+.56*flashEase})`;cx.shadowColor='#9df';cx.shadowBlur=7+18*flashEase;cx.lineWidth=1+2*flashEase;cx.beginPath();
    if((def.coverageDeg??360)>=359.9)cx.arc(0,0,shieldR,0,Math.PI*2);
    else cx.arc(0,0,shieldR,-Math.PI/2-half,-Math.PI/2+half);
    cx.stroke();
  }
  cx.strokeStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=8;cx.lineWidth=1.5;
  cx.beginPath();cx.moveTo(0,-10);cx.lineTo(-7,8);cx.lineTo(0,4);cx.lineTo(7,8);cx.closePath();cx.stroke();
  const lit=energy>0,col=lit?'#fb0':'#f22',glow=lit?12:6,main=lit?6:2,side=lit?4:1.5;
  function flame(x1,y1,x2,y2,x3,y3,blur=glow){
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=blur;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.lineTo(x3,y3);cx.stroke();
  }
  if(thrust.forward)flame(-3,7,0,13+Math.random()*main,3,7);
  if(thrust.reverse)flame(-2,-8,0,-12-Math.random()*side,2,-8,lit?8:4);
  if(thrust.strafeLeft)flame(7,-2,11+Math.random()*side,0,7,2,lit?8:4);
  if(thrust.strafeRight)flame(-7,-2,-11-Math.random()*side,0,-7,2,lit?8:4);
  cx.restore();
  if(showShieldBar){
    const bw=26,bh=4,by=y-22;
    cx.save();
    cx.shadowBlur=0;
    cx.fillStyle='#123';
    cx.fillRect(x-bw*.5,by,bw,bh);
    cx.fillStyle=ship.shieldEnabled===false?'#557':'#6cf';
    cx.fillRect(x-bw*.5,by,bw*shieldFrac,bh);
    cx.restore();
  }
}
// All distances are in pixels from the ship center.
const CONE={innerR:30,outerR:350,half:15*Math.PI/180,gap:3,dot:1,col:'#ffb060',alpha:0.3,alphaRot:0.5};
function drAimCone(s){
  const c=CONE,a=s.a;
  cx.save();
  cx.globalAlpha=iRot()!==0?c.alphaRot:c.alpha;
  cx.strokeStyle=c.col;
  cx.lineWidth=c.dot*2;
  cx.lineCap='round';
  cx.setLineDash([0,c.gap]);
  cx.lineDashOffset=-c.dot;
  for(const da of[-c.half,0,c.half]){
    const dx=Math.sin(a+da),dy=-Math.cos(a+da);
    cx.beginPath();cx.moveTo(s.x+dx*c.innerR,s.y+dy*c.innerR);cx.lineTo(s.x+dx*c.outerR,s.y+dy*c.outerR);cx.stroke();
  }
  cx.restore();
}
function drEnergy(x,y,col){cx.save();cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x,y-9);cx.lineTo(x+7,y);cx.lineTo(x,y+9);cx.lineTo(x-7,y);cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 9px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText('🗲',x,y+3.5);cx.restore();}
function drGPI(x=W-6,y=H-8,align='right'){cx.save();cx.textAlign=align;cx.font='11px monospace';if(GP.connected){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6;cx.fillText('CTRL: '+GP.id.slice(0,22),x,y);}else{cx.fillStyle='#444';cx.shadowBlur=0;cx.fillText('NO CONTROLLER',x,y);}cx.restore();}
function drWalletStake(x=8,y=18){
  cx.save();
  cx.font='13px monospace';
  cx.fillStyle='#aaffcc';
  cx.shadowBlur=0;
  cx.textAlign='left';
  cx.fillText('CREDITS '+G.credits,x,y);
  cx.fillText('STAKE '+G.stake,x,y+16);
  cx.restore();
}
function drHUD(energy,maxEnergy=100,hp=15,maxHp=15,ship=null){
  drWalletStake();
  cx.save();cx.font='13px monospace';cx.fillStyle='#aaffcc';cx.shadowBlur=0;
  cx.textAlign='center';cx.fillText('',W/2,18);
  cx.textAlign='right';
  const hf=Math.max(0,hp/maxHp);
  cx.fillText('HP '+hp,W-88,17);
  cx.strokeStyle='#aaffcc';cx.lineWidth=1;cx.strokeRect(W-82,6,70,11);
  cx.fillStyle=hf>.5?'#0f8':hf>.25?'#fa0':'#f40';cx.fillRect(W-81,7,hf*68,9);
  cx.fillStyle='#aaffcc';cx.fillText('ENERGY',W-88,32);
  cx.strokeRect(W-82,21,70,11);
  cx.fillStyle=energy>maxEnergy*.2?'#0f8':'#f40';cx.fillRect(W-81,22,energy/maxEnergy*68,9);
  cx.restore();
}
function drBullet(x,y,col='#fff'){cx.save();cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=6;cx.beginPath();cx.arc(x,y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
function drMissile(x,y,a,type='standard'){
  const md=MISSILE_TYPES[type]||MISSILE_TYPES['standard'];
  cx.save();cx.translate(x,y);cx.rotate(a);
  // exhaust glow at tail
  cx.fillStyle='#ff8';cx.shadowColor='#fa0';cx.shadowBlur=8;
  cx.beginPath();cx.arc(0,md.length*0.5+1.5+Math.random()*0.6,1.6,0,Math.PI*2);cx.fill();
  // body
  cx.fillStyle=md.col;cx.shadowColor=md.col;cx.shadowBlur=4;
  cx.fillRect(-md.width*0.5,-md.length*0.5,md.width,md.length);
  // nose triangle
  cx.beginPath();
  cx.moveTo(0,-md.length*0.5-md.width);
  cx.lineTo(-md.width*0.5,-md.length*0.5);
  cx.lineTo( md.width*0.5,-md.length*0.5);
  cx.closePath();cx.fill();
  // fin
  cx.shadowBlur=0;cx.fillStyle=md.fin||'#888';
  cx.fillRect(-md.width*0.9,md.length*0.3,md.width*1.8,1.2);
  cx.restore();
}
function scanlines(){const layer=getScanlineLayer();if(layer)cx.drawImage(layer,0,0);}
