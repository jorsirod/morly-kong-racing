import {Engine} from '@babylonjs/core/Engines/engine';
import {Scene} from '@babylonjs/core/scene';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color';
import {Matrix,Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {HazardView} from './hazardView';
import {Birds,type ScreenFx} from './birds';
import {track,vehicle} from '../../shared/content';
import {angle,clamp,lerp,routeFor,sample} from '../../shared/track';
import {resolveVehicleCollision,vehicleDynamics,vehicleVelocity as vehicleVelocityOf} from '../../shared/dynamics';
import type {GameState,PlayerState} from '../../shared/types';
import {buildVehicle,buildCharacter,buildProjectile,addVehicleDecals,material,cylinder,sphere,box,textLabel,type VehicleModel} from './models';
import {buildWorld} from './world';
import {INTRO} from '../../shared/simulation';
import {RaceEffects} from './effects';
import {AttackView} from './attacks';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
import '@babylonjs/core/Rendering/outlineRenderer';
import '@babylonjs/core/Rendering/boundingBoxRenderer';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
type Car=VehicleModel;
type Actor={model:Car;vehicleId:string;characterId:string;shadow:TransformNode;lod:TransformNode;steer:number;spin:number;label?:HTMLElement|null;
 driftYaw:number;hop:number;lastDrift:number;lastStun:number;spinStart:number;stunTotal:number;faded:boolean;meshes:AbstractMesh[];lastImpact:number;wobble:number;decals?:TransformNode|null;
 /** Race time of this pilot's last special (pose) and of the last landing (squash). */ cast:number;landed:number;lastAir:number;shield?:Mesh|null;roll:number;suspension:number;alf:AlfState};
/** ALF's little routine: what he is doing now and until when. */
type AlfState={action:'idle'|'wave'|'look'|'cheer'|'hold';until:number;next:number};
const PLAYER_COLORS=['#f14d53','#459be9','#78ce50','#ffc63c','#bd76e5','#54d5d9'];
import {savedQuality,reducedMotion,QUALITY,type Quality} from './renderer-settings';
export {savedQuality,reducedMotion,type Quality};
const ease=(t:number)=>1-(1-t)**3;
/** Converts glTF quaternion nodes to Euler so the race loop can steer, spin and lean them. */
function eulerize(node?:TransformNode|null){if(node?.rotationQuaternion){node.rotation=node.rotationQuaternion.toEulerAngles();node.rotationQuaternion=null;}}
/** glTF files are right-handed, so the loader hangs them under a converting __root__ and every frame
 * inside ends up mirrored: a pilot added at runtime sat on the wrong side (on top of ALF) and runtime
 * yaw/roll ran backwards. Undo the conversion node by node so a GLB car behaves exactly like the
 * source geometry: x translations and quaternions are reflected back, and only the geometry keeps
 * the mirror (which cancels the exporter's own reflection). */
function unmirror(top:TransformNode){
 if(!(top.scaling.z<0||top.scaling.x<0))return;
 top.rotationQuaternion=Quaternion.Identity();top.scaling.set(1,1,1);
 for(const n of top.getDescendants(false)){
  if(!(n instanceof TransformNode))continue;
  n.position.x*=-1;const q=n.rotationQuaternion;if(q)n.rotationQuaternion=new Quaternion(q.x,-q.y,-q.z,q.w);else{n.rotation.y*=-1;n.rotation.z*=-1;}
  if('getTotalVertices' in n&&(n as AbstractMesh).getTotalVertices()>0)n.scaling.x*=-1;
 }
}
export class RaceRenderer{
 engine:Engine;scene:Scene;fps=60;drawCalls=0;quality:Exclude<Quality,'auto'>='alta';reduced=reducedMotion();
 private camera:FreeCamera;private world:TransformNode;private trackId:string;private arena:boolean;
 private cars=new Map<string,Actor>();private hazardView:HazardView;private birds:Birds;private attacks:AttackView;private boxes=new Map<number,TransformNode>();private assets=new Map<string,AssetContainer>();
 private effects:RaceEffects;private sun!:DirectionalLight;private shadowMap:ShadowGenerator|null=null;
 private lastEvent=0;private guests:{node:TransformNode;until:number;owner:string;born:number}[]=[];private frames=0;private seconds=0;private slowWindows=0;private auto:boolean;
 private cam={ready:false,yaw:0,antic:0,lift:0,groundY:0,pos:new Vector3(),look:new Vector3(),dip:0,cast:-9,fallPos:null as Vector3|null,air:0};
 /** Screen overlays the HUD draws (bird splats, warnings). */ screen:ScreenFx={splats:[],birdWarn:0,inTunnel:false};
 private tunnelLight:PointLight|null=null;private baseFog={start:220,end:560,color:new Color3(.73,.91,.99)};
 constructor(canvas:HTMLCanvasElement,state:GameState){
  this.engine=new Engine(canvas,true,{powerPreference:'high-performance',stencil:true,preserveDrawingBuffer:false},false);
  const chosen=savedQuality();this.auto=chosen==='auto';
  // Phones start one notch lower; the automatic mode only steps down, quietly.
  this.quality=chosen==='auto'?(matchMedia?.('(pointer:coarse)').matches?'media':'alta'):chosen;
  this.engine.setHardwareScalingLevel(QUALITY[this.quality].scale);
  this.scene=new Scene(this.engine);this.scene.imageProcessingConfiguration.toneMappingEnabled=true;this.scene.imageProcessingConfiguration.toneMappingType=1;this.scene.imageProcessingConfiguration.exposure=1.1;this.scene.imageProcessingConfiguration.contrast=1.12;
  this.trackId=state.trackId;this.arena=state.mode==='battle';this.light();this.camera=new FreeCamera('race-camera',new Vector3(0,6,-12),this.scene);this.camera.minZ=.15;this.camera.maxZ=650;this.camera.fov=.9;
  this.world=buildWorld(this.scene,this.trackId,this.arena);this.effects=new RaceEffects(this.scene);this.attacks=new AttackView(this.scene);this.hazardView=new HazardView(this.scene);this.birds=new Birds(this.scene);this.effects.setQuality(QUALITY[this.quality].low);window.addEventListener('resize',this.resize);
 }
 private light(){
  const night=this.trackId==='hipa-hipa';this.scene.clearColor=Color4.FromHexString((night?'#15274b':'#6dcefb')+'ff');this.scene.fogMode=Scene.FOGMODE_LINEAR;this.scene.fogStart=220;this.scene.fogEnd=560;this.scene.fogColor=Color3.FromHexString(night?'#15274b':'#bae9fd');this.baseFog={start:220,end:560,color:this.scene.fogColor.clone()};this.tunnelLight=null;
  const hemi=new HemisphericLight('sky',new Vector3(0,1,0),this.scene);hemi.intensity=night?.82:.85;hemi.groundColor=Color3.FromHexString('#537638').toLinearSpace();hemi.diffuse=Color3.FromHexString('#d9f3ff').toLinearSpace();
  this.sun=new DirectionalLight('sun',new Vector3(-.45,-1,.4),this.scene);this.sun.position.set(-40,60,-40);this.sun.intensity=night?.45:1.45;this.sun.diffuse=Color3.FromHexString('#fff2c9').toLinearSpace();this.sun.shadowMinZ=1;this.sun.shadowMaxZ=190;this.sun.shadowFrustumSize=75;
  const size=QUALITY[this.quality].shadows;
  if(!night&&size){this.shadowMap=new ShadowGenerator(size,this.sun);this.shadowMap.usePercentageCloserFiltering=true;this.shadowMap.filteringQuality=ShadowGenerator.QUALITY_LOW;this.shadowMap.bias=.002;this.shadowMap.normalBias=.035;this.shadowMap.setDarkness(.24);}
  if(night)for(let i=0;i<3;i++){const light=new PointLight('club-'+i,new Vector3((i-1)*55,12,0),this.scene);light.diffuse=Color3.FromHexString(['#f262ac','#46dce6','#ffd249'][i]);light.intensity=2.3;light.range=110;}
 }
 async preload(state:GameState){const ids=[...new Set(state.players.map(p=>p.vehicleId))];await Promise.all(ids.map(async id=>{try{this.assets.set(id,await LoadAssetContainerAsync('/models/'+id+'.glb',this.scene));}catch{/* Source geometry is the offline fallback. */}}));}
 private car(vehicleId:string,characterId:string):Car{
  const asset=this.assets.get(vehicleId);if(!asset)return buildVehicle(this.scene,vehicleId,characterId);
  const entries=asset.instantiateModelsToScene(name=>name+'-copy',false,{doNotInstantiate:false}),root=new TransformNode('car-instance',this.scene);for(const n of entries.rootNodes){if(n instanceof TransformNode)unmirror(n);n.parent=root;}
  const nodes=root.getChildTransformNodes(),body=nodes.find(n=>n.name.startsWith('body'))??root,driverSocket=nodes.find(n=>n.name.startsWith('driver-socket'))??body,passengerSocket=nodes.find(n=>n.name.startsWith('passenger-socket'))??body,driver=buildCharacter(this.scene,characterId,driverSocket);
  const wheels=nodes.filter(n=>n.name.startsWith('wheel-spin-')),frontWheels=nodes.filter(n=>n.name.startsWith('wheel-pivot-front-')),alf=nodes.find(n=>n.name.startsWith('ALF-plush'));
  const part=(name:string)=>nodes.find(n=>n.name.startsWith(name)),head=part('alf-head-pivot'),armL=part('alf-arm-left'),armR=part('alf-arm-right'),alfParts=alf&&head&&armL&&armR?{head,armL,armR}:undefined;
  for(const n of [body,alf,head,armL,armR,...wheels,...frontWheels])eulerize(n);addVehicleDecals(this.scene,body,vehicleId);
  return{root,body,driverSocket,passengerSocket,driver,alf,alfParts,wheels,frontWheels};
 }
 private lod(parent:TransformNode,vehicleId:string,characterId:string){
  const root=new TransformNode('distant-car',this.scene);root.parent=parent;const v=vehicle(vehicleId),d=vehicleDynamics(vehicleId);box(this.scene,root,'lod-body',0,.92,0,d.halfWidth*2,.8,d.halfLength*2,v.color);box(this.scene,root,'lod-rear',0,1.7,-.6,d.halfWidth*1.7,.55,1.35,v.color);sphere(this.scene,root,'lod-driver',-.4,2.3,.2,.8,'#c38c6b');
  for(const x of [-d.halfWidth,d.halfWidth])for(const z of [-d.halfLength*.6,d.halfLength*.6]){const wheel=cylinder(this.scene,root,'lod-wheel',x,.45,z,.32,.9,'#202a39');wheel.rotation.z=Math.PI/2;}return root;
 }
 resize=()=>this.engine.resize();
 setQuality(q:Exclude<Quality,'auto'>){
  if(q===this.quality)return;this.quality=q;const level=QUALITY[q];this.engine.setHardwareScalingLevel(level.scale);this.effects.setQuality(level.low);
  if(!level.shadows&&this.shadowMap){this.shadowMap.dispose();this.shadowMap=null;}
 }
 render(state:GameState,id:string,dt:number){
  if(state.trackId!==this.trackId){this.world.dispose();this.shadowMap?.dispose();this.shadowMap=null;this.scene.lights.slice().forEach(l=>l.dispose());this.trackId=state.trackId;this.light();this.world=buildWorld(this.scene,this.trackId,this.arena);this.cam.ready=false;this.boxes.forEach(v=>v.dispose());this.boxes.clear();const shadows=this.shadowMap as ShadowGenerator|null;for(const c of this.cars.values())for(const mesh of c.model.body.getChildMeshes())shadows?.addShadowCaster(mesh,false);}
  const me=state.players.find(p=>p.id===id)??state.players[0];
  this.hazardView.update(state,me,state.time);
  for(const event of state.events)if(event.id>this.lastEvent){this.lastEvent=event.id;if(event.type==='attack'&&event.special&&event.object==='claudia'){const p=state.players.find(v=>v.id===event.playerId);if(p){const node=buildProjectile(this.scene,'claudia',true);this.guests.push({node,until:state.time+1.4,owner:p.id,born:state.time});}}if(event.type==='land'&&event.playerId===id)this.cam.dip=.12+.22*Math.min(1,event.intensity??.3);if(event.type==='attack'&&event.special){const a=this.cars.get(event.playerId);if(a)a.cast=state.time;if(event.playerId===id)this.cam.cast=state.time;}}
  // Claudia appears beside the caster (never in front of the camera) and rides along briefly.
  for(const g of this.guests){const owner=state.players.find(p=>p.id===g.owner);if(g.until<state.time||!owner){g.node.dispose();continue;}const t=state.time-g.born,rx=Math.cos(owner.yaw),rz=-Math.sin(owner.yaw),fx=Math.sin(owner.yaw),fz=Math.cos(owner.yaw),pop=Math.min(1,t/.2)*Math.min(1,(g.until-state.time)/.2);g.node.position.set(owner.x+rx*3.4+fx*2.5,owner.y+1.6+Math.sin(t*9)*.15,owner.z+rz*3.4+fz*2.5);g.node.rotation.set(0,owner.yaw+Math.PI*.85,Math.sin(t*6)*.1);g.node.scaling.setAll(1.25*pop);}
  this.guests=this.guests.filter(g=>g.until>=state.time&&state.players.some(p=>p.id===g.owner));
  const ids=new Set(state.players.map(p=>p.id));for(const [key,c]of this.cars)if(!ids.has(key)){c.model.root.dispose();c.shadow.dispose();c.label?.remove();this.cars.delete(key);}
  // Display physical poses immediately near a contact; delayed lerp used to show ghost overlap.
  const poses=state.players.map(p=>{const c=this.cars.get(p.id);if(!c||p.id===id||p.impact>.06)return{...p};const d=Math.hypot(c.model.root.position.x-p.x,c.model.root.position.z-p.z),a=d>5?1:Math.min(1,dt*22);return{...p,x:lerp(c.model.root.position.x,p.x,a),y:lerp(c.model.root.position.y,p.y,a),z:lerp(c.model.root.position.z,p.z,a),yaw:c.model.root.rotation.y+angle(p.yaw-c.model.root.rotation.y)*a};});
  for(let pass=0;pass<3;pass++)for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++)resolveVehicleCollision(poses[i],poses[j]);
  const lodDistance=QUALITY[this.quality].lod;
  for(const p of poses){let c=this.cars.get(p.id);if(!c||c.vehicleId!==p.vehicleId||c.characterId!==p.characterId){if(c){c.model.root.dispose();c.shadow.dispose();c.label?.remove();}c=this.actor(p,id);this.cars.set(p.id,c);}
   const root=c.model.root;root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;const distance=me?Math.hypot(p.x-me.x,p.z-me.z):0;root.setEnabled(distance<170);const full=distance<lodDistance||p.id===id;c.model.body.setEnabled(full);c.lod.setEnabled(!full);
   if(full){this.animate(c,p,state,dt,p.id===id);const decals=c.decals??(c.decals=c.model.body.getChildTransformNodes(true).find(n=>n.name==='decals')??null);decals?.setEnabled(distance<30||p.id===id);}
   const ground=this.arena?0:sample(routeFor(state.trackId),p.progress).y;c.shadow.setEnabled(p.fall<=0&&p.y>ground-1);c.shadow.position.set(p.x,ground+.075,p.z);c.shadow.rotation.y=p.yaw+c.driftYaw;c.shadow.scaling.x=1/(1+Math.max(0,p.y-ground)*.16);c.shadow.scaling.z=1.8*c.shadow.scaling.x;
  }
  for(const pick of state.pickups){let node=this.boxes.get(pick.id);if(!node||node.metadata?.kind!==pick.kind){node?.dispose();node=pick.kind===1?this.itemBox():this.chargeBox();node.metadata={kind:pick.kind};this.boxes.set(pick.id,node);}
   const ready=pick.availableAt<=state.time;node.setEnabled(ready||pick.availableAt-state.time<.6);node.scaling.setAll(ready?1:Math.max(.05,1-(pick.availableAt-state.time)/.6));
   node.position.set(pick.x,pick.y+1.6+Math.sin(state.time*3+pick.id)*.2,pick.z);node.rotation.y=state.time*1.4+pick.id;node.rotation.x=Math.sin(state.time*1.1+pick.id)*.25;}
  this.attacks.update(state,poses,dt,this.reduced,id);
  // Lane gates (La Salle courts): closed while the lane is shut for your lap, swung open after.
  for(const g of (this.world.metadata?.gates??[]) as {node:TransformNode;laps:number[]}[]){const open=!!me&&g.laps.includes(me.lap);g.node.setEnabled(!open);}
  if(me){this.birds.update(state,me,dt,this.screen,this.reduced);this.tunnel(state,me,dt);}
  if(me)this.updateCamera(state,me,poses,dt,id);
  this.placeLabels(id);
  // Ambient life: flags, crowds, bouncing balls. Only nearby groups update.
  for(const a of (this.world.metadata?.anims??[]) as {node:TransformNode;update:(t:number)=>void}[])if(!me||Vector3.DistanceSquared(a.node.getAbsolutePosition(),new Vector3(me.x,me.y,me.z))<160*160)a.update(state.time);
  this.effects.update(state,id,dt);this.scene.render();this.frames++;this.seconds+=dt;
  if(this.seconds>2){this.fps=Math.round(this.frames/this.seconds);
   // Automatic quality steps down only after two slow windows, so a hiccup never changes it.
   if(this.auto&&this.fps<40){if(++this.slowWindows>=2&&this.quality!=='baja'){this.setQuality(this.quality==='alta'?'media':'baja');this.slowWindows=0;}}else this.slowWindows=0;
   this.frames=0;this.seconds=0;}
 }
 /** Translucent gold charge box with a bolt inside: reads as «item» from far away.
  * Built once; every box is a set of instances, so 28 boxes cost four draw calls. */
 private boxTemplate:Mesh[]|null=null;
 private chargeBox(){
  if(!this.boxTemplate){
   const shell=MeshBuilder.CreateBox('charge-shell',{size:1.35},this.scene);const glass=material(this.scene,'#ffcf3d',true,.42);glass.backFaceCulling=false;shell.material=glass;
   const edges:Mesh[]=[];for(const [x,y,z,w,h,d] of [[0,.68,.68,1.42,.09,.09],[0,-.68,.68,1.42,.09,.09],[0,.68,-.68,1.42,.09,.09],[0,-.68,-.68,1.42,.09,.09],[.68,0,.68,.09,1.42,.09],[-.68,0,.68,.09,1.42,.09],[.68,0,-.68,.09,1.42,.09],[-.68,0,-.68,.09,1.42,.09],[.68,.68,0,.09,.09,1.42],[-.68,.68,0,.09,.09,1.42],[.68,-.68,0,.09,.09,1.42],[-.68,-.68,0,.09,.09,1.42]] as number[][]){const e=MeshBuilder.CreateBox('charge-edge',{width:w,height:h,depth:d},this.scene);e.position.set(x,y,z);edges.push(e);}
   const frame=Mesh.MergeMeshes(edges,true)!;frame.material=material(this.scene,'#fff4c4',true);
   const core=textLabel(this.scene,null,'⚡+3',0,0,0,1.05,1.05,'#13234d','#ffd33d') as Mesh|null;
   const halo=MeshBuilder.CreateTorus('charge-ring',{diameter:2.3,thickness:.07,tessellation:20},this.scene);halo.rotation.x=Math.PI/2;halo.bakeCurrentTransformIntoVertices();halo.material=material(this.scene,'#fff2bf',true);
   this.boxTemplate=[shell,frame,halo,...(core?[core]:[])];for(const m of this.boxTemplate){m.isPickable=false;m.position.y-=5000;m.alwaysSelectAsActiveMesh=false;}
  }
  const node=new TransformNode('pickup',this.scene);
  for(const m of this.boxTemplate){const inst=m.createInstance(m.name+'-i');inst.parent=node;inst.position.setAll(0);inst.isPickable=false;if(m.name.startsWith('label'))inst.billboardMode=7;}
  return node;
 }
 /** Surprise box: translucent violet cube, rainbow edges and a big «?», unmistakable next to the gold charge boxes. */
 private itemTemplate:Mesh[]|null=null;
 private itemBox(){
  if(!this.itemTemplate){
   const shell=MeshBuilder.CreateBox('item-shell',{size:1.35},this.scene);const m=material(this.scene,'#b46bff',true,.4);m.backFaceCulling=false;shell.material=m;
   const colors=['#ff5f7a','#ffd33d','#45e0ff','#8bff6a'],edges:Mesh[]=[];let i=0;
   for(const [x,y,z,w,h,d] of [[0,.68,.68,1.42,.1,.1],[0,-.68,.68,1.42,.1,.1],[0,.68,-.68,1.42,.1,.1],[0,-.68,-.68,1.42,.1,.1],[.68,0,.68,.1,1.42,.1],[-.68,0,.68,.1,1.42,.1],[.68,0,-.68,.1,1.42,.1],[-.68,0,-.68,.1,1.42,.1],[.68,.68,0,.1,.1,1.42],[-.68,.68,0,.1,.1,1.42],[.68,-.68,0,.1,.1,1.42],[-.68,-.68,0,.1,.1,1.42]] as number[][]){const e=MeshBuilder.CreateBox('item-edge',{width:w,height:h,depth:d},this.scene);e.position.set(x,y,z);e.material=material(this.scene,colors[i++%4],true);edges.push(e);}
   const frame=Mesh.MergeMeshes(edges,true,true,undefined,false,true)!;
   const mark=textLabel(this.scene,null,'?',0,0,0,1.1,1.1,'#ffffff','#7a2bb8') as Mesh|null;
   const halo=MeshBuilder.CreateTorus('item-ring',{diameter:2.3,thickness:.07,tessellation:20},this.scene);halo.rotation.x=Math.PI/2;halo.bakeCurrentTransformIntoVertices();halo.material=material(this.scene,'#f3d4ff',true);
   this.itemTemplate=[shell,frame,halo,...(mark?[mark]:[])];for(const m of this.itemTemplate){m.isPickable=false;m.position.y-=5000;m.alwaysSelectAsActiveMesh=false;}
  }
  const node=new TransformNode('item-pickup',this.scene);
  for(const m of this.itemTemplate){const inst=m.createInstance(m.name+'-i');inst.parent=node;inst.position.setAll(0);inst.isPickable=false;if(m.name.startsWith('label'))inst.billboardMode=7;}
  return node;
 }
 /** Inside the Masaya tunnel: red fog, a warm light riding with the car and darker sky. */
 private tunnel(state:GameState,me:PlayerState,dt:number){
  const c=routeFor(state.trackId).course,L=routeFor(state.trackId).length,d=((me.progress%L)+L)%L,inside=!this.arena&&c.tunnels.some(([a,b])=>d>a&&d<b);
  this.screen.inTunnel=inside;const k=Math.min(1,dt*3);
  const fogColor=inside?new Color3(.45,.12,.05):this.baseFog.color;this.scene.fogColor=Color3.Lerp(this.scene.fogColor,fogColor,k);
  this.scene.fogStart=lerp(this.scene.fogStart,inside?18:this.baseFog.start,k);this.scene.fogEnd=lerp(this.scene.fogEnd,inside?120:this.baseFog.end,k);
  if(inside&&!this.tunnelLight){this.tunnelLight=new PointLight('tunnel-light',new Vector3(me.x,me.y+6,me.z),this.scene);this.tunnelLight.diffuse=Color3.FromHexString('#ff7a2e');this.tunnelLight.range=45;}
  if(this.tunnelLight){this.tunnelLight.position.set(me.x,me.y+6,me.z);this.tunnelLight.intensity=lerp(this.tunnelLight.intensity,inside?1.8+Math.sin(state.time*7)*.25:0,k);if(!inside&&this.tunnelLight.intensity<.02){this.tunnelLight.dispose();this.tunnelLight=null;}}
 }
 private labelLayer:HTMLDivElement|null=null;
 private makeLabel(name:string,color:string){
  if(!this.labelLayer){const host=this.engine.getRenderingCanvas()?.parentElement;if(!host)return null;this.labelLayer=document.createElement('div');this.labelLayer.className='rival-labels';this.labelLayer.setAttribute('aria-hidden','true');host.appendChild(this.labelLayer);}
  const el=document.createElement('span');el.textContent=name;el.style.setProperty('--tag',color);this.labelLayer.appendChild(el);return el;
 }
 /** Names keep a fixed, small size; they hide when too close, too far, or over your own car. */
 private placeLabels(id:string){
  if(!this.labelLayer)return;const width=this.engine.getRenderWidth(true),height=this.engine.getRenderHeight(true),scale=this.engine.getHardwareScalingLevel(),w=width*scale,h=height*scale;
  const transform=this.scene.getTransformMatrix(),viewport=this.camera.viewport.toGlobal(w,h),point=new Vector3();
  for(const [key,c] of this.cars){const el=c.label;if(!el)continue;
   if(key===id||!c.model.root.isEnabled()){el.style.opacity='0';continue;}
   const at=c.model.root.position,distance=Vector3.Distance(at,this.camera.position);
   Vector3.ProjectToRef(new Vector3(at.x,at.y+3.1,at.z),Matrix.IdentityReadOnly,transform,viewport,point);
   const center=Math.abs(point.x-w/2)<w*.14&&point.y>h*.42,show=point.z>0&&point.z<1&&distance>8&&distance<60&&!center;
   el.style.opacity=show?'1':'0';if(show)el.style.transform=`translate(${point.x.toFixed(0)}px,${point.y.toFixed(0)}px) translate(-50%,-100%) scale(${Math.max(.78,Math.min(1,22/distance+.5)).toFixed(2)})`;
  }
 }
 private actor(p:PlayerState,id:string):Actor{
  const model=this.car(p.vehicleId,p.characterId),color=PLAYER_COLORS[p.color%PLAYER_COLORS.length];box(this.scene,model.body,'player-color',.62,2.235,-.68,.24,.025,.5,color);
  const label=p.id===id?null:this.makeLabel(p.nickname,color);
  const shadow=cylinder(this.scene,null,'contact-shadow',0,.01,0,.02,2.5,'#13263a');shadow.scaling.z=1.8;shadow.material=material(this.scene,'#13263a',false,.25);
  const lod=this.lod(model.root,p.vehicleId,p.characterId);lod.setEnabled(false);
  for(const mesh of model.body.getChildMeshes())this.shadowMap?.addShadowCaster(mesh,false);
  return{model,vehicleId:p.vehicleId,characterId:p.characterId,shadow,lod,steer:0,spin:0,label,driftYaw:0,hop:1,lastDrift:0,lastStun:0,spinStart:-9,stunTotal:0,faded:false,meshes:model.body.getChildMeshes(),lastImpact:0,wobble:0,cast:-9,landed:-9,lastAir:0,shield:null,roll:0,suspension:0,alf:{action:'idle',until:0,next:4+p.color%3}};
 }
 /** Suspension, drift angle, hop, spin-outs, jumps, falls and pilot reactions. Purely visual. */
 private animate(c:Actor,p:PlayerState,state:GameState,dt:number,own:boolean){
  const body=c.model.body,mass=vehicleDynamics(p.vehicleId).mass,heavy=mass>2,light=mass<1,k=(rate:number)=>Math.min(1,dt*rate),t=state.time;
  if(p.driftDir&&!c.lastDrift)c.hop=0;c.lastDrift=p.driftDir;c.hop=Math.min(1,c.hop+dt/.28);
  if(p.stun>c.lastStun+.05){c.spinStart=t;c.stunTotal=p.stun;}c.lastStun=p.stun;
  const spinT=p.stun>0?ease(Math.min(1,(t-c.spinStart)/Math.min(.95,Math.max(.4,c.stunTotal)))):1,turns=c.stunTotal>1?2:1;
  const spin=p.stun>0||spinT<1?spinT*Math.PI*2*turns:0;
  // The nose points into the drift while the car travels along the arc.
  c.driftYaw=lerp(c.driftYaw,p.driftDir*(.27+.07*Math.min(1,p.driftCharge))+(p.sliding>0?Math.sin(t*9)*.18:0),k(p.driftDir?7:5));
  body.rotation.y=c.driftYaw+spin;
  if(p.impact>c.lastImpact+.15)c.wobble=1;c.lastImpact=p.impact;c.wobble=Math.max(0,c.wobble-dt*2.6);
  // Landing: the body squashes and rebounds; heavy trucks sink deeper, light cars bounce more.
  if(c.lastAir>.25&&p.air<=0&&p.vy===0&&p.fall<=0)c.landed=t;c.lastAir=p.air;
  const land=Math.max(0,1-(t-c.landed)/(heavy?.55:.42)),squash=Math.sin(land*Math.PI*(light?3:2))*land*(heavy?.2:light?.12:.15);
  const rough=p.surface===0?1:p.surface===1?2.2:3,bob=Math.sin(t*(p.speed>2?10:2.4)+p.color)*Math.min(.05,p.speed*.002)*rough,hop=Math.sin(c.hop*Math.PI)*.3;
  // In the air the wheels hang down a little (suspension extends); on the ground they carry the body.
  c.suspension=lerp(c.suspension,p.air>0?.16:0,k(p.air>0?6:16));
  body.position.y=lerp(body.position.y,bob-squash+hop+c.suspension,k(18));
  for(const w of c.model.frontWheels??[])w.position.y=(w.metadata?.baseY??(w.metadata={baseY:w.position.y}).baseY)-c.suspension*.9;
  // Lean in curves (heavier cars roll more and slower), pitch with throttle, slope and airtime.
  const lean=-p.turnRate*Math.min(.085,p.speed*.0034)*(heavy?1.35:light?.8:1)-p.driftDir*.05+(p.slow>0?Math.sin(t*6.5)*.09:0);
  c.roll=lerp(c.roll,lean+Math.sin(t*22)*c.wobble*.06,k(heavy?6:light?14:10));body.rotation.z=c.roll;
  const slope=p.air<=0&&p.speed>2?-Math.atan(p.gvy/Math.max(4,p.speed)):0;
  let pitch=(p.boost>0?-.05:0)+(p.speed<vehicle(p.vehicleId).stats[0]*4&&p.speed>1&&!p.stun?-.02:0)+(p.air>0?clamp(-p.vy*.028,-.28,.3):0)+slope+squash*.7+Math.sin(t*18)*c.wobble*.05;
  // Falling: the car tumbles nose-first into whatever is below.
  if(p.fall>0){const f=1-p.fall/1.25;pitch=f*2.2;body.rotation.z=Math.sin(f*6)*.5;}
  body.rotation.x=lerp(body.rotation.x,pitch,k(p.fall>0?20:10));
  // Respawn: the car blinks while its grace lasts.
  const faded=p.respawn>0&&Math.floor(t*12)%2===0;if(faded!==c.faded){c.faded=faded;for(const m of c.meshes)m.visibility=faded?.25:1;}
  // Helmet: a bubble around the car until it pops.
  if(p.shield>0&&!c.shield){const bubble=MeshBuilder.CreateSphere('helmet-shield',{diameter:6.4,segments:12},this.scene);const m=material(this.scene,'#7fd4ff',true,.22);m.backFaceCulling=false;m.disableDepthWrite=true;bubble.material=m;bubble.parent=c.model.root;bubble.position.y=1.4;bubble.scaling.set(.85,.7,1.05);bubble.isPickable=false;c.shield=bubble;}
  if(c.shield){c.shield.setEnabled(p.shield>0);if(p.shield>0)c.shield.visibility=.6+Math.sin(t*6)*.25+(p.shield<2&&Math.floor(t*8)%2?-.4:0);}
  c.steer=lerp(c.steer,p.driftDir?-p.driftDir*.22+p.steerAngle*.6:p.steerAngle,k(18));c.spin-=p.speed*dt/.52;for(const wheel of c.model.wheels??[])wheel.rotation.x=c.spin;for(const pivot of c.model.frontWheels??[])pivot.rotation.y=c.steer;
  const driver=c.model.driver;
  if(driver){
   const throwing=p.cooldown>.25,celebrate=p.finishTime>=0&&state.phase!=='running'?1:0;
   // Special: the pilot stands up big above the cabin for the whole phrase, leans back, then throws.
   const cast=t-c.cast,posing=cast>=0&&cast<1.6,pose=posing?Math.sin(Math.min(1,cast/.25)*Math.PI/2)*Math.min(1,(1.6-cast)/.3):0,throwT=posing?Math.max(0,(cast-.55)/.4):0;
   driver.rotation.z=lerp(driver.rotation.z,-p.turnRate*.05-p.driftDir*.12+Math.sin(t*30)*c.wobble*.12+(p.slow>0?Math.sin(t*5)*.25:0),k(10));
   driver.rotation.x=lerp(driver.rotation.x,posing?(throwT<1?.35-throwT*.75:-.4):throwing?-.22:p.stun>0?.25:p.air>.2?-.18:p.boost>0?-.08:0,k(posing?16:12));
   driver.rotation.y=lerp(driver.rotation.y,p.stun>0?Math.sin(t*14)*.4:throwing?.25:posing?Math.sin(cast*7)*.15:0,k(10));
   driver.position.y=lerp(driver.position.y,1.02+(celebrate?Math.abs(Math.sin(t*7))*.22:0)+(p.vy>0?.06:0)+pose*.55,k(14));
   driver.scaling.setAll(lerp(driver.scaling.x,1+pose*.22,k(14)));
  }
  this.animateAlf(c,p,state,dt);
 }
 /** ALF rides along: he reacts to curves, jumps, hits and boosts, and now and then waves,
  * looks back or celebrates, with pauses so it never loops. */
 private animateAlf(c:Actor,p:PlayerState,state:GameState,dt:number){
  const alf=c.model.alf;if(!alf)return;const t=state.time,k=(rate:number)=>Math.min(1,dt*rate),a=c.alf,parts=c.model.alfParts;
  if(t>a.until&&a.action!=='idle'){a.action='idle';a.next=t+2.5+((p.color*37+Math.floor(t))%5)*.9;}
  if(a.action==='idle'&&t>a.next&&p.fall<=0){const pick=Math.floor(t*7+p.color)%5;a.action=pick===0||pick===3?'wave':pick===1?'look':pick===2?'cheer':'hold';a.until=t+(a.action==='look'?1.4:a.action==='hold'?1.6:1.2);}
  // Situations override the routine: boosts and good landings make him cheer, hits make him hold on.
  const reaction=p.stun>0||p.impact>.25?'hold':p.boostLevel>=3||p.boostLevel>=4?'cheer':p.air>.3?'cheer':'';
  const action=reaction||a.action,curve=-p.turnRate*.16-p.driftDir*.18,bounce=Math.sin(t*6)*.05;
  alf.rotation.z=lerp(alf.rotation.z,curve+bounce+Math.sin(t*25)*c.wobble*.2,k(8));
  alf.rotation.x=lerp(alf.rotation.x,p.impact*.25+(p.boost>0?-.12:0)+(p.air>0?-.15:0),k(8));
  alf.position.y=lerp(alf.position.y,(alf.metadata?.baseY??(alf.metadata={baseY:alf.position.y}).baseY)+(action==='cheer'?Math.abs(Math.sin(t*9))*.18:0)+(p.air>0?.1:0),k(12));
  if(parts){
   const head=parts.head,armL=parts.armL,armR=parts.armR;
   head.rotation.y=lerp(head.rotation.y,action==='look'?2.4:action==='wave'?-.4:-p.turnRate*.35,k(action==='look'?5:8));
   head.rotation.x=lerp(head.rotation.x,action==='hold'?.25:action==='cheer'?-.2:0,k(8));
   armR.rotation.x=lerp(armR.rotation.x,action==='wave'||action==='cheer'?-2.5:action==='hold'?-.6:0,k(10));armR.rotation.z=lerp(armR.rotation.z,action==='wave'?Math.sin(t*12)*.5:0,k(12));
   armL.rotation.x=lerp(armL.rotation.x,action==='cheer'?-2.5:action==='hold'?-.6:0,k(10));armL.rotation.z=lerp(armL.rotation.z,action==='cheer'?Math.sin(t*12+1)*.4:0,k(12));
  }
 }
 private updateCamera(state:GameState,me:PlayerState,poses:PlayerState[],dt:number,id:string){
  const actor=this.cars.get(me.id);if(!actor)return;const root=actor.model.root,k=(rate:number)=>Math.min(1,dt*rate);
  // Heading lags the chassis and leans toward the travel direction: drifts read, wobbles don't.
  const vel=vehicleVelocityOf(me),travel=Math.hypot(vel.x,vel.z)>4?Math.atan2(vel.x,vel.z):me.yaw;
  const target=me.yaw+angle(travel-me.yaw)*.3+me.driftDir*.06;
  if(!this.cam.ready){this.cam.yaw=target;this.cam.groundY=root.position.y;}
  this.cam.yaw=angle(this.cam.yaw+angle(target-this.cam.yaw)*k(me.stun>0?2.5:7));
  let antic=0;if(!this.arena){const route=routeFor(state.trackId),ahead=sample(route,me.progress+Math.max(10,Math.min(26,me.speed*1.1)));antic=Math.max(-.45,Math.min(.45,angle(Math.atan2(ahead.x-me.x,ahead.z-me.z)-this.cam.yaw)));}
  this.cam.antic=lerp(this.cam.antic,antic,k(2.5));
  // Own special: a short swing to a three-quarter view so you see your pilot's gesture; control stays.
  const cast=state.time-this.cam.cast,cine=this.reduced||cast<0||cast>1.5?0:Math.sin(Math.min(1,cast/.3)*Math.PI/2)*Math.min(1,(1.5-cast)/.4);
  const viewYaw=this.cam.yaw+this.cam.antic*.3+cine*.42,fx=Math.sin(viewYaw),fz=Math.cos(viewYaw),speed=Math.max(0,me.speed),boost=me.boost>0&&!this.reduced;
  // Big jumps: the camera eases back and up so you can see the landing.
  this.cam.air=lerp(this.cam.air,me.air>.25&&me.fall<=0?1:0,k(me.air>.25?2.5:4));
  const dist=7.4+speed*.05+(boost?.45:0)+this.cam.air*2.2-cine*1.4;
  // Cars right behind push the camera up a little, smoothly, so they never hide the road.
  const blockers=new Set<string>();for(const p of poses){if(p.id===id||Math.abs(p.y-me.y)>1.6)continue;const dx=p.x-me.x,dz=p.z-me.z,along=dx*fx+dz*fz,across=dx*fz-dz*fx;if(along< -1.5&&along> -dist-2.5&&Math.abs(across)<2.6)blockers.add(p.id);}
  this.cam.lift=lerp(this.cam.lift,blockers.size?1.1:0,k(3));
  // Jumps: the camera follows height with a soft lag; a landing gives a tiny dip.
  this.cam.groundY=lerp(this.cam.groundY,root.position.y,k(me.vy!==0?3.2:9));this.cam.dip=Math.max(0,this.cam.dip-dt*.9);
  const height=3.2+speed*.02+this.cam.lift-(this.reduced?0:this.cam.dip)+this.cam.air*1.4-cine*1.1,shake=this.reduced?0:Math.min(.08,me.impact*.07);
  const desired=new Vector3(root.position.x-fx*dist+Math.sin(state.tick*1.7)*shake,this.cam.groundY+height+Math.cos(state.tick*1.9)*shake,root.position.z-fz*dist);
  const look=new Vector3(root.position.x+fx*8,this.cam.groundY+1.25,root.position.z+fz*8);
  if(state.phase==='countdown'&&state.countdown>3&&!this.reduced){
   // Intro: a low sweep from the front of your car around to the chase view.
   const t=ease(Math.max(0,Math.min(1,1-(state.countdown-3)/INTRO))),orbit=me.yaw+Math.PI*(1-t)*1.15,radius=lerp(6.2,dist,t);
   desired.set(root.position.x-Math.sin(orbit)*radius,root.position.y+lerp(1.5,height,t),root.position.z-Math.cos(orbit)*radius);
   look.set(lerp(root.position.x,look.x,t),root.position.y+lerp(1.5,1.25,t),lerp(root.position.z,look.z,t));
   this.cam.pos.copyFrom(desired);this.cam.look.copyFrom(look);this.cam.ready=true;
  }
  else if(me.fall>0){
   // Falling: the camera stays on the edge and watches the car go down, then cuts to the respawn.
   if(!this.cam.fallPos)this.cam.fallPos=this.cam.pos.clone();this.cam.pos.copyFrom(this.cam.fallPos);Vector3.LerpToRef(this.cam.look,new Vector3(root.position.x,root.position.y,root.position.z),k(10),this.cam.look);
  }
  else if(!this.cam.ready||this.cam.fallPos){this.cam.fallPos=null;this.cam.pos.copyFrom(desired);this.cam.look.copyFrom(look);this.cam.ready=true;this.cam.groundY=root.position.y;}
  else{Vector3.LerpToRef(this.cam.pos,desired,k(13),this.cam.pos);Vector3.LerpToRef(this.cam.look,look,k(16),this.cam.look);}
  this.camera.position.copyFrom(this.cam.pos);this.camera.setTarget(this.cam.look);
  this.camera.rotation.z=this.reduced?0:-me.turnRate*.01-me.driftDir*.018+Math.sin(state.tick)*shake*.12;
  const fov=.9+Math.max(0,Math.min(1,(speed-10)/12))*.06+(boost?me.boostLevel>=4?.13:.08:0)+this.cam.air*.05+cine*.06;this.camera.fov=lerp(this.camera.fov,fov,k(boost?7:3));
  this.sun.position.set(me.x-35,me.y+60,me.z-40);
 }
 dispose(){window.removeEventListener('resize',this.resize);this.labelLayer?.remove();this.attacks.dispose();this.hazardView.dispose();this.birds.dispose();this.effects.dispose();this.assets.forEach(a=>a.dispose());this.shadowMap?.dispose();this.scene.dispose();this.engine.dispose();}
}
export function garagePreview(canvas:HTMLCanvasElement,vehicleId:string,characterId:string){
 const engine=new Engine(canvas,true,{powerPreference:'low-power'},false),scene=new Scene(engine);scene.clearColor=new Color4(0,0,0,0);scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.08;const camera=new ArcRotateCamera('garage',Math.PI/3,1.12,8.4,new Vector3(0,1.1,0),scene);camera.lowerRadiusLimit=6;camera.upperRadiusLimit=12;camera.lowerBetaLimit=.7;camera.upperBetaLimit=1.4;camera.attachControl(canvas,true);
 const hemi=new HemisphericLight('sky',new Vector3(0,1,.5),scene);hemi.intensity=1.05;hemi.groundColor=Color3.FromHexString('#6583a3').toLinearSpace();const sun=new DirectionalLight('sun',new Vector3(-.4,-1,-.5),scene);sun.intensity=1.4;sun.diffuse=Color3.FromHexString('#fff1c5').toLinearSpace();cylinder(scene,null,'plinth',0,-.1,0,.3,7,'#233d76');const car=buildVehicle(scene,vehicleId,characterId);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;const dash=MeshBuilder.CreateBox('plinth-stripe',{width:.08,height:.02,depth:.35},scene);dash.position.set(Math.sin(a)*3.1,.065,Math.cos(a)*3.1);dash.rotation.y=a;dash.material=material(scene,'#d6cfae');}
 const resize=()=>engine.resize();window.addEventListener('resize',resize);engine.runRenderLoop(()=>{const t=performance.now();car.body.position.y=Math.sin(t/700)*.035;scene.render();});
 return()=>{window.removeEventListener('resize',resize);scene.dispose();engine.dispose();};
}
export function arcadeBackdrop(canvas:HTMLCanvasElement,id:string,overview=false){
 const engine=new Engine(canvas,true,{powerPreference:'low-power'},false),scene=new Scene(engine),def=track(id);
 scene.clearColor=Color4.FromHexString(def.sky+'ff');scene.fogMode=Scene.FOGMODE_LINEAR;scene.fogStart=overview?600:260;scene.fogEnd=overview?950:650;scene.fogColor=Color3.FromHexString(def.sky);scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.08;
 const hemi=new HemisphericLight('sky',new Vector3(0,1,.3),scene);hemi.intensity=.95;const sun=new DirectionalLight('sun',new Vector3(-.5,-1,.4),scene);sun.intensity=1.2;buildWorld(scene,id);
 const r=routeFor(id),start=sample(r,45),focus=overview?new Vector3(0,12,0):new Vector3(start.x,start.y+1,start.z);
 let camera:ArcRotateCamera|FreeCamera;if(overview){const orbit=new ArcRotateCamera('arcade-camera',Math.PI/3,.78,420,focus,scene);orbit.lowerRadiusLimit=300;orbit.upperRadiusLimit=550;orbit.attachControl(canvas,true);camera=orbit;}else{const hero=new Vector3(start.x-Math.cos(start.yaw)*3.8,start.y+1.2,start.z+Math.sin(start.yaw)*3.8);const shot=new FreeCamera('arcade-camera',new Vector3(hero.x+Math.sin(start.yaw)*11+Math.cos(start.yaw)*7,start.y+6.2,hero.z+Math.cos(start.yaw)*11-Math.sin(start.yaw)*7),scene);shot.setTarget(hero);shot.fov=.85;camera=shot;}
 if(!overview){for(let i=0;i<3;i++){const car=buildVehicle(scene,['silver-surfer','orange-seed','hola-willy'][i],['morly','semilla','chete'][i]);const pos=sample(r,45-i*6);car.root.position.set(pos.x+Math.cos(pos.yaw)*(i-1)*3.8,pos.y,pos.z-Math.sin(pos.yaw)*(i-1)*3.8);car.root.rotation.y=pos.yaw;}}
 const initial=overview?(camera as ArcRotateCamera).alpha:0,resize=()=>engine.resize();window.addEventListener('resize',resize);let last=0;
 engine.runRenderLoop(()=>{const now=performance.now();if(now-last<1000/30)return;last=now;if(overview)(camera as ArcRotateCamera).alpha=initial+Math.sin(now/15000)*.12;scene.render();});
 return()=>{window.removeEventListener('resize',resize);scene.dispose();engine.dispose();};
}
