// Copies live events, the committee, the FAQs, the guides and the documents from Supabase into the site when it builds, so the public site keeps working if Supabase is down.
// A failed fetch fails the build, which leaves the last good deployment live.
// --optional: for local development, carry on with whatever is there. --empty: for tests, start with fixed content.
import {EMPTY_CONTENT,TEST_CONTENT,contentExists,discordExists,fetchContent,fetchDiscord,saveContent,saveDiscord} from './live-content.mjs';
if(process.argv.includes('--empty')){saveContent(TEST_CONTENT);saveDiscord({members:null});process.exit(0)}
// The Discord count is a nice-to-have, so failing to get it only warns, even in a real build.
try{const discord=await fetchDiscord();saveDiscord(discord);console.log(`Discord has ${discord.members??'an unknown number of'} members.`)}catch(error){if(!discordExists())saveDiscord({members:null});console.warn(`Could not get the Discord member count, so leaving it out: ${error.message}`)}
try{
 const content=await fetchContent();saveContent(content);console.log(`Copied ${content.events.length} live event${content.events.length===1?'':'s'}, ${content.committee.length} committee roles, ${content.faqs.length} questions, ${content.guides.length} guides and ${content.documents.length} documents from Supabase.`);
}catch(error){
 if(!process.argv.includes('--optional')){console.error(`Could not fetch from Supabase: ${error.message}`);process.exit(1)}
 if(!contentExists())saveContent(EMPTY_CONTENT);console.warn(`Could not fetch from Supabase, so using what's already here: ${error.message}`);
}
