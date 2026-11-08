import { allLines } from '../../src/game/voices';
import { writeFileSync } from 'fs';
const A='Acento nicaragüense de Managua bien marcado: seseo, aspira la s al final de sílaba («ehto», «chavaloh»), voseo, entonación cantadita y pícara de Nicaragua. Español centroamericano, nada neutro ni mexicano. Personaje ficticio de videojuego arcade de carreras, gritando de emoción; no imitar a ninguna persona real.';
const VOICES:Record<string,string>={
 semilla:'Hombre de unos 30 años, muy alto, voz grave y relajada, algo ronca, habla con calma y buen humor, como quien va por la tercera cerveza.',
 morly:'Hombre de unos 30 años, voz grave, potente y fiestera, muy energético y bromista, carcajada fácil.',
 chete:'Hombre de unos 30 años, voz media, habla rápido y presumido, pícaro y vacilón, como el que siempre paga y lo restriega.',
 coconitas:'Hombre joven atlético, voz clara y enérgica, competitivo, grita como en una cancha de básquet.',
 calin:'Hombre joven muy tranquilo, voz pausada y algo nasal, arrastra las palabras, relajadísimo y medio volado.',
 'sap-heinz':'Hombre joven muy flaco, voz aguda y nasal, nervioso y chistoso.',
 enanonitas:'Hombre bajito, voz aguda, rápida y chillona, muy expresiva y fiestera.',
 jorsi:'Hombre joven artista, voz media y cálida, alegre, burlón y expresivo.',
 roman:'Hombre barbudo de unos 30 años, voz grave y carismática, bailador, divertido y seguro de sí mismo.',
 cucukis:'Hombre joven muy flaco, voz algo aguda y pícara, habla rápido, con chispa de marinerito bromista.',
 raulin:'Hombre de cara redonda, voz media y alegre, campechano, se ríe mucho.',
};
const REF:Record<string,string>={};for(const id of Object.keys(VOICES))REF[id]='¡Ideay, chavalos! Aquí vengo yo, agárrense, que esta carrera la gano de vicio. ¡Va pues, dale!';
const lines=allLines().map(l=>({id:l.characterId,file:l.file,text:l.text,kind:l.kind}));
writeFileSync('scripts/voices/job.json',JSON.stringify({accent:A,voices:VOICES,ref:REF,lines},null,1));
console.log(lines.length);
