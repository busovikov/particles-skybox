import {Group,Vector3} from 'three/webgpu';
const up=new Vector3(0,1,0);
export function restorePose(object,pose){
  if(!pose)throw new TypeError('Missing orbit or attractor pose in preset');
  object.position.fromArray(pose.position);object.quaternion.fromArray(pose.quaternion).normalize();object.scale.fromArray(pose.scale);
}
export class ParticleOrbit extends Group{
  constructor(pose){super();restorePose(this,pose);this.phase=pose.phase;this.speed=pose.speed;this.enabled=pose.enabled;}
  advance(delta){if(this.enabled)this.phase=(this.phase+this.speed*delta)%(Math.PI*2);}
  samplePosition(target){this.updateWorldMatrix(true,false);return target.set(Math.cos(this.phase),0,Math.sin(this.phase)).applyMatrix4(this.matrixWorld);}
  get radius(){return (Math.abs(this.scale.x)+Math.abs(this.scale.z))/2;}
  set radius(value){if(!Number.isFinite(value)||value<0)throw new RangeError('Orbit radius must be finite and non-negative');const current=this.radius;if(current>0)this.scale.multiplyScalar(value/current);else this.scale.setScalar(value);}
}
export function createMotion(preset){
  const cameraOrbit=new ParticleOrbit(preset.objects['orbit-camera']);
  const captureRig=new Group();restorePose(captureRig,preset.objects['capture-rig']);
  const spinRoot=new Group();captureRig.add(spinRoot);spinRoot.rotation.y=preset.rig.spinAngle;
  const attractors=[0,1,2].map(i=>{
    const reference=new Group();restorePose(reference,preset.objects[`attractor-${i}`]);
    return {orbit:new ParticleOrbit(preset.objects[`orbit-${i}`]),reference,position:new Vector3(),axis:new Vector3(),spinSpeed:preset.objects[`attractor-${i}`].spinSpeed};
  });
  const motion={cameraOrbit,captureRig,spinRoot,attractors,spinSpeed:preset.rig.spinSpeed,spinAngle:preset.rig.spinAngle};
  syncMotion(motion);return motion;
}
export function syncMotion(motion){
  motion.cameraOrbit.samplePosition(motion.captureRig.position);
  for(const a of motion.attractors){a.orbit.samplePosition(a.reference.position);a.position.copy(a.reference.position);a.axis.copy(up).applyQuaternion(a.reference.quaternion).normalize();}
}
export function advanceMotion(motion,delta){
  motion.cameraOrbit.advance(delta);motion.spinAngle=(motion.spinAngle+motion.spinSpeed*delta)%(Math.PI*2);motion.spinRoot.rotation.y=motion.spinAngle;
  for(const a of motion.attractors){a.orbit.advance(delta);a.reference.rotateZ(a.spinSpeed*delta);}
  syncMotion(motion);
}
