// DOM references assigned after overlays are constructed
export let locationListContainer = null;
export let explorationListContainer = null;
export let startDungeonBtn = null;

import { createOverlay } from './overlay.js';
import { sectSystem, SECT_SCHEDULE, getCurrentSchedule, renderConstructCards, getDailyResourceDelta, getDiscipleDailyOutput } from '../game/sect.js';
import { systems, sectState, worldProgress } from '../game/state.js';
import { createSectDiscipleCard, renderExplorationTab, startExploration, startWorldCombat, discipleGatherPhase } from '../script.js';
import { BUILDINGS, startBuilding } from '../game/buildings.js';
import { castWordOfHaste, toggleReverberation } from '../game/orbSpells.js';
import { TRANSMUTES, performTransmute, canTransmute, getTransmutePower } from '../game/transmutation.js';
import { TASK_GROUPS } from '../game/constants.js';
import { getTaskSkillProgress } from '../utils/skills.js';

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
    if (systems.researchUnlocked) tasks.push('Research');
    const selected = sectSystem.disciples.find(d => d.id === workOverlaySelected);
    tasks.forEach(t => {
      const option = document.createElement('div');
      option.className = 'work-task-option';

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
      option.appendChild(btn);

      if (selected) {
        const group = TASK_GROUPS[t];
        if (group) {
          const xp = sectState.discipleSkills[selected.id]?.[group] || 0;
          const lvl = getTaskSkillProgress(xp).level;
          const info = document.createElement('div');
          info.className = 'work-task-info';
          const affinity = selected.affinities?.[group];
          if (affinity === 'liked' || affinity === 'loved') {
            const icon = document.createElement('i');
            icon.dataset.lucide = affinity === 'loved' ? 'heart' : 'thumbs-up';
            icon.className = `affinity-icon ${affinity}`;
            info.appendChild(icon);
          }
          const label = document.createElement('span');
          label.textContent = `Lv ${lvl}`;
          info.appendChild(label);
          option.appendChild(info);
        }
      }

      right.appendChild(option);
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

let orbOverlay = null;
export function openOrbOverlay() {
  if (orbOverlay) return;
  orbOverlay = createOverlay({ className: 'orb-overlay', boxClass: 'parchment-box' });
  orbOverlay.box.classList.add('parchment-box');
  orbOverlay.onClose(() => { orbOverlay = null; });
  const { box } = orbOverlay;

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Orb Management';
  box.appendChild(header);

  const spellHeader = document.createElement('h3');
  spellHeader.textContent = 'Spells';
  box.appendChild(spellHeader);

  const list = document.createElement('ul');
  list.className = 'orb-spell-list';
  box.appendChild(list);


  function render() {
    list.querySelectorAll('.dynamic-spell').forEach(el => el.remove());
    if (sectState.completedResearch.includes('wordOfHaste')) {
      const li = document.createElement('li');
      li.className = 'orb-spell dynamic-spell';
      const btn = document.createElement('button');
      btn.textContent = 'Cast Word of Haste';
      btn.disabled = sectSystem.wordOfHasteCd > 0 || sectSystem.orbs.water.current < 15;
      btn.addEventListener('click', () => { castWordOfHaste(); render(); });
      li.appendChild(btn);
      li.appendChild(document.createTextNode(' - Boost work speed for 1m'));
      list.appendChild(li);
    }
    if (sectState.completedResearch.includes('orbReverb')) {
      const li = document.createElement('li');
      li.className = 'orb-spell dynamic-spell';
      const btn = document.createElement('button');
      btn.textContent = sectSystem.orbReverbActive ? 'Stop Reverberation' : 'Start Reverberation';
      btn.disabled = !sectSystem.orbReverbActive && sectSystem.orbs.water.current < 1;
      btn.addEventListener('click', () => { toggleReverberation(); render(); });
      li.appendChild(btn);
      li.appendChild(document.createTextNode(' - +30% attack speed, drains 1 Water/s'));
      list.appendChild(li);
    }
  }

  render();
}

let transmuteOverlay = null;
export function openTransmuteOverlay() {
  if (transmuteOverlay) return;
  transmuteOverlay = createOverlay({ className: 'transmute-overlay', boxClass: 'parchment-box' });
  transmuteOverlay.box.classList.add('parchment-box');
  transmuteOverlay.onClose(() => { transmuteOverlay = null; globalThis.updateTransmuteOverlay = null; });
  const { box } = transmuteOverlay;

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Transmutation';
  box.appendChild(header);

  const powerEl = document.createElement('div');
  box.appendChild(powerEl);

  const list = document.createElement('div');
  list.className = 'transmute-list';
  box.appendChild(list);

  function formatCost(cost) {
    return Object.entries(cost)
      .map(([res, amt]) => `${amt}${res === 'softwood' ? '\u{1FAB5}' : ''}`)
      .join(', ');
  }

  function render() {
    powerEl.textContent = `Power: ${((getTransmutePower() - 1) * 100).toFixed(0)}%`;
    list.innerHTML = '';
    Object.entries(TRANSMUTES).forEach(([key, def]) => {
      if (!def.unlocked) return;
      const row = document.createElement('div');
      row.className = 'transmute-entry';
      const label = document.createElement('div');
      label.textContent = def.name;
      row.appendChild(label);
      const btn = document.createElement('button');
      btn.textContent = `Transmute (${formatCost(def.input)})`;
      btn.disabled = !canTransmute(key);
      btn.addEventListener('click', () => { performTransmute(key); render(); });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  globalThis.updateTransmuteOverlay = render;
  render();
}

let buildOverlay = null;
export function openBuildOverlay() {
  if (buildOverlay) return;
  buildOverlay = createOverlay({ className: 'build-overlay', boxClass: 'parchment-box' });
  buildOverlay.box.classList.add('parchment-box');
  buildOverlay.onClose(() => {
    buildOverlay = null;
    globalThis.updateBuildOverlay = null;
  });
  const { box } = buildOverlay;

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Buildings';
  box.appendChild(header);

  const list = document.createElement('div');
  list.className = 'build-list';
  box.appendChild(list);

  function render() {
    list.innerHTML = '';
    Object.entries(BUILDINGS).forEach(([key, def]) => {
      if (def.requires && !(sectState.buildings[def.requires] > 0)) return;
      if (key === 'orbSpellStrength' && !systems.spellStrengthUnlocked) return;
      if (key === 'areitoCircle' && !systems.areitoBuildingAvailable) return;
      const built = sectState.buildings[key] || 0;
      const row = document.createElement('div');
      row.className = 'build-entry';
      const label = document.createElement('div');
      label.textContent = `${def.name} (Lv${built}/${def.max})`;
      row.appendChild(label);
      if (sectState.currentBuild === key) {
        const progress = document.createElement('div');
        progress.className = 'build-progress';
        const fill = document.createElement('div');
        fill.className = 'build-progress-fill';
        fill.style.width = `${Math.floor(sectState.buildProgress * 100)}%`;
        progress.appendChild(fill);
        row.appendChild(progress);
      } else {
        const cost = def.costFunc ? def.costFunc(built + 1) : def.cost;
        const waterCost = def.costWaterFunc ? def.costWaterFunc(built + 1) : 0;
        const nectarCost = def.costNectarFunc ? def.costNectarFunc(built + 1) : 0;
        const btn = document.createElement('button');
        const costParts = [`${cost}\u{1FAB5}`];
        if (waterCost) costParts.push(`${waterCost}\u{1F4A7}`);
        if (nectarCost) costParts.push(`${nectarCost}\u{1F480}`);
        btn.textContent = `Build (${costParts.join(', ')})`;
        btn.disabled =
          sectState.softwood < cost ||
          sectSystem.orbs.water.current < waterCost ||
          sectState.undeadNectar < nectarCost ||
          built >= def.max ||
          sectState.currentBuild;
        btn.addEventListener('click', () => {
          startBuilding(key);
          render();
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
  }

  globalThis.updateBuildOverlay = render;
  render();
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

let researchOverlay = null;
export function openResearchOverlay() {
  if (researchOverlay) return;
  researchOverlay = createOverlay({ className: 'research-overlay', boxClass: 'parchment-box' });
  researchOverlay.box.classList.add('parchment-box');
  let interval;
  researchOverlay.onClose(() => {
    if (interval) clearInterval(interval);
    researchOverlay = null;
  });
  const { box } = researchOverlay;

  const header = document.createElement('div');
  header.className = 'panel-heading';
  header.textContent = 'Research';
  box.appendChild(header);

  const pointsEl = document.createElement('div');
  box.appendChild(pointsEl);

  const progress = document.createElement('div');
  progress.className = 'research-progress';
  const fill = document.createElement('div');
  fill.className = 'research-progress-fill';
  progress.appendChild(fill);
  box.appendChild(progress);

  const info = document.createElement('div');
  info.className = 'research-progress-info';
  box.appendChild(info);

  const researchList = document.createElement('div');
  researchList.className = 'research-list';
  box.appendChild(researchList);

  let showCompleted = false;
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'Show Purchased';
  toggleBtn.addEventListener('click', () => {
    showCompleted = !showCompleted;
    toggleBtn.textContent = showCompleted ? 'Hide Purchased' : 'Show Purchased';
    renderResearch();
  });
  box.appendChild(toggleBtn);

  const topics = [
    {
      key: 'orbRevival',
      label: 'Orb Revival',
      cost: 1,
      desc: 'Unlocks orb management controls',
      unlock() {
        if (!systems.orbManagementUnlocked) systems.orbManagementUnlocked = true;
      }
    },
    {
      key: 'wordOfHaste',
      label: 'Word of Haste',
      cost: 2,
      desc: 'Orb spell granting 1m work speed boost (15 Water)',
      unlock() {}
    },
    {
      key: 'orbSpellStrength',
      label: 'Orb Spell Strength',
      cost: 3,
      desc: 'Unlocks building to raise orb damage by 20%/level',
      unlock() {
        systems.spellStrengthUnlocked = true;
      }
    },
    {
      key: 'orbReverb',
      label: 'Orb Reverberation',
      cost: 4,
      desc: 'Continuous spell: +30% attack speed, drains 1 Water/s',
      unlock() {}
    }
  ];

  function renderResearch() {
    researchList.innerHTML = '';
    topics.forEach(t => {
      const completed = sectState.completedResearch.includes(t.key);
      if (completed && !showCompleted) return;
      const row = document.createElement('div');
      row.className = 'research-entry';
      if (completed) row.classList.add('completed');
      const name = document.createElement('div');
      name.className = 'research-name';
      name.textContent = t.label;
      const desc = document.createElement('div');
      desc.className = 'research-desc';
      desc.textContent = t.desc;
      row.appendChild(name);
      row.appendChild(desc);
      if (completed) {
        const status = document.createElement('div');
        status.className = 'research-status';
        status.textContent = 'Purchased';
        row.appendChild(status);
      } else {
        const btn = document.createElement('button');
        btn.textContent = `Unlock (${t.cost})`;
        btn.disabled = sectState.researchPoints < t.cost;
        btn.addEventListener('click', () => {
          if (sectState.researchPoints < t.cost) return;
          sectState.researchPoints -= t.cost;
          sectState.completedResearch.push(t.key);
          t.unlock();
          if (typeof window.updateSectDisplay === 'function') window.updateSectDisplay();
          renderResearch();
        });
        row.appendChild(btn);
      }
      researchList.appendChild(row);
    });
  }

  function render() {
    pointsEl.textContent = `Research Points: ${sectState.researchPoints}`;
    const prog = sectState.researchProgress % 500;
    const pct = (prog / 500) * 100;
    fill.style.width = `${pct}%`;
    const researchers = sectSystem.disciples.filter(d => sectState.discipleTasks[d.id] === 'Research').length;
    const rate = researchers * 4;
    const time = rate > 0 ? (500 - prog) / rate : Infinity;
    info.textContent = `Next point: ${rate > 0 ? time.toFixed(1) : '∞'}s`;
    renderResearch();
  }

  render();
  interval = setInterval(render, 1000);
}
