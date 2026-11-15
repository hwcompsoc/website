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

// The draft follows the Students' Union's risk assessment form (Heriot-Watt's Risk Assessment Appendix 1, version 2). The parts
// that are facts, the header, the scoring key and the review date, are filled in here. The AI writes only what needs judgement:
// the task, the PPE and the hazards. The admin then works out each R from L and S, rather than trusting the AI's arithmetic.
const SCORING='**L** is likelihood: 1 Unlikely, 2 Possible, 3 Likely, 4 Certain. **S** is severity: 1 Insignificant or no injury, 2 Minor injury, 3 Moderate injury, 4 Major injury or fatality. **R** is the level of risk, L × S: 1 to 3 is low, 4 to 8 is medium, and 9 or more is high.';
const HAZARDS_HEADER='| What are the hazards? | Who might be harmed? | Control measures (what are you already doing?) | L | S | R | Additional control measures (what further action is necessary?) | Action by whom? | Action by date |';

const instructions=`You draft risk assessments for events run by the Heriot-Watt University Computer Science Society (CompSoc), a student society in Edinburgh, on the Students' Union's risk assessment form. You're given an event's details. Write three sections of the form.

Rules:
- Include the hazards that realistically apply to this kind of event in this venue, usually five to ten. Always include slips, trips and falls. Think about crowding, electrical equipment and cables, food and allergies, alcohol if it's a social, accessibility, lone working, travel if it's off campus, and anything the details mention.
- "Control measures" are only what's already in place: what the details say, or what's normal for a university room booking (such as fire alarms and marked exits). Anything else goes under "Additional control measures" as an action, such as "Ask attendees about allergies when they sign up". If nothing more is needed, write "No further action".
- Score L (likelihood) and S (severity) from 1 to 4, with the controls already in place. L: 1 Unlikely, 2 Possible, 3 Likely, 4 Certain. S: 1 Insignificant or no injury, 2 Minor injury, 3 Moderate injury, 4 Major injury or fatality. R is L multiplied by S. Any hazard with an R of 9 or more must have additional control measures.
- "Action by whom?" is the lead organiser's name if given, otherwise "Lead organiser". "Action by date" is a real date before the event, such as two days before it.
- Never invent facts about the venue, people or numbers. Write "To confirm" where something isn't known.
- Write in British English, plainly. Keep each table cell short.
- Reply in Markdown with exactly these three sections and nothing else, starting with the first heading:

## Describe the task and equipment used

A detailed paragraph: what happens from setup to pack-down, and every piece of equipment used.

## PPE required for task

Any personal protective equipment needed, such as high-vis jackets for an outdoor event, or "None required".

## Hazards

${HAZARDS_HEADER}
|---|---|---|---|---|---|---|---|---|
| Slips, trips and falls | Society members, public attending the event | What's already in place | 2 | 2 | 4 | No further action | Who | A date |`;

const text=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
const cell=(value:string)=>value.replace(/\|/g,'/').replace(/\s+/g,' ').trim();
const ukToday=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric'}).format(new Date());

async function draft(details:string){const account=Deno.env.get('CLOUDFLARE_ACCOUNT_ID');const token=Deno.env.get('CLOUDFLARE_AI_TOKEN');if(!account||!token)throw new Refused('Drafting isn’t set up yet. Ask whoever looks after the website.',503);
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,temperature:0.2,max_tokens:2500,messages:[{role:'system',content:instructions},{role:'user',content:`Event details:\n\n${details}`}]})});
 const body=await response.json().catch(()=>null);
 if(!response.ok){const detail=JSON.stringify(body?.errors??body??response.status);console.error(JSON.stringify({status:response.status,detail}));if(response.status===429||/neuron|daily free allocation|rate limit/i.test(detail))throw new Refused('Today’s free allowance for AI drafting has been used up. Try again tomorrow.',429);throw new Error('Workers AI refused the request.')}
 let written=String(body?.choices?.[0]?.message?.content??'').trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/,'$1').trim();
 // Keep only the three sections, in case the model adds a title or a sign-off of its own.
 const start=written.search(/^##\s*Describe the task/im);if(start>0)written=written.slice(start);
 if(!written)throw new Error('Workers AI sent back nothing.');return written}

// The whole form: the header and the scoring key from what's known, around the sections the AI wrote.
function assemble(input:Record<string,unknown>,body:string){const title=text(input.title,120);const venue=text(input.venue,120)||'To confirm';const lead=text(input.lead,80)||'To confirm';
 const eventDay=text(input.when,120).split(',')[0]||'To confirm';
 return [`# Risk assessment: ${title}`,'',
  '| School/Directorate | Location | Reference | Date | Assessor |','|---|---|---|---|---|',
  `| ${cell(`Computer Science Society (CompSoc): ${title}`)} | ${cell(venue)} | ---- | ${ukToday()} | ${cell(lead)} |`,'',
  body,'',SCORING,'','## Next review date','',`${eventDay}, the day of the event.`,''].join('\n')}

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return reply({error:'Not allowed.'},405);
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new Refused('Sign in first.',401);
  const {data:{user},error}=await admin.auth.getUser(token);const actor=user?.email?.toLowerCase();if(error||!actor)throw new Refused('Sign in first.',401);
  const {data:member,error:failure}=await admin.from('committee_members').select('email').eq('email',actor).maybeSingle();if(failure)throw failure;if(!member)throw new Refused('This is only for the committee.',403);
  const input=await request.json();
  if(!text(input.title,120))throw new Refused('The event needs a title first.');
  const details=[['Title',text(input.title,120)],['Type',text(input.category,40)],['Date and time',text(input.when,120)],['Venue',text(input.venue,120)],['Description',text(input.description,800)],['Who it’s for',text(input.open_to,120)],['Cost',text(input.cost,60)],['Expected attendance',text(input.attendance,20)],['Lead organiser',text(input.lead,80)],['Requirements',text(input.requirements,800)],['Run sheet',text(input.run_sheet,1200)]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
  const assessment=assemble(input,await draft(details));
  console.log(JSON.stringify({actor,action:'risk-assessment',model:MODEL}));return reply({assessment});
 }catch(failure){
  if(failure instanceof Refused)return reply({error:failure.message},failure.status);
  console.error(failure instanceof Error?failure.message:'Unknown failure');return reply({error:'The draft couldn’t be written just now. Try again in a minute.'},500);
 }
});
