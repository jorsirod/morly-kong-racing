// Probe: 12-bot races on the six worlds (npx tsx scripts/probes/bots.ts <0|1|2 difficulty>).
import { Simulation, makePlayer, ranking } from '../../shared/simulation';
import { TRACKS, CHARACTERS, VEHICLES } from '../../shared/content';
import { FIXED_DT } from '../../shared/types';
import { roadFrame } from '../../shared/simulation';
const level=Number(process.argv[2]??1);
for(const t of TRACKS){const sim=new Simulation('race',t.id);sim.difficulty=level;for(let i=0;i<12;i++)sim.addPlayer(makePlayer('bot-'+i,'B'+i,CHARACTERS[i%9].id,VEHICLES[i%6].id,i,true));sim.start();
 let lat:number[]=[];for(let i=0;i<20000&&sim.state.phase!=='results';i++){sim.tick(FIXED_DT);if(i%120===0&&sim.state.phase==='running')for(const p of sim.state.players)lat.push(roadFrame(sim.route,p).offset);}
 const r=ranking(sim.state),times=r.filter(p=>p.finishTime>=0).map(p=>p.finishTime);const hits=sim.state.players.map(p=>p.hitsGiven),taken=sim.state.players.map(p=>p.hitsTaken),bumps=sim.state.players.map(p=>p.bumps);
 const sd=Math.sqrt(lat.reduce((a,b)=>a+b*b,0)/lat.length);
 console.log(t.id.padEnd(10),'fin',times.length,'t',times[0]?.toFixed(0),'-',times.at(-1)?.toFixed(0),'hits/bot',(hits.reduce((a,b)=>a+b)/12).toFixed(1),'max taken',Math.max(...taken),'bumps/bot',(bumps.reduce((a,b)=>a+b)/12).toFixed(1),'lateralSD',sd.toFixed(2),'turbos',(sim.state.players.reduce((a,p)=>a+p.turbos,0)/12).toFixed(1),'winner',r[0].vehicleId);
}
