import * as THREE from 'three/webgpu';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ParticleSkybox,currentPreset} from '../src/index.js';
const $=id=>document.getElementById(id);
const world=$('world'),scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(currentPreset.settings.skyFov,1,.01,2000);
const pose=currentPreset.cameras.sky;camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);
let renderer,effect,controls,resizeObserver,previous=null,disposed=false;
const abort=new AbortController();
const mobileLayout=matchMedia('(max-width: 600px)');
function setDemoView(){
  if(!controls)return;
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
  camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);controls.target.fromArray(pose.target);
  camera.fov=currentPreset.settings.skyFov;
  if(mobileLayout.matches){
    const distance=camera.position.distanceTo(controls.target);
    const direction=camera.getWorldDirection(new THREE.Vector3()).applyAxisAngle(camera.up,-THREE.MathUtils.degToRad(22));
    controls.target.copy(camera.position).addScaledVector(direction,distance);
    camera.fov=52;
  }
  camera.updateProjectionMatrix();controls.update();controls.enableDamping=damping;
  renderer.domElement.style.touchAction=mobileLayout.matches?'pan-y':'none';
  world.dataset.cameraView=mobileLayout.matches?'mobile':'desktop';
  effect?.capture(camera,true);
}
function resize(){if(!renderer)return;const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(effect)effect.capture(camera,true);}
function showError(error){$('loading').hidden=true;$('fallback').hidden=false;$('fallback-message').textContent=`${error.message} Try a current browser with hardware acceleration enabled.`;console.error(error);}
async function start(){
  try{
    renderer=new THREE.WebGPURenderer({antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0);world.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Particle skybox in a Three.js world. Drag to look around.');
    controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(pose.target);controls.enableDamping=true;controls.enablePan=true;controls.minDistance=.05;controls.maxDistance=200;controls.update();
    setDemoView();mobileLayout.addEventListener('change',setDemoView);
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(world);resize();
    effect=await ParticleSkybox.create({renderer,scene,camera,warmup:12,signal:abort.signal,onProgress:f=>{$('load-progress').textContent=`${Math.round(f*100)}% · 12 simulation seconds`;$('progress-bar').style.width=`${f*100}%`;}});
    if(disposed){effect.dispose();return;}
    $('speed').value=effect.settings.timeScale;$('speed-value').textContent=`${effect.settings.timeScale.toFixed(2)}×`;
    $('color').value=effect.settings.colorA;$('color-value').textContent=effect.settings.colorA.toUpperCase();
    $('radius').value=effect.cameraOrbitRadius;$('radius-value').textContent=effect.cameraOrbitRadius.toFixed(2);
    for(const id of ['speed','color','radius'])$(id).disabled=false;
    $('engine').textContent=renderer.backend.isWebGPUBackend?'WEBGPU / THREE.JS':'WEBGL2 / THREE.JS';$('loading').hidden=true;
    renderer.setAnimationLoop(now=>{
      const delta=previous===null?0:Math.min(.05,(now-previous)/1000);previous=now;
      controls.update();effect.update(document.hidden?0:delta,camera);renderer.render(scene,camera);
    });
  }catch(error){if(error.name!=='AbortError')showError(error);}
}
$('speed').oninput=()=>{if(effect)effect.setSpeed(Number($('speed').value));$('speed-value').textContent=`${Number($('speed').value).toFixed(2)}×`;};
$('color').oninput=()=>{effect?.setColors($('color').value);$('color-value').textContent=$('color').value.toUpperCase();};
$('radius').oninput=()=>{if(effect)effect.cameraOrbitRadius=Number($('radius').value);$('radius-value').textContent=Number($('radius').value).toFixed(2);};
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('example-code').textContent);$('copy-code').textContent='Copied ✓';}catch{$('copy-code').textContent='Select code to copy';}};
document.addEventListener('visibilitychange',()=>previous=null);
window.addEventListener('pagehide',()=>{disposed=true;abort.abort();mobileLayout.removeEventListener('change',setDemoView);renderer?.setAnimationLoop(null);resizeObserver?.disconnect();controls?.dispose();effect?.dispose();renderer?.dispose();},{once:true});
start();
