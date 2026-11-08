import {useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,Check,Copy,Download} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverContent,PopoverTrigger} from './ui/popover';
import {type CalendarLink} from '../calendar';
import {Copied,useCopy} from './copy';

// Copying is the way in for any calendar app the links don't cover. The address stays on show, in case the browser won't copy.
// It sits in a field, so a copy selects it for real (in the site's selection colour) rather than flashing a copy over it.
function CopyLink({value}:{value:string}){const {copy:copyText,copied,failed}=useCopy(1800);const field=useRef<HTMLInputElement>(null);
 async function copy(){field.current?.select();await copyText(value)}
 return <div className="calendar-copy"><label htmlFor="calendar-address">Or add this address to your calendar app</label><input id="calendar-address" ref={field} readOnly value={value} onFocus={e=>e.target.select()}/><Button type="button" variant="outline" size="sm" onClick={copy}>{copied?<Check aria-hidden="true"/>:<Copy aria-hidden="true"/>}{copied?<Copied/>:'Copy link'}</Button><span role="status" className="sr-only">{copied?'Address copied.':failed?'Copying isn’t available here. Select the address and copy it by hand.':''}</span></div>}

export function CalendarMenu({label,links,copy,icon,className}:{label:string;links:CalendarLink[];copy?:string;icon?:ReactNode;className?:string}){const [open,setOpen]=useState(false);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" className={className}>{icon}{label}</Button></PopoverTrigger><PopoverContent align="start" collisionPadding={16} className="website-popover calendar-menu" onOpenAutoFocus={e=>{e.preventDefault();(e.currentTarget as HTMLElement|null)?.querySelector('a')?.focus()}}>
  <ul>{links.map(link=><li key={link.label}><a href={link.href} download={link.download} {...link.external?{target:'_blank',rel:'noopener noreferrer'}:{}} onClick={()=>setOpen(false)}>{link.label}{link.download?<Download aria-hidden="true"/>:link.external?<><ArrowUpRight aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></>:null}</a></li>)}</ul>
  {copy&&<CopyLink value={copy}/>}
 </PopoverContent></Popover>}
