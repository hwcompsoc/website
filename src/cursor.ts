import {asset} from './components/shared';

export const cursor=(name:string,hotspot:string,fallback:string)=>`url("${asset(name)}") ${hotspot}, ${fallback}`;
// Arrow for the page, pointing hand for interactive elements, pressed hand while clicking, I-beam over text and a
// pressed I-beam while selecting; all swap colour together. Pressed variants share their cursor's canvas and hotspot,
// so only the detail changes. The I-beam's hotspot is its stem centre (53.5, 103.5 on the 108×207 canvas).
export const cursors={dark:{arrow:cursor('cursor-blue-small.svg','1 1','auto'),hand:cursor('pointer-blue-small.svg','10 1','pointer'),pressed:cursor('pointer-blue-active-small.svg','10 1','pointer'),text:cursor('text-cursor-blue-small.svg','8 16','text'),selecting:cursor('text-cursor-blue-active-small.svg','8 16','text')},light:{arrow:cursor('cursor-white-small.svg','1 1','auto'),hand:cursor('pointer-white-small.svg','10 1','pointer'),pressed:cursor('pointer-white-active-small.svg','10 1','pointer'),text:cursor('text-cursor-white-small.svg','8 16','text'),selecting:cursor('text-cursor-white-active-small.svg','8 16','text')}};
// Pick the cursors that contrast with the first solid background under the pointer.
export const backgroundIsDark=(element:Element|null)=>{for(let node=element;node;node=node.parentElement){const [r,g,b,a=1]=(getComputedStyle(node).backgroundColor.match(/[\d.]+/g)??[]).map(Number);if(a>=.5)return .2126*r+.7152*g+.0722*b<128}return false};
let cursorFrame=0,cursorShown='',cursorX=0,cursorY=0;
export const showCursor=(name:keyof typeof cursors)=>{if(name!==cursorShown){cursorShown=name;const root=document.documentElement.style;root.setProperty('--site-cursor',cursors[name].arrow);root.setProperty('--site-pointer',cursors[name].hand);root.setProperty('--site-pointer-active',cursors[name].pressed);root.setProperty('--site-text',cursors[name].text);root.setProperty('--site-text-active',cursors[name].selecting)}};
showCursor('dark');
export const updateCursor=()=>{cursorFrame||=requestAnimationFrame(()=>{cursorFrame=0;showCursor(backgroundIsDark(document.elementFromPoint(cursorX,cursorY))?'light':'dark')})};
addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;cursorX=event.clientX;cursorY=event.clientY;updateCursor()},{passive:true});
addEventListener('scroll',updateCursor,{passive:true});
