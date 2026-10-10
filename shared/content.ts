import type { AttackDefinition, CharacterDefinition, TrackDefinition, VehicleDefinition } from './types';
const a = (name: string, object: string, icon: string, count = 1, effect: AttackDefinition['effect'] = 'spin', delivery: AttackDefinition['delivery'] = 'projectile'): AttackDefinition => ({ name, object, icon, count, effect, delivery });
export const CHARACTERS: CharacterDefinition[] = [
 { id:'semilla', name:'Semilla', initials:'SE', color:'#e7b93a', shirt:'#eee5d0', beard:true, basics:[a('Victoria','victoria','🍺'),a('Marlboro','cigarettes','🚬',1,'smoke'),a('Cenicero','ashtray','◉',1,'slip','rear')],special:a('Acompáñame a comprar bicha','sixpack','🍻',1,'stun') },
 { id:'morly',name:'Morly',initials:'MO',color:'#f5bc32',shirt:'#f5bc32',cap:'#fff2d4',beard:true,basics:[a('Toña','tona','🍺'),a('Ron Plata','rum','🍾'),a('Bolsa de hielo','ice','🧊',1,'slip','rear')],special:a('Chinelazo Voltio Impact!!','slipper','⚡',1,'stun') },
 { id:'chete',name:'Chete',initials:'CH',color:'#66ba8b',shirt:'#244f43',basics:[a('Billete','bill','💵',1,'paint'),a('Monedas','coin','🪙',5,'slow'),a('Diamante','diamond','💎')],special:a('Si yo me voy nadie juega play','console','🎮',1,'stun') },
 { id:'coconitas',name:'Coconitas',initials:'CO',color:'#ed783d',shirt:'#de783e',basics:[a('Pelota de básquet','basketball','🏀'),a('Dos pelotas','basketball','🏀',2),a('Flor de Caña','flor','🍾')],special:a('Kokonit Fatality','talc','☁',1,'smoke','area') },
 { id:'calin',name:'Calín',initials:'CA',color:'#df5c51',shirt:'#fff9e9',cap:'#d73e39',basics:[a('Una hoja','leaf','🌿',1,'slow'),a('Dos hojas','leaf','🌿',2,'slow'),a('Tres hojas','leaf','🌿',3,'slow')],special:a('Ármate 1','smoke','☁',1,'smoke','area') },
 { id:'sap-heinz',name:'Sap Heinz',initials:'SH',color:'#84b967',shirt:'#84b967',basics:[a('Un sapito','frog','🐸'),a('Dos sapitos','frog','🐸',2),a('Tres sapitos','frog','🐸',3)],special:a('Pizza de la rotonda','pizza','🍕',1,'stun') },
 { id:'enanonitas',name:'Enanonitas',initials:'EN',color:'#bf8873',shirt:'#ab4944',basics:[a('Una cebolla','onion','🧅',1,'slow'),a('Dos cebollas','onion','🧅',2,'slow'),a('Tres cebollas','onion','🧅',3,'slow')],special:a('Yo te invoco, Claudia Salinas','claudia','🧅',6,'stun') },
 { id:'jorsi',name:'Jorsi',initials:'JO',color:'#66b5c0',shirt:'#317e91',basics:[a('Plumazo de pintura','brush','🖌',1,'paint'),a('Lápiz con resorte','pencil','✏'),a('Borrador volador','eraser','▰',1,'spin','boomerang')],special:a('Yo te pinto la mochila','backpack','🎒',1,'stun') },
 { id:'raulin',name:'Raulín',initials:'RA',color:'#909fc6',shirt:'#58759d',basics:[a('Un pepino','cucumber','🥒'),a('Dos pepinos','cucumber','🥒',2),a('Tres pepinos','cucumber','🥒',3)],special:a('Balde de leche','milk','🥛',1,'stun','area') },
];
export const VEHICLES: VehicleDefinition[] = [
 { id:'silver-surfer',name:'Silver Surfer',model:'Suzuki Jimny · 2008',color:'#a6b4ba',kind:'suv',description:'El más culito de todos.',stats:[4,4,5,4,5] },
 { id:'white-empanade',name:'White Empanade',model:'Toyota Hilux · 1999',color:'#f4efe2',kind:'pickup-double',description:'Primero se toma el cafecito. Después, quítate.',stats:[4,2,2,5,4] },
 { id:'hola-willy',name:'Hola Willy',model:'Volkswagen Golf IV · ALF a bordo',color:'#f3efe3',kind:'golf',description:'ALF de copiloto. Él tampoco sabe llegar.',stats:[4,4,4,3,2] },
 { id:'orange-seed',name:'Orange Seed',model:'Mazda 3 · hatchback',color:'#f3782c',kind:'mazda',description:'Dobla precioso. Aguanta golpes como celular sin funda.',stats:[3,5,5,2,2] },
 { id:'black-diamond',name:'Black Diamond',model:'Daewoo Matiz · aprox. 2009',color:'#27353c',kind:'matiz',description:'Corre como si debiera plata. Pesa como el recibo.',stats:[5,4,3,1,1] },
 { id:'la-raulina',name:'La Raulina',model:'Chevrolet S-10 · cabina sencilla',color:'#f7f3df',kind:'pickup-single',description:'Una cabina, cero delicadeza. El resto que se quite.',stats:[3,3,3,5,3] },
];
const p = (x:number,z:number,y=0) => ({x,y,z});
export const TRACKS: TrackDefinition[] = [
 {id:'la-salle',name:'La Salle',subtitle:'La salida de clases nunca fue así.',color:'#d7aa56',sky:'#b8e2e0',ground:'#aac597',width:15,points:[p(0,-155),p(130,-155),p(180,-60),p(180,45),p(115,85),p(80,35),p(10,35),p(-35,85),p(-130,85),p(-175,10),p(-170,-80),p(-95,-155)],landmarks:['La entrada','Las aulas','El bar','Las canchas']},
 {id:'oriental',name:'Mercado Oriental',subtitle:'Entre chinamos, atajos y pura bulla.',color:'#df8757',sky:'#e8d9bc',ground:'#b29c73',width:14,points:[p(0,-145),p(115,-145),p(170,-75),p(115,-30),p(175,55),p(105,140),p(5,100),p(-100,145),p(-175,75),p(-125,0),p(-175,-95),p(-90,-145)],landmarks:['Gancho de Camino','Los chinamos','Calle del Maíz','Carretones']},
 {id:'managua',name:'Managua',subtitle:'Toda la ciudad, una sola vuelta.',color:'#6db4c2',sky:'#c5e5ef',ground:'#afb58b',width:18,points:[p(0,-170),p(140,-170),p(190,-65),p(120,30,4),p(155,145),p(30,180),p(-80,130),p(-170,80),p(-185,-40),p(-120,-150)],landmarks:['El lago','La vieja Catedral','Tiscapa','Las rotondas']},
 {id:'hipa-hipa',name:'Hipa Hipa',subtitle:'Luces, curva y otra vuelta más.',color:'#d879a6',sky:'#16293e',ground:'#213f47',width:15,points:[p(0,-140),p(120,-140),p(160,-45),p(100,15),p(140,110),p(20,150),p(-95,100),p(-165,10),p(-140,-90)],landmarks:['La barra','La pista de baile','El DJ','Luces al ritmo']},
 {id:'masaya',name:'Volcán Masaya',subtitle:'Una carrera al borde del cráter.',color:'#e58c50',sky:'#d6b49f',ground:'#656f60',width:17,points:[p(0,-165),p(90,-170,4),p(150,-132,9),p(166,-72,13),p(134,-30,17),p(172,12,21),p(192,70,26),p(146,122,32),p(72,152,37),p(18,186,40),p(-44,166,40),p(-104,152,36),p(-152,112,30),p(-138,62,26),p(-186,22,21),p(-182,-50,13),p(-132,-110,6),p(-70,-152,2)],landmarks:['El ascenso','El mirador','Cráter Santiago','Roca volcánica']},
 {id:'san-juan',name:'San Juan del Sur',subtitle:'Del malecón hasta el Cristo.',color:'#76c2bf',sky:'#f2d5af',ground:'#b8ca86',width:17,points:[p(0,-170),p(130,-170),p(195,-65,7),p(130,15,21),p(190,100,34),p(75,170,40),p(-65,150,27),p(-145,65,13),p(-180,-70),p(-90,-165)],landmarks:['La bahía','El malecón','La subida','El Cristo']},
];
export const character = (id:string) => CHARACTERS.find(c=>c.id===id) ?? CHARACTERS[0];
export const vehicle = (id:string) => VEHICLES.find(v=>v.id===id) ?? VEHICLES[0];
export const track = (id:string) => TRACKS.find(t=>t.id===id) ?? TRACKS[0];
export const MODES = [{id:'race',name:'Carrera',note:'3 vueltas · todos contra todos'}, {id:'practice',name:'Práctica',note:'Aprende el circuito a tu ritmo'}, {id:'battle',name:'Batalla',note:'3 minutos · puntos por impactos'}, {id:'championship',name:'Campeonato',note:'3 pistas seguidas · una sola copa'}] as const;
