import {m,useScroll,useTransform} from 'motion/react';
import {grid} from '../motion';

// Scroll verb (MOTION-PLAN §4.6): page progress as a bar that grows in 8px steps, like a loading bar.
export function ScrollProgress(){
 const {scrollYProgress}=useScroll();
 const scaleX=useTransform(scrollYProgress,p=>{const steps=Math.max(1,Math.round(innerWidth/grid));return Math.round(p*steps)/steps});
 return <m.span className="scroll-progress" aria-hidden="true" style={{scaleX}}/>;
}
