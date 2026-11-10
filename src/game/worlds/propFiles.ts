/** Which GLB in public/models/scenery/ holds each prop type (see props.ts). Kept free of Babylon for the tests. */
export const PROP_FILES:Record<string,string>={
 palm:'vegetation',mango:'vegetation',malinche:'vegetation',ceiba:'vegetation',pine:'vegetation',bush:'vegetation',rock:'vegetation',
 cristo:'cristo',catedral:'managua','arbol-vida':'managua',chinamo:'oriental',lona:'oriental',volcano:'masaya',
 'aula-pb':'lasalle','aula-pa':'lasalle','aula-techo':'lasalle',capilla:'lasalle','porton-lasalle':'lasalle','bus-escolar':'lasalle',
 cafeteria:'lasalle','bar-lasalle':'lasalle',palacio:'managua',concha:'managua',
 'casa-m1':'managua','casa-m2':'managua','casa-m3':'managua','casa-techo':'managua',
 'casa-playa-1':'sanjuan','casa-playa-2':'sanjuan','teja-playa':'sanjuan',
 barra:'hipa','palmera-tronco':'hipa','palmera-copa':'hipa',
 poste:'calle',
};
/** Triangle budget per type: vegetation is repeated dozens of times, landmarks appear once. */
export const PROP_TRIANGLES:Record<string,number>={poste:700,palm:2500,mango:2500,malinche:3000,ceiba:3000,pine:1500,bush:1200,rock:600,'arbol-vida':3500,chinamo:1500,lona:400,'aula-pb':1500,'aula-pa':1500,'aula-techo':800,'casa-m1':1200,'casa-m2':1200,'casa-m3':1200,'casa-techo':300,'casa-playa-1':800,'casa-playa-2':800,'teja-playa':800};
export const LANDMARK_TRIANGLES=16000;
