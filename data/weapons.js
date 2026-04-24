'use strict';

const WEAPONS=[
  {id:'mass driver',  type:'projectile', dmg:3, cd:0.5,  spd:7,  life:60},
  {id:'railgun',      type:'projectile', dmg:2, cd:1.0,  spd:12, life:90},
  {id:'laser cannon', type:'laser',      dmg:1, cd:1.0,  range:Math.round(W/3), pulses:3, pulseCd:5},
];
