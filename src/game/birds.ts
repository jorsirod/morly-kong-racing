import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { routeFor, sample } from '../../shared/track';
import type { GameState, PlayerState } from '../../shared/types';
import { box, material } from './models';
import '@babylonjs/core/Meshes/Builders/discBuilder';

/** What the HUD draws on top of the 3D view. */
export interface ScreenFx { splats:{id:number;x:number;y:number;r:number;s:number;born:number}[]; birdWarn:number; inTunnel:boolean; birdCall?:number }
/*
 * La Salle: a flock of zanates crosses near the courts on laps two and three. Their shadows and
 * calls arrive first (≈1.3 s), then a few splats land near the screen edges and fade within
 * about two seconds. The centre of the screen always stays clear.
 */
const SPOTS=[[9,22],[84,18],[14,70],[88,64],[22,12],[76,78],[6,46],[93,40]];
export class Birds{
 private flock:TransformNode|null=null;private wings:Mesh[]=[];private shadows:Mesh[]=[];private lastLap=-1;private start=-9;private origin={x:0,y:0,z:0,yaw:0};private splatId=0;private fired=0;
 constructor(private scene:Scene){}
 private build(){
  const flock=new TransformNode('zanates',this.scene),black='#141820';
  for(let i=0;i<14;i++){const bird=new TransformNode('zanate',this.scene);bird.parent=flock;bird.position.set((i%5-2)*2.6+(i%2)*1.1,Math.floor(i/5)*1.3+(i%3)*.5,Math.floor(i/5)*3+(i%4));
   box(this.scene,bird,'zanate-body',0,0,0,.35,.3,1.1,black);box(this.scene,bird,'zanate-tail',0,.05,-.75,.5,.06,.6,black);
   for(const side of [-1,1]){const wing=box(this.scene,bird,'zanate-wing',side*.6,0,.05,1.1,.05,.45,black);wing.setPivotPoint(new Vector3(-side*.55,0,0));this.wings.push(wing);}
   const shadow=MeshBuilder.CreateDisc('zanate-shadow',{radius:.9,tessellation:10},this.scene);shadow.rotation.x=Math.PI/2;shadow.material=material(this.scene,'#0d1a14',false,.35);shadow.isPickable=false;this.shadows.push(shadow);}
  this.flock=flock;flock.setEnabled(false);for(const s of this.shadows)s.setEnabled(false);
 }
 update(state:GameState,me:PlayerState,_dt:number,screen:ScreenFx,reduced:boolean){
  screen.birdWarn=0;screen.splats=screen.splats.filter(s=>state.time-s.born<2.3&&state.time>=s.born);
  if(state.trackId!=='la-salle'||state.mode==='battle'||state.phase!=='running')return;
  const r=routeFor(state.trackId),L=r.length,f=((me.progress%L)+L)%L/L;
  if(me.lap>=1&&me.lap!==this.lastLap&&f>.335&&f<.37&&me.fall<=0){
   this.lastLap=me.lap;this.start=state.time;this.fired=0;const p=sample(r,me.progress+70);this.origin={x:p.x,y:p.y,z:p.z,yaw:p.yaw};screen.birdCall=state.time;
   if(!this.flock)this.build();
  }
  const t=state.time-this.start;
  if(t>=0&&t<3.4&&this.flock){
   this.flock.setEnabled(true);
   // They fly toward you along the road, low over the courts, and away behind.
   const o=this.origin,back=t*34,h=o.y+10-Math.min(1,t/1.2)*3.5;this.flock.position.set(o.x-Math.sin(o.yaw)*back,h,o.z-Math.cos(o.yaw)*back);this.flock.rotation.y=o.yaw+Math.PI;
   this.wings.forEach((w,i)=>{w.rotation.z=Math.sin(state.time*22+i)*.7*(i%2?-1:1);});
   this.flock.getChildren().forEach((b,i)=>{const s=this.shadows[i];const pos=(b as TransformNode).getAbsolutePosition();s.setEnabled(true);s.position.set(pos.x,o.y+.12,pos.z);});
   if(t<1.3)screen.birdWarn=1.3-t;
   // Splats: two on lap two, three on the final lap; at the edges, never in the middle.
   const count=reduced?1:me.lap>=2?3:2;
   while(this.fired<count&&t>=1.3+this.fired*.18){const k=this.fired++,spot=SPOTS[(me.lap*3+k+Math.floor(this.start))%SPOTS.length];screen.splats.push({id:++this.splatId,x:spot[0],y:spot[1],r:(k*67+me.lap*29)%360,s:.8+(k%2)*.35,born:state.time});}
  }else if(this.flock){this.flock.setEnabled(false);for(const s of this.shadows)s.setEnabled(false);}
 }
 dispose(){this.flock?.dispose();this.shadows.forEach(s=>s.dispose());}
}
