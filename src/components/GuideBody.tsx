import {useMemo,useState,type ReactNode} from 'react';
import {Checkbox} from './ui/checkbox';
import {Progress} from './ui/progress';
import {parseGuide,type Block,type Inline} from '../guide-format';

export const inline=(parts:Inline[]):ReactNode=>parts.map((part,i)=>part.kind==='code'?<code key={i}>{part.text}</code>:part.kind==='bold'?<strong key={i}>{part.text}</strong>:part.kind==='link'?<a key={i} className="guide-link" href={part.href} {...part.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{}}>{part.text}{part.href.startsWith('https:')&&<span className="sr-only"> (opens in a new tab)</span>}</a>:<span key={i}>{part.text}</span>);

// A personal prompt: it stays in the open guide and nothing is saved or sent.
function Checklist({items}:{items:string[]}){const [done,setDone]=useState<number[]>([]);return <><Progress value={done.length/items.length*100} aria-label="Guide checklist completion" aria-valuetext={`${done.length} of ${items.length} prompts checked`}/><p className="small" role="status">{done.length} of {items.length} prompts checked</p>{items.map((item,i)=><label className="checkbox-label guide-check" key={i}><Checkbox checked={done.includes(i)} onCheckedChange={value=>setDone(old=>value===true?[...old,i]:old.filter(v=>v!==i))}/>{item}</label>)}</>}

function BlockView({block}:{block:Block}){switch(block.kind){
 case 'heading':return block.level===2?<h3>{inline(block.text)}</h3>:<h4>{inline(block.text)}</h4>;
 case 'paragraph':return <p>{inline(block.text)}</p>;
 case 'list':{const items=block.items.map((item,i)=><li key={i}>{inline(item)}</li>);return block.ordered?<ol className="guide-list">{items}</ol>:<ul className="guide-list">{items}</ul>}
 case 'checklist':return <Checklist items={block.items}/>;
 case 'code':return <pre tabIndex={0}><code>{block.text}</code></pre>}}

export function GuideBody({source}:{source:string}){const blocks=useMemo(()=>parseGuide(source),[source]);return <>{blocks.map((block,i)=><BlockView key={i} block={block}/>)}</>}
