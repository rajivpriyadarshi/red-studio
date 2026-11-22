// The motor track and the paper travel share two feed strokes and a final shear.
export function mountDispenser(machine, gsap, motionPreference) {
  const paper = machine.querySelector(".paper-feed");
  const drum = machine.querySelector(".feed-drum");
  const blade = machine.querySelector(".cut-blade");
  const number = machine.querySelector("[data-machine-number]");
  const sound = machine.querySelector(".press-sound");
  const track = new Audio();
  track.preload = "none";
  track.src = new URL(
    "./assets/programme/ticket-press.wav",
    import.meta.url,
  ).href;
  let motion;
  let muted = false;
  try {
    muted = sessionStorage.getItem("red-press-muted") === "true";
  } catch {}
  function syncSound() {
    sound.hidden = false;
    sound.setAttribute("aria-pressed", String(!muted));
    sound.title = muted ? "Turn printer sound on" : "Mute printer";
  }
  syncSound();
  sound.addEventListener("click", () => {
    muted = !muted;
    if (muted) track.pause();
    try {
      sessionStorage.setItem("red-press-muted", String(muted));
    } catch {}
    syncSound();
  });
  const nearby = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && track.preload === "none") {
      track.preload = "auto";
      track.load();
    }
    if (!entry.isIntersecting) track.pause();
  });
  nearby.observe(machine);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) track.pause();
  });
  window.addEventListener("pagehide", () => track.pause());

  return function print(index, ink, issue) {
    motion?.kill();
    track.pause();
    number.textContent = String(index + 1).padStart(2, "0");
    if (issue) {
      const bounds = machine.getBoundingClientRect();
      if (bounds.bottom > innerHeight && bounds.height <= innerHeight) {
        machine.scrollIntoView({
          block: "nearest",
          behavior: motionPreference.matches ? "instant" : "smooth",
        });
      }
    }
    if (issue && !muted && !document.hidden) {
      track.currentTime = 0;
      track.play().catch(() => {});
    }
    if (!issue || !gsap || motionPreference.matches) {
      machine.classList.remove("feeding");
      gsap?.set([paper, drum, blade], { clearProps: "transform,opacity" });
      ink();
      return;
    }
    machine.classList.add("feeding");
    motion = gsap.timeline({
      onComplete() {
        machine.classList.remove("feeding");
        gsap.set([paper, drum, blade], { clearProps: "transform,opacity" });
      },
    });
    motion
      .to(
        paper,
        {
          yPercent: 28,
          rotation: 3,
          opacity: 0,
          duration: 0.19,
          ease: "power2.in",
        },
        0,
      )
      .call(ink, [], 0.19)
      .set(
        paper,
        { yPercent: -103, rotation: 0, rotationX: 0, opacity: 1 },
        0.19,
      )
      .to(paper, { yPercent: -47, duration: 0.37, ease: "sine.inOut" }, 0.21)
      .to(paper, { yPercent: -1.8, duration: 0.385, ease: "sine.inOut" }, 0.6)
      .fromTo(
        drum,
        { y: -2 },
        { y: 2, repeat: 13, duration: 0.054, ease: "none" },
        0.21,
      )
      .fromTo(
        blade,
        { y: -1 },
        { y: 3, duration: 0.07, yoyo: true, repeat: 1 },
        0.985,
      )
      .to(
        paper,
        {
          yPercent: 0.9,
          rotation: -0.65,
          rotationX: 3.5,
          duration: 0.12,
          ease: "power2.out",
        },
        1.045,
      )
      .to(paper, {
        yPercent: 0,
        rotation: 0,
        rotationX: 0,
        duration: 0.31,
        ease: "sine.inOut",
      });
  };
}
