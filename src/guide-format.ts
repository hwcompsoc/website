// The simple formatting guides are written in. It turns text into a list of plain blocks, which React then shows as ordinary elements,
// so nothing typed into a guide can ever become HTML or a script. Links only work for https and mailto addresses.
export type Inline={kind:'text'|'code'|'bold';text:string}|{kind:'link';text:string;href:string};
export type Block=
 {kind:'heading';level:2|3;text:Inline[]}|
 {kind:'paragraph';text:Inline[]}|
 {kind:'list';ordered:boolean;items:Inline[][]}|
 {kind:'checklist';items:string[]}|
 {kind:'code';text:string};

const safeLink=(href:string)=>/^(https:\/\/|mailto:)\S+$/i.test(href);
// A link's address may contain one level of brackets, as some real addresses do.
const TOKEN=/`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
export function parseInline(text:string):Inline[]{const out:Inline[]=[];let at=0;
 const plain=(value:string)=>{if(!value)return;const last=out[out.length-1];if(last?.kind==='text')last.text+=value;else out.push({kind:'text',text:value})};
 for(const match of text.matchAll(TOKEN)){plain(text.slice(at,match.index));at=match.index+match[0].length;
  if(match[1]!==undefined)out.push({kind:'code',text:match[1]});else if(match[2]!==undefined)out.push({kind:'bold',text:match[2]});else if(safeLink(match[4]))out.push({kind:'link',text:match[3],href:match[4]});else plain(match[3])}
 plain(text.slice(at));return out}

// FAQ answers: the same inline formatting, and a bare email address becomes a link by itself.
export const parseAnswer=(text:string)=>parseInline(text.replace(/(?<![\[(:/\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,email=>`[${email}](mailto:${email})`));

const CHECK=/^\s*[-*]\s+\[[ xX]?\]\s+(.*)$/,BULLET=/^\s*[-*]\s+(.*)$/,NUMBER=/^\s*\d+[.)]\s+(.*)$/,FENCE=/^\s*```/,HEADING=/^(#{1,4})\s+(.*)$/;
export function parseGuide(source:string):Block[]{const lines=source.replace(/\r\n?/g,'\n').split('\n');const blocks:Block[]=[];let i=0;
 const collect=(pattern:RegExp)=>{const items:string[]=[];while(i<lines.length){const match=lines[i].match(pattern);if(!match||(pattern===BULLET&&CHECK.test(lines[i])))break;items.push(match[1].trim());i++}return items};
 while(i<lines.length){const line=lines[i];
  if(!line.trim()){i++;continue}
  if(FENCE.test(line)){i++;const code:string[]=[];while(i<lines.length&&!FENCE.test(lines[i]))code.push(lines[i++]);i++;blocks.push({kind:'code',text:code.join('\n')});continue}
  const heading=line.match(HEADING);if(heading){blocks.push({kind:'heading',level:heading[1].length<=2?2:3,text:parseInline(heading[2].trim())});i++;continue}
  if(CHECK.test(line)){blocks.push({kind:'checklist',items:collect(CHECK)});continue}
  if(BULLET.test(line)){blocks.push({kind:'list',ordered:false,items:collect(BULLET).map(parseInline)});continue}
  if(NUMBER.test(line)){blocks.push({kind:'list',ordered:true,items:collect(NUMBER).map(parseInline)});continue}
  const words:string[]=[];while(i<lines.length&&lines[i].trim()&&!FENCE.test(lines[i])&&!HEADING.test(lines[i])&&!BULLET.test(lines[i])&&!NUMBER.test(lines[i]))words.push(lines[i++].trim());blocks.push({kind:'paragraph',text:parseInline(words.join(' '))})}
 return blocks}

// About 200 words a minute, and never less than a minute.
export const readingMinutes=(source:string)=>Math.max(1,Math.round(source.trim().split(/\s+/).filter(Boolean).length/200));
