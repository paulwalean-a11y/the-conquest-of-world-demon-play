'use strict';
// Shared controller and original Floor 1 combat. Paul's detailed armor is authored in Blender.
const MAP={halfX:18,halfZ:36,spawnZ:26,dragonZ:-21}; // 36 × 72 = 3 × the original 24 × 36 area.
const PLAYER_SPEED=7.2;
const PLAYER_MAX_HP=300,DRAGON_SCALE=5,DRAGON_RADIUS=4.5;
const $ = id => document.getElementById(id);
const canvas = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6c2119);
scene.fog = new THREE.FogExp2(0x6c2119, .013);
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true}); }
catch (error) { $('intro-text').textContent = 'WebGL is unavailable. Please open this game in Chrome or Edge with graphics acceleration enabled.'; $('start').hidden = true; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const camera = new THREE.PerspectiveCamera(54, innerWidth/innerHeight, .1, 180);
const hemisphere=new THREE.HemisphereLight(0xffbd88,0x6c2420,2);scene.add(hemisphere);
const moon = new THREE.DirectionalLight(0xffcaa0, 2.2);
moon.position.set(-9, 30, 8); moon.castShadow = true;
Object.assign(moon.shadow.camera, {left:-44,right:44,top:44,bottom:-44,far:100});
moon.shadow.mapSize.set(2048,2048); moon.shadow.bias = -.00035;moon.shadow.normalBias=.025;
scene.add(moon);
const mats = {};
function material(color, glow=0) {
  const key = color+':'+glow;
  return mats[key] ||= new THREE.MeshStandardMaterial({color,roughness:.85,emissive:glow,emissiveIntensity:glow?1:0});
}
function box(parent,x,y,z,w,h,d,color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material(color));
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function ring(radius,color) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(radius-.055,radius,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.65}));
  mesh.rotation.x=-Math.PI/2; mesh.position.y=.035; return mesh;
}
const pillars=[];
function buildInfernoEnvironment(){
if(window.INFERNO_KEEP_ASSET)return createBlenderArena(1);
const root=new THREE.Group();
const lava=box(root,0,-.5,0,180,.3,180,0xff5015);lava.material=material(0xff5015,0xd83408);lava.castShadow=false;
const floor=new THREE.InstancedMesh(new THREE.BoxGeometry(1.92,.3,1.92),material(0xffffff),648);
let tile=0;const tileMatrix=new THREE.Matrix4();
for(let x=-17;x<=17;x+=2)for(let z=-35;z<=35;z+=2){floor.setMatrixAt(tile,tileMatrix.makeTranslation(x,-.17,z));floor.setColorAt(tile++,new THREE.Color(((x+z)/2)%3===0?0x393037:0x494046));}
floor.receiveShadow=true;root.add(floor);
box(root,-18.3,.7,0,.6,1.4,72,0x342b31);box(root,18.3,.7,0,.6,1.4,72,0x342b31);
box(root,0,.7,-36.3,36,1.4,.6,0x342b31);box(root,0,.7,36.3,36,1.4,.6,0x342b31);
for(const x of [-14,14]) for(const z of [-28,-12,4,20]) {
  pillars.push({x,z,r:1.15});
  box(root,x,.2,z,2,.4,2,0x505b5e); box(root,x,2.25,z,1.3,4.1,1.3,0x39474f); box(root,x,4.3,z,1.9,.4,1.9,0x596267);
  box(root,x,2.5,z+.72,.17,.8,.2,0x262328);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.16,.5,5),material(0xffb45d,0xff7927));
  flame.position.set(x,3,z+.8); root.add(flame);
  if(z===-12 || z===20) {const light=new THREE.PointLight(0xff7336,20,12,2); light.position.copy(flame.position); root.add(light);}
}
box(root,-3.1,2.3,-35.7,1.1,4.6,1,0x626a68);box(root,3.1,2.3,-35.7,1.1,4.6,1,0x626a68);
box(root,0,4.6,-35.7,7.3,.7,1.2,0x626a68);
for(let x=-2.4;x<=2.4;x+=.8)box(root,x,2,-35.6,.13,4,.18,0x161e24);
const infernoFlames=[];
for(let i=0;i<18;i++){
  const side=i%2?1:-1,x=side*(22+(i%3)*4),z=-42+Math.floor(i/2)*10;
  const rock=new THREE.Mesh(new THREE.ConeGeometry(4,10+(i%4)*3,5),material(0x301d26));rock.position.set(x,3,z);root.add(rock);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,5),material(0xff8e29,0xef420b));flame.position.set(x,3,z+2);root.add(flame);infernoFlames.push(flame);
}
const fireSun=new THREE.Mesh(new THREE.SphereGeometry(7,16,12),new THREE.MeshBasicMaterial({color:0xff992d}));fireSun.position.set(-17,19,-69);root.add(fireSun);
const emberGeometry=new THREE.BufferGeometry(),emberVertices=[];
for(let i=0;i<100;i++)emberVertices.push(Math.sin(i*5.7)*30,(i%17)+1,Math.cos(i*2.3)*44);
emberGeometry.setAttribute('position',new THREE.Float32BufferAttribute(emberVertices,3));
const embers=new THREE.Points(emberGeometry,new THREE.PointsMaterial({color:0xffb54d,size:.12,transparent:true,opacity:.8}));root.add(embers);
const spawnRing=ring(1.6,0x83bfcb);spawnRing.position.z=MAP.spawnZ;root.add(spawnRing);
return {root,update(time){infernoFlames.forEach((flame,i)=>flame.scale.set(1,1+Math.sin(time*4+i)*.16,1));embers.position.y=(time*.4)%3;}};
}
function gem(parent,x,y,z,sx,sy,sz,color) {
  const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),material(color));
  mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function taper(parent,from,to,r1,r2,color) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,direction.length(),5),material(color));
  mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.castShadow=true;parent.add(mesh);return mesh;
}
function hero() {
  if(window.PAUL_HERO_ASSET)return createBlenderHero(scene,renderer);
  const root=new THREE.Group(); const body=new THREE.Group(); root.add(body);
  const silver=0xaabecb,gold=0xd6b36b,blue=0x234b79;
  gem(body,0,1.16,0,.49,.55,.33,silver);
  box(body,0,1.15,-.31,.32,.58,.06,blue);
  box(body,0,1.24,-.36,.06,.28,.04,gold);box(body,0,1.28,-.36,.22,.06,.04,gold);
  box(body,0,.79,0,.73,.12,.48,gold);
  const legs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.22,.78,0);body.add(leg);legs.push(leg);
    box(leg,0,-.33,0,.26,.65,.29,0x3b4c63);gem(leg,0,-.37,-.16,.19,.2,.13,silver);
    box(leg,0,-.66,-.08,.3,.22,.46,silver);
    box(body,side*.49,1.13,0,.25,.58,.3,silver);box(body,side*.5,.88,0,.28,.18,.32,gold);
    gem(body,side*.5,1.48,0,.38,.24,.37,gold);gem(body,side*.5,1.54,-.03,.3,.18,.31,silver);
  }
  gem(body,0,1.81,0,.32,.37,.3,silver);
  box(body,0,1.83,-.273,.39,.09,.065,0x172633);box(body,0,1.68,-.29,.06,.3,.055,gold);
  box(body,0,2.08,.02,.09,.18,.46,gold);gem(body,0,2.22,.16,.13,.27,.35,0xb83742);
  const cape=new THREE.Group();cape.position.set(0,1.5,.28);body.add(cape);
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute([-.35,0,0,.35,0,0,-.48,-1.18,.24,.35,0,0,.48,-1.18,.24,-.48,-1.18,.24],3));cloth.computeVertexNormals();
  const capeMat=new THREE.MeshStandardMaterial({color:0xb12f42,roughness:1,side:THREE.DoubleSide});
  const fabric=new THREE.Mesh(cloth,capeMat);fabric.castShadow=true;cape.add(fabric);
  box(cape,0,-.48,.11,.075,.65,.03,gold);box(cape,0,-.36,.09,.34,.07,.03,gold);
  const shield=new THREE.Group();shield.position.set(-.69,1.07,-.14);body.add(shield);
  gem(shield,0,0,0,.38,.52,.13,gold);gem(shield,0,0,-.06,.3,.43,.1,blue);
  box(shield,0,0,-.15,.045,.43,.035,gold);box(shield,0,.07,-.15,.26,.045,.035,gold);
  scene.add(root); return {root,body,legs,cape};
}
function dragon(){
  if(window.EMBER_DRAGON_ASSET)return createBlenderDragon();
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const red=0xa54838,dark=0x612e36,ivory=0xe1cfa1;
  gem(body,0,1.05,.2,.82,.65,1.02,red);gem(body,0,.85,-.3,.53,.48,.65,0xc38351);
  const legs=[];
  for(const x of [-.62,.62])for(const z of [-.52,.78]){
    const leg=new THREE.Group();leg.position.set(x,.82,z);body.add(leg);legs.push(leg);
    gem(leg,0,-.16,0,.25,.38,.26,red);box(leg,0,-.54,-.1,.28,.3,.43,dark);
    for(const toe of [-.09,.09])taper(leg,[toe,-.64,-.2],[toe,-.65,-.43],.065,0,ivory);
  }
  const head=new THREE.Group();head.position.set(0,1.32,-.75);body.add(head);
  gem(head,0,.08,-.16,.43,.4,.53,red);box(head,0,-.04,-.6,.53,.28,.58,red);
  const jaw=box(head,0,-.24,-.54,.48,.12,.66,dark);
  for(const side of [-1,1]){
    taper(head,[side*.27,.32,0],[side*.46,.83,.36],.13,0,ivory);
    const eye=gem(head,side*.33,.15,-.4,.075,.09,.16,0xffd458);eye.material=material(0xffd458,0xff961c);
    taper(head,[side*.2,-.13,-.66],[side*.2,-.32,-.66],.055,0,ivory);
    box(head,side*.15,.095,-.88,.065,.035,.03,0x241e23);
  }
  taper(body,[0,1.05,1],[0,.8,1.9],.3,.18,red);taper(body,[0,.8,1.9],[.35,.55,2.65],.18,.08,red);taper(body,[.35,.55,2.65],[.8,.73,3],.08,0,dark);
  for(const z of [-.25,.25,.75,1.25])taper(body,[0,1.62-z*.13,z],[0,2.05-z*.3,z+.12],.14,0,ivory);
  const wings=[];
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.position.set(side*.55,1.45,.1);body.add(wing);wings.push(wing);
    const points=[[0,0,0],[side*.8,1.5,.05],[side*2.4,1,.5],[side*1.65,.1,.75],[side*1.1,-.2,1.25],[0,-.1,.7]];
    const vertices=[];for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const membrane=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x862f3f,side:THREE.DoubleSide,roughness:1}));membrane.castShadow=true;wing.add(membrane);
    for(const i of [1,2,3,4])taper(wing,points[0],points[i],.065,.025,red);
    taper(wing,points[1],points[2],.075,.035,ivory);
  }
  scene.add(root);return {root,body,legs,head,jaw,wings};
}
function minion(x,z){
  if(window.ASHBOUND_THRALL_ASSET)return createBlenderMinion(x,z);
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  gem(body,0,.86,0,.34,.43,.24,0x8e352d);gem(body,0,1.3,0,.31,.3,.25,0xbc5a37);
  const legs=[box(body,-.17,.3,0,.16,.6,.2,0x41252d),box(body,.17,.3,0,.16,.6,.2,0x41252d)];
  for(const s of [-1,1]){
    taper(body,[s*.2,1.47,0],[s*.34,1.8,.12],.08,0,0xe2c38a);
    const eye=box(body,s*.12,1.32,-.23,.08,.06,.04,0xffd843);eye.material=material(0xffd843,0xff9b11);
    taper(body,[s*.3,1.06,0],[s*.47,.65,-.2],.11,.05,0x8e352d);
  }
  const warning=ring(1.35,0xff9345);warning.visible=false;root.add(warning);
  const bar=box(root,0,2,0,.65,.055,.055,0xff8b4d);bar.material=new THREE.MeshBasicMaterial({color:0xff8b4d});
  root.position.set(x,0,z);scene.add(root);
  return {root,body,legs,warning,bar,home:new THREE.Vector3(x,0,z),hp:20,maxHp:20,flash:0,cooldown:0,windup:0};
}
const player={...hero(),hp:PLAYER_MAX_HP,maxHp:PLAYER_MAX_HP,state:'NORMAL'};
player.root.position.set(0,0,MAP.spawnZ);
const kevin=player.weapon||new THREE.Group();kevin.position.set(.56,1,0);player.body.add(kevin);
if(!player.weapon){
box(kevin,0,-.1,0,.1,.34,.1,0x463b30);
box(kevin,0,.08,0,.5,.09,.14,0xbba777);
const blade=box(kevin,0,.76,0,.13,1.3,.07,0xc5e6ee);
blade.material=new THREE.MeshStandardMaterial({color:0xc5e6ee,emissive:0x438bb0,emissiveIntensity:.6,metalness:.65,roughness:.25});
}
kevin.rotation.x=-.55;
const slash=new THREE.Mesh(new THREE.RingGeometry(1.3,2.1,24,1,Math.PI/6,Math.PI*2/3),new THREE.MeshBasicMaterial({color:0xa7e9ff,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
slash.rotation.x=-Math.PI/2;slash.position.y=.9;slash.visible=false;player.root.add(slash);
const combat={cooldown:0,time:0,hit:false,swings:0,duration:.5,hitAt:.38,damage:10,heavy:false,facing:0};
slash.material.color.setHex(0xc6bca4);
const meteor={phase:'ready',aiming:false,distance:13,radius:6.5,damage:180,time:0,target:new THREE.Vector3(),rock:new THREE.Group()};
meteor.marker=ring(meteor.radius,0xffdc72);scene.add(meteor.marker);meteor.marker.visible=false;
const targetDisc=new THREE.Mesh(new THREE.CircleGeometry(meteor.radius,48),new THREE.MeshBasicMaterial({color:0xffb43d,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));
meteor.marker.add(targetDisc);targetDisc.position.z=.003;
const meteorStone=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,1),material(0x642d20,0x972d09));meteor.rock.add(meteorStone);
const meteorShell=new THREE.Mesh(new THREE.IcosahedronGeometry(2,1),new THREE.MeshBasicMaterial({color:0xff792c,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}));meteor.rock.add(meteorShell);
const meteorTail=new THREE.Mesh(new THREE.ConeGeometry(1.5,7,7),new THREE.MeshBasicMaterial({color:0xffbb53,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));meteorTail.position.y=4;meteor.rock.add(meteorTail);
scene.add(meteor.rock);meteor.rock.visible=false;
meteor.blast=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshBasicMaterial({color:0xffb34c,transparent:true,opacity:.7,depthWrite:false}));scene.add(meteor.blast);meteor.blast.visible=false;
meteor.shockwave=ring(1,0xffe49c);scene.add(meteor.shockwave);meteor.shockwave.visible=false;
const blackhole={aiming:false,active:false,distance:13,radius:8,duration:5,dps:25,pullSpeed:6,remaining:0,target:new THREE.Vector3(),root:new THREE.Group()};
blackhole.marker=ring(blackhole.radius,0xcb92ff);scene.add(blackhole.marker);blackhole.marker.visible=false;
const holeCore=new THREE.Mesh(new THREE.SphereGeometry(1.3,20,12),new THREE.MeshBasicMaterial({color:0x030008}));holeCore.position.y=1.5;blackhole.root.add(holeCore);
const holeOrbit=new THREE.Group();holeOrbit.position.y=1.5;blackhole.root.add(holeOrbit);
for(let i=0;i<3;i++){
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.7+i*.3,.08,6,40),new THREE.MeshBasicMaterial({color:i===0?0xe3baff:0x9b56ff,transparent:true,opacity:.85}));orbit.rotation.set(Math.PI/2+i*.45,0,i*.6);holeOrbit.add(orbit);
}
const swirlGeometry=new THREE.BufferGeometry(),swirlPositions=new Float32Array(36*3);swirlGeometry.setAttribute('position',new THREE.BufferAttribute(swirlPositions,3));
const swirl=new THREE.Points(swirlGeometry,new THREE.PointsMaterial({color:0xca8fff,size:.22}));blackhole.root.add(swirl);
scene.add(blackhole.root);blackhole.root.visible=false;
// One reusable beam: no cooldown, ammo, or accumulating projectile meshes.
const plasma={root:new THREE.Group(),time:0,range:26};
const plasmaCore=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1,8),new THREE.MeshBasicMaterial({color:0xeeffff}));
const plasmaGlow=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1,8),new THREE.MeshBasicMaterial({color:0x46ccff,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));
plasmaCore.position.y=.5;plasmaGlow.position.y=.5;plasma.root.add(plasmaCore,plasmaGlow);
plasma.root.visible=false;scene.add(plasma.root);
const plasmaRay=new THREE.Ray(),plasmaHit=new THREE.Vector3();
const plasmaRoom=new THREE.Box3(new THREE.Vector3(-MAP.halfX,0,-MAP.halfZ),new THREE.Vector3(MAP.halfX,9,MAP.halfZ));
const plasmaPillars=pillars.map(p=>new THREE.Box3(new THREE.Vector3(p.x-1,0,p.z-1),new THREE.Vector3(p.x+1,4.6,p.z+1)));
const plasmaTarget=new THREE.Sphere(new THREE.Vector3(),1.05);
let enemy;const minions=[],hostiles=[];
const danger=ring(8.5,0xff553a);danger.visible=false;
const breath={phase:'ready',time:0,cooldown:0,length:18,damage:30,origin:new THREE.Vector3(),direction:new THREE.Vector3(),root:new THREE.Group()};
for(const [radius,color,opacity] of [[3.3,0xff591a,.5],[1.8,0xffdd7b,.7]]){
  const fire=new THREE.Mesh(new THREE.ConeGeometry(radius,breath.length,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  fire.rotation.z=Math.PI;fire.position.y=breath.length/2;breath.root.add(fire);
}
scene.add(breath.root);breath.root.visible=false;
const breathWarningGeometry=new THREE.BufferGeometry();breathWarningGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));
breath.warning=new THREE.Mesh(breathWarningGeometry,new THREE.MeshBasicMaterial({color:0xc99a5a,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));
breath.warning.add(new THREE.LineLoop(breathWarningGeometry,new THREE.LineBasicMaterial({color:0xd3b180,transparent:true,opacity:.55,depthWrite:false})));scene.add(breath.warning);breath.warning.visible=false;
$('objective').textContent='Defeat the Ember Dragon · 500 HP';
const keys=new Set(); let yaw=0,pitch=.45,active=false,ended=false,elapsed=0,toastTime=0;
const testMode=new URLSearchParams(location.search).has('test');
function notify(text){$('toast').textContent=text;toastTime=2.5;}
function move(entity,dx,dz){
  const p=entity.root.position; p.x+=dx;p.z+=dz;
  const padding=entity.radius||.35;
  for(const c of pillars){const x=p.x-c.x,z=p.z-c.z,d=Math.hypot(x,z),r=c.r+padding;if(d<r){p.x=c.x+(d?x/d:1)*r;p.z=c.z+(d?z/d:0)*r;}}
  if(entity===player)for(const target of hostiles){if(!validTarget(target))continue;const x=p.x-target.root.position.x,z=p.z-target.root.position.z,d=Math.hypot(x,z),radius=(target.radius||.35)+.35;if(d<radius){p.x=target.root.position.x+(d?x/d:1)*radius;p.z=target.root.position.z+(d?z/d:0)*radius;}}
  const margin=entity===enemy?entity.radius:.5;
  p.x=THREE.MathUtils.clamp(p.x,-MAP.halfX+margin,MAP.halfX-margin);p.z=THREE.MathUtils.clamp(p.z,-MAP.halfZ+Math.max(1,margin),arenaActive?FLOORS[currentFloor].arena.entrance-margin:MAP.halfZ-Math.max(1,margin));
}
function updateCamera(){
  const p=player.root.position;
  const distance=souls.lock===enemy&&currentFloor===1?7.4:5.2;
  camera.position.set(THREE.MathUtils.clamp(p.x+Math.sin(yaw)*distance,-MAP.halfX+.2,MAP.halfX-.2),1.8+Math.sin(pitch)*4.5,THREE.MathUtils.clamp(p.z+Math.cos(yaw)*distance,-MAP.halfZ+.2,MAP.halfZ-.2));
  if(cameraShake>0){camera.position.x+=Math.sin(elapsed*80)*cameraShake*.45;camera.position.y+=Math.cos(elapsed*67)*cameraShake*.35;}
  const locked=souls.lock&&!meteor.aiming&&!blackhole.aiming?souls.lock:null;
  if(locked)camera.lookAt(p.x*.65+locked.root.position.x*.35,locked===enemy?(currentFloor===1?3.2:2.3):1.3,p.z*.65+locked.root.position.z*.35);
  else camera.lookAt(p.x-Math.sin(yaw)*2.5,1.45,p.z-Math.cos(yaw)*2.5);
  updateLock(0);
  if(arenaActive&&environment?.gate)environment.gate.visible=camera.position.z<FLOORS[currentFloor].arena.entrance-.1;
}
function update(dt){
  if(!active)return;
  elapsed+=dt;toastTime-=dt;if(toastTime<=0)$('toast').textContent='';
  if(updateFloor(dt)){updateCamera();return;}
  const dodging=updateDodge(dt);updateImpacts(dt);
  let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  const length=Math.hypot(x,z),sprinting=updateSouls(dt,!!length);updateLock(dt);
  const mobility=combat.time>0?.22:souls.heal.time>0?.16:sprinting?1.35:1;
  if(length&&!dodging){x/=length;z/=length;move(player,(x*Math.cos(yaw)+z*Math.sin(yaw))*PLAYER_SPEED*dt*mobility,(-x*Math.sin(yaw)+z*Math.cos(yaw))*PLAYER_SPEED*dt*mobility);}
  player.root.rotation.y=dodging?Math.atan2(-dodge.direction.x,-dodge.direction.z):combat.time>0?combat.facing:yaw;
  player.legs.forEach((leg,i)=>leg.rotation.x=length?Math.sin(elapsed*11+i*Math.PI)*.4:0);
  player.cape.rotation.x=Math.sin(elapsed*6)*.035+(length?.13:0);
  animateHeroDetails(player,elapsed,!!length,combat.time>0,dodging);
  updateCombat(dt);updatePlasma(dt);updateMeteor(dt);
  if(!active||transition)return;updateDimension(dt);if(!active||transition)return;
  FLOORS[currentFloor].controller(dt);updateMinions(dt);updateBlackhole(dt);updateCamera();
}
function aimMeteor(){
  meteor.target.set(THREE.MathUtils.clamp(player.root.position.x-Math.sin(yaw)*meteor.distance,-MAP.halfX+meteor.radius,MAP.halfX-meteor.radius),0,THREE.MathUtils.clamp(player.root.position.z-Math.cos(yaw)*meteor.distance,-MAP.halfZ+meteor.radius,MAP.halfZ-meteor.radius));
  meteor.marker.position.set(meteor.target.x,groundEffectHeight(),meteor.target.z);
}
function meteorSkill(){
  if(!canAct())return;
  if(blackhole.aiming)resetBlackhole();
  if(meteor.phase!=='ready'){notify('METEOR · '+(meteor.phase==='falling'?'FALLING':'EXPLODING'));return;}
  if(!meteor.aiming){
    meteor.aiming=true;meteor.marker.visible=true;aimMeteor();
    $('meteor-hint').hidden=false;$('meteor-hint').textContent='MOUSE: arah & jarak · E: jatuhkan meteor · ESC: batal / pause';
  }else{
    aimMeteor();meteor.aiming=false;meteor.phase='falling';meteor.time=0;meteor.rock.visible=true;
    meteor.rock.position.set(meteor.target.x+6,19.8,meteor.target.z-4);
    $('meteor-hint').hidden=false;$('meteor-hint').textContent='METEOR FALLING';notify('KEVIN · SKYFALL METEOR');
  }
}
function aimBlackhole(){
  blackhole.target.set(THREE.MathUtils.clamp(player.root.position.x-Math.sin(yaw)*blackhole.distance,-MAP.halfX+blackhole.radius,MAP.halfX-blackhole.radius),0,THREE.MathUtils.clamp(player.root.position.z-Math.cos(yaw)*blackhole.distance,-MAP.halfZ+blackhole.radius,MAP.halfZ-blackhole.radius));
  blackhole.marker.position.set(blackhole.target.x,groundEffectHeight()+.01,blackhole.target.z);
}
function blackholeSkill(){
  if(!canAct())return;
  if(blackhole.active){notify('BLACK HOLE · '+blackhole.remaining.toFixed(1)+'s');return;}
  if(meteor.aiming)resetMeteor();
  if(!blackhole.aiming){
    blackhole.aiming=true;blackhole.marker.visible=true;aimBlackhole();$('blackhole-hint').hidden=false;$('blackhole-hint').textContent='MOUSE: arah & jarak · F: Black Hole · ESC: batal / pause';
  }else{
    aimBlackhole();blackhole.aiming=false;blackhole.active=true;blackhole.remaining=blackhole.duration;
    blackhole.root.position.copy(blackhole.target);blackhole.root.visible=true;notify('KEVIN · BLACK HOLE');
  }
}
function resetBlackhole(){
  blackhole.aiming=false;blackhole.active=false;blackhole.remaining=0;blackhole.distance=13;
  blackhole.root.visible=false;blackhole.marker.visible=false;$('blackhole-hint').hidden=true;
}
function updateBlackhole(dt){
  if(!active)return;
  if(blackhole.aiming)aimBlackhole();
  if(!blackhole.active)return;
  const tick=Math.min(dt,blackhole.remaining);
  blackhole.remaining=Math.max(0,blackhole.remaining-tick);
  holeOrbit.rotation.y+=tick*3;
  for(let i=0;i<36;i++){
    const r=.4+((i/36+blackhole.remaining*.35)%1)*7.3,angle=i*2.4+elapsed*3;
    swirlPositions[i*3]=Math.cos(angle)*r;swirlPositions[i*3+1]=.4+(1-r/8)*1.4;swirlPositions[i*3+2]=Math.sin(angle)*r;
  }
  swirlGeometry.attributes.position.needsUpdate=true;
  $('blackhole-hint').hidden=false;$('blackhole-hint').textContent='BLACK HOLE · '+blackhole.remaining.toFixed(1)+'s · 25 HP/s';
  for(const target of hostiles){
    if(!validTarget(target))continue;
    const dx=blackhole.target.x-target.root.position.x,dz=blackhole.target.z-target.root.position.z,d=Math.hypot(dx,dz);
    if(d<=blackhole.radius){
      const distance=Math.min(d,blackhole.pullSpeed*tick);
      if(d>0)move(target,dx/d*distance,dz/d*distance);
      damageEnemy(blackhole.dps*tick,target);
    }
  }
  if(blackhole.remaining<=1e-8)resetBlackhole();
}
function resetMeteor(){
  meteor.phase='ready';meteor.aiming=false;meteor.time=0;meteor.distance=13;
  meteor.marker.visible=false;meteor.rock.visible=false;meteor.blast.visible=false;meteor.shockwave.visible=false;$('meteor-hint').hidden=true;
}
function updateMeteor(dt){
  if(!active)return;
  if(meteor.aiming)aimMeteor();
  if(meteor.phase==='falling'){
    meteor.time+=dt;const t=Math.min(1,meteor.time/1.6);
    meteor.rock.position.set(meteor.target.x+6*(1-t),1.8+18*(1-t),meteor.target.z-4*(1-t));
    meteorStone.rotation.set(t*4,t*3,0);
    if(t===1){
      meteor.phase='exploding';meteor.time=0;meteor.rock.visible=false;meteor.marker.visible=false;
      meteor.blast.position.set(meteor.target.x,.2,meteor.target.z);meteor.blast.scale.set(.2,.1,.2);meteor.blast.visible=true;meteor.blast.material.opacity=.75;
      meteor.shockwave.position.set(meteor.target.x,groundEffectHeight()+.015,meteor.target.z);meteor.shockwave.scale.set(.2,.2,1);meteor.shockwave.visible=true;meteor.shockwave.material.opacity=1;
      $('meteor-hint').textContent='METEOR IMPACT · 180 AREA DAMAGE';
      for(const target of hostiles)if(validTarget(target)&&Math.hypot(target.root.position.x-meteor.target.x,target.root.position.z-meteor.target.z)<=meteor.radius)damageEnemy(meteor.damage,target);
    }
  }else if(meteor.phase==='exploding'){
    meteor.time+=dt;const t=Math.min(1,meteor.time/.8),radius=.2+(meteor.radius-.2)*Math.min(1,t*2);
    meteor.blast.scale.set(radius,radius*.4,radius);meteor.blast.material.opacity=.75*(1-t);
    meteor.shockwave.scale.set(radius,radius,1);meteor.shockwave.material.opacity=1-t;
    if(t===1)resetMeteor();
  }
}
function tracePlasma(){
  player.root.rotation.y=yaw;
  kevin.rotation.set(-Math.PI/2,0,0);
  const origin=kevin.localToWorld(new THREE.Vector3(0,1.45,0));
  const aim=player.root.position.clone().add(new THREE.Vector3(-Math.sin(yaw)*plasma.range,1,-Math.cos(yaw)*plasma.range));
  plasmaRay.set(origin,aim.sub(origin).normalize());
  let distance=plasma.range;
  for(const obstacle of [plasmaRoom,...plasmaPillars]){
    if(plasmaRay.intersectBox(obstacle,plasmaHit))distance=Math.min(distance,origin.distanceTo(plasmaHit));
  }
  let hit=null;
  for(const target of hostiles){
    plasmaTarget.center.copy(target.root.position);plasmaTarget.center.y=target.hitHeight||1;plasmaTarget.radius=target===enemy?target.radius:.65;
    if(validTarget(target)&&plasmaRay.intersectSphere(plasmaTarget,plasmaHit)){
      const targetDistance=origin.distanceTo(plasmaHit);
      if(targetDistance<distance){distance=targetDistance;hit=target;}
    }
  }
  plasma.root.position.copy(origin);
  plasma.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),plasmaRay.direction);
  plasma.root.scale.set(1,distance,1);plasma.root.visible=true;
  return hit;
}
function firePlasma(){
  if(!canAct())return;
  plasma.time=.18;notify('KEVIN · LIGHT PLASMA');
  const hit=tracePlasma();if(hit)damageEnemy(25,hit);
}
function updatePlasma(dt){
  if(!active)return;
  if(keys.has('KeyQ')&&canAct()){
    plasma.time=.18;
    const hit=tracePlasma();if(hit)damageEnemy(40*dt,hit);
  }else plasma.time=Math.max(0,plasma.time-dt);
  plasma.root.visible=active&&plasma.time>0;
  plasmaGlow.material.opacity=(.32+Math.sin(elapsed*40)*.1)*Math.min(1,plasma.time/.1);
}
function updateCombat(dt){
  combat.cooldown=Math.max(0,combat.cooldown-dt);
  combat.time=Math.max(0,combat.time-dt);
  slash.visible=combat.time>0;
  if(combat.time>0){
    const progress=1-combat.time/combat.duration;
    const swing=THREE.MathUtils.smoothstep(progress,combat.heavy?.25:.18,combat.heavy?.75:.68);
    kevin.rotation.set(combat.heavy?-1.75+Math.sin(swing*Math.PI)*.6:-1.1,1.35-swing*2.7,-.4);
    slash.material.opacity=Math.sin(swing*Math.PI)*.2;
    if(progress>=combat.hitAt&&!combat.hit){combat.hit=true;strikeTarget();}
  }else {kevin.rotation.set(-.55,0,0);if(player.state==='ATTACKING')player.state='NORMAL';}
}
function resetBreath(){breath.phase='ready';breath.time=0;breath.cooldown=0;breath.root.visible=false;breath.warning.visible=false;}
function beginBreath(){
  breath.phase='windup';breath.time=1.1;enemy.head.rotation.x=-.6;enemy.jaw.rotation.x=.4;
  breath.warning.position.set(0,0,0);
  breath.origin.copy(enemy.head.localToWorld(new THREE.Vector3(0,-.1,-.9)));
  breath.direction.copy(player.root.position).add(new THREE.Vector3(0,1,0)).sub(breath.origin).normalize();
  breath.root.position.copy(breath.origin);breath.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),breath.direction);
  const end=breath.origin.clone().addScaledVector(breath.direction,breath.length),side=new THREE.Vector3(-breath.direction.z,0,breath.direction.x).normalize().multiplyScalar(3.3);
  const positions=breathWarningGeometry.attributes.position;
  positions.setXYZ(0,breath.origin.x,.07,breath.origin.z);positions.setXYZ(1,end.x+side.x,.07,end.z+side.z);positions.setXYZ(2,end.x-side.x,.07,end.z-side.z);positions.needsUpdate=true;breathWarningGeometry.computeBoundingSphere();
  breath.warning.visible=true;enemy.state='FIRE BREATH — dodge sideways!';$('enemy-status').textContent=enemy.state;
}
function updateBreath(dt){
  if(breath.phase==='ready')return false;
  const tick=Math.min(dt,breath.time);breath.time=Math.max(0,breath.time-tick);
  enemy.head.rotation.x=-.6;enemy.jaw.rotation.x=.4;
  const mouth=enemy.head.localToWorld(new THREE.Vector3(0,-.1,-.9));
  breath.warning.position.x+=mouth.x-breath.origin.x;breath.warning.position.z+=mouth.z-breath.origin.z;
  breath.origin.copy(mouth);breath.root.position.copy(mouth);
  if(breath.phase==='windup'){
    enemy.state='FIRE BREATH — dodge sideways!';
    if(breath.time<=1e-8){breath.phase='fire';breath.time=2;breath.root.visible=true;breath.warning.visible=false;}
  }else{
    enemy.state='FIRE BREATH';breath.root.scale.set(1+Math.sin(elapsed*35)*.07,1,1+Math.sin(elapsed*35)*.07);
    const delta=player.root.position.clone().add(new THREE.Vector3(0,1,0)).sub(breath.origin),along=delta.dot(breath.direction);
    const width=.65+3.3*along/breath.length;
    if(along>=0&&along<=breath.length&&delta.lengthSq()-along*along<=width*width){
      const distance=delta.length();plasmaRay.set(breath.origin,delta.clone().normalize());
      const blocked=plasmaPillars.some(box=>plasmaRay.intersectBox(box,plasmaHit)&&breath.origin.distanceTo(plasmaHit)<distance);
      if(!blocked)damagePlayer(breath.damage*tick);
    }
    if(breath.time<=1e-8){breath.phase='ready';breath.cooldown=6;breath.root.visible=false;enemy.cooldown=1;enemy.head.rotation.x=0;enemy.jaw.rotation.x=0;}
  }
  $('enemy-status').textContent=enemy.state;return true;
}
function updateDragon(dt){
  if(enemy.hp<=0||!active)return;
  const p=player.root.position,e=enemy.root.position;
  const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);
  enemy.cooldown=Math.max(0,enemy.cooldown-dt);updateBossHitFeedback(enemy,dt);
  breath.cooldown=Math.max(0,breath.cooldown-dt);
  $('enemy-hud').hidden=d>26&&enemy.hp===enemy.maxHp;
  enemy.wings.forEach((wing,i)=>wing.rotation.z=(i===0?1:-1)*(.12+Math.sin(elapsed*2.5)*.1));
  if(updateBreath(dt))return;
  if(enemy.windup>0){
    enemy.windup=Math.max(0,enemy.windup-dt);enemy.state='Dragon bite — move away!';
    enemy.head.rotation.x=-.45;enemy.jaw.rotation.x=.35;
    if(enemy.windup===0){
      enemy.cooldown=1.1;danger.visible=false;enemy.head.rotation.x=.25;enemy.jaw.rotation.x=0;
      if(d<8.5)damagePlayer(14);
    }
  }else if(d<26||(enemy.state!=='Idle'&&d<30)){
    enemy.root.rotation.y=Math.atan2(-dx,-dz);
    if(d>8.5&&breath.cooldown===0&&enemy.cooldown===0){beginBreath();return;}
    if(d>6.5){move(enemy,dx/d*2.3*dt,dz/d*2.3*dt);enemy.state='Pursuing Paul';}
    else if(enemy.cooldown===0){enemy.windup=.65;danger.visible=true;enemy.state='Dragon bite — move away!';}
    else enemy.state='Recovering';
  }else {enemy.state='Idle';}
  if(enemy.windup===0)enemy.head.rotation.x=THREE.MathUtils.lerp(enemy.head.rotation.x,0,dt*6);
  enemy.legs.forEach((leg,i)=>leg.rotation.x=enemy.state==='Pursuing Paul'?Math.sin(elapsed*9+i*Math.PI)*.35:0);
  $('enemy-status').textContent=enemy.state;
}
function updateMinions(dt){
  if(!active)return;
  for(const mob of minions){
    if(!active||transition)return;if(!validTarget(mob))continue;
    const dx=player.root.position.x-mob.root.position.x,dz=player.root.position.z-mob.root.position.z,d=Math.hypot(dx,dz);
    mob.cooldown=Math.max(0,mob.cooldown-dt);
    if(mob.hitMaterials)updateBossHitFeedback(mob,dt);
    else{mob.flash=Math.max(0,mob.flash-dt);mob.body.visible=mob.flash<=0||Math.floor(mob.flash*45)%2===0;}
    if(mob.windup>0){
      mob.windup=Math.max(0,mob.windup-dt);mob.body.rotation.x=-.2;
      if(mob.windup===0){mob.warning.visible=false;mob.body.rotation.x=0;mob.cooldown=1.2;if(d<1.35)damagePlayer(mob.damage);}
    }else if(d<mob.aggro){
      mob.root.rotation.y=Math.atan2(-dx,-dz);
      if(d>1){move(mob,dx/d*mob.speed*dt,dz/d*mob.speed*dt);}
      else if(mob.cooldown===0){mob.windup=mob.attackWindup;mob.warning.visible=true;}
    }
    mob.legs.forEach((leg,i)=>leg.rotation.x=d<mob.aggro&&d>1?Math.sin(elapsed*13+i*Math.PI)*.35:0);
  }
}
function damagePlayer(amount){
  if(!active||transition||isInvulnerable())return;if(souls.heal.time>0)cancelFlask();souls.damageFlash=Math.min(1,souls.damageFlash+.3);player.hp=Math.max(0,player.hp-amount);$('hp-text').textContent=Math.ceil(player.hp)+' / '+player.maxHp;$('hp-fill').style.width=(player.hp/player.maxHp*100)+'%';if(amount>=1)notify('−'+Math.round(amount)+' HP');if(player.hp===0)finish(false);
}
function strikeTarget(){
  for(const target of hostiles){
    if(!validTarget(target))continue;
    const dx=target.root.position.x-player.root.position.x,dz=target.root.position.z-player.root.position.z,d=Math.hypot(dx,dz);
    const facing=(-Math.sin(combat.facing)*dx-Math.cos(combat.facing)*dz)/(d||1);
    if(d<=2.25+(target===enemy?target.radius:0)&&facing>=.5){damageEnemy(combat.damage,target);cameraShake=combat.heavy?.18:.08;burst(target.root.position,0xb9a587,.5);notify('KEVIN · '+combat.damage+' DAMAGE');}
  }
}
function damageEnemy(amount,target=enemy){
  if(!active||transition||!validTarget(target))return;
  target.hp=Math.max(0,target.hp-amount);target.flash=.16;
  if(target.hp===0)awardSouls(target);
  if(target===enemy){
    updateBossHitFeedback(enemy,0);
    $('enemy-fill').style.width=(enemy.hp/enemy.maxHp*100)+'%';$('enemy-hp').textContent=Math.ceil(enemy.hp)+' / '+enemy.maxHp;
    if(enemy.hp===0){enemy.root.visible=false;danger.visible=false;floorCleared();}
  }else{
    target.bar.scale.x=target.hp/target.maxHp;
    if(target.hp===0){target.root.visible=false;target.warning.visible=false;$('minion-count').textContent='Minions: '+minions.filter(m=>m.hp>0).length+' / '+minions.length;}
  }
}
function finish(won){
  if(!won)dropSouls();
  active=false;ended=true;keys.clear();resetExtraCombat();player.state=won?'NORMAL':'DEAD';bannerTime=0;$('floor-banner').hidden=true;document.exitPointerLock?.();
  resetMeteor();
  resetBlackhole();resetBreath();
  plasma.time=0;plasma.root.visible=false;
  $('overlay').hidden=false;$('enemy-hud').hidden=true;
  document.body.classList.toggle('player-dead',!won);
  document.querySelector('h1').innerHTML=won?'VICTORY<span>'+FLOORS[currentFloor].bossName+' DEFEATED</span>':'YOU DIED<span>THE EMBER REMEMBERS</span>';
  $('intro-text').textContent=won?'Floor '+currentFloor+' cleared. Paul and Kevin have conquered '+FLOORS[currentFloor].name+'.':'Read the telegraph, dodge, then counterattack. Your current floor is ready for a retry.';
  $('start').innerHTML='PLAY AGAIN <span>→</span>';
  $('scope').textContent=FLOORS[currentFloor].name+' · Floor '+currentFloor;
}
function attack(heavy=false){if(!canAct()||combat.cooldown>0||!spendStamina(heavy?34:18))return false;player.state='ATTACKING';combat.heavy=heavy;combat.duration=heavy?.95:.5;combat.cooldown=heavy?1.08:.65;combat.time=combat.duration;combat.hitAt=heavy?.48:.38;combat.damage=heavy?32:10;combat.facing=yaw;combat.hit=false;combat.swings++;return true;}
function pause(){if(!active)return;active=false;keys.clear();rightGesture=null;if(meteor.aiming)resetMeteor();if(blackhole.aiming)resetBlackhole();$('meteor-hint').hidden=true;$('blackhole-hint').hidden=true;if(document.pointerLockElement)document.exitPointerLock();$('overlay').hidden=false;$('start').innerHTML='RESUME <span>→</span>';$('intro-text').textContent='Your journey is paused.';}
function resetEncounter(){loadFloor(currentFloor);}
function restartFloor(){active=false;resetEncounter();$('overlay').hidden=false;$('start').innerHTML='ENTER THE DUNGEON <span>→</span>';$('intro-text').textContent='Floor '+currentFloor+' · A fresh attempt awaits.';if(document.pointerLockElement)document.exitPointerLock();}
function start(){if(ended)resetEncounter();active=true;$('overlay').hidden=true;if(meteor.phase!=='ready')$('meteor-hint').hidden=false;if(!testMode){try{const request=canvas.requestPointerLock();if(request?.catch)request.catch(()=>notify('Hold right mouse and drag to look.'));}catch{notify('Hold right mouse and drag to look.');}}}
$('start').addEventListener('click',start);
addEventListener('keydown',event=>{if(active&&['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','Space','Tab'].includes(event.code))event.preventDefault();if(event.code==='Escape')pause();if(event.code==='KeyR'&&!event.repeat)restartFloor();if(active){keys.add(event.code);if(event.code==='Tab'&&!event.repeat)toggleLock();if(event.code==='KeyC'&&!event.repeat)useFlask();if(event.code==='KeyG'&&!event.repeat)restAtShrine();if(event.code==='Space'&&!event.repeat)tryDodge();if(event.code==='KeyQ'&&!event.repeat)firePlasma();if(event.code==='KeyE'&&!event.repeat)meteorSkill();if(event.code==='KeyF'&&!event.repeat)blackholeSkill();}});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)pause();});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
let rightGesture=null;
document.addEventListener('mousemove',event=>{if(rightGesture&&Math.hypot(event.clientX-rightGesture.x,event.clientY-rightGesture.y)>5)rightGesture.dragged=true;if(active&&(meteor.aiming||blackhole.aiming||document.pointerLockElement===canvas||(event.buttons&2))){yaw-=event.movementX*.003;if(meteor.aiming){meteor.distance=THREE.MathUtils.clamp(meteor.distance-event.movementY*.065,4,30);aimMeteor();}else if(blackhole.aiming){blackhole.distance=THREE.MathUtils.clamp(blackhole.distance-event.movementY*.065,4,30);aimBlackhole();}else pitch=THREE.MathUtils.clamp(pitch+event.movementY*.002,.15,.95);}});
canvas.addEventListener('mousedown',event=>{if(!active)return;if(event.button===0)attack(event.shiftKey);if(event.button===2){event.preventDefault();if(document.pointerLockElement===canvas)fireDimension();else rightGesture={x:event.clientX,y:event.clientY,dragged:false};}});
document.addEventListener('mouseup',event=>{if(event.button===2){if(rightGesture&&!rightGesture.dragged)fireDimension();rightGesture=null;}});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();resizeSoulsPresentation();}
addEventListener('resize',resize);
let previous=performance.now();
function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;if(!testMode)update(dt);renderSoulsFrame(now);requestAnimationFrame(frame);}
