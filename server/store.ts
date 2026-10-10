import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameState } from '../shared/types';
import { ranking } from '../shared/simulation';
const path=process.env.DB_PATH??'data/races.sqlite';mkdirSync(dirname(path),{recursive:true});
const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS races (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, mode TEXT NOT NULL, track TEXT NOT NULL, round INTEGER NOT NULL, results TEXT NOT NULL)');
export function saveResults(roomId:string,state:GameState){const results=ranking(state).map(p=>({nickname:p.nickname,characterId:p.characterId,vehicleId:p.vehicleId,bot:p.bot,time:p.finishTime,score:p.score,cupPoints:p.cupPoints}));db.prepare('INSERT OR IGNORE INTO races VALUES (?, ?, ?, ?, ?, ?)').run(roomId+'-'+state.round+'-'+state.tick,Date.now(),state.mode,state.trackId,state.round,JSON.stringify(results));db.prepare('DELETE FROM races WHERE created_at < ?').run(Date.now()-30*86400000);}
export function closeStore(){db.close();}
