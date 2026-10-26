'use strict';
// Rebuild the evaluated Blender meshes locally; works over HTTPS and file://.
// Geometry is quantized, merged by material/part, and loaded without a network request.
function createBlenderHero(scene,renderer){
  const asset=window.PAUL_HERO_ASSET;
  function unpack(base64,Type){
    const raw=atob(base64),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return new Type(bytes.buffer);
  }
  function grain(cloth=false){
    const c=document.createElement('canvas');c.width=c.height=256;
    const ctx=c.getContext('2d'),image=ctx.createImageData(256,256);let seed=89;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const weave=cloth?((x%4===0||y%4===0)?-24:8):Math.sin(y*.9)*4;
      const value=176+(seed>>>26)*.6+weave,index=(y*256+x)*4;
      image.data.set([value,value,value,255],index);
    }
    ctx.putImageData(image,0,0);
    if(!cloth){ctx.strokeStyle='#a4a4a4';ctx.lineWidth=.45;for(let i=0;i<70;i++){const x=i*57%256,y=i*97%256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+(i%13),y+.7);ctx.stroke();}}
    const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
  }
  // A small local studio cubemap supplies shaped metal reflections, not flat grey armor.
  const faces=[];
  for(let face=0;face<6;face++){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,0,128);grad.addColorStop(0,'#9cabb9');grad.addColorStop(.45,'#3a4653');grad.addColorStop(1,'#10141c');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
    if(face!==3){ctx.fillStyle=face%2?'#b6bec2':'#d6c5a9';ctx.fillRect(face%2?81:12,8,face===2?90:18,90);}
    faces.push(c);
  }
  const cube=new THREE.CubeTexture(faces);cube.needsUpdate=true;cube.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromCubemap(cube);cube.dispose();pmrem.dispose();
  const steelGrain=grain(),clothGrain=grain(true),materials={};
  for(const [name,spec]of Object.entries(asset.materials)){
    materials[name]=new THREE.MeshPhysicalMaterial({
      name:'Paul / '+name,color:spec.color,metalness:spec.metalness,roughness:spec.roughness,
      envMap:reflection.texture,envMapIntensity:name==='cloth'?.15:.75,
      roughnessMap:name==='rune'?null:name==='cloth'?clothGrain:steelGrain,
      bumpMap:name==='cloth'?clothGrain:steelGrain,bumpScale:name==='cloth'?.007:.0008,
      clearcoat:['steel','edge'].includes(name)?.18:0,clearcoatRoughness:.35,
      emissive:spec.emissive||0x000000,emissiveIntensity:spec.emissive?1.3:0,
      side:name==='cloth'?THREE.DoubleSide:THREE.FrontSide
    });
  }
  const root=new THREE.Group(),body=new THREE.Group(),groups={};root.add(body);
  root.name=asset.name;root.userData.blender=asset.generator;root.userData.stats=asset.stats;
  for(const [name,part]of Object.entries(asset.parts)){
    const group=new THREE.Group();group.name=name;group.position.fromArray(part.pivot);groups[name]=group;
    if(name!=='sword')body.add(group);
    for(const surface of part.surfaces){
      const packed=unpack(surface.v,Int16Array),count=packed.length/8;
      const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2);
      for(let i=0;i<count;i++){
        for(let axis=0;axis<3;axis++){positions[i*3+axis]=packed[i*8+axis]/10000;normals[i*3+axis]=packed[i*8+3+axis]/32760;}
        uv[i*2]=packed[i*8+6]/4096;uv[i*2+1]=packed[i*8+7]/4096;
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(new THREE.BufferAttribute(unpack(surface.i,Uint32Array),1));geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,materials[surface.material]);mesh.name=name+' / '+surface.material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    }
  }
  // A soft cool edge keeps the armor readable against the inferno and dark stone.
  const rim=new THREE.PointLight(0x9ecbff,1.8,6,2);rim.position.set(-1.5,3,1.8);root.add(rim);
  scene.add(root);
  return {root,body,legs:[groups.leftLeg,groups.rightLeg],cape:groups.cape,arms:[groups.leftArm,groups.rightArm],weapon:groups.sword,heroMaterials:materials};
}

function animateHeroDetails(player,time,moving,attacking,dodging){
  if(!player.arms)return;
  player.arms[0].rotation.x=moving?Math.sin(time*11+Math.PI)*.16:Math.sin(time*1.8)*.014;
  player.arms[1].rotation.x=attacking?-.36:moving?Math.sin(time*11)*.15:0;
  player.body.position.y=dodging?-.12:moving?Math.abs(Math.sin(time*11))*.025:Math.sin(time*1.8)*.008;
  player.cape.rotation.z=Math.sin(time*2.5)*.018;
}
