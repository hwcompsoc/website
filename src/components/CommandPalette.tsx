import {useEffect,useId,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {m} from 'motion/react';
import {ArrowRight,ArrowUpRight,Copy,Moon,Search,Sun} from 'lucide-react';
import {DialogOverlay,DialogPortal} from './ui/dialog';
import {Button} from './ui/button';
import {Highlight,useReturnFocus} from './shared';
import {Copied,useCopy} from './copy';
import {grouped,search,type Entry} from '../search';
import {links,pages,route,type Page} from '../content';
import {go,underPage} from '../router';
import {setThemeChoice} from '../theme';
import {spring} from '../motion';
import {useMotionLevel} from '../motion/level';
import {PixelBuild} from '../motion/PixelBuild';
import {Typed} from '../motion/Typed';

// One search box for the whole site, opened from the header's Search button or Ctrl+K (⌘K on a Mac). It's search with a few
// actions, not a command line: everything in it can be found and clicked without knowing it's there. It builds in from pixels like
// the calendar menu, the selection block slides between results as the arrow keys move, and matches are marked as on the Events page.
const OPEN='hwcs-palette';
export const openPalette=()=>window.dispatchEvent(new Event(OPEN));
export const isMac=()=>typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform);
export const shortcutLabel=()=>isMac()?'⌘K':'Ctrl K';
const typing=(target:EventTarget|null)=>target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

// The header's way in: words and both shortcuts (/ or Ctrl K) on wide screens, the icon alone where the header is tight.
export function SearchButton(){return <Button type="button" variant="outline" className="header-search" onClick={openPalette} aria-keyshortcuts="/ Control+K Meta+K"><Search aria-hidden="true" size={16}/><span className="header-search-label">Search</span><span className="header-search-keys" aria-hidden="true"><kbd className="header-search-key">/</kbd>or<kbd className="header-search-key">{shortcutLabel()}</kbd></span></Button>}

// A page with its own search box marks it with data-page-search, and / goes there first; anywhere else, / opens the palette.
function pageSearch(){return document.querySelector<HTMLInputElement>('[data-page-search]')}

export function CommandPalette(){const level=useMotionLevel();const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [active,setActive]=useState(0);useReturnFocus(open);
 const {copy,copied}=useCopy(1800);const list=useRef<HTMLDivElement>(null);const id=useId();
 const results=useMemo(()=>open?search(query):[],[open,query]);const groups=useMemo(()=>grouped(results),[results]);const flat=useMemo(()=>groups.flatMap(g=>g.entries),[groups]);
 useEffect(()=>setActive(0),[query]);
 useEffect(()=>{if(!open)setQuery('')},[open]);
 useEffect(()=>{const show=()=>setOpen(true);
  const keys=(event:globalThis.KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='k'){event.preventDefault();setOpen(was=>!was);return}
   if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!typing(event.target)&&!document.querySelector('[role=dialog]')){event.preventDefault();const box=pageSearch();if(box){box.focus();box.select()}else setOpen(true)}};
  window.addEventListener(OPEN,show);window.addEventListener('keydown',keys);return()=>{window.removeEventListener(OPEN,show);window.removeEventListener('keydown',keys)}},[]);
 useEffect(()=>{list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'})},[active]);

 function run(entry:Entry){
  if(entry.action==='copy-email'){copy(links.email);return}
  if(entry.action==='theme-dark'||entry.action==='theme-light'){setThemeChoice(entry.action==='theme-dark'?'dark':'light');setOpen(false);return}
  if(!entry.href)return;setOpen(false);
  if(entry.external){window.open(entry.href,'_blank','noopener,noreferrer');return}
  const url=new URL(entry.href,location.origin);
  // An event or guide opens as a dialog over the page you're on, as it does from a row or card there.
  const {item}=route(url.pathname);const here=underPage()??route(location.pathname).view;
  if(item){go(entry.href,{inApp:true,under:pages.some(p=>p.id===here)?here as Page:undefined});return}
  const samePage=url.pathname===location.pathname;go(entry.href);
  // Same page, different section: the page doesn't change, so nothing else scrolls to it.
  if(samePage&&url.hash)requestAnimationFrame(()=>document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({behavior:level==='full'?'smooth':'instant',block:'start'}));}

 function keys(event:KeyboardEvent<HTMLInputElement>){if(!flat.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const by=event.key==='ArrowDown'?1:-1;setActive(a=>(a+by+flat.length)%flat.length)}
  else if(event.key==='Enter'){event.preventDefault();const entry=flat[active];if(entry)run(entry)}}

 const option=(i:number)=>`${id}-option-${i}`;let index=0;
 return <DialogPrimitive.Root open={open} onOpenChange={setOpen}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className="palette" aria-describedby={`${id}-help`} onOpenAutoFocus={event=>{event.preventDefault();(event.currentTarget as HTMLElement).querySelector('input')?.focus()}}>
  <PixelBuild className="menu-build" cover="var(--surface)" cols={8} rows={6} duration={.25} trigger="mount">{null}</PixelBuild>
  <DialogPrimitive.Title className="sr-only">Search HW CompSoc</DialogPrimitive.Title>
  <p id={`${id}-help`} className="sr-only">Search pages, events, people and questions. Use the up and down arrows to choose a result and Enter to open it.</p>
  <div className="window-bar" aria-hidden="true"><span className="window-name"><Typed text="~/compsoc/search" caret={false} speed={.02} trigger="mount"/></span><span className="window-meta">esc to close</span></div>
  <div className="palette-prompt"><span className="palette-sign" aria-hidden="true">$</span><input role="combobox" aria-label="Search the site" aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={flat.length?option(active):undefined} autoComplete="off" spellCheck={false} placeholder="Search events, people, questions…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={keys}/></div>
  <div className="palette-results" ref={list} id={`${id}-list`} role="listbox" aria-label="Results">
   {groups.map(({group,entries})=><div key={group} role="group" aria-labelledby={`${id}-${group}`}><div className="palette-group" id={`${id}-${group}`} role="presentation">{group}</div>
    {entries.map(entry=>{const i=index++;const selected=i===active;const isCopy=entry.action==='copy-email';
     return <div key={entry.id} id={option(i)} data-index={i} role="option" aria-selected={selected} className="palette-option" onPointerMove={()=>{if(!selected)setActive(i)}} onClick={()=>run(entry)}>
      {selected&&<m.span layoutId="palette-select" className="palette-select" transition={level==='full'?spring.layout:{duration:0}}/>}
      <span className="palette-text"><b><Highlight text={entry.title} query={query}/></b><small><Highlight text={entry.detail} query={query}/></small></span>
      <span className="palette-hint" aria-hidden="true">{isCopy?copied?<Copied text="copied"/>:<Copy size={16}/>:entry.action==='theme-dark'?<Moon size={16}/>:entry.action==='theme-light'?<Sun size={16}/>:entry.external?<ArrowUpRight size={16}/>:<ArrowRight size={16}/>}</span>
     </div>})}
   </div>)}
   {!flat.length&&<p className="palette-empty"><Typed text={`No results for “${query.trim().slice(0,40)}”`} caret={false} speed={.015} trigger="mount" key={query}/></p>}
  </div>
  <div className="palette-status" aria-hidden="true"><span>↑ ↓ to move</span><span>enter to open</span><span>/ or {shortcutLabel()} to search</span></div>
  <p className="sr-only" role="status">{copied?'Email address copied.':open&&query.trim()?`${flat.length} ${flat.length===1?'result':'results'}`:''}</p>
 </DialogPrimitive.Content></DialogPortal></DialogPrimitive.Root>}
