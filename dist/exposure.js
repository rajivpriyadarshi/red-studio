import * as THREE from 'three';

// Reconstruct a single exposure from offset samples. The lightest parts of the
// photograph retain detail, while movement leaves a red emulsion-like trace.
export async function mountExposure(stage) {
  const canvas=stage.querySelector('canvas');
  const pref=matchMedia('(prefers-reduced-motion: reduce)');
  const texture=await new THREE.TextureLoader().loadAsync('assets/directions/figure.webp');
  let renderer;
  try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'}); }
  catch(error){texture.dispose();throw error;}
  renderer.setClearColor(0,0);
  const scene=new THREE.Scene(), camera=new THREE.Camera();
  const uniforms={portrait:{value:texture},uTime:{value:0},uLift:{value:0},uAspect:{value:1.3},uPointer:{value:new THREE.Vector2()},uScroll:{value:0}};
  const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:'varying vec2 uvStage; void main(){uvStage=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 uvStage; uniform sampler2D portrait;
      uniform float uTime,uAspect,uScroll,uLift; uniform vec2 uPointer;
      float exposure(vec2 p){
        float bound=smoothstep(0.,.055,p.x)*smoothstep(0.,.055,1.-p.x)*smoothstep(0.,.035,p.y)*smoothstep(0.,.035,1.-p.y);
        return dot(texture2D(portrait,clamp(p,0.,1.)).rgb,vec3(.30,.52,.18))*bound;
      }
      void main(){
        vec2 uv=uvStage;
        vec2 p=vec2((uv.x-.54)*uAspect*1.36+.5,(uv.y-.5)*.94+.5);
        float slow=sin(uTime*.48);
        float drift=(sin(p.y*8.+uTime*.64)*.008+sin(p.y*24.-uTime*.61)*.002)*(1.+uScroll);
        p.x+=drift+uPointer.x*.018+(p.y-.5)*uPointer.x*.028; p.y+=uPointer.y*.011;
        float opening=1.-smoothstep(0.,1.4,uTime);
        float reach=.118+.032*slow+.13*uScroll+.105*opening+.11*uLift;
        float spread=pow(max(0.,p.y),1.3);
        float behind=exposure(p+vec2(reach*(1.+spread*.65),.011))* .88;
        float far=exposure(p+vec2(reach*(2.05+spread),.023))* .46;
        float front=exposure(p-vec2(reach*.86*(.8+spread),.012))* .71;
        float core=exposure(p),red=exposure(p-vec2(.018+.009*slow,0.)),blue=exposure(p+vec2(.012,0.));
        vec3 c=vec3(1.,.09,.025)*pow(behind,1.1)+vec3(.63,.065,.06)*far+vec3(.91,.16,.06)*front;
        vec3 body=mix(vec3(.23,.033,.059),vec3(.98,.92,.80),pow(core,.86))*core;
        vec3 ink=texture2D(portrait,clamp(p,0.,1.)).rgb;
        float warm=smoothstep(.025,.42,ink.r-ink.b);
        body=mix(body,vec3(1.,.14+.28*ink.g,.035)*max(core,.34),warm*.94);
        c=mix(c,body,clamp(core*1.6,0.,1.));
        c.r+=max(red-core,0.)*.96; c.b+=max(blue-core,0.)*.60;
        float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(127.1,311.7)))*43758.5453)-.5;
        c*=.96+grain*.20;
        float alpha=clamp(max(max(core,behind),max(far,front))*2.,0.,1.);
        gl_FragColor=vec4(c,alpha*smoothstep(0.,.13,uv.x));
      }`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);scene.add(mesh);
  const target=new THREE.Vector2();
  let shown=true,ready=true,raf=0,previous=0;
  function queue(){if(!raf&&ready&&shown&&!document.hidden)raf=requestAnimationFrame(draw);}
  function draw(now){
    raf=0;if(!shown||!ready||document.hidden)return;
    if(!pref.matches){const dt=Math.min(.05,(now-(previous||now))/1000);
      uniforms.uTime.value+=dt;
      const pull=Math.min(1,uniforms.uPointer.value.distanceTo(target)*3.);
      uniforms.uLift.value+=(pull-uniforms.uLift.value)*(1.-Math.exp(-10.*dt));
      uniforms.uPointer.value.lerp(target,1.-Math.exp(-5.*dt));}
    if(pref.matches){uniforms.uTime.value=1.4;uniforms.uLift.value=0;}
    previous=now;renderer.render(scene,camera);stage.classList.add('is-rendered');
    if(!pref.matches)queue();
  }
  function resize(){const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));renderer.setSize(r.width,r.height,false);
    uniforms.uAspect.value=r.width/r.height;queue();}
  const cover=stage.closest('.cover');
  const scrolled=()=>{const r=cover.getBoundingClientRect();uniforms.uScroll.value=pref.matches?0:Math.min(1,Math.max(0,-r.top/r.height));queue();};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const io=new IntersectionObserver(([entry])=>{shown=entry.isIntersecting;if(shown){previous=0;queue();}else{cancelAnimationFrame(raf);raf=0;}});io.observe(cover);
  cover.addEventListener('pointermove',event=>{if(pref.matches||event.pointerType==='touch')return;const r=cover.getBoundingClientRect();target.set((event.clientX-r.left)/r.width-.5,(event.clientY-r.top)/r.height-.5);});
  cover.addEventListener('pointerleave',()=>target.set(0,0));
  window.addEventListener('scroll',scrolled,{passive:true});
  pref.addEventListener('change',()=>{uniforms.uPointer.value.set(0,0);uniforms.uTime.value=0;scrolled();});
  document.addEventListener('visibilitychange',()=>{previous=0;queue();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;stage.classList.remove('is-rendered');});
  canvas.addEventListener('webglcontextrestored',()=>{ready=true;resize();});
  resize();scrolled();
}
