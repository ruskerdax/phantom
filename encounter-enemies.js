'use strict';

function mkEncEnemy(type, x, y, timer) {
  const ec=OET[type].enc;
  return {x, y, vx:0, vy:0, a:Math.PI, hp:ec.hp, mhp:ec.hp, timer, alive:true, t:type, spin:0, pulsesLeft:0, pulseTimer:0, misLeft:0, misTimer:0};
}

// Returns true if the player ship was killed (caller should return from updEnc).
function enemyUpdate(e, s, enc, ew, eh) {
  const ecDef=OET[e.t],ec=ecDef.enc;
  const tor=encToroidalActive(enc);
  e.spin+=ecDef.spinRate;
  ENEMY_TYPES[ecDef.aiType].update(e, ec, s, ew, eh);
  e.vx*=.975;e.vy*=.975;const es=Math.hypot(e.vx,e.vy);if(es>ec.spd){e.vx=e.vx/es*ec.spd;e.vy=e.vy/es*ec.spd;}
  e.x=wrap(e.x+e.vx,ew);e.y=wrap(e.y+e.vy,eh);
  for(const rk of enc.rocks){const d=tor?wrapDelta(e.x,e.y,rk.x,rk.y,ew,eh):{dx:e.x-rk.x,dy:e.y-rk.y},rd=Math.hypot(d.dx,d.dy)||1;if(rd<rk.r+16){e.vx+=(d.dx/rd)*.3;e.vy+=(d.dy/rd)*.3;}}
  for(const oe of enc.en){if(oe===e||!oe.alive)continue;const d=tor?wrapDelta(e.x,e.y,oe.x,oe.y,ew,eh):{dx:e.x-oe.x,dy:e.y-oe.y},od=Math.hypot(d.dx,d.dy)||1;const minD=ec.r+OET[oe.t].enc.r;if(od<minD){const nx=d.dx/od,ny=d.dy/od;const push=(minD-od)/minD*.5;e.vx+=nx*push;e.vy+=ny*push;}}
  const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
  const fw=ec.fire,ewp=WEAPON_MAP[fw.wpn];
  if(ewp.wpnType==='beam gun'&&e.pulsesLeft>0&&--e.pulseTimer<=0){
    const ox=e.x+Math.sin(e.a)*fw.offset,oy=e.y-Math.cos(e.a)*fw.offset;
    const src=tor?toroidalPointNear(ox,oy,s.x,s.y,ew,eh):{x:ox,y:oy};
    const beamHit={source:src,kind:'beam',weapon:ewp};
    const tgts=[];
    if(shipShieldCanTakeHit(s,beamHit))tgts.push({x:s.x,y:s.y,r:SHIELD_HIT_R,kind:'shield'});
    tgts.push({x:s.x,y:s.y,r:SHIP_HIT_R,kind:'ship'});
    for(let mi=0;mi<enc.mis.length;mi++)tgts.push({x:enc.mis[mi].x,y:enc.mis[mi].y,r:5,kind:'missile',idx:mi});
    const res=castLaserForSpace(ox,oy,e.a,ewp.range,tgts,[],tor?{toroidal:true,worldW:ew,worldH:eh}:null);
    enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:ec.col});
    tone(550+e.t*80,.08,'sine',.04);
    if(res.hitIdx>=0){
      const tg=tgts[res.hitIdx];
      if(tg.kind==='shield'){
        const hit=applyShipShieldDamage(s,ewp.dmg,beamHit);
        const ex=src.x+Math.sin(e.a)*ewp.range,ey=src.y-Math.cos(e.a)*ewp.range;
        if(hit.passthroughDamage>0&&dseg(s.x,s.y,src.x,src.y,ex,ey)<SHIP_HIT_R){
          hit.hullDamage=hit.passthroughDamage;
          s.hp=Math.max(0,s.hp-hit.hullDamage);
        }else hit.hullDamage=0;
        shipDamageTone(hit);
        if(s.hp<=0){encKillShip();return true;}
      } else if(tg.kind==='ship'){
        const hit=applyShipDamage(s,ewp.dmg,beamHit);
        shipDamageTone(hit);
        if(s.hp<=0){encKillShip();return true;}
      } else if(tg.kind==='missile'){
        const m=enc.mis[tg.idx];m.hp-=ewp.dmg;boomAt(enc.pts,res.x2,res.y2,m.col,3);
        if(m.hp<=0){encExplodeMissile(enc,m,false);enc.mis.splice(tg.idx,1);if(s.hp<=0){encKillShip();return true;}}
      }
    }
    e.pulsesLeft--;
    if(e.pulsesLeft>0)e.pulseTimer=ewp.pulseCd;else e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);
  } else if(e.pulsesLeft===0&&--e.timer<=0){
    if(ewp.wpnType==='beam gun'){e.pulsesLeft=ewp.pulses;e.pulseTimer=1;}
    else if(ewp.wpnType==='missile launcher'){
      e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);
      const cnt=fw.count||1;
      const bas=Array.from({length:cnt},(_,k)=>ta+(k-(cnt-1)/2)*(fw.spread||0));
      const md=MISSILE_TYPES[ewp.missileType]||MISSILE_TYPES['standard'];
      for(const ba of bas){
        enc.emi.push({
          x:e.x+Math.sin(ba)*fw.offset, y:e.y-Math.cos(ba)*fw.offset, a:ba,
          vx:Math.sin(ba)*ewp.spd, vy:-Math.cos(ba)*ewp.spd,
          spd:ewp.spd, maxSpd:ewp.maxSpd, accel:ewp.accel,
          hp:ewp.hp, maxHp:ewp.hp, l:ewp.life,
          dmg:ewp.dmg, expDmg:ewp.expDmg, expR:ewp.expR,
          type:ewp.missileType||'standard', col:md.col,
          seek:!!ewp.seek, trailTimer:0,
        });
      }
      tone(360,.10,'square',.06);
    }
    else{
      e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);
      const bas=fw.mode==='spin'?Array.from({length:fw.count},(_,k)=>e.spin+k*Math.PI*2/fw.count):Array.from({length:fw.count},(_,k)=>ta+(k-(fw.count-1)/2)*fw.spread);
      for(const ba of bas)enc.ebu.push({x:e.x+Math.sin(ba)*fw.offset,y:e.y-Math.cos(ba)*fw.offset,vx:Math.sin(ba)*ewp.spd,vy:-Math.cos(ba)*ewp.spd,l:ewp.life*ewp.spd,dmg:ewp.dmg,col:ecDef.col});
      tone(550+e.t*80,.04,'square',.03);
    }
  }
  if(dist<ec.r+9){
    e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;
  }
  return false;
}
