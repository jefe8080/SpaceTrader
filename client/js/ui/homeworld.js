import { GOODS, RECIPES } from '/shared/config.js';
import { HOME_QUESTS, HOMEWORLD } from '/shared/homeworld.js';
import { state, fmt, esc } from '../state.js';
import { cmd } from '../net.js';

let dialog;
export function renderHomeDialog() {
  if (!dialog) {
    dialog = document.createElement('div'); dialog.className = 'overlay'; dialog.id = 'homeStory'; dialog.hidden = true;
    dialog.innerHTML = `<section class="home-story" role="dialog" aria-modal="true" aria-labelledby="homeStoryTitle">
      <img src="/assets/art/homeworld/arrival.png" alt="Mira begrüßt dich am beleuchteten Landeplatz zwischen überwachsenen Ruinen.">
      <div class="home-story-text"><div class="muted">HAUPTGESCHICHTE · H00</div><h2 id="homeStoryTitle">Ein Licht im Rauschen</h2>
      <p><b>Mira · Hafenmeisterin</b></p><p>„Wir sehen dein Signal. Der alte Landeplatz hält noch – wenn du uns herunterfindest.“</p>
      <p class="muted">Deine Heimatwelt liegt direkt in deiner Nähe. Fliege sie an und lande, um Kontakt mit den Bewohnern aufzunehmen.</p>
      <button class="primary" data-story-close>Zur Heimat</button> <button data-story-close>Überspringen</button>
      <p class="muted small-note">Diese Szene bleibt im Heimatjournal nachlesbar. Deine Schiffe und Lieferungen laufen während des Dialogs weiter.</p></div></section>`;
    dialog.addEventListener('click', (event) => {
      if (!event.target.closest('[data-story-close]')) return;
      state.homeDialogReplay = false;
      if (state.homeQuest) { state.homeQuest.scenesSeen ||= {}; state.homeQuest.scenesSeen.H00 = true; }
      dialog.hidden = true; cmd('homeDialogRead', { scene: 'H00' });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dialog.hidden) { event.stopImmediatePropagation(); dialog.querySelector('[data-story-close]').click(); }
    }, true);
    document.body.append(dialog);
  }
  dialog.hidden = !state.me || !state.homeQuest || (!!state.homeQuest.scenesSeen?.H00 && !state.homeDialogReplay);
}

const names = { dock: 'Dock und Zentrallager', control: 'Leitstelle', workshop: 'Antriebswerkstatt' };
const completed = (id) => !!state.homeQuest?.completed[id];
export function homePanel(entity, item, ship) {
  const home = entity.market.homeworld;
  if (home.owner !== state.me.id) return '<div class="muted">Persönliche Ruinenwelt eines anderen Kapitäns.</div>';
  if (item.kind === 'questhouse') {
    let html = `<div class="muted">Hauptquests laufen unabhängig von normalen Quests. Mehrere freigeschaltete Zweige können gleichzeitig fortschreiten.</div>`;
    html += `<div class="kv"><span>Einwohner / Wohnraum</span><span>${home.population} / ${home.housing}</span><span>Grundenergie</span><span>${home.power}</span><span>Leitstelle</span><span>Stufe ${home.controlLevel}</span>
      <span>Eigenproduktion</span><span>${fmt(home.produced.water || 0)} Wasser · ${fmt(home.produced.food || 0)} Nahrung · ${fmt(home.produced.ingots || 0)} Barren</span>
      <span>Versorgter Betrieb nach H03</span><span>${Math.floor(home.suppliedSeconds)} / 600 s</span></div>`;
    for (const [id, quest] of Object.entries(HOME_QUESTS)) {
      const unlocked = quest.requires.every(completed);
      html += `<div class="quest-offer"><b>${id} · ${esc(quest.title)} ${completed(id) ? '✓' : ''}</b><p>${esc(quest.goal)}</p>
      <div class="muted">${quest.credits} Cr · ${quest.xp} XP${unlocked ? '' : ' · Voraussetzung: ' + quest.requires.join(', ')}</div>
      ${completed(id) ? '' : `<button class="small primary" data-pp="homeQuest" data-quest="${id}" ${unlocked ? '' : 'disabled'}>Fortschritt prüfen und abschließen</button>`}</div>`;
    }
    html += '<details><summary>Journal nachlesen</summary><button class="small" data-pp="homeReplay">Ankunftsszene erneut ansehen</button>' + (state.homeQuest?.journal || []).map((entry) => `<p><b>${esc(entry.speaker || entry.id)}</b> · ${esc(entry.text)}</p>`).join('') + '</details>';
    return html;
  }
  if (item.kind === 'plot') return `<div class="muted">Freier Bauplatz ${item.plotIndex + 1}. Aktuell ${home.plots} von maximal ${HOMEWORLD.start.maxPlots} Plätzen erschlossen. Grundruinen und zentrale Infrastruktur besitzen eigene Anker.</div>`;
  const facility = item.homeFacility, building = home.facilities[facility];
  if (!building) return '';
  const cost = facility === 'dock' ? { credits: 0, seconds: 15, goods: { ingots: 4 } }
    : facility === 'control' ? { credits: 500, seconds: 30, goods: { ingots: 4 } } : HOMEWORLD.industry.repair;
  let html = `<div class="kv"><span>Anlage</span><span>${esc(names[facility] || RECIPES[facility]?.name || facility)}</span><span>Zustand</span><span>${building.status === 'ready' ? 'Betriebsbereit' : building.status === 'building' ? 'Reparatur läuft · ' + Math.max(0, Math.ceil(building.readyAt - state.time)) + ' s' : 'Beschädigte Ruine'}</span></div>`;
  if (facility === 'workshop' && building.status === 'ruined') html += '<p>Der Reliktfund führt zur Wiederherstellung dieser Werkstatt.</p>';
  else if (building.status === 'ruined') html += `<p>${cost.credits} Cr · ${Object.entries(cost.goods).map(([g, n]) => n + ' ' + GOODS[g].name).join(', ')} · ${cost.seconds} s</p>
    <button class="primary" data-pp="homeRepair" data-facility="${facility}">Reparieren</button>`;
  if (RECIPES[facility]) {
    const recipe = RECIPES[facility];
    html += `<p>${Object.entries(recipe.in).map(([g,n]) => `${n} ${GOODS[g].name}`).join(' + ')} → ${Object.entries(recipe.out).map(([g,n]) => `${n} ${GOODS[g].name}`).join(' + ')}</p><div class="muted">Reparierter Grundbetrieb: 10 % Geschwindigkeit. ${esc(building.blocked || '')}</div>`;
  }
  if (facility === 'dock' && building.status === 'ready') {
    const goods = Object.entries(entity.market.goods).filter(([g, slot]) => slot.stock > 0 || ship?.cargo?.[g]);
    html += '<p>Eigene Transfers sind kostenlos. Reparaturmaterial und Starthilfen werden einmalig vergeben.</p><table class="market"><tr><th>Ware</th><th>Lager / Schiff</th><th></th></tr>';
    for (const [good, slot] of goods) html += `<tr><td>${GOODS[good].name}</td><td>${fmt(slot.stock)} / ${fmt(ship?.cargo?.[good] || 0)}</td><td>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="buy" ${ship && slot.stock >= 1 ? '' : 'disabled'}>Laden</button>
      <button class="small" data-pp="homeTransfer" data-good="${good}" data-dir="sell" ${ship?.cargo?.[good] ? '' : 'disabled'}>Einlagern</button></td></tr>`;
    html += '</table>';
  }
  return html;
}
