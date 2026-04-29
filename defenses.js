'use strict';

// Shared stationary and environmental combat defenses.
const TURRET = {
  col: '#f44',
  r: 8,
  update(t, ebu, s) {
    t.a += angDiff(t.a, Math.atan2(s.x-t.x, -(s.y-t.y))) * .04;
    if(--t.timer <= 0) {
      const ewp=WEAPON_MAP['mass driver'];
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
