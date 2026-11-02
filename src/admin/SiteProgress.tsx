import {useLayoutEffect,useRef,useState,type Ref} from 'react';
import {m} from 'motion/react';
import {Check} from 'lucide-react';
import {dur,ease} from '../motion';
import {useMotionLevel} from '../motion/level';
import {siteBusy,type SitePhase} from '../admin-rules';

export const busyText={publishing:{title:'Publishing to the site',done:'Live on the site'},updating:{title:'Updating the site',done:'Change is live'},removing:{title:'Taking it off the site',done:'Off the site'}};
const FINISH={rebuilt:600,done:1600,settle:450};
export type Stage='rebuilt'|'done'|'settling';export type BusyPhase=keyof typeof busyText;
// Plays the finish when the site really catches up while someone is watching: rebuilt, then live with a burst, then the steps fold away.
// Arriving at a page that's already live plays nothing, and with motion reduced the final state simply appears.
export function useFinish(phase:SitePhase){const animate=useMotionLevel()==='full';const previous=useRef(phase);const [finish,setFinish]=useState<{from:BusyPhase;stage:Stage}|null>(null);
 // Before paint, so the final state never flashes up ahead of the finish.
 useLayoutEffect(()=>{const was=previous.current;previous.current=phase;if(siteBusy(phase)){setFinish(null);return}if(!siteBusy(was)||phase==='unknown'||!animate)return;const from=was as BusyPhase;setFinish({from,stage:'rebuilt'});const timers=[setTimeout(()=>setFinish({from,stage:'done'}),FINISH.rebuilt),setTimeout(()=>setFinish({from,stage:'settling'}),FINISH.rebuilt+FINISH.done),setTimeout(()=>setFinish(null),FINISH.rebuilt+FINISH.done+FINISH.settle)];return()=>timers.forEach(clearTimeout)},[phase,animate]);
 // The site has just caught up, but the effect above hasn't run yet: this render is already the start of the finish.
 const was=previous.current;if(!finish&&animate&&siteBusy(was)&&!siteBusy(phase)&&phase!=='unknown')return {from:was as BusyPhase,stage:'rebuilt' as Stage};
 return finish}

// Saved, rebuilding, live: the steps a change goes through on its way to the public site.
export function SiteSteps({text,stage,slow,finished,lastMark,exitDuration}:{text:{done:string};stage?:Stage;slow:boolean;finished:boolean;lastMark?:Ref<HTMLSpanElement>;exitDuration:number}){return <m.div className="admin-site-fold" exit={{height:0,opacity:0}} transition={{duration:exitDuration,ease:ease.enter}}><ol className="admin-site-steps"><li data-done=""><span className="admin-step-mark" aria-hidden="true"><Check size={15}/></span>Saved</li><li data-done={stage?'':undefined} data-now={stage?undefined:''}><span className="admin-step-mark" data-tick={stage?'':undefined} aria-hidden="true">{stage&&<Check size={15}/>}</span><span>{stage?'Site rebuilt':'Rebuilding the site'}{!stage&&!slow&&<span className="admin-boot-pixels admin-site-pixels" aria-hidden="true"><i/><i/><i/><i/><i/></span>}</span></li><li data-done={finished?'':undefined} data-now={stage==='rebuilt'?'':undefined}><span className="admin-step-mark" ref={lastMark} data-tick={finished?'':undefined} aria-hidden="true">{finished&&<Check size={15}/>}</span>{text.done}</li></ol><p>{slow?'Your change is saved, but the site hasn’t picked it up. Check the latest deployment in Vercel, or try saving again.':stage?' ':'This usually takes a few minutes. It’ll carry on if you leave this page.'}</p></m.div>}

export const foldDuration=(level:string)=>level==='full'?dur.ui:0;
