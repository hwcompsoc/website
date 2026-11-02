import {links} from '../content';
import {titles,Intro} from '../components/shared';

// Plain facts about what the site does. If it starts collecting anything new, such as analytics, this has to change with it.
export function Privacy(){return <><Intro path="privacy" title={titles.privacy}>What this website stores and who it shares it with. The short version: if you’re just visiting, almost nothing.</Intro><div className="wrap"><section className="site-section privacy-content">
 <h2>If you’re visiting</h2>
 <p>This site doesn’t ask you to sign in, and it has no analytics, adverts or tracking. It doesn’t set cookies. It stores three small things in your own browser, and they never leave your device:</p>
 <ul><li>your light or dark theme, if you choose one, until you clear it</li><li>where you’d scrolled to on each page, so Back works properly, until you close the tab</li><li>whether the opening animation has already played, until you close the tab</li></ul>
 <p>The site is hosted by Vercel, which handles each request for a page and may keep short-term technical logs, such as IP addresses, to run and protect its service.</p>
 <h2>Contacting us</h2>
 <p>The partnership form doesn’t send anything to us. It opens your own email app with a draft, and you decide whether to send it. If you email us, we’ll use your message to reply.</p>
 <h2>Other services</h2>
 <p>Links to Discord, Instagram, Luma, Native and the Heriot-Watt Union take you to services with their own privacy policies. If you use “Add to calendar” or “Subscribe” with Google or Outlook, that service receives the event or calendar details you’re adding.</p>
 <h2>People on this site</h2>
 <p>The About page shows committee members’ names and, where they’ve agreed, their photos. Event images may show people too. If you’d like something about you changed or removed, email us and we’ll sort it out.</p>
 <h2>Committee sign-ins</h2>
 <p>Committee members sign in to manage the site. For that we keep their email address, a securely hashed password and a record of which account made changes, using Supabase in the UK. A sign-in session is kept in their browser until they sign out. Accounts are removed when people leave the committee.</p>
 <h2>Questions</h2>
 <p>Email <a className="text-link" href={`mailto:${links.email}`}>{links.email}</a> with any questions about this page or your information.</p>
</section></div></>}
