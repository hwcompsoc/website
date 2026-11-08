// Links to a passage of text (#:~:text=…). Browsers scroll to the passage and highlight it, including in an event dialog,
// because they keep looking while the page renders. Kept free of the DOM so the tests can load it.
const MAX_WHOLE=80,EDGE_WORDS=4;
// In a text directive, - , and & have meanings of their own, so they're escaped along with everything encodeURIComponent escapes.
const encode=(text:string)=>encodeURIComponent(text).replace(/-/g,'%2D');
export function textFragment(selected:string){const text=selected.replace(/\s+/g,' ').trim();if(!text)return '';
 if(text.length<=MAX_WHOLE)return `#:~:text=${encode(text)}`;
 // A long passage is named by its first and last few words, so the link stays short and survives small edits in the middle.
 const words=text.split(' ');if(words.length<=EDGE_WORDS*2)return `#:~:text=${encode(text)}`;
 return `#:~:text=${encode(words.slice(0,EDGE_WORDS).join(' '))},${encode(words.slice(-EDGE_WORDS).join(' '))}`}
// The page's own address, without ?motion= or filters, plus the passage.
export const passageLink=(origin:string,path:string,selected:string)=>`${origin}${path}${textFragment(selected)}`;
