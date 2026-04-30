'use strict';

// Enemy type definitions. `id` is the stable spawn/runtime type; `aiType` selects behavior.
// fire.mode: 'aim' = angles spread around target; 'spin' = angles evenly distributed from e.spin.
const ENEMY_IDS = {
  DESTROYER: 'destroyer',
  CRUISER: 'cruiser',
  INTERCEPTOR: 'interceptor',
  FIGHTER: 'fighter',
  DRONE: 'drone',
  CARRIER: 'carrier',
  BATTLESHIP: 'battleship',
};

const DEFAULT_ENEMY_ID = ENEMY_IDS.DESTROYER;

const OET = [
  {
    id: ENEMY_IDS.DESTROYER,
    name:'DESTROYER', aiType:'destroyer',
    col:'#ffaa33', col2:'#ff7700',
    owSpd:.9, trigR:62, sc:300, energy:true, spinRate:0,
    enc:{cnt:1, hp:7, spd:2.5, turn:.05, r:13, col:'#ffaa33', col2:'#ff7700',
      ai:{preferred:150, band:34, strafe:.018},
      fire:{wpn:'mass driver', mode:'aim', count:2, spread:.18, offset:16, minRange:70, maxRange:240, arc:.8}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(Math.cos(a)*12,Math.sin(a)*12):cx.moveTo(Math.cos(a)*12,Math.sin(a)*12);}cx.closePath();cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(Math.cos(a)*ec.r,Math.sin(a)*ec.r):cx.moveTo(Math.cos(a)*ec.r,Math.sin(a)*ec.r);}cx.closePath();cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.CRUISER,
    name:'CRUISER', aiType:'cruiser',
    col:'#aaccff', col2:'#5588dd',
    owSpd:.7, trigR:62, sc:280, energy:true, spinRate:0,
    enc:{cnt:1, hp:12, spd:1.5, turn:.04, r:13, col:'#aaccff', col2:'#5588dd',
      ai:{preferred:330, band:48, strafe:.01},
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:16, minRange:210, maxRange:560, arc:.45}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.strokeRect(-14,-5,28,10);
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.strokeRect(-ec.r,-ec.r*.4,ec.r*2,ec.r*.8);
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.INTERCEPTOR,
    name:'INTERCEPTOR', aiType:'interceptor',
    col:'#ff66cc', col2:'#aa3399',
    owSpd:1.5, trigR:54, sc:160, energy:false, spinRate:.05,
    enc:{cnt:1, hp:2, spd:3.5, turn:.09, r:9, col:'#ff66cc', col2:'#aa3399',
      ai:{orbit:118, approach:150, tangential:.078, radial:.056},
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10, minRange:35, maxRange:180, arc:1.05}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(0,-9);cx.lineTo(-7,6);cx.lineTo(7,6);cx.closePath();cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(0,-ec.r);cx.lineTo(-ec.r*.8,ec.r*.6);cx.lineTo(ec.r*.8,ec.r*.6);cx.closePath();cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.FIGHTER,
    name:'FIGHTER', aiType:'fighter',
    col:'#ffdd33', col2:'#ff8800',
    owSpd:2.0, trigR:54, sc:170, energy:false, spinRate:.05,
    enc:{cnt:1, hp:2, spd:3.5, turn:.06, r:9, col:'#ffdd33', col2:'#ff8800',
      ai:{passRange:58, commitRange:170, flybyRange:125, resetRange:430, reengageRange:330, minExtendFrames:48, lead:.45, attackSpd:5.2, extendSpd:5.7, turnSpd:3.9, attackThrust:.13, extendThrust:.15, turnThrust:.04, avoidRange:210, passClearance:70, avoidThrust:.04},
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10, minRange:20, maxRange:155, arc:1.15, lead:.42, passOnly:true}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(-8,-8);cx.lineTo(8,8);cx.moveTo(-8,8);cx.lineTo(8,-8);cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(-ec.r,-ec.r);cx.lineTo(ec.r,ec.r);cx.moveTo(-ec.r,ec.r);cx.lineTo(ec.r,-ec.r);cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.DRONE,
    name:'DRONE', aiType:'drone',
    col:'#88ffaa', col2:'#22aa55',
    owSpd:1.0, trigR:50, sc:60, energy:false, spinRate:.1,
    enc:{cnt:1, hp:1, spd:2.0, turn:.12, r:7, col:'#88ffaa', col2:'#22aa55',
      ai:{orbit:86, approach:126, tangential:.09, radial:.065, jitter:.55},
      fire:{wpn:'mining laser', mode:'aim', count:1, spread:0, offset:8, minRange:10, maxRange:145, arc:1.45}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=8;cx.lineWidth=1.2;
      cx.beginPath();cx.moveTo(0,-6);cx.lineTo(6,0);cx.lineTo(0,6);cx.lineTo(-6,0);cx.closePath();cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=8;cx.lineWidth=1.2;
      cx.beginPath();cx.moveTo(0,-ec.r);cx.lineTo(ec.r,0);cx.lineTo(0,ec.r);cx.lineTo(-ec.r,0);cx.closePath();cx.stroke();
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-7,ec.r*2,3);cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-7,ec.r*2*(e.hp/e.mhp),3);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.CARRIER,
    name:'CARRIER', aiType:'carrier',
    col:'#ddccaa', col2:'#998866',
    owSpd:.5, trigR:80, sc:600, energy:true, spinRate:0,
    enc:{cnt:1, hp:48, spd:1.8, turn:.03, r:24, col:'#ddccaa', col2:'#998866',
      ai:{preferred:345, band:64, strafe:.006},
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:28, minRange:0, maxRange:260, arc:.85},
      launch:{type:ENEMY_IDS.DRONE, cd:360, maxActive:3, radius:38}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=12;cx.lineWidth=2;
      cx.strokeRect(-22,-8,44,16);
      cx.beginPath();cx.moveTo(-16,-8);cx.lineTo(-16,8);cx.moveTo(0,-8);cx.lineTo(0,8);cx.moveTo(16,-8);cx.lineTo(16,8);cx.stroke();
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=12;cx.lineWidth=2;
      cx.strokeRect(-ec.r,-ec.r*.4,ec.r*2,ec.r*.8);
      cx.beginPath();cx.moveTo(-ec.r*.6,-ec.r*.4);cx.lineTo(-ec.r*.6,ec.r*.4);cx.moveTo(0,-ec.r*.4);cx.lineTo(0,ec.r*.4);cx.moveTo(ec.r*.6,-ec.r*.4);cx.lineTo(ec.r*.6,ec.r*.4);cx.stroke();
      cx.save();cx.rotate(-e.spin);
      cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);
      cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);
      cx.restore();
      cx.restore();
    }
  },
  {
    id: ENEMY_IDS.BATTLESHIP,
    name:'BATTLESHIP', aiType:'battleship',
    col:'#ff5544', col2:'#aa1100',
    owSpd:.35, trigR:80, sc:1000, energy:true, spinRate:0,
    enc:{cnt:1, hp:80, spd:1.4, turn:.03, r:26, col:'#ff5544', col2:'#aa1100',
      ai:{preferred:390, band:70, strafe:.004},
      fire:{wpn:'particle accelerator', mode:'aim', count:1, spread:0, offset:30, minRange:230, maxRange:425, arc:.32}},
    drawOW(e){
      cx.save();cx.translate(e.x,e.y);
      if(e.flash>0)cx.globalAlpha=e.flash%4<2?1:.3;
      cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=14;cx.lineWidth=2;
      cx.strokeRect(-12,-10,24,20);
      cx.strokeRect(-22,-6,10,12);cx.strokeRect(12,-6,10,12);
      cx.globalAlpha=1;cx.restore();
    },
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=14;cx.lineWidth=2;
      cx.strokeRect(-ec.r*.5,-ec.r*.5,ec.r,ec.r);
      cx.strokeRect(-ec.r,-ec.r*.3,ec.r*.4,ec.r*.6);
      cx.strokeRect(ec.r*.6,-ec.r*.3,ec.r*.4,ec.r*.6);
      cx.save();cx.rotate(-e.spin);
      cx.fillStyle='#333';cx.fillRect(-ec.r,-ec.r-8,ec.r*2,4);
      cx.fillStyle=ec.col;cx.fillRect(-ec.r,-ec.r-8,ec.r*2*(e.hp/e.mhp),4);
      cx.restore();
      cx.restore();
    }
  }
];

const ENEMY_MAP = Object.fromEntries(OET.map(e => [e.id, e]));
Object.assign(OET, ENEMY_MAP);

function enemyDef(type) {
  return ENEMY_MAP[type] || (typeof type === 'number' ? OET[type] : null) || ENEMY_MAP[DEFAULT_ENEMY_ID];
}

function enemyTypeIndex(type) {
  return Math.max(0, OET.indexOf(enemyDef(type)));
}
