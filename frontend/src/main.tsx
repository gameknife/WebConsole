import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

// React.StrictMode is intentionally omitted: this app leans heavily on Framer
// Motion AnimatePresence overlays + the spatial-navigation focus tree, and
// StrictMode's dev-only double-mount of effects adds churn there without
// catching issues we don't already guard against. Production never double-mounts
// anyway, so dev stays aligned with the shipped build.
createRoot(rootEl).render(<App />);
