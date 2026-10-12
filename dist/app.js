const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const gsap=window.gsap,ScrollTrigger=window.ScrollTrigger;
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const state={calm:preference.matches,paused:false,heroScroll:0,frequency:220,needsRender:true};
let motionContext,signal,disposeSculpture,introPlayed=false,reelTimeline,lastDialogTrigger,menuOpen=false;
if(gsap&&ScrollTrigger)gsap.registerPlugin(ScrollTrigger);

function setupMotion(){
 motionContext?.revert();state.calm=state.override===undefined?preference.matches:state.override;state.needsRender=true;
 document.body.classList.toggle('motion-paused',state.calm);
 const toggle=$('#motion-toggle');toggle.setAttribute('aria-pressed',String(state.calm));toggle.setAttribute('aria-label',state.calm?'Enable motion':'Pause motion');toggle.querySelector('.settings-label').textContent=state.calm?'Enable motion':'Pause motion';toggle.querySelector('.motion-icon').textContent=state.calm?'▶':'Ⅱ';
 if(!gsap)return;
 if(state.calm){introPlayed=true;reelTimeline?.pause();return;}
 motionContext=gsap.context(()=>{
  if(!introPlayed){introPlayed=true;gsap.timeline({defaults:{ease:'power4.out'}}).from('.hero-line',{yPercent:110,rotation:3,duration:1.2,stagger:.09},.05).from('.hero-eyebrow',{autoAlpha:0,y:15,duration:.6},.25).from('.hero-art',{autoAlpha:0,scale:.85,rotation:-8,duration:1.5},.2).from('.hero-bottom>*',{autoAlpha:0,y:18,duration:.8,stagger:.1},.7);}
  gsap.to('.marquee-track',{xPercent:-50,duration:27,ease:'none',repeat:-1});
  gsap.to('.hero-art',{y:70,rotation:5,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gsap.to(state,{heroScroll:1,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8}});
  $$('.reveal').forEach(el=>gsap.from(el,{y:38,autoAlpha:0,duration:.9,scrollTrigger:{trigger:el,start:'top 92%',once:true}}));
  $$('.project-art').forEach(el=>gsap.from(el,{y:45,autoAlpha:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}}));
  gsap.to('.echo-rings',{rotation:18,ease:'none',scrollTrigger:{trigger:'.echo-art',start:'top bottom',end:'bottom top',scrub:1}});
  gsap.to('.studio-symbol',{rotation:150,ease:'none',scrollTrigger:{trigger:'.studio-section',start:'top bottom',end:'bottom top',scrub:1}});
  const manifesto=$('.manifesto');if(!manifesto.dataset.split){const words=manifesto.innerHTML.split(/(<[^>]*>|\s+)/);manifesto.innerHTML=words.map(w=>w.startsWith('<')||/^\s*$/.test(w)?w:`<span class="manifesto-word">${w}</span>`).join('');manifesto.dataset.split='true';}
  gsap.fromTo('.manifesto-word',{opacity:.2},{opacity:1,stagger:.1,ease:'none',scrollTrigger:{trigger:manifesto,start:'top 85%',end:'bottom 45%',scrub:.5}});
  gsap.from('.contact-title .line-mask>span',{yPercent:105,stagger:.12,duration:1.1,scrollTrigger:{trigger:'.contact-title',start:'top 90%',once:true}});
 });
}
setupMotion();
$('#motion-toggle').addEventListener('click',()=>{state.override=!state.calm;setupMotion();});
preference.addEventListener('change',()=>{state.override=undefined;setupMotion();});
if(gsap&&ScrollTrigger)gsap.to('.progress-line',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:true}});
document.fonts.ready.then(()=>ScrollTrigger?.refresh());window.addEventListener('load',()=>ScrollTrigger?.refresh());

import('./scenes.js').then(({createSculpture,createSignal})=>{
 try{disposeSculpture=createSculpture($('#hero-art'),$('#sculpture'),state);}catch(e){console.info('Sculpture uses the illustrated fallback.',e.message);}
 try{signal=createSignal($('#playground'),$('#signal-canvas'),state);}catch(e){console.info('Feeling lab uses the visual fallback.',e.message);}
}).catch(()=>{});

function setMenu(open){menuOpen=open;$('.menu-button').setAttribute('aria-expanded',String(open));$('.menu-button').setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-menu').hidden=!open;document.body.classList.toggle('dialog-open',open);$('main').inert=open;$('footer').inert=open;if(open&&!state.calm&&gsap)gsap.from('#mobile-menu nav>*',{y:25,autoAlpha:0,stagger:.06,duration:.5,clearProps:'all'});}
$('.menu-button').addEventListener('click',()=>setMenu(!menuOpen));$$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));window.addEventListener('resize',()=>{if(innerWidth>760&&menuOpen)setMenu(false);});

function openDialog(dialog,trigger){setMenu(false);lastDialogTrigger=trigger;dialog.showModal();document.body.classList.add('dialog-open');if(gsap&&!state.calm)gsap.fromTo(dialog,{autoAlpha:0,y:30,scale:.97},{autoAlpha:1,y:0,scale:1,duration:.4,ease:'power3.out',clearProps:'transform,opacity,visibility'});}
$$('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{gsap?.killTweensOf(dialog);document.body.classList.remove('dialog-open');if(dialog.id==='reel-dialog')reelTimeline?.pause();lastDialogTrigger?.focus({preventScroll:true});});});
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

let audioContext,masterGain,oscillators=[],soundOn=false,frequencyText=0;
async function toggleSound(){
 if(soundOn){stopSound();return;}
 try{audioContext??=new AudioContext();await audioContext.resume();masterGain=audioContext.createGain();masterGain.gain.value=0;masterGain.connect(audioContext.destination);const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;filter.connect(masterGain);oscillators=[1,1.005,.5].map((ratio,i)=>{const osc=audioContext.createOscillator();osc.type=i===2?'sine':'triangle';osc.frequency.value=state.frequency*ratio;const gain=audioContext.createGain();gain.gain.value=i===2?.3:.12;osc.connect(gain);gain.connect(filter);osc.start();return osc;});masterGain.gain.linearRampToValueAtTime(.16,audioContext.currentTime+.4);soundOn=true;updateSoundUI();}catch{$('#sound-toggle span').textContent='Audio unavailable';}
}
function updateSoundUI(){$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));$('#sound-toggle span').textContent=soundOn?'Sound on':'Sound off';$('#sound-toggle path').setAttribute('d',soundOn?'M3 10h4l5-4v12l-5-4H3z M16 8c3 2 3 6 0 8 M19 5c5 4 5 10 0 14':'M3 10h4l5-4v12l-5-4H3z M16 9l5 6m0-6-5 6');}
function stopSound(){if(!soundOn)return;soundOn=false;masterGain.gain.setTargetAtTime(0,audioContext.currentTime,.06);const old=oscillators;const oldGain=masterGain;setTimeout(()=>{old.forEach(o=>o.stop());oldGain.disconnect();},350);oscillators=[];updateSoundUI();}
$('#sound-toggle').addEventListener('click',toggleSound);$('#shuffle-feeling').addEventListener('click',()=>{signal?.shuffle();state.frequency=Math.round(110+Math.random()*550);if(!state.calm&&gsap)gsap.fromTo($('#shuffle-feeling span'),{rotation:0},{rotation:360,duration:.6,ease:'power2.out'});});
const labObserver=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stopSound();});labObserver.observe($('#playground'));
const soundInterval=setInterval(()=>{if(state.frequency!==frequencyText){frequencyText=state.frequency;$('#frequency-readout').textContent=`FREQUENCY: ${state.frequency} Hz`;}if(soundOn){oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(state.frequency*[1,1.005,.5][i],audioContext.currentTime,.08));}},90);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();});

const reelWords=['LOGO.','TYPE.','MOVE.','RED.'];
$('#reel-type').innerHTML=reelWords.map((word,i)=>`<span class="reel-frame" data-frame="${i}" aria-hidden="true">${[...word].map(c=>`<span class="reel-letter">${c}</span>`).join('')}</span>`).join('');
function buildReel(){
 reelTimeline?.kill();if(!gsap)return;const frames=$$('.reel-frame');gsap.set(frames,{autoAlpha:0});gsap.set('.reel-letter',{yPercent:0,rotation:0});
 reelTimeline=gsap.timeline({paused:true,onUpdate(){const s=Math.min(16,Math.floor(this.time()));$('#reel-timer').textContent=`00:${String(s).padStart(2,'0')} / 00:16`;},onComplete(){$('#reel-play').textContent='Play ▶';$('#reel-play').setAttribute('aria-label','Play experiment');}});
 reelWords.forEach((word,i)=>{const start=i*4;const frame=frames[i];reelTimeline.set(frame,{autoAlpha:1},start).fromTo(frame.querySelectorAll('.reel-letter'),{yPercent:115,rotation:8},{yPercent:0,rotation:0,duration:1.05,stagger:.055,ease:'power4.out'},start+.1).to(frame.querySelectorAll('.reel-letter'),{yPercent:-120,duration:.65,stagger:.035,ease:'power3.in'},start+3.1).set(frame,{autoAlpha:0},start+3.95);reelTimeline.to('.reel-shape',{rotation:i*100,scaleX:i%2?.95:.55,scale:i%2?1.4:.8,borderRadius:i%2?'10%':'50%',duration:3.6,ease:'power2.inOut'},start);reelTimeline.to('#reel-dialog',{backgroundColor:i%2?'#252520':'#d93622',duration:.55},start);});
 reelTimeline.to('.reel-progress i',{scaleX:1,duration:16,ease:'none'},0).set(frames[3],{autoAlpha:1},16).set(frames[3].querySelectorAll('.reel-letter'),{yPercent:0},16);
}
$$('[data-reel]').forEach(button=>button.addEventListener('click',()=>{openDialog($('#reel-dialog'),button);buildReel();if(state.calm){reelTimeline?.progress(1);$('#reel-play').textContent='Play ▶';$('#reel-play').setAttribute('aria-label','Play experiment');}else{reelTimeline?.play();$('#reel-play').textContent='Pause Ⅱ';$('#reel-play').setAttribute('aria-label','Pause experiment');}}));
$('#reel-play').addEventListener('click',()=>{if(!reelTimeline)return;if(reelTimeline.paused()||reelTimeline.progress()===1){if(reelTimeline.progress()===1)reelTimeline.restart();else reelTimeline.play();$('#reel-play').textContent='Pause Ⅱ';$('#reel-play').setAttribute('aria-label','Pause experiment');}else{reelTimeline.pause();$('#reel-play').textContent='Play ▶';$('#reel-play').setAttribute('aria-label','Play experiment');}});
$('#reel-replay').addEventListener('click',()=>{reelTimeline?.restart();$('#reel-play').textContent='Pause Ⅱ';$('#reel-play').setAttribute('aria-label','Pause experiment');});

if(matchMedia('(pointer:fine)').matches&&gsap){const cursor=$('.cursor-label');const xTo=gsap.quickTo(cursor,'x',{duration:.2,ease:'power3'}),yTo=gsap.quickTo(cursor,'y',{duration:.2,ease:'power3'});$$('button.project').forEach(project=>{project.addEventListener('pointerenter',()=>{if(!state.calm)gsap.to(cursor,{autoAlpha:1,duration:.2});});project.addEventListener('pointermove',e=>{xTo(e.clientX);yTo(e.clientY);});project.addEventListener('pointerleave',()=>gsap.to(cursor,{autoAlpha:0,duration:.15}));});$$('.play-icon,.contact-link>span').forEach(el=>{const parent=el.parentElement;const x=gsap.quickTo(el,'x',{duration:.4,ease:'power3'}),y=gsap.quickTo(el,'y',{duration:.4,ease:'power3'});parent.addEventListener('pointermove',e=>{if(state.calm)return;const r=parent.getBoundingClientRect();x((e.clientX-r.left-r.width/2)*.12);y((e.clientY-r.top-r.height/2)*.2);});parent.addEventListener('pointerleave',()=>{x(0);y(0);});});}
window.addEventListener('pagehide',()=>{stopSound();disposeSculpture?.();signal?.dispose();motionContext?.revert();reelTimeline?.kill();labObserver.disconnect();clearInterval(soundInterval);});

document.addEventListener('keydown',e=>{if(!menuOpen)return;if(e.key==='Escape'){setMenu(false);$('.menu-button').focus();}if(e.key==='Tab'){const controls=[$('.menu-button'),...$$('#mobile-menu a')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
