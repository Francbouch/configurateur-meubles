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
scene.add(new THREE.AmbientLight(0xfff4e0,1.06));

let model;
let home={position:new THREE.Vector3(),target:new THREE.Vector3()};
const originalMaterials=new Map();
const textureCache=new Map();
const textureLoader=new THREE.TextureLoader();

function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);

function frame(object){
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z),d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  controls.target.copy(center);
  camera.near=Math.max(max/1000,.001);camera.far=max*100;
  camera.position.set(center.x+d*.85,center.y+d*.55,center.z+d*1.2);
  camera.updateProjectionMatrix();controls.minDistance=max*.55;controls.maxDistance=max*4;controls.update();
  home={position:camera.position.clone(),target:controls.target.clone()};
}

function getMesh(name){return model?.getObjectByName(name)||null}

function loadTexture(url){
  if(!url)return Promise.resolve(null);
  if(textureCache.has(url))return textureCache.get(url);
  const p=new Promise(resolve=>textureLoader.load(url,t=>{
    t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate=true;resolve(t);
  },undefined,()=>resolve(null)));
  textureCache.set(url,p);return p;
}

async function applyMaterial(part,mat){
  const mesh=getMesh(part.meshName);
  if(!mesh)return;
  const original=originalMaterials.get(part.meshName);
  if(mat.code===part.initialCode && original){
    mesh.material=original.clone();
    if(mesh.material.map){mesh.material.map.colorSpace=THREE.SRGBColorSpace;mesh.material.map.needsUpdate=true}
    mesh.material.needsUpdate=true;
    return;
  }
  const tex=await loadTexture(mat.textureUrl);
  const next=(original||mesh.material).clone();
  next.color.set(tex?0xffffff:mat.hex);
  next.map=tex?tex.clone():null;
  if(next.map){next.map.wrapS=next.map.wrapT=THREE.RepeatWrapping;next.map.needsUpdate=true}
  next.metalness=0;next.roughness=.68;next.needsUpdate=true;
  mesh.material=next;
}

function buildMaterialControls(){
  const root=document.querySelector("#materialControls");
  root.innerHTML="";
  cfg.parts.forEach(part=>{
    const wrap=document.createElement("section");wrap.className="control";
    wrap.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const selected=wrap.querySelector(".selected"),grid=wrap.querySelector(".material-grid");
    cfg.materials.forEach(mat=>{
      const active=mat.code===part.initialCode;
      const b=document.createElement("button");b.type="button";b.className="material-card"+(active?" active":"");
      const bg=mat.textureUrl?'background-image:url(&quot;'+mat.textureUrl+'&quot;);background-size:cover;background-position:center;':'background:'+mat.hex+';';
      b.innerHTML='<span class="material-sample" style="'+bg+'"></span><span class="material-meta"><strong>'+mat.name+'</strong><small>'+mat.code+'</small></span>';
      if(active)selected.textContent=mat.name;
      b.onclick=async()=>{
        grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");
        selected.textContent=mat.name;await applyMaterial(part,mat);
      };
      grid.appendChild(b);
    });
    root.appendChild(wrap);
  });
}

document.querySelector("#resetView").onclick=()=>{camera.position.copy(home.position);controls.target.copy(home.target);controls.update()};

new GLTFLoader().load(cfg.modelUrl,g=>{
  model=g.scene;
  model.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;
      if(["CAISSON","FACADE","INTERIEUR"].includes(o.name)){
        originalMaterials.set(o.name,o.material.clone());
      }
      if(o.material?.map){o.material.map.colorSpace=THREE.SRGBColorSpace;o.material.map.needsUpdate=true}
      if(o.material)o.material.needsUpdate=true;
    }
  });
  scene.add(model);frame(model);buildMaterialControls();loading.classList.add("hidden");
},undefined,e=>{
  console.error(e);loading.classList.add("hidden");empty.classList.remove("hidden");
  empty.querySelector("strong").textContent="Impossible de charger Lit cabinet François";
});

renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});