// DOM references assigned after overlays are constructed
export let locationListContainer = null;
export let explorationListContainer = null;
export let startDungeonBtn = null;

import { createOverlay } from './overlay.js';
import { sectSystem, SECT_SCHEDULE, getCurrentSchedule, renderConstructCards, getDailyResourceDelta, getDiscipleDailyOutput } from '../game/sect.js';
import { systems, sectState, worldProgress } from '../game/state.js';
import { createSectDiscipleCard, renderExplorationTab, startExploration, startWorldCombat, discipleGatherPhase } from '../script.js';

let explorationOverlay = null;
let explorationOverlayActiveTab = 'explore';

export function closeExplorationOverlay() {
  if (explorationOverlay) explorationOverlay.close();
}

export function openExplorationOverlay() {
  if (explorationOverlay) return;
  explorationOverlay = createOverlay({ className: 'exploration-overlay', boxClass: 'parchment-box' });
  explorationOverlay.box.classList.add('parchment-box');
  explorationOverlay.onClose(() => {
    explorationOverlay = null;
  });
  const { box } = explorationOverlay;


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
  const exoRow = document.createElement('div');
  exoRow.className = 'location-entry';
  exoRow.textContent = 'Exoteric Dungeon';
  exoRow.addEventListener('click', openDungeonOverlay);
  locationListContainer.appendChild(exoRow);
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
  workOverlay = createOverlay({ className: 'work-overlay', boxClass: 'parchment-box' });
  workOverlay.box.classList.add('parchment-box');
  workOverlay.onClose(() => {
    workOverlay = null;
    workOverlaySelected = null;
  });
  const { box } = workOverlay;

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
      const entry = document.createElement('div');
      entry.className = 'work-entry';

      const card = createSectDiscipleCard(d);
      if (d.id === workOverlaySelected) card.classList.add('selected');
      card.addEventListener('click', () => {
        workOverlaySelected = d.id;
        render();
      });

      const taskLabel = document.createElement('div');
      taskLabel.className = 'work-task';
      const task = sectState.discipleTasks[d.id] || 'Idle';
      taskLabel.textContent = task;

      const output = getDiscipleDailyOutput(d);
      const outLabel = document.createElement('div');
      outLabel.className = 'work-output';
      outLabel.textContent = output > 0 ? `+${output.toFixed(1)}/day` : '';

      entry.appendChild(card);
      entry.appendChild(taskLabel);
      entry.appendChild(outLabel);
      left.appendChild(entry);
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
  scheduleOverlay = createOverlay({ className: 'schedule-overlay', boxClass: 'parchment-box' });
  scheduleOverlay.box.classList.add('parchment-box');
  let interval;
  scheduleOverlay.onClose(() => {
    if (interval) clearInterval(interval);
    scheduleOverlay = null;
  });
  const { box } = scheduleOverlay;

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
  const ov = createOverlay({ boxClass: 'parchment-box' });
  ov.box.classList.add('parchment-box');
  const { box } = ov;
  const msg = document.createElement('div');
  msg.textContent = `${title} coming soon`;
  box.appendChild(msg);
}

let resourceOverlay = null;
export function openResourceOverlay() {
  if (resourceOverlay) return;
  resourceOverlay = createOverlay({ className: 'resource-overlay', boxClass: 'parchment-box' });
  resourceOverlay.box.classList.add('parchment-box');
  let interval;
  resourceOverlay.onClose(() => {
    if (interval) clearInterval(interval);
    resourceOverlay = null;
  });
  const { box } = resourceOverlay;


  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Daily Resource Change';
  box.appendChild(header);

  const list = document.createElement('div');
  list.className = 'resource-deltas';
  box.appendChild(list);

  function render() {
    list.innerHTML = '';
    const deltas = getDailyResourceDelta();
    deltas.forEach(d => {
      const row = document.createElement('div');
      row.className = 'resource-delta-row';
      const gain = d.gain.toFixed(1);
      const loss = d.loss.toFixed(1);
      row.innerHTML = `<span>${d.name}</span><span class="gain">+${gain}</span><span class="loss">-${loss}</span>`;
      list.appendChild(row);
    });
  }

  render();
  interval = setInterval(render, 1000);
}

export function openBuildOverlay() {
  openPlaceholderOverlay('Build');
}

let dungeonOverlay = null;
export function closeDungeonOverlay() {
  if (dungeonOverlay) dungeonOverlay.close();
}

export function openDungeonOverlay() {
  if (dungeonOverlay) return;
  dungeonOverlay = createOverlay({ className: 'dungeon-overlay', boxClass: 'parchment-box' });
  dungeonOverlay.box.classList.add('parchment-box');
  dungeonOverlay.onClose(() => { dungeonOverlay = null; });
  const { box } = dungeonOverlay;


  const partyList = document.createElement('div');
  partyList.className = 'exploration-list casino-section';
  box.appendChild(partyList);

  const worldsContainer = document.createElement('div');
  worldsContainer.className = 'worldsContainer casino-section';
  box.appendChild(worldsContainer);

  sectSystem.disciples.forEach(d => {
    const row = document.createElement('label');
    row.className = 'exploration-entry';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = d.id;
    const badge = createSectDiscipleCard(d);
    row.appendChild(cb);
    row.appendChild(badge);
    partyList.appendChild(row);
  });

  Object.entries(worldProgress).forEach(([id, data]) => {
    if (!data.unlocked) return;
    const entry = document.createElement('div');
    entry.className = 'world-entry';
    entry.innerHTML = `<div>World ${id} (Lv ${data.level})</div>`;
    const progress = document.createElement('div');
    progress.className = 'world-progress';
    const fill = document.createElement('div');
    fill.className = 'world-progress-fill';
    fill.style.width = `${Math.min(100, (data.progress / data.progressTarget) * 100)}%`;
    progress.appendChild(fill);
    entry.appendChild(progress);
    const btn = document.createElement('button');
    btn.textContent = 'Enter';
    btn.addEventListener('click', () => {
      const ids = Array.from(partyList.querySelectorAll('input:checked')).map(n => parseInt(n.value));
      startWorldCombat(parseInt(id), ids);
    });
    entry.appendChild(btn);
    worldsContainer.appendChild(entry);
  });
}
