import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,MessageCircle,Menu} from 'lucide-react';
import {Button} from './ui/button';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './ui/sheet';
import {links,pagePath,pages,type View} from '../content';
import {LinkButton,useReturnFocus} from './shared';
import {m,useMotionValueEvent,useScroll} from 'motion/react';
import {ease,spring} from '../motion';
import {useMotionLevel} from '../motion/level';
import {PixelBuild} from '../motion/PixelBuild';
import {ScrollProgress} from '../motion/ScrollProgress';
import {Logo} from './Logo';
import {ThemeSwitch} from './ThemeSwitch';

// Active nav item: a selection block that slides between links. The mobile menu opens behind a pixel wipe;
// its links slide in on a full transform (not motion's x), which motion can run on the GPU.
// The bar slides away while scrolling down past the hero and returns on any scroll up.
export function Header({page}:{page:View}){const level=useMotionLevel();const [open,setOpen]=useState(false);useReturnFocus(open);const {scrollY}=useScroll();const [bar,setBar]=useState({hidden:false,scrolled:false});useMotionValueEvent(scrollY,'change',y=>{const previous=scrollY.getPrevious()??0;const next={hidden:y>160&&y>previous,scrolled:y>4};setBar(old=>old.hidden===next.hidden&&old.scrolled===next.scrolled?old:next)});useEffect(()=>setOpen(false),[page]);return <><header className="site-header" data-hidden={(bar.hidden&&!open)||undefined} data-scrolled={bar.scrolled||undefined}><div className="wrap header-inner"><a href="/" aria-label="HW CompSoc home" className="logo-link"><Logo tone="blue" className="site-logo"/></a><nav aria-label="Main navigation">{pages.filter(p=>p.id!=='home').map(p=><a key={p.id} href={pagePath(p.id)} aria-current={page===p.id?'page':undefined}>{page===p.id&&<m.span layoutId="nav-select" className="nav-select" transition={level==='full'?spring.layout:{duration:0}}/>}<span className="nav-label">{p.name}</span></a>)}</nav><ThemeSwitch/><Button asChild className="site-button header-join burst-press"><a href="/join">Find your community<ArrowUpRight aria-hidden="true" size={17}/></a></Button><Button variant="outline" className="mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu/></Button></div><ScrollProgress/></header><Sheet open={open} onOpenChange={setOpen}><SheetContent className="website-sheet"><PixelBuild className="sheet-build" cover="var(--panel)" cols={4} rows={12} order="diagonal-reverse" duration={.35} trigger="mount">{null}</PixelBuild><SheetHeader><SheetTitle>Explore HW CompSoc</SheetTitle><SheetDescription>Your community, events and next steps.</SheetDescription></SheetHeader><nav className="mobile-links" aria-label="Mobile navigation">{pages.map((p,i)=><m.a key={p.id} href={pagePath(p.id)} aria-current={p.id===page?'page':undefined} onClick={()=>setOpen(false)} initial={level==='full'?{opacity:0,transform:'translateX(16px)'}:false} animate={{opacity:1,transform:'translateX(0px)'}} transition={{delay:.15+i*.04,duration:.2,ease:ease.enter}}>{p.name}<ArrowRight aria-hidden="true"/></m.a>)}</nav><ThemeSwitch labelled/><LinkButton href={links.discord}><MessageCircle aria-hidden="true"/>Join the Discord</LinkButton></SheetContent></Sheet></>}
