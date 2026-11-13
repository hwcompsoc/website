import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {LazyMotion,domMax,MotionConfig} from 'motion/react';
import {ArrowUpRight,BookOpen,CalendarDays,CircleHelp,Contact,FileText,LayoutDashboard,LifeBuoy,HardDrive,LogOut,NotebookPen,UserRound,UsersRound} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Logo} from '../components/Logo';
import {ThemeSwitch} from '../components/ThemeSwitch';
import {useNoindex} from '../components/shared';
import {MotionLevelProvider,useMotionLevelSetting} from '../motion/level';
import {ClickBurstProvider,GlobalBursts} from '../motion/ClickBurst';
import {go,onRouteChange,savedScroll} from '../router';
import {supabase} from '../supabase';
import {adminRoute,safeNext} from '../admin-rules';
import {Account,CheckFailed,EventsList,Login,NotFoundPage,NotOnCommittee,Overview,SetPassword} from './pages';
import {EditEvent,NewEvent} from './EventForm';
import {EventPage} from './EventPage';
import {People} from './People';
import {Committee} from './Committee';
import {Faqs} from './Faqs';
import {Documents} from './Documents';
import {Minutes} from './Minutes';
import {Drive} from './Drive';
import {FilesLeftWarning} from './files';
import {Help} from './Help';
import {GuideEditor,GuidesList} from './Guides';
import {AdminBoot,useBootRound} from './Boot';
import '../cursor';
import './admin.css';

const useLocationKey=()=>useSyncExternalStore(onRouteChange,()=>location.pathname+location.search);
export const signOut=async()=>{await supabase.auth.signOut();go('/admin/login',{replace:true})};

// The signed-in layout: its own navigation, separate from the public site.
function Shell({email,owner,current,children}:{email:string;owner:boolean;current:string;children:ReactNode}){const nav=useRef<HTMLElement>(null);useEffect(()=>{nav.current?.querySelector('[aria-current=page]')?.scrollIntoView({inline:'center',block:'nearest',behavior:'instant'})},[current]);const links=[{href:'/admin',label:'Overview',name:'overview',Icon:LayoutDashboard},{href:'/admin/events',label:'Events',name:'events',Icon:CalendarDays},{href:'/admin/guides',label:'Guides',name:'guides',Icon:BookOpen},{href:'/admin/committee',label:'Committee',name:'committee',Icon:Contact},{href:'/admin/faqs',label:'FAQs',name:'faqs',Icon:CircleHelp},{href:'/admin/documents',label:'Documents',name:'documents',Icon:FileText},{href:'/admin/minutes',label:'Minutes',name:'minutes',Icon:NotebookPen},{href:'/admin/drive',label:'Drive',name:'drive',Icon:HardDrive},...owner?[{href:'/admin/people',label:'People',name:'people',Icon:UsersRound}]:[],{href:'/admin/account',label:'Account',name:'account',Icon:UserRound},{href:'/admin/help',label:'Help',name:'help',Icon:LifeBuoy}];
 return <div className="admin-shell"><aside className="admin-side"><a href="/admin" aria-label="CompSoc admin overview" className="admin-logo"><Logo tone="blue" className="site-logo"/></a><nav aria-label="Admin" ref={nav}><ul>{links.map(({href,label,name,Icon})=><li key={name}><a href={href} aria-current={current===name?'page':undefined}><Icon size={16} aria-hidden="true"/>{label}</a></li>)}</ul></nav><div className="admin-side-foot"><a className="admin-side-link" href="/" target="_blank" rel="noopener noreferrer">View site<ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a><ThemeSwitch/><p className="admin-who" title={email}>{email}</p><Button variant="ghost" size="sm" onClick={signOut}><LogOut aria-hidden="true"/>Sign out</Button></div></aside><main className="admin-main" id="main-content" tabIndex={-1}><FilesLeftWarning/>{children}</main></div>}

function Pages(){const bootDone=useBootRound();const key=useLocationKey();const route=adminRoute(location.pathname);const [session,setSession]=useState<Session|null|undefined>(undefined);const [member,setMember]=useState<{email:string;ok:boolean;failed:boolean;owner:boolean}|null>(null);const focused=useRef('');
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(old=>old===undefined?data.session:old));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe()},[]);
 const email=session?.user.email?.toLowerCase()??'';const mustChange=!!session?.user.user_metadata?.must_change_password;
 useEffect(()=>{if(!email)return;let active=true;supabase.from('committee_members').select('email,role').eq('email',email).then(({data,error})=>{if(active)setMember({email,ok:!error&&!!data?.length,failed:!!error,owner:data?.[0]?.role==='owner'})});return()=>{active=false}},[email]);
 // Where you're allowed to be, given who you are. Anything else is sent on, and remembered for after sign-in.
 const target=session===undefined?null:!session?(route.name==='login'?null:`/admin/login?next=${encodeURIComponent(key)}`):mustChange?(route.name==='set-password'?null:'/admin/set-password'):route.name==='login'||route.name==='set-password'?safeNext(new URLSearchParams(location.search).get('next')):null;
 useEffect(()=>{if(target)go(target,{replace:true})},[target]);
 useEffect(()=>{if(focused.current===location.pathname)return;focused.current=location.pathname;window.scrollTo({top:savedScroll(),behavior:'instant'});document.getElementById('main-content')?.focus({preventScroll:true})},[key,member?.ok,session===undefined]);
 if(!bootDone||session===undefined||target)return <AdminBoot/>;
 if(!session)return <main id="main-content" tabIndex={-1} className="admin-centre"><Login/></main>;
 if(mustChange)return <main id="main-content" tabIndex={-1} className="admin-centre"><SetPassword/></main>;
 if(member?.email!==email)return <AdminBoot/>;
 if(member.failed)return <main id="main-content" tabIndex={-1} className="admin-centre"><CheckFailed/></main>;
 if(!member.ok)return <main id="main-content" tabIndex={-1} className="admin-centre"><NotOnCommittee email={email}/></main>;
 if(route.name==='new')return <main id="main-content" tabIndex={-1} className="admin-focus"><NewEvent key={new URLSearchParams(location.search).get('draft')??'new'}/></main>;
 const current=route.name==='event'||route.name==='edit'?'events':route.name==='guide'?'guides':route.name;
 return <Shell email={email} owner={member.owner} current={current}>{route.name==='overview'?<Overview/>:route.name==='events'?<EventsList/>:route.name==='event'?<EventPage key={route.id} id={route.id!}/>:route.name==='edit'?<EditEvent key={route.id} id={route.id!}/>:route.name==='account'?<Account email={email}/>:route.name==='guides'?<GuidesList/>:route.name==='guide'?<GuideEditor key={route.id??'new'} id={route.id}/>:route.name==='committee'?<Committee/>:route.name==='faqs'?<Faqs/>:route.name==='documents'?<Documents/>:route.name==='minutes'?<Minutes/>:route.name==='drive'?<Drive owner={member.owner}/>:route.name==='help'?<Help owner={member.owner}/>:route.name==='people'&&member.owner?<People email={email}/>:<NotFoundPage/>}</Shell>}

export default function AdminApp(){useNoindex();const level=useMotionLevelSetting();
 return <LazyMotion features={domMax} strict><MotionConfig reducedMotion="user"><MotionLevelProvider value={level}><ClickBurstProvider><GlobalBursts/><a href="#main-content" className="skip-link" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a><Pages/></ClickBurstProvider></MotionLevelProvider></MotionConfig></LazyMotion>}
