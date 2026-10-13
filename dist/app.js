const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const gsap=window.gsap,ScrollTrigger=window.ScrollTrigger;
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const state={calm:preference.matches,paused:false,heroScroll:0,needsRender:true};
let motionContext,disposeSculpture,introPlayed=false,lastDialogTrigger,menuOpen=false;
const seenEntrances=new WeakSet();
if(gsap&&ScrollTrigger)gsap.registerPlugin(ScrollTrigger);

function setupMotion(){
 motionContext?.revert();state.calm=state.override===undefined?preference.matches:state.override;state.needsRender=true;
 document.body.classList.toggle('motion-paused',state.calm);
 const toggle=$('#motion-toggle');toggle.setAttribute('aria-pressed',String(state.calm));toggle.setAttribute('aria-label',state.calm?'Enable motion':'Pause motion');toggle.querySelector('.settings-label').textContent=state.calm?'Enable motion':'Pause motion';toggle.querySelector('.motion-icon').textContent=state.calm?'▶':'Ⅱ';
 if(!gsap)return;
 if(state.calm){introPlayed=true;return;}
 motionContext=gsap.context(()=>{
  if(!introPlayed){introPlayed=true;gsap.timeline({defaults:{ease:'power4.out'}}).from('.hero-line',{yPercent:110,rotation:2,duration:1.05,stagger:.08},.05).from('.hero-eyebrow',{autoAlpha:0,y:12,duration:.5},.2).from('.hero-art',{autoAlpha:0,scale:.94,rotation:-4,duration:1.2},.15).from('.hero-lead,.hero-actions',{autoAlpha:0,y:14,duration:.65,stagger:.08},.65).from('.hero-bottom>*',{autoAlpha:0,y:12,duration:.6,stagger:.08},.8);}
  gsap.to(state,{heroScroll:1,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8}});
  const enter=(el,vars={})=>{if(seenEntrances.has(el))return;gsap.from(el,{y:24,autoAlpha:0,duration:.7,ease:'power3.out',...vars,scrollTrigger:{trigger:el,start:'top 92%',once:true,onEnter:()=>seenEntrances.add(el)}});};
  $$('.reveal,.project-art,.team-person,.home-process li').forEach(el=>enter(el));
  $$('.capability-row').forEach(el=>enter(el,{y:14,duration:.55}));
  if($('.echo-rings'))gsap.to('.echo-rings',{rotation:18,ease:'none',scrollTrigger:{trigger:'.echo-art',start:'top bottom',end:'bottom top',scrub:1}});
  const contact=$('.contact-title');if(!seenEntrances.has(contact))gsap.from('.contact-title .line-mask>span',{yPercent:105,stagger:.1,duration:.9,scrollTrigger:{trigger:contact,start:'top 90%',once:true,onEnter:()=>seenEntrances.add(contact)}});
 });
}
setupMotion();
$('#motion-toggle').addEventListener('click',()=>{state.override=!state.calm;setupMotion();});
preference.addEventListener('change',()=>{state.override=undefined;setupMotion();});
if(gsap&&ScrollTrigger)gsap.to('.progress-line',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:true}});
document.fonts.ready.then(()=>ScrollTrigger?.refresh());window.addEventListener('load',()=>ScrollTrigger?.refresh());

import('./scenes.js?v=structure-1').then(({createSculpture})=>{
 try{disposeSculpture=createSculpture($('#hero-art'),$('#sculpture'),state);}catch(e){console.info('Sculpture uses the illustrated fallback.',e.message);}
}).catch(()=>{});

function setMenu(open){menuOpen=open;$('.menu-button').setAttribute('aria-expanded',String(open));$('.menu-button').setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-menu').hidden=!open;document.body.classList.toggle('dialog-open',open);$('main').inert=open;$('footer').inert=open;if(open&&!state.calm&&gsap)gsap.from('#mobile-menu nav>*',{y:25,autoAlpha:0,stagger:.06,duration:.5,clearProps:'all'});}
$('.menu-button').addEventListener('click',()=>setMenu(!menuOpen));$$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));window.addEventListener('resize',()=>{if(innerWidth>760&&menuOpen)setMenu(false);});

function openDialog(dialog,trigger){setMenu(false);lastDialogTrigger=trigger;dialog.showModal();document.body.classList.add('dialog-open');if(gsap&&!state.calm)gsap.fromTo(dialog,{autoAlpha:0,y:30,scale:.97},{autoAlpha:1,y:0,scale:1,duration:.4,ease:'power3.out',clearProps:'transform,opacity,visibility'});}
$$('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{gsap?.killTweensOf(dialog);document.body.classList.remove('dialog-open');lastDialogTrigger?.focus({preventScroll:true});});});
let selectedPackage='';
function choosePackage(name,price){selectedPackage=name;const label=$('#selected-package');label.hidden=!name;label.textContent=name?`Selected: ${name}${price?' · '+new Intl.NumberFormat('en-GB').format(price)+' NOK excluding VAT':''}. We’ll confirm the scope before starting.`:'';const brief=$('#inquiry-form textarea');if(name&&!brief.value)brief.value=`I'd like to discuss ${name}.\n\nTimeline: \nBudget: \nProject details: `;}
$$('[data-inquiry]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.package)choosePackage(b.dataset.package,Number(b.closest('[data-plan],.price-card')?.querySelector('[data-price]')?.dataset.price));openDialog($('#inquiry-dialog'),b);}));
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
$$('.service').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open&&gsap&&!state.calm)gsap.fromTo(detail.querySelector('.service-content'),{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.35,clearProps:'all'});ScrollTrigger?.refresh();}));

const form=$('#inquiry-form');let inquiryText='';
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const services=data.getAll('services');inquiryText=`Hi Red Studio,\n\nI'm ${data.get('name')}, and I'd love to talk about a project.\n\nPackage: ${selectedPackage||'Custom scope'}\nServices: ${services.length?services.join(', '):'To be confirmed'}\n\n${data.get('brief')}\n\nYou can reach me at ${data.get('email')}.\n\n${data.get('name')}`;const link=`mailto:theredstudio@gmail.com?subject=${encodeURIComponent('New project inquiry — '+data.get('name'))}&body=${encodeURIComponent(inquiryText)}`;$('#draft-mail-link').href=link;$('#draft-actions').hidden=false;form.querySelector('button[type=submit]').hidden=true;$('#form-status').textContent='Your draft is ready. Open your email app to review and send, or copy the text below.';});
form.addEventListener('input',()=>{if(!$('#draft-actions').hidden){$('#draft-actions').hidden=true;form.querySelector('button[type=submit]').hidden=false;$('#form-status').textContent='';}});
$('#copy-brief').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inquiryText);$('#form-status').textContent='Inquiry copied. Paste it into an email to theredstudio@gmail.com.';}catch{let field=$('#copy-fallback');if(!field){field=document.createElement('textarea');field.id='copy-fallback';field.setAttribute('aria-label','Inquiry text to copy');$('#draft-actions').append(field);}field.value=inquiryText;field.focus();field.select();$('#form-status').textContent='Select and copy your inquiry text below.';}});

if(matchMedia('(pointer:fine)').matches&&gsap){$$('.play-icon,.contact-link>span').forEach(el=>{const parent=el.parentElement;const x=gsap.quickTo(el,'x',{duration:.4,ease:'power3'}),y=gsap.quickTo(el,'y',{duration:.4,ease:'power3'});parent.addEventListener('pointermove',e=>{if(state.calm)return;const r=parent.getBoundingClientRect();x((e.clientX-r.left-r.width/2)*.12);y((e.clientY-r.top-r.height/2)*.2);});parent.addEventListener('pointerleave',()=>{x(0);y(0);});});}

window.addEventListener('pagehide',event=>{state.paused=true;if(event.persisted)return;disposeSculpture?.();motionContext?.revert();});
window.addEventListener('pageshow',event=>{if(event.persisted){state.paused=false;state.needsRender=true;ScrollTrigger?.refresh();}});

document.addEventListener('keydown',e=>{if(!menuOpen)return;if(e.key==='Escape'){setMenu(false);$('.menu-button').focus();}if(e.key==='Tab'){const controls=[$('.menu-button'),...$$('#mobile-menu a')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
