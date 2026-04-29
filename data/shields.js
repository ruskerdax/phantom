'use strict';

const SHIELDS = [
  {
    id: 'shield_std',
    name: 'STANDARD SHIELD',
    desc: 'Forward shield profile.',
    hp: 8,
    radiusScale: 1.42,
    coverageDeg: 120,
    rechargeDelay: 300,
    rechargeRate: 0.04,
    energyPerHp: 5,
    reactivateAt: 0.5,
    licensePrice: 0,
    buildPrice: 0,
    buyable: true,
  },
  {
    id: 'shield_heavy',
    name: 'OMNI SHIELD',
    desc: 'Full-coverage shield profile.',
    hp: 12,
    radiusScale: 1.42,
    coverageDeg: 360,
    rechargeDelay: 300,
    rechargeRate: 0.03,
    energyPerHp: 5,
    reactivateAt: 0.5,
    licensePrice: 3500,
    buildPrice: 500,
    buyable: true,
  },
];
