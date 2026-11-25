// Sample each original contour separately. Keeping the end of every SVG command
// preserves the sharp corners of the type, including the inside of the counters.
function sampleContours(outline) {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
  return outline.match(/M[^M]*/g).map(contour => {
    const points = [];
    let prefix = "", length = 0;
    for (const command of contour.match(/[A-Z][^A-Z]*/g)) {
      prefix += command;
      probe.setAttribute("d", prefix);
      const end = probe.getTotalLength();
      if (end <= length) continue;
      const steps = Math.ceil((end - length) / 5);
      for (let i = points.length ? 1 : 0; i <= steps; i++) {
        const { x, y } = probe.getPointAtLength(length + (end - length) * i / steps);
        points.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
      }
      length = end;
    }
    return points;
  });
}

export function mountRubberType(mark, motion) {
  if (!mark) return;
  const mouse = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const letters = new Map();
  const moving = new Set();
  let pressed = null, pointer = null, contactChanged = false;
  let frame = 0, previousTime = 0;

  function prepare(group) {
    if (letters.has(group)) return letters.get(group);
    const face = group.querySelector(".ink-letter");
    const outline = face.getAttribute("d");
    const letter = { face, outline, box: face.getBBox(), contours: sampleContours(outline) };
    // The cursor keeps touching the resting silhouette even as the ink recedes.
    const hit = face.cloneNode();
    hit.removeAttribute("class");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "fill");
    group.append(hit);
    face.setAttribute("pointer-events", "none");
    letters.set(group, letter);
    return letter;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function release() {
    if (!pressed) return;
    for (const contour of pressed.contours) {
      for (const p of contour) p.tx = p.ty = 0;
    }
    moving.add(pressed);
    schedule();
    pressed = null;
  }
  function press(group, clientX, clientY) {
    const letter = group && prepare(group);
    if (letter !== pressed) release();
    if (!letter) return;
    const matrix = group.getScreenCTM();
    if (!matrix) return;
    const { x, y } = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    const { x: left, y: top, width, height } = letter.box;
    const nx = 1 - 2 * (x - left) / width, ny = 1 - 2 * (y - top) / height;
    const reach = Math.hypot(nx, ny);
    const ux = reach ? nx / reach : 0, uy = reach ? ny / reach : 0;
    const pressure = Math.min(1, reach);

    for (const contour of letter.contours) {
      for (const p of contour) {
        const dx = p.x - x, dy = p.y - y;
        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * 23 * 23));
        // Push the touched edge inward and let its shoulders bulge sideways.
        // Near the centre the same field pinches the stroke around the pointer.
        const along = dx * ux + dy * uy;
        p.tx = weight * (16 * pressure * ux - .50 * dx + .70 * pressure * (dx - along * ux));
        p.ty = weight * (16 * pressure * uy - .50 * dy + .70 * pressure * (dy - along * uy));
      }
    }
    pressed = letter;
    moving.add(letter);
  }

  function tick(now) {
    if (contactChanged) {
      contactChanged = false;
      press(pointer.group, pointer.x, pointer.y);
    }
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .04) : 1 / 60;
    const steps = Math.max(1, Math.ceil(dt * 120));
    const step = dt / steps;
    previousTime = now;
    for (const letter of moving) {
      let unsettled = false;
      const path = letter.contours.map(contour => {
        let segment = "M";
        for (const p of contour) {
          for (let i = 0; i < steps; i++) {
            p.vx += ((p.tx - p.dx) * 540 - p.vx * 22) * step;
            p.vy += ((p.ty - p.dy) * 540 - p.vy * 22) * step;
            p.dx += p.vx * step;
            p.dy += p.vy * step;
          }
          if (Math.abs(p.tx - p.dx) + Math.abs(p.ty - p.dy) > .04 ||
              Math.abs(p.vx) + Math.abs(p.vy) > .6) unsettled = true;
          segment += (p.x + p.dx).toFixed(2) + " " + (p.y + p.dy).toFixed(2) + " ";
        }
        return segment + "Z";
      }).join("");
      letter.face.setAttribute("d", !unsettled && letter !== pressed ? letter.outline : path);
      if (!unsettled) moving.delete(letter);
    }
    frame = moving.size ? requestAnimationFrame(tick) : 0;
    if (!frame) previousTime = 0;
  }

  function track(event) {
    if (event.pointerType !== "mouse" || !mouse.matches || motion.matches) return;
    pointer = { group: event.target.closest(".flight-letter"), x: event.clientX, y: event.clientY };
    if (!document.documentElement.classList.contains("title-running")) {
      contactChanged = true;
      schedule();
    }
  }
  function leave() {
    pointer = null;
    contactChanged = false;
    release();
  }
  function reset() {
    leave();
    cancelAnimationFrame(frame);
    frame = previousTime = 0;
    for (const letter of moving) {
      letter.face.setAttribute("d", letter.outline);
      for (const contour of letter.contours) {
        for (const p of contour) p.dx = p.dy = p.vx = p.vy = p.tx = p.ty = 0;
      }
    }
    moving.clear();
  }

  mark.addEventListener("pointermove", track);
  mark.addEventListener("pointerover", track);
  mark.addEventListener("pointerleave", leave);
  mark.addEventListener("pointercancel", leave);
  window.addEventListener("studio:title-end", () => {
    if (pointer && mouse.matches && !motion.matches && !document.hidden) {
      const target = document.elementFromPoint(pointer.x, pointer.y);
      pointer.group = target?.closest(".flight-letter");
      contactChanged = true;
      schedule();
    }
  }, { once: true });
  window.addEventListener("scroll", leave, { passive: true });
  window.addEventListener("resize", leave);
  window.addEventListener("blur", reset);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  function checkPreference() {
    if (!mouse.matches || motion.matches) reset();
  }
  mouse.addEventListener("change", checkPreference);
  motion.addEventListener("change", checkPreference);
}
