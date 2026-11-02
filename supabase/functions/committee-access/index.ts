// Lets Owners decide who can use the admin. It holds the secret key, so every request proves who is asking before anything happens.
// Temporary passwords are returned once and never stored or logged. Nobody can change their own access here, so nobody can lock themselves out.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
class Refused extends Error{constructor(message:string,public status=400){super(message)}}

const secretKey=()=>{const keys=Deno.env.get('SUPABASE_SECRET_KEYS');return keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});

// 16 characters from an alphabet with no look-alikes (no 0/O or 1/l/I), in groups so it's easy to copy.
const ALPHABET='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomLetter(){const limit=256-256%ALPHABET.length;for(;;){const [value]=crypto.getRandomValues(new Uint8Array(1));if(value<limit)return ALPHABET[value%ALPHABET.length]}}
const temporaryPassword=()=>Array.from({length:4},()=>Array.from({length:4},randomLetter).join('')).join('-');

async function allUsers(){const {data,error}=await admin.auth.admin.listUsers({perPage:1000});if(error)throw error;return data.users}
const findUser=async(email:string)=>(await allUsers()).find(user=>user.email?.toLowerCase()===email);
async function onList(email:string){const {data,error}=await admin.from('committee_members').select('email,role').eq('email',email).maybeSingle();if(error)throw error;return data}

async function list(){const {data,error}=await admin.from('committee_members').select('email,role').order('email');if(error)throw error;const users=await allUsers();const byEmail=new Map(users.map(user=>[user.email?.toLowerCase(),user]));
 return {people:data.map(person=>{const user=byEmail.get(person.email);return {...person,status:!user?'no-account':user.user_metadata?.must_change_password?'waiting':'active'}})}}

// Gives someone a new temporary password, creating their account first if they don't have one.
async function issuePassword(email:string){const password=temporaryPassword();const user=await findUser(email);const {error}=user?await admin.auth.admin.updateUserById(user.id,{password,email_confirm:true,user_metadata:{...user.user_metadata,must_change_password:true}}):await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{must_change_password:true}});if(error)throw error;return password}

async function add(email:string,role:string){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Refused('Enter a full email address.');if(await onList(email))throw new Refused('That person already has access.');
 // On the list first: the sign-up rule only allows accounts for people on it.
 const {error}=await admin.from('committee_members').insert({email,role});if(error)throw error;try{return {password:await issuePassword(email)}}catch(failure){await admin.from('committee_members').delete().eq('email',email);throw failure}}

async function remove(email:string){const {error}=await admin.from('committee_members').delete().eq('email',email);if(error)throw error;const user=await findUser(email);if(user){const {error:failure}=await admin.auth.admin.deleteUser(user.id);if(failure)throw failure}return {}}

async function setRole(email:string,role:string){const {error}=await admin.from('committee_members').update({role}).eq('email',email);if(error)throw error;return {}}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return reply({error:'Not allowed.'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new Refused('Sign in first.',401);
  const {data:{user},error}=await admin.auth.getUser(token);const actor=user?.email?.toLowerCase();if(error||!actor)throw new Refused('Sign in first.',401);
  if((await onList(actor))?.role!=='owner')throw new Refused('Only an Owner can do this.',403);
  const {action,email:given,role='member'}=await request.json();const email=String(given??'').trim().toLowerCase();
  if(action==='list')return reply(await list());
  if(role!=='member'&&role!=='owner')throw new Refused('That role doesn’t exist.');
  if(email===actor)throw new Refused('You can’t change your own access. Ask another Owner.');
  if(action!=='add'&&!(await onList(email)))throw new Refused('That person doesn’t have access.',404);
  const result=action==='add'?await add(email,role):action==='reset'?{password:await issuePassword(email)}:action==='remove'?await remove(email):action==='set-role'?await setRole(email,role):null;if(!result)throw new Refused('Unknown action.');
  console.log(JSON.stringify({actor,action,target:email,role}));return reply(result);
 }catch(failure){
  if(failure instanceof Refused)return reply({error:failure.message},failure.status);
  console.error(failure);return reply({error:'That didn’t work. Nothing should have changed, but refresh the page to check.'},500);
 }
});
