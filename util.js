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
function normalizeRenderQuality(v){return RENDER_QUALITY_VALUES.includes(v)?v:'full';}
function renderQuality(){return normalizeRenderQuality(typeof G!=='undefined'?G.renderQuality:null);}
function renderQualityLabel(v){return RENDER_QUALITY_LABELS[normalizeRenderQuality(v)]||RENDER_QUALITY_LABELS.full;}
