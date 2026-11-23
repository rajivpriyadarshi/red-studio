// Zoom at the bench pivot keeps the point between the visitor's fingers in place.
// TouchEvents let the canvas claim a two-finger gesture while a one-finger
// vertical swipe continues to scroll the page.
export function mountPressZoom(canvas, viewSize, interrupt, wake) {
  const min = 0.65,
    max = 2;
  let scale = 1,
    x = 0,
    y = 0,
    pair = null,
    safari = null;
  const clamp = (v, l, h) => Math.max(l, Math.min(h, v));
  const center = { x: 0, y: 0 };
  function point(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return center;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width - 0.5,
      y: 0.5 - (clientY - rect.top) / rect.height,
    };
  }
  function change(request, from, to = from) {
    const next = clamp(request, min, max);
    if (next === scale && from.x === to.x && from.y === to.y) return;
    const { width: w, height: h } = viewSize;
    x = clamp(x + w * (from.x / scale - to.x / next), -0.4 * w, 0.4 * w);
    y = clamp(y + h * (from.y / scale - to.y / next), -0.42 * h, 0.42 * h);
    scale = next;
    wake();
  }
  canvas.addEventListener(
    "wheel",
    (e) => {
      // Chromium and Firefox encode trackpad pinches as Ctrl+wheel.
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (pair || safari) return;
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
      const factor = Math.exp(-clamp(e.deltaY * unit, -250, 250) * 0.009);
      change(scale * factor, point(e.clientX, e.clientY));
    },
    { passive: false },
  );

  function fingers(touches) {
    const a = touches[0],
      b = touches[1];
    return {
      distance: Math.max(
        1,
        Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      ),
      point: point((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2),
      first: a.identifier,
      second: b.identifier,
    };
  }
  function touch(e) {
    if (e.targetTouches.length < 2) {
      pair = null;
      return;
    }
    if (e.cancelable) e.preventDefault();
    const next = fingers(e.targetTouches);
    if (pair && pair.first === next.first && pair.second === next.second) {
      change((scale * next.distance) / pair.distance, pair.point, next.point);
    } else interrupt();
    pair = next;
    safari = null;
  }
  for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"])
    canvas.addEventListener(name, touch, { passive: false });

  // Safari sends these gestures for a Mac trackpad; Chromium sends Ctrl+wheel.
  canvas.addEventListener(
    "gesturestart",
    (e) => {
      e.preventDefault();
      if (pair) return;
      interrupt();
      safari = { last: e.scale || 1, point: point(e.clientX, e.clientY) };
    },
    { passive: false },
  );
  canvas.addEventListener(
    "gesturechange",
    (e) => {
      e.preventDefault();
      if (!safari || pair || !(e.scale > 0)) return;
      const next = point(e.clientX, e.clientY);
      change((scale * e.scale) / safari.last, safari.point, next);
      safari = { last: e.scale, point: next };
    },
    { passive: false },
  );
  canvas.addEventListener(
    "gestureend",
    (e) => {
      e.preventDefault();
      safari = null;
    },
    { passive: false },
  );
  return {
    cancel() {
      pair = safari = null;
    },
    get active() {
      return !!(pair || safari);
    },
    get scale() {
      return scale;
    },
    get x() {
      return x;
    },
    get y() {
      return y;
    },
  };
}
