'use strict';

const W=800,H=580;
const EW=Math.round(W*2.6),EH=Math.round(W*2.6);
const OW_W=Math.round(W*5),OW_H=Math.round(W*5);

function dseg(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
function pip(px,py,p){let r=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];if((yi>py)!=(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)r=!r;}return r;}
function wrap(v,m){return((v%m)+m)%m;}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}
