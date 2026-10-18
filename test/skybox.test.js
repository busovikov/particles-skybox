import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3,Quaternion,Color} from 'three/webgpu';
import {ParticleSkybox,currentPreset,PARTICLE_COUNT} from '../src/index.js';
import {createMotion,advanceMotion} from '../src/motion.js';
import {FixedStepSimulation} from '../src/internal/fixed-step.js';

test('the published preset preserves all three attractors and the edited elliptical camera orbit',()=>{
  const motion=createMotion(currentPreset),source=currentPreset.objects['orbit-camera'];
  assert.equal(PARTICLE_COUNT,262144);assert.equal(motion.attractors.length,3);
  assert.deepEqual(motion.cameraOrbit.scale.toArray(),source.scale);
  assert.notEqual(source.scale[0],source.scale[2]);
  assert.equal(motion.cameraOrbit.phase,source.phase);assert.equal(motion.spinAngle,currentPreset.rig.spinAngle);
  motion.attractors.forEach((a,i)=>{
    assert.equal(a.spinSpeed,currentPreset.objects[`attractor-${i}`].spinSpeed);
    assert.ok(Math.abs(a.axis.length()-1)<1e-12);
  });
  const before=motion.cameraOrbit.scale.clone(),radius=motion.cameraOrbit.radius;
  motion.cameraOrbit.radius=radius*2;assert.ok(motion.cameraOrbit.scale.distanceTo(before.multiplyScalar(2))<1e-12);
  assert.throws(()=>motion.cameraOrbit.radius=-1,RangeError);
});
test('motion advances phase and local-axis spin while preserving orbit transforms',()=>{
  const motion=createMotion(currentPreset),initial=motion.cameraOrbit.position.clone(),tilt=motion.cameraOrbit.quaternion.clone();
  const before=motion.attractors[0].reference.quaternion.clone(),phase=motion.cameraOrbit.phase;
  advanceMotion(motion,.25);
  assert.equal(motion.cameraOrbit.phase,(phase+motion.cameraOrbit.speed*.25)%(Math.PI*2));
  assert.deepEqual(motion.cameraOrbit.position.toArray(),initial.toArray());
  assert.deepEqual(motion.cameraOrbit.quaternion.toArray(),tilt.toArray());
  const expected=before.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),motion.attractors[0].spinSpeed*.25));
  assert.ok(Math.abs(expected.dot(motion.attractors[0].reference.quaternion))>1-1e-12);
});
function mockEffect(){
  const effect=Object.create(ParticleSkybox.prototype);
  Object.assign(effect,{disposed:false,ready:false,time:0,fixed:new FixedStepSimulation(),motion:createMotion(currentPreset),cube:{dirty:false},steps:[],alphas:[],captures:0});
  effect.particles={update:delta=>effect.steps.push(delta),setInterpolation:alpha=>effect.alphas.push(alpha)};
  effect.capture=()=>effect.captures++;return effect;
}
test('warmup runs fixed simulation steps independent of playback speed, without intermediate captures',async()=>{
  const effect=mockEffect();effect.settings={timeScale:0};const progress=[];
  await effect.warmup(.5,{batchSize:13,onProgress:p=>progress.push(p)});
  assert.equal(effect.steps.length,60);assert.ok(effect.steps.every(dt=>dt===1/120));
  assert.ok(Math.abs(effect.time-.5)<1e-12);assert.equal(effect.captures,0);
  assert.deepEqual(effect.alphas,[1]);assert.equal(progress.at(-1),1);assert.equal(effect.cube.dirty,true);
});
test('warmup cancels and invalid durations do not submit any simulation work',async()=>{
  const effect=mockEffect(),controller=new AbortController();controller.abort();
  await assert.rejects(effect.warmup(10,{signal:controller.signal}),{name:'AbortError'});
  await assert.rejects(effect.warmup(-1),RangeError);await assert.rejects(effect.warmup(Infinity),RangeError);
  assert.equal(effect.steps.length,0);
});
test('speed is applied once, long frame gaps are capped, and zero delta preserves interpolation',()=>{
  const effect=mockEffect();effect.settings={timeScale:.1};effect.update(.05);
  assert.equal(effect.steps.length,0);effect.update(.05);assert.equal(effect.steps.length,1);
  const count=effect.alphas.length;effect.update(0);assert.equal(effect.alphas.length,count);
  effect.update(60);assert.equal(effect.steps.length,1);
  assert.throws(()=>effect.update(-1),RangeError);assert.throws(()=>effect.setSpeed(2),RangeError);
});
test('dispose restores the host world and never disposes its renderer',()=>{
  const effect=mockEffect(),scene=new Scene(),texture={},background=new Color('red');
  effect.scene=scene;effect.cube={target:{texture},dispose(){}};effect.previousBackground=background;effect.previousRotation=scene.backgroundRotation.clone();effect.previousIntensity=.7;effect.previousBlurriness=.2;effect.ready=true;
  effect.renderer={};effect.particles.dispose=()=>{};effect.captureParticles={dispose(){}};scene.background=texture;
  effect.dispose();assert.equal(scene.background,background);assert.equal(scene.backgroundIntensity,.7);assert.equal(scene.backgroundBlurriness,.2);
  effect.dispose();assert.throws(()=>effect.update(0),/disposed/);
});
