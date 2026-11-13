import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,Check,Copy,Eye,EyeOff} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '../components/ui/dialog';
import {setLeaveCheck} from '../router';
import {supabase} from '../supabase';
import {removeFiles} from './files';
import {Mascot} from '../components/Mascot';
import {COVER_BUCKET,coverThumb} from '../supabase-config';
import {badgeFor,checklist,editableFields,progress,sitePhase,type AdminEvent,type SitePhase,type SiteRow} from '../admin-rules';

// An empty list, with Byte. Byte's own line suits the list: nothing added yet, nothing in this view, a search with no matches, or nothing left to finish.
export function EmptyNote({kind='new',children}:{kind?:'new'|'none'|'search'|'done';children:ReactNode}){
 const line=kind==='search'?'Hmm. Nothing matched that.':kind==='done'?'All caught up. Nice.':kind==='none'?'Nothing here right now.':'Nothing here yet. Add the first one!';
 return <div className="admin-empty admin-empty-byte"><Mascot size="sm" tips="admin" mood={kind==='search'?'confused':'happy'} line={line}/><p>{children}</p></div>}
export const useTitle=(title:string)=>useEffect(()=>{document.title=`${title} | CompSoc admin`},[title]);

// Warns before unsaved work is lost: the browser's own warning for reloading or closing, and a question for links and Back inside the admin.
export function useLeaveWarning(dirty:boolean){useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();addEventListener('beforeunload',warn);setLeaveCheck(()=>confirm('You have unsaved changes. Leave without saving them?'));return()=>{removeEventListener('beforeunload',warn);setLeaveCheck(null)}},[dirty])}

// Database errors, in words an organiser can act on.
export const friendly=(error:{code?:string;message:string})=>/failed to fetch|networkerror|load failed/i.test(error.message)?'Couldn’t reach the server. Check your connection and try again.':error.code==='23505'?'Another event already uses that web address. Choose a different one.':error.code==='23514'?'Something’s missing or invalid. Check the times, the links and that a live event still has everything it needs.':/JWT|session/i.test(error.message)?'You’ve been signed out. Refresh the page and sign in again.':error.message;

// Server functions hold keys that can't be in the browser. Their refusals carry a message meant for the person using the page.
export async function callFunction<T>(name:string,body:Record<string,string>){const {data,error}=await supabase.functions.invoke(name,{body});if(error){let message='That didn’t work. Check your connection and try again.';try{message=(await (error as {context:Response}).context.json()).error??message}catch{/* Not a reply from the function: keep the general message. */}throw new Error(message)}return data as T}
export async function loadEvents(){const {data,error}=await supabase.from('events').select('*').order('starts_at',{ascending:false,nullsFirst:true});if(error)throw new Error(friendly(error));return data as AdminEvent[]}
export async function loadEvent(id:string){const {data,error}=await supabase.from('events').select('*').eq('id',id).maybeSingle();if(error)throw new Error(friendly(error));return data as AdminEvent|null}
export async function saveEvent(event:AdminEvent){const body=editableFields(event);const query=event.id?supabase.from('events').update(body).eq('id',event.id):supabase.from('events').insert(body);const {data,error}=await query.select().single();if(error)throw Object.assign(new Error(friendly(error)),{code:error.code});return data as AdminEvent}
// An image's address stays public until the file is gone, so nothing may be left behind. Small copies that don't exist are ignored.
export async function removeImages(paths:(string|null|undefined)[]){await removeFiles(COVER_BUCKET,paths.filter((path):path is string=>!!path).flatMap(path=>[path,coverThumb(path)]))}
export async function deleteEvent(event:AdminEvent){const {error}=await supabase.from('events').delete().eq('id',event.id!);if(error)throw new Error(friendly(error));await removeImages([event.cover_path,event.square_path])}

// Loads a list or a record once, with the loading and error states every page needs.
export function useLoad<T>(load:()=>Promise<T>,key:string){const [state,setState]=useState<{data?:T;error?:string;loading:boolean}>({loading:true});
 useEffect(()=>{let active=true;setState(old=>({...old,loading:true}));load().then(data=>{if(active)setState({data,loading:false})},(error:Error)=>{if(active)setState({error:error.message,loading:false})});return()=>{active=false}},[key]);
 return {...state,set:(data:T)=>setState({data,loading:false})}}

export function Status({event,rows,phase}:{event:AdminEvent;rows?:SiteRow[]|null;phase?:SitePhase}){const badge=badgeFor(event,phase??(rows===undefined?null:sitePhase(event,rows)));return <span className="admin-status" data-status={badge.state}>{badge.label}</span>}

// What the public site currently has. Checked every 3 seconds only while something is waiting to go live.
export function useSiteRows<T=SiteRow>(waiting:(rows:T[]|null)=>boolean,path='/live-events.json'){const [rows,setRows]=useState<T[]|null>(null);const check=useRef(waiting);check.current=waiting;const latest=useRef(rows);latest.current=rows;
 useEffect(()=>{let active=true;const load=async()=>{try{const response=await fetch(`${path}?t=${Date.now()}`,{cache:'no-store'});if(response.ok&&active)setRows(await response.json())}catch{/* Not readable yet: try again next time. */}};load();const timer=setInterval(()=>{if(check.current(latest.current))load()},3000);return()=>{active=false;clearInterval(timer)}},[]);
 return rows}
export function Progress({event}:{event:AdminEvent}){const {done,total}=progress(event);return <span className="admin-progress"><span className="admin-progress-track" aria-hidden="true">{checklist(event).map(step=><i key={step.id} data-done={step.done||undefined}/>)}</span><span>{done} of {total} done</span></span>}

export function Field({id,label,error,hint,children}:{id:string;label:string;error?:string;hint?:ReactNode;children:ReactNode}){return <div className="admin-field" data-invalid={error?true:undefined}><label htmlFor={id}>{label}</label>{children}{hint&&<small id={`${id}-hint`}>{hint}</small>}{error&&<p id={`${id}-error`} className="admin-field-error">{error}</p>}</div>}
export const fieldProps=(id:string,error?:string,hint=false)=>({id,'aria-invalid':error?true:undefined,'aria-describedby':[error?`${id}-error`:'',hint?`${id}-hint`:''].filter(Boolean).join(' ')||undefined});

export function PasswordInput({id,value,onChange,autoComplete,...rest}:{id:string;value:string;onChange:(value:string)=>void;autoComplete:string;'aria-invalid'?:boolean;'aria-describedby'?:string}){const [shown,setShown]=useState(false);return <div className="admin-password"><Input id={id} type={shown?'text':'password'} autoComplete={autoComplete} required value={value} onChange={e=>onChange(e.target.value)} {...rest}/><button type="button" aria-pressed={shown} aria-label="Show password" onClick={()=>setShown(s=>!s)}>{shown?<EyeOff size={16} aria-hidden="true"/>:<Eye size={16} aria-hidden="true"/>}</button></div>}

export function CopyButton({label,value,copiedLabel='Copied'}:{label:string;value:string;copiedLabel?:string}){const [copied,setCopied]=useState(false);const [failed,setFailed]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);setFailed(false);setTimeout(()=>setCopied(false),1800)}catch{setFailed(true)}}
 return <><Button type="button" variant="outline" size="sm" className="admin-copy" disabled={!value} onClick={copy} title={failed?'Copying isn’t available here. Select the text and copy it by hand.':undefined}>{copied?<Check aria-hidden="true"/>:<Copy aria-hidden="true"/>}{copied?copiedLabel:label}</Button><span role="status" className="sr-only">{copied?`${label}: copied.`:failed?'Copying isn’t available here.':''}</span></>}

export type Confirm={title:string;body:string;action:string;run:()=>void;danger?:boolean};
export function ConfirmDialog({confirm,onClose}:{confirm:Confirm|null;onClose:()=>void}){return <Dialog open={!!confirm} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="website-dialog admin-confirm">{confirm&&<><DialogHeader><DialogTitle>{confirm.title}</DialogTitle><DialogDescription>{confirm.body}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={onClose}>Keep as it is</Button><Button className={confirm.danger?'admin-danger':'site-button'} onClick={()=>{onClose();confirm.run()}}>{confirm.action}</Button></DialogFooter></>}</DialogContent></Dialog>}

export function Failure({children}:{children:ReactNode}){return children?<p role="alert" className="admin-error">{children}</p>:null}

export function MoveButtons({label,first,last,busy,onMove}:{label:string;first:boolean;last:boolean;busy:boolean;onMove:(by:-1|1)=>void}){return <span className="admin-move"><Button type="button" variant="ghost" size="icon" disabled={busy||first} aria-label={`Move ${label} up`} onClick={()=>onMove(-1)}><ArrowUp aria-hidden="true"/></Button><Button type="button" variant="ghost" size="icon" disabled={busy||last} aria-label={`Move ${label} down`} onClick={()=>onMove(1)}><ArrowDown aria-hidden="true"/></Button></span>}
