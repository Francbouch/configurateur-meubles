import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const cfg=window.FURNITURE_CONFIG;
const host=document.querySelector("#viewer"),loading=document.querySelector("#loading"),empty=document.querySelector("#empty");
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xe9e6df);
const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.06; controls.minPolarAngle=.2; controls.maxPolarAngle=Math.PI/2+.12;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a8378,2.2));
const key=new THREE.DirectionalLight(0xffffff,3.5); key.position.set(4,7,5); key.castShadow=true; scene.add(key);
const fill=new THREE.DirectionalLight(0xfff3e0,1.2); fill.position.set(-5,3,-2); scene.add(fill);
const ground=new THREE.Mesh(new THREE.CircleGeometry(8,96),new THREE.ShadowMaterial({color:0x000000,opacity:.12})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
let model,home={position:new THREE.Vector3(),target:new THREE.Vector3()};
const textureLoader=new THREE.TextureLoader(),textureCache=new Map();
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} new ResizeObserver(resize).observe(host);
function frame(object){const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z); object.position.sub(center); const box2=new THREE.Box3().setFromObject(object); object.position.y-=box2.min.y; ground.position.y=-.003; const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))); camera.near=Math.max(max/1000,.001);camera.far=max*100;camera.updateProjectionMatrix();camera.position.set(d*.8,d*.55,d*1.15);controls.target.set(0,size.y*.42,0);controls.minDistance=max*.55;controls.maxDistance=max*4;controls.update();home={position:camera.position.clone(),target:controls.target.clone()}}
function getPartMeshes(partIndex,names){if(!model)return[];const all=[];model.traverse(o=>{if(o.isMesh)all.push(o)});const exact=all.filter(o=>names.includes(o.name));return exact.length?exact:(all[partIndex]?[all[partIndex]]:[])}
function ensureUV(mesh){
  if(mesh.userData.materialUV)return;
  const src=mesh.geometry;
  const g=src.index?src.toNonIndexed():src.clone();
  const p=g.attributes.position,uv=new Float32Array(p.count*2);
  const box=new THREE.Box3().setFromBufferAttribute(p),s=box.getSize(new THREE.Vector3());
  const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),n=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);d.fromBufferAttribute(p,i+2);
    e1.copy(b).sub(a);e2.copy(d).sub(a);n.copy(e1).cross(e2).normalize();
    const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
    for(let j=0;j<3;j++){
      const x=p.getX(i+j),y=p.getY(i+j),z=p.getZ(i+j);let u,v;
      if(az>=ax&&az>=ay){u=(x-box.min.x)/(s.x||1);v=(y-box.min.y)/(s.y||1)}
      else if(ax>=ay){u=(z-box.min.z)/(s.z||1);v=(y-box.min.y)/(s.y||1)}
      else{u=(x-box.min.x)/(s.x||1);v=(z-box.min.z)/(s.z||1)}
      uv[2*(i+j)]=u;uv[2*(i+j)+1]=v;
    }
  }
  g.setAttribute("uv",new THREE.BufferAttribute(uv,2));mesh.geometry=g;mesh.userData.materialUV=true;
}
function getTexture(url){
  if(!url)return Promise.resolve(null);if(textureCache.has(url))return textureCache.get(url);
  const p=new Promise(resolve=>textureLoader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(t)},undefined,e=>{console.error("Material texture failed",url,e);resolve(null)}));
  textureCache.set(url,p);return p;
}
async function applyMaterial(partIndex,names,mat){
  const targets=getPartMeshes(partIndex,names),tex=await getTexture(mat.previewUrl);
  targets.forEach(o=>{if(tex)ensureUV(o);const m=o.material.clone();m.color.set(tex?0xffffff:mat.hex);m.map=tex?tex.clone():null;if(m.map){const box=new THREE.Box3().setFromObject(o),s=box.getSize(new THREE.Vector3());const panelW=.6096,panelH=1.3207746;const vertical=Math.max(s.y,1e-6);const horizontal=Math.max(s.x,s.z,1e-6);m.map.repeat.set(Math.max(horizontal/panelW,.35),Math.max(vertical/panelH,.35));m.map.needsUpdate=true}m.metalness=0;m.roughness=.68;m.needsUpdate=true;o.material=m});
}
function buildControls(){
  const root=document.querySelector("#materialControls");root.innerHTML="";
  cfg.configurableParts.forEach((part,pi)=>{
    const wrap=document.createElement("section");wrap.className="control";
    wrap.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const selected=wrap.querySelector(".selected"),grid=wrap.querySelector(".material-grid");
    part.colors.forEach((mat,i)=>{
      const b=document.createElement("button");b.type="button";b.className="material-card"+(i===0?" active":"");
      const bg=mat.previewUrl?'background-image:url(&quot;'+mat.previewUrl+'&quot;);background-size:cover;background-position:center;':'background:'+mat.hex+';';
      b.innerHTML='<span class="material-sample" style="'+bg+'"></span><span class="material-meta"><strong>'+mat.name+'</strong><small>'+mat.code+'</small></span>';
      b.onclick=()=>{grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");selected.textContent=mat.name;applyMaterial(pi,part.meshNames,mat)};
      grid.appendChild(b);if(i===0)selected.textContent=mat.name;
    });root.appendChild(wrap);
  });
}
buildControls();
document.querySelector("#resetView").onclick=()=>{camera.position.copy(home.position);controls.target.copy(home.target);controls.update()};
if(!cfg.modelUrl){loading.classList.add("hidden");empty.classList.remove("hidden")}else new GLTFLoader().load(cfg.modelUrl,g=>{model=g.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});frame(model);loading.classList.add("hidden")},undefined,e=>{console.error(e);loading.classList.add("hidden");empty.classList.remove("hidden");empty.querySelector("strong").textContent="Impossible de charger le modèle"});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});