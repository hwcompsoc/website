// Writes meeting minutes from a Teams transcript with Cloudflare Workers AI. It holds the Cloudflare token, so it checks the
// caller is on the committee first. Transcripts and minutes are never stored or logged here.
// Secrets: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN (an API token with Workers AI permission). MINUTES_MODEL is optional.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
class Refused extends Error{constructor(message:string,public status=400){super(message)}}

const secretKey=()=>{const keys=Deno.env.get('SUPABASE_SECRET_KEYS');return keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});

// Keep in step with TRANSCRIPT_MAX in src/admin-rules.ts.
const TRANSCRIPT_MAX=120000;
// A long context window matters more than size here: a two-hour meeting is around 30,000 tokens.
const MODEL=Deno.env.get('MINUTES_MODEL')||'@cf/meta/llama-4-scout-17b-16e-instruct';

const instructions=(title:string,date:string)=>`You write the minutes of meetings for the committee of the Heriot-Watt University Computer Science Society (CompSoc). You are given the transcript of a Microsoft Teams meeting, one line per turn, in the form "Name: what they said". Write the minutes of that meeting.

Rules:
- Use only what is in the transcript. Never invent names, decisions, numbers, dates or actions. If something is unclear, write [unclear] rather than guessing.
- Summarise. Don't quote people word for word, and don't record who said every point unless it matters, such as who proposed or objected to something.
- Leave out small talk and talk about the call itself, such as "can you hear me" or "you're on mute".
- Group the discussion into agenda items in the order they came up. Use the agenda if someone reads one out, otherwise give each topic a short, plain name.
- Record a decision only if the meeting clearly agreed it.
- An action is something a named person agreed to do. Give the deadline only if one was said, otherwise write "Not set".
- Write in British English, in a plain, neutral tone, in the past tense.
- Reply with the minutes only, in Markdown, following this layout exactly:

# ${title}

**Date:** ${date}
**Present:** everyone who spoke, as full names, separated by commas
**Apologies:** anyone said to be absent, or "None recorded"

## 1. First agenda item
A short summary of the discussion, as a paragraph or bullet points.

**Decided:** what was agreed. Leave this line out if nothing was decided.

## 2. Next agenda item
…

## Actions

| Action | Who | By when |
|---|---|---|
| What they'll do | Their name | The deadline or "Not set" |

If there are no actions, write "No actions recorded." under the Actions heading instead of the table.`;

const longDate=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00Z`));

async function write(title:string,date:string,transcript:string){const account=Deno.env.get('CLOUDFLARE_ACCOUNT_ID');const token=Deno.env.get('CLOUDFLARE_AI_TOKEN');if(!account||!token)throw new Refused('Minutes aren’t set up yet. Ask whoever looks after the website.',503);
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,temperature:0.2,max_tokens:3000,messages:[{role:'system',content:instructions(title,longDate(date))},{role:'user',content:`Transcript:\n\n${transcript}`}]})});
 const body=await response.json().catch(()=>null);
 if(!response.ok){const detail=JSON.stringify(body?.errors??body??response.status);console.error(JSON.stringify({status:response.status,detail}));
  // The free allowance resets at midnight UTC.
  if(response.status===429||/neuron|daily free allocation|rate limit/i.test(detail))throw new Refused('Today’s free allowance for writing minutes has been used up. Try again tomorrow.',429);
  if(/context|too long|max.*tokens/i.test(detail))throw new Refused('That transcript is too long for the AI to read in one go. Split it in two and do each half separately.',413);
  throw new Error('Workers AI refused the request.')}
 const text=String(body?.choices?.[0]?.message?.content??'').trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/,'$1').trim();
 if(!text)throw new Error('Workers AI sent back nothing.');
 return text}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return reply({error:'Not allowed.'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new Refused('Sign in first.',401);
  const {data:{user},error}=await admin.auth.getUser(token);const actor=user?.email?.toLowerCase();if(error||!actor)throw new Refused('Sign in first.',401);
  const {data:member,error:failure}=await admin.from('committee_members').select('email').eq('email',actor).maybeSingle();if(failure)throw failure;if(!member)throw new Refused('This is only for the committee.',403);
  const {title:givenTitle,date:givenDate,transcript:givenTranscript}=await request.json();const title=String(givenTitle??'').trim().slice(0,120);const date=String(givenDate??'');const transcript=String(givenTranscript??'').trim();
  if(!title)throw new Refused('Name the meeting.');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Refused('Choose the date of the meeting.');
  if(!transcript)throw new Refused('Paste the transcript first.');if(transcript.length>TRANSCRIPT_MAX)throw new Refused('That transcript is too long. Split it in two and do each half separately.',413);
  const minutes=await write(title,date,transcript);
  // Who and how much, never what: the transcript can hold anything said in the meeting.
  console.log(JSON.stringify({actor,action:'minutes',characters:transcript.length,model:MODEL}));return reply({minutes});
 }catch(failure){
  if(failure instanceof Refused)return reply({error:failure.message},failure.status);
  console.error(failure instanceof Error?failure.message:'Unknown failure');return reply({error:'The minutes couldn’t be written just now. Try again in a minute. Your transcript is still on the page.'},500);
 }
});
