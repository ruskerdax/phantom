'use strict';

// Enemy class definitions
// fire.mode: 'aim' = angles spread around target; 'spin' = angles evenly distributed from e.spin
const OET = [
  {
    name:'SAUCER', aiType:'interceptor',
    col:'#ff4444', col2:'#ff9900',
    owSpd:1.4, trigR:58, sc:150, energy:false, spinRate:.05,
    enc:{cnt:1, hp:6, spd:2.2, r:13, col:'#ff4444', col2:'#ff9900',
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:14},
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
      fire:{wpn:'mass driver', mode:'spin', count:3, offset:10}},
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
      fire:{wpn:'mass driver', mode:'aim', count:3, spread:.2, offset:22}},
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
      fire:{wpn:'pulse laser', offset:14},
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
      fire:{wpn:'mass driver', mode:'aim', count:2, spread:.18, offset:16}},
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
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:16}},
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
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10}},
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
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10}},
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
    enc:{cnt:1, hp:1, spd:1.7, turn:.12, r:7, col:'#88ffaa', col2:'#22aa55',
      fire:{wpn:'mining laser', mode:'aim', count:1, spread:0, offset:8}},
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
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:28}},
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
      fire:{wpn:'particle accelerator', mode:'aim', count:1, spread:0, offset:30}},
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
