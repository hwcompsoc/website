import {logo} from './logo-paths';

const ink={blue:'#004066',white:'#FFFFFF'},accent='#00A1CC';
// The official logo drawn inline (MOTION-PLAN §8.1), so its cursor can move on its own: hovering the link around it
// nudges the cursor as if clicking the wordmark. Shapes come from the asset-library SVG via scripts/generate-logo.mjs.
export function Logo({tone,align='center',className=''}:{tone:'blue'|'white';align?:'center'|'left';className?:string}){
 return <svg viewBox={logo.viewBox} className={className} role="img" aria-label="HW CompSoc" preserveAspectRatio={align==='left'?'xMinYMid meet':'xMidYMid meet'}>
  {logo.word.map((p,i)=><path key={i} d={p.d} transform={p.transform} fill={ink[tone]}/>)}
  <g className="logo-cursor">{logo.cursor.map((p,i)=><path key={i} d={p.d} transform={p.transform} fill={p.accent?accent:ink[tone]}/>)}</g>
 </svg>;
}
