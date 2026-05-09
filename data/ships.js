'use strict';

const BATTERIES = [
  {id:'bat_kestrel', name:'KESTREL BATTERY', capacity:50},
  {id:'bat_sparrow', name:'SCOUT BATTERY', capacity:40},
  {id:'bat_ironclad', name:'HEAVY BATTERY', capacity:120},
  {id:'bat_viper', name:'RUNNER BATTERY', capacity:100},
];

const REACTORS = [
  {id:'rx_kestrel', name:'KESTREL REACTOR', energyPerSec:2.0},
  {id:'rx_sparrow', name:'SCOUT REACTOR', energyPerSec:2.5},
  {id:'rx_ironclad', name:'HEAVY REACTOR', energyPerSec:4.0},
  {id:'rx_viper', name:'RUNNER REACTOR', energyPerSec:3.5},
];

const DEFAULT_POWER_BY_CHASSIS = {
  kestrel: {battery:'bat_kestrel', reactor:'rx_kestrel'},
  sparrow: {battery:'bat_sparrow', reactor:'rx_sparrow'},
  ironclad: {battery:'bat_ironclad', reactor:'rx_ironclad'},
  viper: {battery:'bat_viper', reactor:'rx_viper'},
};

function defaultPowerForChassisId(chassisId){
  const firstId=CHASSIS[0]?.id;
  const p=DEFAULT_POWER_BY_CHASSIS[chassisId]||DEFAULT_POWER_BY_CHASSIS[firstId]||{};
  return {
    battery:p.battery??BATTERIES[0]?.id??null,
    reactor:p.reactor??REACTORS[0]?.id??null,
  };
}

const CHASSIS = [
  {
    id: 'kestrel',
    name: 'KESTREL LIGHT',
    desc: 'Balanced starter hull.',
    maxHp: 150,
    hitRadius: 12,
    thrust: {
      fwd:      0.04,
      rev:      0.018,
      strafeL:  0.014,
      strafeR:  0.014,
      rotAccel: 0.0015,
      rotMax:   0.080,
    },
    slots: [{type:'kinetic'},{type:'energy'}],
    licensePrice: 0,
    buildPrice: 0,
    buyable: true,
  },
  {
    id: 'sparrow',
    name: 'SPARROW SCOUT',
    desc: 'Highly manuevrable, limited weaponry.',
    maxHp: 120,
    hitRadius: 12,
    thrust: {
      fwd:      0.08,
      rev:      0.035,
      strafeL:  0.04,
      strafeR:  0.04,
      rotAccel: 0.0014,
      rotMax:   0.085,
    },
    slots: [{type:'energy'}],
    licensePrice: 4000,
    buildPrice: 600,
    buyable: true,
  },
  {
    id: 'ironclad',
    name: 'IRONCLAD HEAVY',
    desc: 'Heavily armored, with a large reactor.',
    maxHp: 280,
    hitRadius: 12,
    thrust: {
      fwd:      0.030,
      rev:      0.015,
      strafeL:  0.01,
      strafeR:  0.01,
      rotAccel: 0.0009,
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
    maxHp: 160,
    hitRadius: 12,
    thrust: {
      fwd:      0.06,
      rev:      0.055,
      strafeL:  0.045,
      strafeR:  0.045,
      rotAccel: 0.001,
      rotMax:   0.070,
    },
    slots: [{type:'energy'},{type:'energy'}],
    licensePrice: 5500,
    buildPrice: 750,
    buyable: true,
  },
];

const AUX_ITEMS = [];

// Single hull polygon shared by all chassis.
// Coordinates are chassis-local: nose at top (negative Y), tail at positive Y.
function chassisPolygon(chassisId) {
  return [[0,-10],[-7,8],[0,4],[7,8]];
}

// Slot pin positions in chassis-local coordinates, centered on the longitudinal axis.
// Two slots: stacked vertically. Three or more: evenly spaced along the centerline.
function chassisSlotPositions(chassisId) {
  const ch = CHASSIS.find(c => c.id === chassisId) || CHASSIS[0];
  const n = ch ? ch.slots.length : 2;
  if (n <= 0) return [];
  if (n === 1) return [[0, 0]];
  const spacing = 4;
  const total = (n - 1) * spacing;
  return Array.from({length: n}, (_, i) => [0, -total / 2 + i * spacing]);
}
