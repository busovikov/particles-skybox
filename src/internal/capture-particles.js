import * as THREE from 'three/webgpu';
import {
  Fn, If, exp, float, instanceIndex, instancedArray, mix, positionLocal,
  uniform, uv, vec3, vec4,
} from 'three/tsl';
import { CaptureFaceCulling } from './capture-culling.js';
import { PARTICLE_COUNT } from './particles.js';

/** Render the original GPU cloud from the six cameras' shared optical center. */
export class CaptureParticles {
  constructor(renderer, particles, settings) {
    this.renderer = renderer;
    this.settings = settings;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0);
    this.origin = uniform(new THREE.Vector3());
    this.minimumFootprint = uniform(8 / 2048);
    const centerSize = instancedArray(PARTICLE_COUNT, 'vec4');
    const directions = instancedArray(PARTICLE_COUNT, 'vec3');
    const tangents = instancedArray(PARTICLE_COUNT, 'vec3');
    const radiance = this.radiance = instancedArray(PARTICLE_COUNT, 'vec3');
    this.preparedBuffers = { centerSize, directions, tangents, radiance };
    const u = particles.uniforms;

    // Keep original world positions. Only the star footprint is antialiased
    // and capped so close particles never become large foreground flashes.
    this.compute = Fn(() => {
      const position = particles.interpolatedPosition(instanceIndex).toVar();
      const relative = position.sub(this.origin).toVar();
      const distance = relative.length().max(0.00001);
      const direction = relative.div(distance).toVar();
      If(relative.dot(relative).lessThan(1e-10), () => { direction.assign(vec3(0, 0, 1)); });
      const reference = vec3(0, 1, 0).toVar();
      If(direction.y.abs().greaterThan(0.95), () => { reference.assign(vec3(1, 0, 0)); });
      const tangent = reference.cross(direction).normalize();
      const desiredSize = particles.massMultiplier.mul(u.scale).div(distance).min(0.002);
      const filteredSize = desiredSize.max(this.minimumFootprint);
      // Broaden subpixel stars without increasing their integrated energy.
      const energy = desiredSize.div(filteredSize).pow(2);
      const nearScale = float(1).toVar();
      If(u.boundHalfExtent.greaterThan(0), () => { nearScale.assign(u.boundHalfExtent.div(8).min(1)); });
      const visibility = distance.smoothstep(nearScale.mul(0.4), nearScale.mul(0.9)).toVar();
      If(u.boundHalfExtent.greaterThan(0), () => {
        const absolute = position.abs();
        const edgeDistance = u.boundHalfExtent.div(2).sub(absolute.x.max(absolute.y).max(absolute.z));
        visibility.mulAssign(edgeDistance.smoothstep(0, u.boundHalfExtent.mul(0.08)));
      });
      const speed = particles.interpolatedVelocity(instanceIndex).length();
      const colorMix = speed.div(u.maxSpeed.max(0.000001)).smoothstep(0, 0.5);
      centerSize.element(instanceIndex).assign(vec4(position, filteredSize.mul(distance)));
      directions.element(instanceIndex).assign(direction);
      tangents.element(instanceIndex).assign(tangent);
      radiance.element(instanceIndex).assign(mix(u.colorA, u.colorB, colorMix).mul(energy).mul(visibility).mul(6));
    })().compute(PARTICLE_COUNT).setName('Filter particles for six perspective captures');

    const material = this.material = new THREE.MeshBasicNodeMaterial({
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, side: THREE.DoubleSide, forceSinglePass: true,
    });
    const projected = centerSize.toAttribute();
    const tangent = tangents.toAttribute().xyz;
    const bitangent = directions.toAttribute().xyz.cross(tangent);
    // Radial tangent planes keep the exact same footprint across cube seams.
    material.positionNode = projected.xyz.add(
      tangent.mul(positionLocal.x).add(bitangent.mul(positionLocal.y)).mul(projected.w),
    );
    const disc = uv().sub(0.5).mul(2);
    const gaussian = exp(disc.dot(disc).mul(-8)).sub(Math.exp(-8)).max(0);
    material.colorNode = vec4(radiance.toAttribute().xyz.mul(gaussian), float(1));
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(this.geometry, material, PARTICLE_COUNT);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.culling = new CaptureFaceCulling();
    this.scene.onBeforeRender = (_renderer, _scene, camera) => {
      this.mesh.visible = this.culling.intersects(camera);
    };
  }

  update(position, resolution, viewerPixelAngle = 0) {
    this.origin.value.copy(position);
    // Four capture texels instead of eight: a sharp core, not a broad halo.
    // Also keep Gaussian sigma >= 0.5 output pixels when the cube is minified.
    // Use the same angular footprint on all six faces to preserve their seams.
    this.minimumFootprint.value = Math.max(8 / resolution, 4 * viewerPixelAngle);
    const h = this.settings.boundHalfExtent / 2;
    const maxDistance = Math.hypot(Math.abs(position.x) + Math.max(h, 2.5),
      Math.abs(position.y) + Math.max(h, 0.1), Math.abs(position.z) + Math.max(h, 2.5));
    this.culling.setBounds(h, Math.SQRT1_2 * Math.max(this.minimumFootprint.value, 0.002) * maxDistance);
    this.renderer.compute(this.compute);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.compute.dispose();
  }
}
