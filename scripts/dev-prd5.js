// Isolated PRD-5 development server. Never selects the active default database.
import {fileURLToPath} from 'node:url';
process.env.WORLD_PROFILE = 'homeworld';
process.env.PORT ||= '3005';
process.env.DB_FILE ||= fileURLToPath(new URL('../data/prd5/spacetrader.db',import.meta.url));
process.env.DEV_TOOLS='1';
await import('../server/index.js');
