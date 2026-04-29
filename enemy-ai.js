'use strict';

// AI behavior per enemy type — movement/steering only.
// New behaviors honor `ec.turn` (rotation rate) when provided; legacy entries fall back to hard-coded constants.
const ENEMY_TYPES = {
  interceptor: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.08);
      e.vx+=Math.sin(e.a)*ec.spd*.07;
      e.vy-=Math.cos(e.a)*ec.spd*.07;
    }
  },
  swarmer: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.09);
      e.vx+=(dx/dist)*ec.spd*.05+Math.cos(orb)*ec.spd*.04;
      e.vy+=(dy/dist)*ec.spd*.05+Math.sin(orb)*ec.spd*.04;
    }
  },
  capital: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.04);
      if(dist>140)e.vx+=Math.sin(e.a)*ec.spd*.06;
      else if(dist<80){e.vx-=(dx/dist)*.04;e.vy-=(dy/dist)*.04;}
      e.vy-=Math.cos(e.a)*ec.spd*.04*(dist>100?1:-1);
    }
  },
  destroyer: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.05);
      if(dist>120){e.vx+=Math.sin(e.a)*ec.spd*.06;e.vy-=Math.cos(e.a)*ec.spd*.06;}
      else if(dist<80){e.vx-=(dx/dist)*ec.spd*.04;e.vy-=(dy/dist)*ec.spd*.04;}
      e.vx-=(dy/dist)*ec.spd*.02;e.vy+=(dx/dist)*ec.spd*.02;
    }
  },
  cruiser: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.04);
      if(dist<260){e.vx-=(dx/dist)*ec.spd*.05;e.vy-=(dy/dist)*ec.spd*.05;}
      else if(dist>320){e.vx+=Math.sin(e.a)*ec.spd*.04;e.vy-=Math.cos(e.a)*ec.spd*.04;}
    }
  },
  interceptorShip: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.09);
      if(dist>140){e.vx+=(dx/dist)*ec.spd*.07;e.vy+=(dy/dist)*ec.spd*.07;}
      else{e.vx+=Math.cos(orb)*ec.spd*.07;e.vy+=Math.sin(orb)*ec.spd*.07;}
    }
  },
  fighter: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
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
    update(e, ec, s, ew, eh) {
      const jitter=Math.sin(G.fr*.13+e.spin*8)*.55;
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy)+jitter;
      const orb=ta+Math.PI/2;
      e.a+=angDiff(e.a,ta)*(ec.turn??.12);
      e.vx+=(dx/dist)*ec.spd*.06+Math.cos(orb)*ec.spd*.04;
      e.vy+=(dy/dist)*ec.spd*.06+Math.sin(orb)*ec.spd*.04;
    }
  },
  carrier: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.03);
      if(dist<240){e.vx-=(dx/dist)*ec.spd*.04;e.vy-=(dy/dist)*ec.spd*.04;}
      else if(dist>340){e.vx+=Math.sin(e.a)*ec.spd*.03;e.vy-=Math.cos(e.a)*ec.spd*.03;}
    }
  },
  battleship: {
    update(e, ec, s, ew, eh) {
      const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
      e.a+=angDiff(e.a,ta)*(ec.turn??.03);
      if(dist<280){e.vx-=(dx/dist)*ec.spd*.03;e.vy-=(dy/dist)*ec.spd*.03;}
      else if(dist>360){e.vx+=Math.sin(e.a)*ec.spd*.025;e.vy-=Math.cos(e.a)*ec.spd*.025;}
      // wpnCycle / point defense are stubs; real implementation lands when stats are tuned.
      if(e.wpnCycle==null)e.wpnCycle=0;
    }
  }
};
