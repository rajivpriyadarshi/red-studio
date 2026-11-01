// Selection updates immediately. Samples settle in 480ms; a new input cancels
// the old transition. Reduced motion swaps the examples without movement.
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const isCalm = () => motionQuery.matches || document.body.classList.contains('motion-paused');
const gsap = window.gsap;
const desks = [];
for (const desk of document.querySelectorAll('[data-offering-desk]')) {
  const links = [...desk.querySelectorAll('[data-offering]')];
  const examples = [...desk.querySelectorAll('[data-example]')];
  let active = links[0].dataset.offering;
  let tween;
  desk.classList.add('is-interactive');
  function select(id, animate = true) {
    if (!examples.some(panel => panel.dataset.example === id)) return;
    active = id;
    tween?.kill();
    examples.forEach(panel => { panel.hidden = panel.dataset.example !== id; });
    links.forEach(link => {
      if (link.dataset.offering === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    const pieces = desk.querySelector(`[data-example="${id}"]`).querySelectorAll('.example-piece');
    gsap?.set(pieces, {clearProps: 'transform,opacity,visibility'});
    if (animate && !isCalm() && gsap) {
      tween = gsap.from(pieces, {y: 32, rotation: -7, scale: .92, autoAlpha: 0,
        stagger: .045, duration: .48, ease: 'power3.out', clearProps: 'transform,opacity,visibility'});
    }
  }
  links.forEach(link => {
    link.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && active !== link.dataset.offering) select(link.dataset.offering);
    });
    link.addEventListener('focus', () => { if (active !== link.dataset.offering) select(link.dataset.offering); });
    link.addEventListener('click', event => {
      event.preventDefault();
      if (active !== link.dataset.offering) select(link.dataset.offering);
      if (matchMedia('(max-width: 760px)').matches) desk.querySelector('.offering-previews').scrollIntoView({block:'nearest', behavior: isCalm()?'instant':'smooth'});
    });
    link.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index = links.indexOf(link);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length-1 : (index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
      links[next].focus();
    });
  });
  select(active, false);
  desks.push({settle: () => select(active, false)});
}

// The three-note signature is generated locally. No autoplay, audio downloads,
// microphone access or tracking. Every voice has a finite lifetime.
let audioContext;
const demos = [];
for (const demo of document.querySelectorAll('[data-av-demo]')) {
  const button = demo.querySelector('[data-av-play]');
  const status = demo.querySelector('.av-status');
  const stamp = demo.querySelector('.av-timestamp');
  let playing = false, generation = 0, finishTimer, animation;
  let voices = [];
  function stop(message = 'Sound only plays when you press play.') {
    generation++;
    clearTimeout(finishTimer);
    animation?.kill();
    voices.forEach(voice => { try { voice.stop(); } catch {} });
    voices = [];
    playing = false;
    demo.classList.remove('is-playing');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span aria-hidden="true">▶</span> Play sound & motion';
    stamp.textContent = '00:00 / 00:03';
    gsap?.set(demo.querySelectorAll('.av-mark svg,.av-mark>span,.av-waves i'), {clearProps:'transform,opacity,visibility'});
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
        animation = gsap.timeline()
          .fromTo(demo.querySelector('.av-mark svg'), {rotation:-90, scale:.6}, {rotation:90, scale:1, duration:1.4, ease:'power3.out'}, 0)
          .fromTo(demo.querySelector('.av-mark>span'), {y:22,autoAlpha:0}, {y:0,autoAlpha:1,duration:.65,ease:'power3.out'}, .3)
          .fromTo(demo.querySelectorAll('.av-waves i'), {scaleY:.2}, {scaleY:1, duration:.26, stagger:{each:.035,from:'center'}, repeat:3,yoyo:true,ease:'sine.inOut'},0);
      }
      finishTimer = setTimeout(() => stop('That’s a sonic logo: a short, recognisable sound. Play it again.'), 3000);
    } catch {
      stop('Audio couldn’t start in this browser. You can try again.');
    }
  });
  demos.push({stop, calm: () => {animation?.kill();gsap?.set(demo.querySelectorAll('.av-mark svg,.av-mark>span,.av-waves i'),{clearProps:'transform,opacity,visibility'});}});
}
function settleMotion() { if (isCalm()) { desks.forEach(d => d.settle()); demos.forEach(d => d.calm()); } }
const motionObserver = new MutationObserver(settleMotion);
motionObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
motionQuery.addEventListener('change', settleMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden) demos.forEach(d => d.stop()); });
window.addEventListener('pagehide', () => { desks.forEach(d => d.settle()); demos.forEach(d => d.stop()); motionObserver.disconnect(); motionQuery.removeEventListener('change',settleMotion); });
window.addEventListener('pageshow', event => { if(event.persisted) { motionObserver.observe(document.body,{attributes:true,attributeFilter:['class']});motionQuery.addEventListener('change',settleMotion);settleMotion(); } });
