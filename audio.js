'use strict';

// Audio is built on one Web Audio graph:
// SFX -> sfxMaster -> destination
// Music -> musicPreFx -> pauseFilter -> musicMaster -> destination
let AC=null;

var MUSIC_TRACKS={
  // id: {src:['assets/music/name.ogg','assets/music/name.mp3'], loop:true, volume:1, loopStart:0, loopEnd:null}
  weirdspace:{src:['music/weirdspace.ogg'],loop:true,volume:1}
};

var MUSIC_ARRANGEMENTS={
  title:{fade:1.5,layers:{}},
  overworld:{fade:1.5,layers:{main:'weirdspace'}},
  encounter:{fade:1,layers:{}},
  site:{fade:1,layers:{}},
  escape:{fade:.75,layers:{}},
  rebuild:{fade:1.5,layers:{}},
};

const AUDIO={
  ready:false,
  sfxMaster:null,
  musicPreFx:null,
  pauseFilter:null,
  musicMaster:null,
  lastSfxGain:null,
  lastMusicGain:null,
  lastPauseFilter:null,
};

const MUSIC={
  active:new Map(),
  buffers:new Map(),
  bufferPromises:new Map(),
  warned:new Set(),
  layerTokens:{},
  layerGainOverrides:{},
  currentContext:null,
};

function clampAudio(v,min=0,max=1){
  v=Number(v);
  return Number.isFinite(v)?Math.max(min,Math.min(max,v)):min;
}
function audioRamp(param,value,fadeSec=0){
  if(!AC||!param)return;
  const now=AC.currentTime,fade=Math.max(0,fadeSec||0);
  value=Number.isFinite(value)?value:0;
  try{
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value,now);
    if(fade>0)param.linearRampToValueAtTime(value,now+fade);
    else param.setValueAtTime(value,now);
  }catch(e){
    try{param.value=value;}catch(_){}
  }
}
function initAudioGraph(){
  if(AUDIO.ready||!AC)return;
  AUDIO.sfxMaster=AC.createGain();
  AUDIO.musicPreFx=AC.createGain();
  AUDIO.pauseFilter=AC.createBiquadFilter();
  AUDIO.musicMaster=AC.createGain();

  AUDIO.sfxMaster.gain.value=sfxVolumeTarget();
  AUDIO.sfxMaster.connect(AC.destination);

  AUDIO.pauseFilter.type='lowpass';
  AUDIO.pauseFilter.frequency.value=20000;
  AUDIO.pauseFilter.Q.value=.7;
  AUDIO.musicMaster.gain.value=musicVolumeTarget();
  AUDIO.musicPreFx.connect(AUDIO.pauseFilter);
  AUDIO.pauseFilter.connect(AUDIO.musicMaster);
  AUDIO.musicMaster.connect(AC.destination);

  AUDIO.ready=true;
  AUDIO.lastSfxGain=AUDIO.sfxMaster.gain.value;
  AUDIO.lastMusicGain=AUDIO.musicMaster.gain.value;
  AUDIO.lastPauseFilter=false;
}
function ia(){
  if(!AC){
    try{
      AC=new(window.AudioContext||window.webkitAudioContext)();
      initAudioGraph();
    }catch(e){return;}
  }
  initAudioGraph();
  if(AC&&AC.state==='suspended'){
    try{AC.resume();}catch(e){}
  }
  audioSyncSfxVolume(true);
  musicSyncVolume(true);
  musicSyncPauseFilter(true);
  musicResumeHtmlFallbacks();
}

function sfxVolumeTarget(){return clampAudio((typeof G!=='undefined'?G.sfxVol:10)/10);}
function musicVolumeTarget(){
  const base=clampAudio((typeof G!=='undefined'?G.musVol:10)/10);
  return musicPauseFilterActive()?base*.25:base;
}
function audioSyncSfxVolume(immediate=false){
  if(!AUDIO.sfxMaster)return;
  const target=sfxVolumeTarget();
  if(!immediate&&AUDIO.lastSfxGain===target)return;
  AUDIO.lastSfxGain=target;
  audioRamp(AUDIO.sfxMaster.gain,target,immediate?0:.08);
}
function musicSyncVolume(immediate=false){
  const target=musicVolumeTarget();
  for(const entry of MUSIC.active.values()){
    if(entry.htmlDirect&&entry.audio){
      const htmlTarget=musicDirectVolumeTarget(entry);
      if(immediate||entry.htmlVolumeTarget!==htmlTarget)musicSetHtmlVolume(entry,htmlTarget,immediate?0:.12);
    }
  }
  if(!AUDIO.musicMaster)return;
  if(!immediate&&AUDIO.lastMusicGain===target)return;
  AUDIO.lastMusicGain=target;
  audioRamp(AUDIO.musicMaster.gain,target,immediate?0:.12);
}
function musicPauseFilterActive(){
  return !!(typeof G!=='undefined'&&(G.paused||((G.st==='options'||G.st==='controls')&&G.optFrom!=='title')));
}
function musicSyncPauseFilter(immediate=false){
  if(!AUDIO.pauseFilter)return;
  const active=musicPauseFilterActive();
  if(!immediate&&AUDIO.lastPauseFilter===active)return;
  AUDIO.lastPauseFilter=active;
  audioRamp(AUDIO.pauseFilter.frequency,active?900:20000,immediate?0:.22);
}

// tone(f,d,t,v): spawns an oscillator at frequency f, ramps its gain to silence over d seconds, then stops.
function tone(f,d,t='square',v=.07){
  if(!AC)return;
  initAudioGraph();
  audioSyncSfxVolume();
  if(sfxVolumeTarget()===0)return;
  try{
    const o=AC.createOscillator(),g=AC.createGain(),now=AC.currentTime;
    o.connect(g);g.connect(AUDIO.sfxMaster||AC.destination);
    o.type=t;
    o.frequency.setValueAtTime(f,now);
    o.frequency.exponentialRampToValueAtTime(Math.max(10,f*.3),now+d);
    g.gain.setValueAtTime(v,now);
    g.gain.exponentialRampToValueAtTime(.0001,now+d);
    o.start();
    o.stop(now+d+.05);
  }catch(e){}
}
function toneRise(f0,f1,d,t='sine',v=.07){
  if(!AC)return;
  initAudioGraph();
  audioSyncSfxVolume();
  if(sfxVolumeTarget()===0)return;
  try{
    const o=AC.createOscillator(),g=AC.createGain(),now=AC.currentTime;
    o.connect(g);g.connect(AUDIO.sfxMaster||AC.destination);
    o.type=t;
    o.frequency.setValueAtTime(f0,now);
    o.frequency.exponentialRampToValueAtTime(f1,now+d);
    g.gain.setValueAtTime(v,now);
    g.gain.exponentialRampToValueAtTime(.0001,now+d);
    o.start();
    o.stop(now+d+.05);
  }catch(e){}
}

function musicWarnOnce(key,msg){
  if(MUSIC.warned.has(key))return;
  MUSIC.warned.add(key);
  try{console.warn(msg);}catch(e){}
}
function musicTrackSourceList(def){
  return Array.isArray(def?.src)?def.src:(def?.src?[def.src]:[]);
}
function decodeMusicData(buf){
  return new Promise((resolve,reject)=>{
    try{
      const decoded=AC.decodeAudioData(buf,resolve,reject);
      if(decoded&&decoded.then)decoded.then(resolve,reject);
    }
    catch(e){reject(e);}
  });
}
function musicFetchTrackSource(trackId,srcs,idx=0){
  if(idx>=srcs.length){
    musicWarnOnce('load:'+trackId,'Music track failed to load: '+trackId);
    return Promise.resolve(null);
  }
  return fetch(srcs[idx])
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
    .then(buf=>decodeMusicData(buf))
    .catch(()=>musicFetchTrackSource(trackId,srcs,idx+1));
}
function musicLoadBuffer(trackId){
  if(MUSIC.buffers.has(trackId))return Promise.resolve(MUSIC.buffers.get(trackId));
  if(MUSIC.bufferPromises.has(trackId))return MUSIC.bufferPromises.get(trackId);
  const def=MUSIC_TRACKS[trackId];
  if(!def){
    musicWarnOnce('missing:'+trackId,'Music track is not defined: '+trackId);
    return Promise.resolve(null);
  }
  const srcs=musicTrackSourceList(def);
  if(!srcs.length){
    musicWarnOnce('nosrc:'+trackId,'Music track has no source files: '+trackId);
    return Promise.resolve(null);
  }
  const p=musicFetchTrackSource(trackId,srcs).then(buf=>{
    if(buf)MUSIC.buffers.set(trackId,buf);
    return buf;
  });
  MUSIC.bufferPromises.set(trackId,p);
  return p;
}
function musicLayerConfig(cfg){
  if(typeof cfg==='string')return{track:cfg,gain:1};
  if(cfg&&typeof cfg==='object')return cfg;
  return null;
}
function musicLayerBaseGain(layer,cfg){
  const track=MUSIC_TRACKS[cfg.track]||{};
  if(Object.prototype.hasOwnProperty.call(MUSIC.layerGainOverrides,layer)){
    return clampAudio(MUSIC.layerGainOverrides[layer]);
  }
  return clampAudio((cfg.gain??1)*(track.volume??1));
}
function musicDirectVolumeTarget(entry){
  return clampAudio((entry?.targetGain??0)*musicVolumeTarget());
}
function musicSetHtmlVolume(entry,target,fadeSec=0){
  if(!entry?.audio)return;
  target=clampAudio(target);
  entry.htmlVolumeTarget=target;
  if(entry.htmlFadeTimer){clearInterval(entry.htmlFadeTimer);entry.htmlFadeTimer=null;}
  const fade=Math.max(0,fadeSec||0),audio=entry.audio,start=audio.volume;
  if(fade<=0){audio.volume=target;return;}
  const startMs=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  entry.htmlFadeTimer=setInterval(()=>{
    const now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
    const t=Math.min(1,(now-startMs)/(fade*1000));
    audio.volume=start+(target-start)*t;
    if(t>=1){clearInterval(entry.htmlFadeTimer);entry.htmlFadeTimer=null;}
  },33);
}
function musicPlayHtmlEntry(entry){
  if(!entry?.audio)return;
  try{
    const p=entry.audio.play();
    if(p&&p.then){
      p.then(()=>{entry.playBlocked=false;}).catch(()=>{
        entry.playBlocked=true;
        musicWarnOnce('htmlplay:'+entry.trackId,'Music playback is waiting for browser audio permission: '+entry.trackId);
      });
    }else entry.playBlocked=false;
  }catch(e){
    entry.playBlocked=true;
    musicWarnOnce('htmlplay:'+entry.trackId,'Music playback could not start: '+entry.trackId);
  }
}
function musicResumeHtmlFallbacks(){
  for(const entry of MUSIC.active.values()){
    if(entry.audio&&(entry.audio.paused||entry.playBlocked))musicPlayHtmlEntry(entry);
  }
}
function musicCanRouteHtmlThroughGraph(){
  return !(typeof location!=='undefined'&&location.protocol==='file:');
}
function musicStopEntry(entry,fadeSec=.5){
  if(!entry)return;
  entry.stopping=true;
  if(entry.gain)audioRamp(entry.gain.gain,0,fadeSec);
  if(entry.audio){
    if(entry.htmlDirect)musicSetHtmlVolume(entry,0,fadeSec);
    setTimeout(()=>{
      try{entry.audio.pause();}catch(e){}
      try{entry.audio.removeAttribute('src');entry.audio.load();}catch(e){}
      try{entry.mediaSource&&entry.mediaSource.disconnect();}catch(e){}
      try{entry.gain&&entry.gain.disconnect();}catch(e){}
    },Math.max(0,fadeSec)*1000+80);
  }
  if(entry.source){
    try{entry.source.stop(AC.currentTime+Math.max(0,fadeSec)+.05);}catch(e){}
  }
}
function musicStartHtmlLayer(layer,cfg,entry,fadeSec){
  const def=MUSIC_TRACKS[cfg.track]||{},src=musicTrackSourceList(def)[0];
  if(!src||typeof Audio==='undefined')return;
  try{
    const audio=new Audio(src);
    audio.loop=def.loop!==false;
    audio.preload='auto';
    entry.audio=audio;
    entry.mediaSource=null;
    entry.htmlDirect=true;
    if(AC&&AUDIO.musicPreFx&&musicCanRouteHtmlThroughGraph()){
      try{
        const gain=AC.createGain(),mediaSource=AC.createMediaElementSource(audio);
        gain.gain.setValueAtTime(0,AC.currentTime);
        mediaSource.connect(gain);
        gain.connect(AUDIO.musicPreFx);
        audio.volume=1;
        entry.gain=gain;
        entry.mediaSource=mediaSource;
        entry.htmlDirect=false;
        audioRamp(gain.gain,entry.targetGain,fadeSec);
      }catch(e){}
    }
    if(entry.htmlDirect)musicSetHtmlVolume(entry,musicDirectVolumeTarget(entry),fadeSec);
    musicPlayHtmlEntry(entry);
  }catch(e){
    musicWarnOnce('htmlstart:'+cfg.track,'Music fallback could not start: '+cfg.track);
  }
}
function musicStartLayer(layer,cfg,fadeSec){
  if(!cfg||!cfg.track||!AC||!AUDIO.musicPreFx)return;
  const token=(MUSIC.layerTokens[layer]||0)+1;
  MUSIC.layerTokens[layer]=token;
  const entry={layer,trackId:cfg.track,token,source:null,gain:null,targetGain:musicLayerBaseGain(layer,cfg),stopping:false};
  MUSIC.active.set(layer,entry);
  musicLoadBuffer(cfg.track).then(buf=>{
    if(!buf){
      if(MUSIC.layerTokens[layer]===token&&MUSIC.active.get(layer)===entry&&!entry.stopping)musicStartHtmlLayer(layer,cfg,entry,fadeSec);
      return;
    }
    if(!AC||!AUDIO.musicPreFx)return;
    if(MUSIC.layerTokens[layer]!==token||MUSIC.active.get(layer)!==entry||entry.stopping)return;
    try{
      const def=MUSIC_TRACKS[cfg.track]||{},now=AC.currentTime;
      const source=AC.createBufferSource(),gain=AC.createGain();
      source.buffer=buf;
      source.loop=def.loop!==false;
      if(Number.isFinite(def.loopStart))source.loopStart=Math.max(0,def.loopStart);
      if(Number.isFinite(def.loopEnd)&&def.loopEnd>0)source.loopEnd=def.loopEnd;
      gain.gain.setValueAtTime(0,now);
      source.connect(gain);
      gain.connect(AUDIO.musicPreFx);
      source.onended=()=>{try{gain.disconnect();}catch(e){}};
      entry.source=source;
      entry.gain=gain;
      source.start(now);
      audioRamp(gain.gain,entry.targetGain,fadeSec);
    }catch(e){
      musicWarnOnce('start:'+cfg.track,'Music track could not start: '+cfg.track);
    }
  });
}
function musicReconcileLayers(arr){
  const desired=arr?.layers||{},fade=Number.isFinite(arr?.fade)?arr.fade:1;
  for(const [layer,entry] of MUSIC.active){
    const cfg=musicLayerConfig(desired[layer]);
    if(!cfg||cfg.track!==entry.trackId){
      MUSIC.active.delete(layer);
      MUSIC.layerTokens[layer]=(MUSIC.layerTokens[layer]||0)+1;
      musicStopEntry(entry,fade);
    }
  }
  Object.keys(desired).forEach(layer=>{
    const cfg=musicLayerConfig(desired[layer]);
    if(!cfg||!cfg.track)return;
    const targetGain=musicLayerBaseGain(layer,cfg);
    const entry=MUSIC.active.get(layer);
    if(entry&&entry.trackId===cfg.track){
      if(entry.targetGain!==targetGain){
        entry.targetGain=targetGain;
        if(entry.gain)audioRamp(entry.gain.gain,targetGain,fade);
        if(entry.htmlDirect&&entry.audio)musicSetHtmlVolume(entry,musicDirectVolumeTarget(entry),fade);
      }
      return;
    }
    musicStartLayer(layer,cfg,fade);
  });
}
function musicContextForName(st){
  if(st==='title'||st==='options'||st==='controls'||st==='over'||st==='done')return'title';
  if(st==='overworld'||st==='base'||st==='slipgate')return'overworld';
  if(st==='enc_in'||st==='encounter')return'encounter';
  if(st==='play')return'site';
  if(st==='esc')return'escape';
  if(st==='rebuild'||st==='dead_ow'||st==='dead_enc'||st==='dead_site')return'rebuild';
  return null;
}
function musicDesiredContext(){
  if(typeof G==='undefined')return'title';
  if((G.st==='options'||G.st==='controls')&&G.optFrom&&G.optFrom!=='title')return musicContextForName(G.optFrom);
  return musicContextForName(G.st);
}
function musicStopAll(fadeSec=.75){
  const fade=Math.max(0,fadeSec||0);
  for(const [layer,entry] of MUSIC.active){
    MUSIC.active.delete(layer);
    MUSIC.layerTokens[layer]=(MUSIC.layerTokens[layer]||0)+1;
    musicStopEntry(entry,fade);
  }
  MUSIC.currentContext=null;
}
function musicSetLayerGain(layer,gain,fadeSec=.5){
  if(gain==null)delete MUSIC.layerGainOverrides[layer];
  else MUSIC.layerGainOverrides[layer]=clampAudio(gain);
  const entry=MUSIC.active.get(layer);
  if(entry){
    const ctx=musicDesiredContext(),arr=MUSIC_ARRANGEMENTS[ctx],cfg=musicLayerConfig(arr?.layers?.[layer]);
    entry.targetGain=cfg?musicLayerBaseGain(layer,cfg):clampAudio(gain??0);
    if(entry.gain)audioRamp(entry.gain.gain,entry.targetGain,fadeSec);
    if(entry.htmlDirect&&entry.audio)musicSetHtmlVolume(entry,musicDirectVolumeTarget(entry),fadeSec);
  }
}
function musicUpdate(){
  if(!AC||!AUDIO.ready)return;
  audioSyncSfxVolume();
  musicSyncVolume();
  musicSyncPauseFilter();
  const ctx=musicDesiredContext();
  const arr=ctx?MUSIC_ARRANGEMENTS[ctx]:null;
  if(!arr){musicStopAll(.75);return;}
  MUSIC.currentContext=ctx;
  musicReconcileLayers(arr);
}
