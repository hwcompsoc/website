import {type ReactNode} from 'react';
import {Reveal} from '../motion/Reveal';
import {FlipText} from '../motion/FlipText';

// Numbered big-type list, replacing the icon-card grid: pixel number, large title, body alongside.
// Rows reveal as they scroll in: the number flips and the title rises.
// `action` puts a link under the text (Join's steps); `number` replaces the flipping number.
// `plain` leaves the numbers off, for lists that aren't in any order.
export function ValueList({items,number,plain=false}:{items:{title:string;text:string;action?:ReactNode}[];number?:(num:string)=>ReactNode;plain?:boolean}){
 const List=plain?'ul':'ol';return <List className={plain?'value-list value-list-plain':'value-list'}>{items.map(({title,text,action},i)=>{const num=String(i+1).padStart(2,'0');return <li key={title}>{!plain&&<span className="value-num" aria-hidden="true">{number?number(num):<FlipText value={num}/>}</span>}<Reveal as="h3" lines={[title]} delay={i*.08}/>{action?<div className="value-body"><p>{text}</p><div className="value-action">{action}</div></div>:<p>{text}</p>}</li>})}</List>;
}
