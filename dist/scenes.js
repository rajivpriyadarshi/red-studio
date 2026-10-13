import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';

export function createSculpture(container,canvas,state){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,40);camera.position.set(0,0,8.7);
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xffffff,0x792b15,.7));
 const key=new THREE.DirectionalLight(0xffe4d1,2);key.position.set(-3,5,4);scene.add(key);
 const rim=new THREE.DirectionalLight(0xffffff,1.6);rim.position.set(4,-2,1);scene.add(rim);
 const points=[];for(let i=0;i<=240;i++){const t=i/240*Math.PI*2;points.push(new THREE.Vector3((Math.sin(t)+2*Math.sin(2*t))*.61,(Math.cos(t)-2*Math.cos(2*t))*.61,-Math.sin(3*t)*.75));}
 const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');
 const shape=new THREE.Shape();const w=.4,h=.11,r=.055;
 shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
 let geometry=new THREE.ExtrudeGeometry(shape,{steps:260,bevelEnabled:false,extrudePath:curve,curveSegments:5});geometry.deleteAttribute('normal');geometry=mergeVertices(geometry,1e-4);geometry.computeVertexNormals();geometry.center();
 const material=new THREE.MeshPhysicalMaterial({color:0xb81c08,metalness:.78,roughness:.23,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.15});
 const mesh=new THREE.Mesh(geometry,material);const group=new THREE.Group();group.add(mesh);scene.add(group);mesh.rotation.set(.52,.17,-.3);group.scale.setScalar(1.05);
 const target={x:0,y:0},pointer={x:0,y:0},drag={active:false,lastX:0,lastY:0,x:0,y:0};let visible=true,time=0,frame=0,last=performance.now();
 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=Math.max(8.1,6.3/camera.aspect);camera.updateProjectionMatrix();renderer.render(scene,camera);};
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(container);
 const move=e=>{if(state.calm)return;const rect=container.getBoundingClientRect();target.x=(e.clientX-rect.left)/rect.width-.5;target.y=(e.clientY-rect.top)/rect.height-.5;if(drag.active){drag.x+=(e.clientX-drag.lastX)*.006;drag.y+=(e.clientY-drag.lastY)*.006;drag.lastX=e.clientX;drag.lastY=e.clientY;}};
 const down=e=>{if(state.calm)return;drag.active=true;drag.lastX=e.clientX;drag.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);};
 const up=()=>{drag.active=false;};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',()=>{target.x=0;target.y=0;});
 const render=now=>{frame=requestAnimationFrame(render);const delta=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden||state.paused)return;if(state.calm){if(!state.needsRender)return;state.needsRender=false;}else time+=delta;pointer.x+=(target.x-pointer.x)*.045;pointer.y+=(target.y-pointer.y)*.045;
 group.rotation.x=state.calm?.12:pointer.y*.45+Math.sin(time*.35)*.12+drag.y;
 group.rotation.y=state.calm?.25:time*.13+pointer.x*.8+drag.x+state.heroScroll*.6;
 group.rotation.z=state.calm?-.06:Math.sin(time*.2)*.1;
 group.position.y=state.calm?0:Math.sin(time*.7)*.08-state.heroScroll*.35;renderer.render(scene,camera);
 };
 resize();renderer.render(scene,camera);container.classList.add('webgl-ready');frame=requestAnimationFrame(render);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();container.classList.remove('webgl-ready');});
 return()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();renderer.dispose();geometry.dispose();material.dispose();environment.dispose();};
}
export function createSignal(container,canvas,state){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
 const uniforms={uTime:{value:0},uResolution:{value:new THREE.Vector2(1,1)},uMouse:{value:new THREE.Vector2(.65,.4)},uSeed:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',fragmentShader:`
 precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uSeed;
 float wave(vec2 p){ float t=uTime*.18+uSeed; p+=vec2(sin(p.y*2.+t),cos(p.x*2.-t))*.22; float a=atan(p.y,p.x);float r=length(p); return sin(r*15.-a*3.+t*2.+sin(a*5.+t)*.8)*.45+sin(p.x*7.+p.y*4.+t)*.13;}
 void main(){ vec2 p=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.)*2.;p.x-=.72;p.y+=.03;p+=vec2(uMouse.x-.5,uMouse.y-.5)*.3;float n=wave(p);float dx=wave(p+vec2(.007,0.))-n;float dy=wave(p+vec2(0.,.007))-n;vec3 normal=normalize(vec3(-dx*15.,-dy*15.,.55));vec3 light=normalize(vec3(-.4,.7,1.));float diffuse=max(dot(normal,light),0.);float spec=pow(max(dot(reflect(-light,normal),vec3(0.,0.,1.)),0.),22.);float radius=length(p);float mask=1.-smoothstep(.65,1.3,radius);float shape=smoothstep(-.7,.6,n);vec3 red=mix(vec3(.19,.035,.013),vec3(.72,.095,.022),shape);vec3 col=red*(.25+diffuse*.8)+vec3(1.,.55,.33)*spec*.62;col=mix(vec3(.09,.045,.03),col,mask);float shade=smoothstep(-1.4,.5,p.x);col=mix(vec3(.065,.035,.025),col,shade*.92);gl_FragColor=vec4(col,1.);}
 `});const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));let visible=false,time=0,frame=0,last=performance.now(),seed=0;const target=new THREE.Vector2(.65,.4);
 const resize=()=>{const r=container.getBoundingClientRect();renderer.setSize(r.width,r.height,false);uniforms.uResolution.value.set(r.width,r.height);renderer.render(scene,camera);};
 const ro=new ResizeObserver(resize);ro.observe(container);const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});io.observe(container);
 const move=e=>{if(state.calm||e.target.closest?.('button,input,label,a'))return;const r=container.getBoundingClientRect();target.set(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),1-(e.clientY-r.top)/r.height);state.frequency=Math.round(110+target.x*550);};container.addEventListener('pointermove',move);
 const render=now=>{frame=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden||state.calm||state.paused)return;time+=dt;uniforms.uTime.value=time;uniforms.uMouse.value.lerp(target,.05);uniforms.uSeed.value+=(seed-uniforms.uSeed.value)*.025;renderer.render(scene,camera);};resize();container.classList.add('webgl-ready');frame=requestAnimationFrame(render);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();container.classList.remove('webgl-ready');});
 return {setFrequency(frequency){target.x=Math.max(0,Math.min(1,(frequency-110)/550));uniforms.uMouse.value.copy(target);renderer.render(scene,camera);},shuffle(){seed+=2.3;if(state.calm){uniforms.uSeed.value=seed;renderer.render(scene,camera);}},dispose(){cancelAnimationFrame(frame);ro.disconnect();io.disconnect();container.removeEventListener('pointermove',move);renderer.dispose();geometry.dispose();material.dispose();}};
}
