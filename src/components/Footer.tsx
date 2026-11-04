import {useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
import {Button} from './ui/button';
import {links,menuPages,pagePath} from '../content';
import {External} from './shared';
import {Typed} from '../motion/Typed';
import {Logo} from './Logo';

const COPIED_MS=3000;
// Compact and the same on every page, so contact and legal links stay where people expect them. Two rows only: where to go, then who we are and how to reach us.
// Nothing here collapses, and every standalone link is a 44px target. Page content, such as invitations to join, belongs on the pages themselves.
// "Email copied" types out.
// The copy button is icon-only until used (its label stays for screen readers and as a tooltip), and returns to that a few seconds after a copy.
// The tick and button label confirm a copy on screen; the status line repeats it for screen readers only, and is shown only on failure.
export function Footer(){const [copied,setCopied]=useState(false);const [copyError,setCopyError]=useState(false);const timer=useRef<number|undefined>(undefined);useEffect(()=>()=>window.clearTimeout(timer.current),[]);async function copy(){window.clearTimeout(timer.current);try{await navigator.clipboard.writeText(links.email);setCopied(true);setCopyError(false);timer.current=window.setTimeout(()=>setCopied(false),COPIED_MS)}catch{setCopied(false);setCopyError(true)}}
 return <footer className="site-footer"><div className="wrap">
  <div className="footer-main"><a href="/" aria-label="HW CompSoc home" className="logo-link"><Logo tone="white" align="left" className="footer-logo"/></a><nav className="footer-nav" aria-label="Footer navigation">{menuPages.filter(p=>p.id!=='home').map(p=><a key={p.id} href={pagePath(p.id)}>{p.name}</a>)}</nav></div>
  <div className="footer-bottom"><div className="footer-contact"><a className="email-link" href={`mailto:${links.email}`}>{links.email}</a><Button variant="ghost" onClick={copy} className="footer-copy" title={copied?undefined:'Copy email address'}>{copied?<><Check aria-hidden="true"/><Typed text="Email copied" caret={false} trigger="mount"/></>:<><Copy aria-hidden="true"/><span className="sr-only">Copy email address</span></>}</Button><p role="status" className={copyError?'footer-status':'footer-status sr-only'}>{copyError?'Copy is unavailable here. Select the address or open your email app.':copied?'Email copied.':''}</p></div>
   <div className="footer-legal"><span className="footer-copyright">© {new Date().getFullYear()} Heriot-Watt Computer Science Society</span><External href={links.membership}>Affiliated to HW Union</External><a href="/privacy">Privacy</a></div></div>
 </div></footer>}
