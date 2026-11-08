import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import type { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

/*
 * The colour grade of each world: a painted sky dome, the fog that melts into its horizon and the
 * image processing. ACES tone mapping made everything look washed out (it was built for physically
 * based materials, ours are flat arcade colours), so it is off and a gentle saturation lift is on.
 */
export interface Look { top:string; mid:string; horizon:string; hemiSky:string; hemiGround:string; sun:string; sunPower:number; hemiPower:number; saturation:number; contrast:number; exposure:number; stars?:boolean; sunDisc?:string; fogStart:number; fogEnd:number }
export const LOOKS:Record<string,Look>={
 'la-salle':{top:'#1f7fe6',mid:'#58b6f5',horizon:'#c9f1ff',hemiSky:'#e3f6ff',hemiGround:'#6f9a3c',sun:'#fff0c4',sunPower:1.35,hemiPower:.9,saturation:34,contrast:1.1,exposure:1.04,sunDisc:'#fff6c9',fogStart:240,fogEnd:600},
 oriental:{top:'#2a7fe0',mid:'#6fb9f0',horizon:'#f6ecd2',hemiSky:'#fff1d8',hemiGround:'#8a7a52',sun:'#fff0d2',sunPower:1.34,hemiPower:.9,saturation:24,contrast:1.12,exposure:1.04,sunDisc:'#fff0bf',fogStart:220,fogEnd:560},
 managua:{top:'#1b78e2',mid:'#4fb0f2',horizon:'#bff0ff',hemiSky:'#e6f7ff',hemiGround:'#7a9a45',sun:'#fff1c9',sunPower:1.38,hemiPower:.9,saturation:34,contrast:1.1,exposure:1.04,sunDisc:'#fff6cf',fogStart:240,fogEnd:600},
 'hipa-hipa':{top:'#05041a',mid:'#140a38',horizon:'#3a1a5e',hemiSky:'#c2b8ff',hemiGround:'#2b2048',sun:'#c9bcff',sunPower:.55,hemiPower:.85,saturation:30,contrast:1.12,exposure:1.08,stars:true,fogStart:240,fogEnd:620},
 masaya:{top:'#2b6fd0',mid:'#7ab0e6',horizon:'#ffd7ae',hemiSky:'#ffe9d2',hemiGround:'#6b5640',sun:'#ffd7a0',sunPower:1.42,hemiPower:.86,saturation:32,contrast:1.12,exposure:1.04,sunDisc:'#ffe2a6',fogStart:220,fogEnd:580},
 'san-juan':{top:'#0f7ee0',mid:'#3fc0f2',horizon:'#b6fbff',hemiSky:'#e2fbff',hemiGround:'#8aa64b',sun:'#fff3cc',sunPower:1.42,hemiPower:.92,saturation:38,contrast:1.1,exposure:1.05,sunDisc:'#fff8d6',fogStart:260,fogEnd:640},
};
export const lookFor=(id:string)=>LOOKS[id]??LOOKS['la-salle'];
const lin=(hex:string)=>Color3.FromHexString(hex).toLinearSpace();

/** Image processing for a race or preview scene. */
export function grade(scene:Scene,look:Look){
 const ip=scene.imageProcessingConfiguration;
 ip.toneMappingEnabled=false;ip.exposure=look.exposure;ip.contrast=look.contrast;
 const curves=new ColorCurves();curves.globalSaturation=look.saturation;curves.highlightsSaturation=look.saturation*.4;curves.shadowsHue=220;curves.shadowsDensity=12;curves.shadowsSaturation=30;
 ip.colorCurves=curves;ip.colorCurvesEnabled=true;
 ip.vignetteEnabled=true;ip.vignetteWeight=1.6;ip.vignetteStretch=.6;ip.vignetteCameraFov=.9;
}
export function lightColors(look:Look){return{hemiSky:lin(look.hemiSky),hemiGround:lin(look.hemiGround),sun:lin(look.sun)};}

/** Painted sky dome: gradient, a soft sun glow, or stars at night. Never fogged, follows the camera. */
export function skyDome(scene:Scene,look:Look){
 const dome=MeshBuilder.CreateSphere('sky-dome',{diameter:1250,segments:16,sideOrientation:1},scene);
 dome.isPickable=false;dome.infiniteDistance=true;dome.applyFog=false;
 const m=new StandardMaterial('sky-dome',scene);m.disableLighting=true;m.backFaceCulling=false;m.fogEnabled=false;
 if(typeof document!=='undefined'){
  const W=64,H=512,tex=new DynamicTexture('sky-dome',{width:W,height:H},scene,false),ctx=tex.getContext() as CanvasRenderingContext2D;
  // V runs from the bottom pole (0) to the top pole (1): the horizon sits at the middle.
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,look.top);g.addColorStop(.3,look.mid);g.addColorStop(.47,look.horizon);g.addColorStop(.53,look.horizon);g.addColorStop(1,look.horizon);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(look.stars){let s=7;const r=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1000)/1000;};for(let i=0;i<160;i++){const y=r()*H*.42,a=.35+r()*.65;ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillRect(r()*W,y,r()<.15?2:1,1);}}
  tex.update(false);tex.hasAlpha=false;m.emissiveTexture=tex;m.diffuseColor=new Color3(0,0,0);m.specularColor=new Color3(0,0,0);
 }else m.emissiveColor=Color3.FromHexString(look.mid);
 dome.material=m;dome.renderingGroupId=0;
 // A warm halo where the sun is, low over the horizon behind the scenery.
 if(look.sunDisc){
  const sun=MeshBuilder.CreatePlane('sky-sun',{size:120},scene);sun.isPickable=false;sun.applyFog=false;sun.infiniteDistance=true;sun.billboardMode=7;sun.position.set(-330,190,380);
  const sm=new StandardMaterial('sky-sun',scene);sm.disableLighting=true;sm.fogEnabled=false;sm.backFaceCulling=false;
  if(typeof document!=='undefined'){const S=128,t=new DynamicTexture('sky-sun',{width:S,height:S},scene,false),c=t.getContext() as CanvasRenderingContext2D,rg=c.createRadialGradient(S/2,S/2,2,S/2,S/2,S/2);rg.addColorStop(0,'rgba(255,255,240,1)');rg.addColorStop(.16,look.sunDisc);rg.addColorStop(.22,'rgba(255,240,200,.55)');rg.addColorStop(1,'rgba(255,240,200,0)');c.fillStyle=rg;c.fillRect(0,0,S,S);t.update(false);t.hasAlpha=true;sm.emissiveTexture=t;sm.opacityTexture=t;}
  sun.material=sm;
 }
 return dome;
}
