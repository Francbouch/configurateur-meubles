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
// Renderer values restored from the most recent Three.js Editor project.
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.38;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
host.appendChild(renderer.domElement);

// The recent JSON also uses an equirectangular environment for indirect light.
// Keep the visible canvas white; use it only for material illumination/reflections.
const environmentTexture=new THREE.TextureLoader().load(
  "data:image/jpeg;base64,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",
  texture=>{
    texture.mapping=THREE.EquirectangularReflectionMapping;
    scene.environment=texture;
  }
);

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;

function addImportedLighting(){
  // Exact light rig from the supplied project JSON.
  const key=new THREE.DirectionalLight(0xfffbd5,10.8);
  key.position.set(4.967110979623884,7.685286298271706,3.1827224156795624);
  key.castShadow=true;
  key.shadow.bias=.00005;
  key.shadow.radius=3.16;
  key.shadow.mapSize.set(512,512);
  key.shadow.camera.left=-5;
  key.shadow.camera.right=5;
  key.shadow.camera.top=5;
  key.shadow.camera.bottom=-5;
  key.shadow.camera.near=.5;
  key.shadow.camera.far=500;
  const keyTarget=new THREE.Object3D();
  scene.add(keyTarget);
  key.target=keyTarget;
  scene.add(key);

  const pointFront=new THREE.PointLight(0xffffff,43.52,32.6,5.8);
  pointFront.position.set(1.8278270109593606,1.32400434818762,.9686382698051315);
  pointFront.castShadow=true;
  pointFront.shadow.mapSize.set(512,512);
  pointFront.shadow.camera.near=.5;
  pointFront.shadow.camera.far=32.6;
  scene.add(pointFront);

  const pointTop=new THREE.PointLight(0xffffff,15.44,50,.32);
  pointTop.position.set(.46218997112339477,3.6515353563731474,1.101424185841721);
  pointTop.castShadow=false;
  scene.add(pointTop);

  const rim=new THREE.DirectionalLight(0xffffff,-.54);
  rim.position.set(5,1.776573535312534,-.10974806268320147);
  rim.castShadow=true;
  rim.shadow.mapSize.set(512,512);
  rim.shadow.camera.left=-5;
  rim.shadow.camera.right=5;
  rim.shadow.camera.top=5;
  rim.shadow.camera.bottom=-5;
  rim.shadow.camera.near=.5;
  rim.shadow.camera.far=500;
  const rimTarget=new THREE.Object3D();
  scene.add(rimTarget);
  rim.target=rimTarget;
  scene.add(rim);
}
addImportedLighting();

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
    // The original working JSON uses lighting-responsive Standard materials.
    // MeshBasicMaterial ignores lights entirely, which was why the imported
    // light rig looked absent.
    const material=new THREE.MeshStandardMaterial({
      color:item.color??0xffffff,
      map,
      side:THREE.DoubleSide,
      roughness:.5,
      metalness:0
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