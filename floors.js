'use strict';
// Register another floor here; progression and cleanup do not depend on floor count.
const FLOORS={
  1:{name:'Inferno Keep',bossName:'EMBER DRAGON',effectHeight:.06,build:buildInfernoEnvironment,boss:spawnDragon,controller:updateDragon,
    mobs:[[-5,15],[5,12],[-10,3],[8,0],[-5,-9],[5,-12],[-10,-24],[10,-27]],hp:20,speed:2.8,damage:5,aggro:9,windup:.45,sky:0x6c2119},
  2:{name:'Skybound Citadel',bossName:'THE GLEAM EYES',effectHeight:.22,build:buildCastleEnvironment,boss:gleamEyes,controller:updateGleam,
    mobs:[[-5,19],[6,16],[-9,7],[8,4],[-5,-4],[5,-7]],hp:32,speed:3.5,damage:8,aggro:13,windup:.6,sky:0x7289b0,arena:{entrance:-13}}
};
let currentFloor=1,environment=null,transition=null,arenaActive=false,bannerTime=0;
const FLOOR_TRAVEL_KEY='world-demon.floor-travel.v1';
let floorTravelUnlocked=false;
try{floorTravelUnlocked=localStorage.getItem(FLOOR_TRAVEL_KEY)==='unlocked';}catch{/* Session progression still works if storage is unavailable. */}
function groundEffectHeight(){return FLOORS[currentFloor].effectHeight??.06;}
function updateFloorTravel(){
  $('floor-travel-options').hidden=!floorTravelUnlocked;
  $('floor-travel-locked').hidden=floorTravelUnlocked;
}
function unlockFloorTravel(){
  floorTravelUnlocked=true;
  try{localStorage.setItem(FLOOR_TRAVEL_KEY,'unlocked');}catch{/* Keep the unlock for this session. */}
  updateFloorTravel();
}
function selectFloor(number){
  if(!floorTravelUnlocked||![1,2].includes(number)||$('overlay').hidden)return false;
  active=false;loadFloor(number);start();return true;
}
// Each boss owns its feedback materials; shared hero/environment materials stay untouched.
function initBossHitFeedback(boss){
  const copies=new Map();boss.hitMaterials=[];
  boss.body.traverse(mesh=>{if(!mesh.material)return;
    const copy=source=>{
      if(!copies.has(source)){
        const mat=source.clone();copies.set(source,mat);
        if(mat.emissive)boss.hitMaterials.push({material:mat,color:mat.color.clone(),emissive:mat.emissive.clone(),intensity:mat.emissiveIntensity});
      }
      return copies.get(source);
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
  });
}
const hitRed=new THREE.Color(0xff3322);
function updateBossHitFeedback(boss,dt){
  boss.flash=Math.max(0,boss.flash-dt);boss.body.visible=true;
  const strength=Math.min(1,boss.flash/.16);
  for(const base of boss.hitMaterials){
    base.material.color.copy(base.color).lerp(hitRed,.16*strength);
    base.material.emissive.copy(base.emissive).lerp(hitRed,.32*strength);
    base.material.emissiveIntensity=Math.max(base.intensity,.65*strength);
  }
}
function disposeRoot(root){
  if(!root)return;root.removeFromParent();
  const cached=new Set([...Object.values(mats),...worldAssetCache.materials.values()]),geometries=new Set(),materials=new Set();
  root.traverse(object=>{if(object.geometry&&!object.userData.sharedGeometry)geometries.add(object.geometry);if(object.material)for(const m of [].concat(object.material))if(!cached.has(m))materials.add(m);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
function showBanner(label,title,time=2){$('floor-banner').hidden=false;$('floor-label').textContent=label;$('floor-title').textContent=title;bannerTime=time;}
function clearCurrentFloor(){
  rightGesture=null;
  resetMeteor();resetBlackhole();resetBreath();resetExtraCombat();plasma.time=0;plasma.root.visible=false;slash.visible=false;
  danger.removeFromParent();danger.visible=false;
  for(const target of hostiles){disposeRoot(target.effects);disposeRoot(target.root);}
  hostiles.length=0;minions.length=0;disposeRoot(environment?.root);environment=null;pillars.length=0;plasmaPillars.length=0;
  arenaActive=false;transition=null;bannerTime=0;$('floor-banner').hidden=true;
}
function spawnDragon(){
  const boss={...dragon(),hp:500,maxHp:500,radius:DRAGON_RADIUS,hitHeight:1.3,cooldown:0,windup:0,flash:0,state:'Idle'};
  boss.body.scale.setScalar(DRAGON_SCALE);return boss;
}
function spawnFloorEnemies(){
  const config=FLOORS[currentFloor];
  for(const [x,z] of config.mobs){
    const mob=minion(x,z);Object.assign(mob,{hp:config.hp,maxHp:config.hp,speed:config.speed,damage:config.damage,aggro:config.aggro,attackWindup:config.windup,radius:.35});
    if(config.arena){
      mob.body.scale.setScalar(1.12);
      if(!mob.root.userData.blender){box(mob.body,0,1.2,-.27,.6,.65,.14,0x6c9aa9);box(mob.body,.5,.9,-.4,.1,1.2,.12,0xb5f5ff);}
      mob.warning.material.color.setHex(0xffd36d);
    }
    if(mob.root.userData.blender)initBossHitFeedback(mob);
    minions.push(mob);hostiles.push(mob);
  }
}
function spawnFloorBoss(){
  enemy=FLOORS[currentFloor].boss();enemy.root.position.set(0,0,MAP.dragonZ);enemy.root.rotation.y=Math.PI;
  enhanceBossVisuals(enemy,currentFloor);
  initBossHitFeedback(enemy);
  enemy.dormant=!!FLOORS[currentFloor].arena;hostiles.unshift(enemy);
  if(!FLOORS[currentFloor].arena)enemy.root.add(danger);
}
function loadFloor(number){
  if(!FLOORS[number])return false;
  clearCurrentFloor();currentFloor=number;const config=FLOORS[number];
  document.body.classList.remove('player-dead');
  scene.background.setHex(config.sky);scene.fog.color.setHex(config.sky);scene.fog.density=config.arena?.007:.013;
  hemisphere.color.setHex(config.arena?0xcceaff:0xffbd88);hemisphere.groundColor.setHex(config.arena?0x53617e:0x6c2420);
  moon.color.setHex(config.arena?0xdaf8ff:0xffcaa0);
  environment=config.build();enhanceWorldVisuals(environment,number);scene.add(environment.root);spawnFloorEnemies();spawnFloorBoss();
  for(const p of pillars)plasmaPillars.push(new THREE.Box3(new THREE.Vector3(p.x-p.r,0,p.z-p.r),new THREE.Vector3(p.x+p.r,4.6,p.z+p.r)));
  ended=false;yaw=0;pitch=.45;elapsed=0;keys.clear();player.hp=player.maxHp;player.root.position.set(0,0,MAP.spawnZ);player.root.rotation.set(0,0,0);
  Object.assign(combat,{cooldown:0,time:0,hit:false,swings:0});
  $('floor-number').textContent='FLOOR '+String(number).padStart(2,'0');$('location-name').textContent=config.name;
  $('objective').textContent=config.arena?'Reach the citadel arena.':'Defeat the Ember Dragon · 500 HP';
  $('minion-count').textContent='Minions: '+minions.length+' / '+minions.length;
  $('boss-name').textContent=config.bossName;$('enemy-hud').hidden=true;$('enemy-status').textContent=enemy.dormant?'Dormant':'Idle';
  $('enemy-hp').textContent=enemy.hp+' / '+enemy.maxHp;$('enemy-fill').style.width='100%';
  $('hp-text').textContent=player.maxHp+' / '+player.maxHp;$('hp-fill').style.width='100%';$('toast').textContent='';
  $('scope').textContent=config.name+' · '+config.bossName;$('build-floor').textContent=config.name;
  document.querySelector('h1').innerHTML='<span class="title-prefix">The conquest of</span> <span class="title-main">world Demon</span>';
  resetSoulsCombat();updateFloorTravel();updateCamera();return true;
}
function floorCleared(){
  if(transition)return;
  if(currentFloor===2)unlockFloorTravel();
  resetMeteor();resetBlackhole();resetBreath();resetExtraCombat();keys.clear();combat.time=0;slash.visible=false;plasma.time=0;plasma.root.visible=false;
  if(enemy.effects)enemy.effects.visible=false;
  transition={time:0,next:currentFloor+1};showBanner('FLOOR '+currentFloor+' CLEARED','VICTORY',3);
}
function updateFloor(dt){
  if(transition){
    transition.time+=dt;
    if(transition.time>=1.3&&FLOORS[transition.next])showBanner('THE ASCENT CONTINUES','ASCENDING TO FLOOR '+transition.next+'...',2);
    if(transition.time>=2.8){const next=transition.next;if(FLOORS[next]){loadFloor(next);showBanner('FLOOR '+next,FLOORS[next].name,2.5);}else{transition=null;finish(true);}}
    return true;
  }
  bannerTime=Math.max(0,bannerTime-dt);if(!bannerTime)$('floor-banner').hidden=true;
  const arena=FLOORS[currentFloor].arena;
  if(arena&&!arenaActive&&player.root.position.z<arena.entrance){
    arenaActive=true;enemy.dormant=false;enemy.gleam.intro=2.2;
    minions.forEach(m=>{m.dormant=true;m.root.visible=false;});
    environment.gate.visible=true;$('minion-count').textContent='Arena sealed · minions excluded';
    $('objective').textContent='Defeat The Gleam Eyes';$('enemy-hud').hidden=false;
    showBanner('FLOOR '+currentFloor+' BOSS','THE GLEAM EYES',2.2);
  }
  environment?.update?.(elapsed);
  return false;
}
function buildCastleEnvironment(){
  if(window.SKYBOUND_CITADEL_ASSET)return createBlenderArena(2);
  const root=new THREE.Group(),stone=0x7f8e9b,trim=0xbbc9d4;
  // A floating island, courtyard paths, and an elevated, open circular arena.
  box(root,0,-.55,0,36,1,72,0x61796c);
  const island=gem(root,0,-9,0,26,12,48,0x424d65);island.rotation.y=.08;
  box(root,0,-.01,10,7,.18,49,stone);box(root,0,0,8,31,.18,4,stone);
  for(let i=0;i<24;i++)box(root,0,.095,32-i*2,6.8,.015,.045,0x536578);
  const arena=new THREE.Mesh(new THREE.CylinderGeometry(16.5,16.5,.3,48),material(0x8c9ead));arena.position.set(0,.015,-21);arena.receiveShadow=true;root.add(arena);
  for(const radius of [5,10,15.7]){const rune=ring(radius,0xa6f5ff);rune.position.set(0,.18,-21);root.add(rune);}
  for(const x of [-18,18]){
    box(root,x,1.3,0,.7,2.6,72,stone);
    for(let z=-35;z<36;z+=3)box(root,x,2.9,z,.95,.65,1.4,trim);
    for(const z of [-32,-12,12,32]){
      box(root,x,5,z,3.7,10,3.7,stone);box(root,x,10.2,z,4.5,.6,4.5,trim);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(3.4,4,4),material(0x36577f));roof.position.set(x,12.4,z);roof.rotation.y=Math.PI/4;root.add(roof);
      box(root,x-Math.sign(x)*1.9,6.5,z,.05,2,.7,0xbafaff).material=material(0x72dfff,0x2196ce);
    }
  }
  box(root,0,1.7,-36,36,3.4,.8,stone);
  for(const z of [25,8,-12]){
    for(const x of [-5,5]){box(root,x,3,z,1,6,1.2,stone);box(root,x,6.1,z,1.5,.5,1.7,trim);pillars.push({x,z,r:.75});}
    const arch=new THREE.Mesh(new THREE.TorusGeometry(5,.45,6,20,Math.PI),material(trim));arch.position.set(0,6,z);root.add(arch);
    if(z===-12)box(root,0,11.2,z,3,.3,1,trim);
  }
  const crystals=[];
  for(let i=0;i<10;i++){
    const x=(i%2?1:-1)*(11+(i%3)),z=30-Math.floor(i/2)*9;
    box(root,x,.2,z,2,.4,2,stone);pillars.push({x,z,r:.85});
    const crystal=gem(root,x,1.3,z,.4,1.1,.4,0x62ddff);crystal.material=material(0x62ddff,0x2587ac);crystals.push(crystal);
    if(i<4){const light=new THREE.PointLight(0x56ccff,12,9);light.position.set(x,2,z);root.add(light);}
  }
  // Broken masonry and rocks on grassy flanks leave the central combat route open.
  for(let i=0;i<12;i++){
    const x=(i%2?1:-1)*(8+(i%4)*2),z=31-Math.floor(i/2)*7;
    const rock=gem(root,x,.5,z,1,.75,1.2,0x647184);rock.rotation.y=i;
    if(i%3===0){const ruin=box(root,x,1.5,z,1,3,1,stone);ruin.rotation.z=.18;}
    pillars.push({x,z,r:.9});
  }
  const gate=new THREE.Group();root.add(gate);gate.visible=false;
  for(let x=-17;x<=17;x+=1.5){const bar=box(gate,x,1.6,-12.3,.09,3.2,.12,0xa0eeff);bar.material=material(0x9befff,0x278caf);}
  for(let i=0;i<16;i++){
    const side=i%2?1:-1,x=side*(40+i*2),z=-65+(i%8)*18;
    gem(root,x,6+(i%4)*6,z,10,9,14,0x637596);
    const cloud=gem(root,x,22+(i%3)*4,z,18,2.5,9,0xdce8ee);cloud.castShadow=false;
  }
  const moonDisc=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xe5faff}));moonDisc.position.set(-23,32,-75);root.add(moonDisc);
  return {root,gate,update(time){crystals.forEach((c,i)=>{c.rotation.y=time*.4+i;c.position.y=1.3+Math.sin(time*2+i)*.12;});}};
}

const GLEAM_ATTACKS={
  cleave:{name:'HEAVY SWORD CLEAVE',steps:[{shape:'front',windup:1.05,duration:.3,damage:38,range:6.5}],recovery:1.5},
  double:{name:'DOUBLE BLADE COMBO',steps:[{shape:'front',windup:.8,duration:.22,damage:22,range:6},{shape:'front',windup:.62,duration:.22,damage:24,range:6,track:.28}],recovery:1.35},
  charge:{name:'CHARGING SWORD RUSH',steps:[{shape:'line',windup:1.15,duration:.75,damage:40,range:17}],recovery:1.9},
  slam:{name:'LEAP GROUND SLAM',steps:[{shape:'circle',windup:1.1,duration:.65,damage:40,range:6}],recovery:1.6},
  storm:{name:'BERSERK SWORD STORM',steps:[{shape:'front',windup:.85,duration:.2,damage:18,range:6},{shape:'front',windup:.65,duration:.2,damage:18,range:6,track:.2},{shape:'front',windup:.8,duration:.25,damage:28,range:6.5,track:.2},{shape:'spin',windup:1.05,duration:.3,damage:32,range:7}],recovery:1.8}
};
function gleamEyes(){
  const art=window.GLEAM_EYES_ASSET?createBlenderGleam():null;
  const root=art?.root||new THREE.Group(),body=art?.body||new THREE.Group();
  let legs=art?.legs,sword=art?.sword,eyes=art?.eyes;
  if(!art){root.add(body);scene.add(root);
  gem(body,0,3,0,1.6,1.9,1,0x214566);gem(body,0,3.3,-.72,1.22,1.1,.45,0x6ca7ba);
  legs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.7,1.8,0);body.add(leg);legs.push(leg);
    box(leg,0,-.75,0,.7,1.8,.8,0x284464);box(leg,0,-1.6,-.25,.95,.4,1.2,0x17293e);
    gem(body,side*1.55,3.65,0,.8,.85,.85,0x315779);box(body,side*1.65,2.9,0,.65,1.7,.75,0x295270);
    taper(body,[side*.62,5,-.05],[side*1.3,6,.1],.32,.02,0xc2d4df);
  }
  gem(body,0,4.75,-.12,.82,.95,.72,0x234761);gem(body,0,4.35,-.75,.65,.4,.42,0x84a5b1);
  eyes=[];for(const x of [-.34,.34]){const eye=box(body,x,4.95,-.77,.3,.15,.08,0x9fffff);eye.material=material(0xaaffff,0x62eaff);eyes.push(eye);}
  sword=new THREE.Group();sword.position.set(1.75,3.4,0);body.add(sword);
  box(sword,0,-.35,0,.22,1.1,.23,0x192d47);box(sword,0,-.8,0,1.2,.22,.35,0x9bc9dc);
  box(sword,0,-2.5,0,.72,3.3,.24,0xb6dce7);box(sword,0,-2.5,-.14,.16,3.3,.045,0x8dffff).material=material(0xafffff,0x40abcf);
  sword.rotation.z=.7;
  }
  const effects=new THREE.Group();scene.add(effects);
  const warning=new THREE.Group();effects.add(warning);
  const warningMaterial=new THREE.MeshBasicMaterial({color:0xff7038,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
  const front=new THREE.Mesh(new THREE.CircleGeometry(1,32,Math.PI/6,Math.PI*2/3),warningMaterial);front.rotation.x=-Math.PI/2;warning.add(front);
  const arcPoints=[new THREE.Vector3()];for(let i=0;i<=32;i++){const angle=Math.PI/6+i/32*Math.PI*2/3;arcPoints.push(new THREE.Vector3(Math.cos(angle),Math.sin(angle),.008));}arcPoints.push(new THREE.Vector3());
  const frontOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints),new THREE.LineBasicMaterial({color:0xffe7a5}));front.add(frontOutline);
  const line=new THREE.Mesh(new THREE.PlaneGeometry(3.4,17),warningMaterial);line.rotation.x=-Math.PI/2;line.position.z=-8.5;warning.add(line);
  const circle=new THREE.Mesh(new THREE.CircleGeometry(1,48),warningMaterial);circle.rotation.x=-Math.PI/2;warning.add(circle);
  const edge=ring(1,0xffe6a6);warning.add(edge);
  const shock=ring(1,0xbafaff);effects.add(shock);shock.visible=false;
  const aura=ring(2.5,0x5fffff);aura.position.y=.25;root.add(aura);aura.visible=false;
  return {root,body,legs,sword,eyes,effects,aura,hp:1400,maxHp:1400,radius:2.2,hitHeight:2,flash:0,state:'Dormant',
    gleam:{phase:'pursuit',time:0,index:0,cycle:0,attack:null,berserk:false,intro:0,warning,front,line,circle,edge,shock,shockTime:0,target:new THREE.Vector3(),start:new THREE.Vector3(),direction:new THREE.Vector3(),hit:false}};
}
function beginGleamAttack(name){
  if(enemy.hp<=0||enemy.dormant)return;
  const g=enemy.gleam;g.attack=name;g.index=0;beginGleamStep();
}
function beginGleamStep(){
  const g=enemy.gleam,step=GLEAM_ATTACKS[g.attack].steps[g.index];
  const p=player.root.position,e=enemy.root.position,desired=Math.atan2(e.x-p.x,e.z-p.z);
  if(step.track){const delta=Math.atan2(Math.sin(desired-enemy.root.rotation.y),Math.cos(desired-enemy.root.rotation.y));enemy.root.rotation.y+=THREE.MathUtils.clamp(delta,-step.track,step.track);}
  else if(g.index===0)enemy.root.rotation.y=desired;
  g.direction.set(-Math.sin(enemy.root.rotation.y),0,-Math.cos(enemy.root.rotation.y));
  g.target.copy(p);g.target.x=THREE.MathUtils.clamp(g.target.x,-15,15);g.target.z=THREE.MathUtils.clamp(g.target.z,-33,-15.5);
  g.start.copy(e);g.phase='telegraph';g.time=step.windup*(g.berserk?.88:1);g.hit=false;
  g.warning.visible=true;g.warning.position.copy(step.shape==='circle'?g.target:e);g.warning.position.y=.2;g.warning.rotation.y=enemy.root.rotation.y;
  g.front.visible=step.shape==='front';g.front.scale.setScalar(step.range);
  g.line.visible=step.shape==='line';g.circle.visible=['circle','spin'].includes(step.shape);g.circle.scale.setScalar(step.range);
  g.edge.visible=g.circle.visible;g.edge.scale.set(step.range,step.range,1);
}
function hitGleamStep(step){
  const g=enemy.gleam;if(g.hit)return;g.hit=true;
  const delta=player.root.position.clone().sub(enemy.root.position),distance=delta.length();
  const inShape=step.shape==='spin'||step.shape==='circle'||delta.normalize().dot(g.direction)>=.5;
  if(distance<=step.range&&inShape)damagePlayer(step.damage);
}
function updateGleam(dt){
  if(!active||enemy.hp<=0||enemy.dormant)return;
  const g=enemy.gleam,e=enemy.root.position,p=player.root.position;
  updateBossHitFeedback(enemy,dt);
  if(!g.berserk&&enemy.hp<=enemy.maxHp*.4){g.berserk=true;enemy.aura.visible=true;enemy.eyes.forEach(eye=>eye.scale.set(1.3,1.6,1));showBanner('40% HP · SECOND PHASE','BERSERK PHASE',2);}
  enemy.aura.rotation.z+=dt*2;enemy.aura.material.opacity=.5+Math.sin(elapsed*8)*.3;
  g.shockTime=Math.max(0,g.shockTime-dt);g.shock.visible=g.shockTime>0;
  if(g.shockTime>0){const r=1+(1-g.shockTime/.55)*7;g.shock.scale.set(r,r,1);g.shock.material.opacity=g.shockTime/.55;}
  if(g.intro>0){g.intro=Math.max(0,g.intro-dt);$('enemy-status').textContent='DRAW YOUR BLADE';return;}
  if(g.phase==='pursuit'){
    const delta=p.clone().sub(e),distance=delta.length();enemy.root.rotation.y=Math.atan2(-delta.x,-delta.z);
    enemy.state='Pursuing Paul';enemy.sword.rotation.set(0,0,.7);
    if(distance>5){delta.normalize();move(enemy,delta.x*dt*(g.berserk?4.4:3.8),delta.z*dt*(g.berserk?4.4:3.8));}
    if(distance<=5||distance<17&&g.cycle%5>=2){const order=g.berserk?['storm','double','charge','storm','slam','cleave']:['cleave','double','charge','slam','storm'];beginGleamAttack(order[g.cycle++%order.length]);}
  }else if(g.phase==='recovery'){
    g.time-=dt;enemy.state='RECOVERY · COUNTERATTACK';enemy.sword.rotation.z=THREE.MathUtils.lerp(enemy.sword.rotation.z,.7,dt*5);
    if(g.time<=0)g.phase='pursuit';
  }else{
    const attack=GLEAM_ATTACKS[g.attack],step=attack.steps[g.index],speed=g.berserk?.88:1;
    g.time=Math.max(0,g.time-dt);enemy.state=attack.name+' · '+(g.index+1)+'/'+attack.steps.length+' · '+g.phase.toUpperCase();
    if(g.phase==='telegraph'){
      enemy.sword.rotation.set(-.25,0,2.45);g.front.material.opacity=.16+Math.sin(elapsed*12)*.035;
      if(step.shape!=='circle'){g.warning.position.copy(e);g.warning.position.y=.2;}
      if(g.time<=0){g.phase='attack';g.time=step.duration*speed;g.start.copy(e);g.warning.visible=false;
        if(step.shape==='front'||step.shape==='spin')hitGleamStep(step);
      }
    }else{
      const progress=1-g.time/(step.duration*speed);enemy.sword.rotation.set(-.25+progress*.5,0,2.45-progress*3.7);
      if(step.shape==='front')move(enemy,g.direction.x*.6/(step.duration*speed)*dt,g.direction.z*.6/(step.duration*speed)*dt);
      if(step.shape==='line'){
        const before=e.clone();move(enemy,g.direction.x*17/(step.duration*speed)*dt,g.direction.z*17/(step.duration*speed)*dt);
        const segment=new THREE.Line3(before,e),closest=segment.closestPointToPoint(p,true,new THREE.Vector3());
        if(!g.hit&&closest.distanceTo(p)<2.05){g.hit=true;damagePlayer(step.damage);}
      }
      if(step.shape==='circle'){
        const desired=g.start.clone().lerp(g.target,progress);move(enemy,desired.x-e.x,desired.z-e.z);enemy.body.position.y=Math.sin(progress*Math.PI)*5;
        if(g.time<=0){enemy.body.position.y=0;hitGleamStep(step);burst(e,0xb8d3df,2);cameraShake=.3;g.shockTime=.55;g.shock.position.copy(e);g.shock.position.y=.22;}
      }
      if(step.shape==='spin')enemy.sword.rotation.y=progress*Math.PI*2;
      if(g.time<=0){if(g.index+1<attack.steps.length){g.index++;beginGleamStep();}else{g.phase='recovery';g.time=attack.recovery*(g.berserk?.84:1);}}
    }
  }
  enemy.legs.forEach((leg,i)=>leg.rotation.x=g.phase==='pursuit'?Math.sin(elapsed*9+i*Math.PI)*.25:0);
  $('enemy-status').textContent=enemy.state;
}
