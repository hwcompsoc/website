// Drafts an event's risk assessment with Cloudflare Workers AI, from the details the organiser has already entered. An organiser
// checks and changes it before it's saved, so it's a starting point, not a sign-off. Nothing sent here is stored or logged.
// Secrets: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN, the same as generate-minutes. RISK_MODEL is optional.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
class Refused extends Error{constructor(message:string,public status=400){super(message)}}

const secretKey=()=>{const keys=Deno.env.get('SUPABASE_SECRET_KEYS');return keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
const MODEL=Deno.env.get('RISK_MODEL')||Deno.env.get('MINUTES_MODEL')||'@cf/meta/llama-4-scout-17b-16e-instruct';

// The layout the draft follows. When the society's own template arrives, change this to match it.
const TEMPLATE=`# Risk assessment: EVENT TITLE

**Event:** the title
**Date and time:** the date and time
**Venue:** the venue
**Expected attendance:** the number if given, otherwise "To confirm"
**Lead organiser:** the name if given, otherwise "To confirm"
**Assessed by:** leave as "________"

## Hazards

| Hazard | Who could be harmed | Controls | Risk with controls | Still to do |
|---|---|---|---|---|
| A specific hazard | Who, such as attendees or organisers | What reduces it | Low, Medium or High | Anything not yet in place, or "Nothing" |

## Emergency arrangements

- Where the nearest first aider and first aid kit are, or "To confirm with the venue"
- Fire exits and the assembly point, or "To confirm with the venue"
- Who to call: 999 in an emergency, and campus security

## Sign-off

Checked by: ________   Date: ________`;

const instructions=`You draft risk assessments for events run by the Heriot-Watt University Computer Science Society (CompSoc), a student society in Edinburgh, for the Students' Union. You're given an event's details. Draft its risk assessment.

Rules:
- Include the hazards that realistically apply to this kind of event in this venue, usually five to ten. Think about slips and trips, crowding, electrical equipment and cables, food and allergies, alcohol if it's a social, accessibility, lone working, travel if it's off campus, and anything the details mention.
- Only list a control as in place if the details say so, or it's normal for a university room booking (such as fire alarms and marked exits). Put anything else under "Still to do" as an action, such as "Ask attendees about allergies when they sign up".
- Never invent facts about the venue, people or numbers. Write "To confirm" where something isn't known.
- Write in British English, plainly. Keep each table cell short.
- Reply with the risk assessment only, in Markdown, following this layout exactly:

${TEMPLATE}`;

const text=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);

async function draft(details:string){const account=Deno.env.get('CLOUDFLARE_ACCOUNT_ID');const token=Deno.env.get('CLOUDFLARE_AI_TOKEN');if(!account||!token)throw new Refused('Drafting isn’t set up yet. Ask whoever looks after the website.',503);
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,temperature:0.2,max_tokens:2500,messages:[{role:'system',content:instructions},{role:'user',content:`Event details:\n\n${details}`}]})});
 const body=await response.json().catch(()=>null);
 if(!response.ok){const detail=JSON.stringify(body?.errors??body??response.status);console.error(JSON.stringify({status:response.status,detail}));if(response.status===429||/neuron|daily free allocation|rate limit/i.test(detail))throw new Refused('Today’s free allowance for AI drafting has been used up. Try again tomorrow.',429);throw new Error('Workers AI refused the request.')}
 const written=String(body?.choices?.[0]?.message?.content??'').trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/,'$1').trim();if(!written)throw new Error('Workers AI sent back nothing.');return written}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return reply({error:'Not allowed.'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new Refused('Sign in first.',401);
  const {data:{user},error}=await admin.auth.getUser(token);const actor=user?.email?.toLowerCase();if(error||!actor)throw new Refused('Sign in first.',401);
  const {data:member,error:failure}=await admin.from('committee_members').select('email').eq('email',actor).maybeSingle();if(failure)throw failure;if(!member)throw new Refused('This is only for the committee.',403);
  const input=await request.json();
  const details=[['Title',text(input.title,120)],['Type',text(input.category,40)],['Date and time',text(input.when,120)],['Venue',text(input.venue,120)],['Description',text(input.description,800)],['Who it’s for',text(input.open_to,120)],['Cost',text(input.cost,60)],['Expected attendance',text(input.attendance,20)],['Lead organiser',text(input.lead,80)],['Requirements',text(input.requirements,800)],['Run sheet',text(input.run_sheet,1200)]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
  if(!text(input.title,120))throw new Refused('The event needs a title first.');
  const assessment=await draft(details);
  console.log(JSON.stringify({actor,action:'risk-assessment',model:MODEL}));return reply({assessment});
 }catch(failure){
  if(failure instanceof Refused)return reply({error:failure.message},failure.status);
  console.error(failure instanceof Error?failure.message:'Unknown failure');return reply({error:'The draft couldn’t be written just now. Try again in a minute.'},500);
 }
});
