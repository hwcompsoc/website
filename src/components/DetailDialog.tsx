import {useLayoutEffect,useRef} from 'react';
import {CalendarDays,CalendarPlus,Clock,MapPin,Info,Ticket,Users} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {Alert,AlertTitle,AlertDescription} from './ui/alert';
import {links,type Event,type Resource} from '../content';
import {eventCalendarLinks} from '../calendar';
import {CalendarMenu} from './CalendarMenu';
import {LinkButton,useReturnFocus} from './shared';
import {GuideContent} from './GuideContent';
import {useMotionLevel} from '../motion/level';
import {PixelBuild} from '../motion/PixelBuild';

export type Modal={kind:'event';event:Event;origin?:DOMRect}|{kind:'resource';resource:Resource;origin?:DOMRect}|null;
// The clicked row's date block grows into the dialog's: a measured FLIP from the row, run as the
// dialog content mounts (Radix renders the portal a render later, so this lives inside it). A copy makes the trip above
// the dialog, because the dialog's scroll area and the body's pixel build would otherwise hide most of the journey.
function MorphDate({event:e,origin}:{event:Event;origin?:DOMRect}){const level=useMotionLevel();const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const el=ref.current;if(!el||!origin||level!=='full')return;const to=el.getBoundingClientRect();const ghost=el.cloneNode(true) as HTMLElement;ghost.classList.add('dialog-date-ghost');Object.assign(ghost.style,{left:`${to.left}px`,top:`${to.top}px`,width:`${to.width}px`,height:`${to.height}px`});document.body.append(ghost);el.style.opacity='0';
  // Uniform scale (the row's one-line date and the dialog's stacked block differ in shape), smooth in-out over the long trip.
  const run=ghost.animate([{transform:`translate(${origin.left-to.left}px,${origin.top-to.top}px) scale(${origin.height/to.height})`},{transform:'none'}],{duration:450,easing:'cubic-bezier(.65,0,.35,1)'});
  const land=()=>{ghost.remove();el.style.opacity=''};run.onfinish=land;return()=>{run.cancel();land()}},[]);
 return <div className="dialog-date" ref={ref} aria-hidden="true"><b>{e.day}</b><span>{e.month}</span></div>}

// The guide grows out of the resource card it was opened from. The dialog is centred with the CSS
// `translate` property, so the animation offsets from that base value rather than replacing it.
function OpenFrom({origin}:{origin?:DOMRect}){const level=useMotionLevel();const ref=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{const dialog=ref.current?.closest('[role=dialog]') as HTMLElement|null;if(!dialog||!origin||level!=='full')return;const to=dialog.getBoundingClientRect();const scale=Math.min(origin.width/to.width,origin.height/to.height);
  const base=getComputedStyle(dialog).translate;const [bx='0px',by='0px']=base==='none'?[]:base.split(' ');
  const dx=origin.left+origin.width/2-(to.left+to.width/2),dy=origin.top+origin.height/2-(to.top+to.height/2);
  const run=dialog.animate([{translate:`calc(${bx} + ${dx}px) calc(${by} + ${dy}px)`,scale:String(scale),opacity:.6},{translate:`${bx} ${by}`,scale:'1',opacity:1}],{duration:450,easing:'cubic-bezier(.65,0,.35,1)'});return()=>run.cancel()},[]);
 return <span ref={ref} hidden/>}

// Closing runs the opening trip in reverse: the dialog shrinks back into the row or card it came from, or fades if it had none.
// Radix keeps closing content mounted only while a CSS animation runs on it, so this is a keyframe (motion.css, dialog-close)
// whose end point is set here in custom properties, after Radix has marked the dialog closed and before the first frame.
// The last item stays rendered while it closes, since `modal` is already null by then.
function useCloseTrip(modal:Modal,dialog:React.RefObject<HTMLDivElement|null>){const last=useRef<Modal>(modal);const shown=modal??last.current;
 useLayoutEffect(()=>{const el=dialog.current;if(modal){last.current=modal;el?.removeAttribute('data-trip');return}const origin=last.current?.origin;if(!el||!origin)return;
  const to=el.getBoundingClientRect();if(!to.width||!to.height)return;const base=getComputedStyle(el).translate;const [bx='0px',by='0px']=base==='none'?[]:base.split(' ');
  const dx=origin.left+origin.width/2-(to.left+to.width/2),dy=origin.top+origin.height/2-(to.top+to.height/2),scale=Math.max(.04,Math.min(origin.width/to.width,origin.height/to.height));
  el.style.setProperty('--close-translate',`calc(${bx} + ${dx}px) calc(${by} + ${dy}px)`);el.style.setProperty('--close-scale',String(scale));el.setAttribute('data-trip','')},[modal]);
 return shown}

export function DetailDialog({modal:current,onClose}:{modal:Modal;onClose:()=>void}){const titleRef=useRef<HTMLHeadingElement>(null);const dialog=useRef<HTMLDivElement>(null);useReturnFocus(!!current);const modal=useCloseTrip(current,dialog);return <Dialog open={!!current} onOpenChange={v=>{if(!v)onClose()}}><DialogContent ref={dialog} className="website-dialog" onOpenAutoFocus={e=>{e.preventDefault();titleRef.current?.focus()}}>{modal?.kind==='resource'&&<OpenFrom origin={modal.origin}/>}<DialogHeader>{modal?.kind==='event'&&<MorphDate event={modal.event} origin={modal.origin}/>}<DialogTitle ref={titleRef} tabIndex={-1}>{modal?.kind==='event'?modal.event.title:modal?.resource.title}</DialogTitle><DialogDescription className={modal?.kind==='event'&&!modal.event.cancelled?'sr-only':undefined}>{modal?.kind==='event'?(modal.event.cancelled?'This event has been cancelled':'Event details'):modal&&`${modal.resource.type} · ${modal.resource.minutes} read`}</DialogDescription></DialogHeader>{modal?.kind==='event'?<PixelBuild className="dialog-build" cover="var(--surface)" cols={10} rows={8} trigger="mount"><div className="detail-category"><Badge variant="secondary">{modal.event.category}</Badge><Badge variant="secondary">{modal.event.level}</Badge></div><div className="detail-facts"><p><CalendarDays aria-hidden="true"/>{modal.event.date}</p><p><Clock aria-hidden="true"/>{modal.event.time}</p><p><MapPin aria-hidden="true"/>{modal.event.venue}</p>{modal.event.cost&&<p><Ticket aria-hidden="true"/>{modal.event.cost}</p>}{modal.event.openTo&&<p><Users aria-hidden="true"/>{modal.event.openTo}</p>}</div>{modal.event.cover&&<img className="detail-cover" src={modal.event.cover} alt={modal.event.coverAlt??''} width={1600} height={900}/>}<p>{modal.event.description}</p><>{modal.event.cancelled&&<Alert role="note"><Info aria-hidden="true"/><AlertTitle>This event has been cancelled.</AlertTitle><AlertDescription>Check Discord for any updates.</AlertDescription></Alert>}<div className="dialog-actions">{modal.event.luma&&!modal.event.cancelled&&!modal.event.past&&<LinkButton href={modal.event.luma}>Sign up on Luma</LinkButton>}{!modal.event.past&&!modal.event.cancelled&&<CalendarMenu label="Add to calendar" icon={<CalendarPlus size={16} aria-hidden="true"/>} links={eventCalendarLinks(modal.event,location.origin)}/>}<LinkButton href={links.discord} secondary>Chat on Discord</LinkButton></div></></PixelBuild>:modal?<GuideContent key={modal.resource.id} resource={modal.resource}/>:null}</DialogContent></Dialog>}
