// Creates and manages committee sign-ins, from the committee_members table in Supabase. No emails are sent.
//
//   node scripts/committee-accounts.mjs                  create an account for anyone on the list without one
//   node scripts/committee-accounts.mjs --reset <email>  give one person a new temporary password
//   node scripts/committee-accounts.mjs --remove-old     delete accounts for people no longer on the list
//
// It asks for the Supabase secret key (Project Settings > API Keys), or reads SUPABASE_SECRET_KEY. The key and the temporary
// passwords are never saved: copy each password from the screen, send it privately, and close the terminal.
import './load-env.mjs';
import {randomInt} from 'node:crypto';
import {SUPABASE_URL} from '../src/supabase-config.ts';

const base=process.env.SUPABASE_URL_FOR_TEST??SUPABASE_URL;
const args=process.argv.slice(2);
const resetAt=args.indexOf('--reset');
const resetEmail=resetAt>=0?args[resetAt+1]?.trim().toLowerCase():undefined;
const removeOld=args.includes('--remove-old');
if(resetAt>=0&&!resetEmail){console.error('Say whose password to reset: --reset someone@hw.ac.uk');process.exit(1)}

// Typed without showing on screen.
function askHidden(question){return new Promise((resolve,reject)=>{const input=process.stdin;if(!input.isTTY){reject(new Error('Run this in your own terminal, or set SUPABASE_SECRET_KEY.'));return}process.stdout.write(question);let value='';input.setRawMode(true);input.resume();input.setEncoding('utf8');
 const onData=text=>{for(const ch of text){if(ch==='\u0003'){process.stdout.write('\n');process.exit(130)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();input.off('data',onData);process.stdout.write('\n');resolve(value.trim());return}if(ch==='\u007f'||ch==='\b')value=value.slice(0,-1);else value+=ch}};input.on('data',onData)})}

// 16 characters from an alphabet with no look-alikes (no 0/O or 1/l/I), in groups so it's easy to copy.
const ALPHABET='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const temporaryPassword=()=>Array.from({length:4},()=>Array.from({length:4},()=>ALPHABET[randomInt(ALPHABET.length)]).join('')).join('-');

async function main(){
 const key=process.env.SUPABASE_SECRET_KEY?.trim()||await askHidden('Supabase secret key: ');
 if(!key)throw new Error('No key given.');
 // Older JWT keys also need the Authorization header; newer sb_secret_ keys go in apikey alone.
 const headers={apikey:key,'Content-Type':'application/json',...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})};
 const call=async(path,method='GET',body)=>{const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const text=await response.text();if(!response.ok)throw new Error(`Supabase answered ${response.status} for ${method} ${path.split('?')[0]}: ${text.slice(0,200)}`);return text?JSON.parse(text):null};

 const committee=(await call('/rest/v1/committee_members?select=email&order=email')).map(row=>row.email);
 const users=(await call('/auth/v1/admin/users?per_page=1000')).users??[];
 const byEmail=new Map(users.map(user=>[user.email?.toLowerCase(),user]));
 const made=[];

 if(resetEmail){
  if(!committee.includes(resetEmail))throw new Error(`${resetEmail} isn't on the committee list, so it wasn't changed.`);
  const password=temporaryPassword();const user=byEmail.get(resetEmail);
  if(user)await call(`/auth/v1/admin/users/${user.id}`,'PUT',{password,email_confirm:true,user_metadata:{...user.user_metadata,must_change_password:true}});
  else await call('/auth/v1/admin/users','POST',{email:resetEmail,password,email_confirm:true,user_metadata:{must_change_password:true}});
  made.push([resetEmail,password]);
 }else if(removeOld){
  const old=users.filter(user=>!committee.includes(user.email?.toLowerCase()));
  for(const user of old){await call(`/auth/v1/admin/users/${user.id}`,'DELETE');console.log(`Removed ${user.email}`)}
  if(!old.length)console.log('No old accounts to remove.');
 }else{
  for(const email of committee){if(byEmail.has(email)){console.log(`Already has an account: ${email}`);continue}const password=temporaryPassword();await call('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{must_change_password:true}});made.push([email,password])}
 }

 if(made.length){console.log('\nSend each person their temporary password privately. It won\'t be shown again, and they\'ll choose a new one when they first sign in.\n');for(const [email,password] of made)console.log(`${email}  ${password}`);console.log('')}
 else if(!removeOld)console.log('Nothing to do.');
}
main().catch(error=>{console.error(error.message);process.exit(1)});
