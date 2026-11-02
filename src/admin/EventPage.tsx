import {useEffect,useLayoutEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {AnimatePresence,m} from 'motion/react';
import {ArrowLeft,ArrowUpRight,Check,ChevronDown,Ellipsis,Pencil} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Checkbox} from '../components/ui/checkbox';
import {Popover,PopoverContent,PopoverTrigger} from '../components/ui/popover';
import {go} from '../router';
import {dur,ease} from '../motion';
import {useMotionLevel} from '../motion/level';
import {useClickBurst} from '../motion/ClickBurst';
import {Typed} from '../motion/Typed';
import {LUMA_CREATE,NATIVE_CREATE,checklist,detailsMissing,eventDetailsText,fullDate,isLink,progress,siteBusy,sitePhase,siteSlow,timeRange,type AdminEvent,type SitePhase,type StepId} from '../admin-rules';
import {EventSkeleton} from './skeletons';
import {ConfirmDialog,CopyButton,Failure,Field,Progress,Status,deleteEvent,fieldProps,loadEvent,saveEvent,useLoad,useSiteRows,useTitle,type Confirm} from './ui';

const External=({href,children}:{href:string;children:ReactNode})=><Button asChild variant="outline"><a href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></Button>;

// The details an organiser would otherwise retype into Native and Luma.
function CopyFields({event}:{event:AdminEvent}){return <div className="admin-copies"><CopyButton label="Copy title" value={event.title}/>{event.starts_at&&<CopyButton label="Copy date" value={fullDate(event.starts_at)}/>}{event.starts_at&&<CopyButton label="Copy time" value={timeRange(event.starts_at,event.ends_at)}/>}<CopyButton label="Copy venue" value={event.venue}/><CopyButton label="Copy description" value={event.description}/></div>}

function LinkForm({id,label,value,live,onSave}:{id:string;label:string;value:string|null;live:boolean;onSave:(value:string|null)=>Promise<void>}){const [text,setText]=useState(value??'');const [error,setError]=useState('');const [busy,setBusy]=useState(false);useEffect(()=>setText(value??''),[value]);
 async function submit(e:FormEvent){e.preventDefault();const trimmed=text.trim();if(trimmed&&!isLink(trimmed)){setError('Paste the full link, starting with https://');return}if(!trimmed&&live){setError('A live event needs this link.');return}setError('');setBusy(true);await onSave(trimmed||null);setBusy(false)}
 return <form className="admin-link-form" onSubmit={submit} noValidate><Field id={id} label={label} error={error}><Input {...fieldProps(id,error)} type="url" inputMode="url" placeholder="https://" value={text} onChange={e=>setText(e.target.value)}/></Field><Button type="submit" className="site-button" disabled={busy||text.trim()===(value??'')}>{busy?'Saving…':'Save link'}</Button></form>}

function Step({number,title,done,open,onToggle,children}:{number:number;title:string;done:boolean;open:boolean;onToggle:()=>void;children:ReactNode}){const body=`step-${number}-body`;return <li className="admin-step" data-done={done||undefined} data-open={open||undefined}><h3><button type="button" aria-expanded={open} aria-controls={body} onClick={onToggle}><span className="admin-step-mark" aria-hidden="true">{done?<Check size={15}/>:number}</span><span>{title}<span className="sr-only">{done?' (done)':' (to do)'}</span></span><ChevronDown size={18} aria-hidden="true"/></button></h3>{open&&<div id={body} className="admin-step-body">{children}</div>}</li>}

const busyText={publishing:{title:'Publishing to the site',done:'Live on the site'},updating:{title:'Updating the site',done:'Change is live'},removing:{title:'Taking it off the site',done:'Off the site'}};
const FINISH={rebuilt:600,done:1600,settle:450};
type Stage='rebuilt'|'done'|'settling';type BusyPhase=keyof typeof busyText;
// Plays the finish when the site really catches up while someone is watching: rebuilt, then live with a burst, then the steps fold away.
// Arriving at a page that's already live plays nothing, and with motion reduced the final state simply appears.
function useFinish(phase:SitePhase){const animate=useMotionLevel()==='full';const previous=useRef(phase);const [finish,setFinish]=useState<{from:BusyPhase;stage:Stage}|null>(null);
 // Before paint, so the final state never flashes up ahead of the finish.
 useLayoutEffect(()=>{const was=previous.current;previous.current=phase;if(siteBusy(phase)){setFinish(null);return}if(!siteBusy(was)||phase==='unknown'||!animate)return;const from=was as BusyPhase;setFinish({from,stage:'rebuilt'});const timers=[setTimeout(()=>setFinish({from,stage:'done'}),FINISH.rebuilt),setTimeout(()=>setFinish({from,stage:'settling'}),FINISH.rebuilt+FINISH.done),setTimeout(()=>setFinish(null),FINISH.rebuilt+FINISH.done+FINISH.settle)];return()=>timers.forEach(clearTimeout)},[phase,animate]);
 // The site has just caught up, but the effect above hasn't run yet: this render is already the start of the finish.
 const was=previous.current;if(!finish&&animate&&siteBusy(was)&&!siteBusy(phase)&&phase!=='unknown')return {from:was as BusyPhase,stage:'rebuilt' as Stage};
 return finish}

// Follows the change all the way out: it only says "live" once the public site really has it.
function SitePanel({event,phase,finish}:{event:AdminEvent;phase:SitePhase;finish:ReturnType<typeof useFinish>}){const publicUrl=`/events/${event.slug}`;const level=useMotionLevel();const fire=useClickBurst();const lastMark=useRef<HTMLSpanElement>(null);const stage=finish?.stage;const fold=level==='full'?{duration:dur.ui,ease:ease.enter}:{duration:0};
 useEffect(()=>{if(stage!=='done')return;const box=lastMark.current?.getBoundingClientRect();if(box)fire(box.left+box.width/2,box.top+box.height/2,{count:6})},[stage]);
 const shown=finish?finish.from:phase;const busy=siteBusy(shown);const text=busy?busyText[shown as BusyPhase]:null;const slow=busy&&!finish&&siteSlow(event);const finished=stage==='done'||stage==='settling';const showSteps=busy&&stage!=='settling';
 const finalTitle=shown==='removing'?'Off the site':event.status==='cancelled'?'This event is cancelled':text&&shown==='updating'?'Live on the site':'Live on the site';
 const title=phase==='unknown'&&!finish?'Saved':finished?finalTitle:slow?'This is taking longer than usual':text?text.title:event.status==='cancelled'?'This event is cancelled':'Live on the site';
 const live=!busy&&phase!=='unknown'||finished;const mark=live&&shown!=='removing'&&event.status!=='cancelled';
 return <section className="admin-card admin-site" data-phase={live?'live':busy?'busy':undefined} aria-labelledby="site-title"><h2 id="site-title" role="status">{mark&&<span className="admin-step-mark" data-tick={finish?'':undefined} aria-hidden="true"><Check size={15}/></span>}{finished?<Typed key={title} text={title} caret={false} speed={.02} trigger="mount"/>:title}</h2>
  <AnimatePresence initial={false}>
   {showSteps&&<m.div key="steps" className="admin-site-fold" exit={{height:0,opacity:0}} transition={fold}><ol className="admin-site-steps"><li data-done=""><span className="admin-step-mark" aria-hidden="true"><Check size={15}/></span>Saved</li><li data-done={stage?'':undefined} data-now={stage?undefined:''}><span className="admin-step-mark" data-tick={stage?'':undefined} aria-hidden="true">{stage&&<Check size={15}/>}</span><span>{stage?'Site rebuilt':'Rebuilding the site'}{!stage&&!slow&&<span className="admin-boot-pixels admin-site-pixels" aria-hidden="true"><i/><i/><i/><i/><i/></span>}</span></li><li data-done={finished?'':undefined} data-now={stage==='rebuilt'?'':undefined}><span className="admin-step-mark" ref={lastMark} data-tick={finished?'':undefined} aria-hidden="true">{finished&&<Check size={15}/>}</span>{text!.done}</li></ol><p>{slow?'Your change is saved, but the site hasn’t picked it up. Check the latest deployment in Vercel, or try saving the event again.':stage?' ':'This usually takes a few minutes. It’ll carry on if you leave this page.'}</p></m.div>}
   {!showSteps&&phase==='unknown'&&<m.div key="unknown" className="admin-site-fold"><p>We can’t check the public site right now. Changes usually appear within a few minutes.</p></m.div>}
   {!showSteps&&phase!=='unknown'&&!(busy&&!stage)&&shown!=='removing'&&<m.div key="final" className="admin-site-fold" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} transition={fold}><p>{event.status==='cancelled'?'The site shows it as cancelled. Check Native and Luma show the same.':'If you change the date, time or venue, update Native and Luma too, and tell Amanda and Kevin.'}</p><External href={publicUrl}>View on the site</External></m.div>}
  </AnimatePresence></section>}

export function EventPage({id}:{id:string}){const {data,error:loadError,loading,set}=useLoad(()=>loadEvent(id),id);const rows=useSiteRows(site=>!!data&&(!site||siteBusy(sitePhase(data,site))));const finish=useFinish(data?sitePhase(data,rows):'hidden');const [open,setOpen]=useState<StepId|null|undefined>(undefined);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [confirm,setConfirm]=useState<Confirm|null>(null);const [menu,setMenu]=useState(false);
 useTitle(data?.title??'Event');const firstOpen=(event:AdminEvent)=>checklist(event).find(step=>!step.done)?.id??null;
 useEffect(()=>{if(data&&open===undefined)setOpen(data.status==='draft'?firstOpen(data):null)},[data]);
 if(loading&&!data)return <EventSkeleton/>;if(!data)return <section className="admin-page"><h1>Event not found</h1><Failure>{loadError}</Failure><p>It may have been deleted.</p><a className="text-link" href="/admin/events">Back to events</a></section>;
 const event=data;const phase=sitePhase(event,rows);const isDraft=event.status==='draft';const steps=checklist(event);const {done,total}=progress(event);const ready=done===total;const missing=detailsMissing(event);const number=(step:StepId)=>steps.findIndex(s=>s.id===step)+1;const stepDone=(step:StepId)=>steps.find(s=>s.id===step)?.done??false;
 async function patch(change:Partial<AdminEvent>,message='Saved.'){setBusy(true);setError('');setNotice('');try{const saved=await saveEvent({...event,...change});set(saved);setNotice(message);if(saved.status==='draft')setOpen(firstOpen(saved));else if(change.status)setOpen(null)}catch(failure){setError((failure as Error).message)}setBusy(false)}
 const toggle=(step:StepId)=>setOpen(old=>old===step?null:step);const publicUrl=`/events/${event.slug}`;
 const ask=(c:Confirm)=>{setMenu(false);setConfirm(c)};
 const checklistView=<ol className="admin-checklist">
  <Step number={number('details')} title="Event details" done={stepDone('details')} open={open==='details'} onToggle={()=>toggle('details')}>{missing.length?<><p>Still needed:</p><ul>{missing.map(item=><li key={item}>{item}</li>)}</ul></>:<p>Everything’s filled in.</p>}<Button asChild variant="outline"><a href={`/admin/events/${event.id}/edit`}><Pencil aria-hidden="true"/>Edit details</a></Button></Step>
  <Step number={number('native')} title="Create it on Native" done={stepDone('native')} open={open==='native'} onToggle={()=>toggle('native')}><p>Create the event on Native using these details, then paste its link here.</p><External href={NATIVE_CREATE}>Open Native</External><CopyFields event={event}/><LinkForm id="native-link" label="Native link" value={event.native_url} live={!isDraft} onSave={value=>patch({native_url:value},'Native link saved.')}/></Step>
  {event.signup_required&&<Step number={number('luma')} title="Create it on Luma" done={stepDone('luma')} open={open==='luma'} onToggle={()=>toggle('luma')}><p>Create the sign-up on Luma, then paste its link here. Visitors will see this link on the site.</p><External href={LUMA_CREATE}>Open Luma</External><CopyFields event={event}/><LinkForm id="luma-link" label="Luma link" value={event.luma_url} live={!isDraft} onSave={value=>patch({luma_url:value},'Luma link saved.')}/></Step>}
  <Step number={number('socials')} title="Tell Amanda and Kevin" done={stepDone('socials')} open={open==='socials'} onToggle={()=>toggle('socials')}><p>They post it on Instagram and Discord. Copy this and send it to them:</p><pre className="admin-message" tabIndex={0}>{eventDetailsText(event)}</pre><CopyButton label="Copy message" value={eventDetailsText(event)}/><label className="admin-check"><Checkbox checked={event.socials_sent} disabled={busy||!isDraft} onCheckedChange={v=>patch({socials_sent:v===true},v===true?'Marked as sent.':'Marked as not sent.')}/>I’ve sent them the details</label></Step>
 </ol>;
 return <section className="admin-page"><a className="admin-crumb" href="/admin/events"><ArrowLeft size={16} aria-hidden="true"/>Events</a>
  <header className="admin-head admin-event-head"><div><h1>{event.title}</h1><Status event={event} phase={finish&&finish.stage==='rebuilt'?finish.from:phase}/></div><Popover open={menu} onOpenChange={setMenu}><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="More actions"><Ellipsis aria-hidden="true"/></Button></PopoverTrigger><PopoverContent align="end" className="website-popover admin-menu">
   {event.status==='published'&&<button type="button" onClick={()=>ask({title:'Cancel this event?',body:'It stays on the site, labelled as cancelled. Update Native and Luma too, and tell Amanda and Kevin.',action:'Cancel event',danger:true,run:()=>patch({status:'cancelled'},'')})}>Cancel event</button>}
   {!isDraft&&<button type="button" onClick={()=>ask({title:'Take this event off the site?',body:'It goes back to being a draft that only the committee can see.',action:'Back to draft',run:()=>patch({status:'draft'},'')})}>Back to draft</button>}
   {isDraft&&<button type="button" className="admin-menu-danger" onClick={()=>ask({title:'Delete this draft?',body:`“${event.title}” will be gone for good.`,action:'Delete draft',danger:true,run:async()=>{setBusy(true);try{await deleteEvent(event.id!);go('/admin/events',{replace:true})}catch(failure){setError((failure as Error).message);setBusy(false)}}})}>Delete draft</button>}
  </PopoverContent></Popover></header>
  <Failure>{error}</Failure><p role="status" className="admin-notice">{notice}</p>
  <div className="admin-event-grid"><div>
   <AnimatePresence initial={false}>{(phase==='removing'||finish?.from==='removing')&&<m.div key="removal" className="admin-site-fold" exit={{height:0,opacity:0}} transition={{duration:dur.ui,ease:ease.enter}}><SitePanel event={event} phase={phase} finish={finish}/></m.div>}</AnimatePresence>{isDraft?<section className="admin-card" aria-labelledby="live-title"><div className="admin-block-head"><h2 id="live-title">Get it live</h2><Progress event={event}/></div>{checklistView}<div className="admin-publish"><Button className="site-button" disabled={!ready||busy} onClick={()=>ask({title:'Publish this event?',body:'The site will rebuild with it, which usually takes a few minutes. You’ll see when it’s live.',action:'Publish event',run:()=>patch({status:'published'},'')})}>Publish event</Button>{!ready&&<small>Unlocks when all {total} steps are done.</small>}</div></section>
   :<><SitePanel event={event} phase={phase} finish={finish}/>
    <details className="admin-card admin-history"><summary>Checklist and links</summary>{checklistView}</details></>}
  </div>
  <aside className="admin-card admin-details" aria-labelledby="details-title"><div className="admin-block-head"><h2 id="details-title">Details</h2><a className="text-link" href={`/admin/events/${event.id}/edit`}>Edit</a></div><dl><dt>When</dt><dd>{event.starts_at?<>{fullDate(event.starts_at)}<br/>{timeRange(event.starts_at,event.ends_at)}</>:'Not set'}</dd><dt>Where</dt><dd>{event.venue||'Not set'}</dd><dt>Type</dt><dd>{event.category}</dd><dt>Who it’s for</dt><dd>{event.level}</dd><dt>Sign-up</dt><dd>{event.signup_required?'Needed, on Luma':'Not needed'}</dd><dt>Web address</dt><dd className="admin-code">{publicUrl}</dd><dt>Description</dt><dd>{event.description||'Not set'}</dd></dl></aside></div>
  <ConfirmDialog confirm={confirm} onClose={()=>setConfirm(null)}/></section>}
