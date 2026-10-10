import * as THREE from 'three';

const backgroundVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy, .99999,1.);}`;
const noise=`
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float f=0.;float a=.5;for(int i=0;i<4;i++){f+=a*noise(p);p=p*2.03+vec3(2.1,5.4,1.8);a*=.5;}return f;}`;
const backgroundFragment=`precision highp float;varying vec2 vUv;uniform float uTime;uniform vec3 uTint;${noise}
void main(){vec2 p=vUv;float n=fbm(vec3(p*3.,uTime*.024));float haze=fbm(vec3(p*6.+vec2(n*.65,-n*.4),uTime*.015));vec3 c=mix(vec3(.011,.019,.026),vec3(.023,.041,.049),smoothstep(.7,.0,p.y));float mist=pow(max(0.,.76-p.y),1.3)*haze;c+=mix(vec3(.09,.025,.20),uTint*.16,p.x)*mist;float edge=pow(1.-p.x,4.)+pow(p.x,4.);c+=vec3(.023,.027,.046)*edge*.45;gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`;
const particleVertex=`uniform float uTime;uniform float uCameraY;uniform vec3 uMouse;uniform float uRatio;attribute vec4 aSeed;attribute vec3 aColor;varying vec3 vColor;varying float vAlpha;
void main(){float y=uCameraY-2.35+aSeed.z*.055+sin(aSeed.x*1.6)*.8;float t=aSeed.x+uTime*.13+sin(aSeed.z*.18+uTime*.15)*.3;float r=aSeed.y+sin(y*.5+t*2.3-uTime*.12)*.45;vec3 p=vec3(cos(t)*r,y+sin(t*2.2+aSeed.z*.2+uTime*.16)*.43,sin(t)*r);vec3 delta=p-uMouse;float influence=exp(-dot(delta,delta)*.65);p+=normalize(delta+vec3(.01))*.32*influence;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.0+aSeed.w*2.3)*uRatio*(10./-mv.z),.6,6.);vColor=aColor*1.5;vAlpha=.47+sin(y*.43+aSeed.x+uTime*.27)*.15;}`;
const particleFragment=`precision highp float;varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=(1.-smoothstep(.07,.5,d))*vAlpha;gl_FragColor=vec4(vColor,a);}`;
const cardVertex=`varying vec2 vUv;uniform float uTime;uniform float uHover;uniform float uVelocity;void main(){vUv=uv;vec3 p=position;p.z+=sin(uv.x*3.14159)*sin(uv.y*3.14159)*(.04+uHover*.055+abs(uVelocity)*.04);p.z+=sin(uv.y*9.+uTime*.4)*.01;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const cardFragment=`precision highp float;varying vec2 vUv;uniform sampler2D uBackground;uniform sampler2D uArt;uniform sampler2D uLabel;uniform vec2 uResolution;uniform vec3 uColorA;uniform vec3 uColorB;uniform float uTime;uniform float uHover;uniform float uVelocity;uniform float uVisible;${noise}
void main(){vec2 uv=vUv;vec2 q=abs(uv-.5)-vec2(.461,.442);float box=length(max(q,0.))+min(max(q.x,q.y),0.)-.04;float mask=1.-smoothstep(-.0006,.001,box);if(mask<.01)discard;
float n=fbm(vec3(uv*5.5,uTime*.055));float m=fbm(vec3(uv*9.+n*.8,uTime*.042));vec2 offset=vec2(n-.45,m-.45)*(.017+uHover*.015+abs(uVelocity)*.008);
vec2 screen=gl_FragCoord.xy/uResolution;vec3 behind=texture2D(uBackground,screen+offset).rgb;behind+=texture2D(uBackground,screen+offset+vec2(.003)).rgb;behind*=.5;
vec2 artUv=uv+offset*.9;vec3 art=texture2D(uArt,artUv).rgb;float swirl=sin(uv.y*5.+uv.x*2.+n*9.-uTime*.07)*.5+.5;vec3 film=mix(uColorA,uColorB,swirl);vec3 colour=mix(behind,art*.72,.25);colour+=film*(.012+m*.018);colour+=behind*.26;
float streak=pow(max(0.,sin(uv.x*4.+uv.y*2.+n*.5+uTime*.03)),24.);colour+=film*streak*.04;
float edge=1.-smoothstep(.002,.008,abs(box));colour+=mix(uColorA,uColorB,uv.y)*edge*.34;
vec2 luv=uv;float strip=step(.96,noise(vec3(floor(uv.y*80.),uTime*.28,2.)));luv.x+=strip*sin(uTime*4.)*(.001+uHover*.004+abs(uVelocity)*.018);vec4 label=texture2D(uLabel,luv);float shift=.0006+abs(uVelocity)*.0008;vec3 type=vec3(texture2D(uLabel,luv+vec2(shift,0)).r,label.g,texture2D(uLabel,luv-vec2(shift,0)).b);colour=mix(colour,type,label.a*.97*(gl_FrontFacing?1.:0.));
gl_FragColor=vec4(colour,mask*uVisible);
#include <colorspace_fragment>
}`;
const postFragment=`precision highp float;varying vec2 vUv;uniform sampler2D uScene;uniform sampler2D uDepth;uniform vec2 uResolution;uniform float uTime;uniform float uVelocity;uniform float uCalm;
float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec2 uv=vUv;float wave=sin(uv.y*8.+uTime*.4)*sin(uv.x*5.-uTime*.3);uv+=vec2(wave*.0015*uVelocity,0.);float depth=texture2D(uDepth,uv).r;float distance=.1*100./(100.-depth*99.9);float blur=clamp(abs(distance-6.2)*.22,0.,2.3);vec2 pixel=1./uResolution;vec2 d=pixel*blur;
vec3 base=texture2D(uScene,uv).rgb*.5; base+=(texture2D(uScene,uv+vec2(d.x,0.)).rgb+texture2D(uScene,uv-vec2(d.x,0.)).rgb+texture2D(uScene,uv+vec2(0.,d.y)).rgb+texture2D(uScene,uv-vec2(0.,d.y)).rgb)*.125;
float aberration=(.55+abs(uVelocity)*2.1)*(1.-uCalm);base.r=texture2D(uScene,uv+vec2(pixel.x*aberration,0.)).r*.6+base.r*.4;base.b=texture2D(uScene,uv-vec2(pixel.x*aberration,0.)).b*.6+base.b*.4;
vec3 bloom=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 o=vec2(cos(a),sin(a))*pixel*7.;vec3 s=texture2D(uScene,uv+o).rgb;bloom+=max(s-vec3(.48),vec3(0.));}base+=bloom*.045;
float vignette=smoothstep(.95,.2,length((vUv-.5)*vec2(1.,.8)));base*=.75+.25*vignette;float grain=random(vUv*uResolution+uTime*.35);base+=(grain-.5)*.006;gl_FragColor=vec4(base,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

function wovenRibbon(phase){
 const positions=[],uvs=[],indices=[];const rows=610,cols=13;
 for(let i=0;i<=rows;i++){const y=-28+i/rows*56;const a=y*.92+phase;const r=.36+.10*Math.sin(y*2.4+phase);for(let j=0;j<=cols;j++){const v=j/cols*2-1;const fold=.22*Math.sin(y*2.1+phase)*Math.cos(v*Math.PI);const radius=r+fold+v*.23*Math.cos(y*1.8);const x=Math.cos(a)*radius+Math.sin(a)*v*.66;const z=Math.sin(a)*radius-Math.cos(a)*v*.66;positions.push(x,y+v*.12*Math.sin(y*3.1),z);uvs.push(j/cols,i/rows);}}
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function environment(renderer){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#252b38';ctx.fillRect(0,0,1024,512);
 const pools=[[130,210,210,'#adcbcc'],[410,270,220,'#bf93b0'],[700,140,160,'#ebe3d7'],[840,390,250,'#7eabc0'],[190,430,180,'#8c789e']];
 pools.forEach(([x,y,r,col])=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(.35,col+'bb');g.addColorStop(1,col+'00');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);});
 ctx.fillStyle='#e6e3e0';ctx.fillRect(480,30,42,380);ctx.fillStyle='#8e98a6';ctx.fillRect(25,60,11,380);
 const texture=new THREE.CanvasTexture(c);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;const gen=new THREE.PMREMGenerator(renderer);const rt=gen.fromEquirectangular(texture);texture.dispose();gen.dispose();return rt;
}

export function createExhibition(canvas,artwork,state,{onProject,onSelect,onProgress}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.15:1.35));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),cardScene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,100);const bgCapture=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});const mainCapture=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});mainCapture.depthTexture=new THREE.DepthTexture(1,1);mainCapture.samples=innerWidth<650?0:2;
 const env=environment(renderer);scene.environment=env.texture;
 const bgMat=new THREE.ShaderMaterial({vertexShader:backgroundVertex,fragmentShader:backgroundFragment,depthWrite:false,depthTest:false,uniforms:{uTime:{value:0},uTint:{value:new THREE.Color(.32,.20,.37)}}});const bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMat);bg.frustumCulled=false;bg.renderOrder=-100;scene.add(bg);
 scene.add(new THREE.AmbientLight(0xbbc6d1,.8));const key=new THREE.DirectionalLight(0xe6dde5,3);key.position.set(4,6,5);scene.add(key);const cyan=new THREE.PointLight(0x80c7d8,22,18,2);cyan.position.set(-3,1,4);scene.add(cyan);const pink=new THREE.PointLight(0xd386b2,20,18,2);pink.position.set(4,-3,3);scene.add(pink);
 const uTime={value:0},uPointer={value:new THREE.Vector2(0,0)};
 const thread=new THREE.Group();scene.add(thread);
 const metal=new THREE.MeshPhysicalMaterial({color:0xa7a0ae,metalness:.96,roughness:.32,iridescence:1,iridescenceIOR:1.35,iridescenceThicknessRange:[110,490],clearcoat:1,clearcoatRoughness:.18,envMapIntensity:1.25,side:THREE.DoubleSide});
 const brush=document.createElement('canvas');brush.width=512;brush.height=256;const brushCtx=brush.getContext('2d');brushCtx.fillStyle='#aaa';brushCtx.fillRect(0,0,512,256);for(let j=0;j<1600;j++){brushCtx.strokeStyle='rgba('+[70+j%140,70+j%140,70+j%140].join(',')+',.22)';brushCtx.beginPath();brushCtx.moveTo((j*97)%512,(j*37)%256);brushCtx.lineTo((j*97)%512+14,(j*37)%256+.3);brushCtx.stroke();}const brushTexture=new THREE.CanvasTexture(brush);brushTexture.wrapS=brushTexture.wrapT=THREE.RepeatWrapping;brushTexture.repeat.set(1,8);metal.bumpMap=brushTexture;metal.bumpScale=.021;
 metal.onBeforeCompile=shader=>{shader.uniforms.uTime=uTime;shader.uniforms.uPointer=uPointer;shader.vertexShader='uniform float uTime;uniform vec2 uPointer;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat influence=exp(-abs(position.y-uPointer.y)*.7);transformed.x+=sin(position.y*1.8+uTime*.13)*.025+uPointer.x*.08*influence;transformed.z+=cos(position.y*1.2-uTime*.1)*.017;`);};
 for(let i=0;i<3;i++){const ribbon=new THREE.Mesh(wovenRibbon(i*Math.PI*2/3),metal);thread.add(ribbon);}
 // A thin red filament travels inside the metal weave and remains visible between its folds.
 const path=[];for(let i=0;i<650;i++){const y=-27+i/649*54;path.push(new THREE.Vector3(Math.cos(y*1.4)*.33,y,Math.sin(y*1.4)*.33));}const filament=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),650,.018,5,false),new THREE.MeshStandardMaterial({color:0xb45b73,emissive:0x6b254a,emissiveIntensity:.5,metalness:.4,roughness:.5}));thread.add(filament);
 let seed=1728;const rnd=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const pointCount=innerWidth<650?6500:12500;const seeds=[],colours=[],positions=[];
 for(let i=0;i<pointCount;i++){const y=(rnd()-.5)*35;const a=rnd()*Math.PI*2;const r=1.05+Math.pow(rnd(),.7)*5.3;seeds.push(a,r,y,rnd());positions.push(0,0,0);const color=new THREE.Color().lerpColors(new THREE.Color('#62529d'),new THREE.Color('#b65d97'),rnd());color.lerp(new THREE.Color('#65a9b0'),Math.max(0,Math.sin(a))*rnd()*.8);colours.push(color.r,color.g,color.b);}
 const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));particleGeo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,4));particleGeo.setAttribute('aColor',new THREE.Float32BufferAttribute(colours,3));
 const particleMat=new THREE.ShaderMaterial({vertexShader:particleVertex,fragmentShader:particleFragment,uniforms:{uTime,uCameraY:{value:0},uMouse:{value:new THREE.Vector3(999,999,999)},uRatio:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const particles=new THREE.Points(particleGeo,particleMat);particles.frustumCulled=false;scene.add(particles);
 const cards=[],textures=[],radius=4.5,step=Math.PI/3;
 const plateMat=new THREE.ShaderMaterial({vertexShader:backgroundVertex,fragmentShader:'varying vec2 vUv;uniform sampler2D uMap;void main(){gl_FragColor=texture2D(uMap,vUv);}',uniforms:{uMap:{value:bgCapture.texture}},depthWrite:false,depthTest:false});const plate=new THREE.Mesh(new THREE.PlaneGeometry(2,2),plateMat);plate.frustumCulled=false;plate.renderOrder=-100;cardScene.add(plate);
 const plane=new THREE.PlaneGeometry(4.45,2.78,32,20);
 artwork.forEach((art,index)=>{const image=new THREE.CanvasTexture(art.art),label=new THREE.CanvasTexture(art.label);image.colorSpace=THREE.SRGBColorSpace;label.colorSpace=THREE.SRGBColorSpace;textures.push(image,label);const mat=new THREE.ShaderMaterial({vertexShader:cardVertex,fragmentShader:cardFragment,uniforms:{uTime,uHover:{value:0},uVelocity:{value:0},uVisible:{value:1},uBackground:{value:bgCapture.texture},uArt:{value:image},uLabel:{value:label},uResolution:{value:new THREE.Vector2(1,1)},uColorA:{value:new THREE.Color(art.project.color[0])},uColorB:{value:new THREE.Color(art.project.color[1])}},transparent:true,side:THREE.DoubleSide,depthWrite:true});const mesh=new THREE.Mesh(plane,mat);mesh.userData.project=index;cardScene.add(mesh);cards.push(mesh);});
 const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);const postMat=new THREE.ShaderMaterial({vertexShader:backgroundVertex,fragmentShader:postFragment,depthTest:false,depthWrite:false,uniforms:{uScene:{value:mainCapture.texture},uDepth:{value:mainCapture.depthTexture},uResolution:{value:new THREE.Vector2(1,1)},uTime,uVelocity:{value:0},uCalm:{value:0}}});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat));
 const pointer=new THREE.Vector2(),smoothPointer=new THREE.Vector2();const raycaster=new THREE.Raycaster();let hasPointer=false;let time=0,last=performance.now(),frame=0,filtered=[0,1,2,3,4,5],current=0,velocity=0,lastProgress=0,hover=-1,dirty=true,renderCount=0,avgDelta=16,dragStart=null;
 function setSelection(ids){filtered=ids.slice();cards.forEach((c,i)=>c.visible=filtered.includes(i));current=Math.max(0,Math.min(current,filtered.length-1));dirty=true;}
 function layout(){filtered.forEach((id,slot)=>{const theta=slot*step;const c=cards[id];c.position.set(Math.sin(theta)*radius,-slot*1.15,Math.cos(theta)*radius);c.rotation.y=theta;c.userData.slot=slot;});}
 const resize=()=>{const w=innerWidth,h=innerHeight,ratio=renderer.getPixelRatio();renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();bgCapture.setSize(Math.round(w*ratio),Math.round(h*ratio));mainCapture.setSize(Math.round(w*ratio),Math.round(h*ratio));cards.forEach(c=>c.material.uniforms.uResolution.value.set(w*ratio,h*ratio));postMat.uniforms.uResolution.value.set(w*ratio,h*ratio);dirty=true;};window.addEventListener('resize',resize);resize();
 const move=e=>{hasPointer=true;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);dirty=true;if(dragStart){const delta=e.clientY-dragStart.y+(e.clientX-dragStart.x)*.65;if(Math.abs(delta)>5)dragStart.moved=true;onProgress(-delta/520+dragStart.progress);}};
 const down=e=>{if(state.modal)return;hasPointer=true;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);dragStart={x:e.clientX,y:e.clientY,progress:state.target,moved:false};canvas.setPointerCapture(e.pointerId);};
 const up=e=>{if(!dragStart)return;const wasDrag=dragStart.moved;dragStart=null;if(!wasDrag){raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(cards.filter(c=>c.visible))[0];if(hit){const id=hit.object.userData.project;if(id===filtered[Math.round(current)])onProject(id);else onSelect(hit.object.userData.slot);}}};
 const cancel=()=>dragStart=null;
 const wheel=e=>{if(state.modal)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);onProgress(state.target+Math.max(-650,Math.min(650,delta))*.0016);};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
 const lost=e=>{e.preventDefault();document.body.classList.remove('ready');state.failed=true;};canvas.addEventListener('webglcontextlost',lost);
 const restored=()=>{document.body.classList.add('ready');state.failed=false;dirty=true;};canvas.addEventListener('webglcontextrestored',restored);
 function render(now){
  frame=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||state.modal||state.failed)return;
  avgDelta=avgDelta*.97+dt*1000*.03;if(++renderCount%90===0){canvas.dataset.frameMs=avgDelta.toFixed(1);if(renderCount>180&&avgDelta>23&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);particleMat.uniforms.uRatio.value=1;resize();}}
  if(state.calm&&!dirty&&Math.abs(current-state.target)<.001)return;
  if(!state.calm)time+=dt;
  current=state.calm?state.target:THREE.MathUtils.lerp(current,state.target,1-Math.exp(-dt*5.4));
  velocity=THREE.MathUtils.lerp(velocity,(current-lastProgress)/Math.max(dt,.01),.12);lastProgress=current;
  smoothPointer.lerp(state.calm?new THREE.Vector2():pointer,1-Math.exp(-dt*2.4));
  layout();const theta=current*step+.045+smoothPointer.x*.04;let camRadius=10.7;if(camera.aspect<1)camRadius=radius+4.45/(.88*2*Math.tan(THREE.MathUtils.degToRad(20))*camera.aspect);
  camRadius+=state.calm?0:Math.min(Math.abs(velocity)*.23,.85);const y=-current*1.15;
  camera.position.set(Math.sin(theta)*camRadius,y+smoothPointer.y*.15,Math.cos(theta)*camRadius);camera.lookAt(0,y-.02,0);camera.rotateZ(state.calm?0:Math.sin(current*.6)*.01);camera.updateMatrixWorld();
  uTime.value=time;uPointer.value.set(smoothPointer.x,y+smoothPointer.y*3);thread.rotation.y=state.calm?0:Math.sin(time*.06)*.04;
  cyan.position.y=y+1;pink.position.y=y-3;
  const point=new THREE.Vector3(pointer.x,pointer.y,.5).unproject(camera);const dir=point.sub(camera.position).normalize();particleMat.uniforms.uMouse.value.copy(camera.position).addScaledVector(dir,camRadius);particleMat.uniforms.uCameraY.value=y;
  const active=Math.max(0,Math.min(filtered.length-1,Math.round(current)));state.current=current;state.activeId=filtered[active];
  if(hasPointer&&!dragStart&&!state.calm){raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(cards.filter(c=>c.visible))[0];hover=hit?.object.userData.project??-1;}else hover=-1;
  canvas.style.cursor=hover>=0&&!dragStart?'pointer':dragStart?'grabbing':'grab';
  cards.forEach((card,id)=>{const u=card.material.uniforms;u.uHover.value=THREE.MathUtils.lerp(u.uHover.value,id===hover?1:0,.08);u.uVelocity.value=state.calm?0:velocity;u.uVisible.value=state.entry;const slot=filtered.indexOf(id);card.visible=slot>=0&&Math.abs(slot-current)<2.6;});
  const selected=artwork[state.activeId].project;bgMat.uniforms.uTint.value.lerp(new THREE.Color(selected.color[1]),.018);postMat.uniforms.uVelocity.value=state.calm?0:velocity;postMat.uniforms.uCalm.value=state.calm?1:0;
  // Capture the sculpture and particle atmosphere first. Glass panels refract this actual live scene.
  renderer.setRenderTarget(bgCapture);renderer.render(scene,camera);renderer.setRenderTarget(mainCapture);renderer.render(cardScene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);dirty=false;
 }
 frame=requestAnimationFrame(render);document.body.classList.add('ready');
 return {setSelection(ids){setSelection(ids);layout();},invalidate(){dirty=true;},dispose(){cancelAnimationFrame(frame);window.removeEventListener('resize',resize);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});cardScene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});postScene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());brushTexture.dispose();env.dispose();bgCapture.dispose();mainCapture.dispose();renderer.dispose();}};
}
