import {ArrowRight} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Item,ItemGroup,ItemContent,ItemTitle,ItemDescription,ItemActions} from '../components/ui/item';
import {Select} from '../motion/Select';
import {titles,Intro,SectionHeading,RevealHeading,RouteLink,SampleNote} from '../components/shared';
import {PixelBuild} from '../motion/PixelBuild';
import {committee,initials,type Member} from '../content';
import rd from '../committee/rd.webp';
import tp from '../committee/tp.webp';
import kp from '../committee/kp.webp';
import az from '../committee/az.webp';
import dh from '../committee/dh.webp';
import ar from '../committee/ar.webp';
import rs from '../committee/rs.webp';
import lmr from '../committee/lmr.webp';
import nw from '../committee/nw.webp';

const photos:Record<string,string>={rd,tp,kp,az,dh,ar,rs,lmr,nw};
// Committee headshot: the photo builds in from pixels; anyone without a photo gets their initials on a pixel tile.
// The name is always beside it, so the image itself is decorative.
function Headshot({member,delay}:{member:Member;delay:number}){return <PixelBuild className="headshot-build" cols={6} rows={6} duration={.4} delay={delay}>{member.photo?<img className="headshot" src={photos[member.photo]} alt="" width={96} height={96} loading="lazy"/>:<span className="headshot headshot-initials" aria-hidden="true">{initials(member.name)}</span>}</PixelBuild>}
export function About({onDocument}:{onDocument:(title:string)=>void}){return <><Intro path="about" title={titles.about} heading={<>Built by students. <Select mode="persist" trigger="mount" delay={.8}>For students.</Select></>}>CompSoc is Heriot-Watt’s computer science society, run by a student committee.</Intro><div className="wrap"><section className="site-section about-story"><div><p className="large-text">HW CompSoc is a place to connect around computing at Heriot-Watt—through conversation, shared learning and trying things together.</p><p>Whether you want to make friends, build confidence or explore what comes after university, the easiest place to start is the community.</p><RouteLink page="join">Find your way in</RouteLink></div></section><section className="site-section"><SectionHeading label="People who help things happen" title="The committee"/><SampleNote>Role descriptions are draft wording and need confirming by the committee.</SampleNote><div className="roles-grid">{committee.map(({role,text,members},i)=><article className={`role-card ${members.length>1?'team':''}`} key={role}><div className="role-people">{members.map((member,j)=><div className="role-person" key={member.name}><Headshot member={member} delay={(i+j)*.06}/>{members.length>1&&<span className="role-person-name">{member.name}</span>}</div>)}</div>{members.length>1?<h3>{role}</h3>:<><span className="role-label">{role}</span><h3>{members[0].name}</h3></>}<p>{text}</p></article>)}</div></section><section className="site-section two-column"><div><RevealHeading>Constitution and records</RevealHeading><p>Approved public documents should be easy to find, dated and clear about their status.</p></div><div><SampleNote>These previews explain the intended content. No approved records are represented.</SampleNote><ItemGroup>{['Constitution','AGM & elections','Public records'].map(title=><Item key={title} className="governance-item"><ItemContent><ItemTitle>{title}</ItemTitle><ItemDescription>Approved document and date pending</ItemDescription></ItemContent><ItemActions><Button variant="outline" onClick={()=>onDocument(title)}>Preview<span className="sr-only"> {title}</span><ArrowRight size={16}/></Button></ItemActions></Item>)}</ItemGroup></div></section></div></>}
