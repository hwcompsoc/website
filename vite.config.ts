import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig,normalizePath,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {LIVE_EVENT_COLUMNS,SUPABASE_KEY,SUPABASE_URL} from './src/supabase-config.ts';

// Local development only: keeps the copy of live events in step with Supabase, so publishing, cancelling or removing an event shows
// up by itself, as it does on the real site through the deploy hook. Vite would reload every open tab when these files change, including
// the admin mid-animation, so its watcher skips them. Instead the tabs are told, and only the public site reloads (see main.tsx).
const ours=(path:string)=>{const file=normalizePath(path);return file.includes('/src/generated/')||file.endsWith('/public/live-events.json')};
function liveEvents():Plugin{
 const file=new URL('./src/generated/events.json',import.meta.url),published=new URL('./public/live-events.json',import.meta.url);
 return {name:'live-events',apply:'serve',enforce:'pre',
  config:()=>({server:{watch:{ignored:ours}}}),
  hotUpdate({file:changed}){if(ours(changed))return []},
  configureServer(server){
   const check=async()=>{try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/events?select=${LIVE_EVENT_COLUMNS}&order=starts_at`,{headers:{apikey:SUPABASE_KEY},signal:AbortSignal.timeout(4000)});if(!response.ok)return;
    const next=JSON.stringify(await response.json(),null,1)+'\n';if(next===readFileSync(file,'utf8'))return;
    writeFileSync(file,next);writeFileSync(published,next);
    for(const module of server.moduleGraph.getModulesByFile(normalizePath(fileURLToPath(file)))??[])server.moduleGraph.invalidateModule(module);
    server.ws.send({type:'custom',event:'live-events-changed'});
   }catch{/* Offline: carry on with the copy we have. */}};
   const timer=setInterval(check,5000);server.httpServer?.once('close',()=>clearInterval(timer));
  }};
}

export default defineConfig({plugins:[react(),tailwindcss(),liveEvents()],resolve:{alias:{'@':new URL('./src',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')}}});
