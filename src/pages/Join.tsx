import {MessageCircle} from 'lucide-react';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion';
import {faqs,links} from '../content';
import {titles,External,Intro,LinkButton,SectionHeading,RevealHeading,RouteLink} from '../components/shared';
import {ValueList} from '../components/ValueList';
import {useEffect,useState} from 'react';
import {Select} from '../motion/Select';
import {useTrigger} from '../motion/level';
import {useClickBurst} from '../motion/ClickBurst';

// Step numbers are "clicked" in order as they scroll in: each number is selected with a small burst.
function StepNumber({num}:{num:string}){const fire=useClickBurst();const {ref,active}=useTrigger<HTMLSpanElement>('inView');const [clicked,setClicked]=useState(false);
 useEffect(()=>{if(!active)return;const timer=setTimeout(()=>{setClicked(true);const r=ref.current?.getBoundingClientRect();if(r)fire(r.left+r.width/2,r.top+r.height/2,{count:4})},200+(Number(num)-1)*150);return()=>clearTimeout(timer)},[active]);
 return <span ref={ref} className="step-number"><Select mode="persist" trigger="manual" play={clicked} className="select-strong">{num}</Select></span>}

export function Join(){return <><Intro path="join" status={<><span className="intro-online"/>3 steps in</>} title={titles.join}>Chat with us on Discord, follow us on Instagram, and become a member through the Heriot-Watt Union when you’re ready.</Intro><div className="wrap"><section className="site-section join-steps"><SectionHeading title="Your first week"/><ValueList number={num=><StepNumber num={num}/>} items={[{title:'Say hi on Discord',text:'Announcements and chat happen here, and it’s the easiest place to ask anything.',action:<><LinkButton href={links.discord}><MessageCircle aria-hidden="true"/>Join the Discord</LinkButton><span className="join-or">or <External href={links.instagram} className="text-link">follow us on Instagram</External></span></>},{title:'Come to one event',text:'Workshops, socials and talks. Pick whatever sounds interesting; no experience needed.',action:<RouteLink page="events">See what’s on</RouteLink>},{title:'Join through the Union',text:'Membership and any fees are handled by the Heriot-Watt Union, not the society.',action:<External href={links.membership} className="text-link">Official Union membership</External>}]}/></section>{faqs.length>0&&<section className="site-section two-column"><div><RevealHeading>Questions people ask</RevealHeading><p>Bring an interest in computing, a question or just yourself. Communities work because people have different experiences to share.</p></div><div><Accordion type="single" collapsible>{faqs.map(({id,question,answer})=><AccordionItem key={id} value={id}><AccordionTrigger><span className="faq-q">{question}</span></AccordionTrigger><AccordionContent>{answer}</AccordionContent></AccordionItem>)}</Accordion></div></section>}</div></>}
