import {useMemo,useState,type FormEvent} from 'react';
import {CalendarPlus,Download,ExternalLink,HardDrive,ListChecks,Plus,Trash2,Wand2} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {Checkbox} from '../components/ui/checkbox';
import {supabase} from '../supabase';
import {agendaDue,agendaMarkdown,assigneeLabel,blankTask,dueFromText,fullDate,matchAssignee,minutesActions,minutesHtml,personName,timeRange,todayInUk,type Member,type Role,type Task} from '../admin-rules';
import {loadTeam,useAccess} from './access';
import {drive} from './Drive';
import {AssigneeSelect} from './Tasks';
import {CopyButton,EmptyNote,Failure,Field,fieldProps,friendly,loadEvents,useLeaveWarning,useLoad} from './ui';
import {PeopleSkeleton} from './skeletons';

export type Meeting={id:string;title:string;held_on:string;minutes_link:string|null;carried_forward:string[];next_on:string|null;next_agenda_link:string|null};
type AgendaItem={id:string;title:string;added_by:string|null;used:boolean};

// Saving the minutes records the meeting, so the next agenda knows what to carry forward. Saving again updates the same record.
export async function recordMeeting(meeting:Omit<Meeting,'id'|'next_on'|'next_agenda_link'>,id?:string){const query=id?supabase.from('meetings').update(meeting).eq('id',id):supabase.from('meetings').insert(meeting);const {data,error}=await query.select().single();if(error)throw new Error(friendly(error));return data as Meeting}
async function insertTasks(tasks:Task[]){const {error}=await supabase.from('tasks').insert(tasks.map(({id:_id,created_at:_c,done_by:_d,done_at:_a,created_by:_b,...task})=>task));if(error)throw new Error(friendly(error))}

type Row={include:boolean;task:Task;said:string};
// The Secretary checks each action before it becomes a task: AI can get names and dates wrong.
export function ActionsReview({markdown,meeting}:{markdown:string;meeting:Meeting}){const team=useLoad(loadTeam,'team');const [rows,setRows]=useState<Row[]|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [made,setMade]=useState(0);
 const members=team.data?.members??[];const roles=team.data?.roles??[];
 const found=useMemo(()=>minutesActions(markdown),[markdown]);
 if(team.data&&!rows&&found.length)setRows(found.map(a=>({include:true,said:[a.who&&`Who: ${a.who}`,a.by&&`By: ${a.by}`].filter(Boolean).join('. '),task:{...blankTask(),...matchAssignee(a.who,members,roles),title:a.action.slice(0,160),due_on:dueFromText(a.by,meeting.held_on),kind:'action',link:meeting.minutes_link,notes:`From the minutes of ${meeting.title}, ${fullDate(`${meeting.held_on}T12:00:00Z`)}.`,details:{meeting_id:meeting.id}}})));
 const edit=(i:number,row:Partial<Row>)=>setRows(r=>r&&r.map((old,j)=>j===i?{...old,...row}:old));
 const chosen=(rows??[]).filter(r=>r.include&&r.task.title.trim());
 async function create(){setBusy(true);setError('');try{await insertTasks(chosen.map(r=>r.task));setMade(chosen.length)}catch(failure){setError((failure as Error).message)}finally{setBusy(false)}}
 if(made)return <p className="admin-notice" role="status">{made===1?'1 task created.':`${made} tasks created.`} Each person sees theirs on their dashboard. <a className="text-link" href="/admin/tasks?tab=team">See them</a></p>;
 if(!found.length)return <p className="admin-quiet">No actions were found in the minutes. If there should be some, check the Actions table at the end.</p>;
 if(team.loading&&!team.data)return <PeopleSkeleton/>;
 return <div className="admin-actions-review"><p className="admin-quiet">Check each one before it becomes a task. Untick any that aren’t real actions.</p><Failure>{team.error||error}</Failure>
  <ol className="admin-review-list">{(rows??[]).map((row,i)=><li key={i} data-off={!row.include||undefined}>
   <label className="admin-check"><Checkbox checked={row.include} onCheckedChange={v=>edit(i,{include:v===true})}/><span className="sr-only">Make a task of action {i+1}</span></label>
   <div className="admin-review-fields"><Field id={`action-${i}`} label={`Action ${i+1}`}><Input id={`action-${i}`} maxLength={160} value={row.task.title} disabled={!row.include} onChange={e=>edit(i,{task:{...row.task,title:e.target.value}})}/></Field>
    <div className="admin-two"><Field id={`action-who-${i}`} label="For" hint={row.said}><AssigneeSelect id={`action-who-${i}`} describedBy={`action-who-${i}-hint`} task={row.task} members={members} roles={roles} onChange={task=>edit(i,{task})}/></Field><Field id={`action-due-${i}`} label="Due"><Input id={`action-due-${i}`} type="date" disabled={!row.include} value={row.task.due_on??''} onChange={e=>edit(i,{task:{...row.task,due_on:e.target.value||null}})}/></Field></div></div></li>)}</ol>
  <div className="admin-actions"><Button type="button" className="site-button" disabled={busy||!chosen.length} onClick={create}><ListChecks aria-hidden="true"/>{busy?'Creating…':chosen.length===1?'Create 1 task':`Create ${chosen.length} tasks`}</Button></div></div>}

// The next meeting's date. Setting it gives the Secretary a task to send the agenda a few days before.
export function NextMeetingDate({meeting,onSaved}:{meeting:Meeting;onSaved:(meeting:Meeting)=>void}){const [date,setDate]=useState(meeting.next_on??'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();if(!date)return;setBusy(true);setError('');try{const {data,error:failure}=await supabase.from('meetings').update({next_on:date}).eq('id',meeting.id).select().single();if(failure)throw new Error(friendly(failure));
   await supabase.from('tasks').update({status:'cancelled'}).eq('kind','agenda').eq('status','open');
   await insertTasks([{...blankTask(),title:`Send the agenda for the meeting on ${fullDate(`${date}T12:00:00Z`)}`,assignee_role:'secretary',due_on:agendaDue(date,todayInUk()),kind:'agenda',notes:'Draft it on the Minutes page, under Next meeting. It fills itself in from the last minutes, open actions and anything people have asked to add.',details:{href:'/admin/minutes?tab=agenda'}}]);
   onSaved(data as Meeting);setDone(true)}catch(failure){setError((failure as Error).message)}finally{setBusy(false)}}
 return <form className="admin-link-form" onSubmit={submit} noValidate><Field id="next-meeting" label="Date of the next meeting" hint={done?'Saved. The Secretary has a task to send the agenda three days before.':'The Secretary gets a task to send the agenda three days before.'}><Input {...fieldProps('next-meeting',undefined,true)} type="date" min={todayInUk()} value={date} onChange={e=>{setDate(e.target.value);setDone(false)}}/></Field><Button type="submit" variant="outline" disabled={busy||!date||date===meeting.next_on}><CalendarPlus aria-hidden="true"/>{busy?'Saving…':'Set date'}</Button><Failure>{error}</Failure></form>}

async function loadAgenda(){const [meetings,items,actions]=await Promise.all([supabase.from('meetings').select('*').order('held_on',{ascending:false}).order('created_at',{ascending:false}).limit(10),supabase.from('agenda_items').select('*').eq('used',false).order('added_at'),supabase.from('tasks').select('*').eq('kind','action').eq('status','open')]);
 const failed=meetings.error??items.error??actions.error;if(failed)throw new Error(friendly(failed));return {meetings:meetings.data as Meeting[],items:items.data as AgendaItem[],actions:actions.data as Task[]}}

// Anyone can ask for something to go on the next agenda. The Secretary sees it when they draft it.
function AgendaItems({items,members,onChange}:{items:AgendaItem[];members:Member[];onChange:()=>void}){const access=useAccess();const [title,setTitle]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function add(e:FormEvent){e.preventDefault();if(!title.trim())return;setBusy(true);setError('');const {error:failure}=await supabase.from('agenda_items').insert({title:title.trim()});setBusy(false);if(failure){setError(friendly(failure));return}setTitle('');onChange()}
 async function remove(id:string){const {error:failure}=await supabase.from('agenda_items').delete().eq('id',id);if(failure){setError(friendly(failure));return}onChange()}
 const by=(email:string|null)=>{const m=members.find(x=>x.email===email);return m?personName(m):email??'Someone'};
 return <section className="admin-block" aria-labelledby="agenda-items"><h2 id="agenda-items">Items for the agenda</h2><p className="admin-quiet admin-people-intro">Anyone on the committee can add something to discuss. It’s included when the agenda is drafted.</p>
  {items.length?<ul className="admin-rows admin-people">{items.map(item=><li key={item.id} className="admin-person"><span className="admin-row-main"><b>{item.title}</b><small>Added by {by(item.added_by)}</small></span>{(item.added_by===access.email||access.roles.includes('secretary')||access.sees_all)&&<Button variant="ghost" size="icon" aria-label={`Remove “${item.title}”`} onClick={()=>remove(item.id)}><Trash2 aria-hidden="true"/></Button>}</li>)}</ul>:null}
  <form className="admin-link-form" onSubmit={add} noValidate><Field id="agenda-item" label="Add an item"><Input id="agenda-item" maxLength={200} placeholder="For example: Freshers’ fair stall" value={title} onChange={e=>setTitle(e.target.value)}/></Field><Button type="submit" variant="outline" disabled={busy||!title.trim()}><Plus aria-hidden="true"/>{busy?'Adding…':'Add item'}</Button></form><Failure>{error}</Failure></section>}

export function Agenda(){const [version,setVersion]=useState(0);const data=useLoad(loadAgenda,`agenda-${version}`);const team=useLoad(loadTeam,'team');const events=useLoad(loadEvents,'agenda-events');
 const last=data.data?.meetings[0]??null;const [date,setDate]=useState('');const [title,setTitle]=useState('Committee meeting');const [text,setText]=useState('');const [saving,setSaving]=useState(false);const [saved,setSaved]=useState<{text:string;link:string}|null>(null);const [error,setError]=useState('');
 const when=date||last?.next_on||'';const members=team.data?.members??[];const roles=team.data?.roles??[];
 useLeaveWarning(!!text.trim()&&saved?.text!==text);
 function draft(){if(!data.data||!when)return;const until=new Date(`${when}T00:00:00Z`).getTime()+28*86400000;
  const reports=roles.map(role=>({role:role.name,people:members.filter(m=>m.roles.includes(role.key)).map(personName).join(', ')})).filter(r=>r.people);
  setText(agendaMarkdown({title:title.trim()||'Committee meeting',date:when,last,
   actions:data.data.actions.sort((a,b)=>(a.due_on??'9').localeCompare(b.due_on??'9')).map(t=>({title:t.title,who:!t.assignee_email&&t.assignee_role?roles.find(r=>r.key===t.assignee_role)?.name??'Nobody yet':assigneeLabel(t,members,roles),due:t.due_on})),
   carried:last?.carried_forward??[],items:data.data.items.map(i=>({title:i.title,by:personName(members.find(m=>m.email===i.added_by)??{email:i.added_by??'Someone',name:null})})),reports,
   events:(events.data??[]).filter(e=>e.status==='published'&&e.starts_at&&new Date(e.starts_at).getTime()>=Date.now()&&new Date(e.starts_at).getTime()<=until).sort((a,b)=>a.starts_at!.localeCompare(b.starts_at!)).map(e=>({title:e.title,when:`${fullDate(e.starts_at!)}, ${timeRange(e.starts_at!,e.ends_at)}`}))}));setSaved(null)}
 async function save(){if(!data.data)return;setSaving(true);setError('');try{const {link}=await drive<{link:string}>({action:'save-doc',folder:'Agendas',name:`${when} ${title.trim()||'Committee meeting'} agenda`,html:minutesHtml(text,`${title.trim()} agenda`)});
   if(last){const {error:failure}=await supabase.from('meetings').update({next_on:when,next_agenda_link:link}).eq('id',last.id);if(failure)throw new Error(friendly(failure))}
   if(data.data.items.length)await supabase.from('agenda_items').update({used:true}).in('id',data.data.items.map(i=>i.id));
   await supabase.from('tasks').update({status:'done'}).eq('kind','agenda').eq('status','open');
   setSaved({text,link})}catch(failure){setError((failure as Error).message)}finally{setSaving(false)}}
 function download(){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));link.download=`agenda-${when}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
 if((data.loading&&!data.data)||(team.loading&&!team.data))return <PeopleSkeleton/>;
 return <><Failure>{data.error||team.error}</Failure>
  <section className="admin-form-block" aria-labelledby="next-meeting-head"><h2 id="next-meeting-head">Next meeting</h2>
   {last?<p className="admin-quiet">Last meeting: {last.title}, {fullDate(`${last.held_on}T12:00:00Z`)}.{last.minutes_link&&<> <a className="text-link" href={last.minutes_link} target="_blank" rel="noopener noreferrer">Minutes<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></>}</p>:<p className="admin-quiet">No minutes saved yet. The agenda still works, without the last meeting’s actions.</p>}
   <div className="admin-two"><Field id="agenda-title" label="Meeting"><Input id="agenda-title" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field id="agenda-date" label="Date"><Input id="agenda-date" type="date" value={when} onChange={e=>setDate(e.target.value)}/></Field></div>
   <div className="admin-actions"><Button type="button" className="site-button" disabled={!when} onClick={draft}><Wand2 aria-hidden="true"/>{text?'Draft it again':'Draft the agenda'}</Button></div>
   <p className="admin-quiet">It includes {data.data?.actions.length??0} open {data.data?.actions.length===1?'action':'actions'}, {last?.carried_forward.length??0} carried forward, {data.data?.items.length??0} {data.data?.items.length===1?'item':'items'} people added, each role’s report, and events in the four weeks after.</p></section>
  {text&&<section className="admin-form-block" aria-labelledby="agenda-result"><h2 id="agenda-result">The agenda</h2>
   <Field id="agenda-text" label="Edit before you send it" hint="Written in Markdown: # starts a heading and **two stars** make text bold."><Textarea {...fieldProps('agenda-text',undefined,true)} className="admin-guide-body" rows={20} value={text} onChange={e=>setText(e.target.value)}/></Field>
   <Failure>{error}</Failure><p role="status" className="admin-notice">{saved&&<>Saved as a Google Doc in the Agendas folder. Items people added are marked as used. <a className="text-link" href={saved.link} target="_blank" rel="noopener noreferrer">Open the doc<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></>}</p>
   <div className="admin-actions"><Button type="button" className="site-button" disabled={saving||saved?.text===text} onClick={save}><HardDrive aria-hidden="true"/>{saving?'Saving…':saved?.text===text?'Saved to Drive':'Save to Drive'}</Button><CopyButton label="Copy agenda" value={text}/><Button type="button" variant="outline" size="sm" onClick={download}><Download aria-hidden="true"/>Download</Button></div></section>}
  {data.data&&<AgendaItems items={data.data.items} members={members} onChange={()=>setVersion(v=>v+1)}/>}
  {data.data&&data.data.meetings.length>0&&<section className="admin-block" aria-labelledby="past-meetings"><h2 id="past-meetings">Past meetings</h2><ul className="admin-rows admin-people">{data.data.meetings.map(m=><li key={m.id} className="admin-person"><span className="admin-row-main"><b>{m.title}</b><small>{fullDate(`${m.held_on}T12:00:00Z`)}</small></span>{m.minutes_link&&<a className="text-link" href={m.minutes_link} target="_blank" rel="noopener noreferrer">Minutes<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}{m.next_agenda_link&&<a className="text-link" href={m.next_agenda_link} target="_blank" rel="noopener noreferrer">Next agenda<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}</li>)}</ul></section>}
  {!data.data?.meetings.length&&!text&&<EmptyNote>Save some minutes and they’ll show here.</EmptyNote>}</>}
