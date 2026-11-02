// Writes a real page for every address, so a link posted in Discord or elsewhere previews the right title, description and image.
// Each one is the same app, which takes over as usual. Anything else falls through to index.html, as vercel.json says.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {sharePage,sharePages} from '../src/share.ts';
const dist=new URL('../dist/',import.meta.url);
// Vercel provides the production address, and follows it when the permanent domain is added. SITE_URL overrides it.
const host=process.env.VERCEL_PROJECT_PRODUCTION_URL??process.env.VERCEL_URL;
const site=(process.env.SITE_URL??(host?`https://${host}`:'')).replace(/\/$/,'');
if(!site)console.warn('No site address, so these pages have no share images. That\'s fine locally. Set SITE_URL anywhere else.');
const template=readFileSync(new URL('index.html',dist),'utf8');const list=sharePages();
for(const share of list){const folder=new URL(`.${share.path}/`.replace('//','/'),dist);mkdirSync(folder,{recursive:true});writeFileSync(new URL('index.html',folder),sharePage(template,share,site))}
console.log(`Wrote ${list.length} pages for ${site||'no site address'}.`);
