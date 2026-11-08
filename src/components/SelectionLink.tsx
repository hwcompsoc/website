import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,Link} from 'lucide-react';
import {Copied,useCopy} from './copy';
import {passageLink} from '../fragment';

// Select some text and a small "Copy link" button appears where the selection ends: the link opens this page scrolled to that
// passage, highlighted in the select colour. It's the Select verb doing something real. Only on screens with a mouse: phones have
// their own selection menu, and this mustn't cover it. Native copy still works as normal; this only adds a way to share.
const fine=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
// Where a passage can be linked: page content and the event or guide dialog, not form fields, the search palette or the header.
const AREA='main, .website-dialog';
const MIN=3,MAX=400;
// Inside a dialog the button goes into the dialog itself: a modal dialog makes the rest of the page unclickable, and a click
// outside it would close it. There it's placed against the dialog (which scrolls); elsewhere against the window.
type Place={x:number;y:number;text:string;host:HTMLElement};

function current():Place|null{const selection=getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
 const text=selection.toString();const trimmed=text.trim();if(trimmed.length<MIN||trimmed.length>MAX)return null;
 const inArea=(node:Node|null)=>{const element=node instanceof Element?node:node?.parentElement;return !!element?.closest(AREA)&&!element.closest('input,textarea,.palette,[contenteditable=true]')};
 if(!inArea(selection.anchorNode)||!inArea(selection.focusNode))return null;
 const rects=selection.getRangeAt(0).getClientRects();const last=rects[rects.length-1];if(!last)return null;
 const x=Math.min(last.right,innerWidth-150),y=Math.max(last.top-40,8);
 const element=selection.focusNode instanceof Element?selection.focusNode:selection.focusNode?.parentElement;const dialog=element?.closest<HTMLElement>('[role=dialog]');
 if(!dialog)return {x,y,text:trimmed,host:document.body};const box=dialog.getBoundingClientRect();
 return {x:Math.min(x-box.left+dialog.scrollLeft,dialog.clientWidth-150),y:y-box.top+dialog.scrollTop,text:trimmed,host:dialog}}

export function SelectionLink(){const [place,setPlace]=useState<Place|null>(null);const {copy,copied,failed}=useCopy(1400);const hold=useRef(false);
 useEffect(()=>{if(!fine())return;
  const check=()=>requestAnimationFrame(()=>{if(!hold.current)setPlace(current())});
  const keys=(event:KeyboardEvent)=>{if(event.key==='Escape'){setPlace(null);return}if(event.shiftKey||event.key==='Shift')check()};
  const changed=()=>{const selection=getSelection();if(!selection||selection.isCollapsed)setPlace(null)};
  const hide=()=>setPlace(null);
  document.addEventListener('mouseup',check);document.addEventListener('keyup',keys);document.addEventListener('selectionchange',changed);window.addEventListener('scroll',hide,{passive:true,capture:true});window.addEventListener('resize',hide);
  return()=>{document.removeEventListener('mouseup',check);document.removeEventListener('keyup',keys);document.removeEventListener('selectionchange',changed);window.removeEventListener('scroll',hide,{capture:true});window.removeEventListener('resize',hide)}},[]);
 // Once a copy is confirmed, the button goes away with the moment.
 useEffect(()=>{if((!copied||failed)&&hold.current){hold.current=false;if(!failed)setPlace(null)}},[copied,failed]);
 if(!place)return null;
 return createPortal(<div className="selection-link" data-in-dialog={place.host!==document.body||undefined} style={{left:place.x,top:place.y}}>
  <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>{hold.current=true;copy(passageLink(location.origin,location.pathname,place.text))}}>{copied?<><Check aria-hidden="true" size={14}/><Copied text="link copied"/></>:<><Link aria-hidden="true" size={14}/>{failed?'Copy isn’t available':'Copy link'}</>}</button>
  <span className="sr-only" role="status">{copied?'Link to the selected text copied.':''}</span>
 </div>,place.host)}
