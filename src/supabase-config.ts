// Safe to publish: the key only allows what the database's row level security allows.
// The production project unless VITE_SUPABASE_URL and VITE_SUPABASE_KEY say otherwise (see .env.example). Vite supplies them in the browser, and scripts/load-env.mjs in Node.
import {env} from './env.ts';
if(!env.VITE_SUPABASE_URL!==!env.VITE_SUPABASE_KEY)throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_KEY, or neither.');
export const SUPABASE_URL=env.VITE_SUPABASE_URL??'https://xirsiblrzrfahslrloya.supabase.co';
export const SUPABASE_KEY=env.VITE_SUPABASE_KEY??'sb_publishable_WOE70jd-y4lmoZZJ3kIbhA_8NxjwQ-A';
export const LIVE_EVENT_COLUMNS='slug,title,category,level,starts_at,ends_at,venue,description,signup_required,luma_url,status,cover_path,cover_alt,cost,open_to';
export const COVER_BUCKET='event-covers';
export const coverThumb=(path:string)=>path.replace(/\.jpg$/,'-thumb.jpg');
export const COMMITTEE_BUCKET='committee-photos';
export const DOCUMENT_BUCKET='society-documents';
export const DOCUMENT_COLUMNS='id,title,approved_on,file_path,size_bytes,position';
export const COMMITTEE_SELECT='id,name,description,position,committee_people(id,team_id,name,photo_path,position,bio,studies,ask_me_about,discord,github,linkedin)';
export const FAQ_COLUMNS='id,question,answer,position';
export const GUIDE_COLUMNS='slug,title,category,kind,description,body,status,reviewed_on';
