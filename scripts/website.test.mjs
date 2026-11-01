import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {links,route,legacyPath,suggestPath,canonicalPath,pagePath,pages,events,resources,filterEvents,calendar,enquiryMail} from '../src/content.ts';
test('Visitor site keeps all six routes and the exact user-supplied joining/contact destinations',()=>{
 assert.equal(pages.length,6);for(const page of pages)assert.deepEqual(route(pagePath(page.id)),{view:page.id,item:''});
 assert.equal(links.discord,'https://discord.gg/VwXhpb7mZW');assert.equal(links.instagram,'https://www.instagram.com/hwcompsoc');assert.equal(links.membership,'https://www.hwunion.com/societies/compsci/');assert.equal(links.email,'compsci.society@hw.ac.uk');
});
test('Paths resolve to pages and items, and anything else is not found',()=>{
 assert.deepEqual(route('/Events/'),{view:'events',item:''});assert.equal(canonicalPath('/Events/'),'/events');
 for(const event of events)assert.deepEqual(route('/events/'+event.id),{view:'events',item:event.id});for(const resource of resources)assert.deepEqual(route('/resources/'+resource.id),{view:'resources',item:resource.id});
 for(const path of ['/unknown','/home','/events/nope','/resources/nope','/about/team','/events/web/extra'])assert.equal(route(path).view,'notfound',path);
});
test('Old hash links lead to their new paths',()=>{
 assert.equal(legacyPath('#events'),'/events');assert.equal(legacyPath('#home'),'/');assert.equal(legacyPath('#resources/support'),'/resources?category=support');assert.equal(legacyPath('#resources'),'/resources');assert.equal(legacyPath('#main-content'),null);assert.equal(legacyPath(''),null);
});
test('Did you mean finds close addresses and stays quiet otherwise',()=>{
 for(const [typed,expected] of [['/evnts','/events'],['/abuot','/about'],['/partner','/partners'],['/jion','/join'],['/RESORCES','/resources'],['/home','/'],['/events/wbe','/events/web'],['/resources/gti','/resources/git'],['/events/nope','/events'],['/evnts/nope','/events']])assert.equal(suggestPath(typed),expected,typed);
 for(const typed of ['/x','/abc','/wp-admin','/contact','/'])assert.equal(suggestPath(typed),null,typed);
});
test('The host sends every address to the app, so paths survive a refresh',()=>{
 const {rewrites}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.deepEqual(rewrites,[{source:'/(.*)',destination:'/index.html'}]);
});
test('Event filters separate the sample archive, and calendar exports cannot be mistaken for live registrations',()=>{
 assert.equal(filterEvents('All','',false).length,3);assert.equal(filterEvents('Workshop','',true).length,1);assert.equal(filterEvents('All','unlikely unmatched phrase',false).length,0);
 const text=calendar(events[0]);assert.ok(text.includes('[PROTOTYPE EXAMPLE]'));assert.ok(text.includes('not a confirmed HW activity'));assert.ok(text.includes('DTSTART:20261112T173000Z'));assert.ok(!text.includes('ATTENDEE:'));assert.ok(text.endsWith('\r\n'));
 const href=enquiryMail('Example & team','review@example.invalid','Workshop','A local example only.');assert.ok(href.startsWith('mailto:compsci.society@hw.ac.uk?'));assert.ok(decodeURIComponent(href).includes('Example & team'));
});
test('The favicon is the official cursor, with its body following the system theme',()=>{
 const root=new URL('../',import.meta.url);const icon=readFileSync(new URL('public/website-assets/favicon.svg',root),'utf8');const blue=readFileSync(new URL('public/website-assets/cursor-blue.svg',root),'utf8');const white=readFileSync(new URL('public/website-assets/cursor-white.svg',root),'utf8');
 const css=icon.match(/<style>(.*?)<\/style>/)[1];assert.ok(/prefers-color-scheme:dark/.test(css));const plain=icon.replace(/<style>.*?<\/style>/,'');
 assert.equal(plain.replaceAll('class="body"','fill="#004066"'),blue);assert.equal(plain.replaceAll('class="body"','fill="#FFFFFF"'),white);assert.ok(readFileSync(new URL('index.html',root),'utf8').includes('href="/website-assets/favicon.svg"'));
});
test('Visitor branding uses byte-identical official SVG assets',()=>{
 const root=new URL('../',import.meta.url);for(const name of ['compsoc-blue.svg','compsoc-white.svg','cursor-blue.svg','cursor-white.svg']){const type=name.startsWith('cursor')?'icons':'logos';assert.deepEqual(readFileSync(new URL('public/website-assets/'+name,root)),readFileSync(new URL(`../asset-library/${type}/svg/${name}`,root)));}
});
