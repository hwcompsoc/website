import {Fragment,useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type MouseEvent} from 'react';
import {ArrowDown,ArrowUp} from 'lucide-react';
import {m} from 'motion/react';
import {Button} from './ui/button';
import {External} from './shared';
import {spring} from '../motion';
import {useMotionLevel} from '../motion/level';
import {PixelBuild} from '../motion/PixelBuild';
import {Typed} from '../motion/Typed';
import {FlipText} from '../motion/FlipText';
import {onRouteChange} from '../router';
import {anchor,committee,committeePeople,initials,links,type Person} from '../content';
import {Copied,CopyFlash,useCopy} from './copy';

// The committee as a code editor: a file tree of people on the left, and whoever's selected open on the right. On phones the
// profile opens in place under their name. Every person has their own address (`/about#kevin-paul-job`), and a role's address
// (`/about#treasurer`) opens whoever holds it. Everything optional is left out when empty, so the lines number themselves.
const NARROW='(max-width:800px)';
const subscribeNarrow=(change:()=>void)=>{const query=matchMedia(NARROW);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)};
const isNarrow=()=>matchMedia(NARROW).matches;
const fromHash=()=>{const hash=decodeURIComponent(location.hash.slice(1));return committeePeople.find(person=>person.slug===hash)??committeePeople.find(person=>anchor(person.role)===hash)};
// Where to go to reach a role. Only real routes, so people can act on who does what.
const reach=(role:string)=>role==='Industry Liaison'?{href:'/partners#enquiry',label:'talk about partnering'}:role==='Community Manager'?{href:links.discord,label:'say hi on Discord',external:true}:null;

function Face({person,className}:{person:Person;className:string}){return person.photo?<img className={className} src={person.photo} alt="" width={200} height={200} loading="lazy"/>:<span className={`${className} cx-initials`} aria-hidden="true">{initials(person.name)}</span>}

// If copying fails, the name is still on screen to select by hand.
function CopyHandle({handle}:{handle:string}){const {copy,count,copied}=useCopy();
 return <button type="button" className="cx-handle" onClick={()=>copy(handle)}><span className="sr-only">Copy Discord username </span><CopyFlash text={`@${handle}`} count={count}/><span className="cx-copied" aria-live="polite">{copied&&<> <Copied text="copied"/></>}</span></button>}

function Line({name,children}:{name:string;children:React.ReactNode}){return <div className="cx-line"><dt>{name}:</dt><dd>{children}</dd></div>}

// Opening someone's file types its values in, like an editor loading it. Each line finishes within TYPE_LINE seconds and starts
// LINE_GAP after the one above, so a whole profile is done in about 0.6s. Values too long to type appear at once; the bio is body text, so it never types.
const TYPE_LINE=.3,LINE_GAP=.05,TYPE_MAX=60;
function Value({text,line,typing}:{text:string;line:number;typing:boolean}){return <Typed text={text} caret={false} trigger="inView" instant={!typing||text.length>TYPE_MAX} speed={Math.min(.02,TYPE_LINE/text.length)} delay={line*LINE_GAP}/>}

// `typing` is off on phones, where the profile opens inline and only the filename types.
function Profile({person,typing}:{person:Person;typing:boolean}){const contact=reach(person.role);let line=0;const value=(text:string)=><Value text={text} line={line++} typing={typing}/>;const empty=!person.bio&&!person.studies&&!person.askMeAbout&&!person.discord&&!person.github&&!person.linkedin;const details=!!(person.studies||person.askMeAbout||person.discord||person.github||person.linkedin||contact);
 return <><div className="cx-head"><PixelBuild className="cx-photo" cols={6} rows={6} duration={.4} key={person.slug}><Face person={person} className="cx-photo-face"/></PixelBuild><div className="cx-title"><span className="cx-role">{person.title}</span><h3>{person.name}</h3></div>{person.bio&&<p className="cx-bio">{person.bio}<span className="caret" aria-hidden="true"/></p>}</div>
  <div className="cx-code">{person.text&&<p className="cx-line cx-comment"><span aria-hidden="true"># </span>{person.text}</p>}{empty&&<p className="cx-line cx-comment"><span aria-hidden="true"># </span>Profile coming soon</p>}
  {details&&<dl>{person.studies&&<Line name="studies">{value(person.studies)}</Line>}{person.askMeAbout&&<Line name="ask_me_about">{value(person.askMeAbout)}</Line>}{person.discord&&<Line name="discord"><CopyHandle handle={person.discord}/></Line>}{person.github&&<Line name="github"><External href={`https://github.com/${person.github}`} className="cx-link">{value(person.github)}<span className="sr-only"> on GitHub</span></External></Line>}{person.linkedin&&<Line name="linkedin"><External href={`https://www.linkedin.com/in/${person.linkedin}`} className="cx-link">{value(person.linkedin)}<span className="sr-only"> on LinkedIn</span></External></Line>}{contact&&<Line name="reach_me">{contact.external?<External href={contact.href} className="cx-link">{value(contact.label)}</External>:<a className="cx-link" href={contact.href}>{value(contact.label)}</a>}</Line>}</dl>}</div></>}

export function CommitteeExplorer(){const level=useMotionLevel();const narrow=useSyncExternalStore(subscribeNarrow,isNarrow);const [selected,setSelected]=useState<Person|undefined>(()=>fromHash()??committeePeople[0]);const tree=useRef<HTMLUListElement>(null);const keepInView=useRef<{slug:string;top:number}|null>(null);
 useEffect(()=>{const follow=()=>{const person=fromHash();if(person)setSelected(person)};window.addEventListener('hashchange',follow);const stop=onRouteChange(follow);return()=>{window.removeEventListener('hashchange',follow);stop()}},[]);
 // On a phone, the profile that closes can be above the name just tapped, so the page is moved to keep that name where it was.
 useLayoutEffect(()=>{const kept=keepInView.current;keepInView.current=null;if(!kept)return;const row=tree.current?.querySelector<HTMLElement>(`[data-slug="${kept.slug}"]`);if(row)window.scrollBy({top:row.getBoundingClientRect().top-kept.top,behavior:'instant'})},[selected]);
 if(!selected)return null;
 const at=committeePeople.indexOf(selected);
 function choose(person:Person,row?:HTMLElement|null){if(narrow&&row)keepInView.current={slug:person.slug,top:row.getBoundingClientRect().top};setSelected(person);history.replaceState(history.state,'',`${location.pathname}${location.search}#${person.slug}`)}
 function click(event:MouseEvent<HTMLAnchorElement>,person:Person){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();choose(person,event.currentTarget)}
 function move(by:number){choose(committeePeople[(at+by+committeePeople.length)%committeePeople.length])}
 function keys(event:KeyboardEvent<HTMLUListElement>){const rows=[...tree.current!.querySelectorAll<HTMLAnchorElement>('a.cx-row')];const now=rows.indexOf(document.activeElement as HTMLAnchorElement);if(now<0)return;const next=event.key==='ArrowDown'?Math.min(now+1,rows.length-1):event.key==='ArrowUp'?Math.max(now-1,0):event.key==='Home'?0:event.key==='End'?rows.length-1:-1;if(next<0)return;event.preventDefault();const person=committeePeople.find(candidate=>candidate.slug===rows[next].dataset.slug);if(person){choose(person);rows[next].focus()}}
 const row=(person:Person,glyph:string,deep:boolean)=><li key={person.slug}><a className="cx-row" data-deep={deep||undefined} data-selected={person===selected||undefined} data-slug={person.slug} href={`/about#${person.slug}`} aria-current={person===selected?'true':undefined} onClick={event=>click(event,person)}>{person===selected&&!narrow&&<m.span layoutId="committee-select" className="cx-select" transition={level==='full'?spring.layout:{duration:0}}/>}{person===selected&&narrow&&<span className="cx-select"/>}<span className="cx-glyph" aria-hidden="true">{glyph}</span><Face person={person} className="cx-face"/><span className="cx-text"><b>{person.name}</b><small>{person.title}</small></span></a>{narrow&&person===selected&&<div className="cx-pane"><div className="cx-tabs"><span className="cx-tab"><Typed key={person.slug} text={person.file} caret={false} speed={.02} trigger="inView"/></span></div><Profile key={person.slug} person={person} typing={false}/></div>}</li>;
 return <div className="cx-window"><div className="window-bar cx-bar"><span className="window-name">~/compsoc/committee</span><span className="window-meta">{committeePeople.length} {committeePeople.length===1?'person':'people'}</span></div>
  {/* Hidden targets for addresses, so arriving at someone brings the whole window into view rather than just their row. */}
  {[...new Set([...committeePeople.map(person=>person.slug),...committee.map(team=>anchor(team.role))])].map(id=><span key={id} id={id} className="cx-target" aria-hidden="true"/>)}
  <p className="sr-only" role="status">Showing {selected.name}, {selected.title}</p>
  <div className="cx-grid"><div className="cx-tree"><div className="cx-root" aria-hidden="true">▾ committee/</div><ul ref={tree} aria-label="Committee members" onKeyDown={keys}>{committee.map((team,i)=>{const last=i===committee.length-1;const people=committeePeople.filter(person=>person.role===team.role);return team.members.length>1?<li key={team.role}><div className="cx-dir"><span className="cx-glyph" aria-hidden="true">{last?'└─':'├─'}</span><span><span aria-hidden="true">▾ </span>{anchor(team.role)}/</span><small>{people.length}</small></div><ul>{people.map((person,j)=>row(person,`${last?'   ':'│  '}${j===people.length-1?'└─':'├─'}`,true))}</ul></li>:<Fragment key={team.role}>{people.map(person=>row(person,last?'└─':'├─',false))}</Fragment>})}</ul></div>
  {!narrow&&<div className="cx-pane"><div className="cx-tabs"><span className="cx-tab"><Typed key={selected.slug} text={selected.file} caret={false} speed={.02} trigger="inView"/></span><span className="cx-nav"><Button type="button" variant="ghost" size="icon" aria-label="Previous person" onClick={()=>move(-1)}><ArrowUp aria-hidden="true"/></Button><Button type="button" variant="ghost" size="icon" aria-label="Next person" onClick={()=>move(1)}><ArrowDown aria-hidden="true"/></Button></span></div><Profile key={selected.slug} person={selected} typing/><div className="cx-status" aria-hidden="true"><span><FlipText value={String(at+1)}/> of {committeePeople.length}</span><span>↑ ↓ to browse</span></div></div>}</div></div>}
