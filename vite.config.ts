import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig,normalizePath,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fetchContent} from './scripts/live-content.mjs';

// Local development only: keeps the copy of live events and the committee in step with Supabase, so publishing, cancelling or removing an event shows
// up by itself, as it does on the real site through the deploy hook. Vite would reload every open tab when these files change, including
// the admin mid-animation, so its watcher skips them. Instead the tabs are told, and only the public site reloads (see main.tsx).
const ours=(path:string)=>{const file=normalizePath(path);return file.includes('/src/generated/')||/\/public\/live-(events|committee)\.json$/.test(file)};
function liveEvents():Plugin{
 const file=new URL('./src/generated/events.json',import.meta.url),committeeFile=new URL('./src/generated/committee.json',import.meta.url),published=new URL('./public/live-events.json',import.meta.url),publishedCommittee=new URL('./public/live-committee.json',import.meta.url);
 return {name:'live-events',apply:'serve',enforce:'pre',
  config:()=>({server:{watch:{ignored:ours}}}),
  hotUpdate({file:changed}){if(ours(changed)||/\/public\/(event-covers|committee-photos)\//.test(normalizePath(changed)))return []},
  configureServer(server){
   const check=async()=>{try{
    const {events,committee}=await fetchContent(4000);const next=JSON.stringify(events,null,1)+'\n',people=JSON.stringify(committee,null,1)+'\n';if(next===readFileSync(file,'utf8')&&people===readFileSync(committeeFile,'utf8'))return;
    writeFileSync(committeeFile,people);writeFileSync(publishedCommittee,people);writeFileSync(file,next);writeFileSync(published,next);
    for(const changed of [file,committeeFile])for(const module of server.moduleGraph.getModulesByFile(normalizePath(fileURLToPath(changed)))??[])server.moduleGraph.invalidateModule(module);
    server.ws.send({type:'custom',event:'live-events-changed'});
   }catch{/* Offline: carry on with the copy we have. */}};
   const timer=setInterval(check,5000);server.httpServer?.once('close',()=>clearInterval(timer));
  }};
}

export default defineConfig({plugins:[react(),tailwindcss(),liveEvents()],resolve:{alias:{'@':new URL('./src',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')}}});
