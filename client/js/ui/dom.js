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
export function registerModal(id, render, onClose, { live = true } = {}) {
  modals.set(id, { render, onClose, live });
  const ov = $(id);
  ov.addEventListener('mousedown', (ev) => { if (ev.target === ov) closeModal(id); });
}

export function openModal(id) {
  $(id).hidden = false;
  modals.get(id)?.render();
}

export function closeModal(id) {
  if ($(id).hidden) return;
  $(id).hidden = true;
  modals.get(id)?.onClose?.();
}

export const isOpen = (id) => !$(id).hidden;
export function toggleModal(id) { isOpen(id) ? closeModal(id) : openModal(id); }

/** Alle offenen Modale neu zeichnen (z.B. nach Marktupdate) */
export function refreshModals() {
  for (const [id, m] of modals) if (m.live && isOpen(id) && !typing()) m.render();
}

/** Oberstes offenes Modal schließen; true, wenn eines offen war */
export function closeTopModal() {
  const open = [...modals.keys()].filter(isOpen);
  if (!open.length) return false;
  closeModal(open[open.length - 1]);
  return true;
}
