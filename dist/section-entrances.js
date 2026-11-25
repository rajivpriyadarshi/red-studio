// Observe the individual reading beats, so a narrow layout doesn't play the
// bottom of a section while its heading is still at the top of the screen.
export function mountSectionEntrances(gsap, preference) {
  if (!gsap || !window.IntersectionObserver) return;
  const one = (selector) => document.querySelector(selector);
  const scenes = new Map();
  const titles = new Set(document.querySelectorAll(".section-title"));
  const printedTitles = new Set();
  const played = new Set();
  const replay = new Set();

  function scene(at, draw) {
    scenes.set(at, draw);
  }

  function eachScene(selector, draw) {
    document.querySelectorAll(selector).forEach((el, i) => {
      scene(el, (tl, layer) => draw(el, tl, i, layer));
    });
  }

  function lift(tl, targets, at = 0, distance = 16) {
    tl.from(targets, { y: distance, opacity: 0, duration: .54, stagger: .065 }, at);
  }

  function rule(el, tl, layer, edge) {
    const color = getComputedStyle(el).getPropertyValue(`border-${edge}-color`);
    const line = layer(el, "entry-rule");
    line.style[edge] = "0";
    line.style.backgroundColor = color;
    const border = edge === "top" ? "borderTopColor" : "borderBottomColor";
    tl.set(el, { [border]: "transparent" }, 0)
      .from(line, { scaleX: 0, transformOrigin: "left", duration: .55 }, 0);
  }

  eachScene(".station-head", (header, tl) => {
    const links = [...header.querySelectorAll(".station-home, .top-nav a, .head-mail, .menu-switch")]
      .filter(el => el.getClientRects().length);
    lift(tl, links, 0, -9);
  });
  eachScene(".showcase-heading, .rates-head > p, .people-heading > p, .process-intro > p, .liner-copy > p", (copy, tl) => {
    lift(tl, copy, .06);
  });
  eachScene(".fare-legend", (el, tl, i, layer) => {
    const labels = [...el.children];
    rule(el, tl, layer, "bottom");
    lift(tl, labels.length ? labels : el, 0, 8);
  });

  eachScene(".fare-group > h3", (el, tl) => {
    tl.from(el, { x: -12, opacity: 0, duration: .38 }, 0);
  });
  eachScene(".fare-row", (row, tl) => {
    const number = row.querySelector(".fare-number");
    const beat = (Number(number.textContent) - 1) % 3 * .04;
    tl.from([number, number.nextElementSibling], {
      y: 11, opacity: 0, duration: .44, stagger: .035,
    }, beat)
      .from(row.querySelector(".fare-price"), {
        x: 13, opacity: 0, duration: .44,
      }, beat + .07);
  });
  eachScene(".counter-scene", (bench, tl) => {
    // Move the whole bench, including its illustrated fallback. The camera
    // and the printer keep their own poses and only render when they need to.
    tl.from(bench, { y: 34, scale: .92, rotation: -1.6, transformOrigin: "50% 78%",
      opacity: 0, duration: .88 }, 0);
  });
  eachScene(".terms, .signoff-base", (el, tl, i, layer) => {
    const items = [...el.children];
    rule(el, tl, layer, "top");
    lift(tl, items, .08, 12);
  });

  function revealTitle(heading, tl) {
    if (printedTitles.has(heading)) return;
    printedTitles.add(heading);
    const words = heading.querySelectorAll(".title-word");
    const stop = heading.querySelector(".title-stop");
    const stagger = .075;
    // The bottom crop recedes as the word rises, keeping the reveal edge
    // at the baseline. Extra room at rest preserves accents and descenders.
    tl.fromTo(words, {
      yPercent: 100, rotation: 2, transformOrigin: "0% 100%",
      clipPath: "inset(-18% -0.15em 118% -0.15em)",
    }, {
      yPercent: 0, rotation: 0, clipPath: "inset(-18% -0.15em -18% -0.15em)",
      duration: .70, stagger, ease: "power3.out",
    }, 0);
    if (stop) tl.from(stop, {
      scale: .5, opacity: 0, transformOrigin: "center 78%",
      duration: .24, ease: "back.out(1.3)",
    }, (words.length - 1) * stagger + .34);
  }
  const signoffTitle = one(".signoff h2");
  for (const heading of titles) {
    if (heading !== signoffTitle) scene(heading, tl => revealTitle(heading, tl));
  }

  document.querySelectorAll(".portrait").forEach((portrait, i) => {
    replay.add(portrait);
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
        );
    });
  });
  eachScene(".people-spread figcaption", (caption, tl, i) => {
    const beat = i * .055;
    tl.from(caption.querySelector("h3"), {
      y: 18, clipPath: "inset(0 0 98% 0)", duration: .6,
    }, beat);
    lift(tl, caption.querySelectorAll("span, p"), beat + .13, 12);
  });

  const sleeve = one(".record-sleeve");
  replay.add(sleeve);
  scene(sleeve, tl => {
    tl.from(sleeve.querySelector(".sleeve-cover"), {
      xPercent: -5, yPercent: 7, rotation: -5, transformOrigin: "12% 88%", duration: .84,
    }, 0).from(sleeve.querySelector(".sleeve-disc"), {
      xPercent: -36, rotation: -52, duration: 1.02, ease: "power2.inOut",
    }, .08);
  });
  eachScene(".liner-note", (note, tl, i, layer) => {
    if (i) rule(note, tl, layer, "top");
    tl.from(note.querySelector("h4"), { x: -17, opacity: 0, duration: .49 }, 0);
    lift(tl, note.querySelector("p"), .10, 11);
  });

  eachScene(".book-tabs", (tabs, tl) => {
    tl.from(tabs.children, { yPercent: 45, opacity: 0, stagger: .052, duration: .43 }, 0);
  });
  const cover = one(".book-cover");
  replay.add(cover);
  scene(cover, tl => {
    tl.from(cover, { y: 26, rotation: -2, rotationX: 7, transformPerspective: 1150,
      transformOrigin: "24% 78%", duration: .82 }, 0);
    tl.from(cover.querySelector(".process-steps"), {
      clipPath: "inset(0 8% 10% 0)", opacity: .55, duration: .62,
    }, 0);
  });
  eachScene(".book-foot", (foot, tl) => {
    lift(tl, foot.querySelectorAll("a, button"), .03, 11);
  });

  replay.add(signoffTitle);
  scene(signoffTitle, (tl, layer) => {
    const row = signoffTitle.parentElement;
    const dot = signoffTitle.querySelector(".title-stop").getBoundingClientRect();
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
    // On the first visit the pen leaves the full stop as it lands.
    // The existing contact flourish can still play on a return visit.
    tl.addLabel("draw", printedTitles.has(signoffTitle) ? .1 : .61);
    revealTitle(signoffTitle, tl);
    tl.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: .10 }, "draw-=0.08")
      .to(
        pen,
        { head: 1, duration: 1.16, ease: "sine.inOut", onUpdate: trace },
        "draw",
      )
      .to(
        pen,
        { tail: 1, duration: 0.86, ease: "sine.inOut", onUpdate: trace },
        "draw+=0.58",
      )
      .to(tip, { opacity: 0, duration: 0.19 }, "draw+=1.13")
      .fromTo(
        link,
        { scale: 1 },
        { scale: 1.14, duration: 0.16, ease: "sine.out" },
        "draw+=1.07",
      )
      .to(link, { scale: 1, duration: 0.48, ease: "back.out(1.25)" }, "draw+=1.23");
  });

  function observeEntrances() {
    const seen = new Set();
    const visible = new Set();
    const active = new Map();
    const events = new AbortController();

    function markShown(element) {
      seen.add(element);
      played.add(element);
      element.classList.remove("entry-pending");
      if (!replay.has(element)) {
        arrive.unobserve(element);
        visible.delete(element);
      }
    }

    function start(element) {
      if (
        events.signal.aborted ||
        preference.matches ||
        document.hidden ||
        seen.has(element)
      )
        return;
      markShown(element);
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
        if (!replay.has(element)) leave.unobserve(element);
      }
      active.set(element, finish);
      ctx.add(() => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: finish,
        });
        scenes.get(element)(tl, layer);
      });
    }

    function arrivals(entries, observer) {
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        if (isIntersecting && intersectionRatio >= observer.thresholds[0]) {
          visible.add(target);
          start(target);
        } else visible.delete(target);
      }
    }
    const arrive = new IntersectionObserver(arrivals, {
      rootMargin: "0px 0px -12px 0px", threshold: 0.12,
    });
    // The extra margin keeps a small change of scroll direction from firing a second entrance.
    const leave = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) continue;
          if (replay.has(target)) seen.delete(target);
          visible.delete(target);
          active.get(target)?.();
        }
      },
      { rootMargin: "110px 0px" },
    );
    scenes.forEach((_, el) => {
      if (played.has(el) && !replay.has(el)) return;
      if (!played.has(el)) el.classList.add("entry-pending");
      arrive.observe(el);
      leave.observe(el);
    });

    const on = (node, name, callback) =>
      node.addEventListener(name, callback, { signal: events.signal, capture: true });
    function settleControl(event) {
      if (!event.target.closest("a, button, summary, input, textarea, select, .book-bound, .press-viewport"))
        return;
      const pending = event.target.closest(".entry-pending");
      if (pending) {
        markShown(pending);
        if (!replay.has(pending)) leave.unobserve(pending);
      }
      for (const [el, finish] of active) {
        if (el.contains(event.target) || el.closest("section, footer")?.contains(event.target)) finish();
      }
    }
    on(document, "pointerdown", settleControl);
    on(document, "focusin", settleControl);
    on(document, "visibilitychange", () => {
      if (document.hidden) active.forEach((finish) => finish());
      else visible.forEach((el) => start(el));
    });
    return () => {
      events.abort();
      arrive.disconnect();
      leave.disconnect();
      active.forEach((finish) => finish());
      scenes.forEach((_, el) => el.classList.remove("entry-pending"));
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
