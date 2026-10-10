/** Menu navigation with a gamepad: D-pad/stick moves focus, A presses, B goes back, Start pauses.
 * During a race (HUD visible and no dialog open) the race input owns the pad. */
export function startGamepadNav(){
 let raf=0,prev:boolean[]=[],held=0,last=0,toastTimer:ReturnType<typeof setTimeout>|undefined;
 const toast=(text:string)=>{let el=document.getElementById('pad-toast');if(!el){el=document.createElement('div');el.id='pad-toast';el.className='arcade-toast pad-toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=text;el.style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el)el.style.opacity='0';},2200);};
 const focusables=()=>{const scope=document.querySelector('[role=dialog]')??document;return [...scope.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])')].filter(e=>e.offsetParent!==null);};
 const move=(dir:number)=>{const list=focusables();if(!list.length)return;const i=list.indexOf(document.activeElement as HTMLElement);const next=list[(i<0?0:i+dir+list.length)%list.length];next.focus();next.scrollIntoView?.({block:'nearest'});};
 const key=(k:string)=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
 const loop=(now:number)=>{
  raf=requestAnimationFrame(loop);const pad=navigator.getGamepads?.().find(p=>p?.connected);if(!pad)return;
  const racing=!!document.querySelector('.hx')&&!document.querySelector('[role=dialog]');const b=pad.buttons.map(x=>x.pressed),edge=(i:number)=>b[i]&&!prev[i];
  if(edge(9))key('Escape'); // Start: pause / back
  if(!racing){
   const x=pad.axes[0]??0,y=pad.axes[1]??0,dir=b[12]||y<-.6?-1:b[13]||y>.6?1:b[14]||x<-.6?-1:b[15]||x>.6?1:0;
   if(dir){if(!held||now-last>(held>1?140:380)){move(dir);held++;last=now;}}else held=0;
   if(edge(0))(document.activeElement as HTMLElement|null)?.click();
   if(edge(1))key('Escape');
   // Shoulders change the selection inside the garage like the arrow keys.
   if(edge(4))key('ArrowLeft');if(edge(5))key('ArrowRight');
  }
  prev=b;
 };
 const on=()=>{toast('Mando conectado · A elige, B regresa');if(!raf)raf=requestAnimationFrame(loop);},off=()=>toast('Mando desconectado. Conéctalo y presiona un botón.');
 window.addEventListener('gamepadconnected',on);window.addEventListener('gamepaddisconnected',off);
 if(navigator.getGamepads?.().some(p=>p?.connected))raf=requestAnimationFrame(loop);
 return()=>{cancelAnimationFrame(raf);window.removeEventListener('gamepadconnected',on);window.removeEventListener('gamepaddisconnected',off);};
}
