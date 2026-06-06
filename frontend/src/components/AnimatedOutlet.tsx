// Routed launcher content with a lightweight per-route fade-in.
//
// We deliberately avoid AnimatePresence/exit animations here: combined with
// react-router's useOutlet and (dev) StrictMode, a "wait"-mode exit could fail
// to complete, leaving the URL changed but the page never mounting. Keying the
// motion.div on the pathname remounts it each navigation (fresh fade-in) and
// unmounts the previous page immediately, which also keeps the spatial-
// navigation focus tree free of overlapping/stale focusables.

import { motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';

export function AnimatedOutlet() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <motion.div
      key={location.pathname}
      className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      {element}
    </motion.div>
  );
}
