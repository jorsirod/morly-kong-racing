import { afterEach,describe,expect,it } from 'vitest';
import { fullscreenSupported,isFullscreen } from '../src/game/fullscreen';

const g=globalThis as unknown as {document?:unknown};
const original=g.document;
afterEach(()=>{if(original===undefined)delete g.document;else g.document=original;});

describe('pantalla completa',()=>{
 it('sin navegador no hay pantalla completa',()=>{
  delete g.document;
  expect(fullscreenSupported()).toBe(false);
 });
 it('Android y computadora: la API existe y está habilitada',()=>{
  g.document={fullscreenEnabled:true,documentElement:{requestFullscreen(){}}};
  expect(fullscreenSupported()).toBe(true);
  expect(isFullscreen()).toBe(false);
  g.document={fullscreenEnabled:true,fullscreenElement:{},documentElement:{requestFullscreen(){}}};
  expect(isFullscreen()).toBe(true);
 });
 it('iPhone: Safari no la ofrece, así que el botón debe mandar a instalar el juego',()=>{
  g.document={fullscreenEnabled:false,webkitFullscreenEnabled:false,documentElement:{}};
  expect(fullscreenSupported()).toBe(false);
 });
 it('navegadores con prefijo webkit también cuentan',()=>{
  g.document={webkitFullscreenEnabled:true,documentElement:{webkitRequestFullscreen(){}}};
  expect(fullscreenSupported()).toBe(true);
 });
});
