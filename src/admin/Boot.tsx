import {useEffect,useState,type CSSProperties} from 'react';
import {Logo} from '../components/Logo';
import {Mascot} from '../components/Mascot';
import {MotionLevelProvider} from '../motion/level';

const STALLED_AFTER=8000;
// One sweep: the last pixel lights at 0.6s and goes out at 0.96s (see .admin-boot-pixels in website.css).
const ONE_ROUND=1000;
let firstShown:number|null=null;
const motionOff=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).get('motion')==='off';
// Holds the page until the first sweep has finished, however fast it loads. With motion off there is no sweep to wait for.
export function useBootRound(){const left=()=>motionOff()||firstShown===null?0:ONE_ROUND-(performance.now()-firstShown);const [done,setDone]=useState(()=>left()<=0);useEffect(()=>{if(done)return;const timer=setTimeout(()=>setDone(true),left());return()=>clearTimeout(timer)},[done]);return done}
// Shown before we know which page is coming: a login card and a dashboard look nothing alike, so a skeleton would be guessing.
// It loads with the main site, because the admin's own code and styles may not have arrived yet.
// Byte keeps moving while it loads (the one loop the motion rules allow) and settles if loading stalls.
export function AdminBoot(){const [stalled,setStalled]=useState(false);firstShown??=performance.now();
 // This screen can be replaced by another copy of itself as the code loads, so each copy joins the sweep where it has got to.
 const [offset]=useState(()=>-(performance.now()-firstShown!));useEffect(()=>{const timer=setTimeout(()=>setStalled(true),STALLED_AFTER);return()=>clearTimeout(timer)},[]);
 return <MotionLevelProvider value={motionOff()?'off':'full'}><main className="admin-boot"><div role="status"><Mascot decorative loop={!stalled} size="sm" className="admin-boot-byte"/><Logo tone="blue" className="site-logo"/>{stalled?<div className="admin-boot-stalled"><p><b>This is taking too long.</b></p><p>Check your connection, then try again.</p><button type="button" className="admin-boot-reload" onClick={()=>location.reload()}>Reload the page</button></div>:<><span className="admin-boot-pixels" aria-hidden="true" style={{'--boot-offset':`${offset}ms`} as CSSProperties}><i/><i/><i/><i/><i/></span><span className="sr-only">Loading the admin</span></>}</div></main></MotionLevelProvider>}
