import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL="https://pub-32feef14c66c4e86b2ff3d9a6368fcca.r2.dev/Lit_cabinet_Fran%C3%A7ois_UV.glb";
const MATERIALS=[
  {code:"580",name:"Esprit Libre",src:"./materials/580.png"},
  {code:"581",name:"Beauté Naturelle",src:"./materials/581.png"},
  {code:"582",name:"Fashionista",src:"./materials/582.png"},
  {code:"588",name:"588",src:"./materials/588.png"},
  {code:"592",name:"592",src:"./materials/592.png"},
  {code:"831",name:"Roc Solide",src:"./materials/831.png"},
  {code:"832",name:"832",src:"./materials/832.png"},
  {code:"175",name:"Blanc",src:"./materials/175.png"},
  {code:"NOIR",name:"Noir",color:0x000000}
];
const PARTS=[
  {label:"Caisson",mesh:"CAISSON",initial:"580"},
  {label:"Façade",mesh:"FACADE",initial:"831"},
  {label:"Intérieur",mesh:"INTERIEUR",initial:"832"}
];

const host=document.querySelector("#viewer");
const loading=document.querySelector("#loading");
const empty=document.querySelector("#empty");
const controlsRoot=document.querySelector("#materialControls");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xffffff);

const camera=new THREE.PerspectiveCamera(50,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
host.appendChild(renderer.domElement);

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;

let model=null;
let home={position:new THREE.Vector3(),target:new THREE.Vector3()};
const materialLibrary=new Map();

function resize(){
  const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

function frame(object){
  const box=new THREE.Box3().setFromObject(object);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  const distance=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  orbit.target.copy(center);
  camera.near=Math.max(max/1000,.001);
  camera.far=max*100;
  camera.position.set(center.x+distance*.85,center.y+distance*.55,center.z+distance*1.2);
  camera.updateProjectionMatrix();
  orbit.minDistance=max*.45;
  orbit.maxDistance=max*4;
  orbit.update();
  home={position:camera.position.clone(),target:orbit.target.clone()};
}

function loadTexture(src){
  return new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load(src,t=>{
      t.colorSpace=THREE.SRGBColorSpace;
      t.wrapS=THREE.RepeatWrapping;
      t.wrapT=THREE.RepeatWrapping;
      t.flipY=false;
      t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      t.needsUpdate=true;
      resolve(t);
    },undefined,reject);
  });
}

async function buildMaterialLibrary(){
  await Promise.all(MATERIALS.map(async item=>{
    let map=null;
    if(item.src) map=await loadTexture(item.src);
    const material=new THREE.MeshBasicMaterial({
      color:item.color??0xffffff,
      map,
      side:THREE.DoubleSide
    });
    material.name=item.code;
    materialLibrary.set(item.code,material);
  }));
}

function applyMaterial(meshName,code){
  const mesh=model?.getObjectByName(meshName);
  const material=materialLibrary.get(code);
  if(!mesh||!material)return;
  mesh.material=material.clone();
  mesh.material.needsUpdate=true;
}

function buildControls(){
  controlsRoot.innerHTML="";
  PARTS.forEach(part=>{
    const section=document.createElement("section");
    section.className="control";
    section.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const grid=section.querySelector(".material-grid");
    const selected=section.querySelector(".selected");

    MATERIALS.forEach(item=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="material-card"+(item.code===part.initial?" active":"");
      const preview=item.src
        ? 'background-image:url('+item.src+');background-size:cover;background-position:center;'
        : 'background:#000;';
      button.innerHTML='<span class="material-sample" style="'+preview+'"></span><span class="material-meta"><strong>'+item.name+'</strong><small>'+item.code+'</small></span>';
      if(item.code===part.initial)selected.textContent=item.name;

      button.onclick=()=>{
        grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));
        button.classList.add("active");
        selected.textContent=item.name;
        applyMaterial(part.mesh,item.code);
      };
      grid.appendChild(button);
    });
    controlsRoot.appendChild(section);
  });
}

document.querySelector("#resetView").onclick=()=>{
  camera.position.copy(home.position);
  orbit.target.copy(home.target);
  orbit.update();
};

async function start(){
  try{
    await buildMaterialLibrary();
    const gltf=await new GLTFLoader().loadAsync(MODEL_URL);
    model=gltf.scene;
    model.traverse(o=>{
      });
    scene.add(model);
    PARTS.forEach(part=>applyMaterial(part.mesh,part.initial));
    buildControls();
    frame(model);
    loading.classList.add("hidden");
  }catch(error){
    console.error(error);
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.querySelector("strong").textContent="Impossible de charger le configurateur";
    empty.querySelector("p").textContent="Rechargez la page.";
  }
}

start();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera)});