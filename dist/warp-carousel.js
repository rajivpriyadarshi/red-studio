import { createWarpLens } from "./warp-lens.js?v=type-hero-1";

// Deal the three visible prints from a single shallow pile. The cover lifts
// first so the other two can slide out from underneath it at different beats.
function dealCard(offset, progress, x, scale, width, height) {
  const side = Math.sign(offset);
  const delay = side === 0 ? 0 : side < 0 ? .11 : .19;
  const time = Math.max(0, Math.min(1, (progress - delay) / (.96 - delay)));
  const folded = (1 - time) ** 3 * (1 + 3 * time);
  const arc = Math.sin(Math.PI * (1 - folded));
  return {
    x: x * (1 - folded) + width * ((-.075 + side * .065) * folded + side * .032 * arc),
    y: height * ((.22 - Math.abs(side) * .018) * folded - (side ? .10 : .16) * arc),
    scale: scale * (1 - folded) + (.72 - Math.abs(side) * .04) * folded + .04 * arc,
    yaw: (-25 + side * 4) * folded - side * 18 * arc,
    pitch: 38 * folded - 7 * arc,
    roll: (-8 + side * 10) * folded + side * 9 * arc,
    spread: 1 - folded,
  };
}

// Enlarge a few samples of the artwork into diffuse light. Only these tiny
// swatches are blended during a drag, even on a full-width desktop display.
function createShowcaseLight(canvas, cuts) {
  const light = canvas.getContext("2d");
  if (!light) return null;
  const { width, height } = canvas;
  let position = 0, painted = NaN, liveIndex = -1, lastSample = -Infinity;
  const posters = cuts.map(cut => {
    const image = cut.querySelector("img");
    const tile = document.createElement("canvas");
    tile.width = width;
    tile.height = height;
    image.addEventListener("load", () => { painted = NaN; blend(position); });
    return { image, ink: tile.getContext("2d"), source: "" };
  });

  function swatch(index) {
    const poster = posters[index];
    const { image, ink } = poster;
    if (!ink || !image.complete || !image.naturalWidth) return null;
    if (poster.source !== image.currentSrc) {
      ink.imageSmoothingQuality = "high";
      ink.drawImage(image, 0, 0, width, height);
      poster.source = image.currentSrc;
    }
    return ink.canvas;
  }
  function restorePoster() {
    if (liveIndex < 0) return;
    posters[liveIndex].source = "";
    liveIndex = -1;
    painted = NaN;
  }
  function blend(value) {
    position = value;
    if (painted === position) return;
    const base = Math.floor(position);
    const index = ((base % cuts.length) + cuts.length) % cuts.length;
    const fraction = position - base;
    const next = fraction ? (index + 1) % cuts.length : index;
    if (liveIndex !== index && liveIndex !== next) restorePoster();
    const left = swatch(index);
    const right = fraction ? swatch(next) : null;
    if (!left && !right) return;
    painted = position;
    light.globalAlpha = 1;
    light.drawImage(left || right, 0, 0);
    if (left && right) {
      light.globalAlpha = fraction * fraction * (3 - 2 * fraction);
      light.drawImage(right, 0, 0);
    }
  }
  function sampleVideo(video, index) {
    const now = performance.now();
    if (now - lastSample < 850 || video.paused || video.readyState < 2 || !swatch(index)) return;
    lastSample = now;
    liveIndex = index;
    light.globalAlpha = .3;
    light.drawImage(video, 0, 0, width, height);
    // The outgoing swatch keeps the film's last colour throughout the drag.
    posters[index].ink.drawImage(canvas, 0, 0);
  }
  return { blend, sampleVideo, restorePoster };
}

export function mountWarpCarousel(rail, cuts, motion, select, open, playback) {
  const count = cuts.length;
  const floor = document.createElement("div");
  floor.className = "carousel-floor";
  floor.setAttribute("aria-hidden", "true");
  const shadows = cuts.map(() => {
    const shadow = document.createElement("i");
    shadow.className = "card-shadow";
    floor.append(shadow);
    return shadow;
  });
  rail.prepend(floor);
  const wrap = n => ((n % count) + count) % count;
  const around = n => wrap(n + count / 2) - count / 2;
  const tilts = cuts.map(cut => ({
    image: cut.querySelector(".cut-image"), yaw: 0, pitch: 0,
  }));
  let hoverIndex = -1, targetYaw = 0, targetPitch = 0;
  let hitAreas = [], sceneDirty = true;
  let position = 0, target = 0, selected = -1;
  let cardWidth = 0, cardHeight = 0;
  let width = 0, height = 0, visible = false, resting = true;
  let frame = 0, lastFrame = 0, lens, gesture, wheelEnd = 0;
  let blockClick = false;
  const gallery = rail.closest(".featured-work");
  const light = createShowcaseLight(gallery.querySelector(".showcase-light"), cuts);
  const footer = gallery.querySelector(".work-footer");
  const captionStrip = gallery.querySelector(".showcase-heading");
  const projectHeading = captionStrip.querySelector("h2");
  const captions = cuts.map((cut, index) => {
    const slot = document.createElement("div");
    slot.className = "carousel-caption";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.setAttribute("aria-label", "Show " + cut.dataset.category);
    preview.append(cut.querySelector(".cut-label").cloneNode(true));
    preview.addEventListener("click", () => {
      go(index);
      projectHeading.querySelector("a").focus({ preventScroll: true });
    });
    slot.append(preview);
    captionStrip.append(slot);
    return { slot, preview };
  });
  const isLanding = ["", "#top", "#work"].includes(location.hash);
  let opening = isLanding && !motion.matches &&
    performance.getEntriesByType("navigation")[0]?.type !== "back_forward";
  const dealEvents = opening ? new AbortController() : null;
  let dealStart = null, dealProgress = 0;

  function startDeal() {
    if (opening && visible && !document.hidden && dealStart === null) {
      dealStart = performance.now();
      queueRender();
    }
  }
  function finishDeal() {
    if (!opening) return;
    opening = false;
    dealEvents.abort();
    gallery.classList.remove("dealing");
    footer.style.removeProperty("--caption-cover");
    footer.style.removeProperty("--caption-drop");
    queueRender();
  }

  function clearHover() {
    if (hoverIndex === -1) return;
    hoverIndex = -1;
    scheduleFrame();
  }
  function trackHover(event) {
    if (!resting || motion.matches || event.buttons || event.pointerType === "touch") {
      clearHover();
      return;
    }
    const rect = rail.getBoundingClientRect();
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    const rim = Math.min(1, Math.max(0, (Math.abs(2 * px / width - 1) - .62) / .415));
    const warp = rim * rim * (3 - 2 * rim);
    const hasLens = rail.classList.contains("lens-ready");
    // Hit-test the resting artwork, so moving the paper never moves its hover target.
    for (const area of hitAreas) {
      const isCenter = area.index === selected;
      const edge = hasLens && !isCenter ? warp : 0;
      const projectedX = (px - width / 2 - area.x - Math.sign(px - width / 2) * edge * width * .079) / (area.w / 2);
      const perspective = hasLens ? Math.max(.5, 1 + area.tilt * projectedX) : 1;
      const x = projectedX / perspective;
      const y = (py - height / 2) / ((area.h / 2) * (1 + edge * edge * .72) * perspective);
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      hoverIndex = area.index;
      targetYaw = -x * (isCenter ? 12 : 5);
      targetPitch = y * (isCenter ? 9 : 4);
      scheduleFrame();
      return;
    }
    clearHover();
  }
  function updateTilt(elapsed) {
    const ease = 1 - Math.exp(-elapsed / 58);
    let sideChanged = false;
    for (const [index, tilt] of tilts.entries()) {
      const yaw = index === hoverIndex ? targetYaw : 0;
      const pitch = index === hoverIndex ? targetPitch : 0;
      if (tilt.yaw === yaw && tilt.pitch === pitch) continue;
      const settle = motion.matches || !visible || document.hidden ||
        Math.max(Math.abs(tilt.yaw - yaw), Math.abs(tilt.pitch - pitch)) < .035;
      tilt.yaw = settle ? yaw : tilt.yaw + (yaw - tilt.yaw) * ease;
      tilt.pitch = settle ? pitch : tilt.pitch + (pitch - tilt.pitch) * ease;
      const neutral = !tilt.yaw && !tilt.pitch;
      tilt.image.style.transform = neutral ? "" :
        `perspective(${cardWidth * 1.65}px) rotateY(${tilt.yaw}deg) rotateX(${tilt.pitch}deg)`;
      shadows[index].style.translate = neutral ? "" : `${-tilt.yaw * .65}px ${tilt.pitch * .35}px`;
      if (!settle) scheduleFrame();
      if (index !== selected || !resting) sideChanged = true;
    }
    return sideChanged;
  }

  function selectAt(value) {
    const index = wrap(Math.round(value));
    if (index === selected) return;
    if (selected !== -1) captions[selected].preview.hidden = false;
    selected = index;
    captions[index].preview.hidden = true;
    captions[index].slot.append(projectHeading);
    select(index);
  }
  function render() {
    if (!width || !height) return;
    const h = cardHeight, w = cardWidth;
    const settled = !opening && !gesture?.moved && !wheelEnd && position === target;
    light?.blend(position);
    const spacing = width < 741 ? w * .71 + width * .075 : w * .84 + width * .055;
    const poses = [];
    cuts.forEach((cut, index) => {
      const offset = around(index - position);
      const distance = Math.abs(offset);
      const shadow = shadows[index];
      const { slot } = captions[index];
      cut.hidden = shadow.hidden = distance >= 1.94;
      // Hidden captions still size the strip, so a two-line title never shifts the cards.
      slot.style.visibility = distance < 1.5 ? "visible" : "hidden";
      if (cut.hidden) return;
      const side = Math.sign(offset);
      const turn = Math.min(distance, 1.5);
      let x = side * spacing * (Math.sin(turn * .99) / Math.sin(.99) + Math.max(0, distance - 1.15));
      const recess = Math.min(turn, 1);
      let scale = 1 - .29 * recess * recess * (3 - 2 * recess);
      const deal = opening ? dealCard(offset, dealProgress, x, scale, w, h) : null;
      const spread = deal?.spread ?? 1;
      if (distance < 1.5) {
        // Follow the same arc as the artwork, with a little extra spread at the rim.
        const rim = recess * recess * (3 - 2 * recess);
        const captionX = (x + side * width * (width < 741 ? .012 : .053) * rim) * (1 - .15 * (1 - spread));
        slot.style.transform = `translateX(${captionX}px) perspective(${w * 1.8}px) rotateY(${-offset * 27}deg) skewY(${-side * rim * 2.8}deg) scale(${scale})`;
        slot.style.opacity = String((1 - .64 * rim) * (1 - rim * (1 - spread)) * Math.min(1, (1.5 - distance) * 2));
        slot.style.setProperty("--project-opacity", String(Math.max(0, 1 - distance * 1.8)));
        slot.style.zIndex = String(10 - Math.round(distance * 5));
      }
      const y = deal?.y ?? 0;
      if (deal) { x = deal.x; scale = deal.scale; }
      const face = Math.cos(turn * .47 * spread);
      cut.style.zIndex = String(30 - Math.round(10 * distance));
      cut.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) perspective(${Math.round(w * 1.8)}px) scale(${scale}) rotateY(${-offset * 27 * spread}deg)` +
        (deal ? ` rotateZ(${deal.roll}deg) rotateY(${deal.yaw}deg) rotateX(${deal.pitch}deg)` : "");
      // A shared light above the left edge puts the cast shadow just beyond
      // the foot of the print. Its footprint recedes with the card.
      const floorX = x + h * .032 * scale;
      const floorY = h * scale / 2 + height * .035 * scale + Math.max(0, y * .43);
      shadow.style.transform = `translate(-50%, -50%) translate(${floorX}px, ${floorY}px) scale(${scale * face}, ${scale})`;
      shadow.style.opacity = String((1 - .42 * recess) * (.40 + .60 * spread));
      poses.push({ index, distance, x, y, w: w * scale * face, h: h * scale, tilt: side * .12 * recess * spread,
        yaw: deal?.yaw ?? tilts[index].yaw, pitch: deal?.pitch ?? tilts[index].pitch, roll: deal?.roll ?? 0 });
    });
    if (opening) {
      const reveal = Math.max(0, Math.min(1, (dealProgress - .44) / .46));
      const cover = (1 - reveal) ** 3;
      footer.style.setProperty("--caption-cover", cover * 100 + "%");
      footer.style.setProperty("--caption-drop", cover * 18 + "px");
    }
    hitAreas = poses.sort((a, b) => a.distance - b.distance);
    if (visible && !document.hidden && !motion.matches) {
      if (lens === undefined) lens = createWarpLens(rail, cuts, queueRender);
      // The live centre artwork is a native layer at rest, including during tilt.
      lens?.(width, height, hitAreas.filter(p => !settled || p.index !== selected).reverse());
    } else if (motion.matches) rail.classList.remove("lens-ready");
    if (settled !== resting) {
      resting = settled;
      rail.classList.toggle("at-rest", settled);
      playback();
    }
  }
  function tick(now) {
    frame = 0;
    if (motion.matches) hoverIndex = -1;
    const elapsed = Math.min(60, now - (lastFrame || now - 16));
    lastFrame = now;
    const previousPosition = position;
    if (opening && dealStart !== null) {
      dealProgress = Math.min(1, Math.max(0, (now - dealStart) / 1290));
      sceneDirty = true;
      if (dealProgress === 1 || motion.matches) finishDeal();
      else scheduleFrame();
    }
    if (!gesture?.moved && !wheelEnd) {
      position += (target - position) * (1 - Math.exp(-elapsed / 93));
      if (Math.abs(target - position) < .001 || motion.matches) position = target;
    }
    const sideChanged = updateTilt(elapsed);
    if (sceneDirty || sideChanged || previousPosition !== position) render();
    sceneDirty = false;
    if (!gesture?.moved && !wheelEnd && position !== target) scheduleFrame();
    if (!frame) lastFrame = 0;
  }
  function scheduleFrame() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function queueRender() {
    sceneDirty = true;
    scheduleFrame();
  }
  function go(index, animate = true) {
    if (selected !== -1) finishDeal();
    clearHover();
    clearTimeout(wheelEnd);
    wheelEnd = 0;
    // Keep the phase unbounded so crossing the seam is a single step.
    target = Math.round(target) + around(index - Math.round(target));
    if (!animate || !visible || motion.matches || document.hidden) position = target;
    if (position !== target && resting) {
      resting = false;
      rail.classList.remove("at-rest");
    }
    selectAt(target);
    render();
    queueRender();
  }
  function release(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const drag = gesture;
    gesture = null;
    rail.classList.remove("is-dragging");
    if (!drag.moved) return;
    blockClick = true;
    const glide = performance.now() - drag.time < 90 ? Math.max(-.65, Math.min(.65, drag.speed * 110)) : 0;
    const landing = event.type === "pointercancel" ? position : drag.phase + glide;
    go(Math.round(landing));
  }
  rail.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    clearHover();
    clearTimeout(wheelEnd);
    wheelEnd = 0;
    blockClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
      origin: position, phase: position, time: performance.now(), speed: 0, moved: false };
  });
  rail.addEventListener("pointermove", event => {
    if (!event.isPrimary) return;
    if (!gesture) { trackHover(event); return; }
    if (event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    if (!gesture.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - gesture.y)) return;
      finishDeal();
      gesture.moved = true;
      rail.setPointerCapture(event.pointerId);
      rail.classList.add("is-dragging");
    }
    const phase = gesture.origin - dx / (width * (width < 741 ? .64 : .39));
    const now = performance.now();
    const dt = Math.max(8, now - gesture.time);
    const speed = (phase - gesture.phase) / dt;
    gesture.speed = dt > 90 ? 0 : .55 * speed + .45 * gesture.speed;
    gesture.time = now;
    gesture.phase = phase;
    if (!motion.matches) position = phase;
    queueRender();
  });
  rail.addEventListener("pointerup", release);
  rail.addEventListener("pointercancel", release);
  rail.addEventListener("lostpointercapture", event => { if (event.target === rail) release(event); });
  rail.addEventListener("pointerleave", () => {
    clearHover();
    if (!gesture?.moved) gesture = null;
  });
  window.addEventListener("blur", clearHover);
  window.addEventListener("scroll", clearHover, { passive: true });
  rail.addEventListener("dragstart", event => event.preventDefault());
  rail.addEventListener("timeupdate", event => {
    const video = event.target;
    if (visible && resting && !document.hidden && !motion.matches &&
        video instanceof HTMLVideoElement && cuts[selected]?.contains(video)) {
      light?.sampleVideo(video, selected);
    }
  }, true);
  rail.addEventListener("click", event => {
    if (blockClick && event.detail) { event.preventDefault(); blockClick = false; return; }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const cut = event.target.closest(".cut");
    if (cut) {
      event.preventDefault();
      const i = cuts.indexOf(cut);
      if (i === selected) open(cut);
      else go(i);
    } else if (event.detail) {
      const x = (event.clientX - rail.getBoundingClientRect().left) / width;
      if (x < .27 || x > .73) go(selected + (x < .5 ? -1 : 1));
    }
  });
  rail.addEventListener("keydown", event => {
    const destinations = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: count - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    const next = destinations[event.key];
    go(next, Math.abs(around(next - position)) < 1.5);
    cuts[selected].focus({ preventScroll: true });
  });
  rail.addEventListener("wheel", event => {
    if (event.ctrlKey || gesture || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    finishDeal();
    clearHover();
    const pixels = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1);
    if (!wheelEnd) target = position;
    target += pixels / (width * .4);
    if (!motion.matches) position = target;
    clearTimeout(wheelEnd);
    wheelEnd = setTimeout(() => go(Math.round(target)), 130);
    queueRender();
  }, { passive: false });

  function resize() {
    clearHover();
    width = rail.clientWidth;
    height = rail.clientHeight;
    cardHeight = height * .81;
    cardWidth = Math.min(width * (width < 741 ? .62 : .48), cardHeight * 1.62);
    rail.parentElement.style.setProperty("--card-w", cardWidth + "px");
    rail.parentElement.style.setProperty("--card-h", cardHeight + "px");
    render();
  }
  gallery.classList.add("gallery-ready");
  if (opening) {
    const options = { signal: dealEvents.signal };
    gallery.classList.add("dealing");
    gallery.addEventListener("click", finishDeal, { ...options, capture: true });
    gallery.addEventListener("focusin", e => { if (e.target.matches(":focus-visible")) finishDeal(); }, options);
    window.addEventListener("pagehide", finishDeal, options);
  }
  rail.classList.add("at-rest");
  new ResizeObserver(resize).observe(rail);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      if (dealStart !== null) finishDeal();
      clearHover();
      updateTilt(0);
      position = target = Math.round(target);
      gesture = null;
      rail.classList.remove("is-dragging");
    } else if (entry.intersectionRatio >= .14) startDeal();
    queueRender();
  }, { threshold: [0, .14] }).observe(rail);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (opening) finishDeal(); clearHover(); updateTilt(0); }
    queueRender();
  });
  motion.addEventListener("change", () => {
    light?.restorePoster();
    clearHover();
    updateTilt(0);
    go(selected, false);
  });
  resize();
  go(0, false);
  return go;
}
