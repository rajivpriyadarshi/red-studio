// Three drawn studies share the same projection, so the traces can interpolate
// continuously when a visitor changes discipline.
export function mountScope(canvas, reduce, readLevel, signal) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const panel = canvas.closest(".practice");
  const palettes = [
    ["#30264f", "#e6d5ff", "#a69df8"],
    ["#162f3f", "#b3f7e7", "#53b3cd"],
    ["#542838", "#ffd1ab", "#ff917b"],
  ];
  const compact = matchMedia("(max-width: 740px)").matches;
  const samples = compact ? 100 : 152,
    lines = compact ? 40 : 56,
    tau = Math.PI * 2;
  let weights = [1, 0, 0],
    index = 0,
    width = 0,
    height = 0,
    frame = 0,
    shown = false,
    last = 0,
    time = 0;
  let amplitude = 0,
    targetX = 0,
    targetY = 0,
    px = 0,
    py = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio, 1.6);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    schedule();
  }
  function schedule() {
    if (!frame && shown && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!shown || document.hidden || !width || !height) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!reduce.matches) time += dt;
    const damp = reduce.matches ? 1 : 1 - Math.exp(-dt * 8);
    weights = weights.map((w, i) => w + ((i === index ? 1 : 0) - w) * damp);
    px += (targetX - px) * damp;
    py += (targetY - py) * damp;
    ctx.clearRect(0, 0, width, height);
    amplitude += (readLevel() - amplitude) * 0.26;
    const size =
      Math.min(width * 0.384, height * 0.404) * (1 + amplitude * 0.15);
    const ay = -0.31 + px * 0.25 + 0.05 * Math.sin(time * 0.21),
      ax = 0.19 + py * 0.19;
    const cosY = Math.cos(ay),
      sinY = Math.sin(ay),
      cosX = Math.cos(ax),
      sinX = Math.sin(ax);
    const cosZ = Math.cos(-0.19),
      sinZ = Math.sin(-0.19);
    const reveal = reduce.matches ? 1 : signal.open;
    ctx.lineJoin = "round";
    for (let j = 0; j < lines; j++) {
      const layer = j / (lines - 1),
        u = (layer - 0.5) * 2;
      // The lines start as a single travelling signal. Each successive winding
      // takes a little longer to open into its final projected contour.
      const unfurl = Math.max(0, Math.min(1, (reveal - 0.24 * layer) / 0.76));
      const open = unfurl * unfurl * (3 - 2 * unfurl);
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const a = (tau * i) / samples,
          ca = Math.cos(a),
          sa = Math.sin(a);
        // A bent section of an acoustic wave, a folded film loop, a pleated fan.
        const lobe =
          0.58 +
          0.13 * Math.sin(3 * a + u * 3.4 + time * 0.48) +
          0.08 * Math.cos(2 * a - u * 2.7) +
          amplitude * 0.12 * Math.cos(a * 5 + u * 3.5);
        const x0 = ca * lobe + u * 0.64,
          y0 = sa * lobe + Math.sin(u * 2.5 + time * 0.42) * 0.23,
          z0 = u * 0.62 + Math.cos(a + u * 2.1) * 0.3;
        const ribbon = 0.8 + 0.27 * u * Math.cos(2 * a + 0.5 * time);
        const x1 = ca * ribbon * 1.24,
          y1 = sa * ribbon * 0.68 + 0.23 * Math.sin(2 * a + time * 0.27),
          z1 =
            0.37 * Math.sin(2 * a + time * 0.27) +
            0.27 * u * Math.sin(2 * a + 0.5 * time);
        const r =
          0.49 + 0.2 * Math.cos(6 * a + u * 2.6 + time * 0.31) + 0.15 * layer;
        const x2 = r * ca * 1.28 + u * 0.46,
          y2 = r * sa + 0.27 * Math.sin(1.6 * u),
          z2 = 0.65 * u + 0.15 * Math.cos(6 * a);
        const x = x0 * weights[0] + x1 * weights[1] + x2 * weights[2],
          y = y0 * weights[0] + y1 * weights[1] + y2 * weights[2],
          z = z0 * weights[0] + z1 * weights[1] + z2 * weights[2];
        const xx = x * cosY + z * sinY,
          zz = z * cosY - x * sinY,
          yy = y * cosX - zz * sinX;
        const scale = size / (1 - (zz * cosX + y * sinX) * 0.13);
        const sx = width * 0.5 + (xx * cosZ - yy * sinZ) * scale,
          sy = height * 0.49 + (xx * sinZ + yy * cosZ) * scale;
        let plottedX = sx, plottedY = sy;
        if (open < 1) {
          const waveX = (0.13 + (i / samples) * 0.74) * width;
          const waveY = height * (0.5 + u * 0.012 + Math.sin(2 * a + layer * 0.9) * 0.032);
          plottedX = waveX + (sx - waveX) * open;
          plottedY = waveY + (sy - waveY) * open;
        }
        if (i === 0) ctx.moveTo(plottedX, plottedY);
        else ctx.lineTo(plottedX, plottedY);
      }
      ctx.strokeStyle = j % 8 === 0 ? palettes[index][1] : palettes[index][2];
      ctx.globalAlpha = 0.41 + 0.43 * layer;
      ctx.lineWidth = j % 8 === 0 ? 1.35 : 0.85;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!reduce.matches) schedule();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    shown = entry.isIntersecting;
    last = 0;
    if (shown) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(panel);
  panel.addEventListener("pointermove", (e) => {
    if (reduce.matches || e.pointerType === "touch") return;
    const b = panel.getBoundingClientRect();
    targetX = (e.clientX - b.left) / b.width - 0.5;
    targetY = (e.clientY - b.top) / b.height - 0.5;
  });
  panel.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
  });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    schedule();
  });
  reduce.addEventListener("change", () => {
    targetX = targetY = 0;
    schedule();
  });
  return (n) => {
    index = n;
    panel.style.setProperty("--stage", palettes[n][0]);
    schedule();
  };
}
