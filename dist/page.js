const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let menuOpen=false;
const menu=$('#mobile-menu'),toggle=$('.menu-button');
function setMenu(open){menuOpen=open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');menu.hidden=!open;document.body.classList.toggle('dialog-open',open);$('main').inert=open;$('footer').inert=open;}
toggle.addEventListener('click',()=>setMenu(!menuOpen));
$$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
window.addEventListener('resize',()=>{if(innerWidth>760&&menuOpen)setMenu(false);});
document.addEventListener('keydown',e=>{if(!menuOpen)return;if(e.key==='Escape'){setMenu(false);toggle.focus();}if(e.key==='Tab'){const controls=[toggle,...$$('#mobile-menu a')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$$('[data-vat]').forEach(button=>button.addEventListener('click',()=>{const included=button.dataset.vat==='1';$$('[data-vat]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('[data-price]').forEach(el=>{el.textContent=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(Number(el.dataset.price)*(included?1.25:1));});$('#vat-status').textContent=included?'ALL PRICES IN NOK · INCLUDING 25% VAT WHERE APPLICABLE':'ALL PRICES IN NOK · EXCLUDING VAT';}));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
$$('.sample-motion-toggle').forEach(button=>{const sample=button.closest('.sample-motion');function update(paused){sample.classList.toggle('is-paused',paused);button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'Play example ▶':'Pause example Ⅱ';}update(reduced.matches);button.addEventListener('click',()=>update(!sample.classList.contains('is-paused')));reduced.addEventListener('change',()=>update(reduced.matches));});
