export function mountStudyViewer(viewer) {
  const picture = viewer.querySelector("#study-plate");
  const picker = viewer.querySelector(".study-views");
  const close = viewer.querySelector(".study-close");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  let trigger;
  let sequence = 0;
  let transition;

  function showView(view, button, opening = false) {
    const request = ++sequence;
    for (const item of picker.children) {
      item.setAttribute("aria-pressed", String(item === button));
    }
    const image = new Image();
    image.src = view.dataset.image;
    const present = () => {
      if (request !== sequence || !viewer.open) return;
      picture.alt = view.dataset.viewAlt;
      picture.src = image.src;
      transition?.cancel();
      if (!opening && motion.matches) {
        transition = picture.animate(
          [{ opacity: .65, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
          { duration: 240, easing: "ease-out" },
        );
      }
    };
    // Keep the current plate visible until the next one is ready.
    if (image.complete) present();
    else image.decode().then(present, present);
  }

  function open(card, opener) {
    trigger = opener;
    viewer.querySelector("#study-title").textContent = card.dataset.title;
    viewer.querySelector(".study-discipline").textContent = card.dataset.category + (card.querySelector(".cut-context")?.textContent ?? "");
    viewer.querySelector(".study-description").textContent = card.dataset.description;
    const views = [...card.querySelectorAll("[data-view]")];
    picker.replaceChildren(...views.map(view => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = view.dataset.view;
      button.addEventListener("click", () => showView(view, button));
      return button;
    }));
    picture.src = card.href;
    picture.alt = views[0].dataset.viewAlt;
    viewer.showModal();
    viewer.scrollTop = 0;
    showView(views[0], picker.firstElementChild, true);
  }
  close.addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", event => {
    if (event.target !== viewer) return;
    const r = viewer.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right ||
        event.clientY < r.top || event.clientY > r.bottom) viewer.close();
  });
  viewer.addEventListener("close", () => {
    if (viewer.open) return;
    sequence++;
    transition?.cancel();
    if (document.activeElement === document.body) trigger?.focus({preventScroll: true});
  });
  return open;
}
