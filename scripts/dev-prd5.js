// Isolated PRD-5 development server. Never selects the active default database.
process.env.WORLD_PROFILE = 'homeworld';
process.env.PORT ||= '3005';
await import('../server/index.js');
