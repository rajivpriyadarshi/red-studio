// A short rubber-on-paper attack and two damped wooden resonances.
// Prepare on a user gesture so the animation frame can play the hit directly.
function makeStampSound() {
  let context, buffer, voice;
  return {
    arm() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        context ??= new AudioContext({ latencyHint: "interactive" });
        if (context.state !== "running") context.resume().catch(() => {});
        if (buffer) return;
        buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .14), context.sampleRate);
        const samples = buffer.getChannelData(0);
        let seed = 749, noise = 0;
        for (let i = 0; i < samples.length; i++) {
          const t = i / context.sampleRate;
          seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
          noise += .18 * (seed / 2147483648 - 1 - noise);
          const wood = .064 * Math.sin(2*Math.PI*(103*t + .42*(1-Math.exp(-52*t)))) * Math.exp(-43*t);
          const knock = .033 * Math.sin(2*Math.PI*296*t) * Math.exp(-79*t);
          samples[i] = (wood + knock + .092*noise*Math.exp(-134*t)) * (1-Math.exp(-990*t));
        }
      } catch { /* Printing still works without an audio device. */ }
    },
    hit() {
      if (context?.state !== "running" || !buffer) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        if (voice === source) voice = null;
      };
      voice = source;
      source.start();
    },
    quiet() {
      if (voice) voice.stop();
      voice = null;
      if (context?.state === "running") context.suspend().catch(() => {});
    }
  };
}

// The board and its printed proof work while the 3D machinery loads, and on
// browsers where creating a WebGL context is unavailable.
export function mountDispenser(host, preference) {
  const sound = host.querySelector(".press-sound");
  const sheet = host.querySelector(".fare-paper");
  const book = host.querySelector(".flat-sketchbook");
  const caption = host.querySelector("#press-sketch-caption");
  const fields = {
    title: sheet.querySelector("[data-ticket-title]"),
    note: sheet.querySelector("[data-ticket-time]"),
    tax: sheet.querySelector("[data-ticket-tax]"),
    price: sheet.querySelector("[data-ticket-price]"),
    number: sheet.querySelector("[data-ticket-no]"),
    art: sheet.querySelector("[data-ticket-art]"),
  };
  const thump = makeStampSound();
  const audio = new Audio();
  audio.preload = "none";
  audio.src = new URL("./assets/programme/ticket-press.wav", import.meta.url);
  let muted = false,
    visible = false,
    loading = false,
    printer = null,
    selected = null;
  try {
    muted = sessionStorage.getItem("red-press-muted") === "true";
  } catch {}
  function syncSound() {
    sound.hidden = false;
    sound.setAttribute("aria-pressed", String(!muted));
    sound.title = muted ? "Turn ticket sound on" : "Mute ticket sound";
  }
  syncSound();
  sound.addEventListener("click", () => {
    muted = !muted;
    if (muted) quiet();
    else if (printer && !preference.matches) thump.arm();
    try {
      sessionStorage.setItem("red-press-muted", String(muted));
    } catch {}
    syncSound();
  });

  function quiet() {
    audio.pause();
    thump.quiet();
  }
  function stampHit() {
    if (!muted && visible && !document.hidden) thump.hit();
  }

  // Keep actual impressions made while the lazy-loaded model is arriving.
  const pendingStock = [];
  let unavailable = false;
  function issue(data, animate = false) {
    if (animate && !printer && selected) {
      host.dataset.rollPanel = (Number(host.dataset.rollPanel || 0) + 1) % 4;
    }
    if (animate && !printer && !unavailable && selected) {
      if (pendingStock.length === 12) pendingStock.shift();
      pendingStock.push(selected);
    }
    selected = data;
    book.style.setProperty("--sketch-x", (-100 * (data.study % 4) / 4) + "%");
    book.style.setProperty("--sketch-y", data.study < 4 ? "0%" : "-50%");
    caption.textContent = data.sketch;
    sheet.dataset.stock = data.key;
    sheet.style.setProperty("--stock", data.color);
    fields.title.textContent = data.name;
    fields.price.textContent = data.fee;
    fields.note.textContent = data.note;
    fields.tax.hidden = !data.priced;
    fields.number.textContent = data.no;
    fields.art.src = new URL(
      "./assets/ticket-window/" + data.art + ".webp",
      import.meta.url,
    );
    // On phones the rate board moves the scene directly below the chosen row.
    // Its new position is ready before the intersection observer reports it.
    if (animate && !visible && !document.hidden) {
      const box = host.getBoundingClientRect();
      if (box.height && box.bottom > 0 && box.top < window.innerHeight) {
        visible = true;
        printer?.setVisible(true);
        resumeBuild();
      }
    }
    printer?.select(data, animate);
    audio.pause();
    if (animate && !muted && !document.hidden) {
      if (!unavailable && !preference.matches) thump.arm();
      audio.currentTime = 0.18;
      audio.playbackRate = 1.05;
      audio.play().catch(() => {});
    }
  }
  let mount, light, queued = false;
  let pendingSlice = null, sliceFrame = 0;
  function resumeBuild() {
    if (!pendingSlice || sliceFrame || !visible || document.hidden) return;
    sliceFrame = requestAnimationFrame(() => {
      sliceFrame = 0;
      if (!visible || document.hidden) return;
      const resume = pendingSlice;
      pendingSlice = null;
      resume();
    });
  }
  function nextSlice() {
    return new Promise(resolve => {
      pendingSlice = resolve;
      resumeBuild();
    });
  }
  function scheduleBuild() {
    if (!visible || document.hidden || !mount || queued || printer || unavailable) return;
    queued = true;
    const build = async () => {
      if (!visible || document.hidden) { queued = false; return; }
      try {
        printer = await mount(host, preference, () => {
          if (selected) issue(selected, true);
        }, light, nextSlice, stampHit);
        pendingStock.forEach((stock, index) => printer.select(stock, index > 0));
        printer.setVisible(visible);
        if (selected) printer.select(selected, pendingStock.length > 0);
      } catch (error) {
        unavailable = true;
        console.warn("The ticket is available in print view.", error);
      }
      pendingStock.length = 0;
      queued = false;
    };
    if (window.requestIdleCallback) window.requestIdleCallback(build, { timeout: 240 });
    else setTimeout(build, 0);
  }
  async function prepare() {
    if (loading) return;
    loading = true;
    try {
      const module = await import("./ticket-printer.js?v=bench-close-1");
      light = await module.loadBenchLight().catch(() => null);
      mount = module.mountPrinter;
      scheduleBuild();
    } catch (error) {
      unavailable = true;
      pendingStock.length = 0;
      console.warn("The ticket is available in print view.", error);
    }
  }
  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      prepare();
    },
    { rootMargin: "350px" },
  );
  near.observe(host);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    printer?.setVisible(visible);
    if (visible) { resumeBuild(); scheduleBuild(); }
    if (!visible) quiet();
  }).observe(host);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) quiet();
    else { resumeBuild(); scheduleBuild(); }
  });
  window.addEventListener("pagehide", quiet);
  return issue;
}
