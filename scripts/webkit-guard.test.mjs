import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';

// Mobile WebKit hazards (MOTION-PLAN 13.1), learned from the iOS stutter bug fixed in 6cd5d2b.
// Limits: Motion props are only checked when written inline, so values passed through variables aren't seen. The hero
// cursor does that on purpose: its pose shares an element with per-frame x/y, because the highlight follows it in JS.
const lineOf=(text,index)=>text.slice(0,index).split('\n').length;
const blank=match=>match.replace(/[^\n]/g,' ');
const cssCode=text=>text.replace(/\/\*[\s\S]*?\*\//g,blank);
const tsCode=text=>text.replace(/\/\*[\s\S]*?\*\//g,blank).replace(/^\s*\/\/.*$/gm,blank);
// Returns the text inside a balanced {...}, given the index of its opening brace.
function block(text,open){let depth=0;for(let i=open;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'&&--depth===0)return text.slice(open+1,i)}return text.slice(open+1)}

export function checkCss(source){
 const code=cssCode(source),found=[];
 for(const m of code.matchAll(/steps\(/g))found.push([lineOf(code,m.index),'steps() timing: flip over one frame or use hold keyframes']);
 for(const m of code.matchAll(/@keyframes\s+[\w-]+\s*\{/g))if(/(^|[;{\s])visibility\s*:/.test(block(code,m.index+m[0].length-1)))found.push([lineOf(code,m.index),'visibility in @keyframes: animate opacity']);
 for(const m of code.matchAll(/transition(-property)?\s*:[^;}]*\bvisibility\b/g))found.push([lineOf(code,m.index),'visibility transition: animate opacity']);
 // backdrop-filter must sit inside a (hover:hover) block, unless it is switching the effect off.
 const stack=[];let start=0;
 for(let i=0;i<code.length;i++){
  if(code[i]==='{'){stack.push(code.slice(start,i).trim());start=i+1}
  else if(code[i]==='}'){stack.pop();start=i+1}
  else if(code[i]===';')start=i+1;
 }
 for(const m of code.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*([^;}]+)/g)){
  if(m[1].trim()==='none')continue;
  const open=[];let from=0;
  for(let i=0;i<m.index;i++){if(code[i]==='{'){open.push(code.slice(from,i).trim());from=i+1}else if(code[i]==='}'){open.pop();from=i+1}else if(code[i]===';')from=i+1}
  if(!open.some(p=>/@media[^{]*hover\s*:\s*hover/.test(p)))found.push([lineOf(code,m.index),'backdrop-filter outside a (hover:hover) block']);
 }
 return found;
}

export function checkTs(source){
 const code=tsCode(source),found=[];
 for(const m of code.matchAll(/steps\(|\bstepped\(/g))found.push([lineOf(code,m.index),'stepped timing: use hold keyframes']);
 for(const m of code.matchAll(/\b(?:initial|animate|exit|while[A-Z]\w*)=\{/g)){
  const value=block(code,m.index+m[0].length-1);
  if(/(^|[{,?:(\s])(?:x|y|z|scale|scaleX|scaleY|rotate|rotateX|rotateY|skew|skewX|skewY)\s*:/.test(value))found.push([lineOf(code,m.index),'Motion x/y/scale prop: animate a full transform']);
  if(/\bvisibility\s*:/.test(value))found.push([lineOf(code,m.index),'visibility in a Motion prop: animate opacity']);
 }
 for(const m of code.matchAll(/(?<![.\w])animate\(\s*[^,()]+,\s*\{/g))if(/(^|[{,\s])(?:x|y|z|scale|scaleX|scaleY|rotate)\s*:/.test(block(code,m.index+m[0].length-1)))found.push([lineOf(code,m.index),'Motion x/y/scale in animate(): use a full transform']);
 for(const m of code.matchAll(/\.animate\(\s*\[/g))if(/\bvisibility\s*:/.test(code.slice(m.index,m.index+600).split('{duration')[0]))found.push([lineOf(code,m.index),'visibility in element.animate: animate opacity']);
 for(const m of code.matchAll(/backdrop-(?:blur|filter)/g))found.push([lineOf(code,m.index),'backdrop blur class: use a (hover:hover) block in CSS']);
 return found;
}

function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}

test('Visitor site has none of the mobile WebKit animation hazards',()=>{
 const all=files('src');const css=all.filter(f=>f.endsWith('.css')),ts=all.filter(f=>f.endsWith('.tsx'));
 assert.ok(css.length>=2&&ts.length>=20,'The guard found too few files to be scanning the right folder.');
 const problems=[];
 for(const f of css)for(const [line,why] of checkCss(readFileSync(f,'utf8')))problems.push(`${f}:${line} ${why}`);
 for(const f of ts)for(const [line,why] of checkTs(readFileSync(f,'utf8')))problems.push(`${f}:${line} ${why}`);
 assert.deepEqual(problems,[],`WebKit hazards (see MOTION-PLAN 13.1):\n${problems.join('\n')}`);
});

test('The guard catches each hazard and allows the safe forms',()=>{
 const css=s=>checkCss(s).length,ts=s=>checkTs(s).length;
 assert.equal(css('.a{animation:b 1s steps(3) both}'),1);
 assert.equal(css('.a{transition:transform .3s steps(6)}'),1);
 assert.equal(css('/* replaces steps(1) */.a{animation:b 1s linear}'),0,'a comment is not a hazard');
 assert.equal(css('@keyframes a{from{visibility:hidden}to{visibility:visible}}'),1);
 assert.equal(css('.a{visibility:hidden}@keyframes b{to{opacity:0}}'),0,'static visibility is fine');
 assert.equal(css('.a{transition:opacity .2s,visibility .2s}'),1);
 assert.equal(css('.a{backdrop-filter:blur(4px)}'),1);
 assert.equal(css('@media(max-width:800px){.a{backdrop-filter:blur(4px)}}'),1);
 assert.equal(css('@media(hover:hover){.a{backdrop-filter:blur(4px)}}'),0);
 assert.equal(css('@media(hover:none){.a{backdrop-filter:none}}'),0);
 assert.equal(css('@media(hover:hover){.a{color:red}}.b{backdrop-filter:blur(4px)}'),1,'a closed block does not count');
 assert.equal(ts("<m.a initial={{y:'110%'}}/>"),1);
 assert.equal(ts("<m.a animate={play?{x:0}:{opacity:1}}/>"),1);
 assert.equal(ts("<m.a whileTap={{scale:.9}}/>"),1);
 assert.equal(ts("<m.a initial={ok?{opacity:0,transform:'translateY(110%)'}:false} animate={{opacity:1,transform:'translateX(0px)'}}/>"),0);
 assert.equal(ts('<m.a style={{x,y}} transition={{x:{duration:1}}}/>'),0,'driven values are allowed');
 assert.equal(ts("el.animate([{translate:'0'}],{duration:90,easing:'steps(3)'})"),1);
 assert.equal(ts("el.animate([{visibility:'hidden'}],{duration:90})"),1);
 assert.equal(ts('const run=animate(el,{x:[10,0],scale:[.5,1]},{duration:.4})'),1);
 assert.equal(ts("animate(el,{opacity:1,transform:'none'},{duration:.4})"),0);
 assert.equal(ts("el.animate([{transform:'none'}],{duration:90})"),0,'element.animate with transform is the safe form');
 assert.equal(ts('// a steps(3) comment'),0);
 assert.equal(ts("<div className=\"backdrop-blur-sm\"/>"),1);
});
