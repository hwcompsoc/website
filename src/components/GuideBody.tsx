import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useClickBurst} from '../motion/ClickBurst';
import {Typed} from '../motion/Typed';
import {Checkbox} from './ui/checkbox';
import {Progress} from './ui/progress';
import {Check,Copy} from 'lucide-react';
import {parseGuide,type Block,type Inline} from '../guide-format';
import {Copied,CopyFlash,useCopy} from './copy';

export const inline=(parts:Inline[]):ReactNode=>parts.map((part,i)=>part.kind==='code'?<code key={i}>{part.text}</code>:part.kind==='bold'?<strong key={i}>{part.text}</strong>:part.kind==='link'?<a key={i} className="guide-link" href={part.href} {...part.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{}}>{part.text}{part.href.startsWith('https:')&&<span className="sr-only"> (opens in a new tab)</span>}</a>:<span key={i}>{part.text}</span>);

// A personal prompt: it stays in the open guide and nothing is saved or sent. Ticking the last box fires a burst at the end of the bar and types "All done."
function Checklist({items}:{items:string[]}){const [done,setDone]=useState<number[]>([]);const fire=useClickBurst();const bar=useRef<HTMLDivElement>(null);const complete=done.length===items.length;
 useEffect(()=>{if(!complete)return;const box=bar.current?.getBoundingClientRect();if(box)fire(box.right,box.top+box.height/2,{count:6})},[complete]);
 return <><Progress ref={bar} value={done.length/items.length*100} aria-label="Guide checklist completion" aria-valuetext={`${done.length} of ${items.length} prompts checked`}/><p className="small" role="status">{done.length} of {items.length} prompts checked{complete&&<>. <Typed text="All done." caret={false} trigger="mount"/></>}</p>{items.map((item,i)=><label className="checkbox-label guide-check" key={i}><Checkbox checked={done.includes(i)} onCheckedChange={value=>setDone(old=>value===true?[...old,i]:old.filter(v=>v!==i))}/>{item}</label>)}</>}

// A code block as a small terminal window with a Copy button. A copy flash-selects the code and "Copied" types out.
function CodeBlock({text}:{text:string}){const {copy,count,copied,failed}=useCopy();
 return <div className="code-window"><div className="code-bar"><span aria-hidden="true">snippet</span><button type="button" className="code-copy" onClick={()=>copy(text)}>{copied?<><Check aria-hidden="true"/><Copied/></>:<><Copy aria-hidden="true"/>Copy<span className="sr-only"> code</span></>}</button><span role="status" className="sr-only">{copied?'Code copied.':failed?'Copying isn’t available here. Select the code and copy it by hand.':''}</span></div><pre tabIndex={0}><code><CopyFlash text={text} count={count}/></code></pre></div>}

function BlockView({block}:{block:Block}){switch(block.kind){
 case 'heading':return block.level===2?<h3>{inline(block.text)}</h3>:<h4>{inline(block.text)}</h4>;
 case 'paragraph':return <p>{inline(block.text)}</p>;
 case 'list':{const items=block.items.map((item,i)=><li key={i}>{inline(item)}</li>);return block.ordered?<ol className="guide-list">{items}</ol>:<ul className="guide-list">{items}</ul>}
 case 'checklist':return <Checklist items={block.items}/>;
 case 'code':return <CodeBlock text={block.text}/>}}

export function GuideBody({source}:{source:string}){const blocks=useMemo(()=>parseGuide(source),[source]);return <>{blocks.map((block,i)=><BlockView key={i} block={block}/>)}</>}
