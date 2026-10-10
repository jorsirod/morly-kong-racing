/** Quality and motion preferences, readable without loading the 3D engine. */
export type Quality='auto'|'alta'|'media'|'baja';
/** Lower levels keep characters, cars and attacks recognisable: they trade resolution,
 * dynamic shadows (contact shadows stay) and the distance where far cars simplify. */
export const QUALITY={alta:{scale:1,shadows:1024,lod:48,low:false},media:{scale:1.25,shadows:0,lod:36,low:false},baja:{scale:1.6,shadows:0,lod:26,low:true}} as const;
export function savedQuality():Quality{try{const q=new URLSearchParams(location.search).get('calidad')??localStorage.getItem('morly-quality');if(q==='alta'||q==='media'||q==='baja'||q==='auto')return q;}catch{/* private mode */}return 'auto';}
export function reducedMotion(){try{return localStorage.getItem('morly-motion')==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches&&localStorage.getItem('morly-motion')!=='full';}catch{return false;}}
