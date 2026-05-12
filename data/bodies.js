'use strict';

const BODY_KINDS = ['star','gas_giant','habitable','uninhabitable'];

const BODY_SUBTYPES = {
  habitable: ['desert','arctic','continental','rocky','ocean'],
  uninhabitable: ['barren','volcanic','liquid','machine'],
};

const BODY_SIZE_BY_KIND = {
  star: [15,20],
  gas_giant: [7,10],
  habitable: [2,4],
  uninhabitable: [1,6],
};

const CONTINENTAL_SIZE_RANGE = [3,4];

function moonMaxSize(parentSize){
  if(parentSize < 3) return 0;
  if(parentSize <= 5) return 1;
  if(parentSize <= 8) return 2;
  return 3;
}

const SURFACE_SCREEN_MULT_BY_SIZE = [null, 1, 2, 2.5, 3, 3.5, 4];
const FELT_GRAVITY_BY_SIZE = [null, 0, 0.002, 0.005, 0.009, 0.014, 0.020];

const BODY_DRAW_BASE_PX = 10;
const BODY_DRAW_PER_SIZE_PX = 6;

function bodyDrawRadius(size){
  return BODY_DRAW_BASE_PX + size * BODY_DRAW_PER_SIZE_PX;
}

const SUBTYPE_PALETTES = {
  desert:      {terrain:['#f4e6c4','#e8d5a0','#d4b878','#c19a55','#a67c3a','#7a5a2a','#c4795a','#a8553a'], sea:null},
  arctic:      {terrain:['#f4f8fc','#e0e8f0','#c8d8e8','#a8c8e0','#80b8d0','#b8e8f0','#88c0d8'], sea:null},
  continental: {terrain:['#88c060','#6ab048','#4a9028','#287018','#1a5818'], sea:['#5090d0','#3870b0','#2858a0','#184078']},
  rocky:       {terrain:['#d8d8d4','#c0c0bc','#8090a0','#607080','#b09080','#806858','#685040'], sea:null},
  ocean:       {terrain:['#6a5040','#888070','#9c8068'], sea:['#5090d0','#3870b0','#2858a0','#184078','#d8d088','#c0b870','#a8b860','#8aa850']},
  barren:      {terrain:['#d8d8d4','#c0c0bc','#8090a0','#607080','#b09080','#806858','#685040'], sea:null},
  volcanic:    {terrain:['#383028','#50443c','#685850','#80706a'], sea:['#ff6020','#ffa040']},
  liquid:      {terrain:['#383038','#504048','#685058'], sea:['#8050a8','#604078','#4ca878','#3a8060','#d8c860','#b0a040','#d88040','#b06020']},
  machine:     {terrain:['#d0d4d8','#b8c0c4','#a0a8ac','#888c90'], sea:['#404848','#283030','#d8e840','#c0d030','#50e068','#38b050']},
  gas_giant:   {bands:['#80a8d0','#607890','#b0b4b8','#909498','#88b478','#688858','#b89880','#907058','#d8c878','#b0a058','#d8a878','#b08058','#d08868','#a86848']},
  star:        {core:['#ffffff'], warm:{inner:['#fffbe8'], mid:['#ffe87a'], outer:['#ffcc40']}, cool:{inner:['#f7fcff'], mid:['#dff1ff'], outer:['#bcdfff']}},
};

const ATMO_KINDS = ['none','trace','thin','moderate','thick'];
const ATMO_DRAG_PER_FRAME = {none:1.0, trace:0.998, thin:0.994, moderate:0.988, thick:0.978};
const ATMO_DRAG_CAVE_TUNNEL_FACTOR = 0.5;
const ATMO_STAR_OPACITY = {none:1.0, trace:0.85, thin:0.55, moderate:0.25, thick:0.05};

const ATMO_RANGE_BY_SUBTYPE = {
  desert: ['thin','moderate','thick'],
  arctic: ['thin','moderate'],
  continental: ['moderate'],
  rocky: ['none','trace'],
  ocean: ['moderate','thick'],
  barren: ['none','trace'],
  volcanic: ['none','trace','thin','moderate','thick'],
  liquid: ['moderate','thick'],
  machine: ['trace','thin','moderate'],
};

const SUBTYPE_WEIGHTS = {
  habitable: {desert:15, arctic:30, continental:5, rocky:35, ocean:15},
  uninhabitable: {barren:75, volcanic:12.5, liquid:12.5, machine:2.5},
};

const ORBITAL_SPEED_BUCKETS = {
  planet: [0.00040, 0.00050, 0.00060, 0.00070, 0.00080, 0.00090, 0.00100, 0.00110],
};
ORBITAL_SPEED_BUCKETS.moon = ORBITAL_SPEED_BUCKETS.planet.map(s => s * 5);

const MAX_BODY_COUNT = 60;
const GOLDILOCKS_INNER = 0.35;
const GOLDILOCKS_OUTER = 0.65;

function assertBodiesRegistry(){
  for(const kind of BODY_KINDS){
    const range = BODY_SIZE_BY_KIND[kind];
    if(!Array.isArray(range) || range.length !== 2 || !Number.isFinite(range[0]) || !Number.isFinite(range[1]) || range[0] > range[1]){
      throw new Error(`BODY_SIZE_BY_KIND is invalid for kind ${kind}`);
    }
  }

  for(const subtype of BODY_SUBTYPES.habitable){
    if(!SUBTYPE_PALETTES[subtype]) throw new Error(`Missing palette for habitable subtype ${subtype}`);
  }
  for(const subtype of BODY_SUBTYPES.uninhabitable){
    if(!SUBTYPE_PALETTES[subtype]) throw new Error(`Missing palette for uninhabitable subtype ${subtype}`);
  }

  const sums = {
    habitable: Object.values(SUBTYPE_WEIGHTS.habitable).reduce((a,b) => a + b, 0),
    uninhabitable: Object.values(SUBTYPE_WEIGHTS.uninhabitable).reduce((a,b) => a + b, 0),
  };
  if(Math.abs(sums.habitable - 100) > 0.001) throw new Error(`Habitable subtype weights must sum to ~100, got ${sums.habitable}`);
  if(Math.abs(sums.uninhabitable - 100) > 3) throw new Error(`Uninhabitable subtype weights must sum to ~100, got ${sums.uninhabitable}`);

  if(!Array.isArray(ORBITAL_SPEED_BUCKETS.planet) || ORBITAL_SPEED_BUCKETS.planet.length !== 8) throw new Error('ORBITAL_SPEED_BUCKETS.planet must have 8 values');
  if(!Array.isArray(ORBITAL_SPEED_BUCKETS.moon) || ORBITAL_SPEED_BUCKETS.moon.length !== 8) throw new Error('ORBITAL_SPEED_BUCKETS.moon must have 8 values');
}
assertBodiesRegistry();
