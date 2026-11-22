const menu = document.querySelector('#mobile-menu');
const toggle = document.querySelector('.menu-button');
function setMenu(open) {
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  toggle.textContent = open ? 'Close' : 'Menu';
}
toggle.addEventListener('click',()=>setMenu(menu.hidden));
menu.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!menu.hidden){setMenu(false);toggle.focus();}
});
document.addEventListener('focusin',event=>{
  if(!menu.hidden && !event.target.closest('.mast'))setMenu(false);
});
matchMedia('(min-width:761px)').addEventListener('change',event=>{if(event.matches)setMenu(false);});
