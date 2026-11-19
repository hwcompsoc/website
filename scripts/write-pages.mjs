// Writes a real page for every address, with its content already in it (src/prerender.tsx), so search engines and link previews in
// Discord or elsewhere get the right title, description, image and text, plus the calendar files, which need the site's address too.
// Each page is the same app, which takes over as usual. Anything else gets 404.html with a real 404 status, and the admin gets its
// own empty shell, as vercel.json says.
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import './load-env.mjs';
import {sharePage,sharePages} from '../src/share.ts';
import {calendar,calendarFeed,eventFilePath,FEED_PATH} from '../src/calendar.ts';
import {events,tabTitles} from '../src/content.ts';
const {render}=await import('../.prerender/prerender.js');
const dist=new URL('../dist/',import.meta.url);
const INDEXNOW_KEY='29556876c057a3bbe3961a910dfe4485';
// Vercel provides the production address, and follows it when the permanent domain is added. SITE_URL overrides it.
const host=process.env.VERCEL_PROJECT_PRODUCTION_URL??process.env.VERCEL_URL;
const site=(process.env.SITE_URL??(host?`https://${host}`:'')).replace(/\/$/,'');
if(!site)console.warn('No site address, so these pages have no share images, canonical links or structured data. That\'s fine locally. Set SITE_URL anywhere else.');
// Every page shows text in Departure Mono near the top, so the font starts loading with the page rather than after the styles.
const font=readdirSync(new URL('assets/',dist)).find(name=>/^DepartureMono-.*\.woff2$/.test(name));
const template=readFileSync(new URL('index.html',dist),'utf8').replace('</head>',()=>`${font?`<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin>`:''}</head>`);
const write=(path,html)=>{const folder=new URL(`.${path}/`.replace('//','/'),dist);mkdirSync(folder,{recursive:true});writeFileSync(new URL('index.html',folder),html)};
const noindex=html=>html.replace('</head>',()=>'<meta name="robots" content="noindex"></head>');
const titled=(html,title)=>html.replace(/<title>.*?<\/title>/s,()=>`<title>${title}</title>`);
// A short hash of what a page says, for IndexNow below. Built file names change with every code change, so they're left out.
const fingerprint=html=>createHash('sha256').update(html.replace(/\/assets\/[^"'\s)]+/g,'')).digest('hex').slice(0,16);
const list=sharePages();const fingerprints={};
for(const share of list){const html=sharePage(template,share,site).replace('<div id="root"></div>',()=>`<div id="root">${render((site||'http://localhost')+share.path)}</div>`);write(share.path,html);fingerprints[share.path]=fingerprint(html)}
// Any other address: the app shows its "not found" page, with suggestions, for whatever address was asked for.
writeFileSync(new URL('404.html',dist),noindex(titled(template,tabTitles.notfound)));
// The admin draws itself, and must never show the home page's content while it loads.
write('/admin',noindex(titled(template,'HW CompSoc admin')));
// Calendar files sit beside the pages, and include cancelled and past events so that subscribers' copies stay right.
writeFileSync(new URL(`.${FEED_PATH}`,dist),calendarFeed(events,site));for(const event of events)writeFileSync(new URL(`.${eventFilePath(event)}`,dist),calendar(event,site));
// Tell search engines what's here, and to leave the admin alone. Only events know when they last changed, so only they have a <lastmod>.
writeFileSync(new URL('robots.txt',dist),`User-agent: *\nDisallow: /admin\n${site?`\nSitemap: ${site}/sitemap.xml\n`:''}`);
if(site)writeFileSync(new URL('sitemap.xml',dist),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(share=>`<url><loc>${site}${share.path==='/'?'/':share.path}</loc>${share.lastModified?`<lastmod>${new Date(share.lastModified).toISOString()}</lastmod>`:''}</url>`).join('\n')}\n</urlset>\n`);
// IndexNow tells Bing and other search engines which pages changed, once they're live. The key isn't secret: serving the key file proves
// the site chose it. The `indexnow` edge function (supabase/functions) compares these fingerprints with the ones it last sent.
if(site){writeFileSync(new URL(`${INDEXNOW_KEY}.txt`,dist),INDEXNOW_KEY);writeFileSync(new URL('indexnow.json',dist),JSON.stringify({key:INDEXNOW_KEY,pages:fingerprints}))}
console.log(`Wrote ${list.length} pages and ${events.length+1} calendar files for ${site||'no site address'}.`);
