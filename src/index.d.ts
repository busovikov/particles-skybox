import type {Scene,PerspectiveCamera,Camera,Texture,WebGPURenderer,Group,Vector3,Quaternion} from 'three/webgpu';
export interface Pose {position:number[];quaternion:number[];scale:number[];phase?:number;speed?:number;enabled?:boolean;spinSpeed?:number}
export interface SkyboxPreset {version:number;name:string;settings:{attractorMassExponent:number;particleGlobalMassExponent:number;maxSpeed:number;velocityDamping:number;spinningStrength:number;scale:number;boundHalfExtent:number;colorA:string;colorB:string;timeScale:number;skyFov?:number;viewerReference?:boolean};objects:Record<string,Pose>;rig:{spinSpeed:number;spinAngle:number};resolution:number;cameras?:Record<string,Pose & {zoom:number;target:number[]}>}
export interface WarmupOptions {onProgress?:(fraction:number)=>void;signal?:AbortSignal;batchSize?:number}
export interface SkyboxOptions extends WarmupOptions {renderer:WebGPURenderer;scene:Scene;camera?:Camera;preset?:SkyboxPreset;resolution?:256|512|1024|2048;warmup?:number}
export declare const currentPreset:SkyboxPreset;
export declare const PARTICLE_COUNT:number;
export declare class ParticleSkybox {
  static create(options:SkyboxOptions):Promise<ParticleSkybox>;
  constructor(options:SkyboxOptions);
  readonly texture:Texture;
  readonly time:number;
  readonly disposed:boolean;
  readonly ready:boolean;
  readonly settings:SkyboxPreset['settings'];
  readonly position:Vector3;
  readonly rotation:Quaternion;
  readonly cameraOrbit:Group & {radius:number;phase:number;speed:number;enabled:boolean};
  readonly attractors:Array<{orbit:Group & {phase:number;speed:number;enabled:boolean};reference:Group;position:Vector3;axis:Vector3;spinSpeed:number}>;
  cameraOrbitRadius:number;
  attach(scene:Scene):void;
  update(realDeltaSeconds:number,camera?:Camera):void;
  capture(camera?:Camera,changed?:boolean):void;
  warmup(simulationSeconds:number,options?:WarmupOptions):Promise<void>;
  setSpeed(scale:number):void;
  setColors(slowColor:string,fastColor?:string):void;
  dispose():void;
}
