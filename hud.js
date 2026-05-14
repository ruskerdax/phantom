'use strict';

// ===================== HUD =====================
// Centralizes player HUD overlays and off-screen tactical indicators (chevrons and miniatures).
//
// Indicator targets accept these fields:
//   x, y          - world position
//   r             - target radius (used for on-screen visibility test and chevron scale)
//   col           - color used by chevron / energy renderer; ignored by drawMini
//   alive         - false skips the target
//   kind          - 'energy' uses the energy-pickup glyph; other values reserved for future kinds
//   maxRange      - visibility cap (overrides opts.maxRange); undefined = unlimited
//   rampRange     - distance over which mini scale/alpha ramps from min to max;
//                   falls back to maxRange, opts.maxRange, then HUD_MINI_DEFAULT_RAMP
//   drawMini(sx, sy, scale, alpha)
//                 - optional callback; when present, the indicator renders as a miniature glyph
//                   at the edge of the viewport instead of a chevron. Scale/alpha ramp from
//                   HUD_MINI_SCALE_MIN/ALPHA_MIN (far) to HUD_MINI_SCALE_MAX/ALPHA_MAX (just out of view).
//
const HUD_MINI_SCALE_MIN = 0.10;
const HUD_MINI_SCALE_MAX = 0.75;
const HUD_MINI_ALPHA_MIN = 0.10;
const HUD_MINI_ALPHA_MAX = 0.75;
const HUD_MINI_DEFAULT_RAMP = 1200;

function indicatorProjection(opts,t){
  const cam=opts.cam||{x:0,y:0,z:1},z=cam.z||1,p=opts.player;
  let wx=t.x,wy=t.y,dx=t.x-p.x,dy=t.y-p.y;
  if(opts.toroidal){
    const viewW=W/z,viewH=H/z;
    const vp=toroidalPointNear(p.x,p.y,cam.x+viewW*.5,cam.y+viewH*.5,opts.worldW,opts.worldH);
    const wt=toroidalPointNear(t.x,t.y,vp.x,vp.y,opts.worldW,opts.worldH);
    wx=wt.x;wy=wt.y;dx=wx-vp.x;dy=wy-vp.y;
  }else if(opts.wrapX){
    const viewW=W/z,centerX=cam.x+viewW*.5;
    const px=wrapCoordNear(p.x,centerX,opts.worldW);
    wx=wrapCoordNear(t.x,centerX,opts.worldW);
    dx=wx-px;
  }
  const dist=Math.hypot(dx,dy);
  const effMaxRange = t.maxRange!=null ? t.maxRange : opts.maxRange;
  if((effMaxRange!=null&&dist>effMaxRange)||dist<=0)return null;
  const r=(t.r||0)*z,sx=(wx-cam.x)*z,sy=(wy-cam.y)*z;
  if(sx+r>=0&&sx-r<=W&&sy+r>=0&&sy-r<=H)return null;
  const psx=((opts.toroidal||opts.wrapX?wx-dx:p.x)-cam.x)*z,psy=((opts.toroidal?wy-dy:p.y)-cam.y)*z;
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
    const rampRange = t.rampRange!=null ? t.rampRange
                    : (t.maxRange!=null ? t.maxRange
                    : (opts.maxRange!=null ? opts.maxRange : HUD_MINI_DEFAULT_RAMP));
    out.push({
      x:p.x, y:p.y, edge:p.edge, a:Math.atan2(dy,dx),
      col:t.col||'#f44', kind:t.kind,
      scale:Math.max(.85,Math.min(1.35,(t.r||12)/13)),
      dist:pr.dist, rampRange,
      mini:t.drawMini||null,
    });
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
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=sb(q==='minimal'?0:q==='reduced'?4:8);
  cx.lineWidth=1.7;cx.lineCap='round';cx.lineJoin='round';
  cx.beginPath();
  cx.moveTo(x-ux*size*.75+px*size*.55,y-uy*size*.75+py*size*.55);
  cx.lineTo(x+ux*size*.75,y+uy*size*.75);
  cx.lineTo(x-ux*size*.75-px*size*.55,y-uy*size*.75-py*size*.55);
  cx.stroke();
  cx.restore();
}
function drawEnergyPickupIndicator(x,y,col,alpha=.5){
  cx.save();
  cx.globalAlpha=alpha;
  drEnergy(x,y,col);
  cx.restore();
}
function miniIndicatorRamp(it){
  const ramp=it.rampRange>0?it.rampRange:HUD_MINI_DEFAULT_RAMP;
  return Math.max(0,Math.min(1,1-it.dist/ramp));
}
function drawMiniIndicator(it){
  const t=miniIndicatorRamp(it);
  const scale=HUD_MINI_SCALE_MIN+(HUD_MINI_SCALE_MAX-HUD_MINI_SCALE_MIN)*t;
  const alpha=HUD_MINI_ALPHA_MIN+(HUD_MINI_ALPHA_MAX-HUD_MINI_ALPHA_MIN)*t;
  it.mini(it.x,it.y,scale,alpha);
}
function drawOffscreenIndicators(indicators,opts={}){
  if(!indicators?.length)return;
  const inset=opts.inset??22,gap=opts.gap??18;
  const miniItems=[],chevronGroups={left:[],right:[],top:[],bottom:[]};
  for(const it of indicators){
    if(it.mini)miniItems.push(it);
    else chevronGroups[it.edge]?.push({...it});
  }
  for(const it of miniItems)drawMiniIndicator(it);
  const pulse=.78+.22*Math.sin(G.fr*.12);
  for(const edge of Object.keys(chevronGroups)){
    const g=chevronGroups[edge];if(!g.length)continue;
    spaceIndicatorGroup(g,inset,gap);
    for(const it of g){
      if(it.kind==='energy')drawEnergyPickupIndicator(it.x,it.y,it.col,.5);
      else drawIndicatorChevron(it.x,it.y,it.a,it.col,it.scale,pulse*(opts.alpha??.86));
    }
  }
}

function drWalletStake(x=8,y=18){
  cx.save();
  cx.font='13px MajorMonoDisplay, monospace';
  cx.fillStyle='#aaffcc';
  cx.shadowBlur=0;
  cx.textAlign='left';
  cx.fillText('credits '+G.credits,x,y);
  cx.fillText('stake '+G.stake,x,y+16);
  cx.restore();
}
function ammoHUD(s, x, y) {
  if(!s || G.st === 'overworld') return;
  const bt=themeBarTokens();
  cx.save();
  cx.font='12px MajorMonoDisplay, monospace';
  cx.textAlign='right';
  cx.shadowBlur=0;
  const full='▮', empty='▯';
  let shown=0;
  for(let slot=0;slot<2;slot++){
    const wp=wpSlot(slot);
    if(!weaponHasAmmo(wp)) continue;
    const ammo=currentAmmoForSlot(s, slot);
    if(ammo === null || ammo >= wp.ammoMax) continue;
    const rowY=y + shown * 27;
    const ratio=wp.ammoMax>0?Math.max(0,Math.min(1,ammo/wp.ammoMax)):0;
    const filled=Math.floor(ratio*8);
    let bar='';
    for(let i=0;i<8;i++)bar+=i<filled?full:empty;
    cx.fillStyle='#aaffcc';
    cx.fillText(`${wp.name} ${ammo}/${wp.ammoMax}`, x, rowY);
    cx.fillStyle=ammo>wp.ammoMax*.2?bt.fillActive:bt.danger;
    cx.fillText(bar, x, rowY+13);
    shown++;
  }
  cx.restore();
}
function drHUD(energy,maxEnergy=100,hp=15,maxHp=15,ship=null){
  drWalletStake();
  const bt=themeBarTokens();
  cx.save();cx.font='13px MajorMonoDisplay, monospace';cx.fillStyle='#aaffcc';cx.shadowBlur=0;
  cx.textAlign='center';cx.fillText('',W/2,18);
  cx.textAlign='right';
  const hf=Math.max(0,hp/maxHp);
  cx.fillText('hp '+hp,W-88,17);
  cx.strokeStyle='#aaffcc';cx.lineWidth=1;cx.strokeRect(W-82,6,70,11);
  cx.fillStyle=hf>.5?bt.fillActive:hf>.25?bt.warn:bt.danger;cx.fillRect(W-81,7,hf*68,9);
  cx.fillStyle='#aaffcc';cx.fillText('energy',W-88,32);
  cx.strokeRect(W-82,21,70,11);
  cx.fillStyle=energy>maxEnergy*.2?bt.fillActive:bt.danger;cx.fillRect(W-81,22,energy/maxEnergy*68,9);
  cx.restore();
  ammoHUD(ship, W-12, 47);
}
