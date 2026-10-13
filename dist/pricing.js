// State changes are immediate. GSAP only choreographs the already-selected scope.
const root = document.querySelector('[data-pricing]');
const configElement = document.querySelector('#pricing-config');
if (root && configElement) {
  const config = JSON.parse(configElement.textContent);
  const plans = new Map(config.packages.map(plan => [plan.id, plan]));
  const pref = matchMedia('(prefers-reduced-motion: reduce)');
  const format = value => new Intl.NumberFormat('en-GB', {maximumFractionDigits:0}).format(value);
  const all = selector => [...document.querySelectorAll(selector)];
  const panels = [...root.querySelectorAll('[data-plan]')];
  const links = [...root.querySelectorAll('[data-plan-link]')];
  const packageSelect=root.querySelector('.mobile-package-selector select');
  root.classList.add('is-enhanced');
  const isPage = root.classList.contains('ratebook-page');
  let included = false;
  let selected = root.dataset.default;
  let calm = pref.matches || document.body.classList.contains('motion-paused');
  let transition, priceTween, estimateTween;
  const priceValue = {value:plans.get(selected).price};
  const estimateValue = {value:0};
  const announce = root.querySelector('[data-rate-announcement]');
  const currentPanel = () => panels.find(panel => panel.dataset.plan === selected);
  const priceFor = base => base * (included ? 1 + config.vatRate : 1);

  function animatePrice(target, element, holder, previousTween) {
    previousTween?.kill();
    holder.value=target; element.textContent=format(target);
    const gsap=window.gsap;
    gsap?.set(element,{clearProps:'transform,opacity,visibility'});
    if(calm||!gsap)return undefined;
    // Keep every displayed amount exact; animate its presentation, not its value.
    return gsap.fromTo(element,{y:7,autoAlpha:.5},{y:0,autoAlpha:1,duration:.28,
      ease:'power3.out',overwrite:true,clearProps:'transform,opacity,visibility'});
  }

  function select(id, animate=true, updateHash=false) {
    if (!plans.has(id) || !panels.some(panel=>panel.dataset.plan===id)) return;
    transition?.kill();
    // Cancel old number rendering before hiding its panel.
    priceTween?.kill();
    selected = id;
    if(packageSelect)packageSelect.value=id;
    panels.forEach(panel=>panel.hidden=panel.dataset.plan!==id);
    links.forEach(link=>{
      if(link.dataset.planLink===id) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
    const panel = currentPanel();
    const plan = plans.get(id);
    const amount = priceFor(plan.price);
    panel.querySelector('[data-price-accessible]').textContent=`${format(amount)} Norwegian kroner, ${included?'including 25% VAT where applicable':'excluding VAT'}`;
    announce.textContent=`${plan.name}, ${format(amount)} NOK ${included?'including VAT where applicable':'excluding VAT'}. ${plan.time}. Two feedback rounds.`;
    if (animate && !calm && window.gsap) {
      const gsap = window.gsap;
      const art = panel.querySelector('[data-rate-art]');
      const text = panel.querySelectorAll('[data-price-reveal]');
      gsap.set([art,...text],{clearProps:'transform,opacity,visibility'});
      transition = gsap.timeline({defaults:{ease:'power3.out'}})
        .fromTo(art,{y:14,autoAlpha:.2},{y:0,autoAlpha:1,duration:.45,clearProps:'transform,opacity,visibility'},0)
        .fromTo(text,{y:10,autoAlpha:.25},{y:0,autoAlpha:1,duration:.35,stagger:.035,clearProps:'transform,opacity,visibility'},.06);
      priceTween=animatePrice(amount,panel.querySelector('[data-main-price]'),priceValue,priceTween);
    } else {
      priceValue.value=amount;
      panel.querySelector('[data-main-price]').textContent=format(amount);
      window.gsap?.set(panel.querySelector('[data-main-price]'),{clearProps:'transform,opacity,visibility'});
    }
    if(updateHash&&isPage)history.replaceState(null,'',`#${id}`);
  }

  links.forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();
    if(link.dataset.planLink!==selected) select(link.dataset.planLink,true,true);
    if(!isPage&&matchMedia('(max-width:760px)').matches&&currentPanel().getBoundingClientRect().top>innerHeight*.65)currentPanel().scrollIntoView({behavior:calm?'instant':'smooth',block:'start'});
  }));
  packageSelect?.addEventListener('change',()=>select(packageSelect.value,true,true));
  root.querySelector('.package-choices').addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const index=links.indexOf(document.activeElement);if(index<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?links.length-1:
      (index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
    links[next].focus();select(links[next].dataset.planLink,true,true);
  });
  function readHash(){const id=location.hash.slice(1);if(isPage&&plans.has(id))select(id,false);}
  window.addEventListener('hashchange',readHash);

  const checkboxes = all('.estimate-option input');
  const receipt = document.querySelector('.estimate-receipt');
  const selectedEstimate = () => checkboxes.filter(input=>input.checked).map(input=>plans.get(input.value));
  const estimateLink = document.querySelector('.estimate-cta');
  estimateLink?.addEventListener('click',event=>{if(estimateLink.getAttribute('aria-disabled')==='true')event.preventDefault();});

  function renderEstimate(animate=true) {
    if(!receipt)return;
    const selection=selectedEstimate();
    const subtotal=selection.reduce((total,plan)=>total+plan.price,0);
    const tax=subtotal*config.vatRate;
    const total=priceFor(subtotal);
    const items=receipt.querySelector('.estimate-line-items');
    items.replaceChildren();
    if(!selection.length){
      const empty=document.createElement('p');empty.className='estimate-empty';
      empty.textContent='Choose a package to start your estimate.';items.append(empty);
    }else selection.forEach(plan=>{
      const line=document.createElement('div');line.className='estimate-line';
      const name=document.createElement('span'),price=document.createElement('span');
      name.textContent=plan.name;price.textContent=`${format(plan.price)} NOK`;line.append(name,price);items.append(line);
    });
    receipt.querySelector('[data-estimate-subtotal]').textContent=`${format(subtotal)} NOK`;
    const vatRow=receipt.querySelector('[data-estimate-vat]').parentElement;
    vatRow.querySelector('span:first-child').textContent=included?'VAT, if applicable (25%)':'VAT not in total (25%)';
    receipt.querySelector('[data-estimate-vat]').textContent=`${!included&&tax?'+':''}${format(tax)} NOK`;
    receipt.querySelector('[data-estimate-tax-label]').textContent=included?'INCL. VAT':'EXCL. VAT';
    if(animate) estimateTween=animatePrice(total,receipt.querySelector('[data-estimate-total]'),estimateValue,estimateTween);
    else {estimateTween?.kill();estimateValue.value=total;receipt.querySelector('[data-estimate-total]').textContent=format(total);window.gsap?.set(receipt.querySelector('[data-estimate-total]'),{clearProps:'transform,opacity,visibility'});}
    receipt.querySelector('[data-estimate-announcement]').textContent=selection.length?
      `${selection.length} packages. Estimate ${format(total)} NOK, ${included?'including VAT where applicable':'excluding VAT'}.`:'No packages selected.';
    estimateLink.setAttribute('aria-disabled',String(!selection.length));
    estimateLink.href=selection.length?`index.html?packages=${encodeURIComponent(selection.map(plan=>plan.id).join(','))}#contact`:'index.html#contact';
  }

  checkboxes.forEach(input=>input.addEventListener('change',()=>{
    const note=document.querySelector('.estimate-combination-note');
    if(input.checked&&(input.value==='logo'||input.value==='identity')){
      const other=checkboxes.find(box=>box.value===(input.value==='logo'?'identity':'logo'));
      if(other.checked){other.checked=false;note.textContent=input.value==='identity'?
        'Brand identity includes Logo essentials, so the separate logo package was removed.':
        'Logo essentials selected instead of the full Brand identity package.';}
      else note.textContent='Brand identity includes Logo essentials. Choose one of those two.';
    }
    renderEstimate();
  }));

  function updateVAT(value) {
    included=value;
    all('[data-vat]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.vat==='1')===included)));
    all('[data-price]').forEach(element=>element.textContent=format(priceFor(Number(element.dataset.price))));
    if(packageSelect)[...packageSelect.options].forEach(option=>{const plan=plans.get(option.value);option.textContent=`${plan.name} — ${format(priceFor(plan.price))} NOK`;});
    all('[data-tax-label]').forEach(element=>element.textContent=included?'INCLUDING 25% VAT WHERE APPLICABLE':'EXCLUDING VAT');
    const status=document.querySelector('#vat-status');
    if(status)status.textContent=included?'ALL PRICES IN NOK / INCLUDING 25% VAT WHERE APPLICABLE':'ALL PRICES IN NOK / EXCLUDING VAT';
    select(selected,true);renderEstimate();
  }
  all('[data-vat]').forEach(button=>button.addEventListener('click',()=>updateVAT(button.dataset.vat==='1')));

  function refreshMotion() {
    const next=pref.matches||document.body.classList.contains('motion-paused');
    if(next===calm)return;calm=next;
    if(calm){transition?.kill();priceTween?.kill();estimateTween?.kill();
      panels.forEach(panel=>window.gsap?.set(panel.querySelectorAll('[data-rate-art],[data-price-reveal]'),{clearProps:'transform,opacity,visibility'}));
      select(selected,false);renderEstimate(false);}
  }
  pref.addEventListener('change',refreshMotion);
  const observer=new MutationObserver(refreshMotion);observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  select(selected,false);readHash();renderEstimate(false);
  function settleAndDisconnect(){
    transition?.kill();priceTween?.kill();estimateTween?.kill();observer.disconnect();
    panels.forEach(panel=>window.gsap?.set(panel.querySelectorAll('[data-rate-art],[data-price-reveal]'),{clearProps:'transform,opacity,visibility'}));
    select(selected,false);renderEstimate(false);
    pref.removeEventListener('change',refreshMotion);window.removeEventListener('hashchange',readHash);
  }
  window.addEventListener('pagehide',settleAndDisconnect);
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    calm=pref.matches||document.body.classList.contains('motion-paused');
    pref.addEventListener('change',refreshMotion);window.addEventListener('hashchange',readHash);
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    select(selected,false);renderEstimate(false);
  });
}
