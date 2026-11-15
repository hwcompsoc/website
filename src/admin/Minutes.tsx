import {useEffect,useRef,useState,useSyncExternalStore,type ChangeEvent,type FormEvent} from 'react';
import {go,onRouteChange} from '../router';
import {ActionsReview,Agenda,NextMeetingDate,recordMeeting,type Meeting} from './Meetings';
import {Check,Download,ExternalLink,FileUp,HardDrive,LoaderCircle,Sparkles,X} from 'lucide-react';
import {Skeleton} from '../components/ui/skeleton';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {carriedForward,TRANSCRIPT_MAX,cleanTranscript,expectedMinutesSeconds,minutesStage,minutesDocName,minutesHtml,minutesProblems,todayInUk,type Problems} from '../admin-rules';
import {drive} from './Drive';
import {callFunction,ConfirmDialog,CopyButton,Failure,Field,fieldProps,useLeaveWarning,useTitle,type Confirm} from './ui';

// The AI replies all at once, so the steps are paced by how long a transcript this size usually takes, not reported by the server.
function Writing({started,expected,onCancel}:{started:number;expected:number;onCancel:()=>void}){const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 const seconds=Math.max(0,Math.floor((now-started)/1000));const stage=minutesStage(seconds,expected);const clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 const steps=['Sending the transcript','Reading the meeting','Writing the minutes'];
 return <div className="admin-writing" role="status" aria-live="polite"><div className="admin-writing-head"><b>Writing the minutes</b><span className="admin-writing-clock" aria-label={`${seconds} seconds so far`}>{clock}</span></div>
  <ol className="admin-writing-steps">{steps.map((label,i)=><li key={label} data-state={i<stage?'done':i===stage?'now':'next'}>{i<stage?<Check size={16} aria-hidden="true"/>:i===stage?<LoaderCircle size={16} aria-hidden="true" className="admin-spin"/>:<span className="admin-writing-dot" aria-hidden="true"/>}{label}</li>)}</ol>
  <p className="admin-quiet">{seconds>expected?'Taking longer than usual. A long meeting can take up to two minutes.':`Usually about ${expected<60?`${Math.ceil(expected/10)*10} seconds`:'a minute'} for a meeting this long.`}</p>
  <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X aria-hidden="true"/>Cancel</Button></div>}

// The shape of the minutes, while they're written.
const MinutesSkeleton=()=><div className="admin-form-block admin-minutes-sk" aria-hidden="true"><Skeleton className="admin-sk-h1"/>{[60,45,50].map(w=><Skeleton key={w} className="admin-sk-line" style={{width:`${w}%`}}/>)}{[1,2].map(n=><div key={n} className="admin-minutes-sk-item"><Skeleton className="admin-sk-h2"/><Skeleton className="admin-sk-line" style={{width:'90%'}}/><Skeleton className="admin-sk-line" style={{width:'75%'}}/></div>)}<Skeleton className="admin-sk-h2"/><Skeleton className="admin-sk-textarea"/></div>;

// Writing minutes, and the next meeting's agenda, on one page. SU and AGM used to be a tab here, so old links to it are sent on.
export function Minutes(){useTitle('Meetings');useSyncExternalStore(onRouteChange,()=>location.search);const asked=new URLSearchParams(location.search).get('tab');const tab=asked==='agenda'?asked:'write';
 useEffect(()=>{if(asked==='su')go('/admin/su',{replace:true})},[asked]);
 return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Meetings</h1></header>
  <div className="admin-tools"><nav aria-label="Meetings" className="admin-tabs"><a href="/admin/minutes" aria-current={tab==='write'?'page':undefined}>Write minutes</a><a href="/admin/minutes?tab=agenda" aria-current={tab==='agenda'?'page':undefined}>Next meeting</a></nav></div>
  {tab==='agenda'?<Agenda/>:<WriteMinutes/>}</section>}

// The transcript is never saved. The minutes are kept only when someone saves them to the society's Google Drive.
function WriteMinutes(){const [title,setTitle]=useState('Committee meeting');const [date,setDate]=useState(()=>todayInUk());const [transcript,setTranscript]=useState('');const [minutes,setMinutes]=useState('');const [problems,setProblems]=useState<Problems>({});const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [confirm,setConfirm]=useState<Confirm|null>(null);const [saved,setSaved]=useState<{text:string;link:string}|null>(null);const [saving,setSaving]=useState(false);const [started,setStarted]=useState(0);const [notice,setNotice]=useState('');const [meeting,setMeeting]=useState<Meeting|null>(null);const request=useRef<AbortController|null>(null);const file=useRef<HTMLInputElement>(null);const result=useRef<HTMLElement>(null);
 const savedNow=!!saved&&saved.text===minutes;
 useLeaveWarning(busy||saving||(!!minutes.trim()?!savedNow:!!transcript.trim()));
 const cleaned=cleanTranscript(transcript);
 async function openFile(e:ChangeEvent<HTMLInputElement>){const chosen=e.target.files?.[0];e.target.value='';if(!chosen)return;if(chosen.size>5*1024*1024){setProblems(old=>({...old,transcript:'That file is too big to be a transcript. Choose the .vtt file from Teams.'}));return}setTranscript(await chosen.text());setProblems(old=>({...old,transcript:''}))}
 async function generate(e?:FormEvent){e?.preventDefault();const found=minutesProblems({title,date,transcript:cleaned});setProblems(found);if(Object.keys(found).length){(document.querySelector('[aria-invalid=true]') as HTMLElement|null)?.focus();return}
  const controller=new AbortController();request.current=controller;setBusy(true);setStarted(Date.now());setError('');setNotice('');try{const {minutes:written}=await callFunction<{minutes:string}>('generate-minutes',{title:title.trim(),date,transcript:cleaned},controller.signal);setMinutes(written);setSaved(null);requestAnimationFrame(()=>result.current?.scrollIntoView({block:'start'}))}catch(failure){if(!controller.signal.aborted)setError((failure as Error).message)}finally{if(request.current===controller){request.current=null;setBusy(false)}}}
 // Stops waiting. The AI may still finish on its side, which counts towards the day's allowance, but its reply is ignored.
 function cancel(){request.current?.abort();request.current=null;setBusy(false);setNotice(minutes?'Cancelled. The minutes below haven’t changed.':'Cancelled. Your transcript is still here.')}
 useEffect(()=>()=>request.current?.abort(),[]);
 async function save(){setSaving(true);setError('');try{const {link}=await drive<{link:string}>({action:'save-minutes',name:minutesDocName(date,title),html:minutesHtml(minutes,title.trim())});setSaved({text:minutes,link});setMeeting(await recordMeeting({title:title.trim(),held_on:date,minutes_link:link,carried_forward:carriedForward(minutes)},meeting?.id))}catch(failure){setError((failure as Error).message)}finally{setSaving(false)}}
 function download(){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([minutes],{type:'text/markdown;charset=utf-8'}));link.download=`minutes-${date}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
 const again=()=>setConfirm({title:'Write them again?',body:'The minutes below will be replaced, including any changes you’ve made to them.',action:'Write again',run:()=>generate()});
 const reset=()=>setConfirm({title:'Start again?',body:'The transcript and the minutes will be cleared. Copy or download the minutes first if you need them.',action:'Clear everything',danger:true,run:()=>{setTranscript('');setMinutes('');setSaved(null);setMeeting(null);setError('');setProblems({})}});
 return <><p className="admin-quiet admin-people-intro">Paste a meeting’s transcript from Teams and get a first draft of the minutes. The transcript is sent to Cloudflare’s AI service to write them, and isn’t kept. When the minutes are right, save them to the society’s Google Drive.</p>
  <form className="admin-form-block" onSubmit={generate} noValidate><h2>The meeting</h2>
   <div className="admin-two"><Field id="minutes-title" label="Meeting" error={problems.title}><Input {...fieldProps('minutes-title',problems.title)} maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setProblems(old=>({...old,title:''}))}}/></Field><Field id="minutes-date" label="Date" error={problems.date}><Input {...fieldProps('minutes-date',problems.date)} type="date" value={date} onChange={e=>{setDate(e.target.value);setProblems(old=>({...old,date:''}))}}/></Field></div>
   <Field id="minutes-transcript" label="Transcript" error={problems.transcript} hint={transcript.trim()?`${cleaned.length.toLocaleString('en-GB')} of ${TRANSCRIPT_MAX.toLocaleString('en-GB')} characters once the times are taken out.`:'In Teams, open the meeting’s Recap, then Transcript. Download it as a .vtt file and open it here, or copy the text and paste it in.'}><Textarea {...fieldProps('minutes-transcript',problems.transcript,true)} className="admin-guide-body" rows={14} spellCheck={false} value={transcript} onChange={e=>{setTranscript(e.target.value);setProblems(old=>({...old,transcript:''}))}}/></Field>
   <input ref={file} type="file" accept=".vtt,.txt,text/vtt,text/plain" hidden onChange={openFile}/>
   {!minutes&&<Failure>{error}</Failure>}
   {busy?<Writing started={started} expected={expectedMinutesSeconds(cleaned.length)} onCancel={cancel}/>:<div className="admin-actions">{!minutes&&<Button type="submit" className="site-button"><Sparkles aria-hidden="true"/>Write the minutes</Button>}<Button type="button" variant="outline" onClick={()=>file.current?.click()}><FileUp aria-hidden="true"/>Open a .vtt file</Button></div>}
   <p role="status" className="admin-notice">{notice}</p></form>
  {busy&&!minutes&&<MinutesSkeleton/>}
  {minutes&&<section ref={result} className="admin-form-block" aria-labelledby="minutes-result"><h2 id="minutes-result">The minutes</h2><p className="admin-callout">This is a first draft. AI can get names, decisions and numbers wrong, so check it against the meeting before you share it.</p>
   <Field id="minutes-text" label="Edit before you share" hint="Written in Markdown: # starts a heading and **two stars** make text bold."><Textarea {...fieldProps('minutes-text',undefined,true)} className="admin-guide-body" rows={24} spellCheck value={minutes} onChange={e=>setMinutes(e.target.value)}/></Field>
   <Failure>{error}</Failure><p role="status" className="admin-notice">{saved&&<>{savedNow?'Saved as a Google Doc in the Minutes folder. ':'You’ve changed them since saving. Saving again makes a new doc. '}<a className="text-link" href={saved.link} target="_blank" rel="noopener noreferrer">Open the doc<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></>}</p>
   <div className="admin-actions"><Button type="button" className="site-button" disabled={saving||busy||!minutes.trim()||savedNow} onClick={save}><HardDrive aria-hidden="true"/>{saving?'Saving…':savedNow?'Saved to Drive':saved?'Save again to Drive':'Save to Drive'}</Button><CopyButton label="Copy minutes" value={minutes}/><Button type="button" variant="outline" size="sm" disabled={!minutes.trim()} onClick={download}><Download aria-hidden="true"/>Download</Button><Button type="button" variant="ghost" disabled={busy} onClick={again}>{busy?'Writing…':'Write them again'}</Button><Button type="button" variant="ghost" className="admin-menu-danger" disabled={busy} onClick={reset}>Start again</Button></div></section>}
  {meeting&&<section className="admin-form-block" aria-labelledby="after-saving"><h2 id="after-saving">Actions and the next meeting</h2><ActionsReview markdown={saved?.text??minutes} meeting={meeting}/><NextMeetingDate meeting={meeting} onSaved={setMeeting}/></section>}
  <ConfirmDialog confirm={confirm} onClose={()=>setConfirm(null)}/></>}
