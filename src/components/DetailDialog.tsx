import {useLayoutEffect,useRef} from 'react';
import {ArrowUpRight,CalendarDays,CalendarPlus,Clock,MapPin,Info} from 'lucide-react';
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

export type Modal={kind:'event';event:Event;origin?:DOMRect}|{kind:'resource';resource:Resource;origin?:DOMRect}|{kind:'document';title:string}|null;
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

export function DetailDialog({modal,onClose}:{modal:Modal;onClose:()=>void}){const titleRef=useRef<HTMLHeadingElement>(null);useReturnFocus(!!modal);return <Dialog open={!!modal} onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="website-dialog" onOpenAutoFocus={e=>{e.preventDefault();titleRef.current?.focus()}}>{modal?.kind==='resource'&&<OpenFrom origin={modal.origin}/>}<DialogHeader>{modal?.kind==='event'&&<MorphDate event={modal.event} origin={modal.origin}/>}<DialogTitle ref={titleRef} tabIndex={-1}>{modal?.kind==='event'?modal.event.title:modal?.kind==='resource'?modal.resource.title:modal?.title}</DialogTitle><DialogDescription>{modal?.kind==='event'?(modal.event.cancelled?'This event has been cancelled':'Event details'):modal?.kind==='resource'?`${modal.resource.type} · ${modal.resource.minutes} read`:'Governance preview · approved document pending'}</DialogDescription></DialogHeader>{modal?.kind==='event'?<PixelBuild className="dialog-build" cover="var(--surface)" cols={10} rows={8} trigger="mount">{modal.event.cover&&<img className="detail-cover" src={modal.event.cover} alt={modal.event.coverAlt??''} width={1600} height={900}/>}<div className="detail-category"><Badge variant="secondary">{modal.event.category}</Badge><Badge variant="secondary">{modal.event.level}</Badge></div><div className="detail-facts"><p><CalendarDays aria-hidden="true"/>{modal.event.date}</p><p><Clock aria-hidden="true"/>{modal.event.time}</p><p><MapPin aria-hidden="true"/>{modal.event.venue}</p></div><p>{modal.event.description}</p><>{modal.event.cancelled&&<Alert role="note"><Info aria-hidden="true"/><AlertTitle>This event has been cancelled.</AlertTitle><AlertDescription>Check Discord for any updates.</AlertDescription></Alert>}<div className="dialog-actions">{modal.event.luma&&!modal.event.cancelled&&!modal.event.past&&<LinkButton href={modal.event.luma}>Sign up on Luma</LinkButton>}{!modal.event.past&&!modal.event.cancelled&&<CalendarMenu label="Add to calendar" icon={<CalendarPlus size={16} aria-hidden="true"/>} links={eventCalendarLinks(modal.event,location.origin)}/>}<LinkButton href={links.discord} secondary>Chat on Discord</LinkButton></div></></PixelBuild>:modal?.kind==='resource'?<GuideContent key={modal.resource.id} resource={modal.resource}/>:modal?<><p>This section would show the authoritative {modal.title.toLowerCase()}, its status, date and owner, with a clear link to the approved public document.</p><Alert role="note"><Info aria-hidden="true"/><AlertTitle>Publication is pending.</AlertTitle><AlertDescription>This prototype contains no approved document to download.</AlertDescription></Alert><a href={`mailto:${links.email}?subject=${encodeURIComponent(modal.title+' enquiry')}`} className="text-link">Ask the society<ArrowUpRight size={17}/></a></>:null}</DialogContent></Dialog>}
