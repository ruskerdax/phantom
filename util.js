'use strict';

const W=800,H=580;
const EW=Math.round(W*3.9),EH=Math.round(W*3.9);
const OW_W=Math.round(W*5),OW_H=Math.round(W*5);
const RENDER_QUALITY_VALUES=['full','reduced','minimal'];
const RENDER_QUALITY_LABELS={full:'FULL',reduced:'REDUCED',minimal:'MINIMAL'};

function dseg(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
function pip(px,py,p){let r=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if((yi>py)!=(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)r=!r;}return r;}
function wrap(v,m){return((v%m)+m)%m;}
function wrapDelta(ax,ay,bx,by,ew,eh){let dx=ax-bx,dy=ay-by;if(Math.abs(dx)>ew/2)dx-=Math.sign(dx)*ew;if(Math.abs(dy)>eh/2)dy-=Math.sign(dy)*eh;return{dx,dy};}
function wrapCoordNear(v,ref,m){let d=v-ref;d-=Math.round(d/m)*m;return ref+d;}
function toroidalPointNear(x,y,refX,refY,ew,eh){return{x:wrapCoordNear(x,refX,ew),y:wrapCoordNear(y,refY,eh)};}
function toroidalDistance(ax,ay,bx,by,ew,eh){return Math.hypot(wrapCoordNear(ax,bx,ew)-bx,wrapCoordNear(ay,by,eh)-by);}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}
function flightAngle(o,fallback=o?.a??0,minSpeed=.05){const vx=Number.isFinite(o?.vx)?o.vx:0,vy=Number.isFinite(o?.vy)?o.vy:0;return Math.hypot(vx,vy)>minSpeed?Math.atan2(vx,-vy):fallback;}
function combatFacingAngle(o,fallback=o?.spin??0){return Number.isFinite(o?.a)?o.a:fallback;}
function segParam(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(!l2)return 0;return Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));}
function segHitParam(ax,ay,bx,by,cx2,cy2,dx2,dy2){
  const rX=bx-ax,rY=by-ay,sX=dx2-cx2,sY=dy2-cy2,den=rX*sY-rY*sX;
  if(Math.abs(den)<1e-9)return null;
  const qx=cx2-ax,qy=cy2-ay,t=(qx*sY-qy*sX)/den,u=(qx*rY-qy*rX)/den;
  return t>=0&&t<=1&&u>=0&&u<=1?t:null;
}
function segSegDistance(ax,ay,bx,by,cx2,cy2,dx2,dy2){
  const ux=bx-ax,uy=by-ay,vx=dx2-cx2,vy=dy2-cy2,wx=ax-cx2,wy=ay-cy2;
  const a=ux*ux+uy*uy,b=ux*vx+uy*vy,c=vx*vx+vy*vy,d=ux*wx,e=vx*wx,D=a*c-b*b;
  if(a<1e-9&&c<1e-9)return{dist:Math.hypot(ax-cx2,ay-cy2),s:0,t:0};
  if(a<1e-9){const t=segParam(ax,ay,cx2,cy2,dx2,dy2),qx=cx2+(dx2-cx2)*t,qy=cy2+(dy2-cy2)*t;return{dist:Math.hypot(ax-qx,ay-qy),s:0,t};}
  if(c<1e-9){const s=segParam(cx2,cy2,ax,ay,bx,by),qx=ax+(bx-ax)*s,qy=ay+(by-ay)*s;return{dist:Math.hypot(cx2-qx,cy2-qy),s,t:0};}
  let sN,sD=D,tN,tD=D;
  if(D<1e-9){sN=0;sD=1;tN=e;tD=c;}
  else{sN=b*e-c*d;tN=a*e-b*d;if(sN<0){sN=0;tN=e;tD=c;}else if(sN>sD){sN=sD;tN=e+b;tD=c;}}
  if(tN<0){tN=0;if(-d<0)sN=0;else if(-d>a)sN=sD;else{sN=-d;sD=a;}}
  else if(tN>tD){tN=tD;if((-d+b)<0)sN=0;else if((-d+b)>a)sN=sD;else{sN=(-d+b);sD=a;}}
  const sc=Math.abs(sN)<1e-9?0:sN/sD,tc=Math.abs(tN)<1e-9?0:tN/tD;
  const qx=wx+sc*ux-tc*vx,qy=wy+sc*uy-tc*vy;
  return{dist:Math.hypot(qx,qy),s:sc,t:tc};
}
function validActorScale(scale,fallback=1){
  return Number.isFinite(scale)&&scale>0?Math.max(.0001,scale):fallback;
}
function actorScale(actor=null,def=null,hull=null){
  return validActorScale(actor?.scale,validActorScale(def?.scale,validActorScale(def?.enc?.scale,validActorScale(hull?.scale,1))));
}
function setActorScale(actor,scale){
  if(!actor)return 1;
  actor.scale=validActorScale(scale,1);
  return actor.scale;
}
function growActor(actor,mult){
  if(!actor)return 1;
  actor.scale=validActorScale((actor.scale??1)*mult,actor.scale??1);
  return actor.scale;
}
function withActorBodyScale(actor,def,hull,drawFn){
  const scale=actorScale(actor,def,hull);
  if(scale!==1){cx.save();cx.scale(scale,scale);drawFn(scale);cx.restore();}
  else drawFn(scale);
  return scale;
}
function hullScale(hull){return Math.max(.0001,hull?.scale??1);}
function hullLocalPoint(hull,px,py){
  const s=hullScale(hull),dx=px-hull.x,dy=py-hull.y,c=Math.cos(hull.a||0),sn=Math.sin(hull.a||0);
  return{x:(dx*c+dy*sn)/s,y:(-dx*sn+dy*c)/s};
}
function hullLocalPart(part){
  if(part.kind==='rect')return{kind:'poly',pts:[[part.x-part.w/2,part.y-part.h/2],[part.x+part.w/2,part.y-part.h/2],[part.x+part.w/2,part.y+part.h/2],[part.x-part.w/2,part.y+part.h/2]]};
  return part;
}
function pointInHullPart(x,y,part,pad=0){
  part=hullLocalPart(part);
  if(part.kind==='circle')return Math.hypot(x-(part.x||0),y-(part.y||0))<=(part.r||0)+pad;
  if(part.kind==='ellipse'){const rx=(part.rx||0)+pad,ry=(part.ry||0)+pad,dx=x-(part.x||0),dy=y-(part.y||0);return rx>0&&ry>0&&(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1;}
  if(part.kind==='capsule')return dseg(x,y,part.x1,part.y1,part.x2,part.y2)<=(part.r||0)+pad;
  if(part.kind==='poly'){
    if(pip(x,y,part.pts))return true;
    if(pad>0){for(let i=0;i<part.pts.length;i++){const a=part.pts[i],b=part.pts[(i+1)%part.pts.length];if(dseg(x,y,a[0],a[1],b[0],b[1])<=pad)return true;}}
  }
  return false;
}
function circleHitsHullPart(x,y,r,part){
  part=hullLocalPart(part);
  if(pointInHullPart(x,y,part,r))return true;
  if(part.kind==='poly'){
    for(let i=0;i<part.pts.length;i++){const a=part.pts[i],b=part.pts[(i+1)%part.pts.length];if(dseg(x,y,a[0],a[1],b[0],b[1])<=r)return true;}
  }
  return false;
}
function circleSegHitFrac(cx2,cy2,r,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,fx=ax-cx2,fy=ay-cy2,a=dx*dx+dy*dy,b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r,disc=b*b-4*a*c;
  if(a<=1e-9||disc<0)return null;
  const q=Math.sqrt(disc),t1=(-b-q)/(2*a),t2=(-b+q)/(2*a);
  if(t1>=0&&t1<=1)return t1;
  if(t2>=0&&t2<=1)return t2;
  return null;
}
function ellipseSegHitFrac(part,ax,ay,bx,by,pad=0){
  const rx=(part.rx||0)+pad,ry=(part.ry||0)+pad,cx2=part.x||0,cy2=part.y||0;
  if(rx<=0||ry<=0)return null;
  return circleSegHitFrac(0,0,1,(ax-cx2)/rx,(ay-cy2)/ry,(bx-cx2)/rx,(by-cy2)/ry);
}
function hullPartSegHitFrac(part,ax,ay,bx,by,pad=0){
  part=hullLocalPart(part);
  if(pointInHullPart(ax,ay,part,pad))return 0;
  if(part.kind==='circle')return circleSegHitFrac(part.x||0,part.y||0,(part.r||0)+pad,ax,ay,bx,by);
  if(part.kind==='ellipse')return ellipseSegHitFrac(part,ax,ay,bx,by,pad);
  if(part.kind==='capsule'){
    const t1=circleSegHitFrac(part.x1,part.y1,(part.r||0)+pad,ax,ay,bx,by),t2=circleSegHitFrac(part.x2,part.y2,(part.r||0)+pad,ax,ay,bx,by);
    let best=t1==null?t2:t2==null?t1:Math.min(t1,t2);
    const ss=segSegDistance(ax,ay,bx,by,part.x1,part.y1,part.x2,part.y2);
    if(ss.dist<=(part.r||0)+pad)best=best==null?ss.s:Math.min(best,ss.s);
    return best;
  }
  if(part.kind==='poly'){
    let best=null;
    for(let i=0;i<part.pts.length;i++){
      const p=part.pts[i],q=part.pts[(i+1)%part.pts.length],t=segHitParam(ax,ay,bx,by,p[0],p[1],q[0],q[1]);
      if(t!=null)best=best==null?t:Math.min(best,t);
      if(pad>0){const ss=segSegDistance(ax,ay,bx,by,p[0],p[1],q[0],q[1]);if(ss.dist<=pad)best=best==null?ss.s:Math.min(best,ss.s);}
    }
    return best;
  }
  return null;
}
function hullPointHit(hull,px,py,pad=0){
  const p=hullLocalPoint(hull,px,py),parts=hull.parts||[];
  for(const part of parts)if(pointInHullPart(p.x,p.y,part,pad/hullScale(hull)))return true;
  return false;
}
function hullCircleHit(hull,cx2,cy2,r){
  const p=hullLocalPoint(hull,cx2,cy2),rs=r/hullScale(hull),parts=hull.parts||[];
  for(const part of parts)if(circleHitsHullPart(p.x,p.y,rs,part))return true;
  return false;
}
function hullSegmentHit(hull,x1,y1,x2,y2,pad=0){
  const a=hullLocalPoint(hull,x1,y1),b=hullLocalPoint(hull,x2,y2),ps=pad/hullScale(hull),parts=hull.parts||[];
  let best=null;
  for(const part of parts){const t=hullPartSegHitFrac(part,a.x,a.y,b.x,b.y,ps);if(t!=null)best=best==null?t:Math.min(best,t);}
  if(best==null)return{hit:false,t:Infinity};
  return{hit:true,t:Math.hypot(x2-x1,y2-y1)*best};
}
function drawHullPart(part){
  part=hullLocalPart(part);
  if(part.kind==='circle'){cx.beginPath();cx.arc(part.x||0,part.y||0,part.r||0,0,Math.PI*2);cx.stroke();return;}
  if(part.kind==='ellipse'){cx.beginPath();cx.ellipse(part.x||0,part.y||0,part.rx||0,part.ry||0,0,0,Math.PI*2);cx.stroke();return;}
  if(part.kind==='capsule'){
    const oldCap=cx.lineCap,oldWidth=cx.lineWidth;
    cx.lineCap='round';cx.lineWidth=(part.r||1)*2;cx.beginPath();cx.moveTo(part.x1,part.y1);cx.lineTo(part.x2,part.y2);cx.stroke();cx.lineCap=oldCap;cx.lineWidth=oldWidth;return;
  }
  if(part.kind==='poly'){cx.beginPath();for(let i=0;i<part.pts.length;i++){const p=part.pts[i];i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);}cx.closePath();cx.stroke();}
}
function drawHullParts(hull){for(const part of hull.parts||[])drawHullPart(part);}
function normalizeRenderQuality(v){return RENDER_QUALITY_VALUES.includes(v)?v:'full';}
function renderQuality(){return normalizeRenderQuality(typeof G!=='undefined'?G.renderQuality:null);}
function renderQualityLabel(v){return RENDER_QUALITY_LABELS[normalizeRenderQuality(v)]||RENDER_QUALITY_LABELS.full;}
