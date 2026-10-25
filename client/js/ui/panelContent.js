/** Update panel content without replacing existing form controls during live ticks. */
export function patchPanelContent(element, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  patchChildren(element, template.content);
}

function patchChildren(target, source) {
  const incoming = [...source.childNodes];
  for (let i = 0; i < incoming.length; i++) {
    const next = incoming[i], current = target.childNodes[i];
    if (!current) { target.appendChild(next); continue; }
    if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName ||
        (current.nodeType === 1 && current.id !== next.id)) {
      current.replaceWith(next);
      continue;
    }
    if (current.nodeType !== 1) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      continue;
    }
    for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    for (const attr of next.attributes) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
    // Preserve the selected value and native popup, but still update option availability.
    const selected = current.tagName === 'SELECT' ? [...current.selectedOptions].map(option => option.value) : null;
    patchChildren(current, next);
    if (selected) for (const option of current.options) option.selected = selected.includes(option.value) && !option.disabled;
  }
  while (target.childNodes.length > incoming.length) target.lastChild.remove();
}
