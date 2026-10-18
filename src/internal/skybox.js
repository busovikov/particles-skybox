import * as THREE from 'three/webgpu';

const identityRotation = new THREE.Quaternion();
const origin = new THREE.Vector3();

function sameRotation(a, b) {
  // q and -q describe the same rigid rotation.
  return a.equals(b) || (a.x === -b.x && a.y === -b.y && a.z === -b.z && a.w === -b.w);
}

function createTarget(resolution) {
  return new THREE.WebGLCubeRenderTarget(resolution, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
  });
}

/** Six perspective cameras form one rigid, movable capture rig. */
export class ParticleSkybox {
  constructor(renderer, sourceCaptureScene, resolution = 2048) {
    this.renderer = renderer;
    this.sourceScene = sourceCaptureScene;
    // r180's public cube target supports both WebGPU and WebGL2 rendering.
    this.target = createTarget(resolution);
    this.camera = new THREE.CubeCamera(0.01, 1000, this.target);
    this.camera.layers.set(0);
    this.scene = new THREE.Scene();
    this.scene.background = this.target.texture;
    this.scene.backgroundBlurriness = 0;
    this.capturePosition = new THREE.Vector3();
    this.captureQuaternion = new THREE.Quaternion();
    this.dirty = true;
    this.captureCount = 0;
    this.staleFaces = Array(6).fill(true);
  }

  update(position = origin, quaternion = identityRotation, simulationChanged = true, visibleFaces = Array(6).fill(true)) {
    // Rotation is baked into the six perspective captures, never applied again
    // when sampling their cubemap as the viewer's infinitely distant background.
    this.scene.backgroundRotation.set(0, 0, 0);
    const poseChanged = !this.capturePosition.equals(position)
      || !sameRotation(this.captureQuaternion, quaternion);
    if (simulationChanged || this.dirty || poseChanged) this.staleFaces.fill(true);
    if (!visibleFaces.some((visible, i) => visible && this.staleFaces[i])) return false;

    this.camera.position.copy(position);
    this.camera.quaternion.copy(quaternion);
    this.camera.updateWorldMatrix(true, true);

    const renderer = this.renderer;
    const previousTarget = renderer.getRenderTarget();
    const previousFace = renderer.getActiveCubeFace();
    const previousMipmap = renderer.getActiveMipmapLevel();
    const previousXr = renderer.xr.enabled;
    const generateMipmaps = this.target.texture.generateMipmaps;
    this.dirty = true;
    try {
      if (this.camera.coordinateSystem !== renderer.coordinateSystem) {
        this.camera.coordinateSystem = renderer.coordinateSystem;
        this.camera.updateCoordinateSystem();
      }
      this.camera.updateWorldMatrix(true, true);
      renderer.xr.enabled = false;
      this.target.texture.generateMipmaps = false;
      for (let slot = 0; slot < 6; slot++) {
        const face = renderer.coordinateSystem === THREE.WebGPUCoordinateSystem && slot < 2 ? 1 - slot : slot;
        if (!visibleFaces[face] || !this.staleFaces[face]) continue;
        renderer.setRenderTarget(this.target, slot, this.camera.activeMipmapLevel);
        renderer.render(this.sourceScene, this.camera.children[slot]);
        this.staleFaces[face] = false;
      }
      this.target.texture.needsPMREMUpdate = true;
    } finally {
      // CubeCamera restores state on success, but not when a face render throws.
      if (renderer.getRenderTarget() !== previousTarget
        || renderer.getActiveCubeFace() !== previousFace
        || renderer.getActiveMipmapLevel() !== previousMipmap) {
        renderer.setRenderTarget(previousTarget, previousFace, previousMipmap);
      }
      renderer.xr.enabled = previousXr;
      this.target.texture.generateMipmaps = generateMipmaps;
    }
    this.capturePosition.copy(position);
    this.captureQuaternion.copy(quaternion);
    this.captureCount++;
    this.dirty = false;
    return true;
  }

  setResolution(size) {
    if (![256, 512, 1024, 2048].includes(size)) throw new RangeError('Unsupported skybox resolution');
    if (size === this.target.width) return;
    // r180's setSize does not resize each image descriptor of a cube texture.
    const previous = this.target;
    this.target = createTarget(size);
    this.camera.renderTarget = this.target;
    this.scene.background = this.target.texture;
    previous.dispose();
    this.dirty = true;
  }

  dispose() { this.target.dispose(); }
}
