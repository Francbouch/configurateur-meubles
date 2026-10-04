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

function createStudioBackground(){
  const canvas=document.createElement("canvas");
  canvas.width=1024;
  canvas.height=1024;
  const ctx=canvas.getContext("2d");

  const wash=ctx.createRadialGradient(420,310,60,512,500,760);
  wash.addColorStop(0,"#ffffff");
  wash.addColorStop(.48,"#fbfbfa");
  wash.addColorStop(.78,"#f5f5f3");
  wash.addColorStop(1,"#eeeeeb");
  ctx.fillStyle=wash;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}

scene.background=createStudioBackground();

const camera=new THREE.PerspectiveCamera(50,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
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

function createStudioMatcap(){
  const size=256;
  const canvas=document.createElement("canvas");
  canvas.width=size;
  canvas.height=size;
  const ctx=canvas.getContext("2d");
  const image=ctx.createImageData(size,size);

  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      const nx=(x/(size-1))*2-1;
      const ny=(y/(size-1))*2-1;
      const r2=nx*nx+ny*ny;

      // Bright, neutral studio response with a guaranteed light floor.
      const key=Math.max(0,1-Math.hypot(nx+.28,ny+.34)*.72);
      const fill=Math.max(0,1-Math.hypot(nx-.42,ny-.05)*.92);
      const edge=Math.max(0,1-r2*.22);
      const spec=Math.exp(-((nx+.22)*(nx+.22)+(ny+.28)*(ny+.28))/.075);

      let level=.62 + key*.27 + fill*.075 + edge*.025 + spec*.12;
      level=Math.min(1,Math.max(.60,level));

      const i=(y*size+x)*4;
      image.data[i]=Math.round(255*level);
      image.data[i+1]=Math.round(255*Math.min(1,level*.992));
      image.data[i+2]=Math.round(255*Math.min(1,level*.975));
      image.data[i+3]=255;
    }
  }

  ctx.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}

const studioMatcap=createStudioMatcap();

function createContactShadowTexture(){
  const size=512;
  const canvas=document.createElement("canvas");
  canvas.width=size;
  canvas.height=size;
  const ctx=canvas.getContext("2d");
  const g=ctx.createRadialGradient(size/2,size/2,12,size/2,size/2,size*.46);
  g.addColorStop(0,"rgba(0,0,0,.22)");
  g.addColorStop(.34,"rgba(0,0,0,.12)");
  g.addColorStop(.68,"rgba(0,0,0,.045)");
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,size,size);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}

function addStudioScene(object){
  const box=new THREE.Box3().setFromObject(object);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  const floorY=box.min.y-max*.006;

  // The furniture stays light-independent. It only casts shadows.
  object.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;
      o.receiveShadow=false;
    }
  });

  // Invisible-to-light white floor that receives the soft studio shadow.
  const floor=new THREE.Mesh(
    new THREE.PlaneGeometry(max*7,max*7),
    new THREE.ShadowMaterial({color:0x000000,opacity:.12})
  );
  floor.rotation.x=-Math.PI/2;
  floor.position.set(center.x,floorY,center.z);
  floor.receiveShadow=true;
  floor.renderOrder=-1;
  scene.add(floor);

  // Guaranteed contact shadow: keeps the furniture visually grounded
  // even if browser shadow filtering varies.
  const contact=new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(size.x*1.5,max*.55),Math.max(size.z*1.45,max*.42)),
    new THREE.MeshBasicMaterial({
      map:createContactShadowTexture(),
      transparent:true,
      depthWrite:false,
      opacity:.72,
      side:THREE.DoubleSide
    })
  );
  contact.rotation.x=-Math.PI/2;
  contact.position.set(center.x,floorY+max*.0015,center.z);
  contact.renderOrder=0;
  scene.add(contact);

  // Key light exists only to project a photographic floor shadow.
  // MeshMatcapMaterial ignores it, so it cannot turn the furniture black.
  const key=new THREE.DirectionalLight(0xffffff,3.1);
  key.position.set(center.x+max*1.25,center.y+max*1.8,center.z+max*1.35);
  key.target.position.copy(center);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-max*1.25;
  key.shadow.camera.right=max*1.25;
  key.shadow.camera.top=max*1.45;
  key.shadow.camera.bottom=-max*.65;
  key.shadow.camera.near=max*.05;
  key.shadow.camera.far=max*6;
  key.shadow.bias=-.00015;
  key.shadow.normalBias=max*.00012;
  key.shadow.radius=5;
  scene.add(key);
  scene.add(key.target);
}

async function buildMaterialLibrary(){
  await Promise.all(MATERIALS.map(async item=>{
    let map=null;
    if(item.src) map=await loadTexture(item.src);

    // Matcap gives the model a professional studio-lighted appearance
    // without any scene lights, so the finish can never go black from lighting.
    const safeColor=item.code==="NOIR" ? 0x161616 : (item.color??0xffffff);
    const material=new THREE.MeshMatcapMaterial({
      color:safeColor,
      map,
      matcap:studioMatcap,
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
    scene.add(model);
    PARTS.forEach(part=>applyMaterial(part.mesh,part.initial));
    addStudioScene(model);
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