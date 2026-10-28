// Display selection only: quest progress remains owned by the server.
export function selectHomeQuest(quests, progress, selected, step = 0) {
  const active = Object.keys(quests).filter(id => progress?.active?.[id] && !progress?.completed?.[id]);
  let index = Math.max(0, active.indexOf(selected));
  if (active.length) index = (index + step + active.length) % active.length;
  return { id: active[index] ?? null, index, count: active.length };
}
