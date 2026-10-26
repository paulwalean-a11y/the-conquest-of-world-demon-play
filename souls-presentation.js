'use strict';
// HDR presentation: restrained highlights, depth contact shading, vignette and fine grain.
let soulsPresentation=null;
function initSoulsPresentation(){
  if(!renderer.capabilities.isWebGL2||!renderer.extensions.has('EXT_color_buffer_float'))return;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});target.samples=2;target.depthTexture=new THREE.DepthTexture(1,1);target.depthTexture.type=THREE.UnsignedIntType;
  const uniforms={tColor:{value:target.texture},tDepth:{value:target.depthTexture},texel:{value:new THREE.Vector2(1,1)},nearFar:{value:new THREE.Vector2(camera.near,camera.far)},time:{value:0},hurt:{value:0}};
  const mat=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`
    varying vec2 vUv; uniform sampler2D tColor,tDepth;uniform vec2 texel,nearFar;uniform float time,hurt;
    float linearDepth(float z){return 2.0*nearFar.x*nearFar.y/(nearFar.y+nearFar.x-(z*2.0-1.0)*(nearFar.y-nearFar.x));}
    void main(){
      vec3 c=texture2D(tColor,vUv).rgb;float depth=linearDepth(texture2D(tDepth,vUv).r),occ=0.0;vec3 glow=vec3(0.0);
      for(int i=0;i<8;i++){float angle=float(i)*.785398;vec2 dir=vec2(cos(angle),sin(angle));float other=linearDepth(texture2D(tDepth,vUv+dir*texel*3.0).r);float diff=depth-other;occ+=step(.035,diff)*(1.0-smoothstep(.05,.65,diff));vec3 b=texture2D(tColor,vUv+dir*texel*4.0).rgb;glow+=max(b-vec3(1.15),vec3(0.0));}
      c=c*(1.0-occ*.032)+glow*.012;c*=1.08;
      c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.0,1.0);
      float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,.73);c=mix(c,c*vec3(.92,.98,1.02),.3);
      float edge=smoothstep(.15,.77,length((vUv-.5)*vec2(1.05,1.0)));c*=1.0-edge*.3;c+=vec3(.18,.007,.002)*hurt*edge;
      float grain=fract(sin(dot(gl_FragCoord.xy+floor(time*24.0),vec2(12.9898,78.233)))*43758.5453)-.5;
      gl_FragColor=vec4(pow(max(c,vec3(0.0)),vec3(1.0/2.2))+grain*.006,1.0);
    }`});
  const quadScene=new THREE.Scene(),quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
  soulsPresentation={target,uniforms,scene:quadScene,camera:quadCamera};resizeSoulsPresentation();
}
function resizeSoulsPresentation(){if(!soulsPresentation)return;const size=renderer.getDrawingBufferSize(new THREE.Vector2());soulsPresentation.target.setSize(size.x,size.y);soulsPresentation.uniforms.texel.value.set(1/size.x,1/size.y);}
function renderSoulsFrame(now){
  if(!soulsPresentation||souls.quality!=='cinematic'){renderer.render(scene,camera);return;}
  const p=soulsPresentation;p.uniforms.time.value=now/1000;p.uniforms.hurt.value=souls.damageFlash;
  renderer.info.autoReset=false;renderer.info.reset();
  renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(p.target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(p.scene,p.camera);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.info.autoReset=true;
}
