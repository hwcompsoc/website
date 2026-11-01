// Motion tokens for the visitor site (see MOTION-PLAN.md §5). Components never hard-code timings.
// Kept free of imports so scripts/motion.test.mjs can load it directly.
export const dur={instant:.12,hover:.16,ui:.28,wipe:.45,reveal:.6,hero:1.2} as const;
type Bezier=[number,number,number,number];
export const ease:{enter:Bezier;move:Bezier;exit:Bezier}={enter:[.22,1,.36,1],move:[.65,0,.35,1],exit:[.4,0,1,1]};
export const spring={
 snappy:{type:'spring',stiffness:500,damping:30},
 soft:{type:'spring',stiffness:180,damping:24},
 layout:{type:'spring',stiffness:350,damping:34},
} as const;
export const stagger=.06,grid=8,selectColor='#00a1cc';
export const typing={char:.028,pause:.12};
export const flip={frame:.04,frames:3};// departures-board character cycling
const flipPools={digit:'0123456789',letter:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'};
const flipPick=(pool:string,random:()=>number)=>pool[Math.floor(random()*pool.length)];
// One frame of the flip: characters settle left to right, and until then digits show digits and letters show letters. Anything else stays put.
export function flipFrame(value:string,tick:number,random:()=>number=Math.random){
 return [...value].map((ch,i)=>tick>=flip.frames+i?ch:/\d/.test(ch)?flipPick(flipPools.digit,random):/[a-z]/i.test(ch)?flipPick(flipPools.letter,random):ch).join('');
}
export const selectStrong='#007e9f';// highlight behind small text: white on it is ≈4.7:1 (on selectColor only ≈3:1)

export type MotionLevel='full'|'reduced'|'off';
// ?motion=off wins (QA captures), then ?motion=reduced or the OS setting, otherwise full.
export const motionLevel=(search:string,prefersReduced:boolean):MotionLevel=>{const param=new URLSearchParams(search).get('motion');return param==='off'?'off':param==='reduced'||prefersReduced?'reduced':'full'};

// Quantise 0–1 progress into n discrete steps; used as an easing function for "pixel" motion.
export const stepped=(n:number)=>(t:number)=>t>=1?1:Math.floor(t*n)/n;

// Deterministic 0–1 start offsets for a cols×rows grid, so pixel builds look identical every time.
export type CellOrder='diagonal'|'diagonal-reverse'|'scatter';
export function cellDelays(cols:number,rows:number,order:CellOrder='diagonal',seed=7):number[]{
 const cells=cols*rows;if(cells<=1)return Array(cells).fill(0);
 if(order==='scatter'){let s=seed>>>0;const rand=()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  const rank=Array.from({length:cells},(_,i)=>i);for(let i=cells-1;i>0;i--){const j=Math.floor(rand()*(i+1));[rank[i],rank[j]]=[rank[j],rank[i]]}
  return rank.map(r=>r/(cells-1))}
 const span=cols+rows-2;
 return Array.from({length:cells},(_,i)=>{const c=i%cols,r=Math.floor(i/cols);return((order==='diagonal'?c:cols-1-c)+r)/span});
}

// Characters typed so far after `elapsed` seconds, with a pause after punctuation.
export function typedLength(text:string,elapsed:number,char=typing.char,pause=typing.pause){let t=0;for(let i=0;i<text.length;i++){t+=char;if(t>elapsed)return i;if(/[.,!?;:]/.test(text[i]))t+=pause}return text.length}
