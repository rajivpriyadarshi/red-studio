import { mountSketchbook } from "./sketchbook.js?v=3";
import { mountDispenser } from "./ticket-dispenser.js?v=pencil-study-1";
import { openPackageInquiry } from "./brief.js?v=service-groups-1";
import { mountPackageDetails } from "./package-details.js?v=launch-rates-1";
import { playPrintIntro } from "./print-intro.js?v=resource-1";
import { mountSectionEntrances } from "./section-entrances.js?v=mechanical-1";
import { mountScope } from "./scope-motion.js?v=resource-1";

const one = (s) => document.querySelector(s);
const all = (s) => [...document.querySelectorAll(s)];
const prefs = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 740px)");
const gsap = window.gsap;
const canMove = () => Boolean(gsap && !prefs.matches);

import "./programme-nav.js?v=debut-3";

// Individual widths redistribute under the pointer. The mark always retains
// its original total width and restores its drawn spacing on pointer leave.
const mark = one(".marque svg"),
  letters = [...mark.children];
const metrics = letters.map((g) => ({
  x: g.transform.baseVal.getItem(0).matrix.e,
  w: g.querySelector("path").getBBox().width,
}));
const wordWidth = mark.viewBox.baseVal.width;
let pointer = -1,
  wordEnergy = 0,
  wordFrame = 0;
function typeset() {
  wordFrame = 0;
  const goal = pointer < 0 || prefs.matches ? 0 : 1;
  wordEnergy += (goal - wordEnergy) * 0.17;
  if (!goal && wordEnergy < 0.005) {
    wordEnergy = 0;
    letters.forEach((g, i) =>
      g.setAttribute("transform", "translate(" + metrics[i].x + " 2)"),
    );
    return;
  }
  let accumulated = 0,
    sum = 0;
  const spans = metrics.map(({ x, w }) => {
    const near = (x + w * 0.5) / wordWidth - pointer;
    const scale = 1 + wordEnergy * 0.35 * Math.exp(-near * near * 39);
    sum += w * scale;
    accumulated += w;
    return w * scale;
  });
  let offset = 0;
  letters.forEach((g, i) => {
    const w = (spans[i] * accumulated) / sum;
    g.setAttribute(
      "transform",
      "translate(" +
        (metrics[i].x + offset) +
        " 2) scale(" +
        w / metrics[i].w +
        " 1)",
    );
    offset += w - metrics[i].w;
  });
  if (Math.abs(goal - wordEnergy) > 0.005)
    wordFrame = requestAnimationFrame(typeset);
}
function queueType() {
  if (!wordFrame) wordFrame = requestAnimationFrame(typeset);
}
mark.addEventListener("pointermove", (e) => {
  if (prefs.matches || e.pointerType === "touch") return;
  const r = mark.getBoundingClientRect();
  pointer = (e.clientX - r.left) / r.width;
  queueType();
});
mark.addEventListener("pointerleave", () => {
  pointer = -1;
  queueType();
});
const cuts = all(".cut"),
  rail = one(".splice"),
  watch = one(".screen-link"),
  cinema = one("#cinema"),
  player = cinema.querySelector("video"),
  previewSound = one(".gallery-sound"),
  filmSound = one(".film-sound");
const clipPlayer = document.createElement("video");
clipPlayer.loop = true;
clipPlayer.playsInline = true;
clipPlayer.defaultMuted = true;
clipPlayer.muted = true;
clipPlayer.setAttribute("aria-hidden", "true");
clipPlayer.addEventListener("playing", () => clipPlayer.classList.add("playing"));
let galleryMuted = true, filmRevealed = false;
let playAttempt = 0;
function labelSound(button, muted, where) {
  const action = (muted ? "Unmute " : "Mute ") + where;
  button.hidden = false;
  button.dataset.muted = String(muted);
  button.setAttribute("aria-label", action);
  button.title = action;
  button.querySelector("span").textContent = muted ? "Sound off" : "Sound on";
}
function updateFilmSound() {
  const muted = player.muted || player.volume === 0;
  labelSound(filmSound, muted, "film");
  if (cinema.open && muted) {
    galleryMuted = true;
    labelSound(previewSound, true, "preview");
  }
}
filmSound.addEventListener("click", () => {
  const wasSilent = player.muted || player.volume === 0;
  if (wasSilent && player.volume === 0) player.volume = 1;
  player.muted = !wasSilent;
  updateFilmSound();
});
player.addEventListener("volumechange", updateFilmSound);
updateFilmSound();
let active = 0,
  inView = false,
  closingFocus = null,
  previewVideo = null,
  previewCut = null;
let requestedScroll = null,
  scrollEnd = 0,
  hoverTimer = 0;
const current = () => cuts[active];
function stopPreview() {
  playAttempt++;
  if (!previewVideo) return;
  previewVideo.classList.remove("playing");
  previewVideo.pause();
  previewVideo.removeAttribute("src");
  previewVideo.load();
  previewVideo.remove();
  previewVideo = null;
  previewCut = null;
}
function startClip() {
  const attempt = ++playAttempt;
  clipPlayer.play().catch((error) => {
    if (attempt !== playAttempt || error.name === "AbortError") return;
    // Some browsers require a new gesture when an audible preview changes source.
    if (!galleryMuted) {
      galleryMuted = true;
      clipPlayer.muted = true;
      labelSound(previewSound, true, "preview");
      playback();
    }
  });
}
function playback() {
  labelSound(previewSound, galleryMuted, "preview");
  if (
    !inView || cinema.open || document.hidden ||
    (!filmRevealed && document.documentElement.classList.contains("title-running")) ||
    (galleryMuted && (prefs.matches || navigator.connection?.saveData))
  ) {
    stopPreview();
    return;
  }
  const cut = current();
  if (previewCut !== cut) {
    stopPreview();
    clipPlayer.src = cut.dataset.loop;
    cut.querySelector(".cut-image").append(clipPlayer);
    previewVideo = clipPlayer;
    previewCut = cut;
  }
  clipPlayer.muted = galleryMuted;
  if (clipPlayer.paused) startClip();
}
previewSound.addEventListener("click", () => {
  galleryMuted = !galleryMuted;
  player.muted = galleryMuted;
  if (!galleryMuted) one(".scope-caption audio")?.pause();
  if (!inView && !galleryMuted) rail.scrollIntoView({block: "center", behavior: "instant"});
  playback();
});
function railPosition(cut) {
  return (
    rail.scrollLeft +
    cut.getBoundingClientRect().left -
    rail.getBoundingClientRect().left
  );
}
function choose(index, scroll = false) {
  active = (index + cuts.length) % cuts.length;
  cuts.forEach((cut, i) => {
    cut.classList.toggle("current", i === active);
    if (i === active) cut.setAttribute("aria-current", "true");
    else cut.removeAttribute("aria-current");
  });
  const cut = current();
  watch.href = cut.href;
  one("[data-watch-title]").textContent = "Play " + cut.dataset.title;
  one("[data-runtime]").textContent = cut.dataset.duration;
  one("[data-film-count]").textContent =
    String(active + 1).padStart(2, "0") +
    " / " +
    String(cuts.length).padStart(2, "0");
  if (scroll && narrow.matches) {
    requestedScroll = active;
    rail.scrollTo({
      left: railPosition(cut),
      behavior: prefs.matches ? "instant" : "smooth",
    });
  }
  playback();
}
let flight = null,
  flightTween = null,
  returning = false;
function clearFlight() {
  flightTween?.kill();
  flight?.remove();
  flight = null;
  flightTween = null;
}
function retainedFrame(video, poster) {
  if (!video || video.readyState < 2 || !video.videoWidth) return poster;
  const still = document.createElement("canvas");
  still.width = Math.min(720, video.videoWidth);
  still.height = Math.round(
    (still.width * video.videoHeight) / video.videoWidth,
  );
  const context = still.getContext("2d");
  if (!context) return poster;
  try {
    context.drawImage(video, 0, 0, still.width, still.height);
    return still.toDataURL("image/jpeg", 0.84);
  } catch {
    return poster;
  }
}
function screenBounds() {
  const r = player.getBoundingClientRect();
  const aspect = cinema.dataset.format === "portrait" ? 9 / 16 : 16 / 9;
  const width = Math.min(r.width, r.height * aspect),
    height = width / aspect;
  return {
    left: r.left + (r.width - width) / 2,
    top: r.top + (r.height - height) / 2,
    width,
    height,
  };
}
function fly(image, start, end, done) {
  clearFlight();
  flight = document.createElement("img");
  flight.className = "screen-flight";
  flight.alt = "";
  flight.src = image;
  cinema.append(flight);
  flightTween = gsap.fromTo(
    flight,
    {
      left: start.left,
      top: start.top,
      width: start.width,
      height: start.height,
    },
    {
      ...end,
      duration: 0.5,
      ease: "power3.inOut",
      onComplete: () => {
        flight.remove();
        flight = null;
        flightTween = null;
        done?.();
      },
    },
  );
}
function tileBounds(cut) {
  const { left, top, width, height } = cut.getBoundingClientRect();
  return { left, top, width, height };
}
function openFilm(trigger) {
  clearTimeout(hoverTimer);
  clearFlight();
  returning = false;
  const c = current(),
    first = !cinema.open,
    origin = tileBounds(c);
  const frame =
    first && canMove()
      ? retainedFrame(
          previewCut === c ? previewVideo : null,
          c.querySelector("img").src,
        )
      : null;
  if (first) {
    closingFocus = trigger;
    cinema.showModal();
    one(".scope-caption audio")?.pause();
    document.body.classList.add("modal-open");
    stopPreview();
  }
  cinema.dataset.format = c.dataset.format;
  one("#film-title").textContent = c.dataset.title;
  one("[data-film-credit]").textContent = c.dataset.credit;
  player.poster = c.querySelector("img").src;
  player.src = c.href;
  player.load();
  player.play().catch(() => {});
  if (frame) fly(frame, origin, screenBounds());
}
function closeFilm() {
  if (returning) return;
  player.pause();
  const end = tileBounds(current());
  if (!canMove() || end.top > innerHeight || end.top + end.height < 0) {
    cinema.close();
    return;
  }
  returning = true;
  const frame = retainedFrame(player, player.poster);
  fly(frame, screenBounds(), end, () => cinema.close());
}
cinema.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeFilm();
});
cuts.forEach((cut, i) => {
  let selectedOnDown = false;
  cut.addEventListener("pointerenter", (e) => {
    clearTimeout(hoverTimer);
    if (
      !document.documentElement.classList.contains("title-running") &&
      !narrow.matches &&
      e.pointerType === "mouse"
    )
      hoverTimer = setTimeout(() => choose(i), 100);
  });
  cut.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
  cut.addEventListener("pointerdown", () => {
    selectedOnDown = active === i;
  });
  cut.addEventListener("focus", () => {
    if (cut.matches(":focus-visible")) choose(i, true);
  });
  cut.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    clearTimeout(hoverTimer);
    choose(i, true);
    if (!narrow.matches || e.detail === 0 || selectedOnDown) openFilm(cut);
  });
  cut.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    choose(
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? cuts.length - 1
          : i + (e.key === "ArrowRight" ? 1 : -1),
      true,
    );
    current().focus({ preventScroll: true });
  });
});
rail.addEventListener(
  "scroll",
  () => {
    if (!narrow.matches) return;
    clearTimeout(scrollEnd);
    scrollEnd = setTimeout(() => {
      if (requestedScroll !== null) {
        requestedScroll = null;
        return;
      }
      // The final card is only partially scrollable because of the peek at the right.
      const right = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
      const nearest =
        right < 3
          ? cuts.length - 1
          : cuts
              .map((c) => Math.abs(railPosition(c) - rail.scrollLeft))
              .reduce((best, n, i, a) => (n < a[best] ? i : best), 0);
      choose(nearest);
    }, 110);
  },
  { passive: true },
);
rail.addEventListener("pointerdown", () => {
  requestedScroll = null;
});
one("[data-prev]").addEventListener("click", () => choose(active - 1, true));
one("[data-next]").addEventListener("click", () => choose(active + 1, true));
watch.addEventListener("click", (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openFilm(watch);
});
one(".next-screen").addEventListener("click", () => {
  choose(active + 1, true);
  if (closingFocus?.classList.contains("cut")) closingFocus = current();
  openFilm(closingFocus);
});
one(".close-screen").addEventListener("click", closeFilm);
cinema.addEventListener("click", (e) => {
  if (e.target === cinema) {
    const r = cinema.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeFilm();
  }
});
cinema.addEventListener("close", () => {
  returning = false;
  clearFlight();
  player.pause();
  player.removeAttribute("src");
  player.load();
  document.body.classList.remove("modal-open");
  closingFocus?.focus({ preventScroll: true });
  playback();
});
new IntersectionObserver(
  ([e]) => {
    inView = e.isIntersecting;
    playback();
  },
  { threshold: 0.05 },
).observe(rail);
document.addEventListener("visibilitychange", () => {
  playback();
  if (document.hidden) player.pause();
});
prefs.addEventListener("change", () => {
  playback();
  pointer = -1;
  queueType();
});
window.addEventListener("pagehide", () => {
  stopPreview();
  player.pause();
});
window.addEventListener("pageshow", playback);
choose(0);
for (const event of ["studio:film-reveal", "studio:title-end"]) {
  window.addEventListener(event, () => {
    filmRevealed = true;
    playback();
  }, { once: true });
}
playPrintIntro(mark, prefs);

narrow.addEventListener("change", () => {
  clearTimeout(hoverTimer);
  clearTimeout(scrollEnd);
  requestAnimationFrame(() => {
    if (narrow.matches) {
      requestedScroll = active;
      rail.scrollTo({ left: railPosition(current()), behavior: "instant" });
    } else rail.scrollLeft = 0;
  });
});
const channels = all(".channel");
const soundClip = one(".scope-caption audio"),
  listen = one(".listen");
let audioGraph = null,
  analyser = null,
  samples = null;
function loudness() {
  if (!analyser || soundClip.paused) return 0;
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const value of samples) sum += ((value - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 3);
}
function syncListen() {
  listen.setAttribute("aria-pressed", String(!soundClip.paused));
  listen.innerHTML = soundClip.paused
    ? '<span aria-hidden="true">▶</span> Hear emTopolizer²'
    : '<span aria-hidden="true">■</span> Stop sample';
}
soundClip.addEventListener("playing", () => {
  if (!galleryMuted) {
    galleryMuted = true;
    playback();
  }
});
listen.addEventListener("click", async () => {
  if (!soundClip.paused) {
    soundClip.pause();
    return;
  }
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio && !audioGraph) {
      audioGraph = new Audio();
      analyser = audioGraph.createAnalyser();
      analyser.fftSize = 256;
      samples = new Uint8Array(analyser.fftSize);
      audioGraph.createMediaElementSource(soundClip).connect(analyser);
      analyser.connect(audioGraph.destination);
    }
    if (audioGraph?.state === "suspended") await audioGraph.resume();
    if (listen.hidden || document.hidden) return;
    soundClip.currentTime = 0;
    await soundClip.play();
  } catch {
    one("[data-audio-status]").textContent =
      "Audio could not start. The full film is available in Selected work.";
  }
});
["play", "pause", "ended"].forEach((e) =>
  soundClip.addEventListener(e, syncListen),
);
new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) soundClip.pause();
}).observe(one(".practice"));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) soundClip.pause();
});
window.addEventListener("pagehide", () => soundClip.pause());
const signal = { open: 1 };
const setShape = mountScope(one("#scope-canvas"), prefs, loudness, signal);
const practice = one("#services");
const visual = practice.querySelector(".service-visual");
const sheets = [...visual.querySelectorAll(".proof-sheet")];
let discipline = 0;
let showingProofs = false;
function displayProofs(show) {
  showingProofs = show;
  const name = channels[discipline].dataset.channel;
  for (const sheet of sheets) {
    sheet.setAttribute("aria-hidden", String(!show || sheet.dataset.proof !== name));
  }
  visual.classList.toggle("has-proofs", show);
  setShape(Number(channels[discipline].dataset.shape), show);
}
displayProofs(false);
function chooseChannel(i) {
  if (i === discipline && showingProofs) return;
  discipline = i;
  const channel = channels[i];
  channels.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
  one("#channel-title").textContent = channel.dataset.heading;
  one("#channel-copy").textContent = channel.dataset.copy;
  listen.hidden = channel.dataset.channel !== "sound";
  if (listen.hidden) soundClip.pause();
  displayProofs(true);
}
channels.forEach((b, i) => {
  b.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse" || e.pointerType === "pen") chooseChannel(i);
  });
  b.addEventListener("click", () => chooseChannel(i));
  b.addEventListener("focus", () => chooseChannel(i));
});
practice.addEventListener("pointerleave", (event) => {
  if (event.pointerType !== "touch" && !practice.contains(document.activeElement)) {
    displayProofs(false);
  }
});
practice.addEventListener("focusout", (event) => {
  if (!practice.contains(event.relatedTarget) && !practice.matches(":hover")) {
    displayProofs(false);
  }
});

const keys = all(".fare-row");
const quotes = all(".fare-quote");
const fareDisplay = one(".fare-display");
const fareLayout = one(".fare-layout");
mountPackageDetails(one("#package-scope"), quotes, narrow, prefs, openPackageInquiry);
const dispense = mountDispenser(one(".counter-scene"), prefs);
let rateIndex = 0;

function placeWindow() {
  const selected = keys[rateIndex];
  if (narrow.matches) {
    if (selected.nextElementSibling !== fareDisplay) selected.after(fareDisplay);
  } else if (fareDisplay.parentElement !== fareLayout) {
    fareLayout.append(fareDisplay);
  }
}

function pressRate(i, issue = false) {
  const quote = quotes[i];
  if (!quote) return;
  const changed = rateIndex !== i;
  rateIndex = i;
  keys.forEach((key, j) => {
    if (j === i) key.setAttribute("aria-current", "true");
    else key.removeAttribute("aria-current");
    quotes[j].hidden = j !== i;
  });
  placeWindow();
  if (issue && changed && narrow.matches) {
    keys[i].scrollIntoView({ block: "start", behavior: "instant" });
  }
  dispense({
    key: quote.dataset.plan,
    color: quote.dataset.paper,
    name: quote.dataset.ticketName,
    art: quote.dataset.art,
    study: Number(quote.dataset.study),
    sketch: quote.dataset.sketch,
    fee: quote.dataset.fee,
    priced: quote.dataset.price !== "",
    note: quote.dataset.note,
    no: String(i + 1).padStart(2, "0"),
  }, issue);
  if (issue) {
    one("[data-fare-status]").textContent = quote.querySelector("h3").textContent + ", " + quote.querySelector(".fare-meta").textContent;
  }
}
keys.forEach((key, i) => {
  function select(n) {
    pressRate(n, true);
    history.replaceState(null, "", "#" + quotes[n].id);
  }
  key.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    select(i);
  });
  key.addEventListener("keydown", (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in step)) return;
    event.preventDefault();
    const next = (i + step[event.key] + keys.length) % keys.length;
    keys[next].focus({preventScroll: true});
    select(next);
  });
});
narrow.addEventListener("change", placeWindow);
one(".rates").classList.add("press-enhanced");
pressRate(0);
function route() {
  const hash = location.hash.slice(1);
  const price = quotes.findIndex((quote) => quote.id === hash);
  if (price !== -1) {
    pressRate(price, false);
    (narrow.matches ? keys[price] : one("#prices")).scrollIntoView({ block: "start" });
    return;
  }
  const aliases = {
    "motion-sound": "sound", motion: "video",
    "price-ongoing": "campaigns", ongoing: "campaigns",
  };
  const fragment = hash.replace(/^example-/, "");
  const key = aliases[fragment] || fragment;
  const channelIndex = channels.findIndex((button) => button.dataset.channel === key);
  if (channelIndex !== -1) {
    chooseChannel(channelIndex);
    one("#services").scrollIntoView();
  }
  if (hash === "for-you" || hash.startsWith("audience-"))
    one("#studio").scrollIntoView();
}
route();
window.addEventListener("hashchange", route);
// The browser can restore the fragment to the scope after modules have run.
// On the initial visit frame the counter and board together once layout settles.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted && location.hash.startsWith("#price-")) {
    requestAnimationFrame(() => {
      if (location.hash === keys[rateIndex].hash) {
        (narrow.matches ? keys[rateIndex] : one("#prices")).scrollIntoView({ block: "start" });
      }
    });
  }
}, { once: true });
prefs.addEventListener("change", () => {
  if (prefs.matches) pressRate(rateIndex, false);
});

mountSketchbook(one(".sketchbook"), prefs);
mountSectionEntrances(gsap, signal, prefs);
