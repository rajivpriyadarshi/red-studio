import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// Motion contract: strip → knot (1.8s); gentle parallax;
// scroll → continuous unspooling → audience shape; selection → 1.05s morph.
// Every shape shares one topology, material and renderer. Retargets start at
// the current vertices. Calm mode switches directly, without travel or inertia.
const SEGMENTS = 220, SIDES = 16, RINGS = SEGMENTS + 1;
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const mix = (a, b, t) => a + (b - a) * t;
const v3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const shapeIds = ['everyone', 'researchers', 'engineers', 'businesses', 'artists'];

function ribbonShape(id) {
  let points = [], width = .29, thickness = .055, tilt = new THREE.Euler(.20, -.15, -.12);
  if (id === 'everyone') {
    for (let i = 0; i <= 180; i++) {
      const t = .16 + i / 180 * (Math.PI * 2 - .39);
      points.push(v3((Math.sin(t) + 2 * Math.sin(2*t))*.58,
        (Math.cos(t) - 2 * Math.cos(2*t))*.58, -Math.sin(3*t)*.67));
    }
    width = .32; tilt.set(.48,.18,-.28);
  } else if (id === 'researchers') {
    points = [v3(-1.7,-1.05,-.12),v3(-1.1,-1.1,.15),v3(.35,-.6,.5),v3(1.25,.25,.1),
      v3(.45,1.05,-.3),v3(-.75,.75,-.1),v3(-1.1,.05,.3),v3(.1,-.15,.8),v3(1.65,.95,.4)];
    width = .25; tilt.set(.1,-.12,-.1);
  } else if (id === 'engineers') {
    points = [v3(-1.5,-1.15,.35),v3(-1.5,1.15,.35),v3(.55,1.15,.35),v3(.55,-.25,.35),
      v3(-.55,-.25,.35),v3(-.55,.25,-.65),v3(1.5,.25,-.65),v3(1.5,-1.15,-.65),v3(-.5,-1.15,-.65)];
    width = .24; tilt.set(.24,-.30,-.1);
  } else if (id === 'businesses') {
    points = [v3(-.95,-1.45),v3(-.95,.25),v3(-.95,1.35),v3(.15,1.35),v3(.95,.95),
      v3(.95,.4),v3(.3,.08),v3(-.65,.08,.08),v3(-.15,-.35,.2),v3(1.05,-1.45,.2)];
    width = .27; tilt.set(.12,-.2,-.12);
  } else {
    for (let i = 0; i <= 100; i++) {
      const u = i/100;
      points.push(v3((u-.5)*4, Math.sin(u*Math.PI*5)*Math.sin(u*Math.PI)*.95,
        Math.cos(u*Math.PI*5)*.25));
    }
    width = .19; thickness = .045; tilt.set(.12,-.15,-.08);
  }
  const curve = new THREE.CatmullRomCurve3(points,false,'centripetal');
  const centers = curve.getSpacedPoints(SEGMENTS);
  const frames = curve.computeFrenetFrames(SEGMENTS,false);
  const rotation = new THREE.Matrix4().makeRotationFromEuler(tilt);
  const vertices = new Float32Array((RINGS * SIDES + 2) * 3);
  const profile = [];
  // Rounded rectangle cross-section: a broad flat face and four soft bevels.
  const radius = .028;
  for (let corner=0;corner<4;corner++) {
    const cx = (corner===0 || corner===3 ? 1 : -1)*(width-radius);
    const cy = (corner<2 ? 1 : -1)*(thickness-radius);
    for (let step=0;step<4;step++) {
      const angle = corner*Math.PI/2 + step/3*Math.PI/2;
      profile.push([cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius]);
    }
  }
  const normal = new THREE.Vector3(), binormal = new THREE.Vector3(), point = new THREE.Vector3();
  for (let i=0;i<RINGS;i++) {
    const u=i/SEGMENTS, tangent=curve.getTangentAt(u);
    // Flat forms face the reader; the knot uses transported frames for depth.
    if (id==='everyone') {
      normal.copy(frames.normals[i]); binormal.copy(frames.binormals[i]);
    } else {
      normal.set(-tangent.y,tangent.x,0).normalize();
      if (normal.lengthSq()<.01) normal.set(0,1,0);
      binormal.crossVectors(tangent,normal).normalize();
    }
    const roll=id==='everyone' ? Math.sin(u*Math.PI*2)*.24 : Math.sin(u*Math.PI*2)*.16;
    for(let j=0;j<SIDES;j++) {
      const [px,py]=profile[j];
      const nx=px*Math.cos(roll)-py*Math.sin(roll),ny=px*Math.sin(roll)+py*Math.cos(roll);
      point.copy(centers[i]).addScaledVector(normal,nx).addScaledVector(binormal,ny).applyMatrix4(rotation);
      point.toArray(vertices,(i*SIDES+j)*3);
    }
  }
  centers[0].clone().applyMatrix4(rotation).toArray(vertices,RINGS*SIDES*3);
  centers[SEGMENTS].clone().applyMatrix4(rotation).toArray(vertices,(RINGS*SIDES+1)*3);
  return {vertices,profile};
}

export function createSculpture(container,canvas,state) {
  const dock=document.querySelector('[data-ribbon-dock]');
  const root=document.querySelector('[data-personas]');
  if(!dock || !root) return ()=>{};
  const gsap=window.gsap, ScrollTrigger=window.ScrollTrigger;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-1,1,1,-1,1,3000);
  camera.position.z=1000;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0x792b15,.7));
  const key=new THREE.DirectionalLight(0xffe4d1,2);key.position.set(-300,500,400);scene.add(key);
  const rim=new THREE.DirectionalLight(0xffffff,1.6);rim.position.set(400,-200,100);scene.add(rim);
  const material=new THREE.MeshPhysicalMaterial({color:0xb81c08,metalness:.78,roughness:.23,
    clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.15,side:THREE.DoubleSide});
  const shapes=Object.fromEntries(shapeIds.map(id=>[id,ribbonShape(id)]));
  const knot=shapes.everyone.vertices, count=knot.length/3;
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(knot.length);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const indices=[];
  for(let i=0;i<SEGMENTS;i++) for(let j=0;j<SIDES;j++) {
    const a=i*SIDES+j,b=i*SIDES+(j+1)%SIDES,c=a+SIDES,d=b+SIDES;
    indices.push(a,c,b,b,c,d);
  }
  for(let j=0;j<SIDES;j++) {
    indices.push(RINGS*SIDES,(j+1)%SIDES,j);
    indices.push(RINGS*SIDES+1,SEGMENTS*SIDES+j,SEGMENTS*SIDES+(j+1)%SIDES);
  }
  geometry.setIndex(indices); geometry.boundingSphere=new THREE.Sphere(v3(0,0),5000);
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
  const layer=document.createElement('div');layer.className='ribbon-layer';layer.setAttribute('aria-hidden','true');
  canvas.parentNode.insertBefore(document.createComment('The same ribbon canvas follows both layout anchors.'),canvas);
  layer.append(canvas);document.body.append(layer);
  let active=root.dataset.activePersona || 'everyone';
  let from=shapes[active].vertices.slice(),to=shapes[active].vertices,current=from.slice();
  const motion={intro:1,morph:1,travel:0};
  const pointer={x:0,y:0,tx:0,ty:0};
  const abort=new AbortController(),opts={signal:abort.signal};
  let source,destination,sectionTop=0,width=innerWidth,height=innerHeight,frame,last=performance.now();
  let dirty=true,visible=true,disposed=false,lost=false,oldCalm=state.calm;
  let introTween,morphTween,travelTrigger;
  let lastScroll=scrollY,lastTravel=-1,travelGoal=0;
  const profile=shapes.everyone.profile;
  const docRect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top+scrollY,width:r.width,height:r.height};};
  const measure=()=>{source=docRect(container);destination=docRect(dock);sectionTop=docRect(root.closest('section')).top;dirty=true;};
  const resize=()=>{
    width=innerWidth;height=innerHeight;
    renderer.setSize(width,height,false);
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    measure();
  };
  resize();
  const resizeObserver=new ResizeObserver(()=>{measure();travelTrigger?.refresh();});
  resizeObserver.observe(container);resizeObserver.observe(dock);
  const intersection=new IntersectionObserver(entries=>{
    for(const entry of entries) if(entry.target===document.querySelector('main')) visible=entry.isIntersecting;
  });intersection.observe(document.querySelector('main'));
  const travelStart=()=>Math.max(0,source.top+source.height*.12);
  const travelEnd=()=>Math.max(travelStart()+180,sectionTop-40);
  if(ScrollTrigger) travelTrigger=ScrollTrigger.create({start:travelStart,end:travelEnd,
    onRefresh:()=>{measure();dirty=true;},onUpdate:self=>{travelGoal=self.progress;dirty=true;}});
  else travelGoal=clamp((scrollY-travelStart())/(travelEnd()-travelStart()));
  motion.travel=travelGoal;

  function selectPersona(event) {
    const next=event.detail?.id || root.dataset.activePersona || 'everyone';
    if(!shapes[next] || next===active) return;
    morphTween?.kill();
    from=current.slice();to=shapes[next].vertices;active=next;motion.morph=0;
    dirty=true;
    if(state.calm || !gsap || event.detail?.animate===false) {motion.morph=1;current.set(to);}
    else morphTween=gsap.to(motion,{morph:1,duration:1.05,ease:'power3.inOut',onUpdate:()=>{dirty=true;}});
  }
  function finishIntro() {introTween?.kill();motion.intro=1;dirty=true;}
  container.addEventListener('pointermove', event => {
    if (state.calm || event.pointerType === 'touch') return;
    const rect = container.getBoundingClientRect();
    pointer.tx = clamp((event.clientX-rect.left)/rect.width-.5, -.5, .5);
    pointer.ty = clamp((event.clientY-rect.top)/rect.height-.5, -.5, .5);
    dirty = true;
  }, opts);
  container.addEventListener('pointerleave', () => {pointer.tx=pointer.ty=0;dirty=true;}, opts);
  root.addEventListener('persona:change',selectPersona,opts);
  window.addEventListener('resize',resize,opts);
  window.addEventListener('scroll',()=>{dirty=true;if(!ScrollTrigger)travelGoal=clamp((scrollY-travelStart())/(travelEnd()-travelStart()));},{...opts,passive:true});
  window.addEventListener('pagehide',()=>{introTween?.pause();morphTween?.pause();},opts);
  window.addEventListener('pageshow',event=>{if(event.persisted){resize();finishIntro();morphTween?.progress(1);dirty=true;}},opts);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();dirty=true;}},opts);
  const contextLost=event=>{event.preventDefault();lost=true;layer.hidden=true;container.classList.remove('webgl-ready');document.body.classList.remove('ribbon-ready');};
  const contextRestored=()=>{lost=false;dirty=true;resize();container.classList.add('webgl-ready');document.body.classList.add('ribbon-ready');};
  canvas.addEventListener('webglcontextlost',contextLost,opts);canvas.addEventListener('webglcontextrestored',contextRestored,opts);
  document.fonts.ready.then(()=>{if(!disposed){measure();travelTrigger?.refresh();}});
  const startsAtHero=scrollY<source.top+source.height*.25;
  if(!state.calm && startsAtHero && gsap) {
    motion.intro=0;
    introTween=gsap.to(motion,{intro:1,duration:1.8,delay:.15,ease:'power2.inOut',onUpdate:()=>{dirty=true;},onComplete:()=>{dirty=true;}});
  }
  container.classList.add('webgl-ready');document.body.classList.add('ribbon-ready');

  function render(now) {
    if(disposed)return;frame=requestAnimationFrame(render);
    const dt=Math.min((now-last)/1000,.032);last=now;
    if(oldCalm!==state.calm) {
      oldCalm=state.calm;
      if(state.calm){
        finishIntro();morphTween?.kill();motion.morph=1;current.set(to);
        pointer.tx=pointer.ty=pointer.x=pointer.y=0;
      }
      dirty=true;
    }
    if(lost || document.hidden || state.paused || !visible)return;
    if(lastScroll!==scrollY){lastScroll=scrollY;dirty=true;}
    const chapterVisible=source.top+source.height>scrollY-100 || destination.top+destination.height>scrollY-100;
    if(!chapterVisible){layer.hidden=true;return;}
    if(layer.hidden){layer.hidden=false;dirty=true;}
    const amount=1-Math.exp(-dt*12);
    motion.travel=state.calm?travelGoal:mix(motion.travel,travelGoal,amount);
    if(Math.abs(motion.travel-travelGoal)<.0001)motion.travel=travelGoal;
    if(lastTravel!==motion.travel){lastTravel=motion.travel;dirty=true;}
    if(!state.calm){
      if(Math.abs(pointer.x-pointer.tx)+Math.abs(pointer.y-pointer.ty)>.001){pointer.x=mix(pointer.x,pointer.tx,amount*.6);pointer.y=mix(pointer.y,pointer.ty,amount*.6);dirty=true;}
    }
    if(!dirty && !state.needsRender)return;
    dirty=false;
    const a={x:source.left+source.width*.5-width/2,y:height/2-(source.top-scrollY+source.height*.5)};
    const b={x:destination.left+destination.width*.5-width/2,y:height/2-(destination.top-scrollY+destination.height*.47)};
    const heroScale=Math.min(source.width/4.65,source.height/4.3);
    const dockScale=Math.min(destination.width/4.7,destination.height/3.75);
    let travel=motion.travel;
    if(state.calm)travel=scrollY>(source.top+source.height*.7)?1:0;
    const heroToLine=smooth(travel*2),lineToDock=smooth(travel*2-1);
    const yaw=state.calm?0:pointer.x*.22,pitch=state.calm?0:pointer.y*.12;
    const bridgeDy=b.y-a.y;
    // Run the travelling strand through the page gutter, away from the copy.
    const routeX=u=>mix(mix(a.x,b.x,u),width/2-13,
      Math.min(smooth(u/.14),smooth((1-u)/.16)));
    for(let i=0;i<count;i++) {
      const k=i*3,u=i>=RINGS*SIDES?(i===RINGS*SIDES?0:1):Math.floor(i/SIDES)/SEGMENTS;
      const profilePoint=i>=RINGS*SIDES?[0,0]:profile[i%SIDES];
      // Entrance folds progressively from the tail. Every vertex remains present.
      const fold=smooth(motion.intro*1.35-(1-u)*.35);
      let hx=mix((u-.5)*4.1,knot[k],fold);
      let hy=mix(profilePoint[0],knot[k+1],fold);
      let hz=mix(profilePoint[1],knot[k+2],fold);
      const rx=hx*Math.cos(yaw)+hz*Math.sin(yaw),rz=hz*Math.cos(yaw)-hx*Math.sin(yaw);
      hx=rx;hz=rz;const ry=hy*Math.cos(pitch)-hz*Math.sin(pitch);hz=hy*Math.sin(pitch)+hz*Math.cos(pitch);hy=ry;
      current[k]=mix(from[k],to[k],motion.morph);
      current[k+1]=mix(from[k+1],to[k+1],motion.morph);
      current[k+2]=mix(from[k+2],to[k+2],motion.morph);
      const arch=Math.sin(Math.PI*u);
      const bx=routeX(u),by=mix(a.y,b.y,u);
      const low=clamp(u-.002),high=clamp(u+.002);
      const tx=(routeX(high)-routeX(low))/(high-low),ty=bridgeDy;
      const len=Math.hypot(tx,ty)||1;
      const lateral=profilePoint[0]*21;
      const lineX=bx-ty/len*lateral,lineY=by+tx/len*lateral,lineZ=profilePoint[1]*21+arch*12;
      let x=mix(a.x+hx*heroScale,lineX,heroToLine),y=mix(a.y+hy*heroScale,lineY,heroToLine),z=mix(hz*heroScale,lineZ,heroToLine);
      x=mix(x,b.x+current[k]*dockScale,lineToDock);
      y=mix(y,b.y+current[k+1]*dockScale,lineToDock);
      z=mix(z,current[k+2]*dockScale+Math.sin(motion.morph*Math.PI)*arch*20,lineToDock);
      positions[k]=x;
      positions[k+1]=y;
      positions[k+2]=z;
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
    renderer.render(scene,camera);state.needsRender=false;
    // Coarse DOM state mirrors the visible canvas for inspection.
    layer.dataset.phase=motion.intro<1?'forming':travel<.02?'hero':travel>.98?'audience':'unspooling';
    layer.dataset.shape=active;
  }
  frame=requestAnimationFrame(render);
  return()=>{
    disposed=true;cancelAnimationFrame(frame);abort.abort();
    introTween?.kill();morphTween?.kill();travelTrigger?.kill();
    resizeObserver.disconnect();intersection.disconnect();renderer.dispose();geometry.dispose();material.dispose();environment.dispose();
    container.append(canvas);layer.remove();container.classList.remove('webgl-ready');document.body.classList.remove('ribbon-ready');
  };
}
