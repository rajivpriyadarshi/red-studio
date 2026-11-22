// Manual creative-brief selection. Content state changes immediately; the paper
// composition and the existing ribbon animate together. No automatic cycling.
const root = document.querySelector('[data-personas]');
if (root) {
  const tabs = [...root.querySelectorAll('[data-persona-choice]')];
  const panels = [...root.querySelectorAll('[data-persona-panel]')];
  const list = root.querySelector('.persona-choices');
  const stage = root.querySelector('.brief-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const calm = () => reduced.matches || document.body.classList.contains('motion-paused');
  let active = 'everyone', transition;
  root.classList.add('is-persona-enhanced');
  list.setAttribute('role','tablist');
  list.setAttribute('aria-orientation','horizontal');
  tabs.forEach(tab => {
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-controls',`audience-${tab.dataset.personaChoice}`);
  });
  panels.forEach(panel => {
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',`audience-tab-${panel.dataset.personaPanel}`);
  });
  function select(id,animate=true) {
    const panel=panels.find(panel=>panel.dataset.personaPanel===id);
    if(!panel)return;
    const index=tabs.findIndex(tab=>tab.dataset.personaChoice===id);
    const previous=tabs.findIndex(tab=>tab.dataset.personaChoice===active);
    const direction=index<previous?-1:1;
    active=id;root.dataset.activePersona=id;transition?.kill();
    tabs.forEach(tab=>{
      const selected=tab.dataset.personaChoice===id;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    });
    panels.forEach(p=>{p.hidden=p!==panel;});
    stage.dataset.world=id;
    const words=panel.querySelectorAll('[data-persona-reveal]');
    const papers=panel.querySelectorAll('.brief-piece');
    gsap?.set([...words,...papers],{clearProps:'transform,opacity,visibility'});
    if(animate&&!calm()&&gsap){
      transition=gsap.timeline({defaults:{clearProps:'transform,opacity,visibility'}})
        .from(words,{y:22,autoAlpha:0,duration:.48,stagger:.045,ease:'power3.out'},.08)
        .from(papers,{x:direction*65,y:35,rotation:'+=12',autoAlpha:0,duration:.85,stagger:.055,ease:'power3.out'},0);
    }
    if(list.scrollWidth>list.clientWidth){
      list.scrollTo({left:Math.max(0,tabs[index].offsetLeft-(list.clientWidth-tabs[index].offsetWidth)/2),behavior:animate&&!calm()?'smooth':'instant'});
    }
    root.dispatchEvent(new CustomEvent('persona:change',{detail:{id,animate}}));
    window.ScrollTrigger?.refresh();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',event=>{event.preventDefault();if(active!==tab.dataset.personaChoice)select(tab.dataset.personaChoice);});
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' '].includes(event.key))return;
      event.preventDefault();
      if(event.key===' '){select(tab.dataset.personaChoice);return;}
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
        (index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+tabs.length)%tabs.length;
      tabs[next].focus({preventScroll:true});select(tabs[next].dataset.personaChoice);
    });
  });
  const settle=()=>{if(calm())select(active,false);};
  const observer=new MutationObserver(settle);
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',settle);
  select(active,false);
  window.addEventListener('pagehide',()=>{
    select(active,false);observer.disconnect();reduced.removeEventListener('change',settle);
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    reduced.addEventListener('change',settle);select(active,false);
  });
}
