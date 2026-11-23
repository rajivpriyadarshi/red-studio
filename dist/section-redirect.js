// Resolve old standalone URLs against this directory so project-site paths work too.
const section = document.currentScript.dataset.section;
const fragment = location.hash.slice(1);
const destination = new URL('index.html', location.href);
destination.search = location.search;
let anchor = section;
if (fragment === 'contact') anchor = 'contact';
if (section === 'studio' && fragment === 'principles') anchor = 'compliance';
if (section === 'services') {
  const service = fragment.replace(/^example-/, '');
  if (['brand', 'digital', 'apps', 'campaigns', 'motion', 'video', 'sound'].includes(service)) anchor = 'example-' + service;
  if (fragment === 'motion-sound') anchor = 'example-sound';
}
if (section === 'prices') {
  const plan = fragment.replace(/^price-/, '');
  if (['logo', 'identity', 'website', 'product', 'photo', 'campaign', 'motion', 'video', 'long-video', 'sound'].includes(plan)) anchor = 'price-' + plan;
  if (['ongoing', 'independent'].includes(fragment)) anchor = fragment;
}
destination.hash = anchor;
location.replace(destination.href);
