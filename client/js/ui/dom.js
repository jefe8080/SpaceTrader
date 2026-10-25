// Gemeinsame DOM-Helfer der Oberfläche
export const $ = (id) => document.getElementById(id);

/** innerHTML nur setzen, wenn sich etwas geändert hat (verhindert Flackern und verlorenen Fokus) */
export const setHtml = (el, html) => {
  if (el._html !== html) { el.innerHTML = html; el._html = html; }
};

export function toast(msg, kind = 'error') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

export function hint(text) {
  $('hint').hidden = !text;
  $('hint').textContent = text || '';
}

/** Fokus in einem Eingabefeld? Dann keine Tastenkürzel und kein Neuaufbau */
export const typing = () => document.activeElement?.matches?.('input, select, textarea');

// ---------- Modale Fenster ----------
const modals = new Map(); // id -> { render, onClose, live }

/** live = false: kein automatisches Neuzeichnen bei Updates (z.B. Editoren) */
export function registerModal(id, render, onClose, { live = true, liveWhileTyping = false } = {}) {
  modals.set(id, { render, onClose, live, liveWhileTyping });
  const ov = $(id);
  ov.addEventListener('mousedown', (ev) => { if (ev.target === ov) closeModal(id); });
}

const tradeIds = ['favorites','routesOverview','routeEditor'];
let tradeTab='favorites';
export function openModal(id) {
  if(tradeIds.includes(id)) {
    $('tradeHub').hidden=false;
    if(id!=='routeEditor') {
      tradeTab=id;
      for(const tab of ['favorites','routesOverview']) {
        const wasOpen=!$(tab).hidden;
        $(tab).hidden=tab!==id;
        if(wasOpen && tab!==id)modals.get(tab)?.onClose?.();
      }
      modals.get(id)?.render();
      if(!$('tradeHub').contains(document.activeElement))$(id).querySelector('button')?.focus({preventScroll:true});
      return;
    }
    if($('favorites').hidden && $('routesOverview').hidden) openModal(tradeTab);
    $('routeEditor').open=true;
  }
  $(id).hidden = false;
  modals.get(id)?.render();
}

export function closeModal(id) {
  if ($(id).hidden) return;
  $(id).hidden = true;
  modals.get(id)?.onClose?.();
  if(id==='favorites'||id==='routesOverview') {
    // Keep a collapsed draft when closing the workspace; explicit Cancel discards it.
    $('tradeHub').hidden=true;
  }

}

export const isOpen = (id) => !$(id).hidden && (!tradeIds.includes(id) || !$('tradeHub').hidden);
export function toggleModal(id) { isOpen(id) ? closeModal(id) : openModal(id); }

/** Alle offenen Modale neu zeichnen (z.B. nach Marktupdate) */
export function refreshModals() {
  for (const [id, m] of modals) if (m.live && isOpen(id) && (!typing() || m.liveWhileTyping)) m.render();
}

/** Oberstes offenes Modal schließen; true, wenn eines offen war */
export function closeTopModal() {
  if(isOpen('routeEditor')) { closeModal('routeEditor'); return true; }
  const open = [...modals.keys()].filter(isOpen);
  if (!open.length) return false;
  closeModal(open[open.length - 1]);
  return true;
}

/** Nonblocking in-game confirmation, with ordinary keyboard and screen-reader controls. */
export function confirmAction(message,onConfirm){
  let overlay=$('gameConfirm');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='gameConfirm';overlay.className='overlay';overlay.hidden=true;overlay.style.zIndex='100';
    overlay.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="gameConfirmTitle" style="width:min(520px,calc(100vw - 32px))"><h2 id="gameConfirmTitle">Aktion bestätigen</h2><p id="gameConfirmMessage"></p><div class="btnrow"><button id="gameConfirmCancel">Abbrechen</button><button class="primary" id="gameConfirmAccept">Verbindlich bestätigen</button></div></div>';
    document.body.append(overlay);registerModal('gameConfirm',()=>{},null,{live:false});
  }
  $('gameConfirmMessage').textContent=message;
  $('gameConfirmCancel').onclick=()=>closeModal('gameConfirm');
  $('gameConfirmAccept').onclick=()=>{closeModal('gameConfirm');onConfirm();};
  openModal('gameConfirm');$('gameConfirmCancel').focus();
}

$('tradeHub').addEventListener('mousedown',ev=>{if(ev.target===$('tradeHub'))closeModal(tradeTab);});
$('tradeHub').addEventListener('click',ev=>{
  const tab=ev.target.closest('[data-trade-tab]');
  if(tab)openModal(tab.dataset.tradeTab==='routes'?'routesOverview':'favorites');
});

$('tradeHub').addEventListener('keydown',ev=>{
  if(ev.key==='Escape') {
    ev.preventDefault();ev.stopPropagation();
    if(isOpen('routeEditor'))closeModal('routeEditor');else closeModal(tradeTab);
  }
  if(ev.key==='Tab') {
    const controls=[...$('tradeHub').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,textarea')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}
  }
});
