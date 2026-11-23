// The sheet has one material coordinate system for its ink, fold and reverse.
// Its transparent edge uncovers the live page directly, including the playing film.
const paper = "#f3ebdb";
const ink = "#df3e26";
const clamp = (v) => Math.max(0, Math.min(1, v));
function ease(v) {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
}
const nx = 0.82;
const ny = Math.sqrt(1 - nx * nx);

function paperGrain() {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const brush = tile.getContext("2d");
  if (!brush) return null;
  const pixels = brush.createImageData(96, 96);
  let seed = 51;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const light = seed > 0x80000000;
    pixels.data[i] = light ? 255 : 73;
    pixels.data[i + 1] = light ? 250 : 42;
    pixels.data[i + 2] = light ? 235 : 19;
    pixels.data[i + 3] = 3 + (seed >>> 28);
  }
  brush.putImageData(pixels, 0, 0);
  return tile;
}

// The numbers are release times, in seconds. RED opens first, THE fits into
// its margin and the lower line follows. Each sort turns on a cut edge.
const setting = {
  the: [
    { at: 0.11, edge: "foot", twist: -4 },
    { at: 0.26, edge: "left", twist: -3 },
    { at: 0.44, edge: "left", twist: -3 },
  ],
  red: [
    { at: -0.26, edge: "left", twist: -5 },
    { at: 0.07, edge: "foot", twist: 3 },
    { at: 0.33, edge: "right", twist: 4 },
  ],
  studio: [
    { at: 0.55, edge: "foot", twist: -8 },
    { at: 0.71, edge: "left", twist: 4 },
    { at: 0.87, edge: "foot", twist: -4 },
    { at: 1.03, edge: "right", twist: 5 },
    { at: 1.19, edge: "left", twist: -9 },
    { at: 1.35, edge: "left", twist: 32, roll: true },
  ],
};
const settingTime = 0.94;
const lastImpression = 2.55;
const endTime = 4.7;

function makeFaces(mark, width, height, dpr, grain) {
  const paths = [...mark.querySelectorAll(".ink-letter")];
  if (paths.length !== 9) return;
  const glyphs = paths.map((p) => ({
    path: new Path2D(p.getAttribute("d")),
    width: p.getBBox().width,
  }));
  const prefix = [
    glyphs[4],
    { path: new Path2D("M0 0H29V34H61V0H90V92H61V58H29V92H0Z"), width: 90 },
    glyphs[1],
  ];
  const span = nx * width + ny * height;
  const depth = ny * width + nx * height;
  const ratio = Math.min(dpr, 1920 / Math.max(span, depth), Math.sqrt(2000000 / (span * depth)));
  const margin = width * 0.052;
  const available = width - margin * 2;
  const tall = height > width * 1.3;
  const topHeight = Math.min(available * (tall ? 0.55 : 0.4), height * 0.43);
  const bottomHeight = Math.min(
    available * (tall ? 0.33 : 0.235),
    height * 0.29,
  );
  const gutter = Math.max(4, Math.min(width, height) * 0.013);
  const y = (height - topHeight - bottomHeight - gutter) / 2;
  const prefixWidth = topHeight * 0.255;
  const letters = [];

  // Both the moving type and the two sides of the turning sheet use these
  // exact-size paths. Nothing is swapped or re-aligned at the moment of contact.
  function row(shapes, cues, x, top, w, h, rotate = 0) {
    const gap = 3.3;
    const units =
      shapes.reduce((sum, glyph) => sum + glyph.width, 0) +
      gap * (shapes.length - 1);
    const sx = w / units,
      sy = h / 96;
    let advance = 0;
    shapes.forEach((glyph, i) => {
      const path = new Path2D();
      path.addPath(glyph.path, new DOMMatrix([sx, 0, 0, sy, 0, 2 * sy]));
      letters.push({
        ...cues[i],
        path,
        x: x + Math.cos(rotate) * advance,
        y: top + Math.sin(rotate) * advance,
        w: glyph.width * sx,
        h,
        rotate,
        neighbourAt: cues[i + 1]
          ? cues[i + 1].at + settingTime - 0.09
          : Infinity,
      });
      advance += (glyph.width + gap) * sx;
    });
  }
  row(
    prefix,
    setting.the,
    margin,
    y + topHeight,
    topHeight,
    prefixWidth,
    -Math.PI / 2,
  );
  const redX = margin + prefixWidth + gutter;
  row(
    glyphs.slice(0, 3),
    setting.red,
    redX,
    y,
    width - margin - redX,
    topHeight,
  );
  row(
    glyphs.slice(3),
    setting.studio,
    margin,
    y + topHeight + gutter,
    available,
    bottomHeight,
  );

  function face(stock, pigment) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(span * ratio);
    canvas.height = Math.ceil(depth * ratio);
    const c = canvas.getContext("2d");
    if (!c) return null;
    c.setTransform(
      nx * ratio,
      -ny * ratio,
      ny * ratio,
      nx * ratio,
      0,
      ny * width * ratio,
    );
    c.fillStyle = stock;
    c.fillRect(0, 0, width, height);
    c.fillStyle = pigment;
    for (const letter of letters) {
      c.save();
      c.translate(letter.x, letter.y);
      c.rotate(letter.rotate);
      c.fill(letter.path, "evenodd");
      c.restore();
    }
    if (grain) {
      c.fillStyle = c.createPattern(grain, "repeat");
      c.fillRect(0, 0, width, height);
    }
    return canvas;
  }
  return {
    span, depth, ratio, letters, front: null, back: null,
    prepareFront() { this.front ||= face(paper, ink); },
    prepareBack() { this.back ||= face("#e7cbb1", "#cda990"); }
  };
}

// Project a real hinge in two views: the camera sees the face, while the
// low light casts the same raised outline farther across the paper.
function drawSort(c, letter, t, shadow) {
  if (t < letter.at) return;
  const progress = clamp((t - letter.at) / settingTime);
  const open = 1 - ease(progress);
  const angle = open * (letter.roll ? 1.0 : 1.42);
  const sine = Math.sin(angle),
    cosine = Math.cos(angle);
  const contact = clamp((t - letter.neighbourAt) / 0.29);
  const give = Math.sin(contact * Math.PI) ** 2;
  const twist = ((letter.twist * open - 0.85 * give) * Math.PI) / 180;
  const foot = letter.edge === "foot";
  const hingeX = foot ? letter.w / 2 : letter.edge === "right" ? letter.w : 0;
  const hingeY = letter.h;
  const normalX = foot ? 0 : letter.edge === "left" ? sine : -sine;
  const normalY = foot ? -sine : 0;
  const rx = letter.rotate + twist;
  const lightX = shadow ? 0.29 : 0,
    lightY = shadow ? 0.3 : -0.19;
  const px = lightX * Math.cos(rx) + lightY * Math.sin(rx);
  const py = -lightX * Math.sin(rx) + lightY * Math.cos(rx);
  const arrival = letter.roll ? 0.48 : 0.065;
  const dx = letter.w * (arrival * open - 0.009 * give);
  const dy = -letter.h * 0.032 * open;
  c.save();
  c.globalAlpha = ease((t - letter.at) / .13);
  c.translate(letter.x, letter.y);
  c.rotate(letter.rotate);
  c.translate(dx + hingeX, dy + hingeY);
  c.rotate(twist);
  const a = (foot ? 1 : cosine) + px * normalX;
  const b = py * normalX;
  const cc = px * normalY;
  const d = (foot ? cosine : 1) + py * normalY;
  const e = -a * hingeX - cc * hingeY;
  const f = -b * hingeX - d * hingeY;
  if (shadow) {
    if (open > 0.002) {
      c.transform(a, b, cc, d, e, f);
      c.fillStyle = "rgba(91,43,25," + (0.08 + open * 0.12) + ")";
      c.fill(letter.path, "evenodd");
    }
  } else {
    // Edge and face meet on the sheet as the sort deposits its ink.
    const relief = Math.min(letter.w, letter.h) * 0.052 * sine;
    if (relief > 0.35) {
      const ex = foot ? 0 : letter.edge === "left" ? -relief : relief;
      const ey = foot ? relief : relief * 0.2;
      const slices = Math.ceil(relief / 1.6);
      for (let i = slices; i > 0; i--) {
        c.save();
        c.transform(a, b, cc, d, e + (ex * i) / slices, f + (ey * i) / slices);
        c.fillStyle = i === slices ? "#68291f" : "#9d3828";
        c.fill(letter.path, "evenodd");
        c.restore();
      }
    }
    c.transform(a, b, cc, d, e, f);
    c.fillStyle =
      open === 0
        ? ink
        : "rgb(" +
          Math.round(223 + 16 * open) +
          "," +
          Math.round(62 + 32 * open) +
          "," +
          Math.round(38 + 21 * open) +
          ")";
    c.fill(letter.path, "evenodd");
  }
  c.restore();
}

export function playPrintIntro(mark, preference) {
  const query = new URLSearchParams(location.search);
  if (
    preference.matches ||
    !["", "#top", "#work"].includes(location.hash) ||
    performance.getEntriesByType("navigation")[0]?.type === "back_forward" ||
    ["package", "packages", "independent", "budget"].some((key) =>
      query.has(key),
    ) ||
    !window.DOMMatrix ||
    !window.Path2D?.prototype.addPath
  )
    return;

  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d");
  if (!c) return;
  canvas.className = "print-intro";
  canvas.setAttribute("aria-hidden", "true");
  let width,
    height,
    dpr,
    stock,
    frame,
    lastPaint = -Infinity,
    visibleSince = null,
    elapsed = 0,
    finished = false,
    galleryReady = false;
  const grain = paperGrain();
  const surface = grain && c.createPattern(grain, "repeat");
  const events = new AbortController();
  const options = { signal: events.signal, passive: true, capture: true };
  function releaseFaces() {
    for (const face of [stock?.front, stock?.back]) {
      if (face) face.width = face.height = 1;
    }
    stock = null;
  }
  function resize() {
    const w = document.documentElement.clientWidth,
      h = innerHeight;
    if (width === w && height === h) return;
    width = w;
    height = h;
    dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2000000 / (w * h)));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    releaseFaces();
    stock = makeFaces(mark, width, height, dpr, grain);
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    events.abort();
    canvas.remove();
    canvas.width = canvas.height = 1;
    releaseFaces();
    document.documentElement.classList.remove("title-running");
    window.dispatchEvent(new Event("studio:title-end"));
  }
  for (const type of [
    "pointerdown",
    "touchstart",
    "wheel",
    "keydown",
    "pagehide",
    "hashchange",
  ]) {
    window.addEventListener(type, finish, options);
  }
  // Fragment navigation and scroll restoration also dispatch scroll events.
  // The input listeners above handle deliberate skips without cancelling on load.
  window.addEventListener("resize", () => {
    if (!document.hidden) resize();
  }, options);
  function syncVisibility() {
    cancelAnimationFrame(frame);
    if (document.hidden) {
      if (visibleSince !== null) elapsed += performance.now() - visibleSince;
      visibleSince = null;
    } else {
      resize();
      frame = requestAnimationFrame(draw);
    }
  }
  document.addEventListener("visibilitychange", syncVisibility, options);
  preference.addEventListener("change", finish, options);

  // Map an interval of printed paper to its projected width. A negative width
  // turns the print over, so lettering on the reverse stays attached to the fold.
  function strip(source, u0, u1, x0, x1) {
    if (u1 <= u0 || Math.abs(x1 - x0) < 0.0005) return;
    const scale = (x1 - x0) / (u1 - u0);
    c.save();
    c.translate(x0, 0);
    c.scale(scale, 1);
    const r = stock.ratio;
    c.drawImage(
      source,
      u0 * r,
      0,
      (u1 - u0) * r,
      source.height,
      0,
      0,
      u1 - u0,
      source.height / r,
    );
    c.restore();
  }

  // Bounds of the rectangular sheet along a section parallel to the fold.
  function edge(u, far) {
    const v = far
      ? Math.min((nx * u) / ny, (height - ny * u) / nx)
      : Math.max((nx * u - width) / ny, (-ny * u) / nx);
    return ny * width + v;
  }

  function turn(p) {
    const span = stock.span;
    const radius =
      Math.min(width, height, 1240) * (0.047 + 0.049 * Math.sin(Math.PI * p));
    const fold = span - p * (span + radius * 1.06);
    const mid = Math.max(0, Math.min(span, fold + (radius * Math.PI) / 2));
    const rim = fold + radius;
    const shadowWidth = radius * 0.76;
    const shadow = c.createLinearGradient(rim - 2, 0, rim + shadowWidth, 0);
    shadow.addColorStop(0, "rgba(55,28,16,0.27)");
    shadow.addColorStop(0.36, "rgba(55,28,16,0.12)");
    shadow.addColorStop(1, "rgba(55,28,16,0)");
    c.fillStyle = shadow;
    c.fillRect(
      rim - 2,
      edge(mid, false),
      shadowWidth + 2,
      edge(mid, true) - edge(mid, false),
    );
    const flat = Math.max(0, fold);
    strip(stock.front, 0, flat, 0, flat + 0.45 / dpr);

    // Project the free flap onto the flat paper. This shadow follows the lifted
    // corner and tapers away at its hinge, including on tall, narrow sheets.
    const tail = Math.max(0, fold + Math.PI * radius);
    const projectTail = (u) => 2 * fold + Math.PI * radius - u;
    if (tail < span && flat > 0) {
      const corners = [tail, nx * width, ny * height, span]
        .filter((u) => u >= tail)
        .sort((a, b) => a - b);
      c.save();
      c.beginPath();
      c.rect(0, 0, flat + 1, stock.depth);
      c.clip();
      c.beginPath();
      corners.forEach((u, i) => {
        const x = projectTail(u),
          v = edge(u, false);
        if (i === 0) c.moveTo(x, v);
        else c.lineTo(x, v);
      });
      for (let i = corners.length - 1; i >= 0; i--) {
        const u = corners[i];
        c.lineTo(projectTail(u), edge(u, true));
      }
      c.closePath();
      c.fillStyle = "rgba(56,33,19,0.24)";
      c.shadowColor = "rgba(58,32,17,0.42)";
      c.shadowBlur = Math.min(radius * 0.34 * dpr, 36);
      c.shadowOffsetX = -radius * 0.065 * dpr;
      c.shadowOffsetY = radius * 0.12 * dpr;
      c.fill();
      c.restore();
    }
    // Project a cylinder: material arc length is preserved as the sheet turns.
    const step = Math.PI / 60;
    for (let i = 0; i < 60; i++) {
      const u0 = Math.max(0, fold + i * step * radius);
      const u1 = Math.min(span, fold + (i + 1) * step * radius);
      if (u1 <= u0) continue;
      const a = (u0 - fold) / radius,
        b = (u1 - fold) / radius;
      const x0 = fold + radius * Math.sin(a),
        x1 = fold + radius * Math.sin(b);
      const angle = (a + b) / 2;
      const reverse = i >= 30;
      // A subpixel overlap keeps adjacent sampling strips watertight.
      const end = x1 + (Math.sign(x1 - x0) * 0.55) / dpr;
      strip(reverse ? stock.back : stock.front, u0, u1, x0, end);
      const light =
        Math.sin(angle) * (reverse ? -0.2 * Math.cos(angle * 1.45) : -0.2);
      c.fillStyle =
        light > 0
          ? "rgba(255,248,223," + light + ")"
          : "rgba(61,30,18," + -light + ")";
      c.beginPath();
      c.moveTo(x0, edge(u0, false));
      c.lineTo(end, edge(u1, false));
      c.lineTo(end, edge(u1, true));
      c.lineTo(x0, edge(u0, true));
      c.closePath();
      c.fill();
    }
    strip(stock.back, tail, span, projectTail(tail), projectTail(span));
  }

  document.body.append(canvas);
  document.documentElement.classList.add("title-running");
  function draw(now) {
    if (finished || document.hidden) return;
    if (!stock) return finish();
    if (visibleSince === null) visibleSince = now;
    const t = (elapsed + now - visibleSince) / 1000;
    if (t >= endTime) return finish();
    if (now - lastPaint < 1000 / 30 - 1) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastPaint = now;
    // Prepare each large reverse/face image in a separate frame while type is
    // setting. A skipped title never has to allocate both surfaces on entry.
    if (t > 0.65 && !stock.front) stock.prepareFront();
    else if (t > 1.5 && !stock.back) stock.prepareBack();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    if (t < lastImpression) {
      canvas.dataset.phase = "typeset";
      c.fillStyle = paper;
      c.fillRect(0, 0, width, height);
      for (const letter of stock.letters) drawSort(c, letter, t, true);
      for (const letter of stock.letters) drawSort(c, letter, t, false);
      if (surface) {
        c.fillStyle = surface;
        c.fillRect(0, 0, width, height);
      }
    } else {
      if (!stock.front || !stock.back) {
        frame = requestAnimationFrame(draw);
        return;
      }
      canvas.dataset.phase = "turn";
      c.transform(nx, ny, -ny, nx, ny * ny * width, -nx * ny * width);
      const p =
        0.11 * ease((t - lastImpression) / 0.98) +
        0.89 * ease((t - 3.03) / (endTime - 3.03));
      if (p > 0.26 && !galleryReady) {
        galleryReady = true;
        window.dispatchEvent(new Event("studio:film-reveal"));
      }
      turn(p);
    }
    frame = requestAnimationFrame(draw);
  }
  syncVisibility();
}
