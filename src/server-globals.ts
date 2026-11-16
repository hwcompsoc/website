// Just enough of a browser for the site to render in Node at build time (src/prerender.tsx). Effects never run there, so this only
// covers what modules touch as they load (cursor.ts, theme.ts) and what components read while rendering: the address, storage,
// media queries and the window's size. Everything reads as a fresh visit on a 1280×800 desktop with no saved settings.
// Imported first by prerender.tsx, so it runs before any of the site's modules.
const noop=()=>{};
const storage={getItem:()=>null,setItem:noop,removeItem:noop};
Object.assign(globalThis,{
 location:new URL('http://localhost/'),
 history:{state:null,scrollRestoration:'manual',replaceState:noop,pushState:noop,back:noop},
 addEventListener:noop,removeEventListener:noop,dispatchEvent:()=>true,
 innerWidth:1280,innerHeight:800,scrollY:0,
 requestAnimationFrame:()=>0,cancelAnimationFrame:noop,
 matchMedia:()=>({matches:false,addEventListener:noop,removeEventListener:noop}),
 localStorage:storage,sessionStorage:storage,
 MutationObserver:class{observe(){}disconnect(){}},
 document:{documentElement:{style:{setProperty:noop},dataset:{}},addEventListener:noop,removeEventListener:noop},
});
