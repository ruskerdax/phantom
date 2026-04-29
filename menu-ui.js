'use strict';

const UI_GLYPH={
  pointer:'\u25b6',
  left:'\u25c4',
  right:'\u25ba',
  back:'\u25c0',
  up:'\u2191',
  down:'\u2193',
  star:'\u2605',
  dash:'\u2014',
  arrow:'\u2192',
};

function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function moveSelection(sel,maxIdx,up,down){
  if(maxIdx<0)return 0;
  if(up)return sel<=0?maxIdx:sel-1;
  if(down)return sel>=maxIdx?0:sel+1;
  return clamp(sel,0,maxIdx);
}
function moveTabSelection(sel,tabs,left,right){
  return moveSelection(sel,(tabs?.length??0)-1,left,right);
}
function cycleValue(values,current,dir){
  if(!values.length)return current;
  const idx=values.indexOf(current);
  const cur=idx>=0?idx:0;
  return values[(cur+dir+values.length)%values.length];
}
function selectedPrefix(sel){return sel?UI_GLYPH.pointer+' ':'';}
function arrowValue(text,enabled=true){
  return (enabled?UI_GLYPH.left+' ':' ')+text+(enabled?' '+UI_GLYPH.right:' ');
}
function seedText(seed){return(seed>>>0).toString(16).toUpperCase().padStart(8,'0');}

function drawMenuPanel(px,py,pw,ph,opts={}){
  const fill=opts.fill||'rgba(0,12,8,.95)';
  const stroke=opts.stroke||'#0f8';
  const glow=opts.glow||stroke;
  cx.fillStyle=fill;cx.fillRect(px,py,pw,ph);
  cx.strokeStyle=stroke;cx.shadowColor=glow;cx.shadowBlur=opts.shadowBlur??16;cx.lineWidth=opts.lineWidth??1.5;
  cx.strokeRect(px,py,pw,ph);cx.shadowBlur=0;
}
function drawMenuDivider(px,py,pw,y,col='#1a4a2a'){
  cx.strokeStyle=col;cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+y);cx.lineTo(px+pw-10,py+y);cx.stroke();
}
function drawMenuTitle(text,x,y,col='#0f8',font='bold 22px monospace',blur=10){
  cx.fillStyle=col;cx.font=font;cx.textAlign='center';cx.shadowColor=col;cx.shadowBlur=blur;
  cx.fillText(text,x,y);cx.shadowBlur=0;
}
function drawMenuFooter(text,x,y,col='#334'){
  cx.fillStyle=col;cx.font='11px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(text,x,y);
}
function inputPromptLabel(id){
  const b=BND?.[id];
  const labels=[];
  if(b?.key!=null)labels.push(fmtKey(b.key));
  if(GP?.connected&&b?.btn!=null)labels.push(fmtBtn(b.btn));
  if(labels.length)return labels.join('/');
  return (ACT_DEFS.find(a=>a.id===id)?.label||id).toUpperCase();
}
function pausePrompt(action){
  const hardBack=typeof keyBoundToAction==='function'&&!keyBoundToAction('Backspace')?'/BACKSPACE':'';
  return inputPromptLabel('pause')+hardBack+' '+action;
}
function drawMenuRow(label,x,y,sel,opts={}){
  const disabled=!!opts.disabled;
  const col=sel?(disabled?(opts.selDisabledCol||'#844'):(opts.selCol||'#0f8')):(disabled?(opts.disabledCol||'#445'):(opts.col||'#668'));
  cx.fillStyle=col;cx.shadowColor=opts.glow||col;cx.shadowBlur=sel&&!disabled?(opts.blur??8):0;
  cx.font=(sel&&opts.bold!==false?'bold ':'')+(opts.font||'13px monospace');
  cx.textAlign=opts.align||'center';
  cx.fillText((sel&&opts.pointer!==false?UI_GLYPH.pointer+' ':'')+label,x,y);
  cx.shadowBlur=0;
}
function drawMenuTabs(tabs,sel,px,py,pw,opts={}){
  const tw=(pw-24)/tabs.length;
  for(let i=0;i<tabs.length;i++){
    const tx=px+12+i*tw,isSel=i===sel;
    cx.strokeStyle=isSel?(opts.selStroke||'#0f8'):(opts.stroke||'#335');
    cx.shadowColor=opts.glow||'#0f8';cx.shadowBlur=isSel?8:0;cx.lineWidth=1;
    cx.fillStyle=isSel?(opts.selFill||'rgba(0,40,20,.9)'):(opts.fill||'rgba(0,15,8,.6)');
    cx.fillRect(tx,py,tw-2,22);cx.strokeRect(tx,py,tw-2,22);
    cx.fillStyle=isSel?(opts.selCol||'#0f8'):(opts.col||'#558');
    cx.font=isSel?'bold 11px monospace':'11px monospace';cx.textAlign='center';cx.shadowBlur=0;
    cx.fillText(tabs[i].label||tabs[i],tx+tw/2-1,py+15);
  }
}
function drawMenuVolumeBar(value,x,y,sel){
  const slotW=22,gap=0,totalW=10*(slotW+gap)-gap,slotX=x-totalW/2;
  for(let s=0;s<10;s++){
    const filled=s<value;
    cx.fillStyle=filled?(sel?'#0f8':'#2a6a4a'):'#1a2a22';
    if(filled&&sel){cx.shadowColor='#0f8';cx.shadowBlur=6;}else cx.shadowBlur=0;
    cx.fillRect(slotX+s*(slotW+gap),y,slotW,12);
  }
  cx.shadowBlur=0;
}
function drawMenuToggle(on,x,y,sel,onCol='#0f8'){
  cx.fillStyle=on?(sel?onCol:'#2a6a4a'):(sel?'#446':'#334');
  cx.shadowColor=onCol;cx.shadowBlur=on&&sel?8:0;
  cx.font='bold 13px monospace';cx.textAlign='center';
  cx.fillText(on?'ON':'OFF',x,y);cx.shadowBlur=0;
}
