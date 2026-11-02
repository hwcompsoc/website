// Safe to publish: the key only allows what the database's row level security allows.
export const SUPABASE_URL='https://xirsiblrzrfahslrloya.supabase.co';
export const SUPABASE_KEY='sb_publishable_WOE70jd-y4lmoZZJ3kIbhA_8NxjwQ-A';
export const LIVE_EVENT_COLUMNS='slug,title,category,level,starts_at,ends_at,venue,description,signup_required,luma_url,status,cover_path,cover_alt';
export const COVER_BUCKET='event-covers';
export const coverThumb=(path:string)=>path.replace(/\.jpg$/,'-thumb.jpg');
