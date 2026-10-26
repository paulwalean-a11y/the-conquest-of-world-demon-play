'use strict';
// Shared procedural surfaces stay local and add no download or hosting costs.
const worldVisualTextures={};
function stoneTexture(){
  if(worldVisualTextures.stone)return worldVisualTextures.stone;
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);let seed=907;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const vein=Math.sin(x*.031+Math.sin(y*.02)*2)*Math.sin(y*.023+x*.01);
    const value=144+(seed>>>26)*.6+vein*13,i=(y*512+x)*4;data.data.set([value,value-2,value-4,255],i);
  }
  ctx.putImageData(data,0,0);ctx.lineWidth=1;
  for(let i=0;i<45;i++){const x=i*173%512,y=i*79%512;ctx.strokeStyle=i%3?'#858079':'#d7d1c4';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y+14);ctx.lineTo(x+4,y+25);ctx.stroke();}
  const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;worldVisualTextures.stone=texture;return texture;
}
function weatheredMaterial(source){
  const key='weathered:'+source.uuid;if(mats[key])return mats[key];
  const mat=source.clone();mat.map=stoneTexture();mat.bumpMap=stoneTexture();mat.bumpScale=.055;mat.roughness=.93;
  mat.color.multiplyScalar(.83);mats[key]=mat;return mat;
}
function buildAtmosphere(root,floor){
  const key='sky:'+floor;
  if(!worldVisualTextures[key]){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,0,512);
    if(floor===1){grad.addColorStop(0,'#100c16');grad.addColorStop(.42,'#3d151c');grad.addColorStop(.58,'#93351c');grad.addColorStop(.69,'#c55e2e');grad.addColorStop(1,'#190d13');}
    else{grad.addColorStop(0,'#080d18');grad.addColorStop(.45,'#152235');grad.addColorStop(.7,'#526279');grad.addColorStop(1,'#101827');}
    ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
    for(let layer=0;layer<18;layer++){
      ctx.beginPath();ctx.moveTo(0,180+layer*9);
      for(let x=0;x<=1024;x+=8){const w=Math.sin(x/1024*Math.PI*6+layer)*11+Math.sin(x/1024*Math.PI*14+layer*.7)*7;ctx.lineTo(x,185+layer*9+w);}
      ctx.lineTo(1024,225+layer*9);ctx.lineTo(0,225+layer*9);ctx.fillStyle=floor===1?'rgba(20,9,18,.1)':'rgba(6,12,24,.1)';ctx.fill();
    }
    if(floor===2){ctx.fillStyle='#b7c6da';for(let i=0;i<180;i++){const x=i*137.508%1024,y=i*71.37%190;ctx.globalAlpha=.2+(i%5)*.12;ctx.fillRect(x,y,i%9===0?1.5:.7,i%9===0?1.5:.7);}ctx.globalAlpha=1;}
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;worldVisualTextures[key]=texture;
  }
  const sky=new THREE.Mesh(new THREE.SphereGeometry(142,40,24),new THREE.MeshBasicMaterial({map:worldVisualTextures[key],side:THREE.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-10;root.add(sky);
}
function enhanceWorldVisuals(environment,number){
  const root=environment.root;
  if(!root.userData.blender)root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material?.isMeshStandardMaterial||mesh.material.emissiveIntensity>0)return;
    mesh.material=weatheredMaterial(mesh.material);
  });
  buildAtmosphere(root,number);
  const cold=number===2;
  scene.fog.color.setHex(cold?0x29364a:0x4a2521);scene.fog.density=cold?.009:.008;
  hemisphere.intensity=cold?.85:.8;hemisphere.groundColor.setHex(cold?0x182330:0x3e1912);
  moon.intensity=cold?2.8:2.4;moon.color.setHex(cold?0xc3d9f7:0xffc49b);
  if(root.userData.blender)return;
  if(!cold){
    // Dark mortar beneath the existing walkable tiles, above the decorative lava.
    const mortar=box(root,0,-.335,0,36,.025,72,0x1d1415);mortar.castShadow=false;
    // Broken cathedral buttresses stand outside the collision boundary.
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const x=side*21,z=29-i*15,height=8+(i%3)*3;
      const pier=box(root,x,height/2,z,2.3,height,2.3,0x30272b);pier.material=weatheredMaterial(pier.material);
      for(const y of [1.5,height-1]){const collar=box(root,x,y,z,2.8,.35,2.8,0x5b4845);collar.material=weatheredMaterial(collar.material);}
      if(i<4){const arch=new THREE.Mesh(new THREE.TorusGeometry(7.5,.42,8,28,Math.PI),weatheredMaterial(material(0x4b3938)));arch.rotation.y=Math.PI/2;arch.position.set(x,height-.5,z-7.5);arch.castShadow=true;root.add(arch);}
    }
  }else{
    // Aged stone carvings on the existing open arches, leaving combat space clear.
    for(const z of [25,8,-12])for(const side of [-1,1]){
      for(const y of [1,4.5,5.5]){const collar=box(root,side*5,y,z,1.18,.12,1.38,0x9a9e9d);collar.material=weatheredMaterial(collar.material);}
      const banner=box(root,side*5,4.1,z-.68,.48,1.6,.025,0x243d50);banner.material=weatheredMaterial(banner.material);
      box(root,side*5,4.1,z-.705,.025,1.2,.015,0xa69b72);box(root,side*5,4.35,z-.71,.3,.025,.015,0xa69b72);
    }
  }
}
function enhanceBossVisuals(boss,floor){
  if(boss.root.userData.blender)return;
  boss.body.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.geometry.type==='IcosahedronGeometry'){const old=mesh.geometry;mesh.geometry=new THREE.IcosahedronGeometry(1,2);old.dispose();}
  });
  if(floor===1){
    const scales=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),material(0x552c29),96),dummy=new THREE.Object3D();
    let index=0;
    for(let row=0;row<8;row++)for(let col=0;col<12;col++){
      const a=col/11*Math.PI*1.6-Math.PI*.8,z=-.55+row*.2;
      dummy.position.set(Math.sin(a)*.79,1.05+Math.cos(a)*.58,z);
      dummy.rotation.set(0,0,-a);dummy.scale.set(.095,.027,.13);dummy.updateMatrix();scales.setMatrixAt(index++,dummy.matrix);
    }
    scales.castShadow=true;scales.receiveShadow=true;boss.body.add(scales);
    for(const side of [-1,1])for(let i=0;i<4;i++){
      taper(boss.head,[side*(.13+i*.07),-.17,-.81],[side*(.13+i*.07),-.29,-.82],.025,0,0xe1cfa1);
    }
  }else{
    for(const side of [-1,1]){
      for(let i=0;i<3;i++){
        const plate=gem(boss.body,side*(1.45+i*.1),3.9-i*.16,-.16,.6,.28,.72,0x405164);plate.material=material(0x405164);
      }
      taper(boss.body,[side*1.7,4.1,0],[side*2,4.85,.12],.16,0,0xa9b6bb);
      for(let i=0;i<4;i++)box(boss.body,side*.42,3.6-i*.28,-.99,.35,.045,.04,0x8f9c9e);
    }
  }
}
