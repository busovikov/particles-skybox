// Adapted from three.js examples/webgpu_tsl_compute_attractors_particles.html.
// Copyright © 2010–2026 three.js authors. MIT license; see ../../THIRD_PARTY_NOTICES.md.
import * as THREE from 'three/webgpu';
import {
  Fn, If, Loop, PI, cos, sin, hash, instanceIndex, instancedArray,
  mix, mod, uint, uniform, uniformArray, vec3, vec4,
} from 'three/tsl';
import { dampingFactor } from './simulation-clock.js';

export const PARTICLE_COUNT = 2 ** 18;
export { DEFAULTS } from './attractor-config.js';

export class AttractorParticles {
  constructor(renderer, scene, attractors, settings) {
    this.renderer = renderer;
    this.settings = settings;
    this.positions = uniformArray(attractors.map((a) => a.position));
    this.axes = uniformArray(attractors.map((a) => a.axis));
    this.positionBuffer = instancedArray(PARTICLE_COUNT, 'vec3');
    this.previousPositionBuffer = instancedArray(PARTICLE_COUNT, 'vec3');
    this.velocityBuffer = instancedArray(PARTICLE_COUNT, 'vec3');
    this.previousVelocityBuffer = instancedArray(PARTICLE_COUNT, 'vec3');
    const positionBuffer = this.positionBuffer;
    const previousPositionBuffer = this.previousPositionBuffer;
    const velocityBuffer = this.velocityBuffer;
    const u = this.uniforms = {
      delta: uniform(0),
      interpolation: uniform(0),
      damping: uniform(1),
      attractorMass: uniform(10 ** settings.attractorMassExponent),
      particleMass: uniform(10 ** settings.particleGlobalMassExponent),
      maxSpeed: uniform(settings.maxSpeed),
      spinningStrength: uniform(settings.spinningStrength),
      scale: uniform(settings.scale),
      boundHalfExtent: uniform(settings.boundHalfExtent),
      colorA: uniform(new THREE.Color(settings.colorA)),
      colorB: uniform(new THREE.Color(settings.colorB)),
    };

    const randomSeed = () => uint(Math.floor(Math.random() * 0xffffff));
    const sphericalToVec3 = Fn(([phi, theta]) => vec3(
      sin(phi).mul(sin(theta)), cos(phi), sin(phi).mul(cos(theta)),
    ));
    this.initCompute = Fn(() => {
      const position = positionBuffer.element(instanceIndex);
      const velocity = velocityBuffer.element(instanceIndex);
      position.assign(vec3(
        hash(instanceIndex.add(randomSeed())),
        hash(instanceIndex.add(randomSeed())),
        hash(instanceIndex.add(randomSeed())),
      ).sub(0.5).mul(vec3(5, 0.2, 5)));
      previousPositionBuffer.element(instanceIndex).assign(position);
      const phi = hash(instanceIndex.add(randomSeed())).mul(PI).mul(2);
      const theta = hash(instanceIndex.add(randomSeed())).mul(PI);
      velocity.assign(sphericalToVec3(phi, theta).mul(0.05));
      this.previousVelocityBuffer.element(instanceIndex).assign(velocity);
    })().compute(PARTICLE_COUNT).setName('Reset particles');

    const massMultiplier = hash(instanceIndex.add(randomSeed())).remap(0.25, 1);
    this.massMultiplier = massMultiplier;
    this.updateCompute = Fn(() => {
      const position = positionBuffer.element(instanceIndex);
      previousPositionBuffer.element(instanceIndex).assign(position);
      const velocity = velocityBuffer.element(instanceIndex);
      this.previousVelocityBuffer.element(instanceIndex).assign(velocity);
      const particleMass = massMultiplier.mul(u.particleMass).toVar();
      const force = vec3(0).toVar();
      Loop(uint(attractors.length), ({ i }) => {
        const toAttractor = this.positions.element(i).sub(position);
        // A tiny soft core prevents division by zero at an attractor's center.
        const distanceSquared = toAttractor.dot(toAttractor).max(0.0001);
        const direction = toAttractor.div(distanceSquared.sqrt());
        const gravityStrength = u.attractorMass.mul(particleMass).mul(6.67e-11).div(distanceSquared);
        force.addAssign(direction.mul(gravityStrength));
        force.addAssign(this.axes.element(i).mul(gravityStrength)
          .mul(u.spinningStrength).cross(toAttractor));
      });
      velocity.addAssign(force.mul(u.delta));
      const speed = velocity.length();
      If(speed.greaterThan(u.maxSpeed), () => {
        velocity.mulAssign(u.maxSpeed.div(speed.max(0.000001)));
      });
      velocity.mulAssign(u.damping);
      position.addAssign(velocity.mul(u.delta));
      // Keep the original 0–20 slider: zero means an unbounded scene.
      If(u.boundHalfExtent.greaterThan(0), () => {
        const halfExtent = u.boundHalfExtent.div(2);
        position.assign(mod(position.add(halfExtent), u.boundHalfExtent).sub(halfExtent));
      });
    })().compute(PARTICLE_COUNT).setName('Update particles');

    const material = this.material = new THREE.SpriteNodeMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    material.positionNode = this.interpolatedPosition();
    material.colorNode = Fn(() => {
      const speed = this.interpolatedVelocity().length();
      const colorMix = speed.div(u.maxSpeed.max(0.000001)).smoothstep(0, 0.5);
      return vec4(mix(u.colorA, u.colorB, colorMix), 1);
    })();
    material.scaleNode = massMultiplier.mul(u.scale);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(this.geometry, material, PARTICLE_COUNT);
    // The CPU geometry bounds cannot describe positions updated on the GPU.
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.reset();
  }

  syncSettings() {
    const s = this.settings;
    const u = this.uniforms;
    u.attractorMass.value = 10 ** s.attractorMassExponent;
    u.particleMass.value = 10 ** s.particleGlobalMassExponent;
    for (const name of ['maxSpeed', 'spinningStrength', 'scale', 'boundHalfExtent']) {
      u[name].value = s[name];
    }
    u.colorA.value.set(s.colorA);
    u.colorB.value.set(s.colorB);
  }

  interpolatedPosition(index) {
    const previous = index === undefined ? this.previousPositionBuffer.toAttribute().xyz : this.previousPositionBuffer.element(index);
    const current = index === undefined ? this.positionBuffer.toAttribute().xyz : this.positionBuffer.element(index);
    const extent = this.uniforms.boundHalfExtent;
    const alpha = this.uniforms.interpolation;
    return Fn(() => {
      const position = mix(previous, current, alpha).toVar();
      If(extent.greaterThan(0), () => {
        // Interpolate the short periodic displacement, never across the whole box.
        const half = extent.div(2);
        const displacement = mod(current.sub(previous).add(half), extent).sub(half);
        position.assign(mod(previous.add(displacement.mul(alpha)).add(half), extent).sub(half));
      });
      return position;
    })();
  }

  setInterpolation(alpha) { this.uniforms.interpolation.value = alpha; }

  interpolatedVelocity(index) {
    const previous = index === undefined ? this.previousVelocityBuffer.toAttribute().xyz : this.previousVelocityBuffer.element(index);
    const current = index === undefined ? this.velocityBuffer.toAttribute().xyz : this.velocityBuffer.element(index);
    return mix(previous, current, this.uniforms.interpolation);
  }

  update(deltaSeconds) {
    if (deltaSeconds <= 0) return;
    this.uniforms.delta.value = deltaSeconds;
    this.uniforms.damping.value = dampingFactor(this.settings.velocityDamping, deltaSeconds);
    this.renderer.compute(this.updateCompute);
  }

  reset() {
    this.uniforms.interpolation.value = 0;
    this.renderer.compute(this.initCompute);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.initCompute.dispose();
    this.updateCompute.dispose();
  }
}
