// What the site copies from Supabase: live events, the committee, the FAQs and the guides, with their images, so visitors never depend on Supabase.
// A file that has gone from storage costs its item the image rather than blocking every build. Any other failure throws.
import {existsSync,mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {COMMITTEE_BUCKET,COMMITTEE_SELECT,COVER_BUCKET,FAQ_COLUMNS,GUIDE_COLUMNS,LIVE_EVENT_COLUMNS,SUPABASE_KEY,SUPABASE_URL,coverThumb} from '../src/supabase-config.ts';

async function copyFile(bucket,folder,name){if(existsSync(new URL(name,folder)))return true;
 const response=await fetch(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`,{signal:AbortSignal.timeout(30000)});
 if(response.status===400||response.status===404)return false;if(!response.ok)throw new Error(`Supabase answered ${response.status} for ${name}`);
 writeFileSync(new URL(name,folder),Buffer.from(await response.arrayBuffer()));return true}
const sweep=(folder,kept)=>{for(const name of readdirSync(folder))if(!kept.has(name))rmSync(new URL(name,folder))};

export async function copyCovers(rows){const folder=new URL('../public/event-covers/',import.meta.url);mkdirSync(folder,{recursive:true});const kept=new Set();
 for(const row of rows){if(!row.cover_path)continue;const names=[row.cover_path,coverThumb(row.cover_path)];let found=true;for(const name of names)found=found&&await copyFile(COVER_BUCKET,folder,name);if(found)names.forEach(name=>kept.add(name));else{console.warn(`The cover image for "${row.title}" is missing from storage.`);row.cover_path=null}}
 sweep(folder,kept)}

export async function copyCommitteePhotos(teams){const folder=new URL('../public/committee-photos/',import.meta.url);mkdirSync(folder,{recursive:true});const kept=new Set();
 for(const person of teams.flatMap(team=>team.committee_people)){if(!person.photo_path)continue;if(await copyFile(COMMITTEE_BUCKET,folder,person.photo_path))kept.add(person.photo_path);else{console.warn(`The photo of ${person.name} is missing from storage.`);person.photo_path=null}}
 sweep(folder,kept)}

async function read(query,timeout){const response=await fetch(`${SUPABASE_URL}/rest/v1/${query}`,{headers:{apikey:SUPABASE_KEY},signal:AbortSignal.timeout(timeout)});if(!response.ok)throw new Error(`Supabase answered ${response.status}: ${await response.text()}`);return response.json()}
export async function fetchContent(timeout=20000){const [events,committee,faqs,guides]=await Promise.all([read(`events?select=${LIVE_EVENT_COLUMNS}&order=starts_at`,timeout),read(`committee_teams?select=${COMMITTEE_SELECT}&order=position&committee_people.order=position`,timeout),read(`faqs?select=${FAQ_COLUMNS}&order=position`,timeout),read(`guides?select=${GUIDE_COLUMNS}&order=position`,timeout)]);await copyCovers(events);await copyCommitteePhotos(committee);return {events,committee,faqs,guides}}

// Each list goes to src/generated for the site, and is published beside it, so the admin can compare it with what was saved and tell when a change has really gone live.
const generated=name=>new URL(`../src/generated/${name}.json`,import.meta.url);
const published={events:'live-events',committee:'live-committee',faqs:'live-faqs',guides:'live-guides'};
export const generatedFiles=()=>Object.keys(published).map(generated);
export const contentExists=()=>generatedFiles().every(file=>existsSync(file));
// Returns whether anything changed.
export function saveContent(content){mkdirSync(new URL('../src/generated/',import.meta.url),{recursive:true});let changed=false;for(const [name,rows] of Object.entries(content)){const text=JSON.stringify(rows,null,1)+'\n';const file=generated(name);const target=new URL(`../public/${published[name]}.json`,import.meta.url);if(existsSync(file)&&existsSync(target)&&readFileSync(file,'utf8')===text)continue;changed=true;writeFileSync(file,text);writeFileSync(target,text)}return changed}
export const EMPTY_CONTENT={events:[],committee:[],faqs:[],guides:[]};
// Addresses for the tests to find, so they don't depend on what the committee has published.
export const TEST_CONTENT={...EMPTY_CONTENT,guides:['git','web','contribute','support'].map(slug=>({slug,title:slug,category:'Learning',kind:'Guide',description:slug,body:'A guide.',status:'sample',reviewed_on:null}))};
