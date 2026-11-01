import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {links,route,routeParam,pages,events,filterEvents,calendar,enquiryMail} from '../src/content.ts';
test('Visitor site keeps all six routes and the exact user-supplied joining/contact destinations',()=>{
 assert.equal(pages.length,6);for(const page of pages)assert.equal(route('#'+page.id),page.id);assert.equal(route('#unknown'),'home');assert.equal(route('#resources/support'),'resources');assert.equal(routeParam('#resources/support'),'support');assert.equal(routeParam('#resources'),'');
 assert.equal(links.discord,'https://discord.gg/VwXhpb7mZW');assert.equal(links.instagram,'https://www.instagram.com/hwcompsoc');assert.equal(links.membership,'https://www.hwunion.com/societies/compsci/');assert.equal(links.email,'compsci.society@hw.ac.uk');
});
test('Event filters separate the sample archive, and calendar exports cannot be mistaken for live registrations',()=>{
 assert.equal(filterEvents('All','',false).length,3);assert.equal(filterEvents('Workshop','',true).length,1);assert.equal(filterEvents('All','unlikely unmatched phrase',false).length,0);
 const text=calendar(events[0]);assert.ok(text.includes('[PROTOTYPE EXAMPLE]'));assert.ok(text.includes('not a confirmed HW activity'));assert.ok(text.includes('DTSTART:20261112T173000Z'));assert.ok(!text.includes('ATTENDEE:'));assert.ok(text.endsWith('\r\n'));
 const href=enquiryMail('Example & team','review@example.invalid','Workshop','A local example only.');assert.ok(href.startsWith('mailto:compsci.society@hw.ac.uk?'));assert.ok(decodeURIComponent(href).includes('Example & team'));
});
test('Visitor branding uses byte-identical official SVG assets',()=>{
 const root=new URL('../',import.meta.url);for(const name of ['compsoc-blue.svg','compsoc-white.svg','cursor-blue.svg','cursor-white.svg']){const type=name.startsWith('cursor')?'icons':'logos';assert.deepEqual(readFileSync(new URL('public/website-assets/'+name,root)),readFileSync(new URL(`../asset-library/${type}/svg/${name}`,root)));}
});
