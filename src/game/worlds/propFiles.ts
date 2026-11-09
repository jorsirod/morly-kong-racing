/** Which GLB in public/models/scenery/ holds each prop type (see props.ts). Kept free of Babylon for the tests. */
export const PROP_FILES:Record<string,string>={
 palm:'vegetation',mango:'vegetation',malinche:'vegetation',ceiba:'vegetation',pine:'vegetation',bush:'vegetation',rock:'vegetation',
 cristo:'cristo',catedral:'managua','arbol-vida':'managua',chinamo:'oriental',lona:'oriental',volcano:'masaya',
};
/** Triangle budget per type: vegetation is repeated dozens of times, landmarks appear once. */
export const PROP_TRIANGLES:Record<string,number>={palm:2500,mango:2500,malinche:3000,ceiba:3000,pine:1500,bush:1200,rock:600,'arbol-vida':3500,chinamo:1500,lona:400};
export const LANDMARK_TRIANGLES=16000;
