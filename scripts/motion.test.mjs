import test from 'node:test';
import assert from 'node:assert/strict';
import {stepped,cellDelays,typedLength,motionLevel,dur,flip,flipFrame} from '../src/motion.ts';
test('Stepped easing snaps progress to discrete frames and always lands on 1',()=>{
 const s=stepped(4);assert.deepEqual([0,.24,.25,.6,.99,1].map(s),[0,0,.25,.5,.75,1]);
});
test('Pixel cell delays are normalised, deterministic and ordered as described',()=>{
 const d=cellDelays(12,8);assert.equal(d.length,96);assert.equal(d[0],0);assert.equal(d[95],1);assert.ok(d.every(v=>v>=0&&v<=1));
 const r=cellDelays(12,8,'diagonal-reverse');assert.equal(r[11],0);assert.equal(r[84],1);
 const a=cellDelays(8,6,'scatter',3),b=cellDelays(8,6,'scatter',3);assert.deepEqual(a,b);assert.deepEqual([...a].sort((x,y)=>x-y),cellDelays(8,6,'scatter',3).map((_,i)=>i/47));assert.notDeepEqual(a,cellDelays(8,6,'scatter',4));
 assert.deepEqual(cellDelays(1,1),[0]);
});
test('Typing reveals characters over time and pauses after punctuation',()=>{
 assert.equal(typedLength('Hello, HW.',0),0);assert.equal(typedLength('Hello, HW.',10),10);
 const atComma=typedLength('Hello, HW.',.028*6+.01);assert.equal(atComma,6);
 assert.equal(typedLength('Hello, HW.',.028*7+.12+.01),7);
});
test('Flip frames keep each character type, settle left to right and end on the real value',()=>{
 const value='12 NOV 17:30';
 for(let tick=0;tick<flip.frames+value.length;tick++){const frame=flipFrame(value,tick);assert.equal(frame.length,value.length);
  [...value].forEach((ch,i)=>{if(/\d/.test(ch))assert.match(frame[i],/\d/);else if(/[A-Z]/.test(ch))assert.match(frame[i],/[A-Z]/);else assert.equal(frame[i],ch,'spaces and punctuation stay put');
   if(tick>=flip.frames+i)assert.equal(frame[i],ch,'settled characters stay settled')})}
 assert.equal(flipFrame(value,flip.frames+value.length-1),value);
 assert.equal(flipFrame('',0),'');
 const high=flipFrame('A1',0,()=>.999),low=flipFrame('A1',0,()=>0);assert.equal(high,'Z9');assert.equal(low,'A0');
 assert.equal(flipFrame('19',flip.frames,()=>0),'10','the first character settles first');
});
test('Theme choice: an explicit choice wins, System follows the device, anything unknown means System',async()=>{
 const {resolveTheme,parseChoice}=await import('../src/theme.ts');
 assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');
 assert.equal(parseChoice('dark'),'dark');assert.equal(parseChoice('light'),'light');assert.equal(parseChoice(null),'system');assert.equal(parseChoice('blue'),'system');assert.equal(parseChoice('system'),'system');
});
test('Motion level: ?motion=off wins, then reduced (param or OS), otherwise full',()=>{
 assert.equal(motionLevel('?motion=off',true),'off');assert.equal(motionLevel('?motion=reduced',false),'reduced');assert.equal(motionLevel('',true),'reduced');assert.equal(motionLevel('',false),'full');
 assert.ok(dur.hero<=1.2&&dur.reveal<=.6,'durations stay within the plan’s limits');
});
