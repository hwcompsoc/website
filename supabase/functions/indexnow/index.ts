// Tells Bing and the other IndexNow search engines which pages changed, once the change is live. A cron job (migration
// 20261119120000_indexnow.sql) calls this every 5 minutes. It reads the page fingerprints the live site publishes at /indexnow.json
// (scripts/write-pages.mjs) and sends the pages that are new, changed or gone since the last time it sent any. Calling it again sends
// nothing new, so it needs no sign-in. It does nothing until SITE_URL is set, so only the production project sends anything.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const secretKey=()=>{const keys=Deno.env.get('SUPABASE_SECRET_KEYS');return keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
const db=createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
const site=Deno.env.get('SITE_URL')?.replace(/\/$/,'');

type Manifest={key:string;pages:Record<string,string>};

Deno.serve(async()=>{
 if(!site)return reply({sent:[],note:'SITE_URL is not set, so nothing is sent.'});
 try{
  const live=await fetch(`${site}/indexnow.json`,{headers:{'Cache-Control':'no-cache'}});
  if(!live.ok)return reply({error:`The site's /indexnow.json answered ${live.status}.`},502);
  const manifest:Manifest=await live.json();
  const {data,error}=await db.from('indexnow_state').select('pages').eq('id',1).maybeSingle();
  if(error)throw error;
  const before:Record<string,string>=data?.pages??{};
  const paths=[...Object.keys(manifest.pages).filter(path=>before[path]!==manifest.pages[path]),...Object.keys(before).filter(path=>!(path in manifest.pages))];
  if(!paths.length)return reply({sent:[]});
  const urlList=paths.map(path=>site+path);
  const sent=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:new URL(site).host,key:manifest.key,keyLocation:`${site}/${manifest.key}.txt`,urlList})});
  // 200 and 202 both mean accepted. Anything else is tried again on the next run, because nothing is recorded.
  if(sent.status!==200&&sent.status!==202)return reply({error:`IndexNow answered ${sent.status}: ${(await sent.text()).slice(0,300)}`},502);
  const saved=await db.from('indexnow_state').upsert({id:1,pages:manifest.pages,sent_at:new Date().toISOString()});
  if(saved.error)throw saved.error;
  return reply({sent:urlList});
 }catch(error){return reply({error:error instanceof Error?error.message:String(error)},500)}
});
