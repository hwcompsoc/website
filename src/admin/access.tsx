import {createContext,useContext} from 'react';
import {supabase} from '../supabase';
import {friendly} from './ui';
import type {Member,Role} from '../admin-rules';

// Who is signed in and what their roles let them do. The database checks the same things, so this only decides what to show.
export type Access={email:string;name:string|null;owner:boolean;roles:string[];sees_all:boolean;create_events:boolean;finances:boolean;content_calendar:boolean;sponsors:boolean};
export const AccessContext=createContext<Access|null>(null);
export const useAccess=()=>{const access=useContext(AccessContext);if(!access)throw new Error('useAccess is only for signed-in admin pages.');return access};

type Checked={ok:boolean;failed:boolean;access:Access};
// Before the roles migration is applied, my_access doesn't exist yet, and everyone keeps what they could already do.
export async function checkAccess(email:string):Promise<Checked>{const [member,granted]=await Promise.all([supabase.from('committee_members').select('*').eq('email',email),supabase.rpc('my_access')]);
 const row=member.data?.[0] as {role?:string;name?:string|null}|undefined;const owner=row?.role==='owner';
 const legacy=!!granted.error&&/my_access|PGRST202|42883/.test(`${granted.error.code} ${granted.error.message}`);
 const given=(granted.data??{}) as Partial<Access>;
 const access:Access={email,name:row?.name??null,owner,roles:given.roles??[],sees_all:legacy||!!given.sees_all,create_events:legacy||!!given.create_events,finances:legacy||!!given.finances,content_calendar:legacy||!!given.content_calendar,sponsors:legacy||!!given.sponsors};
 return {ok:!member.error&&!!member.data?.length,failed:!!member.error||(!!granted.error&&!legacy),access}}

// Everyone on the committee, with their roles, for choosing who a task is for.
export async function loadTeam():Promise<{members:Member[];roles:Role[]}>{const [members,held,roles]=await Promise.all([supabase.from('committee_members').select('*').order('email'),supabase.from('committee_member_roles').select('email,role'),supabase.from('committee_roles').select('*').order('position')]);
 const failed=members.error??held.error??roles.error;if(failed)throw new Error(friendly(failed));
 const rolesOf=new Map<string,string[]>();for(const {email,role} of held.data as {email:string;role:string}[])rolesOf.set(email,[...rolesOf.get(email)??[],role]);
 return {members:(members.data as {email:string;name?:string|null;role:string}[]).map(m=>({email:m.email,name:m.name??null,owner:m.role==='owner',roles:rolesOf.get(m.email)??[]})),roles:roles.data as Role[]}}
