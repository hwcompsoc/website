import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion';
import {anchor,committee,faqs,links} from '../content';
import {inline} from '../components/GuideBody';
import {parseAnswer} from '../guide-format';
import {titles,External,Intro,SectionHeading,RevealHeading,RouteLink,WindowBar,DiscordButton} from '../components/shared';
import {Mascot} from '../components/Mascot';
import {ValueList} from '../components/ValueList';
import {useEffect,useState} from 'react';
import {Select} from '../motion/Select';
import {useTrigger} from '../motion/level';
import {useClickBurst} from '../motion/ClickBurst';
import {onRouteChange} from '../router';
import {PixelBuild} from '../motion/PixelBuild';

// Step numbers are "clicked" in order as they scroll in: each number is selected with a small burst.
function StepNumber({num}:{num:string}){const fire=useClickBurst();const {ref,active}=useTrigger<HTMLSpanElement>('inView');const [clicked,setClicked]=useState(false);
 useEffect(()=>{if(!active)return;const timer=setTimeout(()=>{setClicked(true);const r=ref.current?.getBoundingClientRect();if(r)fire(r.left+r.width/2,r.top+r.height/2,{count:4})},200+(Number(num)-1)*150);return()=>clearTimeout(timer)},[active]);
 return <span ref={ref} className="step-number"><Select mode="persist" trigger="manual" play={clicked} className="select-strong">{num}</Select></span>}

// A named person makes the first message on Discord less daunting. Left out if nobody holds the role.
const greeter=committee.find(team=>team.role==='Community Manager');
function SayHiTo(){const person=greeter?.members[0];if(!person)return null;return <p className="join-person">{person.photo&&<PixelBuild className="join-person-photo" cols={4} rows={4} order="scatter" duration={.25} delay={.5}><img src={person.photo} alt="" width={28} height={28} loading="lazy"/></PixelBuild>}<span>Say hi to <a href={`/about#${anchor(person.name)}`}>{person.name}</a>, our {greeter!.role}.</span></p>}
// The usual worries about joining, answered as a diff: each worry is taken out and the reality put in. Static, because it's body text.
// del and ins carry the meaning; the -/+ signs are decoration, so screen readers get a word for each line instead.
const worries=[
 ['I’d need to know how to code already.','No experience needed. Start with the community and come to whatever sounds interesting.'],
 ['It’s only for computer science students.','You’ll meet students from other years and subjects who are into the same things.'],
 ['I’d need to know someone there first.','You don’t need a project or an introduction ready. Say hi on Discord and we’ll point you the right way.'],
];
function Worries(){return <section className="site-section"><SectionHeading title="Things people worry about"/><div className="diff-window"><div aria-hidden="true"><WindowBar name="worries.diff" meta={`−${worries.length} +${worries.length}`} selected={false}/></div><ul className="diff-list">{worries.map(([before,after])=><li key={before}><del><span className="diff-sign" aria-hidden="true">-</span><span><span className="sr-only">Worry: </span>{before}</span></del><ins><span className="diff-sign" aria-hidden="true">+</span><span><span className="sr-only">Actually: </span>{after}</span></ins></li>)}</ul></div></section>}
// A question has its own address (/join#how-much-does-membership-cost), used by the site search: arriving there opens it.
// Without one, the first question starts open.
const openFromHash=()=>faqs.find(faq=>anchor(faq.question)===decodeURIComponent(location.hash.slice(1)))?.id;
function Questions(){const [open,setOpen]=useState(()=>openFromHash()??faqs[0]?.id??'');
 useEffect(()=>{const follow=()=>{const id=openFromHash();if(id)setOpen(id)};window.addEventListener('hashchange',follow);const stop=onRouteChange(follow);return()=>{window.removeEventListener('hashchange',follow);stop()}},[]);
 return <Accordion type="single" collapsible value={open} onValueChange={setOpen}>{faqs.map(({id,question,answer})=><AccordionItem key={id} value={id} id={anchor(question)}><AccordionTrigger><span className="faq-q">{question}</span></AccordionTrigger><AccordionContent>{inline(parseAnswer(answer))}</AccordionContent></AccordionItem>)}</Accordion>}
export function Join(){return <><Intro path="join" title={titles.join}>Chat with us on Discord, follow us on Instagram, and become a member through the Heriot-Watt Union when you’re ready. Membership is free.</Intro><div className="wrap"><section className="site-section join-steps"><SectionHeading title="Your first week"/><ValueList number={num=><StepNumber num={num}/>} items={[{title:'Say hi on Discord',text:'Announcements and chat happen here, and it’s the easiest place to ask anything.',action:<><div className="join-discord"><DiscordButton/><Mascot size="sm" line="See you in there!" className="join-byte"/></div><span className="join-or">or <External href={links.instagram} className="text-link">follow us on Instagram</External></span><SayHiTo/></>},{title:'Come to one event',text:'Workshops, socials and talks. Pick whatever sounds interesting; no experience needed.',action:<RouteLink page="events">See what’s on</RouteLink>},{title:'Join through the Union',text:'Membership is completely free. You sign up through the Heriot-Watt Union rather than the society.',action:<External href={links.membership} className="text-link">Official Union membership</External>}]}/></section><Worries/>{faqs.length>0&&<section className="site-section two-column"><div><RevealHeading>Questions people ask</RevealHeading><p>Bring an interest in computing, a question or just yourself. Communities work because people have different experiences to share.</p></div><div><Questions/></div></section>}</div></>}
