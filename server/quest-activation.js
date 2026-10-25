import { correctQuestWreck, ensureQuestWreck } from './quest-wreck.js';
import { HOME_QUESTS } from '../shared/homeworld.js';
import { HOME_STORY } from '../shared/home-story.js';
import { revealHomeSites } from './homequests.js';

export function revealQuestTarget(game, player, entity) {
  if (!entity) return;
  if (entity.sector) game.discover(player, 'sector', entity.sector);
  if (entity.system) game.discover(player, 'system', entity.system);
  game.revealAround(player, entity.x, entity.y, 0);
}

export function syncHomeQuests(game, player) {
  const q = player.homeQuest;
  if (!q) return;
  correctQuestWreck(game, player);
  q.active ||= {}; q.scenesSeen ||= {}; q.journal ||= [];
  q.pending = Object.keys(HOME_QUESTS).filter(id => !q.completed[id] && !q.active[id] && HOME_QUESTS[id].requires.every(key => q.completed[key])).sort();
  if (q.introduction) return;
  const id = q.pending.shift();
  if (!id) return;
  if(id==='H04'&&!ensureQuestWreck(game,player)) {q.pending.unshift(id);return;}
  q.active[id] = { at: game.time };
  q.introduction = id;
  q.journal.push({ id, at: game.time, speaker: HOME_STORY[id].speaker, text: HOME_STORY[id].text });
  const home = game.world.entities.get(player.homeworld);
  revealQuestTarget(game, player, home);
  if (id === 'H04') revealQuestTarget(game, player, game.world.entities.get(q.salvage?.wreck));
  if (home) revealHomeSites(game, player, home);
}

export function acknowledgeHomeStory(game, player, scene) {
  const q = player.homeQuest;
  if (!q || (!q.active?.[scene] && !q.completed?.[scene] && scene !== 'H04_MODULE')) return 'Diese Geschichte ist noch nicht verfügbar.';
  if (scene === 'H04_MODULE' && q.salvage?.phase !== 'workshop' && !q.completed.H04) return 'Der Fund wurde noch nicht übergeben.';
  q.scenesSeen ||= {}; q.scenesSeen[scene] = true;
  if (q.introduction === scene) q.introduction = null;
  if (q.eventDialog === scene) q.eventDialog = null;
  syncHomeQuests(game, player);
}
