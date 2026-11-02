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
createRoot(document.getElementById('root')!).render(<React.StrictMode>{inAdmin?<AdminGate/>:<Website/>}</React.StrictMode>);
