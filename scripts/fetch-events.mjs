// Copies live events and the committee from Supabase into the site when it builds, so the public site keeps working if Supabase is down.
// A failed fetch fails the build, which leaves the last good deployment live.
// --optional: for local development, carry on with whatever is there. --empty: for tests, start with nothing.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {fetchContent} from './live-content.mjs';
const file=new URL('../src/generated/events.json',import.meta.url);
const committeeFile=new URL('../src/generated/committee.json',import.meta.url);
// The same list, published with the site. The admin compares it with what was saved, to tell when a change has really gone live.
const published=new URL('../public/live-events.json',import.meta.url);
mkdirSync(new URL('.',file),{recursive:true});
const text=rows=>JSON.stringify(rows,null,1)+'\n';
const save=({events,committee})=>{writeFileSync(file,text(events));writeFileSync(published,text(events));writeFileSync(committeeFile,text(committee))};
if(process.argv.includes('--empty')){save({events:[],committee:[]});process.exit(0)}
try{
 const content=await fetchContent();save(content);console.log(`Copied ${content.events.length} live event${content.events.length===1?'':'s'} and ${content.committee.length} committee roles from Supabase.`);
}catch(error){
 if(!process.argv.includes('--optional')){console.error(`Could not fetch from Supabase: ${error.message}`);process.exit(1)}
 if(!existsSync(file)||!existsSync(committeeFile))save({events:[],committee:[]});console.warn(`Could not fetch from Supabase, so using what's already here: ${error.message}`);
}
