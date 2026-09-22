'use strict';
// Shared abilities use the same move(), damageEnemy(), and damagePlayer() as Kevin.
const dodge={duration:.26,cooldown:0,cooldownLength:.72,iframeDuration:.17,time:0,direction:new THREE.Vector3(),trail:null};
const dimension={cooldown:0,cooldownLength:3,damage:120,speed:28,timeout:120,projectiles:[]};
const impacts=[];
let cameraShake=0;
function canAct(){return active&&!transition&&player.state!=='DODGING'&&player.hp>0;}
function validTarget(target){return target.hp>0&&!target.dormant&&target.root.visible;}
function initExtraCombat(){
  dodge.trail=new THREE.Group();scene.add(dodge.trail);dodge.trail.visible=false;
  for(let i=0;i<5;i++){
    const streak=box(dodge.trail,(i-2)*.18,.4+i*.16,0,.045,.045,1.4+i*.2,0xa8f7ff);
    streak.material=material(0xbdefff,0x4daacc);
  }
}
function tryDodge(){
  if(!canAct()||dodge.cooldown>0)return false;
  let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  if(!x&&!z)z=-1;
  dodge.direction.set(x*Math.cos(yaw)+z*Math.sin(yaw),0,-x*Math.sin(yaw)+z*Math.cos(yaw)).normalize();
  dodge.time=dodge.duration;dodge.cooldown=dodge.cooldownLength;player.state='DODGING';
  combat.time=0;slash.visible=false;plasma.time=0;plasma.root.visible=false;
  return true;
}
function updateDodge(dt){
  dodge.cooldown=Math.max(0,dodge.cooldown-dt);
  const wasDodging=dodge.time>0;
  if(wasDodging){
    const tick=Math.min(dt,dodge.time),speed=20*(.7+.3*dodge.time/dodge.duration);
    // Small physical steps preserve collision even during a slow frame.
    const steps=Math.ceil(speed*tick/.15);
    for(let i=0;i<steps;i++)move(player,dodge.direction.x*speed*tick/steps,dodge.direction.z*speed*tick/steps);
    dodge.time=Math.max(0,dodge.time-dt);
    dodge.trail.position.copy(player.root.position).addScaledVector(dodge.direction,-1);
    dodge.trail.rotation.y=Math.atan2(dodge.direction.x,dodge.direction.z);
    player.body.rotation.x=-.2;
    if(dodge.time<=1e-8){dodge.time=0;player.state='NORMAL';player.body.rotation.x=0;}
  }
  dodge.trail.visible=dodge.time>0;
  $('dodge-status').textContent=dodge.cooldown>0?dodge.cooldown.toFixed(1)+'s':'READY';
  return wasDodging;
}
function isInvulnerable(){return dodge.time>0&&dodge.duration-dodge.time<dodge.iframeDuration;}
function fireDimension(){
  if(!canAct()||dimension.cooldown>0)return false;
  const root=new THREE.Group();
  for(const angle of [-Math.PI/4,Math.PI/4]){
    const arm=new THREE.Group();arm.rotation.z=angle;root.add(arm);
    const glow=box(arm,0,0,0,.24,3.3,.13,0x41cfff);glow.material=material(0x41cfff,0x168dbb);
    const core=box(arm,0,0,-.08,.07,3.5,.06,0xeeffff);core.material=material(0xeeffff,0xa9ffff);
  }
  root.position.copy(player.root.position).add(new THREE.Vector3(0,1.25,0));root.rotation.y=yaw;
  scene.add(root);
  dimension.projectiles.push({root,direction:new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),age:0});
  dimension.cooldown=dimension.cooldownLength;notify('KEVIN · DIMENSION X SLASH');return true;
}
function burst(position,color=0x9af5ff,radius=1){
  const root=new THREE.Group();root.position.copy(position);scene.add(root);
  for(let i=0;i<12;i++){
    const chip=gem(root,0,.15,0,.09,.16,.09,color);
    chip.userData.velocity=new THREE.Vector3(Math.cos(i*2.4)*radius,1+(i%4)*.4,Math.sin(i*2.4)*radius);
  }
  impacts.push({root,time:0});
}
function updateDimension(dt){
  dimension.cooldown=Math.max(0,dimension.cooldown-dt);
  $('dimension-status').textContent=dimension.cooldown>0?dimension.cooldown.toFixed(1)+'s':'READY';
  for(const shot of [...dimension.projectiles]){
    if(!dimension.projectiles.includes(shot))continue;
    shot.age+=dt;const distance=dimension.speed*dt,ray=new THREE.Ray(shot.root.position,shot.direction);
    let nearest=null,hitDistance=distance,point=new THREE.Vector3();
    for(const target of hostiles){
      if(!validTarget(target))continue;
      const center=target.root.position.clone();center.y=target.hitHeight||1.3;
      const sphere=new THREE.Sphere(center,(target.radius||.65)+.55);
      const contact=ray.origin.distanceTo(center)<=sphere.radius?ray.origin:ray.intersectSphere(sphere,point);
      if(contact){const d=contact.distanceTo(ray.origin);if(d<=hitDistance){nearest=target;hitDistance=d;}}
    }
    shot.root.position.addScaledVector(shot.direction,nearest?hitDistance:distance);
    if(nearest){
      const position=shot.root.position.clone();removeDimension(shot);burst(position);damageEnemy(dimension.damage,nearest);
    }else if(shot.age>=dimension.timeout)removeDimension(shot);
    // Deliberately no room-boundary or travel-distance cap.
  }
}
function removeDimension(shot){const i=dimension.projectiles.indexOf(shot);if(i>=0){dimension.projectiles.splice(i,1);disposeRoot(shot.root);}}
function updateImpacts(dt){
  cameraShake=Math.max(0,cameraShake-dt);
  for(let i=impacts.length-1;i>=0;i--){const effect=impacts[i];effect.time+=dt;
    effect.root.children.forEach(chip=>{chip.position.addScaledVector(chip.userData.velocity,dt*4);chip.position.y-=effect.time*dt*4;chip.scale.multiplyScalar(Math.pow(.25,dt));});
    if(effect.time>.65){disposeRoot(effect.root);impacts.splice(i,1);}
  }
}
function resetExtraCombat(){
  for(const shot of [...dimension.projectiles])removeDimension(shot);
  for(const effect of impacts)disposeRoot(effect.root);impacts.length=0;
  dodge.time=0;dodge.cooldown=0;dimension.cooldown=0;cameraShake=0;
  if(dodge.trail)dodge.trail.visible=false;
  player.state='NORMAL';player.body.rotation.x=0;
}
