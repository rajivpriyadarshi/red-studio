// A sheet is built once at pickup; the same pose can then be scrubbed in
// either direction. The live spread and its links stay in place underneath.
export function createPaper(bound, from, to, forward, single, grip) {
  const art = ".book-art";
  const note = ".book-note";
  function layer(name) {
    const el = document.createElement("div");
    el.className = name;
    el.inert = true;
    el.setAttribute("aria-hidden", "true");
    return el;
  }
  function spread(page) {
    const copy = layer("book-paper-spread");
    copy.style.gridTemplateRows = getComputedStyle(page).gridTemplateRows;
    copy.append(
      page.querySelector(art).cloneNode(true),
      page.querySelector(note).cloneNode(true),
    );
    return copy;
  }

  const front = single
    ? spread(forward ? from : to)
    : from.querySelector(forward ? note : art);
  const reverse = single ? null : to.querySelector(forward ? art : note);
  const size = getComputedStyle(single ? from : front);
  const width = parseFloat(size.width),
    height = parseFloat(size.height);
  const count = single ? 10 : 14;
  const bandSize = width / count;
  const direction = single || forward ? 1 : -1;

  const preview = spread(single && !forward ? from : to);
  preview.classList.add("book-preview");
  const leaf = layer("book-leaf");
  const underlay = layer("book-underlay");
  const shadowClip = layer("book-shadow-clip");
  const shadow = document.createElement("i");
  shadowClip.append(shadow);
  if (!single) {
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
        left: -crop + "px",
        top: "0",
      });
      surface.append(copy);
    }
    return surface;
  }
  const bands = Array.from({ length: count }, (_, i) => {
    const strip = document.createElement("div");
    strip.className = "paper-band";
    const overlap = i === count - 1 ? 0 : 0.55;
    strip.style.width = bandSize + overlap + "px";
    const near = i * bandSize;
    const far = width - near - bandSize;
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
    return { strip, ink, backInk };
  });
  bound.append(preview);
  if (!single) bound.append(underlay);
  bound.append(shadowClip, leaf);

  function draw(progress) {
    const p = single && !forward ? 1 - progress : progress;
    const lift = Math.sin(Math.PI * p);
    const shear = (grip - 0.5) * height * 0.1 * lift;
    let x = 0,
      y = 0,
      z = 0,
      shadowMin = 0,
      shadowMax = 0;
    bands.forEach(({ strip, ink, backInk }, i) => {
      const u = (i + 0.5) / count;
      const bend = lift * (u - 0.42) * (single ? 1.3 : 1.6);
      const angle = Math.PI * (single ? 0.56 : 1) * p + bend;
      const nextX = x + direction * bandSize * Math.cos(angle);
      const nextZ = z + bandSize * Math.sin(angle);
      const nextY = shear * ((i + 1) / count) ** 2;
      const skew = direction * Math.atan((nextY - y) / bandSize);
      const origin = direction === 1 ? [x, y, z] : [nextX, nextY, nextZ];
      strip.style.transform = `translate3d(${origin[0]}px,${origin[1]}px,${origin[2]}px) rotateY(${-direction * angle}rad) skewY(${skew}rad)`;
      ink.style.opacity = backInk.style.opacity =
        lift * (0.12 + 0.27 * Math.abs(Math.sin(angle)));
      x = nextX;
      y = nextY;
      z = nextZ;
      const cast = x + z * 0.43;
      shadowMin = Math.min(shadowMin, cast);
      shadowMax = Math.max(shadowMax, cast);
    });
    shadow.style.transform = `translateX(${shadowMin}px) scaleX(${Math.max(0.025, (shadowMax - shadowMin) / width)})`;
    shadow.style.opacity = lift * 0.72;
    if (single) leaf.style.opacity = Math.min(1, (1 - p) * 8);
  }
  function remove() {
    preview.remove();
    underlay.remove();
    leaf.remove();
    shadowClip.remove();
  }
  return { draw, remove };
}
