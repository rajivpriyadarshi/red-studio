import {createUniverse,makePosters} from './universe.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const gsap=window.gsap,ScrollTrigger=window.ScrollTrigger;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={entry:1,gallery:0,index:0,depart:0,contact:0,calm:reduced.matches,needsRender:true,modal:false};
let manualPause=false,scene=null,activeWorld=0,worldTrigger=null,scrollTween=null,mm=null,entrance=null;
const worlds=[
 {title:'ECHO',kind:'SONIC IDENTITY / BRAND SYSTEM',summary:'An identity you can hear.<br>A sound you can see.',description:'What if a brand began with a sound? ECHO explores how a sonic signature can become a visual language. Waveforms turn into typography, rhythm becomes a layout system, and a simple mark carries the same character in motion as it does on paper.',tags:'STRATEGY / IDENTITY / SOUND DESIGN / MOTION'},
 {title:'FORM',kind:'DIGITAL EXPERIENCE / UX & UI',summary:'Complexity, made quiet.<br>Designed around people.',description:'FORM is a study in digital clarity. A tactile visual system meets calm interaction design: adaptable layouts, purposeful transitions, and a product language that gives the content room to breathe. An exploration of how interfaces can feel human without losing their precision.',tags:'EXPERIENCE DESIGN / UI SYSTEM / INTERACTION'},
 {title:'AFTERIMAGE',kind:'MOTION DIRECTION / 3D EXPERIMENT',summary:'A moment that moves.<br>An impression that stays.',description:'AFTERIMAGE looks at the space between frames. Sculptural loops, lingering traces, and carefully timed typography create an identity that is always becoming something else. A motion experiment about memory, rhythm, and the things we keep seeing after they disappear.',tags:'ART DIRECTION / 3D DESIGN / ANIMATION'}
];
const posters=makePosters();
try{scene=createUniverse($('#universe'),state,posters);}catch(error){document.body.classList.add('no-webgl');console.warn('Spatial artwork unavailable; the standard gallery remains available.',error);}
$('#year').textContent=new Date().getFullYear();
function changeWorld(index,animate=true){
  index=Math.max(0,Math.min(2,index));if(index===activeWorld)return;
  activeWorld=index;const data=worlds[index];const bits=$$('.world-description>*');
  const apply=()=>{$('#world-title').textContent=data.title;$('#world-kind').textContent=data.kind;$('#world-summary').innerHTML=data.summary;$('#world-count').textContent=`0${index+1} / 03`;$('#open-world').setAttribute('aria-label',`Explore ${data.title}`);$('.world-fallback').style.backgroundImage=`url('${posters[index]}')`;$('.world-fallback').style.backgroundSize='cover';$('.art-echo').hidden=true;};
  if(gsap&&animate&&!state.calm){gsap.killTweensOf(bits);gsap.to(bits,{opacity:0,y:-8,duration:.16,overwrite:true,onComplete(){apply();gsap.fromTo(bits,{y:12,opacity:0},{y:0,opacity:1,duration:.45,stagger:.035,ease:'power3.out',overwrite:true});}});}else{if(gsap)gsap.set(bits,{opacity:1,y:0});apply();}
  $$('[data-world]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
}
function updateWorld(){changeWorld(Math.round(state.index));}
function selectWorld(index){
  index=(index+3)%3;scrollTween?.kill();
  if(worldTrigger&&!state.calm&&scene){const start=worldTrigger.start,end=worldTrigger.end;const destination=start+(end-start)*(index/2);const proxy={y:scrollY};scrollTween=gsap.to(proxy,{y:destination,duration:.95,ease:'power3.inOut',onUpdate(){window.scrollTo({top:proxy.y,behavior:'instant'});},onComplete(){scrollTween=null;}});}else{if(gsap&&!state.calm)gsap.to(state,{index,duration:1,ease:'power3.inOut',onUpdate:updateWorld});else{state.index=index;state.needsRender=true;}changeWorld(index);}
}
$$('[data-world]').forEach(b=>b.addEventListener('click',()=>selectWorld(Number(b.dataset.world))));
$('#previous-world').addEventListener('click',()=>selectWorld(activeWorld-1));$('#next-world').addEventListener('click',()=>selectWorld(activeWorld+1));
window.addEventListener('wheel',()=>{scrollTween?.kill();scrollTween=null;},{passive:true});window.addEventListener('touchstart',()=>{scrollTween?.kill();scrollTween=null;},{passive:true});
function installMotion(){
  const retainedIndex=state.index;mm?.revert();if(state.calm){state.index=retainedIndex;changeWorld(Math.round(retainedIndex),false);}worldTrigger=null;document.body.classList.toggle('calm',state.calm);
  if(!gsap||!ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);mm=gsap.matchMedia();
  mm.add({wide:'(min-width: 700px)',narrow:'(max-width: 699px)'},()=>{
    gsap.to('.page-progress i',{scaleX:1,ease:'none',scrollTrigger:{trigger:'main',start:'top top',end:'bottom bottom',scrub:true}});
    // Native scroll remains the driver. One shared scene keeps visual continuity through the page.
    gsap.to(state,{gallery:1,ease:'none',scrollTrigger:{trigger:'#worlds',start:'top bottom',end:'top top',scrub:state.calm?true:.9}});
    if(!state.calm&&scene){
      const tween=gsap.fromTo(state,{index:0},{index:2,immediateRender:false,ease:'none',onUpdate:updateWorld,scrollTrigger:{trigger:'#worlds',start:'top top',end:'bottom bottom',scrub:.7,onUpdate(t){gsap.set('.world-rail i',{scaleX:.03+t.progress*.97});}}});worldTrigger=tween.scrollTrigger;
      gsap.to('.hero-copy',{y:-70,opacity:0,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom 20%',scrub:.6}});
      gsap.to('.planet-label',{opacity:0,ease:'none',scrollTrigger:{trigger:'.hero',start:'center center',end:'bottom 30%',scrub:true}});
      $$('.reveal').forEach(el=>gsap.from(el,{y:38,opacity:0,duration:.85,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}));
    }
    gsap.to(state,{depart:1,ease:'none',scrollTrigger:{trigger:'#studio',start:'top bottom',end:'top 15%',scrub:state.calm?true:.8}});
    gsap.to(state,{contact:1,ease:'none',scrollTrigger:{trigger:'#contact',start:'top bottom',end:'center center',scrub:state.calm?true:1}});
    return()=>{worldTrigger=null;};
  });
  state.needsRender=true;ScrollTrigger.refresh();
}
function setCalm(){state.calm=reduced.matches||manualPause;if(state.calm&&entrance){entrance.progress(1);entrance.kill();}scrollTween?.kill();installMotion();$('#motion-toggle').setAttribute('aria-pressed',String(state.calm));$('#motion-toggle').textContent=state.calm?'RESUME MOTION':'PAUSE MOTION';$('#motion-toggle').disabled=reduced.matches;$('#motion-toggle').title=reduced.matches?'Reduced motion follows your system preference':'';state.needsRender=true;}
$('#motion-toggle').addEventListener('click',()=>{manualPause=!manualPause;setCalm();});reduced.addEventListener('change',setCalm);setCalm();
if(gsap&&!state.calm){state.entry=.01;entrance=gsap.timeline({defaults:{ease:'power3.out'}});entrance.to(state,{entry:1,duration:1.75},0).from('.line>span',{yPercent:115,rotation:3,duration:1.15,stagger:.12},.12).from('.intro-line',{y:18,opacity:0,duration:.8,stagger:.1},.65).from('.planet-label,.hero-foot',{opacity:0,duration:.8},1.1);}
// Accessible native dialogs provide focus trapping, Escape, and immediate intent changes.
let dialogOpener=null;
function openDialog(dialog,opener){dialogOpener=opener||document.activeElement;state.modal=true;document.body.classList.add('modal-open');dialog.showModal();if(gsap&&!state.calm)gsap.fromTo(dialog,{y:22,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out',overwrite:true});}
function closeDialog(dialog){if(gsap)gsap.killTweensOf(dialog);dialog.close();}
$$('dialog').forEach(d=>{d.querySelector('.close-dialog').addEventListener('click',()=>closeDialog(d));d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});d.addEventListener('close',()=>{const stillOpen=$$('dialog').some(dialog=>dialog.open);state.modal=stillOpen;state.needsRender=true;document.body.classList.toggle('modal-open',stillOpen);if(!stillOpen)dialogOpener?.focus();});});
$('#open-world').addEventListener('click',e=>{const w=worlds[activeWorld];$('#detail-title').textContent=w.title;$('#detail-description').textContent=w.description;$('#detail-tags').textContent=w.tags;$('#detail-art').style.backgroundImage=`url('${posters[activeWorld]}')`;openDialog($('#world-dialog'),e.currentTarget);});
$$('[data-inquiry]').forEach(b=>b.addEventListener('click',()=>openDialog($('#inquiry-dialog'),b)));
$('#world-to-inquiry').addEventListener('click',()=>{closeDialog($('#world-dialog'));openDialog($('#inquiry-dialog'),$('#open-world'));});
let inquiryText='';
$('#inquiry-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const data=new FormData(form);inquiryText=`Hi Red Studio,\n\nI'm ${data.get('name')}. I'd love to talk about an idea.\n\n${data.get('brief')}\n\nI'm looking for: ${data.get('service')}.\n\nYou can reach me at ${data.get('email')}.\n\n${data.get('name')}`;$('#draft-link').href=`mailto:theredstudio@gmail.com?subject=${encodeURIComponent('A new world — '+data.get('name'))}&body=${encodeURIComponent(inquiryText)}`;$('#draft-actions').hidden=false;form.querySelector('[type=submit]').hidden=true;$('#form-status').textContent='Your inquiry is ready. Open your email app to review and send it.';});
$('#inquiry-form').addEventListener('input',()=>{if(!$('#draft-actions').hidden){$('#draft-actions').hidden=true;$('#inquiry-form [type=submit]').hidden=false;$('#form-status').textContent='Your idea changed. Create a fresh draft when you’re ready.';}});
$('#copy-draft').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inquiryText);$('#form-status').textContent='Copied. Paste your inquiry into an email to theredstudio@gmail.com.';}catch{let fallback=$('#copy-fallback');if(!fallback){fallback=document.createElement('textarea');fallback.id='copy-fallback';fallback.setAttribute('aria-label','Inquiry text to copy');$('#draft-actions').append(fallback);}fallback.value=inquiryText;fallback.focus();fallback.select();$('#form-status').textContent='Select and copy your inquiry below.';}});
$$('.capabilities details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open){$$('.capabilities details').filter(other=>other!==d).forEach(other=>{other.open=false;});if(gsap&&!state.calm)gsap.fromTo(d.querySelector('.service-content'),{opacity:0,y:-8},{opacity:1,y:0,duration:.35,ease:'power2.out',overwrite:true});}ScrollTrigger?.refresh();}));
// Sound is optional: a quiet, original synthesized bed begins only after an explicit click.
let audio=null,soundOn=false;
function buildAudio(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');const context=new Audio();const master=context.createGain();master.gain.value=0;master.connect(context.destination);const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=680;filter.Q.value=.4;filter.connect(master);const voices=[65.41,98,130.81].map((hz,i)=>{const osc=context.createOscillator(),gain=context.createGain();osc.type=i===0?'sine':'triangle';osc.frequency.value=hz;gain.gain.value=i===0?.18:.035;osc.connect(gain);gain.connect(filter);osc.start();return osc;});return {context,master,voices};}
$('#sound-toggle').addEventListener('click',async()=>{try{audio??=buildAudio();await audio.context.resume();soundOn=!soundOn;audio.master.gain.setTargetAtTime(soundOn?.32:0,audio.context.currentTime,.35);$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));$('#sound-toggle').setAttribute('aria-label',soundOn?'Disable ambient sound':'Enable ambient sound');$('#sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';document.body.classList.toggle('sound-on',soundOn);}catch{$('#sound-label').textContent='UNAVAILABLE';$('#sound-toggle').disabled=true;}});
document.addEventListener('visibilitychange',()=>{if(audio)audio.master.gain.setTargetAtTime(!document.hidden&&soundOn?.32:0,audio.context.currentTime,.12);});
document.fonts.ready.then(()=>ScrollTrigger?.refresh());
window.addEventListener('pagehide',event=>{if(event.persisted)return;mm?.revert();entrance?.kill();scrollTween?.kill();scene?.dispose();audio?.context.close();reduced.removeEventListener('change',setCalm);});
