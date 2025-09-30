import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootEl = document.getElementById('root')!;

// Disable StrictMode in development to avoid intentional double-mount
// which causes Canvas (three.js) to repeatedly unmount/remount.
// StrictMode remains enabled in production builds.
const rootNode = import.meta.env.DEV ? <App /> : (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(rootEl).render(rootNode);
