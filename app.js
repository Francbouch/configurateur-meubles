import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const cfg=window.FURNITURE_CONFIG;
const host=document.querySelector("#viewer"),loading=document.querySelector("#loading"),empty=document.querySelector("#empty");
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xe9e6df);
const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.06; controls.minPolarAngle=.2; controls.maxPolarAngle=Math.PI/2+.08; controls.minAzimuthAngle=-Math.PI*.48; controls.maxAzimuthAngle=Math.PI*.48;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a8378,2.2));
const key=new THREE.DirectionalLight(0xffffff,3.5); key.position.set(4,7,5); key.castShadow=true; scene.add(key);
const fill=new THREE.DirectionalLight(0xfff3e0,1.2); fill.position.set(-5,3,-2); scene.add(fill);
const FT=.3048, ROOM=25*FT, WALL_H=9*FT;
const roomGroup=new THREE.Group(); scene.add(roomGroup);

// Luxury oak floor — true 25' x 25' footprint.
const floorMat=new THREE.MeshStandardMaterial({color:0xb88656,roughness:.64,metalness:0});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(ROOM,ROOM),floorMat);
floor.rotation.x=-Math.PI/2; floor.position.y=-.012; floor.receiveShadow=true; roomGroup.add(floor);

// Subtle plank joints so the floor reads as premium hardwood at every angle.
const jointMat=new THREE.LineBasicMaterial({color:0x6f4c30,transparent:true,opacity:.16});
for(let x=-ROOM/2+.18;x<ROOM/2;x+=.18){
  const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.001,-ROOM/2),new THREE.Vector3(x,.001,ROOM/2)]);
  roomGroup.add(new THREE.Line(g,jointMat));
}

// Warm greige 9' wall + substantial white baseboard.
const wallMat=new THREE.MeshStandardMaterial({color:0xd9cbb9,roughness:.92,metalness:0,side:THREE.FrontSide});
const backWall=new THREE.Mesh(new THREE.PlaneGeometry(ROOM,WALL_H),wallMat);
backWall.position.set(0,WALL_H/2,-ROOM/2); backWall.receiveShadow=true; roomGroup.add(backWall);
const baseboardMat=new THREE.MeshStandardMaterial({color:0xf4f1eb,roughness:.7,metalness:0});
const baseboard=new THREE.Mesh(new THREE.BoxGeometry(ROOM,.16,.045),baseboardMat);
baseboard.position.set(0,.08,-ROOM/2+.023); baseboard.castShadow=true; roomGroup.add(baseboard);

// Soft studio daylight from the left, inspired by a large luxury-room window.
const windowLight=new THREE.RectAreaLight(0xffe6c4,5.2,2.2,2.5);
windowLight.position.set(-ROOM*.38,1.65,ROOM*.12); windowLight.lookAt(0,1.05,-ROOM/2); scene.add(windowLight);
const sun=new THREE.DirectionalLight(0xffdfb0,2.2); sun.position.set(-4,5,4); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(ROOM,ROOM),new THREE.ShadowMaterial({color:0x000000,opacity:.14}));
ground.rotation.x=-Math.PI/2;ground.position.y=.004;ground.receiveShadow=true;scene.add(ground);
let model,home={position:new THREE.Vector3(),target:new THREE.Vector3()};
const textureLoader=new THREE.TextureLoader(),textureCache=new Map();
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} new ResizeObserver(resize).observe(host);
function frame(object){
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z);
  object.position.sub(center);
  let b=new THREE.Box3().setFromObject(object);
  object.position.y-=b.min.y;
  b=new THREE.Box3().setFromObject(object);
  // Flush the furniture's rear face to the 25' room's rear wall.
  object.position.z+=(-ROOM/2+.055)-b.min.z;
  b=new THREE.Box3().setFromObject(object);
  const c=b.getCenter(new THREE.Vector3());
  const d=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  camera.near=Math.max(max/1000,.001); camera.far=100; camera.updateProjectionMatrix();
  camera.position.set(c.x+d*.92,size.y*.58,c.z+d*1.55);
  controls.target.set(c.x,size.y*.43,c.z);
  controls.minDistance=max*.7; controls.maxDistance=Math.min(max*3.2,ROOM*.72);
  controls.minAzimuthAngle=-Math.PI*.42; controls.maxAzimuthAngle=Math.PI*.42;
  controls.update(); home={position:camera.position.clone(),target:controls.target.clone()};
}
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
  targets.forEach(o=>{if(tex)ensureUV(o);const m=o.material.clone();m.color.set(tex?0xffffff:mat.hex);m.map=tex?tex.clone():null;if(m.map){m.map.repeat.set(1,1);m.map.needsUpdate=true}m.metalness=0;m.roughness=.68;m.needsUpdate=true;o.material=m});
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