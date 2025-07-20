export function createOverlay({ className = '', boxClass = '', container = document.body, closable = true } = {}) {
  const element = document.createElement('div');
  element.classList.add('overlay');
  if (className) {
    className.split(' ').forEach(cls => cls && element.classList.add(cls));
  }

  const box = document.createElement('div');
  box.classList.add('overlay-box');
  if (boxClass) {
    boxClass.split(' ').forEach(cls => cls && box.classList.add(cls));
  }
  let closeBtn = null;
  if (closable) {
    closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);
    box.appendChild(closeBtn);
  }
  element.appendChild(box);

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
    box.appendChild(btn);
    return btn;
  }

  function append(node) {
    box.appendChild(node);
  }

  container.appendChild(element);

  return { element, box, append, appendButton, onClose, close };
}
