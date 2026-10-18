import { Box3, Frustum, Matrix4, Vector3, WebGLCoordinateSystem, WebGPUCoordinateSystem } from 'three/webgpu';

/**
 * Reject only cubemap faces whose complete particle cloud is outside the frustum.
 * No GPU readback is needed: periodic wrapping guarantees the center bounds.
 * Keep rendering/clearing all six faces; skip only their particle draw calls.
 */
export class CaptureFaceCulling {
  constructor() {
    this.bounds = new Box3();
    this.bounded = false;
    this.frustum = new Frustum();
    this.projectionView = new Matrix4();
    this.halfSize = new Vector3();
  }

  /**
   * halfExtent is half the periodic domain's side, not the UI's full extent.
   * Supply a conservative world-space billboard padding:
   *   sqrt(2) / 2 * maximumAngularFootprint * farthestCenterDistance.
   * The farthest distance must include the reset cloud as well as the domain.
   * Invalid or unbounded inputs disable culling rather than hide particles.
   */
  setBounds(halfExtent, padding = 0) {
    this.bounded = Number.isFinite(halfExtent) && halfExtent > 0
      && Number.isFinite(padding) && padding >= 0;
    if (!this.bounded) {
      this.bounds.makeEmpty();
      return this;
    }

    // Reset positions occupy ±2.5, ±0.1, ±2.5 before the first physics step.
    this.halfSize.set(Math.max(halfExtent, 2.5), Math.max(halfExtent, 0.1), Math.max(halfExtent, 2.5));
    this.bounds.min.copy(this.halfSize).negate();
    this.bounds.max.copy(this.halfSize);
    // Include a small numerical margin at shared cubemap edges.
    this.bounds.expandByScalar(padding + 1e-8 * (1 + halfExtent + padding));
    if (!Number.isFinite(this.bounds.max.x) || !Number.isFinite(this.bounds.max.y)
      || !Number.isFinite(this.bounds.max.z)) this.bounded = false;
    return this;
  }

  intersects(camera) {
    if (!this.bounded || !camera?.isCamera) return true;
    if (camera.coordinateSystem !== WebGLCoordinateSystem
      && camera.coordinateSystem !== WebGPUCoordinateSystem) return true;
    camera.updateWorldMatrix(true, false);
    this.projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (!this.projectionView.elements.every(Number.isFinite)) return true;
    this.frustum.setFromProjectionMatrix(this.projectionView, camera.coordinateSystem, camera.reversedDepth);
    for (const plane of this.frustum.planes) {
      if (!Number.isFinite(plane.constant) || !Number.isFinite(plane.normal.x)
        || !Number.isFinite(plane.normal.y) || !Number.isFinite(plane.normal.z)) return true;
    }
    return this.frustum.intersectsBox(this.bounds);
  }
}
