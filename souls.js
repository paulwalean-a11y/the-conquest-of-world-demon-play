'use strict';
// Physical combat resources and a recoverable death stain; spells keep their original rules.
const souls={stamina:100,maxStamina:100,regenDelay:0,exhausted:false,flasks:3,heal:{time:0,applied:false},lock:null,wallet:0,dropped:null,stain:null,checkpoint:null,checkpointFloor:1,damageFlash:0,quality:'cinematic'};
try{const saved=JSON.parse(localStorage.getItem('world-demon.souls.v1')||'null');if(saved){souls.wallet=Number.isFinite(saved.wallet)?Math.max(0,Math.floor(saved.wallet)):0;souls.checkpointFloor=saved.checkpointFloor===2?2:1;const d=saved.dropped;if(d&&[1,2].includes(d.floor)&&[d.x,d.z,d.amount].every(Number.isFinite)&&d.amount>0)souls.dropped={floor:d.floor,x:THREE.MathUtils.clamp(d.x,-17,17),z:THREE.MathUtils.clamp(d.z,-35,35),amount:Math.floor(d.amount)};}if(localStorage.getItem('world-demon.graphics.v1')==='balanced')souls.quality='balanced';}catch{}
function saveSouls(){try{localStorage.setItem('world-demon.souls.v1',JSON.stringify({wallet:souls.wallet,dropped:souls.dropped,checkpointFloor:souls.checkpointFloor}));}catch{}}
function syncSoulsHUD(){
  $('stamina-fill').style.width=(souls.stamina/souls.maxStamina*100)+'%';$('stamina-text').textContent=Math.ceil(souls.stamina)+' / '+souls.maxStamina;
  $('flask-count').textContent=souls.flasks;$('soul-count').textContent=souls.wallet.toLocaleString();
  $('lock-reticle').hidden=!souls.lock||!active||!validTarget(souls.lock);
}
function spendStamina(amount){
  if(souls.stamina+1e-6<amount){notify('EXHAUSTED · let your stamina recover');souls.regenDelay=Math.max(souls.regenDelay,.18);return false;}
  souls.stamina=Math.max(0,souls.stamina-amount);souls.regenDelay=.55;syncSoulsHUD();return true;
}
function resetSoulsCombat(){
  souls.stamina=100;souls.regenDelay=0;souls.exhausted=false;souls.flasks=3;souls.heal.time=0;souls.heal.applied=false;souls.lock=null;souls.damageFlash=0;
  player.body.position.set(0,0,0);player.body.rotation.set(0,0,0);player.legs.forEach(leg=>leg.rotation.set(0,0,0));
  player.arms?.forEach(arm=>arm.rotation.set(0,0,0));if(player.flaskVisual)player.flaskVisual.visible=false;if(player.weapon)player.weapon.visible=true;
  if(souls.stain){souls.stain.visible=!!souls.dropped&&souls.dropped.floor===currentFloor;if(souls.dropped)souls.stain.position.set(souls.dropped.x,.03,souls.dropped.z);}
  syncSoulsHUD();
}
function initSouls(){
  souls.stain=new THREE.Group();souls.stain.name='Recoverable lost echoes';scene.add(souls.stain);souls.stain.visible=false;
  for(const r of [.6,.86]){const edge=ring(r,0xb8b38c);edge.material.opacity=.55;souls.stain.add(edge);}
  const spark=new THREE.Mesh(new THREE.IcosahedronGeometry(.15,1),new THREE.MeshBasicMaterial({color:0xd9cda0}));spark.position.y=.45;souls.stain.add(spark);
  souls.checkpoint=new THREE.Group();souls.checkpoint.position.set(-2.4,0,MAP.spawnZ);scene.add(souls.checkpoint);
  const fire=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));fire.position.y=.5;fire.scale.set(1.3,2.2,1);souls.checkpoint.add(fire);
  const light=new THREE.PointLight(0xe4ac63,22,8,2);light.position.y=1;souls.checkpoint.add(light);
  $('graphics-quality').value=souls.quality;renderer.setPixelRatio(souls.quality==='cinematic'?Math.min(devicePixelRatio,1.5):1);
  $('graphics-quality').addEventListener('change',event=>{souls.quality=event.target.value;try{localStorage.setItem('world-demon.graphics.v1',souls.quality);}catch{}renderer.setPixelRatio(souls.quality==='cinematic'?Math.min(devicePixelRatio,1.5):1);resize();});
}
function toggleLock(){
  if(!active)return;
  if(souls.lock){souls.lock=null;syncSoulsHUD();return;}
  const p=player.root.position,forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));let best=null,score=Infinity;
  for(const target of hostiles){if(!validTarget(target)||!clearLockLine(target))continue;const delta=target.root.position.clone().sub(p),distance=delta.length();if(distance>32||forward.dot(delta.normalize())<-.15)continue;const cost=distance*(1.6-forward.dot(delta));if(cost<score){score=cost;best=target;}}
  souls.lock=best;if(!best)notify('No enemy in reach');syncSoulsHUD();
}
function clearLockLine(target){
  const origin=player.root.position.clone();origin.y=1.2;const center=target.root.position.clone();center.y=target===enemy?(currentFloor===1?5:2.5):1.3;
  const delta=center.sub(origin),length=delta.length(),ray=new THREE.Ray(origin,delta.normalize()),hit=new THREE.Vector3();
  return !plasmaPillars.some(obstacle=>ray.intersectBox(obstacle,hit)&&origin.distanceTo(hit)<length);
}
function updateLock(dt){
  const target=souls.lock;if(!target)return;
  const p=player.root.position,e=target.root.position;
  if(!validTarget(target)||p.distanceTo(e)>38){souls.lock=null;syncSoulsHUD();return;}
  if(!meteor.aiming&&!blackhole.aiming){const desired=Math.atan2(p.x-e.x,p.z-e.z);const delta=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));yaw+=delta*Math.min(1,dt*12);}
  const screen=e.clone();screen.y=target===enemy?(currentFloor===1?6:3.8):1.35;screen.project(camera);
  const visible=screen.z>-1&&screen.z<1&&Math.abs(screen.x)<1.1&&Math.abs(screen.y)<1.1;
  $('lock-reticle').hidden=!visible;$('lock-reticle').style.left=(screen.x*.5+.5)*innerWidth+'px';$('lock-reticle').style.top=(-screen.y*.5+.5)*innerHeight+'px';
}
function useFlask(){
  if(!canAct()||combat.cooldown>0||souls.flasks<=0||player.hp>=player.maxHp)return false;
  souls.flasks--;souls.heal.time=1.25;souls.heal.applied=false;player.state='HEALING';keys.delete('ShiftLeft');keys.delete('ShiftRight');notify('EMBER FLASK');syncSoulsHUD();return true;
}
function cancelFlask(){if(souls.heal.time>0){souls.heal.time=0;player.state='NORMAL';if(player.flaskVisual)player.flaskVisual.visible=false;if(player.weapon)player.weapon.visible=true;notify('HEAL INTERRUPTED');}}
function awardSouls(target){souls.wallet+=target===enemy?(currentFloor===1?250:600):40;saveSouls();syncSoulsHUD();}
function dropSouls(){
  souls.dropped=souls.wallet>0?{floor:currentFloor,x:player.root.position.x,z:player.root.position.z,amount:souls.wallet}:null;souls.wallet=0;saveSouls();syncSoulsHUD();
}
function restAtShrine(){
  if(!canAct()||arenaActive||player.root.position.distanceTo(new THREE.Vector3(-2.4,0,MAP.spawnZ))>2.6)return false;
  souls.checkpointFloor=currentFloor;saveSouls();loadFloor(currentFloor);notify('EMBER KINDLED · health and flasks restored');return true;
}
function updateSouls(dt,moving){
  souls.regenDelay=Math.max(0,souls.regenDelay-dt);souls.damageFlash=Math.max(0,souls.damageFlash-dt*1.8);
  if(souls.stamina>=20)souls.exhausted=false;
  const sprinting=moving&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&canAct()&&souls.stamina>1&&!souls.exhausted;
  if(sprinting){souls.stamina=Math.max(0,souls.stamina-18*dt);souls.regenDelay=.35;if(souls.stamina<=1)souls.exhausted=true;}
  else if(souls.regenDelay===0&&dodge.time===0&&combat.time===0&&souls.heal.time===0)souls.stamina=Math.min(100,souls.stamina+35*dt);
  if(souls.heal.time>0){
    souls.heal.time=Math.max(0,souls.heal.time-dt);
    if(souls.heal.time<=.55&&!souls.heal.applied){souls.heal.applied=true;player.hp=Math.min(player.maxHp,player.hp+120);$('hp-text').textContent=Math.ceil(player.hp)+' / '+player.maxHp;$('hp-fill').style.width=player.hp/player.maxHp*100+'%';notify('EMBER RESTORED · +120 HP');}
    if(souls.heal.time===0)player.state='NORMAL';
  }
  const near=player.root.position.distanceTo(new THREE.Vector3(-2.4,0,MAP.spawnZ))<2.6&&!arenaActive;
  souls.checkpoint.children[0].scale.y=2.1+Math.sin(elapsed*8)*.17;souls.checkpoint.children[1].intensity=21+Math.sin(elapsed*11)*2;
  $('shrine-prompt').hidden=!near;$('shrine-prompt').textContent='G · REST AT THE EMBER SHRINE';
  if(souls.stain&&souls.dropped){
    souls.stain.visible=souls.dropped.floor===currentFloor;souls.stain.children[2].rotation.y+=dt;
    if(souls.stain.visible&&Math.hypot(player.root.position.x-souls.dropped.x,player.root.position.z-souls.dropped.z)<1.45){souls.wallet+=souls.dropped.amount;souls.dropped=null;souls.stain.visible=false;saveSouls();notify('LOST ECHOES RECOVERED');}
  }
  syncSoulsHUD();return sprinting;
}
