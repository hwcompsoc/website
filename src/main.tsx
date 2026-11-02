import React from 'react';
import {createRoot} from 'react-dom/client';
import Website from './Website';
import {startRouter} from './router';
import {AdminGate} from './AdminGate';
import './website.css';
import './motion.css';
// The admin is its own site. Its code and the Supabase library only load for people who open it.
const inAdmin=/^\/admin(\/|$)/i.test(location.pathname);
startRouter();
// Local development: a changed event refreshes the public site. The admin checks for itself and must not be reloaded mid-animation.
if(import.meta.hot&&!inAdmin)import.meta.hot.on('live-events-changed',()=>location.reload());
createRoot(document.getElementById('root')!).render(<React.StrictMode>{inAdmin?<AdminGate/>:<Website/>}</React.StrictMode>);
