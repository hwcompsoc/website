// The society's Google Drive, for the admin. It holds the Google connection, so every request proves who is asking first.
// Owners connect the society's Google account and choose the folder the admin shows. Any committee member can browse that
// folder and save minutes into it. This function only ever lists, reads and creates: nothing here edits, moves or deletes a
// file. Google's narrower "only files this app made" permission can't add to an existing folder, which is why it asks for more.
// Secrets: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, from an OAuth client in Google Cloud.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
class Refused extends Error{constructor(message:string,public status=400){super(message)}}

const secretKey=()=>{const keys=Deno.env.get('SUPABASE_SECRET_KEYS');return keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});

const CLIENT_ID=Deno.env.get('GOOGLE_CLIENT_ID')??'';const CLIENT_SECRET=Deno.env.get('GOOGLE_CLIENT_SECRET')??'';
const SCOPE='https://www.googleapis.com/auth/drive';
const FOLDER='application/vnd.google-apps.folder';
const NOT_CONNECTED='Google Drive isn’t connected yet. An Owner can connect it on the Drive page.';
const ID=/^[A-Za-z0-9_-]{10,200}$/;
// Only the admin's Drive page may receive Google's reply, on the live site or a local copy.
const REDIRECT=/^(https:\/\/[a-z0-9.-]+|http:\/\/(127\.0\.0\.1|localhost):\d{2,5})\/admin\/drive$/;

type Link={refresh_token:string;account:string;root_id:string|null;root_name:string|null;minutes_id:string|null};
type Item={id:string;name:string;mimeType:string;modifiedTime?:string;webViewLink?:string;parents?:string[];trashed?:boolean};

async function link(){const {data,error}=await admin.from('google_drive').select('refresh_token,account,root_id,root_name,minutes_id').eq('id',1).maybeSingle();if(error)throw error;return data as Link|null}
async function update(fields:Partial<Link>){const {error}=await admin.from('google_drive').update(fields).eq('id',1);if(error)throw error}
async function connected(){const found=await link();if(!found)throw new Refused(NOT_CONNECTED,409);return found}
async function withRoot(){const found=await connected();if(!found.root_id)throw new Refused('An Owner needs to choose which folder to show first, on the Drive page.',409);return found as Link&{root_id:string}}

// --- Google ---
let cached:{token:string;expires:number;refresh:string}|null=null;
async function googleToken(params:Record<string,string>){const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,...params})});return {ok:response.ok,body:await response.json().catch(()=>({}))}}
async function accessToken(refresh:string){if(cached?.refresh===refresh&&cached.expires>Date.now()+60_000)return cached.token;
 const {ok,body}=await googleToken({refresh_token:refresh,grant_type:'refresh_token'});
 if(!ok){if(body.error==='invalid_grant')throw new Refused('The Google Drive connection has stopped working, perhaps because the password changed or access was removed. An Owner needs to connect it again on the Drive page.',409);throw new Error(`Google token refresh failed: ${body.error}`)}
 cached={token:body.access_token,expires:Date.now()+body.expires_in*1000,refresh};return cached.token}

// GET to read, POST to create. There is deliberately no way to send anything else.
async function google(token:string,path:string,create?:{body:string;type:string}){const response=await fetch(`https://www.googleapis.com/${path}`,create?{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':create.type},body:create.body}:{headers:{Authorization:`Bearer ${token}`}});const body=await response.json().catch(()=>null);
 if(!response.ok){if(response.status===404)throw new Refused('That isn’t in the Drive any more. It may have been moved or deleted.',404);console.error(JSON.stringify({status:response.status,error:body?.error?.message}));throw new Error('Google Drive refused the request.')}return body}
const get=(token:string,id:string,fields:string)=>google(token,`drive/v3/files/${id}?fields=${encodeURIComponent(fields)}`) as Promise<Item>;
async function search(token:string,q:string,fields:string,orderBy='folder,name_natural',limit=1000){const files:Item[]=[];let page='';
 do{const params=new URLSearchParams({q,fields:`nextPageToken,files(${fields})`,orderBy,pageSize:String(Math.min(limit,1000)),spaces:'drive'});if(page)params.set('pageToken',page);const body=await google(token,`drive/v3/files?${params}`);files.push(...body.files);page=body.nextPageToken??''}while(page&&files.length<limit);
 return files.slice(0,limit)}
const quoted=(text:string)=>`'${text.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'`;
const shown=(file:Item)=>({id:file.id,name:file.name,mimeType:file.mimeType,modified:file.modifiedTime??null,link:file.webViewLink??null});

// The folders from the society folder down to this one. Anything outside the society folder is refused, so the admin can't
// be used to look around the rest of the account.
async function trail(token:string,id:string,root:string,rootName:string,known=new Map<string,Item>()){const path:{id:string;name:string}[]=[];let current=id;
 for(let depth=0;depth<30;depth++){if(current===root)return [{id:root,name:rootName},...path.reverse()];
  const file=known.get(current)??await get(token,current,'id,name,parents,trashed');known.set(current,file);const parent=file.parents?.[0];if(file.trashed||!parent)break;path.push({id:file.id,name:file.name});current=parent}
 return null}

// --- What people can do ---
async function status(){const found=await link();return {configured:!!CLIENT_ID&&!!CLIENT_SECRET,connected:!!found,account:found?.account??null,root:found?.root_id?{id:found.root_id,name:found.root_name}:null}}

async function list(folder:string){const found=await withRoot();const token=await accessToken(found.refresh_token);const id=folder||found.root_id;if(!ID.test(id))throw new Refused('That folder address isn’t right.');
 const path=await trail(token,id,found.root_id,found.root_name??'Society Drive');if(!path)throw new Refused('That folder isn’t in the society folder.',404);
 const files=await search(token,`${quoted(id)} in parents and trashed=false`,'id,name,mimeType,modifiedTime,webViewLink');return {trail:path,files:files.map(shown)}}

async function find(query:string){const found=await withRoot();const words=query.trim().slice(0,100);if(!words)return {files:[]};const token=await accessToken(found.refresh_token);
 const matches=await search(token,`name contains ${quoted(words)} and trashed=false`,'id,name,mimeType,modifiedTime,webViewLink,parents','modifiedTime desc',200);
 const known=new Map<string,Item>();const inside:Item[]=[];
 for(const file of matches){if(inside.length>=50)break;const parent=file.parents?.[0];if(parent&&await trail(token,parent,found.root_id,'',known))inside.push(file)}
 return {files:inside.map(shown)}}

async function minutesFolder(token:string,found:Link&{root_id:string}){
 if(found.minutes_id){try{const folder=await get(token,found.minutes_id,'id,trashed');if(!folder.trashed)return folder.id}catch(failure){if(!(failure instanceof Refused))throw failure}}
 const [existing]=await search(token,`${quoted(found.root_id)} in parents and name='Minutes' and mimeType='${FOLDER}' and trashed=false`,'id','name',1);
 const id=existing?.id??(await google(token,'drive/v3/files?fields=id',{type:'application/json',body:JSON.stringify({name:'Minutes',mimeType:FOLDER,parents:[found.root_id]})})).id;
 await update({minutes_id:id});return id as string}

async function saveMinutes(name:string,html:string){const found=await withRoot();if(!name.trim()||name.length>200)throw new Refused('The minutes need a name.');if(!html||html.length>500_000)throw new Refused('Those minutes are too long to save.');
 const token=await accessToken(found.refresh_token);const folder=await minutesFolder(token,found);const boundary=`minutes-${crypto.randomUUID()}`;
 const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:name.trim(),mimeType:'application/vnd.google-apps.document',parents:[folder]})}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
 const file=await google(token,'upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{type:`multipart/related; boundary=${boundary}`,body});return {link:file.webViewLink}}

// --- Owners: connecting ---
const encoder=new TextEncoder();
async function sign(text:string){const key=await crypto.subtle.importKey('raw',encoder.encode(CLIENT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(text))))).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'')}
// The state Google hands back proves the reply is for the Owner who started connecting, within ten minutes.
async function state(actor:string){const expires=Date.now()+10*60_000;return `${expires}.${await sign(`${actor}.${expires}`)}`}
async function stateOk(actor:string,given:string){const [expires,signature]=given.split('.');return Number(expires)>Date.now()&&signature===await sign(`${actor}.${expires}`)}

function needsSetup(){if(!CLIENT_ID||!CLIENT_SECRET)throw new Refused('Google Drive isn’t set up on the server yet. Whoever looks after the website needs to add the Google keys.',503)}
async function connectUrl(actor:string,redirect:string){needsSetup();if(!REDIRECT.test(redirect))throw new Refused('Connect from the Drive page.');
 return {url:`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({client_id:CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state:await state(actor)})}`}}

async function connect(actor:string,code:string,given:string,redirect:string){needsSetup();if(!REDIRECT.test(redirect)||!code)throw new Refused('Connect from the Drive page.');if(!await stateOk(actor,given))throw new Refused('That took too long, or was started by someone else. Choose Connect again.');
 const {ok,body}=await googleToken({code,redirect_uri:redirect,grant_type:'authorization_code'});if(!ok)throw new Refused('Google didn’t accept that. Choose Connect again.');
 if(!String(body.scope??'').split(' ').includes(SCOPE))throw new Refused('Drive access wasn’t allowed. Choose Connect again and tick the box that lets it see and add to your Drive.');
 if(!body.refresh_token)throw new Refused('Google didn’t give a lasting connection. Choose Connect again.');
 const about=await google(body.access_token,'drive/v3/about?fields=user(emailAddress)');const old=await link();
 const {error}=await admin.from('google_drive').upsert({id:1,refresh_token:body.refresh_token,account:about.user.emailAddress,root_id:null,root_name:null,minutes_id:null,connected_by:actor,connected_at:new Date().toISOString()});if(error)throw error;
 if(old&&old.refresh_token!==body.refresh_token)await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(old.refresh_token)}`,{method:'POST'}).catch(()=>{});
 cached=null;return {account:about.user.emailAddress}}

async function folderChoices(){const found=await connected();const token=await accessToken(found.refresh_token);const folders=await search(token,`'root' in parents and mimeType='${FOLDER}' and trashed=false`,'id,name','name_natural',300);return {folders:folders.map(folder=>({id:folder.id,name:folder.name}))}}

async function chooseRoot(id:string){const found=await connected();if(!ID.test(id))throw new Refused('Choose a folder.');const token=await accessToken(found.refresh_token);const folder=await get(token,id,'id,name,mimeType,trashed');
 if(folder.mimeType!==FOLDER||folder.trashed)throw new Refused('Choose a folder.');await update({root_id:folder.id,root_name:folder.name,minutes_id:null});return {root:{id:folder.id,name:folder.name}}}

async function disconnect(){const found=await link();if(found)await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(found.refresh_token)}`,{method:'POST'}).catch(()=>{});
 const {error}=await admin.from('google_drive').delete().eq('id',1);if(error)throw error;cached=null;return {}}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return reply({error:'Not allowed.'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new Refused('Sign in first.',401);
  const {data:{user},error}=await admin.auth.getUser(token);const actor=user?.email?.toLowerCase();if(error||!actor)throw new Refused('Sign in first.',401);
  const {data:member,error:failure}=await admin.from('committee_members').select('role').eq('email',actor).maybeSingle();if(failure)throw failure;if(!member)throw new Refused('This is only for the committee.',403);
  const input=await request.json();const text=(key:string)=>String(input[key]??'');const action=text('action');
  const forOwners:Record<string,()=>Promise<unknown>>={'connect-url':()=>connectUrl(actor,text('redirect')),connect:()=>connect(actor,text('code'),text('state'),text('redirect')),folders:folderChoices,'choose-folder':()=>chooseRoot(text('folder')),disconnect};
  const forEveryone:Record<string,()=>Promise<unknown>>={status,list:()=>list(text('folder')),search:()=>find(text('query')),'save-minutes':()=>saveMinutes(text('name'),text('html'))};
  if(forOwners[action]&&member.role!=='owner')throw new Refused('Only an Owner can do this.',403);
  const run=forOwners[action]??forEveryone[action];if(!run)throw new Refused('Unknown action.');
  const result=await run();
  // Who did what, never what's in the Drive or the minutes.
  if(action!=='status'&&action!=='list'&&action!=='search')console.log(JSON.stringify({actor,action}));
  return reply(result);
 }catch(failure){
  if(failure instanceof Refused)return reply({error:failure.message},failure.status);
  console.error(failure instanceof Error?failure.message:JSON.stringify(failure));return reply({error:'Google Drive didn’t respond properly. Try again in a minute.'},500);
 }
});
