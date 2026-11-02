// Copies the cover images of live events into the site, so visitors never depend on Supabase, and removes any no longer in use.
// A file that has gone from storage costs its event the cover rather than blocking every build. Any other failure throws.
import {existsSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {COVER_BUCKET,SUPABASE_URL,coverThumb} from '../src/supabase-config.ts';
const folder=new URL('../public/event-covers/',import.meta.url);
export async function copyCovers(rows){
 mkdirSync(folder,{recursive:true});const kept=new Set();
 for(const row of rows){if(!row.cover_path)continue;const names=[row.cover_path,coverThumb(row.cover_path)];
  for(const name of names){if(existsSync(new URL(name,folder)))continue;
   const response=await fetch(`${SUPABASE_URL}/storage/v1/object/public/${COVER_BUCKET}/${name}`,{signal:AbortSignal.timeout(30000)});
   if(response.status===400||response.status===404){console.warn(`The cover image for "${row.title}" is missing from storage.`);row.cover_path=null;break}
   if(!response.ok)throw new Error(`Supabase answered ${response.status} for cover image ${name}`);
   writeFileSync(new URL(name,folder),Buffer.from(await response.arrayBuffer()))}
  if(row.cover_path)names.forEach(name=>kept.add(name))}
 for(const name of readdirSync(folder))if(!kept.has(name))rmSync(new URL(name,folder));
}
