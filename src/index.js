import * as THREE from 'three/webgpu';
import currentPreset from './current-preset.json' with {type:'json'};
import {AttractorParticles,PARTICLE_COUNT} from './internal/particles.js';
import {CaptureParticles} from './internal/capture-particles.js';
import {ParticleSkybox as CubeCapture} from './internal/skybox.js';
import {FixedStepSimulation} from './internal/fixed-step.js';
import {visibleSkyboxFaces} from './internal/viewer-face-culling.js';
import {createMotion,syncMotion,advanceMotion} from './motion.js';
export {currentPreset,PARTICLE_COUNT};

/** Owns simulation/capture resources. The host owns its renderer, scene and loop. */
export class ParticleSkybox{
  static async create(options){
    if(!options?.renderer?.compute||!options.scene?.isScene)throw new TypeError('Provide a Three.js WebGPURenderer and Scene');
    // r180 init() throws on an already initialized host renderer.
    if(!options.renderer._initialized)await options.renderer.init();
    const effect=new ParticleSkybox(options);
    try{
      if(options.signal?.aborted)throw new DOMException('Warmup aborted','AbortError');
      if(options.warmup)await effect.warmup(options.warmup,{onProgress:options.onProgress,signal:options.signal,batchSize:options.batchSize});
      effect.capture(options.camera,true);
      effect.attach(options.scene);
      return effect;
    }catch(error){effect.dispose();throw error;}
  }
  constructor({renderer,scene,camera,preset=currentPreset,resolution=preset.resolution}){
    if(![256,512,1024,2048].includes(resolution))throw new RangeError('Resolution must be 256, 512, 1024 or 2048');
    this.renderer=renderer;this.scene=scene;this.camera=camera;this.disposed=false;this.time=0;
    this.preset=structuredClone(preset);this.settings={...preset.settings};this.motion=createMotion(preset);
    this.cameraOrbit=this.motion.cameraOrbit;this.attractors=this.motion.attractors;this.fixed=new FixedStepSimulation();
    this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();
    this.particles=new AttractorParticles(renderer,new THREE.Scene(),this.attractors,this.settings);
    this.captureParticles=new CaptureParticles(renderer,this.particles,this.settings);
    this.cube=new CubeCapture(renderer,this.captureParticles.scene,resolution);
    this.ready=false;this.previousBackground=null;this.previousRotation=null;
  }
  get texture(){return this.cube.target.texture;}
  get cameraOrbitRadius(){return this.cameraOrbit.radius;}
  set cameraOrbitRadius(radius){this.assertAlive();this.cameraOrbit.radius=radius;syncMotion(this.motion);this.cube.dirty=true;}
  assertAlive(){if(this.disposed)throw new Error('ParticleSkybox has been disposed');}
  attach(scene){
    this.assertAlive();if(this.ready)throw new Error('Skybox is already attached');
    this.scene=scene;this.previousBackground=scene.background;this.previousRotation=scene.backgroundRotation.clone();
    this.previousBlurriness=scene.backgroundBlurriness;this.previousIntensity=scene.backgroundIntensity;
    scene.background=this.texture;scene.backgroundRotation.set(0,0,0);scene.backgroundBlurriness=0;scene.backgroundIntensity=1;this.ready=true;
  }
  setSpeed(value){this.assertAlive();if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('Simulation speed must be between 0 and 1');this.settings.timeScale=value;}
  setColors(colorA,colorB=this.settings.colorB){this.assertAlive();this.settings.colorA=colorA;this.settings.colorB=colorB;this.particles.syncSettings();this.cube.dirty=true;}
  capture(camera=this.camera,changed=true){
    this.assertAlive();this.motion.spinRoot.getWorldPosition(this.position);this.motion.spinRoot.getWorldQuaternion(this.rotation);
    const target=this.renderer.getRenderTarget();
    const height=target?.height??this.renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    const pixelAngle=camera?.isPerspectiveCamera?2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.max(1,height):0;
    if(changed||this.cube.dirty)this.captureParticles.update(this.position,this.cube.target.width,pixelAngle);
    this.cube.update(this.position,this.rotation,changed,camera?visibleSkyboxFaces(camera):Array(6).fill(true));
  }
  /** realDelta is wall-clock seconds; the preset's timeScale is applied here. */
  update(realDelta,camera=this.camera){
    this.assertAlive();if(!Number.isFinite(realDelta)||realDelta<0)throw new RangeError('Delta must be finite, non-negative seconds');
    const delta=Math.min(realDelta,.05)*this.settings.timeScale;
    advanceMotion(this.motion,delta);const {steps,alpha,stepDelta}=this.fixed.advance(delta);
    for(let i=0;i<steps;i++)this.particles.update(stepDelta);
    if(delta>0)this.particles.setInterpolation(alpha);this.time+=steps*stepDelta;this.capture(camera,delta>0);
  }
  /** Simulation seconds, independent of the playback speed. No intermediate captures. */
  async warmup(seconds,{onProgress,signal,batchSize=32}={}){
    this.assertAlive();if(!Number.isFinite(seconds)||seconds<0||seconds>300)throw new RangeError('Warmup must be between 0 and 300 simulation seconds');
    if(!Number.isSafeInteger(batchSize)||batchSize<1)throw new RangeError('batchSize must be a positive integer');
    const steps=Math.ceil(seconds/this.fixed.step);
    for(let i=0;i<steps;i++){
      if(signal?.aborted)throw new DOMException('Warmup aborted','AbortError');
      advanceMotion(this.motion,this.fixed.step);this.particles.update(this.fixed.step);this.time+=this.fixed.step;
      if((i+1)%batchSize===0){onProgress?.((i+1)/steps);await new Promise(resolve=>setTimeout(resolve,0));this.assertAlive();}
    }
    this.fixed.reset();this.particles.setInterpolation(1);this.cube.dirty=true;onProgress?.(1);
    if(this.ready)this.capture(this.camera,true);
  }
  dispose(){
    if(this.disposed)return;
    if(this.ready&&this.scene.background===this.texture){this.scene.background=this.previousBackground;this.scene.backgroundRotation.copy(this.previousRotation);this.scene.backgroundBlurriness=this.previousBlurriness;this.scene.backgroundIntensity=this.previousIntensity;}
    const buffers=[this.particles.positionBuffer,this.particles.previousPositionBuffer,this.particles.velocityBuffer,this.particles.previousVelocityBuffer,...Object.values(this.captureParticles.preparedBuffers??{})];
    this.particles.dispose();this.captureParticles.dispose();
    // r180 has no public BufferAttribute.dispose(). Its attribute manager safely
    // releases compute-only storage too, skipping anything geometry already freed.
    for(const node of buffers)if(node?.value)this.renderer._attributes?.delete(node.value);
    this.cube.dispose();this.disposed=true;
  }
}
