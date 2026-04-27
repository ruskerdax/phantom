'use strict';

// Static starfield
const STARS=(()=>{const a=[];for(let i=0;i<220;i++)a.push({x:Math.random()*W,y:Math.random()*H,r:.3+Math.random()*1.4,ph:Math.random()*Math.PI*2,ci:i%5});return a;})();
const SCOLS=['#ffffff','#aaaaff','#ffeebb','#aaffee','#ffaaaa'];
// Motion dust — screen-space parallax particles, drift opposite player velocity
const DUST=(()=>{const a=[];for(let i=0;i<140;i++)a.push({x:Math.random()*W,y:Math.random()*H,r:.4+Math.random()*1.6,depth:.15+Math.random()*.7});return a;})();

function drStars(scroll=0){
  cx.save();
  for(const s of STARS){cx.globalAlpha=.5+.3*Math.sin(s.ph+G.fr*.015);cx.fillStyle=SCOLS[s.ci];cx.beginPath();cx.arc((s.x+scroll)%W,s.y,s.r,0,Math.PI*2);cx.fill();}
  cx.globalAlpha=1;cx.restore();
}
function drDust(vx,vy){
  const spd=Math.sqrt(vx*vx+vy*vy);if(spd>6){const s=6/spd;vx*=s;vy*=s;}
  cx.save();
  for(const d of DUST){
    d.x=((d.x-vx*d.depth)%W+W)%W;
    d.y=((d.y-vy*d.depth)%H+H)%H;
    cx.globalAlpha=.12+d.depth*.2;
    const streak=spd*d.depth;
    if(streak>1){
      // draw a short streak in the direction the dust appears to trail
      cx.strokeStyle='#cce4ff';cx.lineWidth=d.r*.9;cx.lineCap='round';
      cx.beginPath();cx.moveTo(d.x,d.y);cx.lineTo(d.x+vx*d.depth*2.5,d.y+vy*d.depth*2.5);cx.stroke();
    } else {
      cx.fillStyle='#cce4ff';
      cx.beginPath();cx.arc(d.x,d.y,d.r,0,Math.PI*2);cx.fill();
    }
  }
  cx.globalAlpha=1;cx.restore();
}
function drPts(pts){for(const p of pts){cx.save();cx.globalAlpha=Math.max(0,p.l/p.ml);cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,1.5,0,Math.PI*2);cx.fill();cx.restore();}}
// Ship is a triangle in local space (tip at y=-10, pointing up), then translate() moves the canvas origin to
// the ship's world position and rotate() spins the local axes to face angle a. Invincibility blinks by
// skipping alternate 2-frame windows (fr%4 >= 2).
function drShip(x,y,a,shld,thr,energy,inv,fr){
  if(inv>0&&fr%4>=2)return;
  cx.save();cx.translate(x,y);cx.rotate(a);
  if(shld){cx.strokeStyle='rgba(100,200,255,.8)';cx.shadowColor='#8cf';cx.shadowBlur=18;cx.lineWidth=2;cx.beginPath();cx.arc(0,0,17,0,Math.PI*2);cx.stroke();}
  cx.strokeStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=8;cx.lineWidth=1.5;
  cx.beginPath();cx.moveTo(0,-10);cx.lineTo(-7,8);cx.lineTo(0,4);cx.lineTo(7,8);cx.closePath();cx.stroke();
  if(thr&&energy>0&&!shld){cx.strokeStyle='#fb0';cx.shadowColor='#fb0';cx.shadowBlur=12;cx.beginPath();cx.moveTo(-3,7);cx.lineTo(0,13+Math.random()*6);cx.lineTo(3,7);cx.stroke();}
  else if(thr&&energy<=0){cx.strokeStyle='#f22';cx.shadowColor='#f22';cx.shadowBlur=6;cx.beginPath();cx.moveTo(-1.5,7);cx.lineTo(0,9+Math.random()*2);cx.lineTo(1.5,7);cx.stroke();}
  cx.restore();
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
function drGPI(){cx.save();cx.textAlign='right';cx.font='11px monospace';if(GP.connected){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6;cx.fillText('CTRL: '+GP.id.slice(0,22),W-6,H-8);}else{cx.fillStyle='#444';cx.shadowBlur=0;cx.fillText('NO CONTROLLER',W-6,H-8);}cx.restore();}
function drHUD(energy,maxEnergy=100,hp=15,maxHp=15){
  cx.save();cx.font='13px monospace';cx.fillStyle='#aaffcc';cx.shadowBlur=0;
  cx.textAlign='left';cx.fillText('STAKE '+G.stake,8,18);
  cx.textAlign='center';cx.fillText('',W/2,18);
  cx.textAlign='right';
  const hf=Math.max(0,hp/maxHp);
  cx.fillText('HP '+hp,W-88,17);
  cx.strokeStyle='#aaffcc';cx.lineWidth=1;cx.strokeRect(W-82,6,70,11);
  cx.fillStyle=hf>.5?'#0f8':hf>.25?'#fa0':'#f40';cx.fillRect(W-81,7,hf*68,9);
  cx.fillStyle='#aaffcc';cx.fillText('ENERGY',W-88,32);
  cx.strokeRect(W-82,21,70,11);
  cx.fillStyle=energy>maxEnergy*.2?'#0f8':'#f40';cx.fillRect(W-81,22,energy/maxEnergy*68,9);
  cx.restore();drGPI();
}
function drBullet(x,y,col='#fff'){cx.save();cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=6;cx.beginPath();cx.arc(x,y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
function scanlines(){cx.save();cx.globalAlpha=.035;cx.fillStyle='#000';for(let y=0;y<H;y+=2)cx.fillRect(0,y,W,1);cx.restore();}
