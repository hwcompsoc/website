import {useId,useSyncExternalStore} from 'react';
import {m} from 'motion/react';
import {Monitor,Moon,Sun} from 'lucide-react';
import {getThemeChoice,setThemeChoice,subscribeTheme,type ThemeChoice} from '../theme';
import {spring} from '../motion';
import {useMotionLevel} from '../motion/level';

const options:{value:ThemeChoice;label:string;Icon:typeof Sun}[]=[{value:'system',label:'System',Icon:Monitor},{value:'light',label:'Light',Icon:Sun},{value:'dark',label:'Dark',Icon:Moon}];

// System / Light / Dark. Native radios, so arrow keys and screen readers work without extra code. Icons only in the header; `labelled` shows words in the mobile menu.
// The active block slides between options, as the Events filter does. Each switch has its own layoutId, because the header's stays mounted while the mobile menu's is open.
export function ThemeSwitch({labelled=false}:{labelled?:boolean}){
 const choice=useSyncExternalStore(subscribeTheme,getThemeChoice);const name=useId();const level=useMotionLevel();
 return <fieldset className="theme-switch" data-labelled={labelled||undefined}><legend className="sr-only">Theme</legend>{options.map(({value,label,Icon})=><label key={value} title={label} data-active={choice===value||undefined}><input type="radio" className="sr-only" name={name} value={value} checked={choice===value} onChange={()=>setThemeChoice(value)}/>{choice===value&&<m.span layoutId={`theme-${name}`} className="filter-indicator" transition={level==='full'?spring.layout:{duration:0}}/>}<span className="theme-label"><Icon size={16} aria-hidden="true"/><span className={labelled?undefined:'sr-only'}>{label}</span></span></label>)}</fieldset>;
}
