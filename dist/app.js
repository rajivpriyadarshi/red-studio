import './page.js?v=studio-1122-d';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const gsap=window.gsap, preference=matchMedia('(prefers-reduced-motion: reduce)');
const motionAllowed=()=>gsap&&!preference.matches;

if(gsap && window.ScrollTrigger) {
  gsap.registerPlugin(window.ScrollTrigger);
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)',()=>{
    gsap.timeline({defaults:{ease:'power3.out'}})
      .fromTo('.type-mask>*',{yPercent:84},{yPercent:0,duration:.94,stagger:.09,clearProps:'transform'},0)
      .from('.cover-credit',{opacity:0,y:8,duration:.48,clearProps:'all'},.47);
    for(const heading of $$('.spread-title h2,.price-intro h2,.end-card h2')){
      gsap.from(heading,{y:28,clipPath:'inset(0 0 82% 0)',duration:.88,ease:'power3.out',clearProps:'transform,clipPath',scrollTrigger:{trigger:heading,start:'top 96%',once:true}});
    }
    const screen=$('.projection-window');
    gsap.fromTo('.offgrid img',{scale:1.12},{scale:1,ease:'none',scrollTrigger:{trigger:screen,start:'top bottom',end:'bottom top',scrub:true}});
  });
}

import('./exposure.js?v=studio-1122-d').then(({mountExposure})=>mountExposure($('.exposure-stage'))).catch(()=>{
  // The photograph is already in the document when WebGL is unavailable.
});

const model=$('.optic-stage');
const modelObserver=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  modelObserver.disconnect();
  import('./optics.js?v=studio-1122-d').then(({mountOptic})=>mountOptic(model)).catch(()=>{});
});
modelObserver.observe(model);

const projector=$('.projector');
const films=$$('.project-frame'),choices=$$('[data-film-choice]');
const credits=[
  'Visual identity for an imagined outdoor brand.',
  'A digital catalogue for an imagined interiors brand.',
  'A sleeve and motion study for an imagined sound label.'
];
let activeFilm=0,transition=null;
function selectFilm(index,animate=true){
  const next=(index+films.length)%films.length;
  if(next===activeFilm && animate)return;
  transition?.kill();
  transition=null;
  if(gsap)gsap.set([...films, $('.film-credit'), $('.form-paper>em'), $('.echo-disc')],{clearProps:'clipPath,transform,opacity'});
  const previous=activeFilm;activeFilm=next;
  projector.dataset.ready='';
  films.forEach((film,i)=>{film.hidden=i!==next;film.setAttribute('aria-hidden',String(i!==next));film.style.zIndex='';});
  choices.forEach((choice,i)=>choice.setAttribute('aria-pressed',String(i===next)));
  $('.film-credit').textContent=credits[next];
  if(!motionAllowed()||!animate||previous===next)return;
  const incoming=films[next],outgoing=films[previous];outgoing.hidden=false;incoming.style.zIndex=2;
  const done=()=>{outgoing.hidden=true;incoming.style.zIndex='';transition=null;};
  transition=gsap.timeline({defaults:{ease:'power3.inOut'},onComplete:done});
  const masks=['inset(0 0 0 100%)','inset(100% 0 0 0)','circle(0% at 68% 50%)'];
  const open=next===2?'circle(140% at 68% 50%)':'inset(0 0 0 0)';
  gsap.set(outgoing,{clearProps:'clipPath,transform,opacity'});
  transition.fromTo(incoming,{clipPath:masks[next]},{clipPath:open,duration:.78,clearProps:'clipPath'},0);
  if(next===1)transition.fromTo('.form-paper>em',{yPercent:50},{yPercent:0,duration:.68,clearProps:'transform'},.15);
  if(next===2)transition.fromTo('.echo-disc',{rotation:-60},{rotation:0,duration:1.1,ease:'power3.out',clearProps:'transform'},.02);
  transition.fromTo('.film-credit',{y:7,opacity:0},{y:0,opacity:1,duration:.45,clearProps:'transform,opacity'},.18);
}
choices.forEach((button,i)=>button.addEventListener('click',()=>selectFilm(i)));
projector.addEventListener('keydown',event=>{
  const keys={ArrowLeft:activeFilm-1,ArrowRight:activeFilm+1,Home:0,End:films.length-1};
  if(!(event.key in keys))return;
  event.preventDefault();selectFilm(keys[event.key]);if(event.target.closest('.film-choices'))choices[activeFilm].focus();
});
const screen=$('.projection-window');
let start=null;
screen.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)start={x:e.clientX,y:e.clientY,id:e.pointerId};});
screen.addEventListener('pointerup',e=>{
  if(!start||start.id!==e.pointerId)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)selectFilm(activeFilm+(dx<0?1:-1));
});
screen.addEventListener('pointercancel',()=>{start=null;});
preference.addEventListener('change',()=>{gsap?.set(films,{clearProps:'clipPath,transform'});selectFilm(activeFilm,false);});
selectFilm(0,false);

let lastDialogTrigger;
function openDialog(dialog,trigger){
  document.querySelector('.menu-button[aria-expanded=true]')?.click();
  lastDialogTrigger=trigger;
  if(!dialog.open)dialog.showModal();
  document.body.classList.add('dialog-open');
  if(motionAllowed())gsap.fromTo(dialog,{opacity:0,y:15},{opacity:1,y:0,duration:.3,clearProps:'transform,opacity'});
}
$$('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{gsap?.killTweensOf(dialog);document.body.classList.remove('dialog-open');lastDialogTrigger?.focus({preventScroll:true});});});
let selectedPackage='';
function choosePackage(name,price){selectedPackage=name;const label=$('#selected-package');label.hidden=!name;label.textContent=name?`Selected: ${name}${price?' · '+new Intl.NumberFormat('en-GB').format(price)+' NOK excluding VAT':''}. We’ll confirm the scope before starting.`:'';if(name)prefillBrief(`I'd like to discuss ${name}.\n\nTimeline: \nBudget: \nProject details: `);}
let lastSuggestedBrief = '';
function prefillBrief(text) {
 const brief = $('#inquiry-form textarea');
 if (!brief.value.trim() || brief.value === lastSuggestedBrief) {
  brief.value = lastSuggestedBrief = text;
  brief.dispatchEvent(new Event('input', {bubbles:true}));
 }
}
$$('[data-inquiry]').forEach(button => button.addEventListener('click', () => {
 if (button.dataset.package) {
  const fee=button.closest('details')?.querySelector('[data-price]')?.dataset.price;
  choosePackage(button.dataset.package, Number(fee));
 } else {
  choosePackage('',0);
  const brief=$('#inquiry-form textarea');
  if(brief.value===lastSuggestedBrief){brief.value=''; lastSuggestedBrief='';}
 }
 form.dispatchEvent(new Event('input'));
 openDialog($('#inquiry-dialog'), button);
}));
const queryPackage=new URLSearchParams(location.search).get('package');
const queryBundle=new URLSearchParams(location.search).get('packages');
if(queryPackage||queryBundle)fetch('pricing-data.json').then(r=>r.json()).then(data=>{
 const p=data.packages.find(p=>p.id===queryPackage);
 let bundle=[...new Set((queryBundle||'').split(','))].map(id=>data.packages.find(p=>p.id===id)).filter(Boolean);
 if(bundle.some(p=>p.id==='identity'))bundle=bundle.filter(p=>p.id!=='logo');
 if(p){choosePackage(p.name,p.price);openDialog($('#inquiry-dialog'),$('.contact-title'));}
 else if(queryPackage==='ongoing'){choosePackage('Ongoing design support — 20 hours / month',22000);openDialog($('#inquiry-dialog'),$('.contact-title'));}
 else if(bundle.length){const total=bundle.reduce((sum,p)=>sum+p.price,0);choosePackage(bundle.map(p=>p.name).join(' + '),total);$('#inquiry-form textarea').value=`I'd like to discuss this combination:\n${bundle.map(p=>`${p.name}: ${p.price.toLocaleString('en-GB')} NOK`).join('\n')}\n\nPackage estimate: ${total.toLocaleString('en-GB')} NOK excluding VAT.\nPlease confirm scope overlap, timing and the final quote.\n\nTimeline: \nProject details: `;openDialog($('#inquiry-dialog'),$('.contact-title'));}
}).catch(()=>{});
const inquiryQuery = new URLSearchParams(location.search);
if (inquiryQuery.has('independent') || inquiryQuery.has('budget')) {
 const independent = inquiryQuery.has('independent');
 $('#inquiry-form textarea').value = independent
  ? "I'd like to ask about the independent rate.\n\nAbout our band or brand: \nWhat we need: \nBudget and timing: "
  : "I'd like to find a scope that fits our budget.\n\nWhat we need: \nWhat matters most: \nBudget and timing: ";
 openDialog($('#inquiry-dialog'), $('.contact-title'));
}

const form=$('#inquiry-form');let inquiryText='';
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const services=data.getAll('services');inquiryText=`Hi Red Studio,\n\nI'm ${data.get('name')}, and I'd love to talk about a project.\n\nPackage: ${selectedPackage||'Custom scope'}\nServices: ${services.length?services.join(', '):'To be confirmed'}\n\n${data.get('brief')}\n\nYou can reach me at ${data.get('email')}.\n\n${data.get('name')}`;const link=`mailto:theredstudiopost@gmail.com?subject=${encodeURIComponent('New project inquiry — '+data.get('name'))}&body=${encodeURIComponent(inquiryText)}`;$('#draft-mail-link').href=link;$('#draft-actions').hidden=false;form.querySelector('button[type=submit]').hidden=true;$('#form-status').textContent='Your draft is ready. Open your email app to review and send, or copy the text below.';});
form.addEventListener('input',()=>{if(!$('#draft-actions').hidden){$('#draft-actions').hidden=true;form.querySelector('button[type=submit]').hidden=false;$('#form-status').textContent='';}});
$('#copy-brief').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inquiryText);$('#form-status').textContent='Inquiry copied. Paste it into an email to theredstudiopost@gmail.com.';}catch{let field=$('#copy-fallback');if(!field){field=document.createElement('textarea');field.id='copy-fallback';field.setAttribute('aria-label','Inquiry text to copy');$('#draft-actions').append(field);}field.value=inquiryText;field.focus();field.select();$('#form-status').textContent='Select and copy your inquiry text below.';}});
