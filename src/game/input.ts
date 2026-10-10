import type { PlayerInput } from '../../shared/types';
import { loadKeys,type KeyAction } from './keys';
/** Shapes a raw analog axis: dead zone, then a gentle curve so small moves give soft turns. */
export function shapeAxis(raw:number,deadZone=.14){
 const a=Math.abs(raw);if(!Number.isFinite(raw)||a<deadZone)return 0;
 const t=Math.min(1,(a-deadZone)/(1-deadZone));return Math.sign(raw)*t*(.45+.55*t);
}
/** Digital keys ramp in: a tap is a correction, holding becomes a full turn in ~0.2 s. */
export function keyRamp(held:number){return Math.min(1,.42+.58*Math.min(1,held/.2));}
export class InputController {
 steer=0;brake=false;drift=false;selected=1;
 assist=(()=>{try{return localStorage.getItem('morly-assist')!=='no';}catch{return true;}})();
 /** Last device used, so the HUD can show matching hints. */
 device:'touch'|'keyboard'|'pad'=matchMedia?.('(pointer:coarse)').matches?'touch':'keyboard';
 private action=0;private pending=0;private seq=0;private pressed=new Set<string>();private padButtons:boolean[]=[];private steerKey=0;private steerHeld=0;private lastSample=0;
 keys=loadKeys();
 private reload=(e:StorageEvent)=>{if(e.key==='morly-keys')this.keys=loadKeys();};
 private is(action:KeyAction,key:string){return !!key&&this.keys[action].includes(key);}
 private held(action:KeyAction){return this.keys[action].some(k=>k&&this.pressed.has(k));}
 /** Set while the settings panel captures a key, so the game ignores it. */
 capturing=false;
 constructor(){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.reset);window.addEventListener('storage',this.reload);}
 down=(e:KeyboardEvent)=>{if(this.capturing||(e.target as HTMLElement)?.closest('input,textarea,select,[role=dialog]'))return;const k=e.key.toLowerCase();
  const actions:KeyAction[]=['left','right','brake','drift','fire','basic1','basic2','basic3','cycle','special','item'];if(actions.some(a=>this.is(a,k)))e.preventDefault();this.device='keyboard';this.pressed.add(k);if(e.repeat)return;
  if(this.is('basic1',k)){this.selected=1;this.fire(1);}else if(this.is('basic2',k)){this.selected=2;this.fire(2);}else if(this.is('basic3',k)){this.selected=3;this.fire(3);}
  if(this.is('fire',k))this.fire(this.selected);if(this.is('cycle',k))this.cycle();if(this.is('special',k))this.fire(4);if(this.is('item',k))this.fire(5);};
 up=(e:KeyboardEvent)=>{this.pressed.delete(e.key.toLowerCase());};
 /** True when a key bound to pause was pressed (used by the race view). */
 isPause(e:KeyboardEvent){return this.is('pause',e.key.toLowerCase());}
 reset=()=>{this.pressed.clear();this.steer=0;this.brake=false;this.drift=false;this.pending=0;this.steerKey=0;this.steerHeld=0;};
 fire(index=this.selected){this.pending=index;this.action++;}
 /** Next basic in the wheel (gamepad X / keyboard Q). Gamepad Y / keyboard R use the item. */
 cycle(){this.selected=this.selected%3+1;}
 sample():PlayerInput {
  const now=performance.now(),dt=this.lastSample?Math.min(.1,(now-this.lastSample)/1000):1/60;this.lastSample=now;
  const left=this.held('left'),right=this.held('right'),dir=left===right?0:left?-1:1;
  if(dir!==this.steerKey){this.steerKey=dir;this.steerHeld=0;}else if(dir)this.steerHeld+=dt;
  let steer=dir?dir*keyRamp(this.steerHeld):this.steer;let brake=this.brake||this.held('brake');let drift=this.drift||this.held('drift');
  const pad=navigator.getGamepads?.().find(p=>p?.connected);
  if(pad){
   const pressed=(i:number)=>!!pad.buttons[i]?.pressed,edge=(i:number)=>pressed(i)&&!this.padButtons[i];
   const axis=shapeAxis(pad.axes[0]??0),dpad=pressed(14)?-1:pressed(15)?1:0;
   if(axis||dpad){steer=axis||dpad;this.device='pad';}
   brake||=pressed(6)||pressed(4);drift||=pressed(5)||pressed(7);
   if(edge(0)){this.fire(this.selected);this.device='pad';}if(edge(1)){this.fire(4);this.device='pad';}if(edge(2)){this.cycle();this.device='pad';}if(edge(3)){this.fire(5);this.device='pad';}
   this.padButtons=pad.buttons.map(b=>b.pressed);
  }
  const result={seq:++this.seq,steer,brake,drift,attack:this.pending,actionSeq:this.action,assist:this.assist};this.pending=0;return result;
 }
 resequence(ack:number){this.seq=Math.max(this.seq,ack);this.pending=0;this.action=Math.max(this.action,this.seq);}
 dispose(){window.removeEventListener('storage',this.reload);window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.reset);}
}
