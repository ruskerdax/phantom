'use strict';

// Audio — all sound is synthesized at runtime via the Web Audio API; no audio files are loaded.
// tone(f,d,t,v): spawns an oscillator at frequency f, ramps its gain to silence over d seconds, then stops.
let AC=null;
function ia(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function tone(f,d,t='square',v=.07){if(!AC)return;const sv=(G?G.sfxVol/10:1);if(sv===0)return;try{const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.setValueAtTime(f,AC.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(10,f*.3),AC.currentTime+d);g.gain.setValueAtTime(v*sv,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d+.05)}catch(e){}}
function toneRise(f0,f1,d,t='sine',v=.07){if(!AC)return;const sv=(G?G.sfxVol/10:1);if(sv===0)return;try{const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.setValueAtTime(f0,AC.currentTime);o.frequency.exponentialRampToValueAtTime(f1,AC.currentTime+d);g.gain.setValueAtTime(v*sv,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d+.05)}catch(e){}}
