const gsap = window.gsap;
document.querySelectorAll('[data-project-carousel]').forEach(initCarousel);

function initCarousel(root) {
  if (!gsap) return; // The unenhanced collection remains readable without the library.
  const stage = root.querySelector('.project-viewport');
  const track = root.querySelector('.project-track');
  const cards = [...root.querySelectorAll('.project-slide')];
  const dots = [...root.querySelectorAll('[data-project-dot]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const wrap = n => (n + cards.length) % cards.length;
  const calm = () => preference.matches || document.body.classList.contains('motion-paused');
  let active = 0, width = 0, cardWidth = 0, timeline, trackTween, generation = 0;
  let drag, dragFrame = 0, suppressClickUntil = 0, introduced = false, interacted = false;

  function distance(i) {
    let d = wrap(i - active);
    if (d > cards.length / 2) d -= cards.length;
    return d;
  }

  function slot(i) {
    const d = distance(i), side = Math.sign(d), depth = Math.abs(d);
    if (depth === 0) return { x: 0, y: 0, z: 70, rotationY: 0, rotation: 0, scale: 1, opacity: 1 };
    if (depth === 1) return { x: side * cardWidth * .76, y: 27, z: -140, rotationY: side * -26, rotation: side * 4, scale: .86, opacity: .78 };
    if (depth === 2) return { x: side * cardWidth * 1.16, y: 52, z: -280, rotationY: side * -34, rotation: side * 7, scale: .74, opacity: .4 };
    return { x: side * cardWidth * 1.3, y: 75, z: -420, rotationY: side * -38, rotation: side * 9, scale: .62, opacity: 0 };
  }

  function updateMeaning(announce) {
    root.dataset.active = String(active);
    cards.forEach((card, i) => {
      const d = Math.abs(distance(i));
      card.classList.toggle('is-active', d === 0);
      card.classList.toggle('is-near', d === 1);
      card.classList.toggle('is-far', d >= 2);
      card.setAttribute('aria-hidden', String(i !== active));
      card.style.zIndex = String(10 - d);
      card.style.pointerEvents = d > 2 ? 'none' : 'auto';
      card.querySelector('.project-select').hidden = d === 0;
      dots[i].setAttribute('aria-pressed', String(i === active));
      dots[i].tabIndex = i === active ? 0 : -1;
    });
    root.querySelector('[data-project-count]').textContent = String(active + 1).padStart(2, '0');
    if (announce) root.querySelector('[data-project-announcement]').textContent = `${cards[active].dataset.name}. ${cards[active].dataset.kind}. ${active + 1} of ${cards.length}.`;
  }

  function render(animate = true, entrance = false) {
    const token = ++generation;
    timeline?.kill();
    gsap.killTweensOf(cards);
    updateMeaning(false);
    if (!animate || calm()) {
      root.classList.remove('is-transitioning');
      cards.forEach((card, i) => gsap.set(card, slot(i)));
      return;
    }
    root.classList.add('is-transitioning');
    timeline = gsap.timeline({
      defaults: { duration: entrance ? .8 : .68, ease: entrance ? 'power3.out' : 'power3.inOut', overwrite: 'auto' },
      onComplete: () => { if (token === generation) root.classList.remove('is-transitioning'); }
    });
    cards.forEach((card, i) => timeline.to(card, slot(i), entrance ? Math.abs(distance(i)) * .06 : 0));
  }

  function resetDrag(animate = true) {
    if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
    drag = undefined;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    stage.classList.remove('is-dragging');
    trackTween?.kill();
    if (animate && !calm()) trackTween = gsap.to(track, { x: 0, rotationY: 0, duration: .42, ease: 'power3.out', overwrite: true });
    else gsap.set(track, { x: 0, rotationY: 0 });
  }

  function select(i, keyboardDot = false) {
    resetDrag();
    interacted = true;
    active = wrap(i);
    render();
    updateMeaning(true);
    if (keyboardDot) dots[active].focus({ preventScroll: true });
  }

  function measure() {
    const nextWidth = stage.getBoundingClientRect().width;
    const nextCardWidth = cards[0].offsetWidth;
    if (nextWidth === width && nextCardWidth === cardWidth) return;
    width = nextWidth;
    cardWidth = nextCardWidth;
    resetDrag(false);
    render(false);
    window.ScrollTrigger?.refresh();
  }

  root.classList.add('is-enhanced');
  root.querySelector('.project-carousel-footer').hidden = false;
  gsap.set(cards, { xPercent: -50, yPercent: -50, force3D: true });
  measure();

  root.querySelector('[data-project-prev]').addEventListener('click', () => select(active - 1), options);
  root.querySelector('[data-project-next]').addEventListener('click', () => select(active + 1), options);
  dots.forEach((dot, i) => dot.addEventListener('click', () => select(i), options));
  cards.forEach((card, i) => card.querySelector('.project-select').addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
    select(i);
    stage.focus({ preventScroll: true });
  }, options));
  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input,textarea,select')) return;
    const dot = event.target.closest('[data-project-dot]');
    const targets = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: cards.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    select(targets[event.key], Boolean(dot));
  }, options);

  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    trackTween?.kill();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, time: event.timeStamp, dx: 0, velocity: 0, engaged: false };
  }, options);
  stage.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.pointerType === 'mouse' && !event.buttons) { resetDrag(); return; }
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.engaged) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { resetDrag(false); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      drag.engaged = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
      timeline?.kill();
    }
    event.preventDefault();
    drag.velocity = (event.clientX - drag.x) / Math.max(1, event.timeStamp - drag.time);
    drag.time = event.timeStamp;
    drag.x = event.clientX;
    drag.dx = dx;
    if (!dragFrame && !calm()) dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      if (drag) gsap.set(track, { x: clamp(drag.dx * .28, -75, 75), rotationY: clamp(drag.dx * .01, -3, 3) });
    });
  }, { ...options, passive: false });
  stage.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const { dx, engaged, velocity, time } = drag;
    // Leave an ordinary click's hit target intact until its click event fires.
    if (!engaged) { drag = undefined; return; }
    const flick = event.timeStamp - time < 120 && Math.abs(velocity) > .35 && Math.abs(dx) > 18;
    if (engaged) { suppressClickUntil = performance.now() + 300; stage.focus({ preventScroll: true }); }
    const change = engaged && (Math.abs(dx) > Math.max(40, width * .055) || flick);
    resetDrag();
    if (change) select(active + (dx < 0 ? 1 : -1));
    else if (engaged) render();
  }, options);
  stage.addEventListener('pointercancel', () => { resetDrag(); render(); }, options);
  stage.addEventListener('pointerleave', () => { if (drag && !drag.engaged) resetDrag(false); }, options);

  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  let lastCalm = calm();
  const motionChange = () => {
    if (lastCalm === calm()) return;
    lastCalm = calm();
    resetDrag(false);
    render(false);
  };
  preference.addEventListener('change', motionChange);
  const bodyObserver = new MutationObserver(motionChange);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const entrance = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting || introduced) return;
    introduced = true;
    entrance.disconnect();
    if (interacted || calm()) return;
    gsap.set(cards, { x: 0, y: 36, z: -160, rotationY: 0, rotation: 0, scale: .8, opacity: 0 });
    render(true, true);
  }, { threshold: .2 });
  entrance.observe(stage);
  document.fonts.ready.then(measure);
  window.addEventListener('pagehide', event => {
    resetDrag(false);
    render(false);
    if (event.persisted) return;
    timeline?.kill();
    trackTween?.kill();
    resize.disconnect();
    entrance.disconnect();
    bodyObserver.disconnect();
    preference.removeEventListener('change', motionChange);
    events.abort();
  }, options);
  window.addEventListener('pageshow', event => { if (event.persisted) { measure(); render(false); } }, options);
}
