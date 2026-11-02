import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_KEY} from './supabase-config';
// Sign-in uses passwords, so there is never a session in the address to look for.
export const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
