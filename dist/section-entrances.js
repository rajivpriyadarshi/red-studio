// Each sequence animates the real artwork. Temporary ink, shutters and film
// leaders belong to that run and are removed when it settles or is interrupted.
export function mountSectionEntrances(gsap, signal, preference) {
  if (!gsap || !window.IntersectionObserver) return;
  const one = (selector) => document.querySelector(selector);
  const rail = one(".splice");
  const scenes = new Map();

  function scene(at, draw) {
    scenes.set(at, draw);
  }

  scene(rail, (tl, layer, followsTitle) => {
    const tiles = [...rail.querySelectorAll(".cut")];
    const images = tiles.filter(
      (tile) => !(followsTitle && tile.classList.contains("current")),
    );
    images.forEach((tile, i) => {
      const image = tile.querySelector(".cut-image");
      const upper = layer(image, "gate upper-gate");
      const lower = layer(image, "gate lower-gate");
      const start = i * 0.075;
      tl.to(upper, { yPercent: -103, duration: 0.85 }, start)
        .to(lower, { yPercent: 103, duration: 0.94 }, start)
        .from(image, { scale: 1.055, duration: 1.06 }, start);
    });
    tl.from(
      ".reel-foot .play-dot",
      { scale: 0.54, duration: 0.7, ease: "back.out(1.35)" },
      0.26,
    );
  });

  scene(one("#scope-canvas"), (tl) => {
    tl.fromTo(
      signal,
      { open: 0 },
      { open: 1, duration: 1.75, ease: "sine.inOut" },
    );
  });

  scene(one(".channels"), (tl) => {
    tl.from(
      ".channel",
      {
        transformPerspective: 650,
        transformOrigin: "left bottom",
        rotationX: -46,
        skewX: -5,
        yPercent: 19,
        stagger: 0.115,
        duration: 0.99,
      },
      0.08,
    );
  });

  document.querySelectorAll(".portrait").forEach((portrait, i) => {
    scene(portrait, (tl, layer) => {
      const image = portrait.querySelector("img");
      const proof = layer(portrait, "photo-proof");
      const negative = document.createElement("img");
      negative.alt = "";
      negative.src = image.currentSrc || image.src;
      proof.append(negative);
      const direction = i % 2 === 0 ? -1 : 1;
      tl.fromTo(
        proof,
        { xPercent: 0 },
        {
          xPercent: direction * 104,
          duration: 1.32,
          ease: "power2.inOut",
        },
        i * 0.1,
      )
        .from(
          image,
          { scale: 1.11, rotation: direction * 1.8, duration: 1.45 },
          0,
        )
        .from(
          portrait.parentElement.querySelector("figcaption"),
          {
            x: -direction * 16,
            y: 12,
            duration: 0.85,
            ease: "power3.out",
          },
          0.32,
        );
    });
  });

  scene(one(".book-cover"), (tl) => {
    tl.from(".book-cover", { y: 18, rotation: -1.3, transformOrigin: "20% 80%", duration: .85, ease: "power3.out" });
  });

  scene(one(".signoff"), (tl, layer) => {
    const row = one(".signoff > div");
    const heading = row.querySelector("h2");
    const dot = heading.querySelector("span").getBoundingClientRect();
    const link = row.querySelector(".big-arrow");
    const arrow = link.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const x = dot.left + dot.width * 0.54 - box.left;
    const y = Math.min(
      box.height * 0.87,
      dot.top + dot.height * 0.77 - box.top,
    );
    const dx = arrow.left + arrow.width * 0.5 - box.left - x;
    const dy = arrow.top + arrow.height * 0.54 - box.top - y;
    const rise = Math.min(dx * 0.34, box.height * 0.61);
    const ns = "http://www.w3.org/2000/svg";
    const sheet = layer(row, "hello-trace", "svg", ns);
    sheet.setAttribute("viewBox", [0, 0, box.width, box.height].join(" "));
    const path = document.createElementNS(ns, "path");
    // On a phone the arrow sits right beside the period. The pen loops into
    // the upper margin there; the desktop route runs across the open column.
    const endX = x + dx;
    const endY = y + dy;
    const ceiling = -Math.min(box.height * 0.24, 22);
    const loop = Math.min(box.width * 0.32, 110);
    const tight = dx < box.width * 0.25;
    const curve = tight
      ? `M ${x} ${y}
         C ${x + dx * 0.8} ${y + 10} ${x + dx * 0.8} ${ceiling + 8} ${x - loop * 0.32} ${ceiling}
         C ${x - loop * 1.1} ${ceiling - 9} ${x - loop} ${ceiling + 22} ${x - loop * 0.55} ${ceiling + 15}
         S ${endX + 6} ${ceiling + 4} ${endX} ${endY}`
      : `M ${x} ${y}
         c ${dx * 0.18} ${rise * 0.45} ${dx * 0.54} ${-rise * 0.17} ${dx * 0.51} ${-rise * 0.78}
         s ${-dx * 0.28} ${rise * 0.04} ${-dx * 0.08} ${rise * 0.22}
         S ${x + dx * 0.83} ${endY + rise * 0.15} ${endX} ${endY}`;
    path.setAttribute("d", curve);
    const tip = document.createElementNS(ns, "circle");
    tip.setAttribute("r", Math.max(3.5, Math.min(8, box.height * 0.04)));
    sheet.append(path, tip);
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length) + " " + String(length);
    const pen = { head: 0, tail: 0 };
    function trace() {
      const p = path.getPointAtLength(length * pen.head);
      tip.setAttribute("cx", p.x);
      tip.setAttribute("cy", p.y);
      const shown = Math.max(0.001, (pen.head - pen.tail) * length);
      path.style.strokeDasharray = shown + " " + (length + 1);
      path.style.strokeDashoffset = String(-pen.tail * length);
    }
    trace();
    tl.from(
      heading,
      { rotation: -2.5, y: 10, transformOrigin: "right bottom", duration: 0.8 },
      0,
    )
      .to(
        pen,
        { head: 1, duration: 1.16, ease: "sine.inOut", onUpdate: trace },
        0.1,
      )
      .to(
        pen,
        { tail: 1, duration: 0.86, ease: "sine.inOut", onUpdate: trace },
        0.68,
      )
      .to(tip, { opacity: 0, duration: 0.19 }, 1.23)
      .fromTo(
        link,
        { scale: 1 },
        { scale: 1.14, duration: 0.16, ease: "sine.out" },
        1.17,
      )
      .to(link, { scale: 1, duration: 0.48, ease: "back.out(1.25)" }, 1.33);
  });

  function observeEntrances() {
    const seen = new Set();
    const visible = new Set();
    const active = new Map();
    const events = new AbortController();

    function start(element, followsTitle = false) {
      if (
        events.signal.aborted ||
        preference.matches ||
        document.hidden ||
        seen.has(element)
      )
        return;
      seen.add(element);
      const layers = [];
      function layer(parent, className, tag = "span", namespace) {
        const node = namespace
          ? document.createElementNS(namespace, tag)
          : document.createElement(tag);
        node.setAttribute("class", className);
        node.setAttribute("aria-hidden", "true");
        parent.append(node);
        layers.push(node);
        return node;
      }
      const ctx = gsap.context(() => {});
      function finish() {
        if (!active.delete(element)) return;
        ctx.revert();
        layers.forEach((node) => node.remove());
      }
      active.set(element, finish);
      ctx.add(() => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: finish,
        });
        scenes.get(element)(tl, layer, followsTitle);
      });
    }

    function inTitle() {
      return document.documentElement.classList.contains("title-running");
    }
    const arrive = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting, intersectionRatio } of entries) {
          if (isIntersecting && intersectionRatio >= 0.23) {
            visible.add(target);
            if (!inTitle()) start(target);
          } else visible.delete(target);
        }
      },
      { rootMargin: "0px 0px -72px 0px", threshold: 0.23 },
    );
    // The extra margin keeps a small change of scroll direction from firing a second entrance.
    const leave = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) continue;
          seen.delete(target);
          active.get(target)?.();
        }
      },
      { rootMargin: "110px 0px" },
    );
    scenes.forEach((_, el) => {
      arrive.observe(el);
      leave.observe(el);
    });

    const on = (node, name, callback) =>
      node.addEventListener(name, callback, { signal: events.signal });
    on(window, "studio:film-reveal", () => {
      if (visible.has(rail)) start(rail, true);
    });
    on(window, "studio:title-end", () => {
      // A visitor can dismiss the title to use an already-visible film immediately.
      if (visible.has(rail)) seen.add(rail);
      visible.forEach((el) => start(el));
    });
    function settleControl(event) {
      if (!event.target.closest("a, button, summary, input, textarea, select"))
        return;
      for (const [el, finish] of active) {
        if (el.closest("section, footer")?.contains(event.target)) finish();
      }
    }
    on(document, "pointerdown", settleControl);
    on(document, "focusin", settleControl);
    on(document, "visibilitychange", () => {
      if (document.hidden) active.forEach((finish) => finish());
      else if (!inTitle()) visible.forEach((el) => start(el));
    });
    return () => {
      events.abort();
      arrive.disconnect();
      leave.disconnect();
      active.forEach((finish) => finish());
    };
  }

  let stop;
  function syncPreference() {
    stop?.();
    stop = preference.matches ? null : observeEntrances();
  }
  preference.addEventListener("change", syncPreference);
  syncPreference();
}
