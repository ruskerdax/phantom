'use strict';

// Overworld enemy types: 0=Saucer, 1=Swarm, 2=Dreadnought
// fire.mode: 'aim' = angles spread around target; 'spin' = angles evenly distributed from e.spin
const OET=[
  {name:'SAUCER',      col:'#ff4444',col2:'#ff9900',owSpd:1.4, trigR:58, sc:150, energy:false, enc:{cnt:1,hp:6, spd:2.2,r:13,col:'#ff4444',col2:'#ff9900', fire:{wpn:1,mode:'aim', count:1,spread:0,  offset:14}}},
  {name:'SWARM',       col:'#00ddff',col2:'#cc00ff',owSpd:.95,  trigR:54, sc:80,  energy:false, enc:{cnt:5,hp:3, spd:2.8,r:9, col:'#00ddff',col2:'#cc00ff', fire:{wpn:0,mode:'spin',count:3,            offset:10}}},
  {name:'DREADNOUGHT', col:'#ffee00',col2:'#ff6600',owSpd:.55,  trigR:68, sc:350, energy:true,  enc:{cnt:1,hp:18,spd:.75,r:20,col:'#ffee00',col2:'#ff6600', fire:{wpn:0,mode:'aim', count:3,spread:.2, offset:22}}},
];
