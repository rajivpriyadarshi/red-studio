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
    if (muted) audio.pause();
    try {
      sessionStorage.setItem("red-press-muted", String(muted));
    } catch {}
    syncSound();
  });

  // Keep actual impressions made while the lazy-loaded model is arriving.
  const pendingStock = [];
  let unavailable = false;
  function issue(data, animate = false) {
    if (animate && !printer && !unavailable && selected) {
      if (pendingStock.length === 12) pendingStock.shift();
      pendingStock.push(selected);
    }
    selected = data;
    book.style.setProperty("--sketch-x", (-100 * (data.study % 3) / 3) + "%");
    book.style.setProperty("--sketch-y", data.study < 3 ? "0%" : "-50%");
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
    printer?.select(data, animate);
    audio.pause();
    if (animate && !muted && !document.hidden) {
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
        }, light, nextSlice);
        if (selected) {
          pendingStock.push(selected);
          pendingStock.forEach((stock, index) => printer.select(stock, index > 0));
        }
        printer.setVisible(visible);
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
      const module = await import("./ticket-printer.js?v=pencil-study-1");
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
    if (!visible) audio.pause();
  }).observe(host);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else { resumeBuild(); scheduleBuild(); }
  });
  window.addEventListener("pagehide", () => audio.pause());
  return issue;
}
