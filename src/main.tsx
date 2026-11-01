import React from 'react';
import {createRoot} from 'react-dom/client';
import Website from './Website';
import {startRouter} from './router';
import './website.css';
import './motion.css';
startRouter();
createRoot(document.getElementById('root')!).render(<React.StrictMode><Website/></React.StrictMode>);
