import { setRouter } from './ui.js';
import { loadConfig } from './config.js';
import { admin } from './admin.js';

// Separate owner-only entry point; never part of the child SPA router.
setRouter(() => { location.href = '/#/parents'; });

try {
  await loadConfig();
} catch {}

admin();
