const one = (s) => document.querySelector(s);
const narrow = matchMedia("(max-width: 740px)");
const menuSwitch = one(".menu-switch"),
  menu = one("#compact-menu");
function menuOpen(open) {
  menu.hidden = !open;
  menuSwitch.setAttribute("aria-expanded", String(open));
  menuSwitch.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
}
menuSwitch.addEventListener("click", () => menuOpen(menu.hidden));
menu.addEventListener("click", (e) => {
  if (e.target.closest("a")) menuOpen(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) {
    menuOpen(false);
    menuSwitch.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!menu.hidden && !e.target.closest(".station-head")) menuOpen(false);
});
narrow.addEventListener("change", () => menuOpen(false));
