// Selection updates immediately. Samples settle in 480ms; a new input cancels
// the old transition. Reduced motion swaps the examples without movement.
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const isCalm = () => motionQuery.matches;
const gsap = window.gsap;
const desks = [];
for (const desk of document.querySelectorAll('[data-offering-desk]')) {
  const links = [...desk.querySelectorAll('[data-offering]')];
  const examples = [...desk.querySelectorAll('[data-example]')];
  const list = desk.querySelector('.offering-list');
  const requestedService = (hash = location.hash) => examples.find(panel => `#${panel.id}` === hash ||
    (panel.dataset.example === 'sound' && hash === '#motion-sound'))?.dataset.example;
  let active = requestedService() || links[0].dataset.offering;
  let tween;
  desk.classList.add('is-interactive');
  function select(id, animate = true) {
    if (!examples.some(panel => panel.dataset.example === id)) return;
    const changed = active !== id;
    active = id;
    tween?.kill();
    examples.forEach(panel => { panel.hidden = panel.dataset.example !== id; });
    links.forEach(link => {
      if (link.dataset.offering === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (list.scrollWidth > list.clientWidth) {
      const selected = links.find(link => link.dataset.offering === id);
      const left = list.scrollLeft + selected.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth-selected.clientWidth)/2;
      list.scrollTo({left, behavior:animate && !isCalm() ? 'smooth' : 'instant'});
    }
    if (changed) desk.dispatchEvent(new CustomEvent('offering:change', {detail:{id}}));
    const panel = examples.find(example => example.dataset.example === id);
    const pieces = panel.querySelectorAll('.service-sample, .sample-caption');
    gsap?.set(pieces, {clearProps:'clipPath,transform,opacity'});
    if (changed && animate && !isCalm() && gsap) {
      tween = gsap.timeline({defaults:{ease:'power3.out'}})
        .fromTo(pieces[0], {clipPath:'inset(0 0 12% 0)',y:8}, {clipPath:'inset(0 0 0% 0)',y:0,duration:.48,clearProps:'clipPath,transform'})
        .fromTo(pieces[1], {opacity:0,y:6}, {opacity:1,y:0,duration:.30,clearProps:'opacity,transform'},.08);
    }
  }
  let hoverTimer, hoveredLink;
  let lastPointer;
  function cancelHover(){
    clearTimeout(hoverTimer);
    hoveredLink=null;
  }
  list.addEventListener('pointerleave',cancelHover);
  links.forEach(link => {
    link.addEventListener('pointermove', event => {
      if (event.pointerType==='touch') return;
      if (lastPointer && lastPointer.x===event.clientX && lastPointer.y===event.clientY) return;
      lastPointer={x:event.clientX,y:event.clientY};
      if(hoveredLink===link)return;
      cancelHover();
      hoveredLink=link;
      if(active!==link.dataset.offering)hoverTimer=setTimeout(()=>select(link.dataset.offering),85);
    });
    link.addEventListener('focus', () => {
      cancelHover();
      if (active !== link.dataset.offering) select(link.dataset.offering);
    });
    link.addEventListener('click', event => {
      event.preventDefault();
      cancelHover();
      if (active !== link.dataset.offering) select(link.dataset.offering);
      if (matchMedia('(max-width: 760px)').matches) desk.querySelector('.offering-previews').scrollIntoView({block:'nearest', behavior: isCalm()?'instant':'smooth'});
    });
    link.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index = links.indexOf(link);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length-1 : (index+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+links.length)%links.length;
      links[next].focus();
    });
  });
  function followService(hash) {
    const requested = requestedService(hash);
    if (!requested) return;
    select(requested, false);
    const target = document.getElementById(hash.slice(1));
    target.scrollIntoView({behavior:'instant', block:'start'});
  }
  // Native fragment scrolling cannot reliably target a panel while it is hidden.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || desk.contains(link) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!requestedService(link.hash)) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    followService(link.hash);
  });
  select(active, false);
  window.addEventListener('hashchange', () => followService(location.hash));
  desks.push({settle: () => select(active, false)});
}

// The three-note signature is generated locally. No autoplay, audio downloads,
// microphone access or tracking. Every voice has a finite lifetime.
let audioContext;
const demos = [];
const demoVisibility = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) demos.find(d => d.element === entry.target)?.stop();
  });
});
for (const demo of document.querySelectorAll('[data-av-demo]')) {
  const button = demo.querySelector('[data-av-play]');
  const status = demo.querySelector('.av-status');
  const stamp = demo.querySelector('.av-timestamp');
  let playing = false, generation = 0, finishTimer, animation;
  let voices = [];
  function stop(message = 'Sound starts when you press play.') {
    generation++;
    clearTimeout(finishTimer);
    animation?.kill();
    voices.forEach(voice => { try { voice.stop(); } catch {} });
    voices = [];
    playing = false;
    demo.classList.remove('is-playing');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span aria-hidden="true">▶</span> Play sound example';
    stamp.textContent = '00:00 / 00:03';
    gsap?.set(demo.querySelectorAll('.av-mark>span,.av-waves i'), {clearProps:'transform,opacity,visibility'});
    status.textContent = message;
  }
  button.addEventListener('click', async () => {
    if (playing) { stop('Stopped. Play again whenever you like.'); return; }
    const token = ++generation;
    playing = true;
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = '<span aria-hidden="true">■</span> Stop playback';
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('unsupported');
      audioContext ||= new Audio();
      if (audioContext.state !== 'running') await audioContext.resume();
      if (token !== generation) return;
      if (audioContext.state !== 'running') throw new Error('blocked');
      const start = audioContext.currentTime + .04;
      [261.63, 392, 523.25].forEach((frequency, i) => {
        const voice = audioContext.createOscillator();
        const gain = audioContext.createGain();
        voice.type = 'sine'; voice.frequency.value = frequency;
        const at = start + i * .48;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(.13, at + .025);
        gain.gain.exponentialRampToValueAtTime(.001, at + 1.15);
        voice.connect(gain); gain.connect(audioContext.destination);
        voice.start(at); voice.stop(at + 1.2);
        voice.onended = () => { voice.disconnect(); gain.disconnect(); };
        voices.push(voice);
      });
      demo.classList.add('is-playing');
      status.textContent = 'Playing a three-note sound signature.';
      stamp.textContent = 'PLAYING / 00:03';
      if (gsap && !isCalm()) {
        const bars = demo.querySelectorAll('.av-waves i');
        const title = demo.querySelector('.av-mark>span');
        animation = gsap.timeline();
        for(let beat=0;beat<3;beat++){
          const at=.04+beat*.48;
          animation.fromTo(bars,{scaleY:.19},{scaleY:1,duration:.11,stagger:{amount:.12,from:'center'},ease:'power2.out'},at)
            .to(bars,{scaleY:.32,duration:.24,ease:'sine.out'},at+.22)
            .fromTo(title,{scale:.97},{scale:1,duration:.42,ease:'power3.out'},at);
        }
      }
      finishTimer = setTimeout(() => stop('A short, recognisable sound. Play it again.'), 3000);
    } catch {
      stop('Audio couldn’t start in this browser. You can try again.');
    }
  });
  demo.closest('[data-offering-desk]')?.addEventListener('offering:change', event => {
    if (event.detail.id !== demo.closest('[data-example]')?.dataset.example) stop();
  });
  demos.push({element:demo, stop, calm: () => {animation?.kill();gsap?.set(demo.querySelectorAll('.av-mark>span,.av-waves i'),{clearProps:'transform,opacity,visibility'});}});
  demoVisibility.observe(demo);
}
function settleMotion() { if (isCalm()) { desks.forEach(d => d.settle()); demos.forEach(d => d.calm()); } }
motionQuery.addEventListener('change', settleMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden) demos.forEach(d => d.stop()); });
window.addEventListener('pagehide', () => { desks.forEach(d => d.settle()); demos.forEach(d => d.stop()); demoVisibility.disconnect(); motionQuery.removeEventListener('change',settleMotion); });
window.addEventListener('pageshow', event => { if(event.persisted) { demos.forEach(d => demoVisibility.observe(d.element)); motionQuery.addEventListener('change',settleMotion);settleMotion(); } });

for(const slider of document.querySelectorAll('.grade-control')){
  slider.addEventListener('input',()=>{
    slider.closest('.sample-video').style.setProperty('--split',slider.value+'%');
  });
}
