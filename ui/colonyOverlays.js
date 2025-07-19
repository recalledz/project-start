export let locationListContainer;
export let explorationListContainer;
export let startDungeonBtn;

import { createOverlay } from './overlay.js';
import { sectSystem, SECT_SCHEDULE, getCurrentSchedule, renderConstructCards } from '../sect.js';
import { systems, sectState } from '../game/state.js';
import { createSectDiscipleCard, renderColonyTasks, renderExplorationTab, startExploration, discipleGatherPhase } from '../script.js';

let explorationOverlay = null;
let explorationOverlayActiveTab = 'explore';

export function closeExplorationOverlay() {
  if (explorationOverlay) explorationOverlay.close();
}

export function openExplorationOverlay() {
  if (explorationOverlay) return;
  explorationOverlay = createOverlay({ className: 'exploration-overlay' });
  explorationOverlay.onClose(() => {
    explorationOverlay = null;
  });
  const { box } = explorationOverlay;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', explorationOverlay.close);
  box.appendChild(closeBtn);

  const map = document.createElement('img');
  map.src = 'img/Map.jpg';
  map.className = 'exploration-map';
  box.appendChild(map);

  const tabs = document.createElement('div');
  tabs.className = 'exploration-overlay-tabs';
  box.appendChild(tabs);
  const content = document.createElement('div');
  content.className = 'exploration-overlay-content';
  box.appendChild(content);

  const defs = [
    { key: 'explore', label: 'Exploration' },
    { key: 'wood', label: 'Woodcutting' },
    { key: 'mining', label: 'Mining' }
  ];
  const containers = {};
  defs.forEach(def => {
    const btn = document.createElement('button');
    btn.textContent = def.label;
    tabs.appendChild(btn);
    const pane = document.createElement('div');
    pane.className = 'exploration-tab-content';
    content.appendChild(pane);
    containers[def.key] = pane;
    btn.addEventListener('click', () => {
      explorationOverlayActiveTab = def.key;
      update();
    });
  });

  // exploration tab elements
  locationListContainer = document.createElement('div');
  locationListContainer.className = 'location-list casino-section';
  explorationListContainer = document.createElement('div');
  explorationListContainer.className = 'exploration-list casino-section';
  startDungeonBtn = document.createElement('button');
  startDungeonBtn.className = 'startDungeonBtn';
  startDungeonBtn.textContent = 'Start';
  startDungeonBtn.addEventListener('click', startExploration);

  const exploreWrap = document.createElement('div');
  exploreWrap.className = 'explore-wrap';
  exploreWrap.appendChild(locationListContainer);
  exploreWrap.appendChild(explorationListContainer);
  containers.explore.appendChild(exploreWrap);
  containers.explore.appendChild(startDungeonBtn);

  // simple placeholders for other tabs
  containers.wood.textContent = 'Woodcutting coming soon.';
  containers.mining.textContent = 'Mining coming soon.';

  function update() {
    Array.from(tabs.children).forEach((b, i) => {
      const key = defs[i].key;
      b.classList.toggle('active', key === explorationOverlayActiveTab);
      containers[key].classList.toggle('active', key === explorationOverlayActiveTab);
    });
    if (explorationOverlayActiveTab === 'explore') {
      renderExplorationTab();
    }
  }

  update();
}

let workOverlay = null;
let workOverlaySelected = null;
export function openWorkOverlay() {
  if (workOverlay) return;
  workOverlay = createOverlay({ className: 'work-overlay' });
  workOverlay.onClose(() => {
    workOverlay = null;
    workOverlaySelected = null;
  });
  const { box } = workOverlay;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', workOverlay.close);
  box.appendChild(closeBtn);

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Work';
  box.appendChild(header);

  const content = document.createElement('div');
  content.className = 'work-content';
  box.appendChild(content);

  const left = document.createElement('div');
  left.className = 'work-disciples';
  content.appendChild(left);

  const right = document.createElement('div');
  right.className = 'work-tasks';
  content.appendChild(right);

  function render() {
    left.innerHTML = '';
    sectSystem.disciples.forEach(d => {
      const card = createSectDiscipleCard(d);
      if (d.id === workOverlaySelected) card.classList.add('selected');
      card.addEventListener('click', () => {
        workOverlaySelected = d.id;
        render();
      });
      left.appendChild(card);
    });

    right.innerHTML = '';
    const tasks = ['Gather Fruit', 'Gather Softwood'];
    if (systems.buildingUnlocked) tasks.push('Building');
    tasks.forEach(t => {
      const btn = document.createElement('button');
      btn.textContent = t;
      btn.addEventListener('click', () => {
        if (workOverlaySelected == null) return;
        const prev = sectState.discipleTasks[workOverlaySelected];
        sectState.discipleTasks[workOverlaySelected] = t;
        discipleGatherPhase[workOverlaySelected] = -1;
        if (prev === 'Chant' && t !== 'Chant') {
          delete sectState.chantAssignments[workOverlaySelected];
          if (typeof renderConstructCards === 'function') {
            renderConstructCards();
          }
        }
        if (typeof renderColonyTasks === 'function') renderColonyTasks();
        render();
      });
      right.appendChild(btn);
    });
  }

  render();
}

let scheduleOverlay = null;
export function openScheduleOverlay() {
  if (scheduleOverlay) return;
  scheduleOverlay = createOverlay({ className: 'schedule-overlay' });
  let interval;
  scheduleOverlay.onClose(() => {
    if (interval) clearInterval(interval);
    scheduleOverlay = null;
  });
  const { box } = scheduleOverlay;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', scheduleOverlay.close);
  box.appendChild(closeBtn);

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Schedule';
  box.appendChild(header);

  const timeEl = document.createElement('div');
  box.appendChild(timeEl);

  const table = document.createElement('div');
  table.className = 'schedule-table';
  SECT_SCHEDULE.forEach(ph => {
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.textContent = `${ph.phase}: ${ph.action}`;
    table.appendChild(row);
  });
  box.appendChild(table);

  function update() {
    const cur = getCurrentSchedule();
    const remaining = cur.duration - sectSystem.scheduleTimer;
    timeEl.textContent = `${cur.phase} - ${Math.ceil(remaining)}s left`;
    [...table.children].forEach((row, i) => {
      row.classList.toggle('current', i === sectSystem.scheduleIndex);
    });
  }
  update();
  interval = setInterval(update, 1000);
}

export function openPlaceholderOverlay(title) {
  const ov = createOverlay({});
  const { box } = ov;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', ov.close);
  box.appendChild(closeBtn);
  const msg = document.createElement('div');
  msg.textContent = `${title} coming soon`;
  box.appendChild(msg);
}
