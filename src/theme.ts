// Light and dark themes (MOTION-PLAN 11.7). A short script in the page's <head> applies the theme before first paint, so
// keep its storage key and rules in step with this file (index.html).
export type ThemeChoice='system'|'light'|'dark';
const KEY='hwcs-theme';
const listeners=new Set<()=>void>();
const systemQuery=()=>window.matchMedia('(prefers-color-scheme: dark)');

export const resolveTheme=(choice:ThemeChoice,systemDark:boolean):'light'|'dark'=>choice==='system'?(systemDark?'dark':'light'):choice;
export const parseChoice=(value:string|null):ThemeChoice=>value==='light'||value==='dark'?value:'system';

let choice:ThemeChoice='system';
function apply(){document.documentElement.dataset.theme=resolveTheme(choice,systemQuery().matches)}

export function setThemeChoice(next:ThemeChoice){
 choice=next;
 try{if(next==='system')localStorage.removeItem(KEY);else localStorage.setItem(KEY,next)}catch{/* Storage can be blocked; the choice still lasts for this page view. */}
 apply();listeners.forEach(listener=>listener());
}
export const getThemeChoice=()=>choice;
export const subscribeTheme=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};

if(typeof window!=='undefined'){
 try{choice=parseChoice(localStorage.getItem(KEY))}catch{/* Storage can be blocked. */}
 // Follow the device while the choice is System, including if it changes while the page is open.
 systemQuery().addEventListener('change',()=>{if(choice==='system')apply()});
}
