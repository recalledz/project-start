export function createOverlay({ className = '', container = document.body } = {}) {
  const element = document.createElement('div');
  element.classList.add('upgrade-selection-overlay');
  if (className) {
    className.split(' ').forEach(cls => cls && element.classList.add(cls));
  }

  const closeHandlers = new Set();
  function close() {
    element.remove();
    closeHandlers.forEach(fn => fn());
    closeHandlers.clear();
  }

  function onClose(fn) {
    closeHandlers.add(fn);
  }

  function appendButton(label, handler) {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (handler) btn.addEventListener('click', handler);
    element.appendChild(btn);
    return btn;
  }

  function append(node) {
    element.appendChild(node);
  }

  container.appendChild(element);

  return { element, append, appendButton, onClose, close };
}
