import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const cfg=window.FURNITURE_CONFIG, host=document.querySelector("#viewer"), loading=document.querySelector("#loading"), empty=document.querySelector("#empty");
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xeeeDE9);
const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.02; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.055; controls.minPolarAngle=.2; controls.maxPolarAngle=Math.PI/2+.12;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a8378,2.25));
const key=new THREE.DirectionalLight(0xffffff,3.4); key.position.set(4,7,5); key.castShadow=true; scene.add(key);
const fill=new THREE.DirectionalLight(0xfff3e0,1.15); fill.position.set(-5,3,-2); scene.add(fill);
const ground=new THREE.Mesh(new THREE.CircleGeometry(8,96),new THREE.ShadowMaterial({color:0x000000,opacity:.10})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
const textureLoader=new THREE.TextureLoader(); textureLoader.setCrossOrigin("anonymous");
const textureCache=new Map();
let model,home={position:new THREE.Vector3(),target:new THREE.Vector3()},partMeshes=new Map();
function normalizeName(v){return (v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function indexConfigurableMeshes(){
  const meshes=[]; model.traverse(o=>{if(o.isMesh)meshes.push(o)});
  cfg.configurableParts.forEach((part,index)=>{
    const wanted=(part.meshNames||[]).map(normalizeName);
    let found=meshes.filter(o=>wanted.includes(normalizeName(o.name)));
    // CAD → glTF exporters can rename nodes while keeping only two physical meshes.
    // With this model, fall back deterministically to mesh order if names differ.
    if(!found.length && meshes[index]) found=[meshes[index]];
    partMeshes.set(part.label,found);
  });
}

function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} new ResizeObserver(resize).observe(host);
function frame(object){const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z);object.position.sub(center);const box2=new THREE.Box3().setFromObject(object);object.position.y-=box2.min.y;ground.position.y=-.003;const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.near=Math.max(max/1000,.001);camera.far=max*100;camera.updateProjectionMatrix();camera.position.set(d*.8,d*.55,d*1.15);controls.target.set(0,size.y*.42,0);controls.minDistance=max*.55;controls.maxDistance=max*4;controls.update();home={position:camera.position.clone(),target:controls.target.clone()}}

function ensureProjectedUV(mesh,mat){\n  try{
  if(!mesh.geometry||!mat.textureUrl)return;
  // CAD/STEP exports often have no useful UVs. Build planar UVs per triangle
  // from the dominant face axis. The GLB is exported in metres, while panel dimensions are inches.
  let g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const pos=g.attributes.position, uv=new Float32Array(pos.count*2);
  const panelW=(mat.panel?.[0]||48)*0.0254, panelH=(mat.panel?.[1]||96)*0.0254;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<pos.count;i+=3){
    a.fromBufferAttribute(pos,i); b.fromBufferAttribute(pos,i+1); d.fromBufferAttribute(pos,i+2);
    n.copy(b).sub(a).cross(d.clone().sub(a)).normalize();
    const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
    for(let j=0;j<3;j++){
      const x=pos.getX(i+j),y=pos.getY(i+j),z=pos.getZ(i+j); let u,v;
      if(ay>=ax&&ay>=az){u=x/panelW;v=z/panelH}
      else if(ax>=az){u=z/panelW;v=y/panelH}
      else{u=x/panelW;v=y/panelH}
      uv[(i+j)*2]=u;uv[(i+j)*2+1]=v;
    }
  }
  g.setAttribute("uv",new THREE.BufferAttribute(uv,2));
  mesh.geometry=g;
}
function loadTexture(mat){
  if(!mat.textureUrl) return Promise.resolve(null);
  if(textureCache.has(mat.textureUrl)) return textureCache.get(mat.textureUrl);
  const p=new Promise(resolve=>textureLoader.load(mat.textureUrl,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();resolve(t)},()=>resolve(null)));
  textureCache.set(mat.textureUrl,p); return p;
}
async function applyMaterial(part,mat){
  if(!model)return;
  const baseTexture=await loadTexture(mat);
  const targets=partMeshes.get(part.label)||[];
  targets.forEach(o=>{
    const next=o.material.clone();
    next.color.set(baseTexture?0xffffff:mat.hex);
    next.map=baseTexture?baseTexture.clone():null;
    if(next.map){
      next.map.needsUpdate=true;
      // The source represents a real panel. Repeat is intentionally kept at 1:1
      // until mesh UVs/dimensions are normalized; panel dimensions stay in config.
      next.map.repeat.set(1,1); next.map.offset.set(0,0);
    }
    next.metalness=mat.metalness??0; next.roughness=mat.roughness??.68; next.needsUpdate=true; o.material=next;
  });
}
function buildControls(){
  const root=document.querySelector("#materialControls"); root.innerHTML="";
  cfg.configurableParts.forEach(part=>{
    const wrap=document.createElement("section"); wrap.className="control";
    wrap.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const selected=wrap.querySelector(".selected"),grid=wrap.querySelector(".material-grid");
    part.materials.forEach((mat,i)=>{
      const b=document.createElement("button"); b.className="material-card"+(i===0?" active":""); b.type="button";
      const sample=document.createElement("span"); sample.className="material-sample"; sample.style.backgroundColor=mat.hex;
      if(mat.previewUrl) sample.style.backgroundImage='url("'+mat.previewUrl+'")';
      const meta=document.createElement("span"); meta.className="material-meta"; meta.innerHTML="<strong>"+mat.name+"</strong><small>"+mat.code+"</small>";
      b.append(sample,meta); b.setAttribute("aria-label",part.label+" — "+mat.name);
      b.onclick=()=>{grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");selected.textContent=mat.name;applyMaterial(part,mat)};
      grid.appendChild(b); if(i===0)selected.textContent=mat.name;
    });
    root.appendChild(wrap);
  });
}
buildControls();
document.querySelector("#resetView").onclick=()=>{camera.position.copy(home.position);controls.target.copy(home.target);controls.update()};
if(!cfg.modelUrl){loading.classList.add("hidden");empty.classList.remove("hidden")}else new GLTFLoader().load(cfg.modelUrl,g=>{model=g.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});indexConfigurableMeshes();frame(model);loading.classList.add("hidden");requestAnimationFrame(()=>cfg.configurableParts.forEach(p=>p.materials[0]&&applyMaterial(p,p.materials[0])))},undefined,e=>{console.error(e);loading.classList.add("hidden");empty.classList.remove("hidden");empty.querySelector("strong").textContent="Impossible de charger le modèle"});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});