// The same twelve ink shapes carry the opening print and the scroll gesture.
(() => {
  const root = document.documentElement;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const query = new URLSearchParams(location.search);
  const navigationType = performance.getEntriesByType("navigation")[0]?.type;
  if (navigationType === "reload" && (!location.hash || location.hash.startsWith("#price-") || location.hash === "#services")) {
    history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    window.addEventListener("pageshow", () => requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      history.scrollRestoration = "auto";
    }), { once: true });
  }
  const directEntry = !["", "#top"].includes(location.hash) ||
    ["package", "packages", "independent", "budget"].some(key => query.has(key));
  const playIntro = !motion.matches && Element.prototype.animate && !directEntry &&
    navigationType !== "back_forward";
  if (playIntro) root.classList.add("title-running", "room-arriving");

  const ns = "http://www.w3.org/2000/svg";
  function svg(tag, attributes = {}) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  // Cut on structural joints: the E's arms, the R's leg, the U's bowl.
  // Each piece has its own incoming vector in the original drawing's units.
  const part = (x, y, w, h, dx, dy) => ({ x, y, w, h, dx, dy });
  const upright = part(-2, -3, 31, 100, 0, 22);
  const parts = {
    T: [part(0, 24, 85, 70, 0, 21), part(-1, -2, 87, 26, 0, -22)],
    H: [upright, part(29, 0, 32, 92, -18, 0), part(61, 0, 30, 92, 0, -22)],
    E: [upright, part(29, 0, 52, 24, 24, 0), part(29, 34, 52, 24, 17, 0), part(29, 69, 52, 24, 22, 0)],
    R: [upright, part(29, -2, 66, 62, 20, -11), part(29, 60, 66, 36, 16, 21)],
    D: [upright, part(29, -2, 65, 98, 26, 0)],
    S: [part(-1, -3, 92, 50, -23, 0), part(-1, 47, 92, 50, 23, 0)],
    U: [part(0, -2, 30, 52, 0, -20), part(0, 50, 92, 46, 0, 21), part(60, -2, 32, 52, 0, -16)],
    I: [part(-2, -2, 32, 49, 0, -23), part(-2, 47, 32, 49, 0, 23)],
    O: [part(-2, -3, 50, 100, -23, 0), part(48, -3, 50, 100, 23, 0)]
  };
  function assemble(mark, letters) {
    const defs = svg("defs");
    const pieces = [];
    const animations = [];
    const originals = [];
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      originals.forEach(path => path.removeAttribute("visibility"));
      pieces.forEach(group => group.remove());
      defs.remove();
      animations.forEach(animation => animation.cancel());
      root.classList.remove("title-running", "assembly-mounted");
      window.dispatchEvent(new Event("studio:title-end"));
    }

    try {
      mark.prepend(defs);
      letters.forEach((letter, index) => {
        const path = letter.querySelector(".ink-letter");
        const fragments = svg("g");
        letter.append(fragments);
        pieces.push(fragments);
        originals.push(path);
        path.setAttribute("visibility", "hidden");
        parts[letter.dataset.letter].forEach(({ x, y, w, h, dx, dy }, cut) => {
          const id = "ink-cut-" + index + "-" + cut;
          const clip = svg("clipPath", { id, clipPathUnits: "userSpaceOnUse" });
          clip.append(svg("rect", { x, y, width: w, height: h }));
          defs.append(clip);
          const joint = svg("g", { "clip-path": "url(#" + id + ")" });
          joint.append(svg("path", { d: path.getAttribute("d"), "fill-rule": "evenodd" }));
          const piece = svg("g");
          piece.append(joint);
          fragments.append(piece);
          animations.push(piece.animate([
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
            { opacity: 1, offset: .38 },
            { transform: "translate(0, 0)", opacity: 1 }
          ], { delay: index * 137 + cut * 36, duration: 360,
            easing: "cubic-bezier(.18,.78,.24,1)", fill: "both" }));
        });
      });
      root.classList.add("assembly-mounted");
      Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
    } catch {
      finish();
    }
    return finish;
  }

  const clamp = value => Math.min(1, Math.max(0, value));
  function ease(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  }
  function mountRoomHover(panel) {
    const room = panel.querySelector(".painted-room");
    if (!room) return () => {};
    const endArrival = () => root.classList.remove("room-arriving");
    room.querySelector(".room-crayons .room-arrival").addEventListener("animationend", endArrival, { once: true });
    window.addEventListener("pagehide", endArrival, { once: true });
    let active = null, box, contact, frame = 0;
    function release() {
      cancelAnimationFrame(frame);
      frame = 0;
      active?.classList.remove("is-stirred");
      active = contact = null;
    }
    function stir() {
      frame = 0;
      const node = contact.target.closest(".room-piece");
      if (!node) { release(); return; }
      if (node !== active) {
        active?.classList.remove("is-stirred");
        active = node;
        box = node.getBoundingClientRect();
      }
      const x = 2 * clamp((contact.clientX - box.left) / box.width) - 1;
      const y = 2 * clamp((contact.clientY - box.top) / box.height) - 1;
      node.style.setProperty("--yaw", (x * 11) + "deg");
      node.style.setProperty("--swing", (x * 7 + y * 2 - 2) + "deg");
      node.classList.add("is-stirred");
    }
    function touch(event) {
      if (motion.matches || window.scrollY > 1 || !event.isPrimary) return;
      if (!event.target.closest(".room-piece")) { if (active || frame) release(); return; }
      contact = event;
      if (!frame) frame = requestAnimationFrame(stir);
    }
    panel.addEventListener("pointermove", touch, { passive: true });
    panel.addEventListener("pointerdown", touch, { passive: true });
    panel.addEventListener("pointerup", e => { if (e.pointerType === "touch") release(); });
    panel.addEventListener("pointerleave", release);
    panel.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    window.addEventListener("resize", release);
    window.addEventListener("pagehide", release);
    return release;
  }

  // Sample each arc once when the layout changes. The browser interpolates
  // between these poses in either direction as the page scrolls.
  function arcFrames(pose) {
    return Array.from({ length: 9 }, (_, i) => pose(i / 8));
  }

  function mount() {
    const panel = document.querySelector(".hero-panel");
    const mark = panel?.querySelector(".marque svg");
    const letters = [...(mark?.querySelectorAll(".flight-letter") ?? [])];
    if (!letters.length) {
      root.classList.remove("title-running");
      return;
    }
    let finishIntro;
    if (playIntro && !document.hidden && window.scrollY <= 2) finishIntro = assemble(mark, letters);
    else root.classList.remove("title-running", "room-arriving");
    const releaseHover = mountRoomHover(panel);

    // Keep a trajectory for each letter for the whole visit. Reversing the scroll
    // retraces the same arcs. Only the distance to the edge changes on resize.
    const paths = letters.map((letter, i) => {
      const row = i < 6 ? -1 : 1;
      const angle = Math.atan2(row, (i % 6 - 2.5) * .72) + (Math.random() - .5) * .46;
      const sign = Math.random() < .5 ? -1 : 1;
      return {
        letter, vx: Math.cos(angle), vy: Math.sin(angle),
        bend: (Math.random() - .5) * .38, turn: sign * (33 + Math.random() * 65),
        scale: (Math.random() - .52) * .52, delay: i === 0 ? 0 : Math.random() * .14
      };
    });
    const touchScreen = matchMedia("(max-width: 1024px) and (pointer: coarse) and (any-hover: none)");
    const platform = navigator.userAgentData?.platform;
    const windows = platform ? platform === "Windows" : /\bWindows NT\b/i.test(navigator.userAgent);
    let atlas, sheet, printing = false;
    function prepareSheet() {
      if (!(windows || touchScreen.matches) || motion.matches || atlas) return;
      atlas = new Image();
      atlas.src = windows ? "assets/red-room/flight-type-desktop.png" : "assets/red-room/flight-type.png";
      atlas.decode().then(() => {
        sheet = document.createElement("span");
        sheet.className = "phone-letters";
        sheet.style.setProperty("--flight-sheet", 'url("' + atlas.src + '")');
        sheet.setAttribute("aria-hidden", "true");
        // Each square covers (-2, -3) to (98, 97) in the original SVG.
        // The two rows carry the same silhouettes in ivory and dark ink.
        for (const path of paths) {
          const tile = document.createElement("span");
          tile.className = "phone-glyph";
          const column = "THERDSUIO".indexOf(path.letter.dataset.letter);
          tile.style.setProperty("--glyph-column", (column * 12.5) + "%");
          const box = path.letter.querySelector(".ink-letter").getBBox();
          tile.style.transformOrigin = (2 + box.x + box.width / 2) + "% " + (3 + box.y + box.height / 2) + "%";
          tile.append(document.createElement("span"));
          sheet.append(tile);
          path.tile = tile;
        }
        mark.after(sheet);
        measure();
      }).catch(() => {}); // The vector animation is already available.
    }
    const sequence = panel.closest(".hero-work-sequence");
    const work = sequence.querySelector("#work");
    const wall = panel.querySelector(".room-wall");
    const pieces = [...panel.querySelectorAll("[data-flight]")].map(node => {
      const [delay, x, y, turn] = node.dataset.flight.split(" ").map(Number);
      return { node, delay, x, y, turn };
    });
    const line = panel.querySelector(".studio-line");
    const link = panel.querySelector(".hero-work-link");
    const nativeScroll = typeof ScrollTimeline === "function" && "rangeStart" in Animation.prototype &&
      CSS.supports("animation-range", "0px 1px");
    const timeline = nativeScroll ? new ScrollTimeline({ source: document.scrollingElement }) : null;
    const tracks = [];
    let start = 0, distance = 0, width = 0, markWidth = 0, frame = 0, sampled = -1;
    let scrolling = false, linkCleared = false;
    function showFlightLetters() {
      // Windows keeps the deformable SVG at rest. Both paths share the same layout.
      mark.parentElement.classList.toggle("print-flight", printing && (!windows || scrolling));
    }
    function clearTracks() {
      for (const { animation } of tracks) animation.cancel();
      tracks.length = 0;
      sampled = -1;
    }
    function track(node, keyframes, from, to) {
      const timing = { fill: "both" };
      if (timeline) {
        timing.timeline = timeline;
        timing.rangeStart = (start + from * distance) + "px";
        timing.rangeEnd = (start + to * distance) + "px";
      } else timing.duration = 1000;
      const animation = node.animate(keyframes, timing);
      if (!timeline) animation.pause();
      tracks.push({ animation, from, to, time: -1 });
    }
    function renderFallback() {
      frame = 0;
      const progress = clamp((window.scrollY - start) / distance);
      if (progress === sampled) return;
      sampled = progress;
      for (const item of tracks) {
        const time = 1000 * clamp((progress - item.from) / (item.to - item.from));
        if (time !== item.time) item.animation.currentTime = item.time = time;
      }
    }
    function onScroll() {
      if (motion.matches || !distance) return;
      const progress = (window.scrollY - start) / distance;
      if (scrolling !== (progress > 0)) {
        scrolling = progress > 0;
        showFlightLetters();
        if (scrolling) {
          finishIntro?.();
          root.classList.remove("room-arriving");
          releaseHover();
        }
      }
      if (linkCleared !== (progress >= .185)) {
        linkCleared = progress >= .185;
        panel.classList.toggle("link-cleared", linkCleared);
      }
      if (!timeline && !frame && !document.hidden && clamp(progress) !== sampled) frame = requestAnimationFrame(renderFallback);
    }
    function measure() {
      if (motion.matches) return;
      const top = window.scrollY + sequence.getBoundingClientRect().top;
      const height = panel.clientHeight;
      const run = height + parseFloat(getComputedStyle(work).marginTop);
      const viewportWidth = panel.clientWidth;
      const logoWidth = mark.getBoundingClientRect().width;
      const visibleHeight = height - parseFloat(getComputedStyle(panel).paddingBottom);
      work.style.setProperty("--work-pin-top", Math.min(0, visibleHeight - work.offsetHeight) + "px");
      const useSheet = Boolean(sheet && (windows || touchScreen.matches));
      if (top === start && run === distance && viewportWidth === width && logoWidth === markWidth && printing === useSheet) return;
      printing = useSheet;
      showFlightLetters();
      start = top;
      distance = run;
      width = viewportWidth;
      markWidth = logoWidth;
      clearTracks();
      const fade = [{ opacity: 1, easing: "ease-in-out" }, { opacity: 0 }];
      track(wall, fade, .13, .59);
      track(line, fade, .035, .155);
      track(link, fade, .025, .185);
      if (!printing) track(mark, [{ fill: "var(--room-ivory)", easing: "ease-in-out" }, { fill: "var(--ink)" }], .18, .48);
      for (const { node, delay, x, y, turn } of pieces) {
        track(node, arcFrames(t => {
          const glide = t * (.42 + .58 * t);
          const lift = 4 * t * (1 - t);
          return {
            transform: `translate3d(${x * glide}vw, ${y * glide - lift * 6}svh, 0) rotate(${turn * glide}deg) scale(${1 + lift * .09})`,
            opacity: 1 - ease((t - .50) * 2)
          };
        }), delay, delay + .40);
      }
      for (const path of paths) {
        const matrix = path.letter.parentNode.getCTM();
        const unit = printing ? 1 : matrix.a;
        if (printing) {
          const tile = path.tile;
          tile.style.left = (matrix.e - 2 * matrix.a) + "px";
          tile.style.top = (matrix.f - 3 * matrix.d) + "px";
          tile.style.width = (100 * matrix.a) + "px";
          tile.style.height = (100 * matrix.d) + "px";
          track(tile.firstChild, [{ opacity: 0, easing: "ease-in-out" }, { opacity: 1 }], .18, .48);
        }
        const reach = Math.min(width * .82 / Math.abs(path.vx), height * .83 / Math.abs(path.vy)) / unit;
        track(printing ? path.tile : path.letter, arcFrames(t => {
          const travel = t * (.60 + .40 * t);
          const arc = 4 * t * (1 - t) * path.bend;
          const x = reach * (travel * path.vx - arc * path.vy);
          const y = reach * (travel * path.vy + arc * path.vx);
          return { transform: `translate(${x}px, ${y}px) rotate(${path.turn * t}deg) scale(${1 + path.scale * t})` };
        }), .07 + .89 * path.delay, .96);
      }
      if (!timeline) renderFallback();
      onScroll();
    }
    function syncMotion() {
      prepareSheet();
      root.classList.toggle("flight-ready", !motion.matches);
      if (motion.matches) {
        finishIntro?.();
        root.classList.remove("room-arriving");
        cancelAnimationFrame(frame);
        frame = distance = 0;
        scrolling = linkCleared = false;
        showFlightLetters();
        clearTracks();
        releaseHover();
        work.style.removeProperty("--work-pin-top");
        panel.classList.remove("link-cleared");
      } else measure();
    }
    syncMotion();
    // Let the browser navigate to #work and manage focus and history. Request
    // smooth scrolling for this anchor jump only, so it also plays the handoff.
    const workLinks = document.querySelectorAll('.hero-work-link, .station-head a[href="#work"]');
    for (const link of workLinks) {
      link.addEventListener("click", () => {
        if (motion.matches) return;
        root.classList.add("scroll-to-work");
        requestAnimationFrame(() => root.classList.remove("scroll-to-work"));
      });
    }
    motion.addEventListener("change", syncMotion);
    touchScreen.addEventListener("change", () => { prepareSheet(); measure(); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", measure);
    window.addEventListener("pagehide", () => finishIntro?.());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) finishIntro?.();
      else onScroll();
    });
    if (window.ResizeObserver) {
      const sizes = new ResizeObserver(measure);
      sizes.observe(panel);
      sizes.observe(mark);
      sizes.observe(work);
    } else window.addEventListener("resize", measure, { passive: true });
  }
  if (document.readyState === "loading") {
    document.addEventListener("readystatechange", mount, { once: true });
  } else mount();
})();
