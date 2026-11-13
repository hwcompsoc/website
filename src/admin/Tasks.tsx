import {useMemo,useState,useSyncExternalStore,type FormEvent} from 'react';
import {Check,ExternalLink,Hand,Plus} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '../components/ui/dialog';
import {onRouteChange} from '../router';
import {supabase} from '../supabase';
import {assigneeLabel,blankTask,byDue,dueGroup,dueGroups,dueLabel,isMine,personName,taskEditable,taskKindLabel,taskProblems,todayInUk,type Member,type Problems,type Role,type Task} from '../admin-rules';
import {loadTeam,useAccess} from './access';
import {ConfirmDialog,EmptyNote,Failure,Field,fieldProps,friendly,useLoad,useTitle,type Confirm} from './ui';
import {PeopleSkeleton} from './skeletons';

export async function loadOpenTasks(){const {data,error}=await supabase.from('tasks').select('*').eq('status','open');if(error)throw new Error(friendly(error));return (data as Task[]).sort(byDue)}
async function loadFinished(){const {data,error}=await supabase.from('tasks').select('*').neq('status','open').order('done_at',{ascending:false,nullsFirst:false}).order('updated_at',{ascending:false}).limit(100);if(error)throw new Error(friendly(error));return data as Task[]}
export async function saveTask(task:Task){const body=taskEditable(task);const query=task.id?supabase.from('tasks').update(body).eq('id',task.id):supabase.from('tasks').insert(body);const {data,error}=await query.select().single();if(error)throw new Error(friendly(error));return data as Task}
async function deleteTask(id:string){const {error}=await supabase.from('tasks').delete().eq('id',id);if(error)throw new Error(friendly(error))}

// One choice for who a task is for: a person, or anyone in a role. Picking a person keeps the role only if they hold it,
// so a role's task someone has picked up still shows for the rest of that role.
const encode=(task:Task)=>task.assignee_email?`p:${task.assignee_email}`:task.assignee_role?`r:${task.assignee_role}`:'';
function assign(task:Task,value:string,members:Member[]):Task{if(value.startsWith('r:'))return {...task,assignee_email:null,assignee_role:value.slice(2)};if(value.startsWith('p:')){const email=value.slice(2);const holds=members.find(m=>m.email===email)?.roles.includes(task.assignee_role??'');return {...task,assignee_email:email,assignee_role:holds?task.assignee_role:null}}return {...task,assignee_email:null,assignee_role:null}}

export function AssigneeSelect({id,task,members,roles,onChange,describedBy}:{id:string;task:Task;members:Member[];roles:Role[];onChange:(task:Task)=>void;describedBy?:string}){
 return <select id={id} className="admin-select" aria-describedby={describedBy} value={encode(task)} onChange={e=>onChange(assign(task,e.target.value,members))}><option value="">Nobody yet</option><optgroup label="People">{members.map(m=><option key={m.email} value={`p:${m.email}`}>{personName(m)}</option>)}</optgroup><optgroup label="Anyone in a role">{roles.map(r=><option key={r.key} value={`r:${r.key}`}>{r.name}</option>)}</optgroup></select>}

export function TaskEditor({task,members,roles,onClose,onSaved}:{task:Task|null;members:Member[];roles:Role[];onClose:()=>void;onSaved:(task:Task|null)=>void}){const access=useAccess();const [draft,setDraft]=useState<Task|null>(task);const [problems,setProblems]=useState<Problems>({});const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [confirm,setConfirm]=useState<Confirm|null>(null);
 const [shown,setShown]=useState(task);if(task!==shown){setShown(task);setDraft(task);setProblems({});setError('')}
 const edit=(fields:Partial<Task>)=>{setDraft(d=>d&&{...d,...fields});setProblems(p=>({...p,...Object.fromEntries(Object.keys(fields).map(k=>[k,'']))}))};
 async function run(work:()=>Promise<Task|null>){setBusy(true);setError('');try{onSaved(await work())}catch(failure){setError((failure as Error).message)}finally{setBusy(false)}}
 function submit(e:FormEvent){e.preventDefault();if(!draft)return;const found=taskProblems(draft);setProblems(found);if(Object.keys(found).length)return;run(()=>saveTask(draft))}
 const canDelete=!!draft?.id&&(draft.created_by===access.email||access.sees_all);
 return <Dialog open={!!task} onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="website-dialog admin-task-dialog">{draft&&<form onSubmit={submit} noValidate><DialogHeader><DialogTitle>{draft.id?'Task':'New task'}</DialogTitle><DialogDescription>{draft.id&&taskKindLabel[draft.kind]?`${taskKindLabel[draft.kind]}. `:''}Everyone it’s for sees it on their dashboard.</DialogDescription></DialogHeader>
  <Field id="task-title" label="What needs doing" error={problems.title}><Input {...fieldProps('task-title',problems.title)} maxLength={160} value={draft.title} onChange={e=>edit({title:e.target.value})}/></Field>
  <div className="admin-two"><Field id="task-who" label="For"><AssigneeSelect id="task-who" task={draft} members={members} roles={roles} onChange={next=>setDraft(next)}/></Field><Field id="task-due" label="Due"><Input id="task-due" type="date" value={draft.due_on??''} onChange={e=>edit({due_on:e.target.value||null})}/></Field></div>
  <Field id="task-notes" label="Notes" hint="Anything that helps: where to find things, who to ask."><Textarea {...fieldProps('task-notes',undefined,true)} rows={5} maxLength={4000} value={draft.notes} onChange={e=>edit({notes:e.target.value})}/></Field>
  <Field id="task-link" label="Link" error={problems.link}><Input {...fieldProps('task-link',problems.link)} type="url" placeholder="https://" value={draft.link??''} onChange={e=>edit({link:e.target.value})}/></Field>
  <Failure>{error}</Failure>
  <DialogFooter className="admin-task-footer">{draft.id&&<>{draft.status==='open'&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>run(()=>saveTask({...draft,status:'cancelled'}))}>No longer needed</Button>}{canDelete&&<Button type="button" variant="ghost" className="admin-menu-danger" disabled={busy} onClick={()=>setConfirm({title:'Delete this task?',body:'Deleting is for mistakes. If it’s finished or no longer needed, mark it that way instead, so there’s a record.',action:'Delete task',danger:true,run:()=>run(async()=>{await deleteTask(draft.id!);return null})})}>Delete</Button>}</>}<Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" className="site-button" disabled={busy}>{busy?'Saving…':draft.id?'Save':'Add task'}</Button></DialogFooter></form>}
  <ConfirmDialog confirm={confirm} onClose={()=>setConfirm(null)}/></DialogContent></Dialog>}

export function TaskRow({task,members,roles,today,onOpen,onChange}:{task:Task;members:Member[];roles:Role[];today:string;onOpen:()=>void;onChange:(task:Task)=>void}){const access=useAccess();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const done=task.status==='done';const group=dueGroup(task.due_on,today);
 async function update(next:Task){setBusy(true);setError('');try{onChange(await saveTask(next))}catch(failure){setError((failure as Error).message)}finally{setBusy(false)}}
 const canPickUp=task.status==='open'&&!task.assignee_email&&!!task.assignee_role&&access.roles.includes(task.assignee_role);
 const meta=[assigneeLabel(task,members,roles),taskKindLabel[task.kind]].filter(Boolean).join(' · ');
 return <li className="admin-task" data-done={done||undefined} data-cancelled={task.status==='cancelled'||undefined}>
  <button type="button" className="admin-task-tick" aria-pressed={done} disabled={busy||task.status==='cancelled'} aria-label={done?`Mark “${task.title}” as not done`:`Mark “${task.title}” as done`} onClick={()=>update({...task,status:done?'open':'done'})}>{done&&<Check size={16} aria-hidden="true"/>}</button>
  <span className="admin-row-main"><button type="button" className="admin-task-title" onClick={onOpen}><b>{task.title}</b></button><small>{meta}{task.status==='cancelled'?' · No longer needed':''}</small>{error&&<small className="admin-field-error" role="alert">{error}</small>}</span>
  {task.link&&<a className="admin-task-link" href={task.link} target="_blank" rel="noopener noreferrer" aria-label={`Open the link for “${task.title}” (opens in a new tab)`}><ExternalLink size={16} aria-hidden="true"/></a>}
  {canPickUp&&<Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>update({...task,assignee_email:access.email})}><Hand aria-hidden="true"/>I’ll do it</Button>}
  {task.status==='open'&&task.due_on&&<span className="admin-task-due" data-due={group}>{dueLabel(task.due_on,today)}</span>}</li>}

// Open tasks in due-date groups, so what's overdue is always on top.
export function TaskGroups({tasks,members,roles,onOpen,onChange}:{tasks:Task[];members:Member[];roles:Role[];onOpen:(task:Task)=>void;onChange:(task:Task)=>void}){const today=todayInUk();
 return <>{dueGroups.map(({id,label})=>{const list=tasks.filter(t=>dueGroup(t.due_on,today)===id);return list.length?<section key={id} className="admin-block" aria-labelledby={`due-${id}`}><h2 id={`due-${id}`} className="admin-task-group">{label}<span>{list.length}</span></h2><ul className="admin-rows admin-tasks">{list.map(task=><TaskRow key={task.id} task={task} members={members} roles={roles} today={today} onOpen={()=>onOpen(task)} onChange={onChange}/>)}</ul></section>:null})}</>}

type Tab='mine'|'team'|'done';
export function Tasks(){useTitle('Tasks');const access=useAccess();useSyncExternalStore(onRouteChange,()=>location.search);
 const asked=new URLSearchParams(location.search).get('tab');const tab:Tab=asked==='team'||asked==='done'?asked:'mine';
 const [version,setVersion]=useState(0);const open=useLoad(loadOpenTasks,`open-${version}`);const team=useLoad(loadTeam,'team');const finished=useLoad(loadFinished,`done-${version}-${tab==='done'}`);
 const [editing,setEditing]=useState<Task|null>(null);const [who,setWho]=useState('');const [notice,setNotice]=useState('');
 const members=team.data?.members??[];const roles=team.data?.roles??[];
 const mine=useMemo(()=>(open.data??[]).filter(t=>isMine(t,access.email,access.roles)),[open.data]);
 const others=useMemo(()=>(open.data??[]).filter(t=>!isMine(t,access.email,access.roles)),[open.data]);
 const shownOthers=who?others.filter(t=>who.startsWith('r:')?t.assignee_role===who.slice(2):t.assignee_email===who.slice(2)):others;
 const changed=(task:Task)=>{open.set((open.data??[]).map(t=>t.id===task.id?task:t).filter(t=>t.status==='open'));setNotice(task.status==='done'?`Done: ${task.title}`:'');if(tab==='done')setVersion(v=>v+1)};
 const saved=(task:Task|null)=>{setEditing(null);setNotice(task?`Saved: ${task.title}`:'Task deleted.');setVersion(v=>v+1)};
 const loading=(open.loading&&!open.data)||(team.loading&&!team.data);const error=open.error||team.error||(tab==='done'?finished.error:'');
 const tabs:{id:Tab;label:string;count?:number}[]=[{id:'mine',label:'Mine',count:mine.length},{id:'team',label:access.sees_all?'Everyone else':'My teams',count:others.length},{id:'done',label:'Finished'}];
 return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Tasks</h1><Button className="site-button" onClick={()=>setEditing(blankTask(access.email))}><Plus aria-hidden="true"/>New task</Button></header>
  <p className="admin-quiet admin-people-intro">{access.sees_all?'You can see everyone’s tasks.':'Your tasks, your roles’ tasks, and those of the teams your role looks after.'}</p>
  <Failure>{error}</Failure><p role="status" className="admin-notice">{notice}</p>
  {loading?<PeopleSkeleton/>:<>
   <div className="admin-tools"><nav aria-label="Which tasks" className="admin-tabs">{tabs.map(({id,label,count})=><a key={id} href={id==='mine'?'/admin/tasks':`/admin/tasks?tab=${id}`} aria-current={tab===id?'page':undefined}>{label}{count!==undefined&&<span>{count}</span>}</a>)}</nav>
    {tab==='team'&&<label className="admin-task-filter"><span>Showing</span><select className="admin-select" value={who} onChange={e=>setWho(e.target.value)}><option value="">Everyone</option><optgroup label="People">{members.filter(m=>m.email!==access.email).map(m=><option key={m.email} value={`p:${m.email}`}>{personName(m)}</option>)}</optgroup><optgroup label="Roles">{roles.map(r=><option key={r.key} value={`r:${r.key}`}>{r.name}</option>)}</optgroup></select></label>}</div>
   {tab==='mine'?(mine.length?<TaskGroups tasks={mine} members={members} roles={roles} onOpen={setEditing} onChange={changed}/>:<EmptyNote kind="done">Nothing needs you right now.</EmptyNote>)
   :tab==='team'?(shownOthers.length?<TaskGroups tasks={shownOthers} members={members} roles={roles} onOpen={setEditing} onChange={changed}/>:<EmptyNote kind="none">No open tasks here.</EmptyNote>)
   :finished.loading&&!finished.data?<PeopleSkeleton/>:finished.data?.length?<ul className="admin-rows admin-tasks">{finished.data.map(task=><TaskRow key={task.id} task={task} members={members} roles={roles} today={todayInUk()} onOpen={()=>setEditing(task)} onChange={changed}/>)}</ul>:<EmptyNote kind="none">Nothing finished yet.</EmptyNote>}</>}
  <TaskEditor task={editing} members={members} roles={roles} onClose={()=>setEditing(null)} onSaved={saved}/></section>}
