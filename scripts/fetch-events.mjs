// Copies live events from Supabase into the site when it builds, so the public site keeps working if Supabase is down.
// A failed fetch fails the build, which leaves the last good deployment live.
// --optional: for local development, carry on with whatever is there. --empty: for tests, use the sample events.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {SUPABASE_URL,SUPABASE_KEY,LIVE_EVENT_COLUMNS} from '../src/supabase-config.ts';
const file=new URL('../src/generated/events.json',import.meta.url);
// The same list, published with the site. The admin compares it with what was saved, to tell when a change has really gone live.
const published=new URL('../public/live-events.json',import.meta.url);
mkdirSync(new URL('.',file),{recursive:true});
const save=rows=>{const text=JSON.stringify(rows,null,1)+'\n';writeFileSync(file,text);writeFileSync(published,text)};
if(process.argv.includes('--empty')){save([]);process.exit(0)}
try{
 const response=await fetch(`${SUPABASE_URL}/rest/v1/events?select=${LIVE_EVENT_COLUMNS}&order=starts_at`,{headers:{apikey:SUPABASE_KEY},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Supabase answered ${response.status}: ${await response.text()}`);
 const rows=await response.json();save(rows);console.log(`Copied ${rows.length} live event${rows.length===1?'':'s'} from Supabase.`);
}catch(error){
 if(!process.argv.includes('--optional')){console.error(`Could not fetch events: ${error.message}`);process.exit(1)}
 if(!existsSync(file))save([]);console.warn(`Could not fetch events, so using what's already here: ${error.message}`);
}
