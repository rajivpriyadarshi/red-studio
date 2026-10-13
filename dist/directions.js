const gsap = window.gsap;
document.querySelectorAll('[data-direction-gallery]').forEach(initDirections);

function initDirections(root) {
  const frames = [...root.querySelectorAll('[data-direction-frame]')];
  const scenes = [...root.querySelectorAll('[data-direction-scene]')];
  const rail = root.querySelector('.direction-rail');
  const track = root.querySelector('.direction-track');
  const backgrounds = root.querySelector('.direction-backgrounds');
  const editorial = root.querySelector('.direction-editorial');
  const title = root.querySelector('[data-direction-title]');
  const description = root.querySelector('[data-direction-copy]');
  const category = root.querySelector('[data-direction-category]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(), options = { signal: events.signal };
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const wrap = i => (i + frames.length) % frames.length;
  const calm = () => preference.matches || document.body.classList.contains('motion-paused');
  let active = Number(root.dataset.active), railIndex = active, frameWidth = 0, gap = 0, railWidth = 0;
  let railTween, copyTimeline, hoverTimer, drag, dragFrame = 0;
  let suppressClickUntil = 0, settlingUntil = 0, generation = 0, wheelSum = 0, lastWheel = 0;
  const targetX = () => railWidth * .5 - (railIndex * (frameWidth + gap) + frameWidth * .5);

  function set(el, vars) {
    if (gsap) gsap.set(el, vars);
    else Object.entries(vars).forEach(([key,value]) => {
      if (key === 'x') el.style.transform = 'translateX(' + value + 'px)';
      else el.style[key] = value;
    });
  }
  function tween(el, vars) {
    if (gsap && !calm()) return gsap.to(el, { duration: .65, ease: 'power3.out', overwrite: 'auto', ...vars });
    const { duration, ease, overwrite, ...styles } = vars;
    set(el, styles);
  }
  function updateCopy() {
    const data = frames[active].dataset;
    title.replaceChildren(...data.title.split('\n').flatMap((line,i) => i ? [document.createElement('br'),document.createTextNode(line)] : [document.createTextNode(line)]));
    description.textContent = data.copy;
    category.textContent = data.category;
    const link = root.querySelector('[data-direction-service]');
    link.href = data.link;
    const credit = root.querySelector('[data-direction-credit]');
    credit.href = data.source;
    credit.textContent = data.credit + ' ↗';
  }
  function updateMeaning(announce) {
    root.dataset.active = active;
    frames.forEach((frame,i) => {
      frame.setAttribute('aria-pressed', String(i === active));
      frame.tabIndex = i === active ? 0 : -1;
    });
    root.querySelector('[data-direction-count]').textContent = String(active + 1).padStart(2,'0');
    if (announce) root.querySelector('[data-direction-announcement]').textContent = frames[active].getAttribute('aria-label') + '. ' + (active + 1) + ' of ' + frames.length + '.';
  }
  function render(animate = true, announce = false, recenter = true) {
    const token = ++generation;
    const immediate = !animate || calm() || !gsap;
    copyTimeline?.kill();
    gsap?.killTweensOf(frames);
    gsap?.killTweensOf(scenes);
    updateMeaning(announce);
    frames.forEach((frame,i) => {
      const vars = { clipPath: 'inset(0 0 ' + (i === active ? 0 : 50) + '% 0)' };
      immediate ? set(frame,vars) : tween(frame,{ ...vars,duration:.5 });
    });
    scenes.forEach((scene,i) => {
      const vars = { opacity: i === active ? 1 : 0 };
      immediate ? set(scene,vars) : tween(scene,{ ...vars,duration:.8,ease:'power2.inOut' });
    });
    const progress = root.querySelector('.direction-progress i');
    const progressX = root.querySelector('.direction-progress').clientWidth * active / frames.length;
    immediate ? set(progress,{x:progressX}) : tween(progress,{x:progressX,duration:.5});
    if (recenter) {
      railTween?.kill();
      settlingUntil = performance.now() + (immediate ? 100 : 750);
      immediate ? set(track,{x:targetX()}) : railTween = tween(track,{x:targetX(),duration:.7});
    }
    if (immediate) { updateCopy(); gsap?.set(editorial,{opacity:1,y:0}); }
    else copyTimeline = gsap.timeline()
      .to(editorial,{opacity:0,y:-6,duration:.12,ease:'power1.out'})
      .call(() => { if (token === generation) updateCopy(); })
      .set(editorial,{y:10})
      .to(editorial,{opacity:1,y:0,duration:.45,ease:'power3.out'});
  }
  function resetDrag(animate = true) {
    if (drag && rail.hasPointerCapture(drag.id)) rail.releasePointerCapture(drag.id);
    drag = undefined;
    cancelAnimationFrame(dragFrame);dragFrame = 0;
    rail.classList.remove('is-dragging');
    railTween?.kill();
    if (animate) railTween = tween(track,{x:targetX(),duration:.45});
    else set(track,{x:targetX()});
  }
  function select(i, recenter = true, keyboard = false) {
    clearTimeout(hoverTimer);
    i = wrap(i);
    const changed = i !== active;
    active = i;
    if (recenter) railIndex = active;
    if (changed || recenter) render(true,changed,recenter);
    if (keyboard) frames[active].focus({preventScroll:true});
  }
  function measure() {
    const w = frames[0].offsetWidth, rw = rail.clientWidth;
    if (w === frameWidth && rw === railWidth) return;
    frameWidth = w;railWidth = rw;gap = parseFloat(getComputedStyle(track).gap) || 0;
    railIndex = active;resetDrag(false);render(false);
  }
  frames.forEach((frame,i) => {
    frame.addEventListener('pointerenter',event => {
      if (event.pointerType !== 'mouse' || drag || performance.now() < settlingUntil) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => select(i,false),55);
    },options);
    frame.addEventListener('pointerleave',() => clearTimeout(hoverTimer),options);
    frame.addEventListener('focus',() => { if (!drag) select(i,false); },options);
    frame.addEventListener('click',event => {
      if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
      select(i,true);
    },options);
  });
  root.querySelector('[data-direction-prev]').addEventListener('click',() => select(active-1),options);
  root.querySelector('[data-direction-next]').addEventListener('click',() => select(active+1),options);
  root.addEventListener('keydown',event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.target.matches('input,textarea,select')) return;
    const targets = { ArrowLeft: active-1,ArrowRight:active+1,Home:0,End:frames.length-1 };
    if (!(event.key in targets)) return;
    event.preventDefault();select(targets[event.key],true,Boolean(event.target.closest('.direction-rail')));
  },options);
  rail.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    clearTimeout(hoverTimer);
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,engaged:false,anchor:gsap ? Number(gsap.getProperty(track,'x')) : targetX()};
  },options);
  rail.addEventListener('pointermove',event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (event.pointerType === 'mouse' && !event.buttons) { resetDrag();return; }
    const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
    if (!drag.engaged) {
      if (Math.abs(dy)>12 && Math.abs(dy)>Math.abs(dx)) { drag=undefined;return; }
      if (Math.abs(dx)<12 || Math.abs(dx)<Math.abs(dy)*1.2) return;
      drag.engaged=true;rail.setPointerCapture(event.pointerId);
      rail.classList.add('is-dragging');railTween?.kill();
    }
    event.preventDefault();drag.dx=dx;
    if (!dragFrame && !calm()) dragFrame=requestAnimationFrame(() => {
      dragFrame=0;if(drag)set(track,{x:drag.anchor+clamp(drag.dx*.65,-180,180)});
    });
  },{...options,passive:false});
  rail.addEventListener('pointerup',event => {
    if (!drag || drag.id !== event.pointerId) return;
    const {dx,engaged}=drag;
    if (!engaged) {drag=undefined;return;}
    suppressClickUntil=performance.now()+300;
    resetDrag();rail.focus({preventScroll:true});
    if (Math.abs(dx)>38) select(active+(dx<0?1:-1));
  },options);
  rail.addEventListener('pointercancel',() => resetDrag(),options);
  rail.addEventListener('pointerleave',() => { if(drag&&!drag.engaged)drag=undefined; },options);
  rail.addEventListener('wheel',event => {
    if(event.ctrlKey || Math.abs(event.deltaX)<Math.abs(event.deltaY) || Math.abs(event.deltaX)<2)return;
    event.preventDefault();clearTimeout(hoverTimer);
    if(performance.now()-lastWheel<400)return;
    wheelSum+=event.deltaX;
    if(Math.abs(wheelSum)>35){select(active+(wheelSum>0?1:-1));wheelSum=0;lastWheel=performance.now();}
  },{...options,passive:false});
  const panX = gsap?.quickTo(backgrounds,'x',{duration:.9,ease:'power3.out'});
  const panY = gsap?.quickTo(backgrounds,'y',{duration:.9,ease:'power3.out'});
  root.addEventListener('pointermove',event => {
    if(calm() || drag || event.pointerType!=='mouse')return;
    const r=root.getBoundingClientRect();
    panX?.(((event.clientX-r.left)/r.width-.5)*18);
    panY?.(((event.clientY-r.top)/r.height-.5)*14);
  },options);
  root.addEventListener('pointerleave',() => {clearTimeout(hoverTimer);panX?.(0);panY?.(0);},options);
  const resize = new ResizeObserver(measure);resize.observe(rail);measure();
  let lastCalm=calm();
  function motionChanged(){
    if(lastCalm===calm())return;lastCalm=calm();
    clearTimeout(hoverTimer);resetDrag(false);
    gsap?.killTweensOf(backgrounds);set(backgrounds,{x:0,y:0});render(false);
  }
  preference.addEventListener('change',motionChanged);
  const bodyObserver=new MutationObserver(motionChanged);
  bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pagehide',event => {
    clearTimeout(hoverTimer);resetDrag(false);render(false);gsap?.killTweensOf(backgrounds);
    if(event.persisted)return;
    resize.disconnect();bodyObserver.disconnect();preference.removeEventListener('change',motionChanged);events.abort();
  },options);
  window.addEventListener('pageshow',event => {if(event.persisted){measure();render(false);}},options);
}

