// Keeps the licences of everything the site ships next to the build.
import {copyFile,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist/licenses');
await mkdir(out,{recursive:true});
await copyFile(path.join(root,'src/fonts/DepartureMono-OFL.txt'),path.join(out,'departure-mono-OFL.txt'));
await copyFile(path.join(root,'LICENSES/shadcn-LICENSE'),path.join(out,'shadcn-LICENSE.txt'));
const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));
for(const [relative,metadata] of Object.entries(lock.packages)){
 if(!relative.startsWith('node_modules/')||metadata.dev)continue;
 const directory=path.join(root,relative);
 for(const name of await readdir(directory).catch(()=>[]))if(/^licen[sc]e(?:\.|$)/i.test(name))await copyFile(path.join(directory,name),path.join(out,relative.replaceAll('node_modules/','').replaceAll('/','__')+'__'+name)).catch(()=>{});
}
await writeFile(path.join(root,'dist/THIRD-PARTY-NOTICES.md'),'# Third-party notices\n\nThe licenses folder holds the licences of the packages this site ships, the shadcn/ui source licence, and the SIL Open Font License for Departure Mono (© Helena Zhang).\n');
