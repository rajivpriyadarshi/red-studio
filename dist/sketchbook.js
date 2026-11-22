import { turnPaper } from "./sketchbook-paper.js?v=2";

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
  let stopTurn;
  function cancelTurn() {
    stopTurn?.();
    stopTurn = undefined;
  }

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

  function select(index, announce = false) {
    if (index < 0 || index >= pages.length) return;
    const previous = current;
    cancelTurn();
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
    if (index === previous) return;
    if (!motionPreference.matches && typeof bound.animate === "function") {
      stopTurn = turnPaper(
        bound,
        pages[previous],
        pages[index],
        index > previous,
        small.matches,
        () => {
          stopTurn = undefined;
        },
      );
    }
    if (announce)
      status.textContent = pages[index].querySelector("h3").textContent;
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
  let drag = null;
  bound.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !e.isPrimary || !e.target.closest(".book-art"))
      return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    bound.setPointerCapture(e.pointerId);
  });
  bound.addEventListener("pointerup", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > 1.4 * Math.abs(dy))
      select(current + (dx < 0 ? 1 : -1), true);
  });
  bound.addEventListener("lostpointercapture", () => {
    drag = null;
  });
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
  book.addEventListener("pointermove", (e) => {
    if (!canTilt.matches || e.pointerType !== "mouse") return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (!frame) frame = requestAnimationFrame(updateView);
  });
  book.addEventListener("pointerleave", restView);
  canTilt.addEventListener("change", restView);
  window.addEventListener("resize", cancelTurn);
  motionPreference.addEventListener("change", cancelTurn);
  window.addEventListener("pagehide", () => {
    cancelTurn();
    restView();
  });
  list.setAttribute("role", "presentation");
  list.removeAttribute("aria-label");
  select(0);
  book.classList.add("book-ready");
  tabs.hidden = false;
  pager.hidden = false;
  book.querySelector(".wire-binding").hidden = false;
}
