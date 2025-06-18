import { addCoreXP, getMindLevel } from "./core.js";
export const lifeResources = {
  focus: 0,
  cleanliness: 0,
  knowledge: 0,
  mentalHealth: 0,
  preparedness: 0,
  cash: 0
};

const RESOURCE_CAP = 100;
const CASH_CAP = 9999;

const skills = {
  focus: { xp: 0 },
  cleanliness: { xp: 0 },
  knowledge: { xp: 0 },
  mentalHealth: { xp: 0 },
  preparedness: { xp: 0 }
};

const ACTION_DURATION = 10; // seconds per resource tick
const actions = [
  {
    id: 'meditate',
    taskType: "mental",
    label: 'Meditate',
    skill: 'focus',
    resource: 'focus',
    xpGain: 1,
    resGain: 1,
    duration: ACTION_DURATION,
    unlockSkill: null,
    unlockXp: 0
  },
  {
    id: 'cleanRoom',
    taskType: "physical",
    label: 'Clean Room',
    skill: 'cleanliness',
    resource: 'cleanliness',
    xpGain: 1,
    resGain: 1,
    duration: ACTION_DURATION,
    unlockSkill: 'focus',
    unlockXp: 5
  },
  {
    id: 'readBook',
    taskType: "mental",
    label: 'Read Book',
    skill: 'knowledge',
    resource: 'knowledge',
    xpGain: 1,
    resGain: 1,
    duration: ACTION_DURATION,
    unlockSkill: 'cleanliness',
    unlockXp: 5
  },
  {
    id: 'writeJournal',
    taskType: "soul",
    label: 'Write Journal',
    skill: 'mentalHealth',
    resource: 'mentalHealth',
    xpGain: 1,
    resGain: 1,
    duration: ACTION_DURATION,
    unlockSkill: 'knowledge',
    unlockXp: 5
  },
  {
    id: 'jobSearch',
    taskType: "physical",
    label: 'Job Search',
    skill: 'preparedness',
    resource: 'preparedness',
    xpGain: 1,
    resGain: 1,
    duration: ACTION_DURATION,
    unlockSkill: 'mentalHealth',
    unlockXp: 5
  }
];

let getGameCash = () => 0;
let spendGameCash = () => 0;
let actionsContainer;
let resourcesContainer;
const unlockedActions = new Set();
const actionStates = {};
let tickTimer;

function addResource(key, amt) {
  const cap = key === 'cash' ? CASH_CAP : RESOURCE_CAP;
  lifeResources[key] = Math.min(cap, lifeResources[key] + amt);
}

function startAction(action) {
  const state = actionStates[action.id] || { active: false, elapsed: 0 };
  if (state.active) return;
  const activeIds = Object.keys(actionStates).filter(id => actionStates[id].active);
  const activePhysical = activeIds.filter(id => (actions.find(a => a.id === id) || {}).taskType === "physical").length;
  const activeMental = activeIds.filter(id => (actions.find(a => a.id === id) || {}).taskType === "mental").length;
  if (action.taskType === "physical" && activePhysical >= 1) return;
  if (action.taskType === "mental" && activeMental >= getMindLevel()) return;
  state.active = true;
  state.elapsed = 0;
  actionStates[action.id] = state;
  renderActions();
}
function cancelAction(id) {
  const state = actionStates[id];
  if (state) state.active = false;
  renderActions();
}

function tickActions(delta) {
  let refreshed = false;
  Object.entries(actionStates).forEach(([id, state]) => {
    if (!state.active) return;
    state.elapsed += delta;
    const action = actions.find(a => a.id === id);
    if (!action) return;
    if (state.elapsed >= action.duration) {
      state.elapsed -= action.duration;
      addResource(action.resource, action.resGain);
      skills[action.skill].xp += action.xpGain;
      addCoreXP(action.taskType, action.xpGain);
      refreshed = true;
    }
  });
  if (refreshed) {
    renderResources();
    checkUnlocks();
  }
  renderActions();
}

function checkUnlocks() {
  let changed = false;
  actions.forEach(a => {
    if (!unlockedActions.has(a.id) && isActionUnlocked(a)) {
      unlockedActions.add(a.id);
      changed = true;
    }
  });
  if (changed) renderActions();
}

function isActionUnlocked(action) {
  if (!action.unlockSkill) return true;
  return skills[action.unlockSkill].xp >= action.unlockXp;
}

function renderActions() {
  if (!actionsContainer) return;
  actionsContainer.innerHTML = '';
  actions.forEach(act => {
    if (!isActionUnlocked(act)) return;
    const state = actionStates[act.id] || { active: false, elapsed: 0 };
    if (!unlockedActions.has(act.id)) {
      unlockedActions.add(act.id);
      state.fadeIn = true;
    }
    actionStates[act.id] = state;

    const card = document.createElement('div');
    card.classList.add('life-card');
    if (state.fadeIn) {
      card.classList.add('fade-in');
      state.fadeIn = false;
    }
    if (state.active) card.classList.add('active');

    const header = document.createElement('div');
    header.classList.add('life-card-title');
    header.textContent = act.label;

    const desc = document.createElement('div');
    desc.classList.add('life-card-desc');
    desc.textContent = `+${act.resGain} ${act.resource} every ${act.duration}s`;

    const actionBar = document.createElement('div');
    actionBar.classList.add('life-card-action');
    if (state.active) {
      const timer = document.createElement('div');
      timer.classList.add('life-card-timer');
      timer.textContent = `${Math.ceil(act.duration - state.elapsed)}s`; 
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => cancelAction(act.id));
      actionBar.append(timer, cancelBtn);
    } else {
      const startBtn = document.createElement('button');
      startBtn.textContent = 'Start';
      startBtn.addEventListener('click', () => startAction(act));
      actionBar.appendChild(startBtn);
    }

    const xp = skills[act.skill].xp;
    const level = Math.floor(xp / 10) + 1;
    const progress = xp % 10;
    const progressEl = document.createElement('div');
    progressEl.classList.add('life-card-progress');
    progressEl.textContent = `Level ${level} - XP: ${progress}/10`;

    card.append(header, desc, actionBar, progressEl);
    actionsContainer.appendChild(card);
  });
  const transfer = document.createElement('button');
  transfer.textContent = 'Transfer Cash';
  transfer.addEventListener('click', transferCashFromGame);
  actionsContainer.appendChild(transfer);
}

function renderResources() {
  if (!resourcesContainer) return;
  resourcesContainer.innerHTML = '';
  ['focus','cleanliness','knowledge','mentalHealth','preparedness','cash']
    .forEach(k => {
      const row = document.createElement('div');
      row.classList.add('resource-entry');
      row.textContent = `${k.charAt(0).toUpperCase()+k.slice(1)}: ${lifeResources[k]}`;
      resourcesContainer.appendChild(row);
    });
}

export function transferCashFromGame() {
  const available = Math.min(getGameCash(), CASH_CAP - lifeResources.cash);
  if (available <= 0) return;
  spendGameCash(available);
  addResource('cash', available);
  renderResources();
}

export function initPlayerLife(opts = {}) {
  getGameCash = opts.getGameCash || getGameCash;
  spendGameCash = opts.spendGameCash || spendGameCash;
  actionsContainer = document.querySelector('.player-actions');
  resourcesContainer = document.querySelector('.player-resources');
  renderActions();
  renderResources();
  if (!tickTimer) {
    tickTimer = setInterval(() => tickActions(1), 1000);
  }
}

export function refreshPlayerLife() {
  renderActions();
  renderResources();
}
