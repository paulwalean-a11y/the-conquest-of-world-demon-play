'use strict';
// Shared meshes are decoded once. Moving parts keep their authored Blender pivots.
const worldAssetCache={geometry:new Map(),materials:new Map(),textures:new Map()};
function worldAssetGrain(kind){
  if(worldAssetCache.textures.has(kind))return worldAssetCache.textures.get(kind);
  if(kind==='stone'&&typeof stoneTexture==='function')return stoneTexture();
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=817;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const scale=kind==='hide'?Math.abs(Math.sin(x*.23+Math.sin(y*.23))*Math.sin(y*.27))*48:kind==='cloth'?(x%4===0||y%4===0?-22:8):Math.sin(y*.85)*6;
    const value=170+(seed>>>26)*.6+scale,i=(y*256+x)*4;pixels.data.set([value,value,value,255],i);
  }
  ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;worldAssetCache.textures.set(kind,texture);return texture;
}
function createBlenderAsset(asset,{variant='',environment=null}={}){
  const root=new THREE.Group(),groups={};root.name=asset.name;root.userData={blender:asset.generator,asset:asset.name,stats:asset.stats};
  const unpack=(text,Type)=>{const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);};
  for(const name of Object.keys(asset.parts)){groups[name]=new THREE.Group();groups[name].name=name;}
  const body=groups.body||new THREE.Group();root.add(body);
  for(const [name,part]of Object.entries(asset.parts)){
    const group=groups[name];
    if(name!=='body'){
      const parent=groups[part.parent]||body;group.position.fromArray(part.pivot);
      if(part.parent)group.position.sub(new THREE.Vector3(...asset.parts[part.parent].pivot));parent.add(group);
    }
    part.surfaces.forEach((surface,index)=>{
      const geometryKey=asset.name+':'+name+':'+index;let geometry=worldAssetCache.geometry.get(geometryKey);
      if(!geometry){
        const packed=unpack(surface.v,Int16Array),count=packed.length/8,positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2);
        for(let i=0;i<count;i++){
          for(let k=0;k<3;k++){positions[i*3+k]=packed[i*8+k]/asset.positionScale;normals[i*3+k]=packed[i*8+3+k]/32760;}
          uv[i*2]=packed[i*8+6]/asset.uvScale;uv[i*2+1]=packed[i*8+7]/asset.uvScale;
        }
        geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(new THREE.BufferAttribute(unpack(surface.i,Uint32Array),1));geometry.computeBoundingSphere();worldAssetCache.geometry.set(geometryKey,geometry);
      }
      const key=asset.name+':'+variant+':'+surface.material;let mat=worldAssetCache.materials.get(key);
      if(!mat){
        const spec=asset.materials[surface.material],override=variant==='citadel'?{skin:'#435461',scale:'#24313b',plate:'#526b7a',ember:'#a8f2ff'}:{};
        mat=new THREE.MeshStandardMaterial({name:asset.name+' / '+surface.material,color:override[surface.material]||spec.color,metalness:spec.metalness||0,roughness:spec.roughness??.8,emissive:variant==='citadel'&&surface.material==='ember'?'#39c7ef':spec.emissive||0x000000,emissiveIntensity:spec.emissiveIntensity||1,side:spec.doubleSided||surface.material==='cloth'?THREE.DoubleSide:THREE.FrontSide,envMap:environment,envMapIntensity:.45});
        if(spec.grain){const grain=worldAssetGrain(spec.grain);mat.roughnessMap=grain;mat.bumpMap=grain;mat.bumpScale=spec.grain==='stone'?.055:spec.grain==='hide'?.012:.0015;if(spec.grain==='stone')mat.map=grain;}
        worldAssetCache.materials.set(key,mat);
      }
      const mesh=new THREE.Mesh(geometry,mat);mesh.name=name+' / '+surface.material;mesh.userData.sharedGeometry=true;mesh.castShadow=name!=='ground';mesh.receiveShadow=true;group.add(mesh);
    });
  }
  return {root,body,parts:groups};
}
function gameAssetOptions(variant=''){return {variant,environment:player.heroMaterials?.steel.envMap||null};}
function createBlenderDragon(){
  const model=createBlenderAsset(window.EMBER_DRAGON_ASSET,gameAssetOptions()),p=model.parts;scene.add(model.root);
  return {...model,head:p.head,jaw:p.jaw,legs:[p.leftForeLeg,p.leftHindLeg,p.rightForeLeg,p.rightHindLeg],wings:[p.leftWing,p.rightWing],tail:p.tail};
}
function createBlenderMinion(x,z){
  const model=createBlenderAsset(window.ASHBOUND_THRALL_ASSET,gameAssetOptions(currentFloor===2?'citadel':''));
  const warning=ring(1.35,currentFloor===2?0xffd36d:0xff9345);warning.visible=false;model.root.add(warning);
  const bar=box(model.root,0,2.15,0,.65,.055,.055,0xff8b4d);bar.material=new THREE.MeshBasicMaterial({color:0xff8b4d});model.root.position.set(x,0,z);scene.add(model.root);
  return {...model,legs:[model.parts.leftLeg,model.parts.rightLeg],warning,bar,home:new THREE.Vector3(x,0,z),hp:20,maxHp:20,flash:0,cooldown:0,windup:0};
}
function createBlenderGleam(){
  const model=createBlenderAsset(window.GLEAM_EYES_ASSET,gameAssetOptions()),p=model.parts;scene.add(model.root);p.sword.rotation.z=.7;
  return {...model,legs:[p.leftLeg,p.rightLeg],sword:p.sword,eyes:[p.leftEye,p.rightEye]};
}
function flameTexture(){
  if(worldAssetCache.textures.has('flame'))return worldAssetCache.textures.get('flame');
  const c=document.createElement('canvas');c.width=64;c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,80,0,32,80,45);g.addColorStop(0,'rgba(255,245,194,1)');g.addColorStop(.2,'rgba(255,177,63,.9)');g.addColorStop(.55,'rgba(244,64,12,.5)');g.addColorStop(1,'rgba(150,20,0,0)');ctx.scale(.65,1.4);ctx.fillStyle=g;ctx.fillRect(0,0,100,128);
  const texture=new THREE.CanvasTexture(c);worldAssetCache.textures.set('flame',texture);return texture;
}
function createBlenderArena(floor){
  const asset=floor===1?window.INFERNO_KEEP_ASSET:window.SKYBOUND_CITADEL_ASSET;
  const model=createBlenderAsset(asset,gameAssetOptions()),root=model.root,flames=[];
  pillars.push(...asset.extras.colliders.map(p=>({...p})));
  if(floor===1){
    const lava=box(root,0,-.55,0,180,.3,180,0xc74717);lava.material=material(0xbc3b10,0xc63007);lava.castShadow=false;
    for(const [i,p]of asset.extras.torches.entries()){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(p[0],p[1]+.5,p[2]);sprite.scale.set(.9,1.6,1);root.add(sprite);flames.push(sprite);
      if(i%2===0){const light=new THREE.PointLight(0xff8b42,23,13,2);light.position.set(p[0],p[1]+.3,p[2]);root.add(light);}
    }
    const sun=new THREE.Mesh(new THREE.SphereGeometry(6,24,16),new THREE.MeshBasicMaterial({color:0xd98b4b}));sun.position.set(-24,21,-80);root.add(sun);
    const positions=[];for(let i=0;i<140;i++)positions.push(Math.sin(i*5.7)*28,1+i%18,Math.cos(i*2.3)*42);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const embers=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffbd70,size:.075,transparent:true,opacity:.7,depthWrite:false}));root.add(embers);
    const spawn=ring(1.6,0xa3b3b4);spawn.position.z=MAP.spawnZ;root.add(spawn);
    return {root,update(time){flames.forEach((f,i)=>{f.scale.y=1.5+Math.sin(time*8+i*1.7)*.2;f.material.opacity=.8+Math.sin(time*13+i)*.15;});embers.position.y=time*.35%3;}};
  }
  const gate=model.parts.gate;gate.visible=false;
  asset.extras.torches.forEach(p=>{const light=new THREE.PointLight(0x68c9e5,10,9,2);light.position.fromArray(p);root.add(light);});
  const moonDisc=new THREE.Mesh(new THREE.SphereGeometry(5,24,16),new THREE.MeshBasicMaterial({color:0xc9d9e9}));moonDisc.position.set(-25,33,-85);root.add(moonDisc);
  return {root,gate,update(time){for(let i=0;i<10;i++){const crystal=model.parts['crystal'+i];crystal.rotation.y=time*.25+i;crystal.position.y=1.3+Math.sin(time*1.8+i)*.08;}}};
}
