// Settings from the environment: Vite supplies them in the browser, and scripts/load-env.mjs in Node. Only names starting with VITE_ reach the browser.
const node=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env;
export const env:Record<string,string|undefined>=import.meta.env??node;
// Resources is switched off unless VITE_SHOW_RESOURCES is "true", in Vercel or .env.local. Off, the site leaves out the page and its guides, though confirmed guides still count as live in the admin.
// Written out in full so Vite fills in the value when it builds, and leaves the guides out of the download while it's off.
export const resourcesSwitchedOn=(import.meta.env?import.meta.env.VITE_SHOW_RESOURCES:node?.VITE_SHOW_RESOURCES)==='true';
