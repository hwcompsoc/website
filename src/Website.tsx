import {useEffect,useRef,useState} from 'react';
import {LazyMotion,domMax,MotionConfig} from 'motion/react';
import {events,resources,route,pagePath,eventTabTitle,guideTabTitle,tabTitles,type Event,type Resource,type View} from './content';
import {go,onRouteChange,openedInApp,savedScroll,takeClickedFrom,underPage} from './router';
import {titles} from './components/shared';
import {Header} from './components/Header';
import {Footer} from './components/Footer';
import {type Modal,DetailDialog} from './components/DetailDialog';
import {Home} from './pages/Home';
import {Events} from './pages/Events';
import {Join} from './pages/Join';
import {Resources} from './pages/Resources';
import {About} from './pages/About';
import {Partners} from './pages/Partners';
import {NotFound} from './pages/NotFound';
import {MotionLevelProvider,useMotionLevelSetting} from './motion/level';
import {ClickBurstProvider,GlobalBursts} from './motion/ClickBurst';
import {WindowOpen,type WindowPhase} from './motion/WindowOpen';
import {Privacy} from './pages/Privacy';
import {CommandPalette} from './components/CommandPalette';
import {SelectionLink} from './components/SelectionLink';
import './cursor';

const shownPage=():View=>underPage()??route(location.pathname).view;
// An event or guide address opens its dialog; `origin` is the row or card it grew from, if there was one.
function modalAt(origin?:DOMRect):Modal{const {view,item}=route(location.pathname);if(!item)return null;if(view==='events'){const event=events.find(e=>e.id===item);return event?{kind:'event',event,origin}:null}const resource=resources.find(r=>r.id===item);return resource?{kind:'resource',resource,origin}:null}
const headerLink=(page:View)=>{if(page==='notfound'||page==='privacy')return;const rect=document.querySelector(`.site-header a[href="${pagePath(page)}"]`)?.getBoundingClientRect();return rect&&rect.width>0?rect:undefined};
const modalTitle=(modal:Modal)=>modal?.kind==='event'?eventTabTitle(modal.event.title):modal?.kind==='resource'?guideTabTitle(modal.resource.title):null;
// Route changes run through the page window (motion/WindowOpen.tsx): out (old page fades) → swap page → in (window lands on
// the new page) → settle (new page fades in). A new address part way through starts again from out and retargets the window.
// The header follows `target` immediately, so its highlight slides while the page changes.
// The window grows from the link that was clicked, or else from the header's link to the new page (the logo for Home).
export default function Website(){const [page,setPage]=useState<View>(shownPage);const [modal,setModal]=useState<Modal>(()=>modalAt());const origin=useRef<DOMRect|undefined>(undefined);const level=useMotionLevelSetting();const animate=level==='full';const main=useRef<HTMLElement>(null);const initial=useRef(true);const current=useRef(page);current.current=page;const pending=useRef(page);const [target,setTarget]=useState(page);const [phase,setPhase]=useState<WindowPhase>('idle');const [opener,setOpener]=useState<DOMRect|undefined>();useEffect(()=>{function changed(){const next=shownPage();const clicked=takeClickedFrom();setModal(modalAt(origin.current));origin.current=undefined;if(next===current.current&&next===pending.current)return;pending.current=next;setTarget(next);if(level==='off'){setPage(next);return}setOpener(clicked??headerLink(next));setPhase('out')}return onRouteChange(changed)},[level]);useEffect(()=>{document.title=modalTitle(modal)??tabTitles[page]},[page,modal]);useEffect(()=>{/* A link to a section arrives before the page has drawn it, so the browser can't scroll there itself. A saved position (Back, reload) still wins. */const section=!savedScroll()&&location.hash?document.getElementById(location.hash.slice(1)):null;if(section)section.scrollIntoView({behavior:'instant'});else window.scrollTo({top:savedScroll(),behavior:'instant'});if(!initial.current)main.current?.focus({preventScroll:true});initial.current=false},[page]);useEffect(()=>{document.body.dataset.motion=animate?'on':'off'},[animate]);useEffect(()=>{if(phase==='idle')delete document.body.dataset.pageChange;else document.body.dataset.pageChange=phase},[phase]);function openItem(href:string,from:DOMRect){origin.current=from;go(href,{under:page==='notfound'||page==='privacy'?undefined:page,inApp:true})}
 // Closing goes back if the dialog was opened on this site, so the page behind and its filters return as they were. Arriving by link, it lands on the list.
 function closeModal(){if(openedInApp()){history.back();return}go(modal?.kind==='event'?'/events':'/resources',{replace:true})}
 const openEvent=(event:Event,from:DOMRect)=>openItem(`/events/${event.id}`,from);const openResource=(resource:Resource,from:DOMRect)=>openItem(`/resources/${resource.id}`,from);
 return <LazyMotion features={domMax} strict><MotionConfig reducedMotion="user"><MotionLevelProvider value={level}><ClickBurstProvider><GlobalBursts/><a href="#main-content" className="skip-link" onClick={e=>{e.preventDefault();main.current?.focus();main.current?.scrollIntoView({block:'start'})}}>Skip to content</a><Header page={target}/><main id="main-content" ref={main} tabIndex={-1} key={page} aria-label={titles[page]}>{page==='home'?<Home onEvent={openEvent}/>:page==='join'?<Join/>:page==='events'?<Events onOpen={openEvent}/>:page==='resources'?<Resources onOpen={openResource}/>:page==='about'?<About/>:page==='partners'?<Partners/>:page==='privacy'?<Privacy/>:<NotFound/>}</main><Footer/><DetailDialog modal={modal} onClose={closeModal}/><CommandPalette/><SelectionLink/><WindowOpen phase={phase} from={opener} onPhaseEnd={ended=>{if(ended==='out'){setPage(pending.current);setPhase('in')}else setPhase(ended==='in'?'settle':'idle')}}/></ClickBurstProvider></MotionLevelProvider></MotionConfig></LazyMotion>}
