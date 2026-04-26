'use strict';

// AI behavior per enemy type — movement/steering only
const ENEMY_TYPES = {
  interceptor: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*.08;
      e.vx+=Math.sin(e.a)*ec.spd*.07;
      e.vy-=Math.cos(e.a)*ec.spd*.07;
    }
  },
  swarmer: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*.09;
      e.vx+=(dx/dist)*ec.spd*.05+Math.cos(orb)*ec.spd*.04;
      e.vy+=(dy/dist)*ec.spd*.05+Math.sin(orb)*ec.spd*.04;
    }
  },
  capital: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*.04;
      if(dist>140)e.vx+=Math.sin(e.a)*ec.spd*.06;
      else if(dist<80){e.vx-=(dx/dist)*.04;e.vy-=(dy/dist)*.04;}
      e.vy-=Math.cos(e.a)*ec.spd*.04*(dist>100?1:-1);
    }
  }
};

// Enemy class definitions
// fire.mode: 'aim' = angles spread around target; 'spin' = angles evenly distributed from e.spin
const OET = [
  {
    name:'SAUCER', aiType:'interceptor',
    col:'#ff4444', col2:'#ff9900',
    owSpd:1.4, trigR:58, sc:150, energy:false, spinRate:.05,
    enc:{cnt:1, hp:6, spd:2.2, r:13, col:'#ff4444', col2:'#ff9900',
      fire:{wpn:1, mode:'aim', count:1, spread:0, offset:14},
      groups:[{t:0,cnt:1},{t:0,cnt:2,chance:.33},{t:1,cnt:3,chance:.33}]},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.ellipse(0,2,16,6,0,0,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc(0,-1,8,Math.PI,0);cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.ellipse(0,2,13,5,0,0,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc(0,-1,7,Math.PI,0);cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    name:'SWARM', aiType:'swarmer',
    col:'#00ddff', col2:'#cc00ff',
    owSpd:.95, trigR:54, sc:80, energy:false, spinRate:.07,
    enc:{cnt:5, hp:3, spd:2.8, r:9, col:'#00ddff', col2:'#cc00ff',
      fire:{wpn:0, mode:'spin', count:3, offset:10}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      for(let k=0;k<3;k++){const a=e.spin+k*Math.PI*2/3;cx.beginPath();cx.arc(Math.cos(a)*9,Math.sin(a)*9,5,0,Math.PI*2);cx.stroke();}
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(0,-ec.r);cx.lineTo(-ec.r*.86,ec.r*.5);cx.lineTo(ec.r*.86,ec.r*.5);cx.closePath();cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    name:'DREADNOUGHT', aiType:'capital',
    col:'#ffee00', col2:'#ff6600',
    owSpd:.55, trigR:68, sc:350, energy:true, spinRate:0,
    enc:{cnt:1, hp:18, spd:.75, r:20, col:'#ffee00', col2:'#ff6600',
      fire:{wpn:0, mode:'aim', count:3, spread:.2, offset:22}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=12;cx.lineWidth=2;
      cx.rotate(e.a);
      cx.beginPath();cx.moveTo(0,-20);cx.lineTo(-14,8);cx.lineTo(-8,14);cx.lineTo(0,10);cx.lineTo(8,14);cx.lineTo(14,8);cx.closePath();cx.stroke();
      cx.beginPath();cx.moveTo(-14,8);cx.lineTo(-20,0);cx.moveTo(14,8);cx.lineTo(20,0);cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.save();cx.rotate(e.a);
      cx.beginPath();cx.moveTo(0,-ec.r);cx.lineTo(-ec.r*.7,ec.r*.4);cx.lineTo(-ec.r*.4,ec.r*.7);cx.lineTo(0,ec.r*.5);cx.lineTo(ec.r*.4,ec.r*.7);cx.lineTo(ec.r*.7,ec.r*.4);cx.closePath();cx.stroke();
      cx.beginPath();cx.moveTo(-ec.r*.7,ec.r*.4);cx.lineTo(-ec.r,0);cx.moveTo(ec.r*.7,ec.r*.4);cx.lineTo(ec.r,0);cx.stroke();
      cx.restore();
      cx.save();cx.rotate(-e.spin);
      cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);
      cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);
      cx.restore();
      cx.restore();
    }
  },
  {
    name:'FIEND', aiType:'interceptor',
    col:'#39ff14', col2:'#aaff00',
    owSpd:1.4, trigR:58, sc:200, energy:false, spinRate:.05,
    enc:{cnt:1, hp:6, spd:2.2, r:13, col:'#39ff14', col2:'#aaff00',
      fire:{wpn:2, offset:14},
      groups:[{t:3,cnt:1},{t:3,cnt:2,chance:.33},{t:1,cnt:3,chance:.33}]},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.ellipse(0,2,16,6,0,0,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc(0,-1,8,Math.PI,0);cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.ellipse(0,2,13,5,0,0,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc(0,-1,7,Math.PI,0);cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  }
];

function mkEncEnemy(type, x, y, timer) {
  const ec=OET[type].enc;
  return {x, y, vx:0, vy:0, a:Math.PI, hp:ec.hp, mhp:ec.hp, timer, alive:true, t:type, spin:0, pulsesLeft:0, pulseTimer:0};
}

// Returns true if the player ship was killed (caller should return from updEnc).
function enemyUpdate(e, s, enc, ew, eh) {
  const ecDef=OET[e.t],ec=ecDef.enc;
  e.spin+=ecDef.spinRate;
  ENEMY_TYPES[ecDef.aiType].update(e, ec, s);
  e.vx*=.975;e.vy*=.975;const es=Math.hypot(e.vx,e.vy);if(es>ec.spd){e.vx=e.vx/es*ec.spd;e.vy=e.vy/es*ec.spd;}
  e.x=wrap(e.x+e.vx,ew);e.y=wrap(e.y+e.vy,eh);
  for(const rk of enc.rocks){const rd=Math.hypot(e.x-rk.x,e.y-rk.y);if(rd<rk.r+16){e.vx+=(e.x-rk.x)/rd*.3;e.vy+=(e.y-rk.y)/rd*.3;}}
  const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
  const fw=ec.fire,ewp=WEAPONS[fw.wpn];
  if(ewp.wpnType==='beam gun'&&e.pulsesLeft>0&&--e.pulseTimer<=0){
    const ox=e.x+Math.sin(e.a)*fw.offset,oy=e.y-Math.cos(e.a)*fw.offset;
    const res=castLaser(ox,oy,e.a,ewp.range,[{x:s.x,y:s.y,r:12}]);
    enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:ec.col});
    tone(550+e.t*80,.08,'sine',.04);
    if(res.hitIdx>=0&&!s.shld&&!G.invincible){s.hp=Math.max(0,s.hp-ewp.dmg);tone(380,.08,'square',.08);if(s.hp<=0){encKillShip();return true;}}
    e.pulsesLeft--;
    if(e.pulsesLeft>0)e.pulseTimer=ewp.pulseCd;else e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);
  } else if(e.pulsesLeft===0&&--e.timer<=0){
    if(ewp.wpnType==='beam gun'){e.pulsesLeft=ewp.pulses;e.pulseTimer=1;}
    else{
      e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);
      const bas=fw.mode==='spin'?Array.from({length:fw.count},(_,k)=>e.spin+k*Math.PI*2/fw.count):Array.from({length:fw.count},(_,k)=>ta+(k-(fw.count-1)/2)*fw.spread);
      for(const ba of bas)enc.ebu.push({x:e.x+Math.sin(ba)*fw.offset,y:e.y-Math.cos(ba)*fw.offset,vx:Math.sin(ba)*ewp.spd,vy:-Math.cos(ba)*ewp.spd,l:ewp.life*ewp.spd,dmg:ewp.dmg,col:ecDef.col});
      tone(550+e.t*80,.04,'square',.03);
    }
  }
  if(Math.hypot(e.x-s.x,e.y-s.y)<ec.r+9){
    e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;
  }
  return false;
}
