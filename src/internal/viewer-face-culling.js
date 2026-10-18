import { Matrix4, PerspectiveCamera, Quaternion, Vector3, Vector4 } from 'three/webgpu';

const faces = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map((axis, i) => {
  const camera = new PerspectiveCamera();
  if (i === 2) camera.up.set(0,0,-1);
  if (i === 3) camera.up.set(0,0,1);
  camera.lookAt(new Vector3(...axis));
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => new Vector3(x,y,-1).applyQuaternion(camera.quaternion));
});

// Clip each directional cube face against the viewer's infinite view cone.
// Translation and capture-rig rotation do not change cubemap lookup directions.
export function visibleSkyboxFaces(camera) {
  camera.updateWorldMatrix(true, false);
  const inverseRotation = camera.getWorldQuaternion(new Quaternion()).invert();
  const matrix = new Matrix4().multiplyMatrices(camera.projectionMatrix, new Matrix4().makeRotationFromQuaternion(inverseRotation));
  if (!matrix.elements.every(Number.isFinite)) return Array(6).fill(true);
  // A small overlap includes linear-filter taps on shared cube edges.
  const planes = [v => v.w, v => v.w * 1.01 + v.x, v => v.w * 1.01 - v.x,
    v => v.w * 1.01 + v.y, v => v.w * 1.01 - v.y];
  return faces.map(corners => {
    let polygon = corners.map(p => new Vector4(p.x,p.y,p.z,0).applyMatrix4(matrix));
    for (const distance of planes) {
      const clipped = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const da = distance(a), db = distance(b);
        if (da >= 0) clipped.push(a);
        if ((da >= 0) !== (db >= 0)) clipped.push(a.clone().lerp(b, da / (da - db)));
      }
      polygon = clipped;
      if (!polygon.length) return false;
    }
    return true;
  });
}
