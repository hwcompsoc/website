// Renders a page of the public site to HTML at build time, so search engines, link previews and visitors without JavaScript get the
// page's content, not an empty <div id="root">. scripts/write-pages.mjs puts it in each page's HTML. It's the page's first frame:
// main.tsx then renders the app over it as usual (createRoot, not hydrate), so a visitor's own motion and theme settings never clash
// with what was rendered here.
import './server-globals';
import {renderToString} from 'react-dom/server';
import Website from './Website';

// `url` is the page's full address. Its origin goes into links that need one, such as calendar links.
export function render(url:string){(globalThis as unknown as {location:URL}).location=new URL(url);return renderToString(<Website prerender/>)}
