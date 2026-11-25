// The printed scope remains readable inline until its dialog is ready.
export function mountPackageDetails(
  dialog,
  quotes,
  phone,
  reduced,
  openInquiry,
) {
  if (typeof dialog?.showModal !== "function") return;
  const card = dialog.querySelector(".scope-card");
  const scroll = dialog.querySelector(".scope-scroll");
  const header = dialog.querySelector(".scope-head");
  const body = dialog.querySelector(".scope-body");
  let trigger, quote, animation, drag;
  const easeOut = "cubic-bezier(.18,.84,.24,1)";

  function open(button) {
    if (dialog.open) return;
    trigger = button;
    quote = button.closest(".fare-quote");
    header.querySelector("h2").textContent =
      quote.querySelector("h3").textContent;
    header.querySelector("p").textContent =
      quote.querySelector(".fare-meta").textContent;
    header.querySelector("img").src = new URL(
      "./assets/ticket-window/" + quote.dataset.art + ".webp?v=bird-1",
      import.meta.url,
    );
    card.style.setProperty("--scope-stock", quote.dataset.paper);
    body.replaceChildren(
      ...quote.querySelector(".fare-scope").cloneNode(true).children,
    );
    dialog.showModal();
    scroll.scrollTop = 0;
    const origin = trigger.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    dialog.dataset.shown = "";
    if (reduced.matches) return;
    const limit = (offset) => Math.max(-40, Math.min(40, offset));
    const x = limit(
      origin.left + origin.width / 2 - rect.left - rect.width / 2,
    );
    const y = limit(
      origin.top + origin.height / 2 - rect.top - rect.height / 2,
    );
    animation = card.animate(
      [
        {
          transform: phone.matches
            ? "translateY(100%)"
            : `translate(${x}px,${y}px) rotate(-1deg) scale(.96)`,
          opacity: phone.matches ? 1 : 0.45,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: phone.matches ? 370 : 310, easing: easeOut },
    );
  }

  function close(after) {
    if (!dialog.open || dialog.hasAttribute("data-closing")) return;
    dialog.dataset.closing = "";
    delete dialog.dataset.shown;
    const { transform, opacity } = getComputedStyle(card);
    animation?.cancel();
    drag = null;
    const finish = () => {
      animation = null;
      dialog.close();
      card.style.removeProperty("transform");
      delete dialog.dataset.closing;
      trigger.focus({ preventScroll: true });
      after?.();
    };
    if (reduced.matches) {
      finish();
      return;
    }
    animation = card.animate(
      [
        { transform, opacity },
        {
          transform: phone.matches
            ? "translateY(100%)"
            : "translateY(12px) scale(.985)",
          opacity: phone.matches ? 1 : 0,
        },
      ],
      {
        duration: phone.matches ? 245 : 170,
        easing: "cubic-bezier(.42,0,.8,.36)",
      },
    );
    animation.onfinish = finish;
  }

  for (const item of quotes) {
    const button = item.querySelector(".scope-opener");
    button.addEventListener("click", () => open(button));
    item.querySelector(".fare-scope").hidden = true;
    button.hidden = false;
  }
  dialog.querySelector(".scope-close").addEventListener("click", () => close());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  let outside = false;
  dialog.addEventListener("pointerdown", (event) => {
    outside = event.target === dialog;
  });
  dialog.addEventListener("click", (event) => {
    if (outside && event.target === dialog) close();
    outside = false;
  });

  dialog
    .querySelector(".scope-enquiry")
    .addEventListener("click", () =>
      close(() =>
        openInquiry(
          header.querySelector("h2").textContent,
          quote.dataset.price === "" ? null : Number(quote.dataset.price),
          trigger,
        ),
      ),
    );
  body.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    close(() => {
      location.hash = link.hash;
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "start" });
      }
    });
  });

  // Only the mobile header takes the pull-down gesture. The list scrolls normally.
  header.addEventListener("pointerdown", (event) => {
    if (
      !phone.matches ||
      !event.isPrimary ||
      event.button !== 0 ||
      dialog.hasAttribute("data-closing")
    )
      return;
    animation?.finish();
    drag = { id: event.pointerId, y: event.clientY, distance: 0 };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    drag.distance = Math.max(0, event.clientY - drag.y);
    if (!reduced.matches)
      card.style.transform = `translateY(${drag.distance}px)`;
  });
  function release(event) {
    if (drag?.id !== event.pointerId) return;
    const distance = drag.distance;
    drag = null;
    if (
      event.type === "pointerup" &&
      distance > Math.min(80, card.offsetHeight * 0.18)
    ) {
      close();
      return;
    }
    card.style.removeProperty("transform");
    if (distance && !reduced.matches)
      animation = card.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: "none" }],
        { duration: 205, easing: easeOut },
      );
  }
  header.addEventListener("pointerup", release);
  header.addEventListener("pointercancel", release);
  header.addEventListener("lostpointercapture", release);
  reduced.addEventListener("change", () => {
    if (reduced.matches && animation?.playState === "running")
      animation.finish();
  });
}
