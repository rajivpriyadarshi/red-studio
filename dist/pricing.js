// A link from a service opens its corresponding scope in the price list.
function openPrice(hash) {
  const row = document.getElementById(hash.slice(1));
  if (row?.matches('details.rate-row')) row.open = true;
}

openPrice(location.hash);
window.addEventListener('hashchange', () => openPrice(location.hash));
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) openPrice(link.hash);
});
