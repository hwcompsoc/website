// Copies live events, the committee, the FAQs and the guides from Supabase into the site when it builds, so the public site keeps working if Supabase is down.
// A failed fetch fails the build, which leaves the last good deployment live.
// --optional: for local development, carry on with whatever is there. --empty: for tests, start with fixed content.
import {EMPTY_CONTENT,TEST_CONTENT,contentExists,fetchContent,saveContent} from './live-content.mjs';
if(process.argv.includes('--empty')){saveContent(TEST_CONTENT);process.exit(0)}
try{
 const content=await fetchContent();saveContent(content);console.log(`Copied ${content.events.length} live event${content.events.length===1?'':'s'}, ${content.committee.length} committee roles, ${content.faqs.length} questions and ${content.guides.length} guides from Supabase.`);
}catch(error){
 if(!process.argv.includes('--optional')){console.error(`Could not fetch from Supabase: ${error.message}`);process.exit(1)}
 if(!contentExists())saveContent(EMPTY_CONTENT);console.warn(`Could not fetch from Supabase, so using what's already here: ${error.message}`);
}
