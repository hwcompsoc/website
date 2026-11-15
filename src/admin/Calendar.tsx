import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '../components/ui/button';
import {supabase} from '../supabase';
import {FEED_PATH} from '../calendar';
import {monthGrid,taskHref,todayInUk,type AdminEvent,type Task} from '../admin-rules';
import {useAccess} from './access';
import {CopyButton,Failure,friendly,loadEvents,useLoad} from './ui';
import {EventsSkeleton} from './skeletons';

type Item={id:string;day:string;label:string;href:string;kind:'event'|'draft'|'cancelled'|'meeting'|'deadline'};
const ukDay=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
const ukTime=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
async function loadDated(){const [meetings,tasks]=await Promise.all([supabase.from('meetings').select('id,next_on').not('next_on','is',null),supabase.from('tasks').select('id,title,due_on,kind,details,assignee_email,assignee_role').in('kind',['deadline','agm']).eq('status','open')]);const failed=meetings.error??tasks.error;if(failed)throw new Error(friendly(failed));return {meetings:meetings.data as {id:string;next_on:string}[],tasks:tasks.data as Pick<Task,'id'|'title'|'due_on'|'kind'|'details'|'assignee_email'|'assignee_role'>[]}}

// Events, committee meetings and deadlines by month. University calendars change too often to check for clashes, so this only
// shows what the society itself has planned.
export function EventsCalendar(){const access=useAccess();const events=useLoad(loadEvents,'calendar-events');const dated=useLoad(loadDated,'calendar-dated');const today=todayInUk();const [month,setMonth]=useState(today.slice(0,7));
 const items=useMemo(()=>{const list:Item[]=[];for(const e of (events.data??[]) as AdminEvent[])if(e.starts_at)list.push({id:e.id!,day:ukDay(e.starts_at),label:`${ukTime(e.starts_at)} ${e.title}`,href:`/admin/events/${e.id}`,kind:e.status==='draft'?'draft':e.status==='cancelled'?'cancelled':'event'});
  for(const m of dated.data?.meetings??[])list.push({id:`m-${m.id}`,day:m.next_on,label:'Committee meeting',href:'/admin/minutes?tab=agenda',kind:'meeting'});
  for(const t of dated.data?.tasks??[])if(t.due_on)list.push({id:t.id!,day:t.due_on,label:t.title,href:taskHref(t,access.email,access.roles),kind:'deadline'});return list},[events.data,dated.data,access]);
 const weeks=monthGrid(month);const [y,m]=month.split('-').map(Number);const title=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m-1,1)));
 const shift=(by:number)=>{const d=new Date(Date.UTC(y,m-1+by,1));setMonth(d.toISOString().slice(0,7))};const feed=`${location.origin}${FEED_PATH}`;
 return <><Failure>{events.error||dated.error}</Failure>
  <div className="admin-cal-head"><h2 aria-live="polite">{title}</h2><span className="admin-photo-actions"><Button variant="outline" size="icon" aria-label="Previous month" onClick={()=>shift(-1)}><ChevronLeft aria-hidden="true"/></Button><Button variant="outline" size="sm" onClick={()=>setMonth(today.slice(0,7))}>Today</Button><Button variant="outline" size="icon" aria-label="Next month" onClick={()=>shift(1)}><ChevronRight aria-hidden="true"/></Button></span></div>
  {events.loading&&!events.data?<EventsSkeleton/>:<div className="admin-cal" role="table" aria-label={title}><div role="row" className="admin-cal-row admin-cal-days">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><span key={d} role="columnheader">{d}</span>)}</div>
   {weeks.map(week=><div key={week[0]} role="row" className="admin-cal-row">{week.map(day=>{const here=items.filter(i=>i.day===day).sort((a,b)=>a.label.localeCompare(b.label));const outside=day.slice(0,7)!==month;return <div key={day} role="cell" className="admin-cal-day" data-outside={outside||undefined} data-today={day===today||undefined}><span className="admin-cal-date">{Number(day.slice(8))}<span className="sr-only"> {new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',month:'long'}).format(new Date(`${day}T12:00:00Z`))}</span></span>{here.map(item=><a key={item.id} className="admin-cal-item" data-kind={item.kind} href={item.href} title={item.label}>{item.label}{item.kind==='draft'?<span className="sr-only"> (draft)</span>:item.kind==='cancelled'?<span className="sr-only"> (cancelled)</span>:null}</a>)}</div>})}</div>)}</div>}
  <p className="admin-cal-key"><span data-kind="event">Event</span><span data-kind="draft">Draft</span><span data-kind="meeting">Committee meeting</span><span data-kind="deadline">Deadline</span></p>
  <section className="admin-form-block" aria-labelledby="google-calendar"><h2 id="google-calendar">In Google Calendar</h2><p className="admin-quiet">Every live event is published as a calendar feed. To see them in the society’s Google Calendar, open Google Calendar as the society’s account, choose <b>Other calendars</b>, then <b>From URL</b>, and paste this address. Google checks it for changes every few hours. Anyone on the committee can add it to their own calendar the same way.</p><div className="admin-actions"><code className="admin-code admin-feed">{feed}</code><CopyButton label="Copy address" value={feed}/></div></section></>}
