import {Simulation,makePlayer} from '../shared/simulation';
import {TRACKS,VEHICLES} from '../shared/content';
import {writeFileSync} from 'node:fs';
const rows=[];for(const track of TRACKS)for(const vehicle of VEHICLES){const sim=new Simulation('race',track.id),p=sim.addPlayer(makePlayer('bot','Bot','semilla',vehicle.id,0,true));sim.start();for(let tick=0;tick<19000&&sim.state.phase!=='results';tick++)sim.tick();rows.push({track:track.name,vehicle:vehicle.name,time:+p.finishTime.toFixed(2),laps:p.lap});}writeFileSync('outputs/tiempos-simulados.json',JSON.stringify(rows,null,2));console.log('36 combinaciones de pista y carro simuladas. Ver outputs/tiempos-simulados.json.');
