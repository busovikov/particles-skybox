import * as c from "three/webgpu";
import { Box3 as it, Frustum as rt, Matrix4 as H, Vector3 as P, WebGLCoordinateSystem as nt, WebGPUCoordinateSystem as ot, Quaternion as at, Vector4 as ct, PerspectiveCamera as ut, Group as V } from "three/webgpu";
import { uniformArray as L, instancedArray as S, uniform as g, Fn as E, vec3 as B, sin as I, cos as U, instanceIndex as l, hash as R, PI as D, Loop as ht, uint as _, If as F, mod as q, vec4 as O, mix as T, float as $, positionLocal as X, uv as lt, exp as pt } from "three/tsl";
const dt = 2, mt = "Моя сцена", ft = { attractorMassExponent: 8, particleGlobalMassExponent: 3, maxSpeed: 8, velocityDamping: 0.1, spinningStrength: 4.59, scale: 0.1, boundHalfExtent: 15.89, colorA: "#962eff", colorB: "#ff9c66", timeScale: 0.1, skyFov: 60, viewerReference: !1 }, gt = 2048, bt = !1, yt = "skybox", xt = !1, vt = "scale", wt = { "orbit-camera": { position: [0, -0.07909831471414508, 0], quaternion: [-0.059751229435930364, 0.0050470440816071365, 0.08401643624436621, 0.9946585124391837], scale: [8.925377071000408, 8, 6.878586419515566], phase: 4.590613385988791, speed: 6e-3, enabled: !0 }, "capture-rig": { position: [-1.0688472014706736, -1.0770066876194873, -6.756775741587193], quaternion: [0, 0, -0.3448474894689577, 0.9386587287225092], scale: [1, 1, 1] }, "orbit-0": { position: [-0.17860619515673035, -0.383022221559489, 0], quaternion: [0, 0, -0.21643961393810288, 0.9762960071199334], scale: [0.9063077870366499, 0.9063077870366499, 0.9063077870366499], phase: 0.706080765794068, speed: 0.12, enabled: !0 }, "attractor-0": { position: [0.4464011680361254, -0.6744679414195802, 0.5880637662475189], quaternion: [0, 0, 0.958746087657905, 0.2842638552478729], scale: [1, 1, 1], spinSpeed: 0.08 }, "orbit-1": { position: [0.08332092435893496, -0.35736459782197905, -0.1443160743232787], quaternion: [0.18744220405569356, 0, 0.10821980696905138, 0.9762960071199334], scale: [1.0461935951244519, 1.0461935951244519, 1.0461935951244519], phase: -4.752368473480494, speed: -0.096, enabled: !0 }, "attractor-1": { position: [0.1665667069693944, -0.7311276271773188, 0.8292815715469837], quaternion: [0, 0, 0.38732442518527316, -0.9219434850651053], scale: [1, 1, 1], spinSpeed: -0.064 }, "orbit-2": { position: [-0.018416804250367468, 0.0789899283371657, -0.03189884067468687], quaternion: [-0.1874422040556935, 0, 0.10821980696905154, 0.9762960071199334], scale: [1.1146317223666766, 1.1146317223666766, 1.1146317223666766], phase: 3.070881854150834, speed: 0.078, enabled: !0 }, "attractor-2": { position: [-1.1074151786680757, -0.1271306854639774, 0.08642575350561435], quaternion: [-0.2745065303802807, 0.15699097037214416, -0.19797057915478714, 0.927797202942219], scale: [1, 1, 1], spinSpeed: 0.052 } }, Mt = { spinSpeed: 6e-3, spinAngle: 3.0198170591995566 }, St = { editor: { position: [-32.23452834864988, -2.7805009784612333, 8.051993707569995], quaternion: [0.03289257791385956, -0.6149523541414308, 0.025686880404538766, 0.7874591193383792], scale: [1, 1, 1], zoom: 1, target: [0, 0, 0] }, sky: { position: [7.994222503797211, 1.176624748290207, 28.262063768639617], quaternion: [-0.019828540637126198, 0.13736614150954637, 0.0027503993939213163, 0.9903180334852815], scale: [1, 1, 1], zoom: 1, target: [0, 0, 0] } }, At = "f683f6de-bbb1-4a91-9eb7-e0d52ded4eb7", Bt = {
  version: dt,
  name: mt,
  settings: ft,
  resolution: gt,
  msaa: bt,
  view: yt,
  paused: xt,
  mode: vt,
  objects: wt,
  rig: Mt,
  cameras: St,
  id: At
};
function Ft(i, t) {
  return !Number.isFinite(t) || t <= 0 ? 1 : (1 - (Number.isFinite(i) ? Math.min(1, Math.max(0, i)) : 0)) ** (t * 60);
}
const b = 2 ** 18;
class Pt {
  constructor(t, e, n, s) {
    this.renderer = t, this.settings = s, this.positions = L(n.map((h) => h.position)), this.axes = L(n.map((h) => h.axis)), this.positionBuffer = S(b, "vec3"), this.previousPositionBuffer = S(b, "vec3"), this.velocityBuffer = S(b, "vec3"), this.previousVelocityBuffer = S(b, "vec3");
    const o = this.positionBuffer, r = this.previousPositionBuffer, u = this.velocityBuffer, a = this.uniforms = {
      delta: g(0),
      interpolation: g(0),
      damping: g(1),
      attractorMass: g(10 ** s.attractorMassExponent),
      particleMass: g(10 ** s.particleGlobalMassExponent),
      maxSpeed: g(s.maxSpeed),
      spinningStrength: g(s.spinningStrength),
      scale: g(s.scale),
      boundHalfExtent: g(s.boundHalfExtent),
      colorA: g(new c.Color(s.colorA)),
      colorB: g(new c.Color(s.colorB))
    }, d = () => _(Math.floor(Math.random() * 16777215)), v = E(([h, m]) => B(
      I(h).mul(I(m)),
      U(h),
      I(h).mul(U(m))
    ));
    this.initCompute = E(() => {
      const h = o.element(l), m = u.element(l);
      h.assign(B(
        R(l.add(d())),
        R(l.add(d())),
        R(l.add(d()))
      ).sub(0.5).mul(B(5, 0.2, 5))), r.element(l).assign(h);
      const M = R(l.add(d())).mul(D).mul(2), y = R(l.add(d())).mul(D);
      m.assign(v(M, y).mul(0.05)), this.previousVelocityBuffer.element(l).assign(m);
    })().compute(b).setName("Reset particles");
    const f = R(l.add(d())).remap(0.25, 1);
    this.massMultiplier = f, this.updateCompute = E(() => {
      const h = o.element(l);
      r.element(l).assign(h);
      const m = u.element(l);
      this.previousVelocityBuffer.element(l).assign(m);
      const M = f.mul(a.particleMass).toVar(), y = B(0).toVar();
      ht(_(n.length), ({ i: x }) => {
        const A = this.positions.element(x).sub(h), C = A.dot(A).max(1e-4), N = A.div(C.sqrt()), k = a.attractorMass.mul(M).mul(667e-13).div(C);
        y.addAssign(N.mul(k)), y.addAssign(this.axes.element(x).mul(k).mul(a.spinningStrength).cross(A));
      }), m.addAssign(y.mul(a.delta));
      const w = m.length();
      F(w.greaterThan(a.maxSpeed), () => {
        m.mulAssign(a.maxSpeed.div(w.max(1e-6)));
      }), m.mulAssign(a.damping), h.addAssign(m.mul(a.delta)), F(a.boundHalfExtent.greaterThan(0), () => {
        const x = a.boundHalfExtent.div(2);
        h.assign(q(h.add(x), a.boundHalfExtent).sub(x));
      });
    })().compute(b).setName("Update particles");
    const p = this.material = new c.SpriteNodeMaterial({
      blending: c.AdditiveBlending,
      depthWrite: !1
    });
    p.positionNode = this.interpolatedPosition(), p.colorNode = E(() => {
      const m = this.interpolatedVelocity().length().div(a.maxSpeed.max(1e-6)).smoothstep(0, 0.5);
      return O(T(a.colorA, a.colorB, m), 1);
    })(), p.scaleNode = f.mul(a.scale), this.geometry = new c.PlaneGeometry(1, 1), this.mesh = new c.InstancedMesh(this.geometry, p, b), this.mesh.frustumCulled = !1, e.add(this.mesh), this.reset();
  }
  syncSettings() {
    const t = this.settings, e = this.uniforms;
    e.attractorMass.value = 10 ** t.attractorMassExponent, e.particleMass.value = 10 ** t.particleGlobalMassExponent;
    for (const n of ["maxSpeed", "spinningStrength", "scale", "boundHalfExtent"])
      e[n].value = t[n];
    e.colorA.value.set(t.colorA), e.colorB.value.set(t.colorB);
  }
  interpolatedPosition(t) {
    const e = t === void 0 ? this.previousPositionBuffer.toAttribute().xyz : this.previousPositionBuffer.element(t), n = t === void 0 ? this.positionBuffer.toAttribute().xyz : this.positionBuffer.element(t), s = this.uniforms.boundHalfExtent, o = this.uniforms.interpolation;
    return E(() => {
      const r = T(e, n, o).toVar();
      return F(s.greaterThan(0), () => {
        const u = s.div(2), a = q(n.sub(e).add(u), s).sub(u);
        r.assign(q(e.add(a.mul(o)).add(u), s).sub(u));
      }), r;
    })();
  }
  setInterpolation(t) {
    this.uniforms.interpolation.value = t;
  }
  interpolatedVelocity(t) {
    const e = t === void 0 ? this.previousVelocityBuffer.toAttribute().xyz : this.previousVelocityBuffer.element(t), n = t === void 0 ? this.velocityBuffer.toAttribute().xyz : this.velocityBuffer.element(t);
    return T(e, n, this.uniforms.interpolation);
  }
  update(t) {
    t <= 0 || (this.uniforms.delta.value = t, this.uniforms.damping.value = Ft(this.settings.velocityDamping, t), this.renderer.compute(this.updateCompute));
  }
  reset() {
    this.uniforms.interpolation.value = 0, this.renderer.compute(this.initCompute);
  }
  dispose() {
    this.mesh.removeFromParent(), this.geometry.dispose(), this.material.dispose(), this.initCompute.dispose(), this.updateCompute.dispose();
  }
}
class Rt {
  constructor() {
    this.bounds = new it(), this.bounded = !1, this.frustum = new rt(), this.projectionView = new H(), this.halfSize = new P();
  }
  /**
   * halfExtent is half the periodic domain's side, not the UI's full extent.
   * Supply a conservative world-space billboard padding:
   *   sqrt(2) / 2 * maximumAngularFootprint * farthestCenterDistance.
   * The farthest distance must include the reset cloud as well as the domain.
   * Invalid or unbounded inputs disable culling rather than hide particles.
   */
  setBounds(t, e = 0) {
    return this.bounded = Number.isFinite(t) && t > 0 && Number.isFinite(e) && e >= 0, this.bounded ? (this.halfSize.set(Math.max(t, 2.5), Math.max(t, 0.1), Math.max(t, 2.5)), this.bounds.min.copy(this.halfSize).negate(), this.bounds.max.copy(this.halfSize), this.bounds.expandByScalar(e + 1e-8 * (1 + t + e)), (!Number.isFinite(this.bounds.max.x) || !Number.isFinite(this.bounds.max.y) || !Number.isFinite(this.bounds.max.z)) && (this.bounded = !1), this) : (this.bounds.makeEmpty(), this);
  }
  intersects(t) {
    if (!this.bounded || !t?.isCamera || t.coordinateSystem !== nt && t.coordinateSystem !== ot || (t.updateWorldMatrix(!0, !1), this.projectionView.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), !this.projectionView.elements.every(Number.isFinite))) return !0;
    this.frustum.setFromProjectionMatrix(this.projectionView, t.coordinateSystem, t.reversedDepth);
    for (const e of this.frustum.planes)
      if (!Number.isFinite(e.constant) || !Number.isFinite(e.normal.x) || !Number.isFinite(e.normal.y) || !Number.isFinite(e.normal.z)) return !0;
    return this.frustum.intersectsBox(this.bounds);
  }
}
class Et {
  constructor(t, e, n) {
    this.renderer = t, this.settings = n, this.scene = new c.Scene(), this.scene.background = new c.Color(0), this.origin = g(new c.Vector3()), this.minimumFootprint = g(8 / 2048);
    const s = S(b, "vec4"), o = S(b, "vec3"), r = S(b, "vec3"), u = this.radiance = S(b, "vec3");
    this.preparedBuffers = { centerSize: s, directions: o, tangents: r, radiance: u };
    const a = e.uniforms;
    this.compute = E(() => {
      const M = e.interpolatedPosition(l).toVar(), y = M.sub(this.origin).toVar(), w = y.length().max(1e-5), x = y.div(w).toVar();
      F(y.dot(y).lessThan(1e-10), () => {
        x.assign(B(0, 0, 1));
      });
      const A = B(0, 1, 0).toVar();
      F(x.y.abs().greaterThan(0.95), () => {
        A.assign(B(1, 0, 0));
      });
      const C = A.cross(x).normalize(), N = e.massMultiplier.mul(a.scale).div(w).min(2e-3), k = N.max(this.minimumFootprint), tt = N.div(k).pow(2), z = $(1).toVar();
      F(a.boundHalfExtent.greaterThan(0), () => {
        z.assign(a.boundHalfExtent.div(8).min(1));
      });
      const G = w.smoothstep(z.mul(0.4), z.mul(0.9)).toVar();
      F(a.boundHalfExtent.greaterThan(0), () => {
        const W = M.abs(), st = a.boundHalfExtent.div(2).sub(W.x.max(W.y).max(W.z));
        G.mulAssign(st.smoothstep(0, a.boundHalfExtent.mul(0.08)));
      });
      const et = e.interpolatedVelocity(l).length().div(a.maxSpeed.max(1e-6)).smoothstep(0, 0.5);
      s.element(l).assign(O(M, k.mul(w))), o.element(l).assign(x), r.element(l).assign(C), u.element(l).assign(T(a.colorA, a.colorB, et).mul(tt).mul(G).mul(6));
    })().compute(b).setName("Filter particles for six perspective captures");
    const d = this.material = new c.MeshBasicNodeMaterial({
      transparent: !0,
      blending: c.AdditiveBlending,
      depthWrite: !1,
      depthTest: !1,
      side: c.DoubleSide,
      forceSinglePass: !0
    }), v = s.toAttribute(), f = r.toAttribute().xyz, p = o.toAttribute().xyz.cross(f);
    d.positionNode = v.xyz.add(
      f.mul(X.x).add(p.mul(X.y)).mul(v.w)
    );
    const h = lt().sub(0.5).mul(2), m = pt(h.dot(h).mul(-8)).sub(Math.exp(-8)).max(0);
    d.colorNode = O(u.toAttribute().xyz.mul(m), $(1)), this.geometry = new c.PlaneGeometry(1, 1), this.mesh = new c.InstancedMesh(this.geometry, d, b), this.mesh.frustumCulled = !1, this.scene.add(this.mesh), this.culling = new Rt(), this.scene.onBeforeRender = (M, y, w) => {
      this.mesh.visible = this.culling.intersects(w);
    };
  }
  update(t, e, n = 0) {
    this.origin.value.copy(t), this.minimumFootprint.value = Math.max(8 / e, 4 * n);
    const s = this.settings.boundHalfExtent / 2, o = Math.hypot(
      Math.abs(t.x) + Math.max(s, 2.5),
      Math.abs(t.y) + Math.max(s, 0.1),
      Math.abs(t.z) + Math.max(s, 2.5)
    );
    this.culling.setBounds(s, Math.SQRT1_2 * Math.max(this.minimumFootprint.value, 2e-3) * o), this.renderer.compute(this.compute);
  }
  dispose() {
    this.mesh.removeFromParent(), this.geometry.dispose(), this.material.dispose(), this.compute.dispose();
  }
}
const kt = new c.Quaternion(), Ct = new c.Vector3();
function Nt(i, t) {
  return i.equals(t) || i.x === -t.x && i.y === -t.y && i.z === -t.z && i.w === -t.w;
}
function Z(i) {
  return new c.WebGLCubeRenderTarget(i, {
    type: c.HalfFloatType,
    minFilter: c.LinearFilter,
    magFilter: c.LinearFilter,
    generateMipmaps: !1,
    depthBuffer: !1
  });
}
let Vt = class {
  constructor(t, e, n = 2048) {
    this.renderer = t, this.sourceScene = e, this.target = Z(n), this.camera = new c.CubeCamera(0.01, 1e3, this.target), this.camera.layers.set(0), this.scene = new c.Scene(), this.scene.background = this.target.texture, this.scene.backgroundBlurriness = 0, this.capturePosition = new c.Vector3(), this.captureQuaternion = new c.Quaternion(), this.dirty = !0, this.captureCount = 0, this.staleFaces = Array(6).fill(!0);
  }
  update(t = Ct, e = kt, n = !0, s = Array(6).fill(!0)) {
    this.scene.backgroundRotation.set(0, 0, 0);
    const o = !this.capturePosition.equals(t) || !Nt(this.captureQuaternion, e);
    if ((n || this.dirty || o) && this.staleFaces.fill(!0), !s.some((p, h) => p && this.staleFaces[h])) return !1;
    this.camera.position.copy(t), this.camera.quaternion.copy(e), this.camera.updateWorldMatrix(!0, !0);
    const r = this.renderer, u = r.getRenderTarget(), a = r.getActiveCubeFace(), d = r.getActiveMipmapLevel(), v = r.xr.enabled, f = this.target.texture.generateMipmaps;
    this.dirty = !0;
    try {
      this.camera.coordinateSystem !== r.coordinateSystem && (this.camera.coordinateSystem = r.coordinateSystem, this.camera.updateCoordinateSystem()), this.camera.updateWorldMatrix(!0, !0), r.xr.enabled = !1, this.target.texture.generateMipmaps = !1;
      for (let p = 0; p < 6; p++) {
        const h = r.coordinateSystem === c.WebGPUCoordinateSystem && p < 2 ? 1 - p : p;
        !s[h] || !this.staleFaces[h] || (r.setRenderTarget(this.target, p, this.camera.activeMipmapLevel), r.render(this.sourceScene, this.camera.children[p]), this.staleFaces[h] = !1);
      }
      this.target.texture.needsPMREMUpdate = !0;
    } finally {
      (r.getRenderTarget() !== u || r.getActiveCubeFace() !== a || r.getActiveMipmapLevel() !== d) && r.setRenderTarget(u, a, d), r.xr.enabled = v, this.target.texture.generateMipmaps = f;
    }
    return this.capturePosition.copy(t), this.captureQuaternion.copy(e), this.captureCount++, this.dirty = !1, !0;
  }
  setResolution(t) {
    if (![256, 512, 1024, 2048].includes(t)) throw new RangeError("Unsupported skybox resolution");
    if (t === this.target.width) return;
    const e = this.target;
    this.target = Z(t), this.camera.renderTarget = this.target, this.scene.background = this.target.texture, e.dispose(), this.dirty = !0;
  }
  dispose() {
    this.target.dispose();
  }
};
class Tt {
  constructor({ step: t = 1 / 120, maxSteps: e = 6 } = {}) {
    if (!Number.isFinite(t) || t <= 0)
      throw new RangeError("step must be a positive, finite number of seconds.");
    if (!Number.isSafeInteger(e) || e < 1)
      throw new RangeError("maxSteps must be a positive, safe integer.");
    this.step = t, this.maxSteps = e, this.reset();
  }
  /**
   * Advance with already-scaled simulation time, never wall-clock timestamps.
   * Render between the previous and current physics states using alpha.
   * A pause preserves that exact interpolated position without building debt.
   */
  advance(t) {
    let e = 0;
    if (Number.isFinite(t) && t > 0) {
      const n = this.accumulator + t, s = 1e-10, o = Math.floor(n / this.step + s);
      o > 0 ? (e = Math.min(this.maxSteps, o), this.accumulator = n % this.step, this.accumulator / this.step >= 1 - s && (this.accumulator = 0)) : this.accumulator = n;
    }
    return {
      steps: e,
      alpha: this.accumulator / this.step,
      stepDelta: this.step
    };
  }
  reset() {
    this.accumulator = 0;
  }
}
const zt = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((i, t) => {
  const e = new ut();
  return t === 2 && e.up.set(0, 0, -1), t === 3 && e.up.set(0, 0, 1), e.lookAt(new P(...i)), [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([n, s]) => new P(n, s, -1).applyQuaternion(e.quaternion));
});
function Wt(i) {
  i.updateWorldMatrix(!0, !1);
  const t = i.getWorldQuaternion(new at()).invert(), e = new H().multiplyMatrices(i.projectionMatrix, new H().makeRotationFromQuaternion(t));
  if (!e.elements.every(Number.isFinite)) return Array(6).fill(!0);
  const n = [
    (s) => s.w,
    (s) => s.w * 1.01 + s.x,
    (s) => s.w * 1.01 - s.x,
    (s) => s.w * 1.01 + s.y,
    (s) => s.w * 1.01 - s.y
  ];
  return zt.map((s) => {
    let o = s.map((r) => new ct(r.x, r.y, r.z, 0).applyMatrix4(e));
    for (const r of n) {
      const u = [];
      for (let a = 0; a < o.length; a++) {
        const d = o[a], v = o[(a + 1) % o.length], f = r(d), p = r(v);
        f >= 0 && u.push(d), f >= 0 != p >= 0 && u.push(d.clone().lerp(v, f / (f - p)));
      }
      if (o = u, !o.length) return !1;
    }
    return !0;
  });
}
const It = new P(0, 1, 0);
function j(i, t) {
  if (!t) throw new TypeError("Missing orbit or attractor pose in preset");
  i.position.fromArray(t.position), i.quaternion.fromArray(t.quaternion).normalize(), i.scale.fromArray(t.scale);
}
class J extends V {
  constructor(t) {
    super(), j(this, t), this.phase = t.phase, this.speed = t.speed, this.enabled = t.enabled, this.radiusShape = this.radius > 0 ? this.scale.clone().divideScalar(this.radius) : new P(1, 1, 1);
  }
  advance(t) {
    this.enabled && (this.phase = (this.phase + this.speed * t) % (Math.PI * 2));
  }
  samplePosition(t) {
    return this.updateWorldMatrix(!0, !1), t.set(Math.cos(this.phase), 0, Math.sin(this.phase)).applyMatrix4(this.matrixWorld);
  }
  get radius() {
    return (Math.abs(this.scale.x) + Math.abs(this.scale.z)) / 2;
  }
  set radius(t) {
    if (!Number.isFinite(t) || t < 0) throw new RangeError("Orbit radius must be finite and non-negative");
    const e = this.radius;
    e > 0 && this.radiusShape.copy(this.scale).divideScalar(e), this.scale.copy(this.radiusShape).multiplyScalar(t);
  }
}
function qt(i) {
  const t = new J(i.objects["orbit-camera"]), e = new V();
  j(e, i.objects["capture-rig"]);
  const n = new V();
  e.add(n), n.rotation.y = i.rig.spinAngle;
  const s = [0, 1, 2].map((r) => {
    const u = new V();
    return j(u, i.objects[`attractor-${r}`]), { orbit: new J(i.objects[`orbit-${r}`]), reference: u, position: new P(), axis: new P(), spinSpeed: i.objects[`attractor-${r}`].spinSpeed };
  }), o = { cameraOrbit: t, captureRig: e, spinRoot: n, attractors: s, spinSpeed: i.rig.spinSpeed, spinAngle: i.rig.spinAngle };
  return Q(o), o;
}
function Q(i) {
  i.cameraOrbit.samplePosition(i.captureRig.position);
  for (const t of i.attractors)
    t.orbit.samplePosition(t.reference.position), t.position.copy(t.reference.position), t.axis.copy(It).applyQuaternion(t.reference.quaternion).normalize();
}
function K(i, t) {
  i.cameraOrbit.advance(t), i.spinAngle = (i.spinAngle + i.spinSpeed * t) % (Math.PI * 2), i.spinRoot.rotation.y = i.spinAngle;
  for (const e of i.attractors)
    e.orbit.advance(t), e.reference.rotateZ(e.spinSpeed * t);
  Q(i);
}
class Y {
  static async create(t) {
    if (!t?.renderer?.compute || !t.scene?.isScene) throw new TypeError("Provide a Three.js WebGPURenderer and Scene");
    t.renderer._initialized || await t.renderer.init();
    const e = new Y(t);
    try {
      if (t.signal?.aborted) throw new DOMException("Warmup aborted", "AbortError");
      return t.warmup && await e.warmup(t.warmup, { onProgress: t.onProgress, signal: t.signal, batchSize: t.batchSize }), e.capture(t.camera, !0), e.attach(t.scene), e;
    } catch (n) {
      throw e.dispose(), n;
    }
  }
  constructor({ renderer: t, scene: e, camera: n, preset: s = Bt, resolution: o = s.resolution }) {
    if (![256, 512, 1024, 2048].includes(o)) throw new RangeError("Resolution must be 256, 512, 1024 or 2048");
    this.renderer = t, this.scene = e, this.camera = n, this.disposed = !1, this.time = 0, this.preset = structuredClone(s), this.settings = { ...s.settings }, this.motion = qt(s), this.cameraOrbit = this.motion.cameraOrbit, this.attractors = this.motion.attractors, this.fixed = new Tt(), this.position = new c.Vector3(), this.rotation = new c.Quaternion(), this.particles = new Pt(t, new c.Scene(), this.attractors, this.settings), this.captureParticles = new Et(t, this.particles, this.settings), this.cube = new Vt(t, this.captureParticles.scene, o), this.ready = !1, this.previousBackground = null, this.previousRotation = null;
  }
  get texture() {
    return this.cube.target.texture;
  }
  get cameraOrbitRadius() {
    return this.cameraOrbit.radius;
  }
  set cameraOrbitRadius(t) {
    this.assertAlive(), this.cameraOrbit.radius = t, Q(this.motion), this.cube.dirty = !0;
  }
  assertAlive() {
    if (this.disposed) throw new Error("ParticleSkybox has been disposed");
  }
  attach(t) {
    if (this.assertAlive(), this.ready) throw new Error("Skybox is already attached");
    this.scene = t, this.previousBackground = t.background, this.previousRotation = t.backgroundRotation.clone(), this.previousBlurriness = t.backgroundBlurriness, this.previousIntensity = t.backgroundIntensity, t.background = this.texture, t.backgroundRotation.set(0, 0, 0), t.backgroundBlurriness = 0, t.backgroundIntensity = 1, this.ready = !0;
  }
  setSpeed(t) {
    if (this.assertAlive(), !Number.isFinite(t) || t < 0 || t > 1) throw new RangeError("Simulation speed must be between 0 and 1");
    this.settings.timeScale = t;
  }
  setColors(t, e = this.settings.colorB) {
    this.assertAlive(), this.settings.colorA = t, this.settings.colorB = e, this.particles.syncSettings(), this.cube.dirty = !0;
  }
  capture(t = this.camera, e = !0) {
    this.assertAlive(), this.motion.spinRoot.getWorldPosition(this.position), this.motion.spinRoot.getWorldQuaternion(this.rotation);
    const s = this.renderer.getRenderTarget()?.height ?? this.renderer.getDrawingBufferSize(new c.Vector2()).y, o = t?.isPerspectiveCamera ? 2 * Math.tan(c.MathUtils.degToRad(t.fov) / 2) / Math.max(1, s) : 0;
    (e || this.cube.dirty) && this.captureParticles.update(this.position, this.cube.target.width, o), this.cube.update(this.position, this.rotation, e, t ? Wt(t) : Array(6).fill(!0));
  }
  /** realDelta is wall-clock seconds; the preset's timeScale is applied here. */
  update(t, e = this.camera) {
    if (this.assertAlive(), !Number.isFinite(t) || t < 0) throw new RangeError("Delta must be finite, non-negative seconds");
    const n = Math.min(t, 0.05) * this.settings.timeScale;
    K(this.motion, n);
    const { steps: s, alpha: o, stepDelta: r } = this.fixed.advance(n);
    for (let u = 0; u < s; u++) this.particles.update(r);
    n > 0 && this.particles.setInterpolation(o), this.time += s * r, this.capture(e, n > 0);
  }
  /** Simulation seconds, independent of the playback speed. No intermediate captures. */
  async warmup(t, { onProgress: e, signal: n, batchSize: s = 32 } = {}) {
    if (this.assertAlive(), !Number.isFinite(t) || t < 0 || t > 300) throw new RangeError("Warmup must be between 0 and 300 simulation seconds");
    if (!Number.isSafeInteger(s) || s < 1) throw new RangeError("batchSize must be a positive integer");
    const o = Math.ceil(t / this.fixed.step);
    for (let r = 0; r < o; r++) {
      if (n?.aborted) throw new DOMException("Warmup aborted", "AbortError");
      K(this.motion, this.fixed.step), this.particles.update(this.fixed.step), this.time += this.fixed.step, (r + 1) % s === 0 && (e?.((r + 1) / o), await new Promise((u) => setTimeout(u, 0)), this.assertAlive());
    }
    this.fixed.reset(), this.particles.setInterpolation(1), this.cube.dirty = !0, e?.(1), this.ready && this.capture(this.camera, !0);
  }
  dispose() {
    if (this.disposed) return;
    this.ready && this.scene.background === this.texture && (this.scene.background = this.previousBackground, this.scene.backgroundRotation.copy(this.previousRotation), this.scene.backgroundBlurriness = this.previousBlurriness, this.scene.backgroundIntensity = this.previousIntensity);
    const t = [this.particles.positionBuffer, this.particles.previousPositionBuffer, this.particles.velocityBuffer, this.particles.previousVelocityBuffer, ...Object.values(this.captureParticles.preparedBuffers ?? {})];
    this.particles.dispose(), this.captureParticles.dispose();
    for (const e of t) e?.value && this.renderer._attributes?.delete(e.value);
    this.cube.dispose(), this.disposed = !0;
  }
}
export {
  b as PARTICLE_COUNT,
  Y as ParticleSkybox,
  Bt as currentPreset
};
