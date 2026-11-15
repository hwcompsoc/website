import {useMemo,useRef,useState,type ChangeEvent} from 'react';
import {FolderOpen,ImagePlus} from 'lucide-react';
import {Button} from '../components/ui/button';
import {academicYear,eventFolder,fullDate,type AdminEvent} from '../admin-rules';
import {drive} from './Drive';
import {EmptyNote,Failure,loadEvents,useLoad,useTitle} from './ui';
import {PeopleSkeleton} from './skeletons';

// Starts an upload on the server, then sends the file straight to Google, so big photos never pass through the server.
export async function uploadToDrive(folder:string,file:File){const {url}=await drive<{url:string}>({action:'upload-url',folder,name:file.name,type:file.type||'application/octet-stream',size:file.size,origin:location.origin});
 const response=await fetch(url,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!response.ok)throw new Error(`Google Drive didn’t take ${file.name}. Try it again.`);return (await response.json().catch(()=>({}))) as {id?:string;webViewLink?:string}}

// Opens the folder, making it first if it isn't there yet.
export async function openFolder(folder:string){const {link}=await drive<{link:string}>({action:'folder',folder});window.open(link,'_blank','noopener');return link}

const PHOTO_MAX=25*1024*1024;
export function UploadPhotos({folder,label='Add photos'}:{folder:string;label?:string}){const input=useRef<HTMLInputElement>(null);const [progress,setProgress]=useState<{done:number;total:number}|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 async function chosen(e:ChangeEvent<HTMLInputElement>){const files=[...e.target.files??[]];e.target.value='';if(!files.length)return;setError('');setNotice('');
  const tooBig=files.filter(f=>f.size>PHOTO_MAX);const photos=files.filter(f=>f.size<=PHOTO_MAX&&f.type.startsWith('image/'));const failed:string[]=tooBig.map(f=>`${f.name} is over 25 MB`);
  setProgress({done:0,total:photos.length});for(const [i,file] of photos.entries()){try{await uploadToDrive(folder,file)}catch(failure){failed.push((failure as Error).message)}setProgress({done:i+1,total:photos.length})}
  setProgress(null);const sent=photos.length-failed.filter(f=>!f.includes('over 25 MB')).length;setNotice(sent?`${sent} ${sent===1?'photo':'photos'} added to the folder.`:'');setError(failed.join(' '))}
 return <><input ref={input} type="file" accept="image/*" multiple hidden onChange={chosen}/><Button type="button" variant="outline" disabled={!!progress} onClick={()=>input.current?.click()}><ImagePlus aria-hidden="true"/>{progress?`Uploading ${progress.done+1} of ${progress.total}…`:label}</Button><span role="status" className="admin-notice admin-inline-notice">{notice}</span><Failure>{error}</Failure></>}

function FolderButton({folder}:{folder:string}){const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <><Button type="button" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await openFolder(folder)}catch(failure){setError((failure as Error).message)}finally{setBusy(false)}}}><FolderOpen aria-hidden="true"/>{busy?'Opening…':'Open folder'}<span className="sr-only"> (opens Google Drive in a new tab)</span></Button><Failure>{error}</Failure></>}

// Every event's photos, newest first, grouped by academic year. The photos themselves stay in the society's Drive.
export function PhotoLibrary(){useTitle('Photos');const events=useLoad(loadEvents,'photo-events');
 const byYear=useMemo(()=>{const groups=new Map<string,AdminEvent[]>();for(const event of (events.data??[]).filter(e=>e.status!=='draft'&&e.starts_at&&new Date(e.starts_at).getTime()<=Date.now()+86400000).sort((a,b)=>b.starts_at!.localeCompare(a.starts_at!))){const year=academicYear(event.starts_at!);groups.set(year,[...groups.get(year)??[],event])}return [...groups.entries()]},[events.data]);
 return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Photos</h1></header>
  <p className="admin-quiet admin-people-intro">Photos from each event, kept in its folder in the society’s Google Drive. Anyone on the committee can add photos. Social Media Managers use them for recaps.</p><Failure>{events.error}</Failure>
  {events.loading&&!events.data?<PeopleSkeleton/>:byYear.length?byYear.map(([year,list])=><section key={year} className="admin-block" aria-labelledby={`year-${year}`}><h2 id={`year-${year}`} className="admin-task-group">{year}<span>{list.length}</span></h2>
   <ul className="admin-rows admin-people">{list.map(event=><li key={event.id} className="admin-person admin-photo-row"><span className="admin-row-main"><b>{event.title}</b><small>{fullDate(event.starts_at!)}{event.status==='cancelled'?' · Cancelled':''}</small></span><span className="admin-photo-actions"><UploadPhotos folder={`${eventFolder(event)}/Photos`}/><FolderButton folder={`${eventFolder(event)}/Photos`}/></span></li>)}</ul></section>):events.data&&<EmptyNote>No events have happened yet. Their photos will show here.</EmptyNote>}</section>}
