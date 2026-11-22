// Each band carries a narrow crop of the real page on each side. The turn
// accumulates their angles from the binding, so every edge meets its neighbour.
export function turnPaper(bound, from, to, forward, topBound, settled) {
  const art = ".book-art";
  const note = ".book-note";
  const front = topBound
    ? (forward ? from : to).querySelector(art)
    : from.querySelector(forward ? note : art);
  const reverse = topBound ? null : to.querySelector(forward ? art : note);
  const sheet = getComputedStyle(front);
  const width = parseFloat(sheet.width);
  const height = parseFloat(sheet.height);
  const length = topBound ? height : width;
  const count = topBound ? 9 : 14;
  const bandSize = length / count;
  const direction = topBound || forward ? 1 : -1;
  const timing = {
    duration: topBound ? 630 : 810,
    easing: "cubic-bezier(.42,.04,.22,1)",
    fill: "both",
  };

  function layer(className) {
    const el = document.createElement("div");
    el.className = className;
    el.inert = true;
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  const leaf = layer("book-leaf");
  const underlay = layer("book-underlay");
  const shadowClip = layer("book-shadow-clip");
  const shadow = document.createElement("i");
  shadowClip.append(shadow);
  if (topBound) {
    leaf.classList.add("top-bound");
    shadowClip.classList.add("top-bound");
    if (!forward) {
      underlay.classList.add("top-bound");
      underlay.append(from.querySelector(art).cloneNode(true));
    }
  } else {
    underlay.style.left = forward ? "0" : "50%";
    underlay.append(from.querySelector(forward ? art : note).cloneNode(true));
  }

  function face(source, crop, back) {
    const surface = document.createElement("div");
    surface.className = back ? "paper-face verso" : "paper-face";
    if (source) {
      const copy = source.cloneNode(true);
      Object.assign(copy.style, {
        width: width + "px",
        height: height + "px",
        left: (topBound ? 0 : -crop) + "px",
        top: (topBound ? -crop : 0) + "px",
      });
      surface.append(copy);
    }
    return surface;
  }

  const bands = Array.from({ length: count }, (_, i) => {
    const strip = document.createElement("div");
    strip.className = "paper-band";
    const overlap = i === count - 1 ? 0 : 0.55;
    strip.style[topBound ? "height" : "width"] = bandSize + overlap + "px";
    const near = i * bandSize;
    const far = length - near - bandSize;
    const recto = face(front, direction === 1 ? near : far, false);
    const verso = face(
      reverse,
      direction === 1 ? far - overlap : near - overlap,
      true,
    );
    const ink = document.createElement("i");
    ink.className = "paper-shade";
    const backInk = ink.cloneNode();
    recto.append(ink);
    verso.append(backInk);
    strip.append(recto, verso);
    leaf.append(strip);
    return { strip, ink, backInk, pose: [], light: [] };
  });

  const cast = [];
  const edge = [];
  const samples = 28;
  for (let frame = 0; frame <= samples; frame++) {
    const time = frame / samples;
    const p = topBound && !forward ? 1 - time : time;
    const lift = Math.sin(Math.PI * p);
    let x = 0,
      z = 0,
      shadowMin = 0,
      shadowMax = 0;
    bands.forEach((band, i) => {
      const u = (i + 0.5) / count;
      // The free edge curls ahead of the spine, then unfurls onto the desk.
      const bend = lift * (u - 0.42) * (topBound ? 1.05 : 1.6);
      const angle = (topBound ? Math.PI * 0.55 : Math.PI) * p + bend;
      const nextX = x + direction * bandSize * Math.cos(angle);
      const nextZ = z + bandSize * Math.sin(angle);
      const a = (angle * 180) / Math.PI;
      const origin = direction === 1 ? x : nextX;
      const depth = direction === 1 ? z : nextZ;
      const transform = topBound
        ? `translate3d(0,${origin}px,${depth}px) rotateX(${a}deg)`
        : `translate3d(${origin}px,0,${depth}px) rotateY(${-direction * a}deg)`;
      band.pose.push({ transform });
      band.light.push({
        opacity: lift * (0.12 + 0.27 * Math.abs(Math.sin(angle))),
      });
      x = nextX;
      z = nextZ;
      // Parallel light from above and left projects the bent edge onto the stock.
      const projection = x + z * (topBound ? 0.31 : 0.43);
      shadowMin = Math.min(shadowMin, projection);
      shadowMax = Math.max(shadowMax, projection);
    });
    const scale = Math.max(0.025, (shadowMax - shadowMin) / length);
    cast.push({
      transform: topBound
        ? `translateY(${shadowMin}px) scaleY(${scale})`
        : `translateX(${shadowMin}px) scaleX(${scale})`,
      opacity: lift * 0.72,
    });
    // As a top-bound sheet goes edge-on, it clears the small screen.
    if (topBound) edge.push({ opacity: Math.min(1, (1 - p) * 5) });
  }

  if (underlay.childElementCount) bound.append(underlay);
  bound.append(shadowClip, leaf);
  const animations = [shadow.animate(cast, timing)];
  if (topBound) animations.push(leaf.animate(edge, timing));
  for (const band of bands) {
    animations.push(
      band.strip.animate(band.pose, timing),
      band.ink.animate(band.light, timing),
      band.backInk.animate(band.light, timing),
    );
  }
  function remove() {
    animations[0].onfinish = null;
    for (const animation of animations) animation.cancel();
    leaf.remove();
    shadowClip.remove();
    underlay.remove();
  }
  animations[0].onfinish = () => {
    remove();
    settled();
  };
  return remove;
}
