'use strict';

let NEXT_ENC_ENEMY_ID = 1;

function mkEncEnemy(typeOrClass, x, y, timer) {
  const et=enemySpawnDef(typeOrClass),ec=et.enc;
  return {x, y, vx:0, vy:0, a:Math.PI, hp:ec.hp, mhp:ec.hp, timer, alive:true, t:et.id, eid:NEXT_ENC_ENEMY_ID++, spin:0, pulsesLeft:0, pulseTimer:0, misLeft:0, misTimer:0};
}

function enemyInitialCooldown(typeOrClass, stagger=0) {
  const ec=enemyDef(typeOrClass).enc,wp=WEAPON_MAP[ec.fire.wpn];
  return Math.round(wp.cd*60)+stagger;
}

function enemyAimAngle(e, s, ew, eh, fw, ewp) {
  const lead=fw.lead??0;
  if(lead>0&&ewp.spd){
    const d=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(d.dx,d.dy)||1;
    const frames=Math.min(42,dist/ewp.spd);
    const tx=s.x+(s.vx||0)*frames*lead,ty=s.y+(s.vy||0)*frames*lead;
    const ld=wrapDelta(tx,ty,e.x,e.y,ew,eh);
    return Math.atan2(ld.dx,-ld.dy);
  }
  const d=wrapDelta(s.x,s.y,e.x,e.y,ew,eh);
  return Math.atan2(d.dx,-d.dy);
}

function enemyCanStartFire(e, dist, aimAngle, fw, ewp) {
  const maxRange=fw.maxRange??ewp.range??(ewp.life&&ewp.spd?ewp.life*ewp.spd:Infinity);
  const minRange=fw.minRange??0;
  if(dist<minRange||dist>maxRange)return false;
  if(fw.passOnly&&e.pass!==0&&e.pass!==1)return false;
  const arc=fw.arc??Math.PI;
  return Math.abs(angDiff(e.a,aimAngle))<=arc;
}

function enemyLaunchDrones(e, enc, ec, ew, eh) {
  const launch=ec.launch;
  if(!launch)return;
  if(e.launchTimer==null)e.launchTimer=120+Math.floor(Math.random()*90);
  if(--e.launchTimer>0)return;
  const active=enc.en.filter(o=>o.alive&&o.spawnParent===e.eid&&enemyDef(o.t).type===launch.type).length;
  if(active<(launch.maxActive??3)){
    const a=e.a+Math.PI+(Math.random()-.5)*1.2,r=launch.radius??ec.r+18;
    const childDef=enemySpawnDef(launch.type);
    const child=mkEncEnemy(childDef.id,wrap(e.x+Math.sin(a)*r,ew),wrap(e.y-Math.cos(a)*r,eh),enemyInitialCooldown(childDef.id,Math.floor(Math.random()*40)));
    child.spawnParent=e.eid;
    child.vx=e.vx+Math.sin(a)*.8;
    child.vy=e.vy-Math.cos(a)*.8;
    enc.en.push(child);
    tone(260,.08,'square',.04);
  }
  e.launchTimer=(launch.cd??360)+Math.floor(Math.random()*80-40);
}

// Returns true if the player ship was killed (caller should return from updEnc).
function enemyUpdate(e, s, enc, ew, eh) {
  const ecDef=enemyDef(e.t),ec=ecDef.enc;
  const tor=encToroidalActive(enc);
  e.spin+=ecDef.spinRate;
  const ai=ENEMY_AI[ecDef.type];
  if(!ai)throw new Error(`Enemy type ${ecDef.type} has no AI behavior`);
  enemySetSpeedLimit(e,ec.spd);
  ai.update(e, ec, s, ew, eh);
  e.vx*=.975;e.vy*=.975;enemyApplySpeedLimit(e,ec.spd);
  e.x=wrap(e.x+e.vx,ew);e.y=wrap(e.y+e.vy,eh);
  for(const rk of enc.rocks){const d=tor?wrapDelta(e.x,e.y,rk.x,rk.y,ew,eh):{dx:e.x-rk.x,dy:e.y-rk.y},rd=Math.hypot(d.dx,d.dy)||1;if(rd<rk.r+16){e.vx+=(d.dx/rd)*.3;e.vy+=(d.dy/rd)*.3;}}
  for(const oe of enc.en){if(oe===e||!oe.alive)continue;const oec=enemyDef(oe.t).enc,d=tor?wrapDelta(e.x,e.y,oe.x,oe.y,ew,eh):{dx:e.x-oe.x,dy:e.y-oe.y},od=Math.hypot(d.dx,d.dy)||1;const minD=ec.r+oec.r;if(od<minD){const nx=d.dx/od,ny=d.dy/od;const push=(minD-od)/minD*.5;e.vx+=nx*push;e.vy+=ny*push;}}
  enemyLaunchDrones(e,enc,ec,ew,eh);

  const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1;
  const fw=ec.fire,ewp=WEAPON_MAP[fw.wpn],ta=enemyAimAngle(e,s,ew,eh,fw,ewp);
  if(ewp.wpnType==='beam gun'&&e.pulsesLeft>0&&--e.pulseTimer<=0){
    const ox=e.x+Math.sin(e.a)*fw.offset,oy=e.y-Math.cos(e.a)*fw.offset;
    const src=tor?toroidalPointNear(ox,oy,s.x,s.y,ew,eh):{x:ox,y:oy};
    const beamHit={source:src,kind:'beam',weapon:ewp};
    const tgts=[];
    if(shipShieldCanTakeHit(s,beamHit))tgts.push({x:s.x,y:s.y,r:shipShieldHitRadius(s),kind:'shield'});
    tgts.push({x:s.x,y:s.y,r:shipHitRadius(s),kind:'ship'});
    for(let mi=0;mi<enc.mis.length;mi++)tgts.push({x:enc.mis[mi].x,y:enc.mis[mi].y,r:5,kind:'missile',idx:mi});
    const res=castLaserForSpace(ox,oy,e.a,ewp.range,tgts,[],tor?{toroidal:true,worldW:ew,worldH:eh}:null);
    enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:ec.col,w:ewp.beamWidth});
    tone(550+enemyTypeIndex(e.t)*80,.08,'sine',.04);
    if(res.hitIdx>=0){
      const tg=tgts[res.hitIdx];
      if(tg.kind==='shield'){
        const hit=applyShipShieldDamage(s,ewp.dmg,beamHit);
        const ex=src.x+Math.sin(e.a)*ewp.range,ey=src.y-Math.cos(e.a)*ewp.range;
        if(hit.passthroughDamage>0&&dseg(s.x,s.y,src.x,src.y,ex,ey)<shipHitRadius(s)){
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
    if(!enemyCanStartFire(e,dist,ta,fw,ewp)){
      e.timer=8+Math.floor(Math.random()*12);
    } else if(ewp.wpnType==='beam gun'){
      e.a=ta;
      e.pulsesLeft=ewp.pulses;
      e.pulseTimer=1;
    }
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
      const cnt=fw.count||1,spread=fw.spread||0;
      const bas=fw.mode==='spin'?Array.from({length:cnt},(_,k)=>e.spin+k*Math.PI*2/cnt):Array.from({length:cnt},(_,k)=>ta+(k-(cnt-1)/2)*spread);
      for(const ba of bas)enc.ebu.push({x:e.x+Math.sin(ba)*fw.offset,y:e.y-Math.cos(ba)*fw.offset,vx:Math.sin(ba)*ewp.spd,vy:-Math.cos(ba)*ewp.spd,l:ewp.life*ewp.spd,dmg:ewp.dmg,col:ecDef.col});
      tone(550+enemyTypeIndex(e.t)*80,.04,'square',.03);
    }
  }
  if(dist<ec.r+9){
    e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;
  }
  return false;
}
