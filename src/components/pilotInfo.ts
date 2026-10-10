import type { AttackDefinition, CharacterDefinition } from '../../shared/types';

/** One line per pilot, built only from what the game already says about them. */
export const TAGLINES:Record<string,string>={
 semilla:'El más alto de la pandilla. Victoria en mano.',
 morly:'Camisola de los Lakers y chinela eléctrica.',
 chete:'Paga en efectivo… y te lo cobra en la pista.',
 coconitas:'Básquet, Flor de Caña y talco por todos lados.',
 calin:'Gorra roja, camisa blanca, hojas y cero prisa.',
 'sap-heinz':'Flaco, con sapitos y antojo de pizza.',
 enanonitas:'Cebollas para todos y una invocación especial.',
 jorsi:'El artista: pintura, lápiz y borrador.',
 raulin:'Pepinos de sobra y un balde de leche.',
};
/** What each special does, in a sentence, for the cards and the special banner. */
export const SPECIAL_INFO:Record<string,string>={
 semilla:'Un six-pack completo vuela al de adelante y lo deja aturdido.',
 morly:'Un chinelazo eléctrico que deja temblando a quien alcanza.',
 chete:'Tira el PlayStation 3: el que lo recibe se queda en pausa.',
 coconitas:'Explosión gigante de talco: nadie alrededor ve nada.',
 calin:'Nube de humo que envuelve a todos los que vienen cerca.',
 'sap-heinz':'La pizza de la rotonda, directo a la cara del rival.',
 enanonitas:'Una aparición que deja aturdidos a los de adelante.',
 jorsi:'Le pinta un corazón sonriente en la mochila y lo aturde.',
 raulin:'Riega leche: quien pasa resbala y se queda inmóvil.',
};
export const EFFECT_LABEL:Record<AttackDefinition['effect'],string>={spin:'hace girar',stun:'aturde',paint:'pinta la pantalla',slow:'frena',smoke:'humo',slip:'resbala'};
export const DELIVERY_LABEL:Record<AttackDefinition['delivery'],string>={projectile:'al frente',rear:'hacia atrás',area:'en área',boomerang:'va y vuelve',bounce:'rebota',homing:'te persigue'};

/*
 * Comparable ratings (1–5), derived from the real attack data so they never lie:
 * Golpe = how hard the basics stop a car; Ráfaga = how many objects per throw;
 * Control = how many screen/handling effects; Defensa = cover behind or around you.
 */
const STOP:Record<AttackDefinition['effect'],number>={spin:5,stun:5,slip:3.5,slow:3,paint:2.5,smoke:2};
export function pilotStats(c:CharacterDefinition){
 const all=[...c.basics,c.special],clamp=(n:number)=>Math.max(1,Math.min(5,Math.round(n)));
 const golpe=clamp(c.basics.reduce((s,a)=>s+STOP[a.effect],0)/c.basics.length);
 const rafaga=clamp(c.basics.reduce((s,a)=>s+a.count,0)/1.4);
 const control=clamp(1+all.filter(a=>a.effect!=='spin'&&a.effect!=='stun').length*1.2);
 const defensa=clamp(1+all.reduce((s,a)=>s+(a.delivery==='rear'||a.delivery==='area'?2:a.delivery==='boomerang'?1.5:0),0));
 return [{label:'Golpe',value:golpe},{label:'Ráfaga',value:rafaga},{label:'Control',value:control},{label:'Defensa',value:defensa}];
}
