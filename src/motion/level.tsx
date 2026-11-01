import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useInView,useReducedMotion} from 'motion/react';
import {motionLevel,type MotionLevel} from '../motion';

const LevelContext=createContext<MotionLevel>('full');
export const MotionLevelProvider=LevelContext.Provider;
export const useMotionLevel=()=>useContext(LevelContext);
export const useMotionLevelSetting=():MotionLevel=>motionLevel(location.search,useReducedMotion()!==false);

export type Trigger='inView'|'mount'|'manual';
// Shared trigger logic: inView plays once on entering the viewport, mount plays immediately, manual follows `play`.
export function useTrigger<T extends Element>(trigger:Trigger,play=false){const ref=useRef<T>(null);const inView=useInView(ref,{once:true,margin:'0px 0px -10% 0px'});const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);return {ref,active:trigger==='inView'?inView:trigger==='mount'?mounted:play}}
