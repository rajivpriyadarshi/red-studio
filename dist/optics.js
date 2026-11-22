import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// The lens is modelled along its optical axis. Each assembly has a rest position
// and a travel distance, so intro and scroll can overlap or reverse at any time.
export function mountOptic(stage) {
  const canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 40);
  camera.position.z = 12;
  const room = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(room, .035);
  scene.environment = environment.texture;
  room.dispose(); generator.dispose();
  const chassis = new THREE.Group();
  const rotor = new THREE.Group();
  scene.add(chassis); chassis.add(rotor);
  const metal = (color, roughness, metalness = .87) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const lacquer = new THREE.MeshPhysicalMaterial({color:0xad1320,roughness:.25,metalness:.8,clearcoat:1,clearcoatRoughness:.16});
  const crimson = metal(0xe32a29,.24), burgundy=metal(0x501122,.28);
  const charcoal=metal(0x202126,.3), rubber=metal(0x131315,.58,.25), steel=metal(0x777b83,.26);
  const bladesMaterial=metal(0x852834,.32);
  const assemblies=[];
  function part(z, travel) {
    const group=new THREE.Group();
    group.position.z=z;rotor.add(group);assemblies.push({group,z,travel});
    return group;
  }
  function profile(group, points, material) {
    const geometry=new THREE.LatheGeometry(points.map(([r,z])=>new THREE.Vector2(r,z)),128);
    geometry.rotateX(Math.PI/2);
    const mesh=new THREE.Mesh(geometry,material);
    group.add(mesh);return mesh;
  }
  function sleeve(group, outer, inner, depth, material, bevel=.035) {
    return profile(group,[[inner,-depth/2],[outer-bevel,-depth/2],[outer,-depth/2+bevel],[outer,depth/2-bevel],[outer-bevel,depth/2],[inner,depth/2],[inner,-depth/2]],material);
  }
  function ring(group,r,t,z,material) {
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,128),material);
    mesh.position.z=z;group.add(mesh);return mesh;
  }
  function ridges(group,radius,length,count,material) {
    const geometry=new THREE.BoxGeometry(.022,.038,length);
    const pins=new THREE.InstancedMesh(geometry,material,count);
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2;
      dummy.position.set(Math.cos(a)*radius,Math.sin(a)*radius,0);
      dummy.rotation.set(0,0,a);dummy.updateMatrix();pins.setMatrixAt(i,dummy.matrix);
    }
    group.add(pins);
  }
  const rear=part(-1.36,-.8);
  sleeve(rear,1.28,.70,.28,steel);ring(rear,1.25,.026,-.12,steel);
  const mount=part(-1.05,-.58);
  sleeve(mount,1.48,.76,.48,charcoal);ridges(mount,1.48,.33,96,rubber);
  const housing=part(-.43,-.14);
  profile(housing,[[.7,-.5],[1.39,-.5],[1.50,-.42],[1.60,-.26],[1.68,.28],[1.78,.40],[1.78,.48],[.74,.48],[.7,-.5]],lacquer);
  for(let i=0;i<4;i++) ring(housing,1.51+i*.023,.013,-.27+i*.085,burgundy);
  const focus=part(.28,.22);
  sleeve(focus,1.84,.88,.52,charcoal);ridges(focus,1.845,.43,180,steel);
  ring(focus,1.83,.017,-.235,steel);ring(focus,1.84,.028,.24,crimson);
  const collar=part(.75,.52);
  sleeve(collar,1.96,.86,.43,lacquer,.055);
  ring(collar,1.925,.024,-.20,steel);
  const front=part(1.06,.95);
  sleeve(front,2.02,1.65,.21,charcoal);
  ring(front,1.995,.024,.102,steel);ring(front,1.675,.025,.106,crimson);

  // The lettering and scale are printed onto the face of the actual part.
  function faceplate() {
    const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=1536;
    const c=textureCanvas.getContext('2d'),mid=768;
    c.translate(mid,mid);c.fillStyle='#242226';c.fillRect(-mid,-mid,1536,1536);
    for(let i=0;i<300;i++){
      c.save();c.rotate(i*Math.PI/150);c.fillStyle=i%5?'#645b60':'#ded2c9';
      c.fillRect(-1,-744, i%5?1.1:2,i%5?6:12);c.restore();
    }
    function arc(text, center, radius, size, tracking){
      c.font='500 '+size+'px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e7ded2';
      const advances=[...text].map(ch=>c.measureText(ch).width+tracking);
      let a=center-advances.reduce((sum,w)=>sum+w,0)/radius/2;
      [...text].forEach((ch,i)=>{
        const step=advances[i]/radius;c.save();c.rotate(a+step/2);c.fillText(ch,0,-radius);c.restore();a+=step;
      });
    }
    arc('THE RED STUDIO',-.33,698,31,6);arc('TRONDHEIM',2.18,697,24,6);arc('35 mm  /  1:1.4',4.36,698,26,4);
    const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const g=new THREE.RingGeometry(1.675,1.987,160);
    const pos=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<pos.count;i++) uv.setXY(i,.5+pos.getX(i)/4,.5+pos.getY(i)/4);
    const face=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:texture,roughness:.43,metalness:.38}));
    face.position.z=.108;front.add(face);
  }
  faceplate();
  const diaphragm=part(.85,.62);
  profile(diaphragm,[[.60,-.52],[1.2,-.21],[1.66,.04],[1.65,.19],[1.60,.22],[1.49,.13],[.68,-.19],[.60,-.52]],burgundy);
  for(let i=0;i<6;i++) ring(diaphragm,1.06+i*.104,.012,-.03+i*.036,charcoal);
  const vanes=[];
  const count=13;
  let bladePositions=[],bladeIndices=[];
  for(let j=0;j<=32;j++){
    const u=j/32, r=.64+u*.98, angle=.86*(1-u)**1.35;
    for(let k=0;k<3;k++){
      const a=angle+(k/2)*Math.PI*2/count*1.18;
      bladePositions.push(Math.cos(a)*r,Math.sin(a)*r,-.18+u*.37+(k===1?.037:0));
    }
    if(j<32)for(let k=0;k<2;k++){const n=j*3+k;bladeIndices.push(n,n+3,n+1,n+1,n+3,n+4);}
  }
  const bladeGeometry=new THREE.BufferGeometry();bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bladePositions,3));bladeGeometry.setIndex(bladeIndices);bladeGeometry.computeVertexNormals();
  for(let i=0;i<count;i++){const blade=new THREE.Mesh(bladeGeometry,i%3===0?lacquer:bladesMaterial);blade.rotation.z=i*2*Math.PI/count;diaphragm.add(blade);vanes.push(blade);}
  const glassGroup=part(.39,.30);
  const glass=new THREE.ShaderMaterial({
    uniforms:{uAngle:{value:0}},
    vertexShader:'varying vec2 v;void main(){v=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec2 v; uniform float uAngle;
      void main(){
        vec2 p=v;float r=length(p);if(r>1.)discard;
        vec3 col=mix(vec3(.023,.011,.03),vec3(.19,.034,.07),pow(r,2.4));
        col+=vec3(.11,.035,.13)*(0.5+0.5*cos(r*31.+p.x*2.))*pow(r,2.);
        float band=exp(-pow((p.y+.54+sin(p.x*1.4+uAngle)*.13)*8.,2.))*exp(-pow((p.x+.28)*1.55,2.));
        col+=vec3(.23,.15,.26)*band;
        col+=vec3(.60,.44,.34)*exp(-length((p-vec2(-.24,-.43))*vec2(6.,18.)));
        col+=vec3(.08,.30,.30)*exp(-length((p-vec2(.23,.42))*vec2(3.,15.)));
        gl_FragColor=vec4(col,1.);
      }`});
  const glassDisk=new THREE.Mesh(new THREE.PlaneGeometry(1.82,1.82),glass);glassGroup.add(glassDisk);
  ring(glassGroup,.88,.02,.015,steel);
  const light=(color,power,x,y,z)=>{const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);};
  light(0xffe6d2,3,-4,5,6);light(0xf92736,4,4,-1,1);light(0xc7cfef,2,1,3,-3);
  const pref=matchMedia('(prefers-reduced-motion: reduce)');
  let progress=0,aimX=0,aimY=0,x=0,y=0,raf=0,visible=true,lost=false,last=0,time=0;
  const motion={open:pref.matches?0:1};
  const entrance=window.gsap?.to(motion,{open:0,duration:1.8,delay:.08,ease:'power3.inOut',onUpdate:schedule});
  if(!entrance)motion.open=0;
  function setSize(){
    const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(width,height,false);
    const half=Math.max(2.39,2.61*height/width);
    camera.left=-half*width/height;camera.right=-camera.left;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();schedule();
  }
  function schedule(){if(!raf&&visible&&!document.hidden&&!lost)raf=requestAnimationFrame(draw);}
  function draw(now){
    raf=0;if(!visible||document.hidden||lost)return;
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!pref.matches)time+=dt;
    const blend=1-Math.exp(-dt*7);
    x+=(aimX-x)*blend;y+=(aimY-y)*blend;
    const scroll=pref.matches?0:progress, open=pref.matches?0:motion.open;
    chassis.rotation.set(.33+Math.sin(time*.24)*.045+y*.105+scroll*.12,-.61+Math.sin(time*.20)*.085+x*.14-scroll*.68+open*.32,-.29+scroll*.22);
    chassis.position.set(0,.03+Math.sin(time*.42)*.04,0);
    for(const item of assemblies)item.group.position.z=item.z+item.travel*(open*1.05+scroll*1.9);
    rotor.rotation.z=-.21+scroll*.63+open*.52;
    vanes.forEach((v,i)=>{v.rotation.z=i*2*Math.PI/count+open*.85+scroll*.65;});
    glass.uniforms.uAngle.value=x*.3+scroll;
    renderer.render(scene,camera);stage.classList.add('optic-ready');
    if(!pref.matches)schedule();
  }
  const bounds=new ResizeObserver(setSize);bounds.observe(stage);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){last=0;schedule();}else{cancelAnimationFrame(raf);raf=0;}});
  observer.observe(stage);
  const updateScroll=()=>{const rect=stage.getBoundingClientRect();if(!rect.height)return;progress=Math.min(1,Math.max(0,-rect.top/rect.height));schedule();};
  window.addEventListener('scroll',updateScroll,{passive:true});
  stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||pref.matches)return;const r=stage.getBoundingClientRect();aimX=(e.clientX-r.left)/r.width-.5;aimY=(e.clientY-r.top)/r.height-.5;schedule();});
  stage.addEventListener('pointerleave',()=>{aimX=aimY=0;});
  document.addEventListener('visibilitychange',()=>{last=0;schedule();});
  pref.addEventListener('change',()=>{if(pref.matches){entrance?.progress(1);time=x=y=aimX=aimY=0;}schedule();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stage.classList.remove('optic-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;schedule();});
  setSize();updateScroll();
}
