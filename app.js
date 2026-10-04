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
  {label:"Façade",mesh:"FACADE",initial:"831"},
  {label:"Caisson",mesh:"CAISSON",initial:"831"},
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
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.38;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;

// Lighting inspired directly by the supplied Three.js Editor project.
// The extra ambient/hemisphere floor is deliberate: it keeps every
// textured finish readable even if a direct light is occluded.
function addModelLighting(){
  const ambient=new THREE.AmbientLight(0xfff4e0,.38);
  scene.add(ambient);

  const hemi=new THREE.HemisphereLight(0xffffff,0xe8e4dc,.28);
  hemi.position.set(0,6,0);
  scene.add(hemi);

  const key=new THREE.DirectionalLight(0xfffbd5,10.8);
  key.position.set(4.967110979623884,7.685286298271706,3.1827224156795624);
  key.castShadow=true;
  key.shadow.bias=.00005;
  key.shadow.normalBias=.015;
  key.shadow.radius=3.16;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-5;
  key.shadow.camera.right=5;
  key.shadow.camera.top=5;
  key.shadow.camera.bottom=-5;
  key.shadow.camera.near=.5;
  key.shadow.camera.far=500;
  scene.add(key);

  const front=new THREE.PointLight(0xffffff,43.52,32.6,5.8);
  front.position.set(1.8278270109593606,1.32400434818762,.9686382698051315);
  front.castShadow=true;
  front.shadow.mapSize.set(512,512);
  front.shadow.bias=0;
  scene.add(front);

  const top=new THREE.PointLight(0xffffff,15.44,50,.32);
  top.position.set(.46218997112339477,3.6515353563731474,1.101424185841721);
  top.castShadow=false;
  scene.add(top);

  // The JSON contains a negative-intensity directional light.
  // Use its position but keep a small positive rim to avoid subtractive blackouts.
  const rim=new THREE.DirectionalLight(0xffffff,.18);
  rim.position.set(5,1.776573535312534,-.10974806268320147);
  scene.add(rim);
}
addModelLighting();

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
    const material=new THREE.MeshStandardMaterial({
      color:item.color??0xffffff,
      map,
      side:THREE.DoubleSide,
      roughness:.5,
      metalness:0,
      emissive:map?0xffffff:0x000000,
      emissiveMap:map,
      emissiveIntensity:map ? .04 : 0
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

const selectedCodes=new Map(PARTS.map(part=>[part.mesh,part.initial]));
let activePart=null;

function syncDependentParts(){
  const facadeCode=selectedCodes.get("FACADE");
  ["CAISSON","INTERIEUR"].forEach(mesh=>{
    const current=selectedCodes.get(mesh);
    if(current!=="NOIR" && current!=="175" && current!==facadeCode){
      selectedCodes.set(mesh,facadeCode);
      applyMaterial(mesh,facadeCode);
    }
  });
}

function materialPreview(item){
  return item.src
    ? 'background-image:url('+item.src+');background-size:cover;background-position:center;'
    : 'background:#000;';
}

function buildControls(){
  controlsRoot.innerHTML=
    '<div class="part-list"></div>'+
    '<div class="material-choice"><div class="choice-head"><span>Matériaux</span><strong class="choice-part"></strong></div><div class="material-grid"></div></div>';

  const partList=controlsRoot.querySelector(".part-list");
  const choicePart=controlsRoot.querySelector(".choice-part");
  const grid=controlsRoot.querySelector(".material-grid");

  function allowedMaterials(part){
    if(part.mesh==="FACADE") return MATERIALS;

    const blackOrWhite=new Set(["NOIR","175"]);
    if(part.mesh==="CAISSON"){
      const facadeCode=selectedCodes.get("FACADE");
      if(blackOrWhite.has(facadeCode)) return MATERIALS;
      return MATERIALS.filter(item=>blackOrWhite.has(item.code) || item.code===facadeCode);
    }

    if(part.mesh==="INTERIEUR"){
      const caissonCode=selectedCodes.get("CAISSON");
      return MATERIALS.filter(item=>blackOrWhite.has(item.code) || item.code===caissonCode);
    }

    return MATERIALS;
  }

  function syncDependentParts(){
    const blackOrWhite=new Set(["NOIR","175"]);
    const facadeCode=selectedCodes.get("FACADE");
    const caisson=selectedCodes.get("CAISSON");

    const allowedCaisson=allowedMaterials(PARTS.find(part=>part.mesh==="CAISSON"));
    if(!allowedCaisson.some(item=>item.code===caisson)){
      selectedCodes.set("CAISSON",facadeCode);
      applyMaterial("CAISSON",facadeCode);
    }

    const finalCaisson=selectedCodes.get("CAISSON");
    const interior=selectedCodes.get("INTERIEUR");
    if(!blackOrWhite.has(interior) && interior!==finalCaisson){
      selectedCodes.set("INTERIEUR",finalCaisson);
      applyMaterial("INTERIEUR",finalCaisson);
    }
  }

  function renderMaterials(){
    grid.innerHTML="";
    if(!activePart){
      controlsRoot.classList.remove("is-open");
      return;
    }
    controlsRoot.classList.add("is-open");
    choicePart.textContent=activePart.label;
    const current=selectedCodes.get(activePart.mesh);
    const available=allowedMaterials(activePart);

    available.forEach(item=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="material-card"+(item.code===current?" active":"");
      button.innerHTML='<span class="material-sample" style="'+materialPreview(item)+'"></span><span class="material-meta"><strong>'+item.name+'</strong><small>'+item.code+'</small></span>';
      button.onclick=()=>{
        selectedCodes.set(activePart.mesh,item.code);
        applyMaterial(activePart.mesh,item.code);
        if(activePart.mesh==="FACADE" || activePart.mesh==="CAISSON") syncDependentParts();
        renderPartList();
        renderMaterials();
      };
      grid.appendChild(button);
    });
  }

  function renderPartList(){
    partList.innerHTML="";
    PARTS.forEach((part,index)=>{
      const current=MATERIALS.find(item=>item.code===selectedCodes.get(part.mesh));
      const isActive=part.mesh===activePart?.mesh;
      const button=document.createElement("button");
      button.type="button";
      button.className="part-row"+(isActive?" active":"");
      const chosen=isActive || selectedCodes.get(part.mesh)!==part.initial;
      const status=chosen ? '<span class="part-current">'+current.name+'</span>' : '<span class="part-current muted">Choisir</span>';
      button.innerHTML='<span class="part-index">0'+(index+1)+'</span><span class="part-main"><span class="part-name">'+part.label+'</span>'+status+'</span><span class="part-arrow">⌄</span>';
      button.onclick=()=>{
        activePart=isActive ? null : part;
        renderPartList();
        renderMaterials();
      };
      partList.appendChild(button);
    });
  }

  renderPartList();
  renderMaterials();
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
    model.traverse(object=>{
      if(object.isMesh){
        object.castShadow=true;
        object.receiveShadow=true;
      }
    });
    scene.add(model);
    PARTS.forEach(part=>applyMaterial(part.mesh,part.initial));
    syncDependentParts();
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