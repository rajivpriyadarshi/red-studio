import { createPaper } from "./sketchbook-paper.js?v=3";

export function mountSketchbook(book, motionPreference) {
  const bound = book.querySelector(".book-bound");
  const list = book.querySelector(".process-steps");
  const pages = Array.from(list.children);
  const tabs = book.querySelector(".book-tabs");
  const pager = book.querySelector(".book-pager");
  const back = pager.querySelector("[data-book-back]");
  const next = pager.querySelector("[data-book-next]");
  const small = matchMedia("(max-width: 700px)");
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  book.append(status);
  let current = 0;
  let turn = null;
  let drag = null;
  let turnFrame = 0;
  let hinting = false;
  let hintObserver;
  let hintTimer;

  function dismissHint() {
    clearTimeout(hintTimer);
    hintObserver?.disconnect();
  }
  function dropPaper() {
    cancelAnimationFrame(turnFrame);
    turnFrame = 0;
    hinting = false;
    turn?.paper.remove();
    turn = null;
  }
  function releasePointer() {
    const id = drag?.id;
    drag = null;
    bound.classList.remove("is-dragging");
    if (id != null && bound.hasPointerCapture(id))
      bound.releasePointerCapture(id);
  }
  function interrupt() {
    releasePointer();
    dropPaper();
  }
  function openPaper(index, grip = 0.8) {
    dropPaper();
    if (motionPreference.matches) return;
    turn = {
      index,
      progress: -1,
      paper: createPaper(
        bound,
        pages[current],
        pages[index],
        index > current,
        small.matches,
        grip,
      ),
    };
    pose(0);
  }
  function pose(value) {
    if (!turn || value === turn.progress) return;
    turn.progress = value;
    turn.paper.draw(value);
  }
  function travel(end, duration, easing, done = dropPaper) {
    cancelAnimationFrame(turnFrame);
    if (!turn) return;
    const start = turn.progress;
    const started = performance.now();
    function tick(now) {
      const t = Math.max(0, Math.min(1, (now - started) / duration));
      pose(start + (end - start) * easing(t));
      if (t < 1) turnFrame = requestAnimationFrame(tick);
      else done();
    }
    turnFrame = requestAnimationFrame(tick);
  }
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => t * t * (3 - 2 * t);

  const buttons = pages.map((page, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = page.id + "-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", page.id);
    tab.textContent = page.dataset.tab;
    page.setAttribute("role", "tabpanel");
    page.setAttribute("aria-labelledby", tab.id);
    page.tabIndex = 0;
    tab.addEventListener("click", () => select(i));
    tabs.append(tab);
    return tab;
  });

  function commit(index, announce = false) {
    current = index;
    pages.forEach((page, i) => {
      const active = i === current;
      page.classList.toggle("is-active", active);
      page.inert = !active;
      page.setAttribute("aria-hidden", String(!active));
      buttons[i].setAttribute("aria-selected", String(active));
      buttons[i].tabIndex = active ? 0 : -1;
    });
    back.disabled = current === 0;
    next.disabled = current === pages.length - 1;
    const progress = index / (pages.length - 1);
    bound.style.setProperty("--read-stack", 4 + 10 * progress + "px");
    bound.style.setProperty("--unread-stack", 14 - 10 * progress + "px");
    if (announce)
      status.textContent = pages[index].querySelector("h3").textContent;
  }
  function select(index, announce = false) {
    dismissHint();
    if (hinting && turn?.index === index) {
      hinting = false;
      commit(index, announce);
      travel(1, 620, easeOut);
      return;
    }
    interrupt();
    if (!pages[index] || index === current) return;
    openPaper(index);
    commit(index, announce);
    travel(1, small.matches ? 650 : 810, easeInOut);
  }
  back.addEventListener("click", () => select(current - 1, true));
  next.addEventListener("click", () => select(current + 1, true));
  tabs.addEventListener("keydown", (event) => {
    const moves = {
      ArrowLeft: (current + pages.length - 1) % pages.length,
      ArrowRight: (current + 1) % pages.length,
      Home: 0,
      End: pages.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const index = moves[event.key];
    select(index);
    buttons[index].focus({ preventScroll: true });
  });
  function movePage(event) {
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        interrupt();
        return;
      }
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      drag.horizontal = true;
      bound.classList.add("is-dragging");
    }
    const offset = drag.pickup - dx / drag.travel;
    const forward = offset >= 0;
    const index = current + (forward ? 1 : -1);
    if (index !== drag.index) {
      drag.index = index;
      if (pages[index]) openPaper(index, drag.grip);
      else dropPaper();
    }
    const distance = Math.min(1, Math.abs(offset));
    // Invert the projected travel of the free edge about the binding.
    const arc = drag.arc;
    const falling = small.matches && !forward;
    const phase =
      Math.acos(1 - (falling ? 1 - distance : distance) * (1 - Math.cos(arc))) /
      arc;
    pose(falling ? 1 - phase : phase);
    const dt = event.timeStamp - drag.time;
    if (dt > 0 && event.clientX !== drag.lastX) {
      drag.speed = (event.clientX - drag.lastX) / Math.max(8, dt);
      drag.lastX = event.clientX;
      drag.time = event.timeStamp;
    }
  }

  bound.addEventListener("pointerdown", (event) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.target.closest(
        "a, button, input, select, textarea, [contenteditable]",
      )
    )
      return;
    dismissHint();
    const arc = Math.PI * (small.matches ? 0.56 : 1);
    let pickup = 0;
    if (hinting && turn) {
      cancelAnimationFrame(turnFrame);
      pickup = (1 - Math.cos(arc * turn.progress)) / (1 - Math.cos(arc));
    } else interrupt();
    const box = bound.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      mid: box.left + box.width / 2,
      grip: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
      travel: box.width,
      arc,
      pickup,
      threshold: Math.min(72, box.width * 0.19),
      horizontal: false,
      index: hinting ? turn.index : null,
      start: event.timeStamp,
      time: event.timeStamp,
      lastX: event.clientX,
      speed: 0,
    };
    bound.setPointerCapture(event.pointerId);
  });
  bound.addEventListener("pointermove", (event) => {
    if (drag?.id === event.pointerId) movePage(event);
  });
  bound.addEventListener("pointerup", (event) => {
    if (drag?.id !== event.pointerId) return;
    movePage(event);
    if (!drag) return;
    const gesture = drag;
    releasePointer();
    if (!gesture.horizontal) {
      const tap =
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8;
      if (tap && event.timeStamp - gesture.start < 650) {
        select(current + (event.clientX >= gesture.mid ? 1 : -1), true);
      } else if (turn) travel(0, 240, easeOut);
      return;
    }
    hinting = false;
    const dx = event.clientX - gesture.x;
    const speed =
      event.timeStamp - gesture.time < 110 ? gesture.speed * Math.sign(dx) : 0;
    const finish =
      Math.abs(dx) >= gesture.threshold || (Math.abs(dx) >= 24 && speed > 0.45);
    if (
      pages[gesture.index] &&
      Math.sign(dx) === Math.sign(current - gesture.index) &&
      finish &&
      speed > -0.45
    ) {
      commit(gesture.index, true);
      if (turn) travel(1, 180 + 360 * (1 - turn.progress), easeOut);
    } else if (turn) {
      travel(0, 160 + 300 * turn.progress, easeOut);
    }
  });
  bound.addEventListener("lostpointercapture", (event) => {
    if (drag?.id === event.pointerId) interrupt();
  });
  bound.addEventListener("pointercancel", (event) => {
    if (drag?.id === event.pointerId) interrupt();
  });
  // The existing tabs and page buttons remain the keyboard controls.
  book.addEventListener("focusin", () => {
    dismissHint();
    if (hinting && !drag) dropPaper();
  });
  if (!motionPreference.matches && window.IntersectionObserver) {
    hintObserver = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(hintTimer);
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        hintTimer = setTimeout(() => {
          dismissHint();
          if (
            drag ||
            turn ||
            current !== 0 ||
            document.hidden ||
            motionPreference.matches
          )
            return;
          openPaper(1, 0.97);
          hinting = true;
          travel(0.21, 530, easeInOut, () => travel(0, 650, easeInOut));
        }, 700);
      },
      { threshold: 0.35 },
    );
    hintObserver.observe(bound);
  }

  const object = book.querySelector(".book-object");
  const canTilt = matchMedia(
    "(min-width: 701px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  let frame = 0;
  let pointerX = 0,
    pointerY = 0;
  function updateView() {
    frame = 0;
    const area = book.getBoundingClientRect();
    const x = (pointerX - area.left) / area.width - 0.5;
    const y = (pointerY - area.top) / area.height - 0.5;
    object.style.setProperty("--book-yaw", (2.8 * x).toFixed(2) + "deg");
    object.style.setProperty("--book-pitch", (-2.1 * y).toFixed(2) + "deg");
  }
  function restView() {
    cancelAnimationFrame(frame);
    frame = 0;
    object.style.removeProperty("--book-yaw");
    object.style.removeProperty("--book-pitch");
  }
  object.addEventListener("pointermove", (e) => {
    if (drag || !canTilt.matches || e.pointerType !== "mouse") return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (!frame) frame = requestAnimationFrame(updateView);
  });
  object.addEventListener("pointerleave", restView);
  canTilt.addEventListener("change", restView);
  window.addEventListener("resize", interrupt);
  motionPreference.addEventListener("change", () => {
    dismissHint();
    interrupt();
  });
  window.addEventListener("blur", interrupt);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interrupt();
  });
  window.addEventListener("pagehide", () => {
    dismissHint();
    interrupt();
    restView();
  });
  list.setAttribute("role", "presentation");
  list.removeAttribute("aria-label");
  commit(0);
  book.classList.add("book-ready");
  tabs.hidden = false;
  pager.hidden = false;
  book.querySelector(".wire-binding").hidden = false;
}
