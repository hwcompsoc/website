import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,shapes} from './generate-logo.mjs';
import {logo} from '../src/components/logo-paths.ts';
test('Inline logo matches the official SVGs and keeps the cursor separable (re-run npm run logo if this fails)',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(logo)),build());
 const svg=name=>readFileSync(new URL(`../public/website-assets/${name}`,import.meta.url),'utf8');
 assert.equal(logo.word.length+logo.cursor.length,shapes(svg('compsoc-blue.svg')).length);
 assert.equal(logo.cursor.length,shapes(svg('cursor-blue.svg')).length);
 assert.deepEqual(shapes(svg('compsoc-white.svg')).map(p=>p.d),shapes(svg('compsoc-blue.svg')).map(p=>p.d),'blue and white logos share geometry');
 assert.equal(logo.cursor.filter(p=>p.accent).length,1,'the cyan pixel belongs to the cursor');
});
