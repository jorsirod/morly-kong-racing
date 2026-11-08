import { allLines } from '../../src/game/voices';
import { writeFileSync } from 'fs';
const A='MALE VOICE ONLY: an adult man. He speaks Nicaraguan Spanish with a strong Managua street accent: aspirates or drops the final s («ehto», «chavaloh»), uses voseo, sing-song Central American intonation, relaxed and teasing. Not Mexican, not Spain, not neutral. Fictional arcade racing game character; do not imitate any real person.';
// pitch: target median F0 range (Hz) for the calm reference sentence; always a man's range.
const VOICES:Record<string,{desc:string;f0:[number,number]}>={
 semilla:{desc:'Male. A very tall Nicaraguan man in his thirties with a deep, relaxed, slightly husky bass voice; speaks calmly and with good humour, like someone on his third beer.',f0:[80,125]},
 morly:{desc:'Male. A big, burly Nicaraguan man in his thirties with a deep, booming baritone-bass voice; loud, partying, joking, with an easy belly laugh.',f0:[80,125]},
 chete:{desc:'Male. A Nicaraguan man in his thirties with a medium baritone voice; talks fast and boastful, cheeky show-off who always pays and rubs it in.',f0:[95,140]},
 coconitas:{desc:'Male. An athletic young Nicaraguan man with a clear, energetic baritone voice; competitive, shouts like on a basketball court.',f0:[95,145]},
 calin:{desc:'Male. A very laid-back young Nicaraguan man with a low, slow, slightly nasal baritone voice; drawls his words, super relaxed and spaced out.',f0:[85,130]},
 'sap-heinz':{desc:'Male. A very skinny young Nicaraguan man with a light, nasal male tenor voice; nervous and funny. Clearly a man, not a woman, not a child.',f0:[105,155]},
 enanonitas:{desc:'Male. A short, compact Nicaraguan man with a bright, quick male tenor voice; very expressive and partying. Clearly an adult man, not a woman, not a child.',f0:[105,155]},
 jorsi:{desc:'Male. A young Nicaraguan artist with a warm, medium male baritone voice; cheerful, mocking and expressive.',f0:[95,145]},
 roman:{desc:'Male. A bearded Nicaraguan man in his thirties with a deep, charismatic bass-baritone voice; a dancer, fun and confident.',f0:[80,125]},
 cucukis:{desc:'Male. A very skinny young Nicaraguan man with a light, cheeky male tenor voice; talks fast, a joking little sailor. Clearly an adult man, not a woman.',f0:[100,150]},
 raulin:{desc:'Male. A round-faced Nicaraguan man with a warm, medium baritone voice; friendly, down to earth, laughs a lot.',f0:[90,140]},
};
const REF:Record<string,string>={};for(const id of Object.keys(VOICES))REF[id]='Ideay, chavalos, ¿qué onda? Yo soy de Managua y esta carrera la voy a ganar, va pues.';
const lines=allLines().map(l=>({id:l.characterId,file:l.file,text:l.text,kind:l.kind}));
writeFileSync('scripts/voices/job.json',JSON.stringify({accent:A,voices:Object.fromEntries(Object.entries(VOICES).map(([k,v])=>[k,v.desc])),f0:Object.fromEntries(Object.entries(VOICES).map(([k,v])=>[k,v.f0])),ref:REF,lines},null,1));
console.log(lines.length);
