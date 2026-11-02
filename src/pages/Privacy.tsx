import type {ReactNode} from 'react';
import {links} from '../content';
import {titles,External,Intro} from '../components/shared';

// Plain facts about what the site does. If it starts collecting anything new, such as analytics, this has to change with it, and so does the date.
// The order follows the usual format for privacy pages, and covers what the ICO says a notice must include. Headings and jump links come from one list so they can't drift apart.
const UPDATED='2 November 2026';
const SECTIONS=[['who-we-are','Who we are'],['what-we-collect','What data we collect'],['why-we-use-it','Why we use it and our legal basis'],['who-we-share-it-with','Who we share it with'],['how-long-we-keep-it','How long we keep it'],['your-rights','Your rights'],['contact-or-complain','Contact us or make a complaint'],['changes','Changes to this page']] as const;
type SectionId=typeof SECTIONS[number][0];
function Heading({id}:{id:SectionId}){return <h2 id={id}>{SECTIONS.find(section=>section[0]===id)?.[1]}</h2>}
function Email(){return <a className="text-link" href={`mailto:${links.email}`}>{links.email}</a>}
function Out({href,children}:{href:string;children:ReactNode}){return <External href={href} className="text-link">{children}</External>}

export function Privacy(){return <><Intro path="privacy" title={titles.privacy}>What this website stores and who it shares it with. The short version: if you’re just visiting, almost nothing.</Intro><div className="wrap"><section className="site-section privacy-content">
 <p className="privacy-updated">Last updated {UPDATED}</p>
 <nav className="privacy-contents" aria-labelledby="privacy-contents-label"><p className="privacy-contents-label" id="privacy-contents-label">On this page</p><ul>{SECTIONS.map(([id,name])=><li key={id}><a href={`#${id}`}>{name}</a></li>)}</ul></nav>
 <div className="privacy-body">

 <Heading id="who-we-are"/>
 <p>This website is run by the Heriot-Watt Computer Science Society (HW CompSoc), a student society affiliated to the Heriot-Watt University Student Union. We’re responsible for the personal data described on this page, and you can reach us at <Email/>.</p>
 <p>Society membership is handled through the union, so <Out href="https://www.hwunion.com/privacy/societies">its society privacy statement</Out> covers that instead.</p>

 <Heading id="what-we-collect"/>
 <h3>If you’re visiting</h3>
 <p>This site doesn’t ask you to sign in, and it has no analytics, adverts or tracking. It doesn’t set cookies. It stores three small things in your own browser, and they never leave your device:</p>
 <ul><li>your light or dark theme, if you choose one</li><li>where you’d scrolled to on each page, so Back works properly</li><li>whether the opening animation has already played</li></ul>
 <p>Our hosting provider handles each request for a page and may keep short-term technical logs, such as IP addresses.</p>
 <h3>If you contact us</h3>
 <p>The partnership form doesn’t send anything to us. It opens your own email app with a draft, and you decide whether to send it. If you email us, we receive your email address and whatever you write.</p>
 <h3>If you appear on this site</h3>
 <p>The About page shows committee members’ names and, where they’ve agreed, their photos. Event images may show people too.</p>
 <h3>If you’re on the committee</h3>
 <p>Committee members sign in to manage the site. For that we keep their email address, their role, a securely hashed password and a record of which account created and last changed each event. A sign-in session is kept in their browser until they sign out.</p>

 <Heading id="why-we-use-it"/>
 <p>The law requires a reason, called a legal basis, for each use of personal data. Ours are:</p>
 <ul>
  <li><strong>Running and protecting the website:</strong> our legitimate interest in keeping the site working and secure.</li>
  <li><strong>Replying to you:</strong> our legitimate interest in answering messages sent to the society.</li>
  <li><strong>Committee names and event images:</strong> our legitimate interest in showing who runs the society and what it does.</li>
  <li><strong>Committee photos:</strong> the person’s consent, which they can withdraw at any time.</li>
  <li><strong>Committee sign-ins:</strong> our legitimate interest in controlling who can change the site, and knowing which account changed what.</li>
 </ul>
 <p>The three things stored in your browser stay on your device, so we never receive them.</p>

 <Heading id="who-we-share-it-with"/>
 <p>We don’t sell your data. These services handle it for us, or because you chose to use them:</p>
 <ul>
  <li><strong>Vercel</strong> hosts the site. It’s a US company with servers around the world, so requests and logs may be processed outside the UK, including in the US. Vercel says it protects this data through the UK Extension to the EU-US Data Privacy Framework and standard contractual clauses. See <Out href="https://vercel.com/legal/privacy-policy">Vercel’s privacy notice</Out>.</li>
  <li><strong>Supabase</strong> stores committee sign-ins and the site’s content in London.</li>
  <li><strong>Outlook</strong> holds the society’s email, through our Heriot-Watt University address.</li>
  <li><strong>Google or Outlook calendars</strong> receive the event or calendar details you’re adding, if you use “Add to calendar” or “Subscribe” with them.</li>
 </ul>
 <p>Links to Discord, Instagram, Luma, Native and the Heriot-Watt Union take you to services with their own privacy policies.</p>

 <Heading id="how-long-we-keep-it"/>
 <ul>
  <li><strong>Theme choice:</strong> in your browser until you clear it.</li>
  <li><strong>Scroll position and animation:</strong> in your browser until you close the tab.</li>
  <li><strong>Vercel’s technical logs:</strong> short term, as set by Vercel.</li>
  <li><strong>Emails:</strong> in the society’s mailbox for 2 years, then deleted. You can ask us to delete yours sooner.</li>
  <li><strong>Committee names and photos:</strong> until the person leaves the committee or asks us to remove them.</li>
  <li><strong>Event images:</strong> while the event is listed, unless someone in them asks us to remove them.</li>
  <li><strong>Committee accounts:</strong> removed when people leave the committee.</li>
  <li><strong>Record of event changes:</strong> stays with the event until the event is deleted. It’s only an account ID, and no longer leads to a person’s email once their account is removed.</li>
 </ul>

 <Heading id="your-rights"/>
 <p>You can ask us to:</p>
 <ul><li>give you a copy of your personal data</li><li>correct anything that’s wrong</li><li>delete your data</li><li>limit how we use it</li><li>give you data you provided in a format you can pass to someone else</li></ul>
 <p><strong>You also have the right to object</strong> to us using your data on the basis of our legitimate interests. If you’ve agreed to a photo being used, you can withdraw that at any time.</p>
 <p>Some rights only apply in certain situations, and we’ll tell you if one doesn’t. To use any of them, email <Email/>. It’s free, and we’ll reply within one month.</p>

 <Heading id="contact-or-complain"/>
 <p>For questions or complaints about this page or your data, email <Email/>.</p>
 <p>You can also complain to the Information Commissioner’s Office (ICO), the UK’s data protection regulator:</p>
 <ul><li>Online: <Out href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</Out></li><li>Phone: 0303 123 1113</li><li>Post: Information Commissioner’s Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</li></ul>

 <Heading id="changes"/>
 <p>If what this site collects or how we use it changes, we’ll update this page and the date at the top.</p>
 </div>
</section></div></>}
