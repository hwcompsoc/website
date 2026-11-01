import {useRef,useState} from 'react';
import {Camera,Check,Copy,Info,MessageCircle} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {links,pages,type Page} from '../content';
import {LinkButton,RevealHeading,RouteLink} from './shared';
import {m} from 'motion/react';
import {usePointerLean} from '../motion/usePointerLean';
import {PixelBuild} from '../motion/PixelBuild';
import {Typed} from '../motion/Typed';
import {Logo} from './Logo';

// The page's last screen: a clear closing action, contact in one line, then a quiet row of logo, tagline and links
// (the full nav already lives in the header). The logo leans toward the mouse; "Email copied" types out.
// Join hides the closing section: that page has just asked the same thing in its steps.
// The closing section is .footer-hello, not .footer-cta: ad blockers' annoyance lists hide .footer-cta outright.
// The copy button is icon-only until used (its label stays for screen readers and as a tooltip).
// The tick and button label confirm a copy on screen; the status line repeats it for screen readers only, and is shown only on failure.
export function Footer({page}:{page:Page}){const logo=useRef<HTMLSpanElement>(null);const lean=usePointerLean(logo,true,{distance:4,angle:2});const [copied,setCopied]=useState(false);const [copyError,setCopyError]=useState(false);async function copy(){try{await navigator.clipboard.writeText(links.email);setCopied(true);setCopyError(false)}catch{setCopyError(true)}}
 return <footer className="site-footer"><div className="wrap">
  {page!=='join'&&<section className="footer-hello" aria-labelledby="footer-hello-title"><div><RevealHeading id="footer-hello-title">Come and say hello.</RevealHeading><p>The quickest way in is the Discord.</p></div><div className="footer-actions"><LinkButton href={links.discord}><MessageCircle aria-hidden="true"/>Join the Discord</LinkButton><LinkButton href={links.instagram} secondary><Camera aria-hidden="true"/>Follow @hwcompsoc</LinkButton></div></section>}
  <div className="footer-contact"><a className="email-link" href={`mailto:${links.email}`}>{links.email}</a><Button variant="ghost" onClick={copy} className="footer-copy" title={copied?undefined:'Copy email address'}>{copied?<><Check aria-hidden="true"/><Typed text="Email copied" caret={false} trigger="mount"/></>:<><Copy aria-hidden="true"/><span className="sr-only">Copy email address</span></>}</Button><p role="status" className={copyError?'footer-status':'footer-status sr-only'}>{copyError?'Copy is unavailable here. Select the address or open your email app.':copied?'Email copied.':''}</p><p className="footer-partners">Thinking about supporting the society? <RouteLink page="partners">Let’s talk partnerships</RouteLink></p></div>
  <div className="footer-meta"><a href="#home" aria-label="HW CompSoc home" className="logo-link"><m.span ref={logo} style={lean.style} className="footer-logo-lean"><Logo tone="white" align="left" className="footer-logo"/></m.span></a><p className="footer-tagline">Computing. Community.<br/>A place to find your people.</p><nav className="footer-nav" aria-label="Footer navigation">{pages.filter(p=>p.id!=='home').map(p=><a key={p.id} href={`#${p.id}`}>{p.name}</a>)}</nav></div>
  <div className="footer-bottom"><span className="footer-legal"><span>Heriot-Watt Computer Science Society</span><span className="footer-sep" aria-hidden="true"> · </span><span>Local prototype</span></span><Popover><PopoverTrigger asChild><Button variant="ghost"><Info size={14} aria-hidden="true"/>About this prototype</Button></PopoverTrigger><PopoverContent className="website-popover"><PixelBuild trigger="mount" cols={6} rows={4} duration={.3}><h3>What’s real, what’s a preview.</h3><p>The branding, Discord, Instagram, Union destination and society email are supplied or confirmed links. Events, roles, guides and partnership content are samples. Enquiry drafts stay on this page. No live booking or form service is connected.</p></PixelBuild></PopoverContent></Popover></div>
 </div></footer>}
