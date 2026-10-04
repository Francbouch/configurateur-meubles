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
  wash.addColorStop(.34,"#fbfbfa");
  wash.addColorStop(.68,"#eeeeeb");
  wash.addColorStop(1,"#ddddda");
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

function createStudioEnvFace(type){
  const size=512;
  const canvas=document.createElement("canvas");
  canvas.width=size;
  canvas.height=size;
  const ctx=canvas.getContext("2d");

  // Dark neutral studio room: only the softboxes show up as reflections.
  const base=ctx.createLinearGradient(0,0,0,size);
  base.addColorStop(0,"#242424");
  base.addColorStop(.55,"#111111");
  base.addColorStop(1,"#050505");
  ctx.fillStyle=base;
  ctx.fillRect(0,0,size,size);

  function softbox(x,y,w,h,alpha){
    ctx.save();
    ctx.shadowColor="rgba(255,255,255,"+(alpha*.72)+")";
    ctx.shadowBlur=42;
    const g=ctx.createLinearGradient(x,y,x+w,y+h);
    g.addColorStop(0,"rgba(255,255,255,"+(alpha*.55)+")");
    g.addColorStop(.35,"rgba(255,255,255,"+alpha+")");
    g.addColorStop(1,"rgba(240,245,255,"+(alpha*.52)+")");
    ctx.fillStyle=g;
    ctx.fillRect(x,y,w,h);
    ctx.restore();
  }

  // Different panels around the object give broad photographic reflections
  // on the front, sides and top as the user rotates the furniture.
  if(type==="px"){
    softbox(55,82,150,350,.98);
    softbox(330,130,82,235,.42);
  }else if(type==="nx"){
    softbox(300,70,145,365,.82);
    softbox(72,165,88,220,.34);
  }else if(type==="py"){
    softbox(112,64,288,130,.90);
    softbox(330,265,95,155,.32);
  }else if(type==="ny"){
    softbox(165,120,180,250,.22);
  }else if(type==="pz"){
    softbox(64,88,125,345,.92);
    softbox(322,105,112,310,.52);
  }else{
    softbox(292,76,150,360,.78);
    softbox(70,190,95,185,.30);
  }

  return canvas;
}

function createStudioEnvironment(){
  const env=new THREE.CubeTexture([
    createStudioEnvFace("px"),
    createStudioEnvFace("nx"),
    createStudioEnvFace("py"),
    createStudioEnvFace("ny"),
    createStudioEnvFace("pz"),
    createStudioEnvFace("nz")
  ]);
  env.colorSpace=THREE.SRGBColorSpace;
  env.needsUpdate=true;
  return env;
}

const studioEnvironment=createStudioEnvironment();

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
    new THREE.ShadowMaterial({color:0x000000,opacity:.16})
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
      opacity:.86,
      side:THREE.DoubleSide
    })
  );
  contact.rotation.x=-Math.PI/2;
  contact.position.set(center.x,floorY+max*.0015,center.z);
  contact.renderOrder=0;
  scene.add(contact);

  // Key light exists only to project a photographic floor shadow.
  // MeshBasicMaterial ignores it, so it cannot turn the furniture black.
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

function makeStudioMaterial(mesh,item,map){
  mesh.geometry.computeBoundingBox();
  const bbox=mesh.geometry.boundingBox;
  const bmin=bbox?.min?.clone() ?? new THREE.Vector3(-1,-1,-1);
  const bmax=bbox?.max?.clone() ?? new THREE.Vector3(1,1,1);
  const safeColor=new THREE.Color(item.code==="NOIR" ? 0x181818 : (item.color??0xffffff));

  return new THREE.ShaderMaterial({
    uniforms:{
      uMap:{value:map},
      uHasMap:{value:!!map},
      uColor:{value:safeColor},
      uMin:{value:bmin},
      uMax:{value:bmax}
    },
    vertexShader:`
      varying vec2 vUv;
      varying vec3 vObjPos;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main(){
        vUv=uv;
        vObjPos=position;
        vec4 worldPos=modelMatrix*vec4(position,1.0);
        vWorldPos=worldPos.xyz;
        vWorldNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*worldPos;
      }
    `,
    fragmentShader:`
      uniform sampler2D uMap;
      uniform bool uHasMap;
      uniform vec3 uColor;
      uniform vec3 uMin;
      uniform vec3 uMax;

      varying vec2 vUv;
      varying vec3 vObjPos;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      float gaussian(float x,float center,float width){
        float d=(x-center)/width;
        return exp(-d*d);
      }

      void main(){
        vec3 base=uColor;
        if(uHasMap){
          base*=texture2D(uMap,vUv).rgb;
        }

        vec3 n=normalize(vWorldNormal);
        vec3 viewDir=normalize(cameraPosition-vWorldPos);

        // Fake three-point studio lighting with a hard brightness floor.
        vec3 keyDir=normalize(vec3(0.50,0.78,0.46));
        vec3 fillDir=normalize(vec3(-0.72,0.30,0.34));
        vec3 rimDir=normalize(vec3(-0.32,0.52,-0.79));

        float key=max(dot(n,keyDir),0.0);
        float fill=max(dot(n,fillDir),0.0);
        float rim=pow(max(dot(n,rimDir),0.0),1.35);

        float lightLevel=0.72 + key*0.24 + fill*0.085 + rim*0.075;

        vec3 span=max(uMax-uMin,vec3(0.0001));
        vec3 p=clamp((vObjPos-uMin)/span,0.0,1.0);

        // Large softbox streaks across planar cabinet surfaces.
        float frontness=pow(abs(n.z),1.55);
        float sideness=pow(abs(n.x),1.55);
        float topness=pow(abs(n.y),1.8);

        float frontBox=gaussian(p.x,0.30 + (p.y-.5)*0.08,0.15);
        float frontFill=gaussian(p.x,0.72,0.27)*0.38;
        float sideBox=gaussian(p.z,0.34 + (p.y-.5)*0.06,0.18);
        float topBox=gaussian(p.x,0.38,0.25);

        vec3 reflected=reflect(-viewDir,n);
        vec3 boxDir=normalize(vec3(-0.38,0.36,0.85));
        float glossy=pow(max(dot(reflected,boxDir),0.0),5.0);

        float softbox=
          frontness*(frontBox*0.18 + frontFill*0.07) +
          sideness*(sideBox*0.15) +
          topness*(topBox*0.11) +
          glossy*0.10;

        // Slight lower-edge falloff for product-photo depth.
        float vertical=0.94 + p.y*0.07;

        vec3 color=base*lightLevel*vertical;
        color += vec3(1.0,0.985,0.955)*softbox;

        // Never allow the textured finish to collapse to black.
        color=max(color,base*0.64);

        gl_FragColor=vec4(color,1.0);
      }
    `,
    side:THREE.DoubleSide
  });
}

async function buildMaterialLibrary(){
  await Promise.all(MATERIALS.map(async item=>{
    let map=null;
    if(item.src) map=await loadTexture(item.src);
    materialLibrary.set(item.code,{item,map});
  }));
}

function applyMaterial(meshName,code){
  const mesh=model?.getObjectByName(meshName);
  const entry=materialLibrary.get(code);
  if(!mesh||!entry)return;
  if(mesh.material?.dispose) mesh.material.dispose();
  mesh.material=makeStudioMaterial(mesh,entry.item,entry.map);
  mesh.material.name=code;
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