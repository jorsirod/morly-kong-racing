import {Engine} from '@babylonjs/core/Engines/engine';
import {Scene} from '@babylonjs/core/scene';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color';
import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector';
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
import {hazardsFor} from '../../shared/hazards';
import {track,vehicle} from '../../shared/content';
import {angle,lerp,routeFor,sample} from '../../shared/track';
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
 driftYaw:number;hop:number;lastDrift:number;lastStun:number;spinStart:number;stunTotal:number;faded:boolean;meshes:AbstractMesh[];lastImpact:number;wobble:number;decals?:TransformNode|null};
const PLAYER_COLORS=['#f14d53','#459be9','#78ce50','#ffc63c','#bd76e5','#54d5d9'];
import {savedQuality,reducedMotion,QUALITY,type Quality} from './renderer-settings';
export {savedQuality,reducedMotion,type Quality};
const ease=(t:number)=>1-(1-t)**3;
/** Converts glTF quaternion nodes to Euler so the race loop can steer, spin and lean them. */
function eulerize(node?:TransformNode|null){if(node?.rotationQuaternion){node.rotation=node.rotationQuaternion.toEulerAngles();node.rotationQuaternion=null;}}
export class RaceRenderer{
 engine:Engine;scene:Scene;fps=60;drawCalls=0;quality:Exclude<Quality,'auto'>='alta';reduced=reducedMotion();
 private camera:FreeCamera;private world:TransformNode;private trackId:string;private arena:boolean;
 private cars=new Map<string,Actor>();private hazards=new Map<number,TransformNode>();private attacks:AttackView;private boxes=new Map<number,TransformNode>();private assets=new Map<string,AssetContainer>();
 private effects:RaceEffects;private sun!:DirectionalLight;private shadowMap:ShadowGenerator|null=null;
 private lastEvent=0;private guests:{node:TransformNode;until:number;owner:string;born:number}[]=[];private frames=0;private seconds=0;private slowWindows=0;private auto:boolean;
 private cam={ready:false,yaw:0,antic:0,lift:0,groundY:0,pos:new Vector3(),look:new Vector3(),dip:0};
 constructor(canvas:HTMLCanvasElement,state:GameState){
  this.engine=new Engine(canvas,true,{powerPreference:'high-performance',stencil:true,preserveDrawingBuffer:false},false);
  const chosen=savedQuality();this.auto=chosen==='auto';
  // Phones start one notch lower; the automatic mode only steps down, quietly.
  this.quality=chosen==='auto'?(matchMedia?.('(pointer:coarse)').matches?'media':'alta'):chosen;
  this.engine.setHardwareScalingLevel(QUALITY[this.quality].scale);
  this.scene=new Scene(this.engine);this.scene.imageProcessingConfiguration.toneMappingEnabled=true;this.scene.imageProcessingConfiguration.toneMappingType=1;this.scene.imageProcessingConfiguration.exposure=1.1;this.scene.imageProcessingConfiguration.contrast=1.12;
  this.trackId=state.trackId;this.arena=state.mode==='battle';this.light();this.camera=new FreeCamera('race-camera',new Vector3(0,6,-12),this.scene);this.camera.minZ=.15;this.camera.maxZ=650;this.camera.fov=.9;
  this.world=buildWorld(this.scene,this.trackId,this.arena);this.effects=new RaceEffects(this.scene);this.attacks=new AttackView(this.scene);this.effects.setQuality(QUALITY[this.quality].low);window.addEventListener('resize',this.resize);
 }
 private light(){
  const night=this.trackId==='hipa-hipa';this.scene.clearColor=Color4.FromHexString((night?'#15274b':'#6dcefb')+'ff');this.scene.fogMode=Scene.FOGMODE_LINEAR;this.scene.fogStart=220;this.scene.fogEnd=560;this.scene.fogColor=Color3.FromHexString(night?'#15274b':'#bae9fd');
  const hemi=new HemisphericLight('sky',new Vector3(0,1,0),this.scene);hemi.intensity=night?.82:.85;hemi.groundColor=Color3.FromHexString('#537638').toLinearSpace();hemi.diffuse=Color3.FromHexString('#d9f3ff').toLinearSpace();
  this.sun=new DirectionalLight('sun',new Vector3(-.45,-1,.4),this.scene);this.sun.position.set(-40,60,-40);this.sun.intensity=night?.45:1.45;this.sun.diffuse=Color3.FromHexString('#fff2c9').toLinearSpace();this.sun.shadowMinZ=1;this.sun.shadowMaxZ=190;this.sun.shadowFrustumSize=75;
  const size=QUALITY[this.quality].shadows;
  if(!night&&size){this.shadowMap=new ShadowGenerator(size,this.sun);this.shadowMap.usePercentageCloserFiltering=true;this.shadowMap.filteringQuality=ShadowGenerator.QUALITY_LOW;this.shadowMap.bias=.002;this.shadowMap.normalBias=.035;this.shadowMap.setDarkness(.24);}
  if(night)for(let i=0;i<3;i++){const light=new PointLight('club-'+i,new Vector3((i-1)*55,12,0),this.scene);light.diffuse=Color3.FromHexString(['#f262ac','#46dce6','#ffd249'][i]);light.intensity=2.3;light.range=110;}
 }
 async preload(state:GameState){const ids=[...new Set(state.players.map(p=>p.vehicleId))];await Promise.all(ids.map(async id=>{try{this.assets.set(id,await LoadAssetContainerAsync('/models/'+id+'.glb',this.scene));}catch{/* Source geometry is the offline fallback. */}}));}
 private car(vehicleId:string,characterId:string):Car{
  const asset=this.assets.get(vehicleId);if(!asset)return buildVehicle(this.scene,vehicleId,characterId);
  const entries=asset.instantiateModelsToScene(name=>name+'-copy',false,{doNotInstantiate:false}),root=new TransformNode('car-instance',this.scene);for(const n of entries.rootNodes)n.parent=root;
  const nodes=root.getChildTransformNodes(),body=nodes.find(n=>n.name.startsWith('body'))??root,driverSocket=nodes.find(n=>n.name.startsWith('driver-socket'))??body,passengerSocket=nodes.find(n=>n.name.startsWith('passenger-socket'))??body,driver=buildCharacter(this.scene,characterId,driverSocket);
  const wheels=nodes.filter(n=>n.name.startsWith('wheel-spin-')),frontWheels=nodes.filter(n=>n.name.startsWith('wheel-pivot-front-')),alf=nodes.find(n=>n.name.startsWith('ALF-plush'));
  for(const n of [body,alf,...wheels,...frontWheels])eulerize(n);addVehicleDecals(this.scene,body,vehicleId);
  return{root,body,driverSocket,passengerSocket,driver,alf,wheels,frontWheels};
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
  if(state.trackId!==this.trackId){this.world.dispose();this.shadowMap?.dispose();this.shadowMap=null;this.scene.lights.slice().forEach(l=>l.dispose());this.trackId=state.trackId;this.light();this.world=buildWorld(this.scene,this.trackId,this.arena);this.cam.ready=false;this.boxes.forEach(v=>v.dispose());this.boxes.clear();this.hazards.forEach(v=>v.dispose());this.hazards.clear();const shadows=this.shadowMap as ShadowGenerator|null;for(const c of this.cars.values())for(const mesh of c.model.body.getChildMeshes())shadows?.addShadowCaster(mesh,false);}
  const me=state.players.find(p=>p.id===id)??state.players[0];
  if(!this.arena)for(const h of hazardsFor(state.trackId,state.time)){let node=this.hazards.get(h.id);if(!node){node=buildProjectile(this.scene,h.object);node.scaling.setAll(1.2);const warning=cylinder(this.scene,node,'warning',0,-.65,0,.03,2.8,'#ffcb36');warning.material=material(this.scene,'#ffcb36',true,.38);this.hazards.set(h.id,node);}node.position.set(h.x,h.y+.8,h.z);node.rotation.y=state.time*.5;}
  for(const event of state.events)if(event.id>this.lastEvent){this.lastEvent=event.id;if(event.type==='attack'&&event.special&&event.object==='claudia'){const p=state.players.find(v=>v.id===event.playerId);if(p){const node=buildProjectile(this.scene,'claudia',true);this.guests.push({node,until:state.time+1.4,owner:p.id,born:state.time});}}if(event.type==='land'&&event.playerId===id)this.cam.dip=.22;}
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
   const ground=this.arena?0:sample(routeFor(state.trackId),p.progress).y;c.shadow.position.set(p.x,ground+.075,p.z);c.shadow.rotation.y=p.yaw+c.driftYaw;c.shadow.scaling.x=1/(1+Math.max(0,p.y-ground)*.16);c.shadow.scaling.z=1.8*c.shadow.scaling.x;
  }
  for(const pick of state.pickups){let node=this.boxes.get(pick.id);if(!node){node=this.chargeBox();this.boxes.set(pick.id,node);}
   const ready=pick.availableAt<=state.time;node.setEnabled(ready||pick.availableAt-state.time<.6);node.scaling.setAll(ready?1:Math.max(.05,1-(pick.availableAt-state.time)/.6));
   node.position.set(pick.x,pick.y+1.6+Math.sin(state.time*3+pick.id)*.2,pick.z);node.rotation.y=state.time*1.4+pick.id;node.rotation.x=Math.sin(state.time*1.1+pick.id)*.25;}
  this.attacks.update(state,poses,dt,this.reduced,id);
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
  return{model,vehicleId:p.vehicleId,characterId:p.characterId,shadow,lod,steer:0,spin:0,label,driftYaw:0,hop:1,lastDrift:0,lastStun:0,spinStart:-9,stunTotal:0,faded:false,meshes:model.body.getChildMeshes(),lastImpact:0,wobble:0};
 }
 /** Suspension, drift angle, hop, spin-outs and pilot reactions. Purely visual. */
 private animate(c:Actor,p:PlayerState,state:GameState,dt:number,own:boolean){
  const body=c.model.body,mass=vehicleDynamics(p.vehicleId).mass,heavy=mass>2,k=(rate:number)=>Math.min(1,dt*rate);
  if(p.driftDir&&!c.lastDrift)c.hop=0;c.lastDrift=p.driftDir;c.hop=Math.min(1,c.hop+dt/.28);
  if(p.stun>c.lastStun+.05){c.spinStart=state.time;c.stunTotal=p.stun;}c.lastStun=p.stun;
  const spinT=p.stun>0?ease(Math.min(1,(state.time-c.spinStart)/Math.min(.95,Math.max(.4,c.stunTotal)))):1,turns=c.stunTotal>1?2:1;
  const spin=p.stun>0||spinT<1?spinT*Math.PI*2*turns:0;
  // The nose points into the drift while the car travels along the arc.
  c.driftYaw=lerp(c.driftYaw,p.driftDir*(.27+.07*Math.min(1,p.driftCharge))+(p.sliding>0?Math.sin(state.time*9)*.18:0),k(p.driftDir?7:5));
  body.rotation.y=c.driftYaw+spin;
  if(p.impact>c.lastImpact+.15)c.wobble=1;c.lastImpact=p.impact;c.wobble=Math.max(0,c.wobble-dt*2.6);
  const bob=Math.sin(state.time*(p.speed>2?10:2.4)+p.color)*Math.min(.05,p.speed*.002)*(p.surface===0?1:p.surface===1?2.2:3),land=Math.max(0,-p.vy)*.018,hop=Math.sin(c.hop*Math.PI)*.3;
  body.position.y=lerp(body.position.y,bob-land+hop,k(18));
  const lean=-p.turnRate*Math.min(.07,p.speed*.0028)*(heavy?1.25:1)-p.driftDir*.05;
  body.rotation.z=lerp(body.rotation.z,lean+Math.sin(state.time*22)*c.wobble*.06,k(heavy?8:13));
  const pitch=(p.boost>0?-.045:0)+(p.speed<vehicle(p.vehicleId).stats[0]*4&&p.speed>1&&!p.stun?-.02:0)+(p.vy>0?-.06:p.vy<0?.05:0)+Math.sin(state.time*18)*c.wobble*.05;
  body.rotation.x=lerp(body.rotation.x,pitch,k(10));
  c.steer=lerp(c.steer,p.driftDir?-p.driftDir*.22+p.steerAngle*.6:p.steerAngle,k(18));c.spin-=p.speed*dt/.52;for(const wheel of c.model.wheels??[])wheel.rotation.x=c.spin;for(const pivot of c.model.frontWheels??[])pivot.rotation.y=c.steer;
  const driver=c.model.driver;
  if(driver){
   const throwing=p.cooldown>.25,celebrate=p.finishTime>=0&&state.phase!=='running'?1:0;
   driver.rotation.z=lerp(driver.rotation.z,-p.turnRate*.05-p.driftDir*.12+Math.sin(state.time*30)*c.wobble*.12,k(10));
   driver.rotation.x=lerp(driver.rotation.x,throwing?-.22:p.stun>0?.25:p.boost>0?-.08:0,k(12));
   driver.rotation.y=lerp(driver.rotation.y,p.stun>0?Math.sin(state.time*14)*.4:throwing?.25:0,k(10));
   driver.position.y=lerp(driver.position.y,1.02+(celebrate?Math.abs(Math.sin(state.time*7))*.22:0)+(p.vy>0?.06:0),k(12));
  }
  if(c.model.alf){c.model.alf.rotation.z=Math.sin(state.time*6)*.05-p.turnRate*.1-p.driftDir*.14+Math.sin(state.time*25)*c.wobble*.2;c.model.alf.rotation.x=p.impact*.18+(p.boost>0?-.1:0);}
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
  const viewYaw=this.cam.yaw+this.cam.antic*.3,fx=Math.sin(viewYaw),fz=Math.cos(viewYaw),speed=Math.max(0,me.speed),boost=me.boost>0&&!this.reduced;
  const dist=7.4+speed*.05+(boost?.45:0);
  // Cars right behind push the camera up a little, smoothly, so they never hide the road.
  const blockers=new Set<string>();for(const p of poses){if(p.id===id||Math.abs(p.y-me.y)>1.6)continue;const dx=p.x-me.x,dz=p.z-me.z,along=dx*fx+dz*fz,across=dx*fz-dz*fx;if(along< -1.5&&along> -dist-2.5&&Math.abs(across)<2.6)blockers.add(p.id);}
  this.cam.lift=lerp(this.cam.lift,blockers.size?1.1:0,k(3));
  // Jumps: the camera follows height with a soft lag; a landing gives a tiny dip.
  this.cam.groundY=lerp(this.cam.groundY,root.position.y,k(me.vy!==0?3.2:9));this.cam.dip=Math.max(0,this.cam.dip-dt*.9);
  const height=3.2+speed*.02+this.cam.lift-(this.reduced?0:this.cam.dip),shake=this.reduced?0:Math.min(.08,me.impact*.07);
  const desired=new Vector3(root.position.x-fx*dist+Math.sin(state.tick*1.7)*shake,this.cam.groundY+height+Math.cos(state.tick*1.9)*shake,root.position.z-fz*dist);
  const look=new Vector3(root.position.x+fx*8,this.cam.groundY+1.25,root.position.z+fz*8);
  if(state.phase==='countdown'&&state.countdown>3&&!this.reduced){
   // Intro: a low sweep from the front of your car around to the chase view.
   const t=ease(Math.max(0,Math.min(1,1-(state.countdown-3)/INTRO))),orbit=me.yaw+Math.PI*(1-t)*1.15,radius=lerp(6.2,dist,t);
   desired.set(root.position.x-Math.sin(orbit)*radius,root.position.y+lerp(1.5,height,t),root.position.z-Math.cos(orbit)*radius);
   look.set(lerp(root.position.x,look.x,t),root.position.y+lerp(1.5,1.25,t),lerp(root.position.z,look.z,t));
   this.cam.pos.copyFrom(desired);this.cam.look.copyFrom(look);this.cam.ready=true;
  }
  else if(!this.cam.ready){this.cam.pos.copyFrom(desired);this.cam.look.copyFrom(look);this.cam.ready=true;}
  else{Vector3.LerpToRef(this.cam.pos,desired,k(13),this.cam.pos);Vector3.LerpToRef(this.cam.look,look,k(16),this.cam.look);}
  this.camera.position.copyFrom(this.cam.pos);this.camera.setTarget(this.cam.look);
  this.camera.rotation.z=this.reduced?0:-me.turnRate*.01-me.driftDir*.018+Math.sin(state.tick)*shake*.12;
  const fov=.9+Math.max(0,Math.min(1,(speed-10)/12))*.06+(boost?.08:0);this.camera.fov=lerp(this.camera.fov,fov,k(boost?7:3));
  this.sun.position.set(me.x-35,me.y+60,me.z-40);
 }
 dispose(){window.removeEventListener('resize',this.resize);this.labelLayer?.remove();this.attacks.dispose();this.effects.dispose();this.assets.forEach(a=>a.dispose());this.shadowMap?.dispose();this.scene.dispose();this.engine.dispose();}
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
