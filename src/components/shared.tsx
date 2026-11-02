import {type ReactNode,useEffect,useLayoutEffect,useRef} from 'react';
import {ArrowRight,ArrowUpRight} from 'lucide-react';
import {Button} from './ui/button';
import {pagePath,type Page,type View} from '../content';
import {Reveal} from '../motion/Reveal';
import {Typed} from '../motion/Typed';
import {Select} from '../motion/Select';

export const asset=(name:string)=>`/website-assets/${name}`;
export const external={target:'_blank',rel:'noopener noreferrer'} as const;
export const titles:Record<View,string>={notfound:'File not found',home:'Find your people.',join:'Join the community.',events:'What’s on',resources:'Guides and resources',about:'Built by students. For students.',partners:'Work with us'};
export function External({href,children,className=''}:{href:string;children:ReactNode;className?:string}){return <a href={href} {...external} className={className}>{children}<ArrowUpRight size={17} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>}
export function LinkButton({href,children,secondary=false}:{href:string;children:ReactNode;secondary?:boolean}){return <Button asChild className={secondary?'site-button secondary':'site-button'}><a href={href} {...external}>{children}<ArrowUpRight size={17} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></Button>}
// Page intro as a window: the title bar types the page's path as the wipe uncovers. `sub` retypes only the end of the path.
// The bar is decoration, so screen readers skip it.
export function Intro({path,sub='',status,title,heading,children}:{path:string;sub?:string;status?:ReactNode;title:string;heading?:ReactNode;children:ReactNode}){return <section className="page-intro"><div className="wrap"><div className="intro-window"><div className="window-bar" aria-hidden="true"><span className="window-name"><Typed text={`~/compsoc/${path}`} caret={!sub} speed={.02} delay={.15} trigger="mount"/>{sub&&<Typed key={sub} text={`/${sub}`} speed={.02} trigger="mount"/>}</span>{status&&<span className="window-meta">{status}</span>}</div><div className="intro-body"><Reveal as="h1" trigger="mount" delay={.15} lines={[heading??title]}/><p>{children}</p></div></div></div></section>}
// A small desktop window's title bar: three pixels, a filename that is selected while `selected`, and optional details on the right.
export function WindowBar({name,meta,selected}:{name:string;meta?:ReactNode;selected:boolean}){return <span className="window-bar"><span className="window-name"><Select mode="hover" trigger="manual" play={selected} className="select-strong">{name}</Select></span>{meta&&<span className="window-meta">{meta}</span>}</span>}
export function SectionHeading({label,title,action}:{label?:string;title:string;action?:ReactNode}){return <div className="section-heading"><div>{label&&<span className="eyebrow">{label}</span>}<Reveal as="h2" lines={[title]}/></div>{action}</div>}
// A heading that rises out of its mask as it scrolls in.
export function RevealHeading({children,id,as='h2'}:{children:string;id?:string;as?:'h2'|'h3'}){return <Reveal as={as} id={id} lines={[children]}/>}
export function RouteLink({page,children,className=''}:{page:Page;children:ReactNode;className?:string}){return <a href={pagePath(page)} className={`text-link ${className}`}>{children}<ArrowRight size={17} aria-hidden="true"/></a>}
// Pages that shouldn't appear in search results.
export function useNoindex(){useEffect(()=>{const meta=document.createElement('meta');meta.name='robots';meta.content='noindex';document.head.append(meta);return()=>meta.remove()},[])}
// Sample-content marker: a mono tag inline with the note, not a banner.
export function SampleNote({children}:{children:ReactNode}){return <p className="sample-note"><span className="sample-tag">Sample</span>{children}</p>}
// Our dialogs and the mobile menu are opened from code, not Radix triggers, and Radix doesn't hand focus back on its own here:
// remember what had focus when one opened (a row, card or button) and return to it on close, so keyboard users carry on from there.
// Skipped when something else already took focus (picking a page in the menu moves focus to the new page's main).
export function useReturnFocus(open:boolean){const opener=useRef<HTMLElement|null>(null);
 useLayoutEffect(()=>{if(open){opener.current=document.activeElement as HTMLElement|null;return}const el=opener.current;opener.current=null;requestAnimationFrame(()=>{if(el?.isConnected&&(!document.activeElement||document.activeElement===document.body))el.focus({preventScroll:true})})},[open])}
