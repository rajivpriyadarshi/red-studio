import { mountRubberType } from "./rubber-type.js?v=1";
import { mountWarpCarousel } from "./warp-carousel.js?v=showcase-depth-1";
import { mountStudyViewer } from "./design-studies.js?v=category-caption-1";
import { mountSketchbook } from "./sketchbook.js?v=desk-hover-1";
import { mountDispenser } from "./ticket-dispenser.js?v=bird-1";
import { openPackageInquiry } from "./brief.js?v=refresh-replay-1";
import { mountPackageDetails } from "./package-details.js?v=bird-1";
import { mountSectionEntrances } from "./section-entrances.js?v=work-caption-1";

const one = (s) => document.querySelector(s);
const all = (s) => [...document.querySelectorAll(s)];
const prefs = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 740px)");
mountRubberType(one(".marque svg"), prefs);
const gsap = window.gsap;
const canMove = () => Boolean(gsap && !prefs.matches);

import "./programme-nav.js?v=debut-3";

const cuts = all(".cut"),
  rail = one(".splice"),
  studyViewer = one("#design-viewer"),
  cinema = one("#cinema"),
  player = cinema.querySelector("video"),
  previewSound = one(".gallery-sound"),
  filmSound = one(".film-sound");
const showStudy = mountStudyViewer(studyViewer);
const films = cuts.filter(cut => cut.hasAttribute("data-loop"));
const clipPlayer = document.createElement("video");
clipPlayer.loop = true;
clipPlayer.playsInline = true;
clipPlayer.defaultMuted = true;
clipPlayer.muted = true;
clipPlayer.setAttribute("aria-hidden", "true");
clipPlayer.addEventListener("playing", () => clipPlayer.classList.add("playing"));
let galleryMuted = true;
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
const featureLink = one(".feature-link");
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
  const cut = current();
  if (!cut.dataset.loop) {
    previewSound.hidden = true;
    stopPreview();
    return;
  }
  labelSound(previewSound, galleryMuted, "preview");
  if (
    !inView || !rail.classList.contains("at-rest") || cinema.open || studyViewer.open || document.hidden ||
    (galleryMuted && (prefs.matches || navigator.connection?.saveData))
  ) {
    stopPreview();
    return;
  }
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
  if (!inView && !galleryMuted) rail.scrollIntoView({block: "center", behavior: "instant"});
  playback();
});
function selectProject(index) {
  active = index;
  cuts.forEach((cut, i) => {
    cut.classList.toggle("current", i === active);
    cut.tabIndex = i === active ? 0 : -1;
    if (i === active) cut.setAttribute("aria-current", "true");
    else cut.removeAttribute("aria-current");
  });
  const cut = current();
  one("[data-work-name]").textContent = cut.dataset.category + ", " + cut.dataset.title + ", project ";
  one("[data-work-count]").textContent =
    String(active + 1).padStart(2, "0") +
    " / " +
    String(cuts.length).padStart(2, "0");
  featureLink.href = cut.href;
  featureLink.replaceChildren(cut.querySelector(".cut-label").cloneNode(true));
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
  const { left, top, width, height } = cut.querySelector(".cut-image").getBoundingClientRect();
  return { left, top, width, height };
}
function openProject(trigger) {
  const cut = current();
  const dialog = cut.dataset.loop ? cinema : studyViewer;
  if (typeof dialog.showModal !== "function") {
    location.assign(cut.href);
    return;
  }
  if (cut.dataset.loop) openFilm(trigger);
  else showStudy(cut, trigger);
}
function openFilm(trigger) {
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
const choose = mountWarpCarousel(rail, cuts, prefs, selectProject, openProject, playback);
featureLink.closest(".showcase-heading").hidden = false;
featureLink.addEventListener("click", event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openProject(featureLink);
});
one("[data-prev]").addEventListener("click", () => choose(active - 1, true));
one("[data-next]").addEventListener("click", () => choose(active + 1, true));
one(".next-screen").addEventListener("click", () => {
  const nextFilm = films[(films.indexOf(current()) + 1) % films.length];
  choose(cuts.indexOf(nextFilm), false);
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
prefs.addEventListener("change", playback);
window.addEventListener("pagehide", () => {
  stopPreview();
  player.pause();
});
window.addEventListener("pageshow", playback);
one(".stepper").hidden = false;

const keys = all(".fare-row");
const quotes = all(".fare-quote");
const fareDisplay = one(".fare-display");
const fareLayout = one(".fare-layout");
mountPackageDetails(one("#package-scope"), quotes, narrow, prefs, openPackageInquiry);
const dispense = mountDispenser(one(".counter-scene"), prefs);
let rateIndex = 0;

function placeWindow() {
  const detail = quotes[rateIndex];
  if (narrow.matches) {
    if (detail.nextElementSibling !== fareDisplay) detail.after(fareDisplay);
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
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    pressRate(n, true);
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
  const selectedCut = hash ? cuts.findIndex(cut => cut.id === hash) : -1;
  if (selectedCut !== -1) {
    choose(selectedCut, false);
    rail.scrollIntoView({ block: "center", behavior: "instant" });
    return;
  }
  // Former service pages and bookmarks now open the matching package on the board.
  const servicePlans = {
    brand: "logo", campaigns: "campaign", digital: "website", apps: "product",
    video: "video", sound: "sound", motion: "motion", "motion-sound": "sound",
    ongoing: "campaign", "price-ongoing": "campaign",
  };
  const oldService = hash.replace(/^example-/, "");
  const plan = Object.hasOwn(servicePlans, oldService) ? servicePlans[oldService] : null;
  const price = quotes.findIndex(quote => quote.id === (plan ? "price-" + plan : hash));
  if (price !== -1) {
    history.replaceState(history.state, "", location.pathname + location.search);
    pressRate(price, false);
    (narrow.matches ? keys[price] : one("#services")).scrollIntoView({ block: "start" });
    return;
  }
  if (hash === "for-you" || hash.startsWith("audience-"))
    one("#studio").scrollIntoView();
}
route();
window.addEventListener("hashchange", route);
prefs.addEventListener("change", () => {
  if (prefs.matches) pressRate(rateIndex, false);
});

mountSketchbook(one(".sketchbook"), prefs);
mountSectionEntrances(gsap, prefs);
