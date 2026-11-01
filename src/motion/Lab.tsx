import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LazyMotion,domMax,MotionConfig} from 'motion/react';
import {Button} from '../components/ui/button';
import {MotionLevelProvider,useMotionLevelSetting} from './level';
import {Select} from './Select';
import {Typed} from './Typed';
import {Reveal} from './Reveal';
import {PixelBuild} from './PixelBuild';
import {PixelWipe,type WipePhase} from './PixelWipe';
import {ClickBurstProvider,BurstButton} from './ClickBurst';
import '../website.css';
import '../motion.css';

// Dev-only workbench for the motion components: open /motion-lab.html (add ?motion=reduced or ?motion=off).
function Lab(){
 const level=useMotionLevelSetting();const [run,setRun]=useState(0);const [phase,setPhase]=useState<WipePhase>('idle');const [swaps,setSwaps]=useState(0);
 return <LazyMotion features={domMax} strict><MotionConfig reducedMotion="user"><MotionLevelProvider value={level}><ClickBurstProvider>
  <div className="wrap lab" key={run}>
   <header className="lab-head"><span className="eyebrow">Motion lab · level: {level}</span><Button className="site-button" onClick={()=>setRun(r=>r+1)}>Replay all</Button></header>
   <section><span className="eyebrow">Reveal + Select (hero)</span><Reveal as="h1" trigger="mount" className="lab-hero" lines={['Find your people.',<Select key="s" mode="persist" trigger="mount" delay={.9} from="right">Build what’s next.</Select>]}/></section>
   <section><span className="eyebrow">Select · flash on scroll-in</span><h2><Select mode="flash">A little curiosity goes a long way.</Select></h2></section>
   <section><span className="eyebrow">Select · hover</span><h3><Select mode="hover">Hover to select this filename.md</Select></h3></section>
   <section><span className="eyebrow">Typed</span><p className="lab-mono"><Typed text="Hello, HW." trigger="mount" delay={.3}/></p><p><Typed text="No events match that search. Try something broader." trigger="inView"/></p></section>
   <section><span className="eyebrow">PixelBuild · diagonal / scatter</span><div className="lab-row"><PixelBuild className="lab-tile">Diagonal</PixelBuild><PixelBuild className="lab-tile" order="scatter" cols={6} rows={6}>Scatter</PixelBuild></div></section>
   <section><span className="eyebrow">ClickBurst</span><div className="lab-row"><BurstButton><Button className="site-button">Join the Discord</Button></BurstButton><BurstButton count={4}><a href="#burst" className="text-link">A text link</a></BurstButton></div></section>
   <section><span className="eyebrow">PixelWipe · page swaps: {swaps}</span><Button className="site-button" onClick={()=>setPhase('cover')} disabled={phase!=='idle'}>Run page transition</Button></section>
  </div>
  <PixelWipe phase={phase} onCovered={()=>{setSwaps(s=>s+1);setPhase('uncover')}} onDone={()=>setPhase('idle')}/>
 </ClickBurstProvider></MotionLevelProvider></MotionConfig></LazyMotion>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Lab/></React.StrictMode>);
