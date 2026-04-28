'use strict';

// AI behavior per enemy type — movement/steering only.
// New behaviors honor `ec.turn` (rotation rate) when provided; legacy entries fall back to hard-coded constants.
const ENEMY_TYPES = {
  interceptor: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.08);
      e.vx+=Math.sin(e.a)*ec.spd*.07;
      e.vy-=Math.cos(e.a)*ec.spd*.07;
    }
  },
  swarmer: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.09);
      e.vx+=(dx/dist)*ec.spd*.05+Math.cos(orb)*ec.spd*.04;
      e.vy+=(dy/dist)*ec.spd*.05+Math.sin(orb)*ec.spd*.04;
    }
  },
  capital: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.04);
      if(dist>140)e.vx+=Math.sin(e.a)*ec.spd*.06;
      else if(dist<80){e.vx-=(dx/dist)*.04;e.vy-=(dy/dist)*.04;}
      e.vy-=Math.cos(e.a)*ec.spd*.04*(dist>100?1:-1);
    }
  },
  destroyer: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.05);
      if(dist>120){e.vx+=Math.sin(e.a)*ec.spd*.06;e.vy-=Math.cos(e.a)*ec.spd*.06;}
      else if(dist<80){e.vx-=(dx/dist)*ec.spd*.04;e.vy-=(dy/dist)*ec.spd*.04;}
      e.vx-=(dy/dist)*ec.spd*.02;e.vy+=(dx/dist)*ec.spd*.02;
    }
  },
  cruiser: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.04);
      if(dist<260){e.vx-=(dx/dist)*ec.spd*.05;e.vy-=(dy/dist)*ec.spd*.05;}
      else if(dist>320){e.vx+=Math.sin(e.a)*ec.spd*.04;e.vy-=Math.cos(e.a)*ec.spd*.04;}
    }
  },
  interceptorShip: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.09);
      if(dist>140){e.vx+=(dx/dist)*ec.spd*.07;e.vy+=(dy/dist)*ec.spd*.07;}
      else{e.vx+=Math.cos(orb)*ec.spd*.07;e.vy+=Math.sin(orb)*ec.spd*.07;}
    }
  },
  fighter: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      // pass: 0 = approach, 1 = blowing past, 2 = turning around
      if(e.pass==null)e.pass=0;
      if(e.pass===0&&dist<60)e.pass=1;
      else if(e.pass===1&&dist>140)e.pass=2;
      else if(e.pass===2&&Math.abs(angDiff(e.a,ta))<.4)e.pass=0;
      const baseTurn=ec.turn??.06;
      e.a+=angDiff(e.a,ta)*baseTurn*(e.pass===1?.2:1);
      e.vx+=Math.sin(e.a)*ec.spd*.08;e.vy-=Math.cos(e.a)*ec.spd*.08;
    }
  },
  drone: {
    update(e, ec, s) {
      const jitter=Math.sin(G.fr*.13+e.spin*8)*.55;
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy)+jitter;
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.12);
      e.vx+=(dx/dist)*ec.spd*.06+Math.cos(orb)*ec.spd*.04;
      e.vy+=(dy/dist)*ec.spd*.06+Math.sin(orb)*ec.spd*.04;
    }
  },
  carrier: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.03);
      if(dist<240){e.vx-=(dx/dist)*ec.spd*.04;e.vy-=(dy/dist)*ec.spd*.04;}
      else if(dist>340){e.vx+=Math.sin(e.a)*ec.spd*.03;e.vy-=Math.cos(e.a)*ec.spd*.03;}
    }
  },
  battleship: {
    update(e, ec, s) {
      const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.03);
      if(dist<280){e.vx-=(dx/dist)*ec.spd*.03;e.vy-=(dy/dist)*ec.spd*.03;}
      else if(dist>360){e.vx+=Math.sin(e.a)*ec.spd*.025;e.vy-=Math.cos(e.a)*ec.spd*.025;}
      // wpnCycle / point defense are stubs; real implementation lands when stats are tuned.
      if(e.wpnCycle==null)e.wpnCycle=0;
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
  },
  // ------- New typed enemy classes (placeholder visuals/stats) -------
  {
    name:'DESTROYER', aiType:'destroyer',
    col:'#ffaa33', col2:'#ff7700',
    owSpd:.9, trigR:62, sc:300, energy:true, spinRate:0,
    enc:{cnt:1, hp:14, spd:1.7, turn:.05, r:13, col:'#ffaa33', col2:'#ff7700',
      fire:{wpn:0, mode:'aim', count:2, spread:.18, offset:16}},
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
    name:'CRUISER', aiType:'cruiser',
    col:'#aaccff', col2:'#5588dd',
    owSpd:.7, trigR:62, sc:280, energy:true, spinRate:0,
    enc:{cnt:1, hp:12, spd:1.2, turn:.04, r:13, col:'#aaccff', col2:'#5588dd',
      fire:{wpn:1, mode:'aim', count:1, spread:0, offset:16}},
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
    name:'INTERCEPTOR', aiType:'interceptorShip',
    col:'#ff66cc', col2:'#aa3399',
    owSpd:1.5, trigR:54, sc:160, energy:false, spinRate:.05,
    enc:{cnt:1, hp:5, spd:1.7, turn:.09, r:9, col:'#ff66cc', col2:'#aa3399',
      fire:{wpn:0, mode:'aim', count:1, spread:0, offset:10}},
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
    name:'FIGHTER', aiType:'fighter',
    col:'#ffdd33', col2:'#ff8800',
    owSpd:2.0, trigR:54, sc:170, energy:false, spinRate:.05,
    enc:{cnt:1, hp:5, spd:2.2, turn:.06, r:9, col:'#ffdd33', col2:'#ff8800',
      fire:{wpn:0, mode:'aim', count:1, spread:0, offset:10}},
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
    name:'DRONE', aiType:'drone',
    col:'#88ffaa', col2:'#22aa55',
    owSpd:1.0, trigR:50, sc:60, energy:false, spinRate:.1,
    enc:{cnt:1, hp:2, spd:1.7, turn:.12, r:7, col:'#88ffaa', col2:'#22aa55',
      fire:{wpn:0, mode:'aim', count:1, spread:0, offset:8}},
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
    name:'CARRIER', aiType:'carrier',
    col:'#ddccaa', col2:'#998866',
    owSpd:.5, trigR:80, sc:600, energy:true, spinRate:0,
    enc:{cnt:1, hp:48, spd:1.2, turn:.03, r:24, col:'#ddccaa', col2:'#998866',
      fire:{wpn:1, mode:'aim', count:1, spread:0, offset:28}},
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
    name:'BATTLESHIP', aiType:'battleship',
    col:'#ff5544', col2:'#aa1100',
    owSpd:.35, trigR:80, sc:1000, energy:true, spinRate:0,
    enc:{cnt:1, hp:80, spd:.8, turn:.03, r:26, col:'#ff5544', col2:'#aa1100',
      fire:{wpn:3, mode:'aim', count:1, spread:0, offset:30}},
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

const TURRET = {
  col: '#f44',
  r: 8,
  update(t, ebu, s) {
    t.a += angDiff(t.a, Math.atan2(s.x-t.x, -(s.y-t.y))) * .04;
    if(--t.timer <= 0) {
      const ewp=WEAPONS[0];
      t.timer = 100 + Math.floor(Math.random()*40-20);
      const ba=t.a;
      ebu.push({x:t.x+Math.sin(ba)*15, y:t.y-Math.cos(ba)*15, vx:Math.sin(ba)*ewp.spd, vy:-Math.cos(ba)*ewp.spd, l:ewp.life*ewp.spd, dmg:ewp.dmg, col:this.col});
      tone(550,.04,'square',.03);
    }
  },
  draw(t) {
    cx.save();cx.translate(t.x,t.y);
    cx.strokeStyle=this.col;cx.shadowColor=this.col;cx.shadowBlur=8;cx.lineWidth=1.5;
    cx.beginPath();cx.arc(0,0,8,0,Math.PI*2);cx.stroke();
    cx.rotate(t.a);cx.beginPath();cx.moveTo(0,-8);cx.lineTo(0,-18);cx.stroke();
    cx.restore();
  }
};

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
  for(const oe of enc.en){if(oe===e||!oe.alive)continue;const od=Math.hypot(e.x-oe.x,e.y-oe.y)||1;const minD=ec.r+OET[oe.t].enc.r;if(od<minD){const nx=(e.x-oe.x)/od,ny=(e.y-oe.y)/od;const push=(minD-od)/minD*.5;e.vx+=nx*push;e.vy+=ny*push;}}
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

// ---- Fleet registry ----
// OET indices used in compositions: 4=DESTROYER, 5=CRUISER, 6=INTERCEPTOR, 7=FIGHTER, 8=DRONE, 9=CARRIER, 10=BATTLESHIP.
// composition.rolls entries: {t, cnt} for fixed counts, {t, min, max} for a range, optional `chance` to gate the roll.
// Behaviors: 'orbit_system' (Hunters drift around the star), 'orbit_post' (anchor to a body), 'triangle' (3-body loop),
// 'route' (2-body shuttle), 'idle' (stationary).
const FLEETS = [
  { id:'HUNTER',  aggroR:600, trigR:24, owSpd:3.0, maxOnOW:3,
    behavior:'orbit_system',
    composition:{ rolls:[
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:4, cnt:1, chance:.33 }
    ]},
    glyph:'hunter' },
  { id:'SWARM',   aggroR:180,  trigR:22, owSpd:2.5, maxOnOW:6,
    behavior:'orbit_post',
    composition:{ rolls:[{ t:8, min:4, max:6 }] },
    glyph:'swarm' },
  { id:'PATROL',  aggroR:360,  trigR:24, owSpd:3.0,  maxOnOW:2,
    behavior:'triangle',
    composition:{ rolls:[
      { t:4, cnt:1 },
      { t:4, cnt:1, chance:.5 },
      { t:5, cnt:1, chance:.2 },
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:8, min:0, max:2 }
    ]},
    glyph:'patrol' },
  { id:'CONVOY',  aggroR:0,    trigR:26, owSpd:2.0,  maxOnOW:2,
    behavior:'route',
    spawnsHunters:{ everyFrames:2400 },
    composition:{ rolls:[
      { t:9, cnt:1 },
      { t:4, cnt:1, chance:.5 },
      { t:5, cnt:1, chance:.3 },
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:8, min:0, max:2 }
    ]},
    glyph:'convoy' },
  { id:'ARMADA',  aggroR:512,  trigR:28, owSpd:1.5,  maxOnOW:1,
    behavior:'orbit_post',
    composition:{ rolls:[
      { t:10, cnt:1, chance:.6 },
      { t:9,  cnt:1, chance:.5 },
      { t:4,  min:1, max:3 },
      { t:5,  min:0, max:2 },
      { t:6,  min:2, max:4 },
      { t:7,  min:1, max:3 },
      { t:8,  min:0, max:3 }
    ]},
    glyph:'armada' }
];
function fleetDef(id){return FLEETS.find(f=>f.id===id);}
function rollFleetComp(id){
  const F=fleetDef(id),out=[];
  for(const r of F.composition.rolls){
    if(r.chance!==undefined&&Math.random()>r.chance)continue;
    const cnt=r.cnt!=null?r.cnt:r.min+Math.floor(Math.random()*(r.max-r.min+1));
    if(cnt>0)out.push({t:r.t,cnt});
  }
  return out;
}
