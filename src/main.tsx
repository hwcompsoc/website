import React from 'react';
import {createRoot} from 'react-dom/client';
import Website from './Website';
import './website.css';
import './motion.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Website/></React.StrictMode>);
