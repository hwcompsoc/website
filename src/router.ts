import {canonicalPath,legacyPath,type Page} from './content';

// Client-side navigation on real paths. Same-site links stay ordinary <a href>s; a single click listener turns them into
// history entries, so a new tab, a modified click and a link with no JavaScript all behave as usual.
// Scroll is restored by hand, because the browser's own restoration would run before the page window has swapped the page.
type Entry={key?:string;under?:Page;inApp?:boolean};
const CHANGE='hwcs-route';
const STORAGE='hwcs-scroll';
const entry=()=>(history.state??{}) as Entry;
const newKey=()=>Math.random().toString(36).slice(2,10);

// The link a page change was clicked from, so the new page's window can open out of it. Read once: Back, Forward and code have none.
let clickedFrom:DOMRect|undefined;
let scrolls:Record<string,number>={};
let currentKey='';
const loadScrolls=()=>{try{scrolls=JSON.parse(sessionStorage.getItem(STORAGE)??'{}')}catch{scrolls={}}};
const persistScrolls=()=>{try{sessionStorage.setItem(STORAGE,JSON.stringify(scrolls))}catch{/* Storage can be blocked; scroll still restores within this page view. */}};
const saveScroll=()=>{if(currentKey)scrolls[currentKey]=window.scrollY};
const notify=()=>window.dispatchEvent(new Event(CHANGE));

// `?motion=` is a preference that lasts for the whole visit, so it follows every navigation.
function withMotion(href:string){const motion=new URLSearchParams(location.search).get('motion');if(!motion)return href;const url=new URL(href,location.origin);url.searchParams.set('motion',motion);return url.pathname+url.search+url.hash}

export function go(href:string,{replace=false,under,inApp}:{replace?:boolean;under?:Page;inApp?:boolean}={}){const target=withMotion(href);if(target===location.pathname+location.search+location.hash){clickedFrom=undefined;return}
 const next:Entry={key:replace?currentKey:newKey(),under,inApp};if(!replace)saveScroll();history[replace?'replaceState':'pushState'](next,'',target);currentKey=next.key!;notify()}

// What the page underneath should be: a dialog opened from Home keeps Home behind it, though the address is the event's own.
export const underPage=()=>entry().under;
export const openedInApp=()=>!!entry().inApp;
export const savedScroll=()=>scrolls[currentKey]??0;
export const takeClickedFrom=()=>{const from=clickedFrom;clickedFrom=undefined;return from};
export function onRouteChange(listener:()=>void){window.addEventListener(CHANGE,listener);return()=>window.removeEventListener(CHANGE,listener)}

// A form with unsaved work can ask before the address changes under it.
let leaveCheck:(()=>boolean)|null=null;
export const setLeaveCheck=(check:(()=>boolean)|null)=>{leaveCheck=check};

function clicked(event:MouseEvent){if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;if(!link||link.target||link.hasAttribute('download'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||(url.hash&&url.pathname===location.pathname))return;
 event.preventDefault();if(leaveCheck&&!leaveCheck())return;clickedFrom=link.getBoundingClientRect();go(url.pathname+url.search+url.hash)}

// Run once before the first render: old #page links become real paths, and each history entry gets a key to file its scroll under.
export function startRouter(){history.scrollRestoration='manual';loadScrolls();
 const legacy=legacyPath(location.hash);const state=entry();currentKey=state.key??newKey();
 const canonical=canonicalPath(location.pathname);
 history.replaceState({...state,key:currentKey},'',withMotion(legacy??canonical+location.search)+(legacy?'':location.hash));
 document.addEventListener('click',clicked);
 // Pasting an old link while already on that document changes only the hash, with no reload.
 window.addEventListener('hashchange',()=>{const path=legacyPath(location.hash);if(path)go(path,{replace:true})});
 // Back and Forward have already moved by the time we hear of it, so staying put means going back to where we were.
 let here=location.pathname+location.search;let hereState=history.state;window.addEventListener(CHANGE,()=>{here=location.pathname+location.search;hereState=history.state});
 window.addEventListener('popstate',()=>{clickedFrom=undefined;if(leaveCheck&&here!==location.pathname+location.search&&!leaveCheck()){history.pushState(hereState,'',here);return}saveScroll();currentKey=entry().key??newKey();notify()});
 window.addEventListener('pagehide',()=>{saveScroll();persistScrolls()})}
