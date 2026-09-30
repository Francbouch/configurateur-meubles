import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

window.__CONFIGURATOR_STARTED__ = true;

const cfg=window.FURNITURE_CONFIG;
const host=document.querySelector("#viewer");
const loading=document.querySelector("#loading");
const empty=document.querySelector("#empty");
const root=document.querySelector("#materialControls");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xffffff);
const camera=new THREE.PerspectiveCamera(50,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
host.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.06;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a8378,1.65));
const key=new THREE.DirectionalLight(0xffffff,2.2);
key.position.set(4,7,5);
scene.add(key);

let model=null;
let home={position:new THREE.Vector3(),target:new THREE.Vector3()};
const originalByMesh=new Map();
const authoredByCode=new Map();
const textureCache=new Map();
const textureLoader=new THREE.TextureLoader();

function resize(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

function frame(object){
  const box=new THREE.Box3().setFromObject(object);
  if(box.isEmpty())return;
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  controls.target.copy(center);
  camera.near=Math.max(max/1000,.001);
  camera.far=max*100;
  camera.position.set(center.x+d*.85,center.y+d*.55,center.z+d*1.2);
  camera.updateProjectionMatrix();
  controls.minDistance=max*.45;
  controls.maxDistance=max*4;
  controls.update();
  home={position:camera.position.clone(),target:controls.target.clone()};
}

function getMesh(name){return model?model.getObjectByName(name):null}

function loadTexture(url){
  if(!url)return Promise.resolve(null);
  if(textureCache.has(url))return textureCache.get(url);
  const p=new Promise(resolve=>{
    textureLoader.load(url,t=>{
      t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      t.needsUpdate=true;
      resolve(t);
    },undefined,()=>resolve(null));
  });
  textureCache.set(url,p);
  return p;
}

function copyTextureTransform(source,target){
  if(!source||!target)return;
  target.wrapS=source.wrapS; target.wrapT=source.wrapT;
  target.repeat.copy(source.repeat);
  target.offset.copy(source.offset);
  target.center.copy(source.center);
  target.rotation=source.rotation;
  target.flipY=source.flipY;
  target.needsUpdate=true;
}

async function applyMaterial(part,mat){
  const mesh=getMesh(part.meshName);
  if(!mesh)return;

  if(mat.authored && authoredByCode.has(mat.code)){
    mesh.material=authoredByCode.get(mat.code).clone();
    if(mesh.material.map)mesh.material.map=mesh.material.map.clone();
    mesh.material.needsUpdate=true;
    return;
  }

  const original=originalByMesh.get(part.meshName)||mesh.material;
  const next=original.clone();
  const tex=await loadTexture(mat.textureUrl);

  next.color.set(tex?0xffffff:mat.hex);
  if(tex){
    const mapped=tex.clone();
    const reference=original.map || authoredByCode.get("582")?.map || authoredByCode.get("592")?.map;
    copyTextureTransform(reference,mapped);
    next.map=mapped;
  }else{
    next.map=null;
  }
  next.metalness=0;
  next.roughness=.68;
  next.needsUpdate=true;
  mesh.material=next;
}

function buildControls(){
  root.innerHTML="";
  cfg.parts.forEach(part=>{
    const wrap=document.createElement("section");
    wrap.className="control";
    wrap.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const selected=wrap.querySelector(".selected");
    const grid=wrap.querySelector(".material-grid");

    cfg.materials.forEach(mat=>{
      const active=mat.code===part.initialCode;
      const button=document.createElement("button");
      button.type="button";
      button.className="material-card"+(active?" active":"");
      const preview=mat.textureUrl
        ? 'background-image:url(&quot;'+mat.textureUrl+'&quot;);background-size:cover;background-position:center;'
        : 'background:'+mat.hex+';';
      button.innerHTML='<span class="material-sample" style="'+preview+'"></span><span class="material-meta"><strong>'+mat.name+'</strong><small>'+mat.code+'</small></span>';
      if(active)selected.textContent=mat.name;

      button.addEventListener("click",async()=>{
        if(!model)return;
        grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));
        button.classList.add("active");
        selected.textContent=mat.name;
        await applyMaterial(part,mat);
      });
      grid.appendChild(button);
    });
    root.appendChild(wrap);
  });
}
buildControls();

document.querySelector("#resetView").addEventListener("click",()=>{
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  controls.update();
});

new GLTFLoader().load(cfg.modelUrl,g=>{
  model=g.scene;
  ["CAISSON","FACADE","INTERIEUR"].forEach(name=>{
    const mesh=getMesh(name);
    if(mesh&&mesh.isMesh)originalByMesh.set(name,mesh.material.clone());
  });

  const caisson=originalByMesh.get("CAISSON");
  const interieur=originalByMesh.get("INTERIEUR");
  if(caisson)authoredByCode.set("582",caisson.clone());
  if(interieur)authoredByCode.set("592",interieur.clone());

  model.traverse(o=>{
    if(o.isMesh&&o.material){
      if(o.material.map){
        o.material.map.colorSpace=THREE.SRGBColorSpace;
        o.material.map.needsUpdate=true;
      }
      o.material.needsUpdate=true;
    }
  });

  scene.add(model);
  frame(model);
  loading.classList.add("hidden");
},xhr=>{
  const p=loading?.querySelector("p");
  if(p && xhr.lengthComputable && xhr.total>0){
    const percent=Math.max(1,Math.min(99,Math.round((xhr.loaded/xhr.total)*100)));
    p.textContent="Chargement du meuble… "+percent+" %";
  }
},error=>{
  console.error(error);
  loading.classList.add("hidden");
  empty.classList.remove("hidden");
  empty.querySelector("strong").textContent="Impossible de charger le meuble";
  empty.querySelector("p").textContent="Le modèle 3D n’a pas pu être chargé. Rechargez la page.";
});

renderer.setAnimationLoop(()=>{
  controls.update();
  renderer.render(scene,camera);
});