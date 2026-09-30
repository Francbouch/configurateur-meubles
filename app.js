import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const cfg=window.FURNITURE_CONFIG;
const host=document.querySelector("#viewer"),loading=document.querySelector("#loading"),empty=document.querySelector("#empty");
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xffffff);
const camera=new THREE.PerspectiveCamera(50,1,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.06;

// Ambient light from Francois Three.js Editor scene.
// The two point lights are embedded in the GLB.
scene.add(new THREE.AmbientLight(0xfff4e0,1.06));

let home={position:new THREE.Vector3(),target:new THREE.Vector3()};
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);

function frame(object){
  const box=new THREE.Box3().setFromObject(object);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  controls.target.copy(center);
  camera.near=Math.max(max/1000,.001); camera.far=max*100;
  camera.position.set(center.x+d*.85,center.y+d*.55,center.z+d*1.2);
  camera.updateProjectionMatrix();
  controls.minDistance=max*.55; controls.maxDistance=max*4; controls.update();
  home={position:camera.position.clone(),target:controls.target.clone()};
}

document.querySelector("#resetView").onclick=()=>{camera.position.copy(home.position);controls.target.copy(home.target);controls.update()};

new GLTFLoader().load(cfg.modelUrl,g=>{
  const model=g.scene;
  // Do not regenerate UVs or replace any materials. Preserve Francois authored GLB exactly.
  model.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true; o.receiveShadow=true;
      if(o.material?.map){o.material.map.colorSpace=THREE.SRGBColorSpace;o.material.map.needsUpdate=true}
      if(o.material)o.material.needsUpdate=true;
    }
  });
  scene.add(model);
  frame(model);
  loading.classList.add("hidden");
},undefined,e=>{
  console.error(e); loading.classList.add("hidden"); empty.classList.remove("hidden");
  empty.querySelector("strong").textContent="Impossible de charger Lit cabinet François";
});

renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});