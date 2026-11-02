import {ArrowRight} from 'lucide-react';
import {Button} from '../components/ui/button';
import {events,resources,type Event} from '../content';
import {SectionHeading,RevealHeading,RouteLink,WindowBar} from '../components/shared';
import {Hero} from '../components/Hero';
import {EventBoard} from '../components/EventBoard';
import {ValueList} from '../components/ValueList';
import {useState} from 'react';
import {pagePath,type Page} from '../content';
import {FlipText} from '../motion/FlipText';

// Quick link: a selection sweep fills the row and its number flips on hover or keyboard focus.
function JourneyLink({page,num,title,text}:{page:Page;num:string;title:string;text:string}){const [flips,setFlips]=useState(0);const flip=()=>setFlips(n=>n+1);return <a href={pagePath(page)} onPointerEnter={flip} onFocus={flip}><FlipText value={num} replay={flips} trigger="manual" play={flips>0}/><div><b>{title}</b><small>{text}</small></div><ArrowRight aria-hidden="true"/></a>}

const coming=events.filter(e=>!e.past).slice(0,2);

// Resource stack row: a small window that lifts with a hard shadow and selects its filename on hover or focus.
function StackLink({href,name,meta,children}:{href:string;name:string;meta:string;children:string}){const [over,setOver]=useState(false);const on={onPointerEnter:()=>setOver(true),onPointerLeave:()=>setOver(false),onFocus:()=>setOver(true),onBlur:()=>setOver(false)};return <a href={href} aria-label={children} {...on}><WindowBar name={name} meta={meta} selected={over}/><span className="stack-body"><span>{children}</span><ArrowRight aria-hidden="true"/></span></a>}
// Each category of guide, skipped if it has none.
const stack=[{category:'Learning',label:'Learn the basics'},{category:'Community',label:'Make a contribution'},{category:'Support',label:'Find the right support'}];
export function Home({onEvent}:{onEvent:(event:Event,origin:DOMRect)=>void}){return <><Hero/><div className="wrap"><section className="journey-strip" aria-label="Start exploring"><JourneyLink page="join" num="01" title="Join the community" text="Discord, socials & membership"/><JourneyLink page="events" num="02" title="See what’s on" text="Meet, learn & try something"/><JourneyLink page="resources" num="03" title="Find a guide" text="Guides & useful starting points"/></section><section className="site-section"><SectionHeading title="Why people join"/><ValueList items={[{title:'Meet people outside your course.',text:'Get to know students from other years and subjects who are into the same things. You don’t need a project or an introduction ready.'},{title:'Learn by building things.',text:'Try ideas out, ask the obvious questions and get better alongside people who are figuring it out too.'},{title:'See where computing can take you.',text:'Hear from people working in tech and find different routes into it.'}]}/></section><section className="site-section"><SectionHeading label="On the calendar" title="What’s coming up" action={<RouteLink page="events">Explore events</RouteLink>}/>{coming.length?<EventBoard events={coming} onOpen={onEvent}/>:<p>Nothing announced right now. Check Discord for what’s next.</p>}</section><section className="site-section home-resources"><div><RevealHeading>Guides for when you’re stuck</RevealHeading><p>Beginner guides, notes from workshops and pointers to the right support.</p><RouteLink page="resources">Find a resource</RouteLink></div><div className="resource-stack">{stack.map(({category,label})=>{const count=resources.filter(r=>r.category===category).length;return count>0&&<StackLink key={category} href={`/resources?category=${category.toLowerCase()}`} name={`${category.toLowerCase()}/`} meta={`${count} file${count===1?'':'s'}`}>{label}</StackLink>})}</div></section><section className="site-section partner-callout"><div><RevealHeading>Working with CompSoc</RevealHeading><p>If your organisation would like to give a talk, support a workshop or help with a student project, get in touch.</p></div><Button asChild className="site-button"><a href={pagePath('partners')}>Explore partnerships<ArrowRight aria-hidden="true"/></a></Button></section></div></>}
