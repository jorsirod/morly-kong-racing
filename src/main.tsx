import { createRoot } from 'react-dom/client';
import App from './App';
import { startGamepadNav } from './components/gamepadNav';
import { armSpeechUnlock } from './game/speech';
import './styles.css';
import './arcade.css';
import './overhaul.css';
import './hud.css';
import './menus.css';
createRoot(document.getElementById('root')!).render(<App/>);
startGamepadNav();
armSpeechUnlock();
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(reg=>{
 // A new version installs in the background and waits; the menu offers it (never mid-race).
 const announce=()=>{if(reg.waiting&&navigator.serviceWorker.controller)window.dispatchEvent(new CustomEvent('morly-update'));};
 announce();reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')announce();});});
 setInterval(()=>{if(!document.hidden)reg.update().catch(()=>{});},30*60*1000);
}).catch(()=>{}));
