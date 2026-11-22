const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const gsap = window.gsap;
const motionAllowed = () =>
  gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastDialogTrigger;
function openDialog(dialog, trigger) {
  document.querySelector(".menu-switch[aria-expanded=true]")?.click();
  lastDialogTrigger = trigger;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add("modal-open");
  if (motionAllowed())
    gsap.fromTo(
      dialog,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.3, clearProps: "transform,opacity" },
    );
}
$$(".inquiry-dialog").forEach((dialog) => {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    gsap?.killTweensOf(dialog);
    document.body.classList.remove("modal-open");
    lastDialogTrigger?.focus({ preventScroll: true });
  });
});
let selectedPackage = "";
function choosePackage(name, price) {
  selectedPackage = name;
  const label = $("#selected-package");
  label.hidden = !name;
  label.textContent = name
    ? `Selected: ${name}${price ? " · " + new Intl.NumberFormat("en-GB").format(price) + " NOK excluding VAT" : ""}. We’ll confirm the scope before starting.`
    : "";
  if (name)
    prefillBrief(
      `I'd like to discuss ${name}.\n\nTimeline: \nBudget: \nProject details: `,
    );
}
let lastSuggestedBrief = "";
function prefillBrief(text) {
  const brief = $("#inquiry-form textarea");
  if (!brief.value.trim() || brief.value === lastSuggestedBrief) {
    brief.value = lastSuggestedBrief = text;
    brief.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
$$("[data-inquiry]").forEach((button) =>
  button.addEventListener("click", () => {
    if (button.dataset.package) {
      const fee = button.closest("[data-plan]")?.dataset.price;
      choosePackage(button.dataset.package, Number(fee));
    } else {
      choosePackage("", 0);
      const brief = $("#inquiry-form textarea");
      if (brief.value === lastSuggestedBrief) {
        brief.value = "";
        lastSuggestedBrief = "";
      }
    }
    form.dispatchEvent(new Event("input"));
    openDialog($("#inquiry-dialog"), button);
  }),
);
const queryPackage = new URLSearchParams(location.search).get("package");
const queryBundle = new URLSearchParams(location.search).get("packages");
if (queryPackage || queryBundle)
  fetch("pricing-data.json")
    .then((r) => r.json())
    .then((data) => {
      const p = data.packages.find((p) => p.id === queryPackage);
      let bundle = [...new Set((queryBundle || "").split(","))]
        .map((id) => data.packages.find((p) => p.id === id))
        .filter(Boolean);
      if (bundle.some((p) => p.id === "identity"))
        bundle = bundle.filter((p) => p.id !== "logo");
      if (p) {
        choosePackage(p.name, p.price);
        openDialog($("#inquiry-dialog"), $(".signoff-base a"));
      } else if (queryPackage === "ongoing") {
        choosePackage("Ongoing design support — 20 hours / month", 22000);
        openDialog($("#inquiry-dialog"), $(".signoff-base a"));
      } else if (bundle.length) {
        const total = bundle.reduce((sum, p) => sum + p.price, 0);
        choosePackage(bundle.map((p) => p.name).join(" + "), total);
        $("#inquiry-form textarea").value =
          `I'd like to discuss this combination:\n${bundle.map((p) => `${p.name}: ${p.price.toLocaleString("en-GB")} NOK`).join("\n")}\n\nPackage estimate: ${total.toLocaleString("en-GB")} NOK excluding VAT.\nPlease confirm scope overlap, timing and the final quote.\n\nTimeline: \nProject details: `;
        openDialog($("#inquiry-dialog"), $(".signoff-base a"));
      }
    })
    .catch(() => {});
const inquiryQuery = new URLSearchParams(location.search);
if (inquiryQuery.has("independent") || inquiryQuery.has("budget")) {
  const independent = inquiryQuery.has("independent");
  $("#inquiry-form textarea").value = independent
    ? "I'd like to ask about the independent rate.\n\nAbout our band or brand: \nWhat we need: \nBudget and timing: "
    : "I'd like to find a scope that fits our budget.\n\nWhat we need: \nWhat matters most: \nBudget and timing: ";
  openDialog($("#inquiry-dialog"), $(".signoff-base a"));
}

const form = $("#inquiry-form");
let inquiryText = "";
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const services = data.getAll("services");
  inquiryText = `Hi Red Studio,\n\nI'm ${data.get("name")}, and I'd love to talk about a project.\n\nPackage: ${selectedPackage || "Custom scope"}\nServices: ${services.length ? services.join(", ") : "To be confirmed"}\n\n${data.get("brief")}\n\nYou can reach me at ${data.get("email")}.\n\n${data.get("name")}`;
  const link = `mailto:theredstudiopost@gmail.com?subject=${encodeURIComponent("New project inquiry — " + data.get("name"))}&body=${encodeURIComponent(inquiryText)}`;
  $("#draft-mail-link").href = link;
  $("#draft-actions").hidden = false;
  form.querySelector("button[type=submit]").hidden = true;
  $("#form-status").textContent =
    "Your draft is ready. Open your email app to review and send, or copy the text below.";
});
form.addEventListener("input", () => {
  if (!$("#draft-actions").hidden) {
    $("#draft-actions").hidden = true;
    form.querySelector("button[type=submit]").hidden = false;
    $("#form-status").textContent = "";
  }
});
$("#copy-brief").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(inquiryText);
    $("#form-status").textContent =
      "Inquiry copied. Paste it into an email to theredstudiopost@gmail.com.";
  } catch {
    let field = $("#copy-fallback");
    if (!field) {
      field = document.createElement("textarea");
      field.id = "copy-fallback";
      field.setAttribute("aria-label", "Inquiry text to copy");
      $("#draft-actions").append(field);
    }
    field.value = inquiryText;
    field.focus();
    field.select();
    $("#form-status").textContent = "Select and copy your inquiry text below.";
  }
});
