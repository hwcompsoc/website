import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {defineConfig,normalizePath,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fetchContent,generatedFiles,saveContent} from './scripts/live-content.mjs';

// Local development only: keeps the local copy of the content in step with Supabase, so publishing, cancelling or removing an event shows
// up by itself, as it does on the real site through the deploy hook. Vite would reload every open tab when these files change, including
// the admin mid-animation, so its watcher skips them. Instead the tabs are told, and only the public site reloads (see main.tsx).
const ours=(path:string)=>{const file=normalizePath(path);return file.includes('/src/generated/')||/\/public\/live-\w+\.json$/.test(file)};
function liveEvents():Plugin{
 return {name:'live-events',apply:'serve',enforce:'pre',
  config:()=>({server:{watch:{ignored:ours}}}),
  hotUpdate({file:changed}){if(ours(changed)||/\/public\/(event-covers|committee-photos|documents)\//.test(normalizePath(changed)))return []},
  configureServer(server){
   // Only Supabase changing triggers a write, not the local files differing from it: `npm test` writes its own test content into the same
   // files, and rewriting them mid-run made tests fail at random while the dev server was open. The first check always compares, so a stale copy still catches up.
   let last='';
   const check=async()=>{try{
    const content=await fetchContent(4000);const text=JSON.stringify(content);if(text===last)return;last=text;
    if(!saveContent(content))return;
    for(const changed of generatedFiles())for(const module of server.moduleGraph.getModulesByFile(normalizePath(fileURLToPath(changed)))??[])server.moduleGraph.invalidateModule(module);
    server.ws.send({type:'custom',event:'live-events-changed'});
   }catch{/* Offline: carry on with the copy we have. */}};
   const timer=setInterval(check,5000);server.httpServer?.once('close',()=>clearInterval(timer));
  }};
}

// The commit this build came from, for the footer's build stamp. Vercel supplies it; locally it comes from git, and it's left out if neither has it.
const commit=process.env.VERCEL_GIT_COMMIT_SHA||(()=>{try{return execSync('git rev-parse HEAD',{stdio:['ignore','pipe','ignore']}).toString().trim()}catch{return ''}})();

export default defineConfig({define:{__COMMIT__:JSON.stringify(commit)},plugins:[react(),tailwindcss(),liveEvents()],resolve:{alias:{'@':new URL('./src',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')}}});
