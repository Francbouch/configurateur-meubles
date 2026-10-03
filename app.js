import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "https://esm.sh/three@0.180.0/examples/jsm/environments/RoomEnvironment.js";

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
// Lighting/render profile imported from the Three.js Editor project.
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.38;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=true;
host.appendChild(renderer.domElement);

const pmremGenerator=new THREE.PMREMGenerator(renderer);
const studioEnvironment=pmremGenerator.fromScene(new RoomEnvironment(),.04).texture;
scene.environment=studioEnvironment;

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;

// Keep the configurator engine intact while reproducing the professional
// lighting authored in the supplied Three.js Editor project.
let shadowCatcher=null;

function addStudioLighting(){
  // Neutral fill keeps real PBR materials readable even on faces that
  // receive little direct light. This avoids crushed-black furniture.
  const ambient=new THREE.AmbientLight(0xffffff,.72);
  scene.add(ambient);

  const hemisphere=new THREE.HemisphereLight(0xffffff,0xd7d0c5,1.05);
  hemisphere.position.set(0,5,0);
  scene.add(hemisphere);

  const key=new THREE.DirectionalLight(0xfffbd5,10.8);
  key.position.set(4.9671109796,7.6852862983,3.1827224157);
  key.target.position.set(0,0,0);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.near=.1;
  key.shadow.camera.far=30;
  scene.add(key,key.target);

  const frontFill=new THREE.PointLight(0xffffff,43.52);
  frontFill.position.set(1.827827011,1.3240043482,.9686382698);
  frontFill.castShadow=false;
  scene.add(frontFill);

  const topFill=new THREE.PointLight(0xffffff,15.44);
  topFill.position.set(.4621899711,3.6515353564,1.1014241858);
  topFill.castShadow=false;
  scene.add(topFill);

  const rim=new THREE.DirectionalLight(0xffffff,.32);
  rim.position.set(5,1.7765735353,-.1097480627);
  rim.target.position.set(0,0,0);
  scene.add(rim,rim.target);
}
addStudioLighting();

function addShadowCatcher(object){
  if(shadowCatcher){
    scene.remove(shadowCatcher);
    shadowCatcher.geometry.dispose();
    shadowCatcher.material.dispose();
  }
  const box=new THREE.Box3().setFromObject(object);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const span=Math.max(size.x,size.z,size.y)*5;
  const geometry=new THREE.PlaneGeometry(span,span);
  const material=new THREE.ShadowMaterial({color:0x000000,opacity:.14});
  shadowCatcher=new THREE.Mesh(geometry,material);
  shadowCatcher.rotation.x=-Math.PI/2;
  shadowCatcher.position.set(center.x,box.min.y-.002,center.z);
  shadowCatcher.receiveShadow=true;
  shadowCatcher.renderOrder=-1;
  scene.add(shadowCatcher);
}

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
      roughness:.46,
      metalness:0,
      envMapIntensity:.75
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

    if(activePart.mesh==="CAISSON" || activePart.mesh==="INTERIEUR"){
      const hint=document.createElement("p");
      hint.className="material-hint";
      hint.textContent=activePart.mesh==="INTERIEUR"
        ? "Disponible : la finition du caisson, blanc ou noir."
        : (selectedCodes.get("FACADE")==="NOIR" || selectedCodes.get("FACADE")==="175")
          ? "Façade blanche ou noire : toutes les finitions sont disponibles."
          : "Disponible : la finition de la façade, blanc ou noir.";
      grid.parentElement.appendChild(hint);
    }
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
    addShadowCatcher(model);
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