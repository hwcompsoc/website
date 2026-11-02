// What the site copies from Supabase: live events and the committee, with their images, so visitors never depend on Supabase.
// A file that has gone from storage costs its item the image rather than blocking every build. Any other failure throws.
import {existsSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {COMMITTEE_BUCKET,COMMITTEE_SELECT,COVER_BUCKET,LIVE_EVENT_COLUMNS,SUPABASE_KEY,SUPABASE_URL,coverThumb} from '../src/supabase-config.ts';

async function copyFile(bucket,folder,name){if(existsSync(new URL(name,folder)))return true;
 const response=await fetch(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`,{signal:AbortSignal.timeout(30000)});
 if(response.status===400||response.status===404)return false;if(!response.ok)throw new Error(`Supabase answered ${response.status} for ${name}`);
 writeFileSync(new URL(name,folder),Buffer.from(await response.arrayBuffer()));return true}
const sweep=(folder,kept)=>{for(const name of readdirSync(folder))if(!kept.has(name))rmSync(new URL(name,folder))};

export async function copyCovers(rows,timeout){const folder=new URL('../public/event-covers/',import.meta.url);mkdirSync(folder,{recursive:true});const kept=new Set();
 for(const row of rows){if(!row.cover_path)continue;const names=[row.cover_path,coverThumb(row.cover_path)];let found=true;for(const name of names)found=found&&await copyFile(COVER_BUCKET,folder,name);if(found)names.forEach(name=>kept.add(name));else{console.warn(`The cover image for "${row.title}" is missing from storage.`);row.cover_path=null}}
 sweep(folder,kept)}

export async function copyCommitteePhotos(teams){const folder=new URL('../public/committee-photos/',import.meta.url);mkdirSync(folder,{recursive:true});const kept=new Set();
 for(const person of teams.flatMap(team=>team.committee_people)){if(!person.photo_path)continue;if(await copyFile(COMMITTEE_BUCKET,folder,person.photo_path))kept.add(person.photo_path);else{console.warn(`The photo of ${person.name} is missing from storage.`);person.photo_path=null}}
 sweep(folder,kept)}

async function read(query,timeout){const response=await fetch(`${SUPABASE_URL}/rest/v1/${query}`,{headers:{apikey:SUPABASE_KEY},signal:AbortSignal.timeout(timeout)});if(!response.ok)throw new Error(`Supabase answered ${response.status}: ${await response.text()}`);return response.json()}
export async function fetchContent(timeout=20000){const [events,committee]=await Promise.all([read(`events?select=${LIVE_EVENT_COLUMNS}&order=starts_at`,timeout),read(`committee_teams?select=${COMMITTEE_SELECT}&order=position&committee_people.order=position`,timeout)]);await copyCovers(events);await copyCommitteePhotos(committee);return {events,committee}}
