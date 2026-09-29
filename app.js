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
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} new ResizeObserver(resize).observe(host);
function frame(object){const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z); object.position.sub(center); const box2=new THREE.Box3().setFromObject(object); object.position.y-=box2.min.y; ground.position.y=-.003; const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))); camera.near=Math.max(max/1000,.001);camera.far=max*100;camera.updateProjectionMatrix();camera.position.set(d*.8,d*.55,d*1.15);controls.target.set(0,size.y*.42,0);controls.minDistance=max*.55;controls.maxDistance=max*4;controls.update();home={position:camera.position.clone(),target:controls.target.clone()}}
const textureLoader=new THREE.TextureLoader(),textureCache=new Map();
function projectedGeometry(mesh){
  if(mesh.userData.projectedUV)return;
  const src=mesh.geometry;
  const g=src.index?src.toNonIndexed():src.clone();
  const p=g.attributes.position,uv=new Float32Array(p.count*2);
  const W=.6096,H=1.3207746;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),n=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);d.fromBufferAttribute(p,i+2);
    e1.copy(b).sub(a);e2.copy(d).sub(a);n.copy(e1).cross(e2).normalize();
    const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
    for(let j=0;j<3;j++){const x=p.getX(i+j),y=p.getY(i+j),z=p.getZ(i+j);let u,v;
      if(az>=ax&&az>=ay){u=x/W;v=y/H}else if(ax>=ay){u=z/W;v=y/H}else{u=x/W;v=z/H}
      uv[2*(i+j)]=u;uv[2*(i+j)+1]=v;
    }
  }
  g.setAttribute("uv",new THREE.BufferAttribute(uv,2));mesh.geometry=g;mesh.userData.projectedUV=true;
}
function getTexture(mat){
  if(!mat.textureUrl)return Promise.resolve(null);
  if(textureCache.has(mat.textureUrl))return textureCache.get(mat.textureUrl);
  const p=new Promise(resolve=>textureLoader.load(mat.textureUrl,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();resolve(t)},undefined,()=>resolve(null)));
  textureCache.set(mat.textureUrl,p);return p;
}
async function applyMaterial(names,mat){
  if(!model)return;const tex=await getTexture(mat);
  model.traverse(o=>{if(o.isMesh&&names.includes(o.name)){
    if(tex)projectedGeometry(o);
    const m=o.material.clone();m.color.set(tex?0xffffff:mat.hex);m.map=tex?tex.clone():null;
    if(m.map){m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;m.map.needsUpdate=true}
    m.metalness=0;m.roughness=.68;m.needsUpdate=true;o.material=m;
  }});
}
function buildControls(){
  const root=document.querySelector("#materialControls"); root.innerHTML="";
  cfg.configurableParts.forEach((part,partIndex)=>{
    const wrap=document.createElement("section");wrap.className="control";
    wrap.innerHTML='<div class="control-head"><div><span class="step">Matériau</span><strong>'+part.label+'</strong></div><span class="selected"></span></div><div class="material-grid"></div>';
    const selected=wrap.querySelector(".selected"),grid=wrap.querySelector(".material-grid");
    part.materials.forEach((c,i)=>{
      const b=document.createElement("button");b.type="button";b.className="material-card"+(i===0?" active":"");
      b.innerHTML='<span class="material-sample" style="background-color:'+c.hex+';'+(c.previewUrl?'background-image:url(&quot;'+c.previewUrl+'&quot;);background-size:cover;background-position:center;':'')+'"></span><span class="material-meta"><strong>'+c.name+'</strong><small>'+(c.code||"")+'</small></span>';
      b.onclick=()=>{grid.querySelectorAll(".material-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");selected.textContent=c.name;applyMaterial(part.meshNames,c)};
      grid.appendChild(b);if(i===0)selected.textContent=c.name;
    });
    root.appendChild(wrap);
  });
}
buildControls();
document.querySelector("#resetView").onclick=()=>{camera.position.copy(home.position);controls.target.copy(home.target);controls.update()};
if(!cfg.modelUrl){loading.classList.add("hidden");empty.classList.remove("hidden")}else new GLTFLoader().load(cfg.modelUrl,g=>{model=g.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});frame(model);cfg.configurableParts.forEach(p=>p.materials[0]&&applyMaterial(p.meshNames,p.materials[0]));loading.classList.add("hidden")},undefined,e=>{console.error(e);loading.classList.add("hidden");empty.classList.remove("hidden");empty.querySelector("strong").textContent="Impossible de charger le modèle"});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});