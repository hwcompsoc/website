import {m} from 'motion/react';
import {RadioGroup,RadioGroupItem} from './ui/radio-group';
import {spring} from '../motion';
import {useMotionLevel} from '../motion/level';

// Single-choice filter (Events, Resources). The active background slides between options (MOTION-PLAN §8.4).
export function FilterOptions({id,label,options,value,onChange}:{id:string;label:string;options:string[];value:string;onChange:(value:string)=>void}){
 const level=useMotionLevel();
 return <RadioGroup value={value} onValueChange={onChange} aria-label={label} className="filter-options">{options.map(option=><label key={option} data-active={value===option}><RadioGroupItem value={option} className="sr-only"/>{value===option&&<m.span layoutId={`filter-${id}`} className="filter-indicator" transition={level==='full'?spring.layout:{duration:0}}/>}<span className="filter-label">{option}</span></label>)}</RadioGroup>;
}
