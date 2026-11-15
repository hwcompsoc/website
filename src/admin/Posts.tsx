import {useMemo,useState} from 'react';
import {Download,ExternalLink,Plus} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {supabase} from '../supabase';
import {PLATFORMS,blankTask,coverDownload,coverUrl,dueLabel,platformProblem,platformsOf,postKindLabel,postText,todayInUk,weekLabel,weekStart,type AdminEvent,type Platform,type PlatformState,type PostKind,type Task} from '../admin-rules';
import {loadTeam,useAccess} from './access';
import {TaskEditor} from './Tasks';
import {CopyButton,EmptyNote,Failure,friendly,loadEvent,loadEvents,useLoad,useTitle} from './ui';
import {PeopleSkeleton} from './skeletons';

const stateLabel={todo:'To do',posted:'Posted',skipped:'Skipped'};

// Everything for one post: the words, both images, the links, and a tick for each platform. It reads the event as it is now,
// so a changed time or venue is always right.
export function PostPanel({task,onChange}:{task:Task;onChange:(task:Task)=>void}){const event=useLoad(()=>task.event_id?loadEvent(task.event_id):Promise.resolve(null),`post-event-${task.event_id}`);
 const post=(task.details?.post as PostKind|undefined)??'other';const platforms=platformsOf(task);const site=location.origin;
 const text=event.data?postText(event.data,post,site):'';
 const set=(id:Platform,state:Partial<PlatformState>)=>onChange({...task,details:{...task.details,platforms:{...platforms,[id]:{...platforms[id],...state}}}});
 return <div className="admin-post-panel">{event.data&&<>
   <div className="admin-post-text"><div className="admin-block-head"><b>Suggested words</b><CopyButton label="Copy words" value={text}/></div><pre className="admin-message" tabIndex={0}>{text}</pre></div>
   <div className="admin-post-assets">{event.data.cover_path&&<figure><img src={coverUrl(event.data.cover_path,true)} alt=""/><figcaption>Landscape, for LinkedIn and Discord</figcaption><Button asChild variant="outline" size="sm"><a href={coverDownload(event.data.cover_path,`${event.data.slug}-landscape.jpg`)}><Download aria-hidden="true"/>Download</a></Button></figure>}{event.data.square_path&&<figure><img className="admin-post-square" src={coverUrl(event.data.square_path)} alt=""/><figcaption>Square, for Instagram</figcaption><Button asChild variant="outline" size="sm"><a href={coverDownload(event.data.square_path,`${event.data.slug}-square.jpg`)}><Download aria-hidden="true"/>Download</a></Button></figure>}</div>
   <p className="admin-quiet">The images are also in the event’s folder in Drive. Image description for alt text: {event.data.cover_alt||'not set'}.</p></>}
  <Failure>{event.error}</Failure>
  <fieldset className="admin-fieldset"><legend>Where it’s posted</legend>{PLATFORMS.map(({id,label})=>{const p=platforms[id];const problem=platformProblem(p);return <div key={id} className="admin-platform"><span className="admin-platform-name">{label}</span><select aria-label={`${label}: posted or not`} className="admin-select" value={p.state} onChange={e=>set(id,{state:e.target.value as PlatformState['state']})}>{Object.entries(stateLabel).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>{p.state==='posted'&&<Input aria-label={`Link to the ${label} post`} aria-invalid={problem?true:undefined} type="url" placeholder="Link to the post (optional)" value={p.link??''} onChange={e=>set(id,{link:e.target.value})}/>}{problem&&<p className="admin-field-error">{problem}</p>}</div>})}</fieldset>
  <p className="admin-quiet">Once every platform is posted or skipped, saving marks this done.</p></div>}

async function loadPosts(){const from=new Date(Date.now()-21*86400000).toISOString().slice(0,10);const {data,error}=await supabase.from('tasks').select('*').eq('kind','post').or(`due_on.gte.${from},status.eq.open`).neq('status','cancelled');if(error)throw new Error(friendly(error));return data as Task[]}

// Every post, by week: the ones made from events and the ones added by hand. Posting itself happens in each task.
export function ContentCalendar(){useTitle('Content calendar');const access=useAccess();const [version,setVersion]=useState(0);const posts=useLoad(loadPosts,`posts-${version}`);const events=useLoad(loadEvents,'content-events');const team=useLoad(loadTeam,'team');const [editing,setEditing]=useState<Task|null>(null);const today=todayInUk();
 const byWeek=useMemo(()=>{const groups=new Map<string,Task[]>();for(const task of [...posts.data??[]].sort((a,b)=>(a.due_on??today).localeCompare(b.due_on??today))){const week=weekStart(task.due_on??today);groups.set(week,[...groups.get(week)??[],task])}return [...groups.entries()]},[posts.data]);
 const eventOf=(task:Task)=>(events.data??[]).find(e=>e.id===task.event_id) as AdminEvent|undefined;
 const add=()=>setEditing({...blankTask(),assignee_role:'socials',kind:'post',due_on:today,details:{post:'other'}});
 if(!access.content_calendar)return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Content calendar</h1></header><p className="admin-callout">Your role can’t see the content calendar. Ask an Owner if it should.</p></section>;
 return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Content calendar</h1><Button className="site-button" onClick={add}><Plus aria-hidden="true"/>Add a post</Button></header>
  <p className="admin-quiet admin-people-intro">Publishing an event adds its posts here: an announcement, a reminder a week before and one on the day, and a recap once the post-event form is in. Add anything else by hand. For recaps, <a className="text-link" href="/admin/photos">every event’s photos</a> are in one place.</p>
  <Failure>{posts.error||team.error||events.error}</Failure>
  {(posts.loading&&!posts.data)||(team.loading&&!team.data)?<PeopleSkeleton/>:byWeek.length?byWeek.map(([week,tasks])=><section key={week} className="admin-block" aria-labelledby={`week-${week}`}><h2 id={`week-${week}`} className="admin-task-group">{weekLabel(week,today)}<span>{tasks.length}</span></h2>
   <ul className="admin-rows admin-tasks">{tasks.map(task=>{const platforms=platformsOf(task);const event=eventOf(task);const late=task.status==='open'&&!!task.due_on&&task.due_on<today;return <li key={task.id} className="admin-task admin-post-row" data-done={task.status==='done'||undefined}>
    <span className="admin-row-main"><button type="button" className="admin-task-title" onClick={()=>setEditing(task)}><b>{task.title}</b></button><small>{postKindLabel[(task.details?.post as PostKind)??'other']}{event?` · ${event.title}`:''}{task.due_on?` · ${task.status==='open'?dueLabel(task.due_on,today):new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(`${task.due_on}T12:00:00Z`))}`:''}</small></span>
    <span className="admin-platform-chips">{PLATFORMS.map(({id,label})=>{const p=platforms[id];return p.state==='posted'&&p.link?<a key={id} className="admin-chip" data-state="posted" href={p.link} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={12} aria-hidden="true"/><span className="sr-only">: posted (opens in a new tab)</span></a>:<span key={id} className="admin-chip" data-state={p.state}>{label}<span className="sr-only">: {stateLabel[p.state].toLowerCase()}</span></span>})}</span>
    {late&&<span className="admin-task-due" data-due="overdue">Late</span>}</li>})}</ul></section>):posts.data&&<EmptyNote>No posts yet. Publish an event, or add one by hand.</EmptyNote>}
  <TaskEditor task={editing} members={team.data?.members??[]} roles={team.data?.roles??[]} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setVersion(v=>v+1)}}/></section>}
