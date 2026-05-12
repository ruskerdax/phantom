'use strict';

const SPATIAL_BUCKET=800;

function mkSpatial(worldW,worldH){
  return{worldW,worldH,bucket:SPATIAL_BUCKET,buckets:new Map()};
}
function spatialAdd(g,x,y,payload){
  if(!g)return payload;
  const b=g.bucket||SPATIAL_BUCKET,bx=Math.floor(x/b),by=Math.floor(y/b),key=bx+'|'+by;
  let list=g.buckets.get(key);
  if(!list){list=[];g.buckets.set(key,list);}
  list.push({x,y,payload});
  return payload;
}
function spatialClear(g){
  if(g)g.buckets.clear();
}
function spatialQueryRect(g,x0,y0,x1,y1,out){
  const res=out||[];
  res.length=0;
  if(!g)return res;
  const minX=Math.min(x0,x1),maxX=Math.max(x0,x1),minY=Math.min(y0,y1),maxY=Math.max(y0,y1);
  const b=g.bucket||SPATIAL_BUCKET;
  const bx0=Math.floor(minX/b),bx1=Math.floor(maxX/b),by0=Math.floor(minY/b),by1=Math.floor(maxY/b);
  for(let by=by0;by<=by1;by++){
    for(let bx=bx0;bx<=bx1;bx++){
      const list=g.buckets.get(bx+'|'+by);
      if(!list)continue;
      for(let i=0;i<list.length;i++){
        const it=list[i],p=it.payload,pr=Math.max(0,p?.r||0);
        if(it.x+pr<minX||it.x-pr>maxX||it.y+pr<minY||it.y-pr>maxY)continue;
        res.push(p);
      }
    }
  }
  return res;
}
function spatialQueryRadius(g,x,y,r,out){
  const res=out||[];
  res.length=0;
  if(!g)return res;
  const rr=Math.max(0,r||0),b=g.bucket||SPATIAL_BUCKET;
  const bx0=Math.floor((x-rr)/b),bx1=Math.floor((x+rr)/b),by0=Math.floor((y-rr)/b),by1=Math.floor((y+rr)/b);
  for(let by=by0;by<=by1;by++){
    for(let bx=bx0;bx<=bx1;bx++){
      const list=g.buckets.get(bx+'|'+by);
      if(!list)continue;
      for(let i=0;i<list.length;i++){
        const it=list[i],p=it.payload,reach=rr+Math.max(0,p?.r||0),dx=it.x-x,dy=it.y-y;
        if(dx*dx+dy*dy<=reach*reach)res.push(p);
      }
    }
  }
  return res;
}
