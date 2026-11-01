import {useId,useSyncExternalStore} from 'react';
import {Monitor,Moon,Sun} from 'lucide-react';
import {getThemeChoice,setThemeChoice,subscribeTheme,type ThemeChoice} from '../theme';

const options:{value:ThemeChoice;label:string;Icon:typeof Sun}[]=[{value:'system',label:'System',Icon:Monitor},{value:'light',label:'Light',Icon:Sun},{value:'dark',label:'Dark',Icon:Moon}];

// System / Light / Dark. Native radios, so arrow keys and screen readers work without extra code. Icons only in the header; `labelled` shows words in the mobile menu.
export function ThemeSwitch({labelled=false}:{labelled?:boolean}){
 const choice=useSyncExternalStore(subscribeTheme,getThemeChoice);const name=useId();
 return <fieldset className="theme-switch" data-labelled={labelled||undefined}><legend className="sr-only">Theme</legend>{options.map(({value,label,Icon})=><label key={value} title={label} data-active={choice===value||undefined}><input type="radio" className="sr-only" name={name} value={value} checked={choice===value} onChange={()=>setThemeChoice(value)}/><Icon size={16} aria-hidden="true"/><span className={labelled?undefined:'sr-only'}>{label}</span></label>)}</fieldset>;
}
