import {committeePeople,discordMembers,events,resources} from '../content';
import {asset} from './shared';

// The society at a glance, laid out like `neofetch`: the pixel cursor where the distro logo goes, key: value lines, and the colour row.
// Every number comes from the site's own content (the Discord count from the last build), and a line with nothing to say is left out.
// It's static: the page intro already has the moment on this screen.
const swatches=['--panel','--ink','--select-strong','--select','--accent-text','--text-quiet','--line-strong','--tint'];
export function Neofetch(){const upcoming=events.filter(e=>!e.past&&!e.cancelled);const next=upcoming[0];
 const lines:[string,string][]=([
  ['society','Computer Science Society'],
  ['university','Heriot-Watt'],
  ['committee',committeePeople.length?`${committeePeople.length} ${committeePeople.length===1?'person':'people'}`:''],
  ['discord',discordMembers?`${discordMembers.toLocaleString('en-GB')} members`:''],
  ['upcoming',upcoming.length?`${upcoming.length} ${upcoming.length===1?'event':'events'}`:''],
  ['next',next?`${next.title}, ${next.weekday.slice(0,1)}${next.weekday.slice(1).toLowerCase()} ${Number(next.day)} ${next.month.slice(0,1)}${next.month.slice(1).toLowerCase()}`:''],
  ['guides',resources.length?String(resources.length):''],
  ['membership','free, through the HW Union'],
  ['experience','none needed'],
 ] as [string,string][]).filter(([,value])=>value);
 return <div className="fetch-window"><div className="window-bar" aria-hidden="true"><span className="window-name">~/compsoc $ neofetch</span></div>
  <div className="fetch-body"><span className="fetch-art" aria-hidden="true"><img className="fetch-art-light" src={asset('cursor-blue.svg')} alt="" width={134} height={207}/><img className="fetch-art-dark" src={asset('cursor-white.svg')} alt="" width={134} height={207}/></span>
   <div className="fetch-info"><p className="fetch-host"><b>compsoc</b>@<b>heriot-watt</b></p><span className="fetch-rule" aria-hidden="true">-------------------</span>
    <dl>{lines.map(([key,value])=><div key={key}><dt>{key}:</dt><dd>{value}</dd></div>)}</dl>
    <span className="fetch-swatches" aria-hidden="true">{swatches.map(name=><span key={name} style={{background:`var(${name})`}}/>)}</span></div></div></div>}
