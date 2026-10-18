export const DEFAULTS = Object.freeze({
  attractorMassExponent: 7,
  particleGlobalMassExponent: 4,
  maxSpeed: 8,
  velocityDamping: 0.1,
  spinningStrength: 2.75,
  scale: 0.008,
  boundHalfExtent: 8,
  colorA: '#5900ff',
  colorB: '#ffa575',
  timeScale: 0.1,
});

export const ATTRACTOR_POSITIONS = [[-1,0,0],[1,0,-0.5],[0,0.5,1]];
export const ATTRACTOR_AXES = [[0,1,0],[0,1,0],[1,0,-0.5]];
export const ATTRACTOR_COLORS = ['#b8a0e9','#ffb58f','#91c9df'];
export const ATTRACTOR_ORBIT_SPEEDS = [0.12,-0.096,0.078];
export const ATTRACTOR_SPIN_SPEEDS = [0.08,-0.064,0.052];
