'use strict';

const BT_CELL=10;

function btClamp(v,lo,hi){
  return v<lo?lo:(v>hi?hi:v);
}

function btShuffleInPlace(rng,arr){
  for(let i=arr.length-1;i>0;i--){
    const j=rng.int(0,i);
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function btNode(id,x,y,type,parentId=null){
  return{id,x:Math.round(x),y:Math.round(y),type,parentId};
}

function btAddNode(nodes,x,y,type,parentId=null){
  const n=btNode(nodes.length,x,y,type,parentId);
  nodes.push(n);
  return n;
}

function btAddEdge(edges,a,b,type){
  edges.push({a,b,type});
}

function btCarveCircle(grid,gw,gh,cell,x,y,r){
  const rr=r*r;
  const x0=Math.max(0,Math.floor((x-r)/cell));
  const x1=Math.min(gw-1,Math.floor((x+r)/cell));
  const y0=Math.max(0,Math.floor((y-r)/cell));
  const y1=Math.min(gh-1,Math.floor((y+r)/cell));
  for(let gy=y0;gy<=y1;gy++){
    const cy=(gy+.5)*cell;
    for(let gx=x0;gx<=x1;gx++){
      const cx=(gx+.5)*cell;
      const dx=cx-x,dy=cy-y;
      if(dx*dx+dy*dy<=rr)grid[gy*gw+gx]=1;
    }
  }
}

function btCarveRect(grid,gw,gh,cell,x0,y0,x1,y1){
  const gx0=Math.max(0,Math.floor(x0/cell));
  const gx1=Math.min(gw-1,Math.floor(x1/cell));
  const gy0=Math.max(0,Math.floor(y0/cell));
  const gy1=Math.min(gh-1,Math.floor(y1/cell));
  for(let gy=gy0;gy<=gy1;gy++){
    for(let gx=gx0;gx<=gx1;gx++)grid[gy*gw+gx]=1;
  }
}

function btCarveSegment(grid,gw,gh,cell,a,b,r){
  const dx=b.x-a.x,dy=b.y-a.y;
  const len=Math.hypot(dx,dy);
  const n=Math.max(1,Math.ceil(len/(cell*.6)));
  for(let i=0;i<=n;i++){
    const t=i/n;
    btCarveCircle(grid,gw,gh,cell,a.x+dx*t,a.y+dy*t,r);
  }
}

function btFillCarveHoles(grid,gw,gh){
  const outside=new Uint8Array(gw*gh);
  const qx=[],qy=[];
  const push=(x,y)=>{
    const idx=y*gw+x;
    if(outside[idx]||grid[idx])return;
    outside[idx]=1;
    qx.push(x);qy.push(y);
  };
  for(let x=0;x<gw;x++){push(x,0);push(x,gh-1);}
  for(let y=0;y<gh;y++){push(0,y);push(gw-1,y);}
  while(qx.length){
    const x=qx.pop(),y=qy.pop();
    if(x>0)push(x-1,y);
    if(x<gw-1)push(x+1,y);
    if(y>0)push(x,y-1);
    if(y<gh-1)push(x,y+1);
  }
  for(let i=0;i<grid.length;i++){
    if(!grid[i]&&!outside[i])grid[i]=1;
  }
}

function btAddBoundaryEdge(map,ax,ay,bx,by){
  const k=`${ax}|${ay}`;
  if(!map[k])map[k]=[];
  map[k].push([bx,by]);
}

function btExtractBoundaryLoops(grid,gw,gh,cell){
  const map={};
  for(let y=0;y<gh;y++){
    for(let x=0;x<gw;x++){
      if(!grid[y*gw+x])continue;
      const x0=x*cell,y0=y*cell,x1=x0+cell,y1=y0+cell;
      if(y===0||!grid[(y-1)*gw+x])btAddBoundaryEdge(map,x0,y0,x1,y0);
      if(x===gw-1||!grid[y*gw+x+1])btAddBoundaryEdge(map,x1,y0,x1,y1);
      if(y===gh-1||!grid[(y+1)*gw+x])btAddBoundaryEdge(map,x1,y1,x0,y1);
      if(x===0||!grid[y*gw+x-1])btAddBoundaryEdge(map,x0,y1,x0,y0);
    }
  }
  const loops=[];
  const nextEdge=key=>{
    const list=map[key];
    if(!list||!list.length)return null;
    return list.pop();
  };
  const keys=()=>Object.keys(map).filter(k=>map[k]?.length);
  while(keys().length){
    const sk=keys()[0];
    const [sx,sy]=sk.split('|').map(Number);
    const loop=[[sx,sy]];
    let cx=sx,cy=sy,guard=0;
    while(guard++<200000){
      const nk=`${cx}|${cy}`;
      const to=nextEdge(nk);
      if(!to)break;
      loop.push(to);
      cx=to[0];cy=to[1];
      if(cx===sx&&cy===sy)break;
    }
    if(loop.length>=4&&loop[0][0]===loop[loop.length-1][0]&&loop[0][1]===loop[loop.length-1][1]){
      loop.pop();
      loops.push(loop);
    }
  }
  return loops;
}

function btPolyArea(poly){
  let a=0;
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length];
    a+=p[0]*q[1]-q[0]*p[1];
  }
  return a*.5;
}

function btSimplifyCollinear(poly){
  let out=poly.slice();
  let changed=true;
  while(changed&&out.length>3){
    changed=false;
    const next=[];
    for(let i=0;i<out.length;i++){
      const a=out[(i-1+out.length)%out.length],b=out[i],c=out[(i+1)%out.length];
      const dx1=b[0]-a[0],dy1=b[1]-a[1];
      const dx2=c[0]-b[0],dy2=c[1]-b[1];
      if(dx1*dy2===dy1*dx2){changed=true;continue;}
      next.push(b);
    }
    out=next;
  }
  return out;
}

function btRotateTerrainToEntry(poly,entX){
  if(!poly.length)return poly;
  let bestI=0,bestScore=Infinity;
  for(let i=0;i<poly.length;i++){
    const p=poly[i];
    const score=p[1]*4+Math.abs(p[0]-entX);
    if(score<bestScore){bestScore=score;bestI=i;}
  }
  return poly.slice(bestI).concat(poly.slice(0,bestI));
}

function btStationReachableInSite(siteData,entry){
  if(typeof caveWalkReachable!=='function')return true;
  const stations=(siteData.buildings||[]).filter(b=>b.classId===BUILDING_CLASS_IDS.POWER_STATION);
  if(!stations.length)return true;
  const fences=(siteData.buildings||[]).filter(b=>b.classId===BUILDING_CLASS_IDS.LASER_DEFENSE&&b.a&&b.b);
  return caveWalkReachable(siteData,entry,stations,fences);
}

function btClearingStationXCandidates(rng,clearing,halfW){
  const minX=Math.ceil(clearing.x+halfW+10);
  const maxX=Math.floor(clearing.x+clearing.w-halfW-10);
  if(maxX<minX)return [];
  const out=[Math.round((minX+maxX)*.5)];
  for(let i=0;i<7;i++)out.push(Math.round(rng.fl(minX,maxX)));
  return [...new Set(out)];
}

function btBuildingPlacementClear(siteData,classId,x,y,pad=10){
  const def=buildingDef(classId);
  const hw=def.footprint.w*.5,hh=def.footprint.h*.5;
  for(const b of siteData.buildings||[]){
    const bd=buildingDef(b.classId);
    const bhw=bd.footprint.w*.5,bhh=bd.footprint.h*.5;
    if(Math.abs(x-b.x)<hw+bhw+pad&&Math.abs(y-b.y)<hh+bhh+pad)return false;
  }
  return true;
}

function btPlaceClearingPowerStation(rng,siteData){
  if(!Array.isArray(siteData.clearings)||!siteData.clearings.length)return;
  if(rng.next()>=.5)return;
  const stationDef=buildingDef(BUILDING_CLASS_IDS.POWER_STATION);
  const halfW=stationDef.footprint.w*.5;
  const yOff=stationDef.footprint.h*.5;
  const clearings=btShuffleInPlace(rng,siteData.clearings.slice());
  const entry=siteData.entTop||siteData.ent||{x:Math.round(W*.5),y:32};
  for(const clearing of clearings){
    const y=Math.round(clearing.floorY-yOff);
    const xs=btClearingStationXCandidates(rng,clearing,halfW);
    for(const x of xs){
      if(!pip(x,y,siteData.terrain))continue;
      const station=mkBuilding(BUILDING_CLASS_IDS.POWER_STATION,Math.round(x),Math.round(y),{clearingId:clearing.terminalNodeId});
      siteData.buildings.push(station);
      if(btStationReachableInSite(siteData,entry))return;
      siteData.buildings.pop();
    }
  }
}

function btClearingFactoryXCandidates(rng,clearing,halfW){
  const minX=Math.ceil(clearing.x+halfW+12);
  const maxX=Math.floor(clearing.x+clearing.w-halfW-12);
  if(maxX<minX)return [];
  const out=[Math.round((minX+maxX)*.5)];
  for(let i=0;i<7;i++)out.push(Math.round(rng.fl(minX,maxX)));
  return [...new Set(out)];
}

function btPlaceClearingDroneFactory(rng,siteData){
  if(!Array.isArray(siteData.clearings)||!siteData.clearings.length)return;
  if(rng.next()>=.25)return;
  const factoryDef=buildingDef(BUILDING_CLASS_IDS.DRONE_FACTORY);
  const halfW=factoryDef.footprint.w*.5;
  const yOff=factoryDef.footprint.h*.5;
  const clearings=btShuffleInPlace(rng,siteData.clearings.slice());
  for(const clearing of clearings){
    const y=Math.round(clearing.floorY-yOff);
    const xs=btClearingFactoryXCandidates(rng,clearing,halfW);
    for(const x of xs){
      if(!pip(x,y,siteData.terrain))continue;
      if(!btBuildingPlacementClear(siteData,BUILDING_CLASS_IDS.DRONE_FACTORY,x,y,10))continue;
      const idx=siteData.buildings.length;
      const factory=mkBuilding(BUILDING_CLASS_IDS.DRONE_FACTORY,Math.round(x),Math.round(y),{
        clearingId:clearing.terminalNodeId,
        idx,
        spawnTimer:1200
      });
      siteData.buildings.push(factory);
      return;
    }
  }
}

function btPlaceLaserDefenses(rng,siteData){
  if(typeof genLaserDefensesInSite!=='function')return;
  const entry=siteData.entTop||siteData.ent||{x:Math.round(W*.5),y:32};
  const axis=rng.next()<.5?'horizontal':'vertical';
  const fences=genLaserDefensesInSite(rng,siteData,entry,{axis});
  for(const f of fences)siteData.buildings.push(f);
}

function genBranchingTunnel(rng,tmpl,seed){
  const worldW=rng.int(2,4)*W;
  const worldH=rng.int(3,5)*H;
  const xMin=70,xMax=W-70;
  const yMin=30,yMax=worldH-90;
  const ent={x:Math.round(W*.5),y:36};

  const nodes=[],edges=[],trunk=[],allBranches=[],mainBranches=[],terminals=[];
  const trunkCount=rng.int(7,10);
  const trunkEndY=btClamp(worldH-rng.int(120,190),ent.y+220,yMax);
  trunk.push(btAddNode(nodes,ent.x,ent.y,'trunk_root',null));
  for(let i=1;i<trunkCount;i++){
    const prev=trunk[trunk.length-1];
    const t=i/(trunkCount-1);
    const nx=btClamp(prev.x+rng.fl(-58,58),xMin,xMax);
    const ny=btClamp(ent.y+t*(trunkEndY-ent.y)+rng.fl(-20,20),prev.y+34,yMax);
    const node=btAddNode(nodes,nx,ny,'trunk',prev.id);
    trunk.push(node);
    btAddEdge(edges,prev,node,'trunk');
  }

  const growBranch=(start,dir,depth,parentId)=>{
    const branch={
      id:`b${allBranches.length}`,
      parentBranchId:parentId,
      depth,
      startNode:start.id,
      nodes:[start.id],
      subBranches:[],
      terminalNode:start.id
    };
    let cur=start,heading=dir;
    const segs=rng.int(Math.max(2,4-depth),Math.max(3,5-depth));
    for(let i=0;i<segs;i++){
      const len=rng.fl(105,190)*(depth>0?.88:1);
      let dx=heading*len*rng.fl(.62,1.04);
      let dy=len*rng.fl(-.18,.34);
      if(depth===0&&i===0)dy=Math.abs(dy)+18;
      let nx=btClamp(cur.x+dx,xMin,xMax);
      let ny=btClamp(cur.y+dy,yMin+16,yMax);
      if(Math.abs(nx-cur.x)<20)nx=btClamp(cur.x+heading*20,xMin,xMax);
      if(Math.abs(ny-cur.y)<20)ny=btClamp(cur.y+rng.fl(20,48),yMin+16,yMax);
      if(Math.hypot(nx-cur.x,ny-cur.y)<20)break;
      const node=btAddNode(nodes,nx,ny,'branch',cur.id);
      btAddEdge(edges,cur,node,depth===0?'branch':'sub_branch');
      cur=node;
      branch.nodes.push(node.id);
      branch.terminalNode=node.id;
      if(nx<=xMin+20)heading=1;
      else if(nx>=xMax-20)heading=-1;
    }
    allBranches.push(branch);
    terminals.push(nodes[branch.terminalNode]);
    if(depth<2&&branch.nodes.length>2){
      const chance=.55*Math.pow(.58,depth);
      if(rng.next()<chance){
        const anchorNode=nodes[branch.nodes[rng.int(1,branch.nodes.length-2)]];
        const subDir=rng.next()<.5?-1:1;
        const sub=growBranch(anchorNode,subDir,depth+1,branch.id);
        branch.subBranches.push(sub);
      }
    }
    return branch;
  };

  const branchCount=rng.int(2,5);
  const trunkSpawnPool=trunk.slice(1,trunk.length-1);
  btShuffleInPlace(rng,trunkSpawnPool);
  const selectedSpawns=trunkSpawnPool.slice(0,Math.min(branchCount,trunkSpawnPool.length)).sort((a,b)=>a.y-b.y);
  for(let i=0;i<selectedSpawns.length;i++){
    const start=selectedSpawns[i];
    const dir=(i%2===0?1:-1)*(rng.next()<.65?1:-1);
    const main=growBranch(start,dir,0,null);
    mainBranches.push(main);
  }

  const loopPairs=[],pairSet=new Set();
  const pairKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  const tryLoop=(na,nb)=>{
    if(!na||!nb||na.id===nb.id)return false;
    const key=pairKey(na.id,nb.id);
    if(pairSet.has(key))return false;
    const d=Math.hypot(na.x-nb.x,na.y-nb.y);
    if(d<150||d>520)return false;
    pairSet.add(key);
    btAddEdge(edges,na,nb,'loop');
    loopPairs.push({a:na.id,b:nb.id});
    return true;
  };
  const termPool=btShuffleInPlace(rng,terminals.slice());
  const loopBudget=rng.next()<.45?rng.int(1,2):0;
  for(const t of termPool){
    if(loopPairs.length>=loopBudget)break;
    if(rng.next()>=.45)continue;
    const nearby=terminals
      .filter(o=>o.id!==t.id)
      .map(o=>({n:o,d:Math.hypot(o.x-t.x,o.y-t.y)}))
      .filter(o=>o.d>=150&&o.d<=520)
      .sort((a,b)=>a.d-b.d);
    if(!nearby.length)continue;
    tryLoop(t,nearby[rng.int(0,Math.min(2,nearby.length-1))].n);
  }

  const clearingCount=Math.min(rng.int(1,2),Math.max(1,terminals.length));
  const clearingTerms=btShuffleInPlace(rng,terminals.slice()).slice(0,clearingCount);
  const clearings=[];
  for(const term of clearingTerms){
    const w=Math.round(rng.fl(W*.55,W*.92));
    const h=Math.round(rng.fl(H*.45,H*.78));
    const x=btClamp(term.x-w*.5,xMin,xMax-w);
    const y=btClamp(term.y-h*.52,Math.max(yMin+30,ent.y+80),yMax-h);
    const cx=x+w*.5,cy=y+h*.52;
    const cNode=btAddNode(nodes,cx,cy,'clearing',term.id);
    btAddEdge(edges,term,cNode,'clearing_link');
    clearings.push({x:Math.round(x),y:Math.round(y),w,h,floorY:Math.round(y+h-10),terminalNodeId:term.id});
  }

  const gw=Math.ceil(worldW/BT_CELL)+2,gh=Math.ceil(worldH/BT_CELL)+2;
  const grid=new Uint8Array(gw*gh);
  const trunkR=rng.int(34,42),branchR=rng.int(25,33),loopR=rng.int(21,27);
  btCarveCircle(grid,gw,gh,BT_CELL,ent.x,ent.y,44);
  for(const e of edges){
    const r=e.type==='trunk'?trunkR:(e.type==='loop'?loopR:branchR);
    btCarveSegment(grid,gw,gh,BT_CELL,e.a,e.b,r);
  }
  for(const c of clearings){
    btCarveRect(grid,gw,gh,BT_CELL,c.x,c.y,c.x+c.w,c.y+c.h);
  }
  btFillCarveHoles(grid,gw,gh);

  const loops=btExtractBoundaryLoops(grid,gw,gh,BT_CELL);
  let terrain=loops.sort((a,b)=>Math.abs(btPolyArea(b))-Math.abs(btPolyArea(a)))[0]||[
    [xMin,ent.y],[xMin,yMax],[xMax,yMax],[xMax,ent.y]
  ];
  terrain=btSimplifyCollinear(terrain).map(p=>[Math.round(p[0]),Math.round(p[1])]);
  terrain=btRotateTerrainToEntry(terrain,ent.x);

  const siteData={
    ...tmpl,
    kind:'branching',
    worldW,
    worldH,
    terrain,
    obs:[],
    branches:mainBranches,
    clearings,
    loops:loopPairs,
    ent:{x:ent.x,y:ent.y},
    entTop:{x:ent.x,y:ent.y},
    entBottom:null,
    en:[],
    fu:[],
    buildings:[],
    grav:tmpl.grav
  };
  btPlaceClearingPowerStation(rng,siteData);
  btPlaceClearingDroneFactory(rng,siteData);
  btPlaceLaserDefenses(rng,siteData);
  return siteData;
}
