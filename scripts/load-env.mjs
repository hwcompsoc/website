// Local only: lets the scripts and vite.config.ts see .env.local, which Vite otherwise only hands to the browser code. Import this before anything that reads supabase-config.
// Values already set in the environment win, and on Vercel there is no file, so the site uses the production project.
import {existsSync} from 'node:fs';
const file=new URL('../.env.local',import.meta.url);
if(existsSync(file))process.loadEnvFile(file);
// A production build must never publish another project's content.
if(process.env.VERCEL_ENV==='production'&&process.env.VITE_SUPABASE_URL)throw new Error('VITE_SUPABASE_URL is for local testing. Remove it from Vercel’s production settings.');
if(process.env.VITE_SUPABASE_URL)console.log(`Using the Supabase project at ${process.env.VITE_SUPABASE_URL}`);
