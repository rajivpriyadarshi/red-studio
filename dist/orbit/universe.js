import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// Original concept artwork. The same posters appear in the spatial gallery and accessible dialogs.
export function makePosters() {
  const urls=[];
  for(let index=0;index<3;index++) {
    const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1000;
    const c=canvas.getContext('2d');
    if(index===0) {
      const bg=c.createLinearGradient(0,0,1400,1000);bg.addColorStop(0,'#24191a');bg.addColorStop(.5,'#472b2b');bg.addColorStop(1,'#151518');c.fillStyle=bg;c.fillRect(0,0,1400,1000);
      c.save();c.translate(910,490);c.rotate(-.3);
      for(let i=42;i>=0;i--){const a=i/42;c.beginPath();c.ellipse(0,0,130+i*9,260-i*2,0,0,Math.PI*2);c.strokeStyle=`rgba(${Math.round(120+a*100)},${Math.round(64+a*85)},${Math.round(54+a*70)},${.22+a*.5})`;c.lineWidth=1.8;c.stroke();}
      c.restore();c.fillStyle='#eee6da';c.font='400 185px Georgia';c.fillText('echo',83,550);c.font='15px monospace';c.fillStyle='#cdb6a6';c.fillText('THE SHAPE OF SOUND.',94,610);c.fillText('SONIC IDENTITY / EXPERIMENT 001',90,80);
      c.strokeStyle='#8d5b51';c.lineWidth=1;c.beginPath();c.moveTo(90,880);c.lineTo(1310,880);c.stroke();c.font='13px monospace';c.fillText('LISTEN WITH YOUR EYES.',90,925);c.fillText('RED STUDIO',1198,925);
    } else if(index===1) {
      c.fillStyle='#d7d0c3';c.fillRect(0,0,1400,1000);c.strokeStyle='rgba(50,48,42,.13)';c.lineWidth=1;
      for(let x=60;x<1400;x+=70){c.beginPath();c.moveTo(x,0);c.lineTo(x,1000);c.stroke();}for(let y=30;y<1000;y+=70){c.beginPath();c.moveTo(0,y);c.lineTo(1400,y);c.stroke();}
      c.save();c.translate(915,485);c.rotate(-.5);for(let i=0;i<18;i++){c.fillStyle=i%2?'#b4aca0':'#ebe5d8';c.strokeStyle='#8b8378';c.lineWidth=1;c.beginPath();c.roundRect(-230+i*10,-245+i*16,380,450,75);c.fill();c.stroke();}c.restore();
      c.fillStyle='#39352f';c.font='500 170px Arial';c.fillText('f o r m',75,568);c.font='14px monospace';c.fillText('LESS FRICTION. MORE FEELING.',88,80);c.fillText('HUMAN FIRST / DIGITAL EXPERIENCE',88,915);c.fillText('RED STUDIO',1198,915);
    } else {
      const bg=c.createRadialGradient(910,440,20,700,500,900);bg.addColorStop(0,'#a94e3d');bg.addColorStop(.45,'#5c2a25');bg.addColorStop(1,'#23181b');c.fillStyle=bg;c.fillRect(0,0,1400,1000);
      c.save();c.translate(1030,560);c.rotate(-.16);
      for(let i=30;i>=0;i--){c.strokeStyle=`rgba(225,174,139,${.025+(30-i)*.018})`;c.lineWidth=2;c.beginPath();c.ellipse(-i*11,-i*2,145+i*6,270+i*3,.3,0,Math.PI*2);c.stroke();}c.restore();
      c.fillStyle='#eee3d7';c.font='italic 145px Georgia';c.fillText('after',83,468);c.fillText('image',83,610);c.font='14px monospace';c.fillStyle='#cfa293';c.fillText('A STUDY IN PERSISTENCE.',88,80);c.fillText('MOTION / ART DIRECTION / 3D',88,915);c.fillText('RED STUDIO',1198,915);
    }
    // Fine print texture, deterministic and generated locally.
    let seed=29+index*983;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let i=0;i<34000;i++){c.fillStyle=rand()>.5?'rgba(255,246,229,.045)':'rgba(24,16,18,.04)';c.fillRect(rand()*1400,rand()*1000,1.5,1.5);}
    urls.push(canvas.toDataURL('image/webp',.9));
  }
  return urls;
}

const planetVertex=`
  varying vec3 vNormal; varying vec3 vPos; varying vec3 vWorld; uniform float uTime;
  void main(){
    float f=sin(position.y*18.0+sin(position.x*7.0)+uTime*.12)*sin(position.z*13.0)*.009;
    vec3 p=position+normal*f;
    vNormal=normalize(mat3(modelMatrix)*normal); vPos=p;vWorld=(modelMatrix*vec4(p,1.0)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }`;
const planetFragment=`
  precision highp float;varying vec3 vNormal;varying vec3 vPos;varying vec3 vWorld;uniform float uTime;
  float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
  void main(){
    vec3 n=normalize(vNormal),view=normalize(cameraPosition-vWorld);
    vec3 light=normalize(vec3(-.75,.65,.35));
    float diff=max(dot(n,light),0.0);
    float lat=vPos.y*45.0+sin(vPos.x*11.0+uTime*.025)*2.1+sin(vPos.z*23.0)*.5;
    float band=sin(lat)*.5+.5;
    float speck=hash(floor(vPos*510.0));
    vec3 base=mix(vec3(.065,.022,.021),vec3(.36,.13,.085),band);
    vec3 col=base*(.08+diff*1.45);
    float rim=pow(1.0-max(dot(n,view),0.0),3.3);
    float directional=max(dot(n,normalize(vec3(-.6,.9,.15))),0.0);
    col+=vec3(.88,.28,.13)*rim*directional*1.8;
    float spec=pow(max(dot(reflect(-light,n),view),0.0),18.0);
    col+=vec3(.78,.48,.3)*spec*.2;col+=(speck-.5)*.012*diff;
    gl_FragColor=vec4(col,1.0);
  }`;
const haloVertex=`varying vec3 vNormal;varying vec3 vWorld;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const haloFragment=`varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 n=normalize(vNormal);vec3 v=normalize(cameraPosition-vWorld);float f=pow(1.-abs(dot(n,v)),5.5);float d=max(dot(n,normalize(vec3(-.7,.9,.15))),0.);gl_FragColor=vec4(.66,.20,.10,f*d*.35);}`;
const cardVertex=`varying vec2 vUv;uniform float uTime;uniform float uBend;void main(){vUv=uv;vec3 p=position;p.z+=sin(uv.x*3.14159)*uBend; p.z+=sin(uv.y*6.28+uTime*.4)*.026;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const cardFragment=`precision highp float;varying vec2 vUv;uniform sampler2D uMap;uniform float uTime;uniform float uOpacity;uniform float uBend;void main(){vec2 uv=vUv;uv.x+=sin(uv.y*8.+uTime*.35)*.0016*uBend;vec2 p=abs(vUv-.5)-vec2(.484,.477);float d=length(max(p,0.))+min(max(p.x,p.y),0.)-.013;float mask=1.-smoothstep(-.001,.002,d);vec4 art=texture2D(uMap,uv);float sheen=pow(max(0.,sin(vUv.x*2.+vUv.y*1.1+uTime*.08)),20.);vec3 col=art.rgb+vec3(.18,.10,.065)*sheen*.11;gl_FragColor=vec4(col,mask*uOpacity);
#include <colorspace_fragment>
}`;

export function createUniverse(canvas,state,posters){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));renderer.setClearColor(0x111112,0);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x111112,.018);
  const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);camera.position.set(0,0,9);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;pmrem.dispose();
  scene.add(new THREE.AmbientLight(0xd4b6a2,1.2));const key=new THREE.DirectionalLight(0xffe3c1,3);key.position.set(-3,5,5);scene.add(key);const fill=new THREE.DirectionalLight(0xb65c49,2);fill.position.set(5,-1,3);scene.add(fill);
  const planetGroup=new THREE.Group();scene.add(planetGroup);
  const planetMat=new THREE.ShaderMaterial({vertexShader:planetVertex,fragmentShader:planetFragment,uniforms:{uTime:{value:0}}});
  const sphereGeo=new THREE.SphereGeometry(1.74,96,64);const sphere=new THREE.Mesh(sphereGeo,planetMat);sphere.rotation.z=-.24;planetGroup.add(sphere);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.81,64,48),new THREE.ShaderMaterial({vertexShader:haloVertex,fragmentShader:haloFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));planetGroup.add(atmosphere);
  const orbitGroup=new THREE.Group();orbitGroup.rotation.set(1.03,-.22,-.3);planetGroup.add(orbitGroup);
  for(let j=0;j<3;j++){const points=[];for(let i=0;i<=250;i++){let a=i/250*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*(2.35+j*.15),Math.sin(a)*(2.35+j*.15),j*.04));}const geo=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.LineLoop(geo,new THREE.LineBasicMaterial({color:j===1?0xa66449:0x77534a,transparent:true,opacity:j===1?.44:.16}));orbitGroup.add(line);}
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.075,16,16),new THREE.MeshStandardMaterial({color:0xe4b093,metalness:.7,roughness:.35}));orbitGroup.add(moon);
  let seed=822;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const starsGeo=new THREE.BufferGeometry();const pos=[],cols=[];
  for(let i=0;i<1600;i++){pos.push((random()-.5)*45,(random()-.5)*30,-random()*30+2);const br=.24+random()*.5;cols.push(br,br*.87,br*.76);}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));starsGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({size:.017,vertexColors:true,transparent:true,opacity:.75,sizeAttenuation:true,depthWrite:false}));scene.add(stars);
  const dustGeo=new THREE.BufferGeometry(),dustPos=[];for(let i=0;i<2100;i++){let a=random()*Math.PI*2,r=2.3+Math.pow(random(),3)*2.3;dustPos.push(Math.cos(a)*r,Math.sin(a)*r,(random()-.5)*.3);}dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.012,color:0xb87750,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));orbitGroup.add(dust);
  const gallery=new THREE.Group();scene.add(gallery);const cards=[],textures=[];
  const loader=new THREE.TextureLoader();
  posters.forEach((url,index)=>{const texture=loader.load(url,()=>{state.needsRender=true;});texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const mat=new THREE.ShaderMaterial({uniforms:{uMap:{value:texture},uTime:{value:0},uOpacity:{value:1},uBend:{value:0}},vertexShader:cardVertex,fragmentShader:cardFragment,transparent:true,side:THREE.DoubleSide});const card=new THREE.Mesh(new THREE.PlaneGeometry(5.7,4.07,30,20),mat);gallery.add(card);cards.push(card);});
  const sculpture=new THREE.Group();gallery.add(sculpture);
  const metal=new THREE.MeshStandardMaterial({color:0xb96c52,metalness:.92,roughness:.27,envMapIntensity:1.6});
  for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.56+i*.055,.016,12,100),metal);ring.rotation.x=i*.25;ring.rotation.y=i*.17;sculpture.add(ring);}
  const cursor=new THREE.Vector2(),targetCursor=new THREE.Vector2();let time=0,frame=0,last=performance.now(),renderedState='';
  const drag={active:false,x:0,y:0,lastX:0,lastY:0};const hero=document.querySelector('.hero');
  const dragDown=e=>{if(state.calm||e.target.closest('a,button'))return;drag.active=true;drag.lastX=e.clientX;drag.lastY=e.clientY;hero.setPointerCapture(e.pointerId);};
  const dragMove=e=>{if(!drag.active)return;drag.x+=(e.clientX-drag.lastX)*.006;drag.y+=(e.clientY-drag.lastY)*.003;drag.lastX=e.clientX;drag.lastY=e.clientY;};
  const dragUp=()=>{drag.active=false;};hero.addEventListener('pointerdown',dragDown);hero.addEventListener('pointermove',dragMove);hero.addEventListener('pointerup',dragUp);hero.addEventListener('pointercancel',dragUp);
  const move=e=>{targetCursor.set((e.clientX/innerWidth-.5)*2,(e.clientY/innerHeight-.5)*2);state.needsRender=true;};
  const leave=()=>targetCursor.set(0,0);
  window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',leave);
  const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();state.needsRender=true;};window.addEventListener('resize',resize);resize();
  const lost=e=>{e.preventDefault();document.body.classList.remove('webgl-ready');document.body.classList.add('no-webgl');};canvas.addEventListener('webglcontextlost',lost);
  const restored=()=>{document.body.classList.add('webgl-ready');document.body.classList.remove('no-webgl');state.needsRender=true;};canvas.addEventListener('webglcontextrestored',restored);
  function render(now){
    frame=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.04);last=now;
    if(document.hidden||state.modal)return;
    const signature=[state.entry.toFixed(3),state.gallery.toFixed(3),state.index.toFixed(3),state.depart.toFixed(3),state.contact.toFixed(3),innerWidth].join(':');
    if(state.calm&&!state.needsRender&&signature===renderedState)return;renderedState=signature;state.needsRender=false;
    if(!state.calm)time+=dt;
    cursor.lerp(state.calm?new THREE.Vector2(0,0):targetCursor,1-Math.exp(-dt*3));
    const narrow=innerWidth<700, aspect=innerWidth/innerHeight;
    const intro=state.gallery,departure=state.depart;
    camera.position.x=state.calm?0:cursor.x*.16;
    camera.position.y=state.calm?0:-cursor.y*.12;
    camera.position.z=9+intro*.35+departure*.6;
    camera.rotation.z=state.calm?0:Math.sin(time*.07)*.008;
    const heroX=narrow?1.2:aspect>1.3?2.4:1.65;
    planetGroup.position.set(heroX*(1-intro)-2.5*intro+(state.contact*3.3),narrow?-1.48+intro*1.1:-.05+intro*.8,-intro*7-state.contact*3);
    const heroScale=(narrow?.87:1.28)*(1-intro*.37)*(1+state.contact*.4);planetGroup.scale.setScalar(heroScale*Math.max(.02,state.entry));
    planetGroup.rotation.y=state.calm?.35:time*.025+intro*.85;
    sphere.rotation.y=state.calm?0:time*.026+drag.x;sphere.rotation.x=state.calm?0:drag.y;planetMat.uniforms.uTime.value=time;
    orbitGroup.rotation.z=-.3+(state.calm?0:time*.019);moon.position.set(Math.cos(time*.09+.8)*2.5,Math.sin(time*.09+.8)*2.5,0);
    stars.rotation.y=time*.0015+intro*.055+state.index*.026;stars.position.z=intro*2-departure*2;stars.material.opacity=.68*(1-departure*.5);
    gallery.visible=intro>.005&&departure<.999;
    gallery.position.set(narrow?0:.95,narrow?-.55:.02,-(1-intro)*10-departure*7);gallery.rotation.y=state.calm?0:cursor.x*.025;
    const activeScale=narrow?Math.min(.66,aspect*1.2):aspect<1.3?.84:1;
    cards.forEach((card,i)=>{let diff=i-state.index;const dist=Math.abs(diff);card.position.set(diff*(narrow?4.1:5.0),Math.sin(diff*.85)*.18,-dist*2.2);card.rotation.set(state.calm?0:Math.sin(time*.3+i)*.012,-diff*.32,(state.calm?0:Math.sin(time*.22+i)*.015)-diff*.045);card.scale.setScalar(activeScale);card.material.uniforms.uTime.value=time;card.material.uniforms.uBend.value=state.calm?0:Math.min(dist,.9)*.28;card.material.uniforms.uOpacity.value=Math.max(0,Math.min(intro*1.4,1)*(1-departure));});
    sculpture.position.set(narrow?1.12:3.25,narrow?-.35:-.6,1.05);sculpture.scale.setScalar(narrow?.52:.85);sculpture.rotation.set(time*.1,.4+time*.15,state.index*.9);sculpture.visible=!state.calm&&intro>.8&&departure<.4;
    renderer.render(scene,camera);
  }
  renderer.render(scene,camera);document.body.classList.add('webgl-ready');frame=requestAnimationFrame(render);
  return {dispose(){cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);window.removeEventListener('resize',resize);hero.removeEventListener('pointerdown',dragDown);hero.removeEventListener('pointermove',dragMove);hero.removeEventListener('pointerup',dragUp);hero.removeEventListener('pointercancel',dragUp);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();}};
}
