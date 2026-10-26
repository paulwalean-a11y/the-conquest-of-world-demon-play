'use strict';
initExtraCombat();initSouls();loadFloor(souls.checkpointFloor);resize();initSoulsPresentation();updateCamera();
$('travel-floor-1').addEventListener('click',()=>selectFloor(1));
$('travel-floor-2').addEventListener('click',()=>selectFloor(2));
requestAnimationFrame(frame);
// Deterministic, opt-in test hooks. The production loop remains the single frame().
if(testMode)window.testGame={player,get enemy(){return enemy;},minions,hostiles,MAP,PLAYER_SPEED,DRAGON_SCALE,DRAGON_RADIUS,pillars,keys,scene,camera,combat,plasma,meteor,blackhole,breath,dodge,dimension,impacts,FLOORS,GLEAM_ATTACKS,start,attack,tryDodge,fireDimension,damageEnemy,damagePlayer,beginGleamAttack,loadFloor,souls,useFlask,toggleLock,restAtShrine,
  step:seconds=>{for(let t=0;t<seconds-1e-9;t+=1/60)update(Math.min(1/60,seconds-t));},
  get state(){return {active,ended,yaw,pitch,elapsed,currentFloor,arenaActive,transition};}};
