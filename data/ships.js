'use strict';

const BATTERIES = [
  {id:'bat_kestrel', name:'KESTREL BATTERY', capacity:180},
  {id:'bat_sparrow', name:'SCOUT BATTERY', capacity:150},
  {id:'bat_ironclad', name:'HEAVY BATTERY', capacity:300},
  {id:'bat_viper', name:'RUNNER BATTERY', capacity:200},
];

const REACTORS = [
  {id:'rx_kestrel', name:'KESTREL REACTOR', energyPerSec:1.4},
  {id:'rx_sparrow', name:'SCOUT REACTOR', energyPerSec:2.4},
  {id:'rx_ironclad', name:'HEAVY REACTOR', energyPerSec:0.9},
  {id:'rx_viper', name:'RUNNER REACTOR', energyPerSec:1.8},
];

const CHASSIS = [
  {
    id: 'kestrel',
    name: 'KESTREL LIGHT',
    desc: 'Balanced starter hull.',
    maxHp: 15,
    batteryId: 'bat_kestrel',
    reactorId: 'rx_kestrel',
    hitRadius: 12,
    thrust: {
      fwd:      0.04,
      rev:      0.018,
      strafeL:  0.014,
      strafeR:  0.014,
      rotAccel: 0.0035,
      rotMax:   0.080,
    },
    slots: [{type:'kinetic'},{type:'beam'}],
    licensePrice: 0,
    buildPrice: 0,
    buyable: true,
  },
  {
    id: 'sparrow',
    name: 'SPARROW SCOUT',
    desc: 'Fast and energy-rich. Light armor.',
    maxHp: 10,
    batteryId: 'bat_sparrow',
    reactorId: 'rx_sparrow',
    hitRadius: 12,
    thrust: {
      fwd:      0.08,
      rev:      0.036,
      strafeL:  0.028,
      strafeR:  0.028,
      rotAccel: 0.0045,
      rotMax:   0.095,
    },
    slots: [{type:'kinetic'}],
    licensePrice: 4000,
    buildPrice: 600,
    buyable: true,
  },
  {
    id: 'ironclad',
    name: 'IRONCLAD HEAVY',
    desc: 'Heavy armor and firepower. Reduced speed.',
    maxHp: 28,
    batteryId: 'bat_ironclad',
    reactorId: 'rx_ironclad',
    hitRadius: 12,
    thrust: {
      fwd:      0.025,
      rev:      0.01125,
      strafeL:  0.00875,
      strafeR:  0.00875,
      rotAccel: 0.0025,
      rotMax:   0.065,
    },
    slots: [{type:'kinetic'},{type:'missile'}],
    licensePrice: 6000,
    buildPrice: 900,
    buyable: true,
  },
  {
    id: 'viper',
    name: 'VIPER RUNNER',
    desc: 'Agile hull with stronger reverse thrusters.',
    maxHp: 12,
    batteryId: 'bat_viper',
    reactorId: 'rx_viper',
    hitRadius: 12,
    thrust: {
      fwd:      0.05,
      rev:      0.035,
      strafeL:  0.0175,
      strafeR:  0.0175,
      rotAccel: 0.0035,
      rotMax:   0.090,
    },
    slots: [{type:'kinetic'},{type:'beam'}],
    licensePrice: 5500,
    buildPrice: 750,
    buyable: true,
  },
];

const AUX_ITEMS = [];
