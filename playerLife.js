import { addCoreXP } from "./core.js";
export const lifeResources = {
  inspiration: 0,
  knowledge: 0,
  endurance: 0,
  ore: 0,
  food: 0,
  mana: 0,
  influence: 0,
  components: 0,
  discovery: 0,
  cash: 0
};

const RESOURCE_CAP = 100;
const CASH_CAP = 9999;

const skills = {
  mentalAcuity: { xp: 0 },
  literacy: { xp: 0 },
  combatFitness: { xp: 0 },
  strength: { xp: 0 },
  dexterity: { xp: 0 },
  focus: { xp: 0 },
  charisma: { xp: 0 },
  craftsmanship: { xp: 0 },
  perception: { xp: 0 }
};

const ACTION_DURATION = 10; // seconds per resource tick
const actions = [
  { id: 'ponder', taskType: 'mental', label: 'Ponder', skill: 'mentalAcuity', resource: 'inspiration', xpGain: 1, resGain: 1, duration: ACTION_DURATION },
  { id: 'read', taskType: 'mental', label: 'Read', skill: 'literacy', resource: 'knowledge', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'mentalAcuity', unlockXp: 5 },
  { id: 'train', taskType: 'physical', label: 'Train', skill: 'combatFitness', resource: 'endurance', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'literacy', unlockXp: 5 },
  { id: 'mine', taskType: 'physical', label: 'Mine', skill: 'strength', resource: 'ore', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'combatFitness', unlockXp: 5 },
  { id: 'farm', taskType: 'physical', label: 'Farm', skill: 'dexterity', resource: 'food', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'strength', unlockXp: 5 },
  { id: 'meditate', taskType: 'mental', label: 'Meditate', skill: 'focus', resource: 'mana', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'literacy', unlockXp: 10 },
  { id: 'socialize', taskType: 'mental', label: 'Socialize', skill: 'charisma', resource: 'influence', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'combatFitness', unlockXp: 10 },
  { id: 'craft', taskType: 'physical', label: 'Craft', skill: 'craftsmanship', resource: 'components', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockResource: 'ore', unlockResourceAmt: 100 },
  { id: 'explore', taskType: 'physical', label: 'Explore', skill: 'perception', resource: 'discovery', xpGain: 1, resGain: 1, duration: ACTION_DURATION, unlockSkill: 'charisma', unlockXp: 10 }
];

let getGameCash = () => 0;
let spendGameCash = () => 0;
let actionsContainer;
let resourcesContainer;
let activityDisplay;
const unlockedActions = new Set();
const actionStates = {};
let tickTimer;

function renderSkillsList(container) {
  if (!container) return;
  container.innerHTML = '';
  Object.entries(skills).forEach(([key, data]) => {
    const level = Math.floor(data.xp / 10) + 1;
    const progress = data.xp % 10;
    const row = document.createElement('div');
    row.classList.add('skill-entry');
    const name = key.replace(/([A-Z])/g, ' $1');
    row.textContent = `${name.charAt(0).toUpperCase()+name.slice(1)}: Lv ${level} (${progress}/10)`;
    container.appendChild(row);
  });
}

function renderActivity() {
  if (!activityDisplay) return;
  const active = Object.keys(actionStates).find(id => actionStates[id].active);
  if (active) {
    const a = actions.find(act => act.id === active);
    activityDisplay.textContent = a ? `${a.label}...` : '';
  } else {
    activityDisplay.textContent = '';
  }
}

function addResource(key, amt) {
  const cap = key === 'cash' ? CASH_CAP : RESOURCE_CAP;
  lifeResources[key] = Math.min(cap, lifeResources[key] + amt);
}

function startAction(action) {
  const state = actionStates[action.id] || { active: false, elapsed: 0 };
  if (state.active) return;
  Object.values(actionStates).forEach(s => (s.active = false));
  state.active = true;
  state.elapsed = 0;
  actionStates[action.id] = state;
  renderActions();
  renderActivity();
}
function cancelAction(id) {
  const state = actionStates[id];
  if (state) state.active = false;
  renderActions();
  renderActivity();
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
  renderActivity();
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
  if (action.unlockResource) {
    if (lifeResources[action.unlockResource] < (action.unlockResourceAmt || 0)) return false;
  }
  if (!action.unlockSkill) return true;
  return skills[action.unlockSkill].xp >= (action.unlockXp || 0);
}

function renderActions() {
  if (!actionsContainer) return;
  actionsContainer.innerHTML = '';
  actions.forEach(act => {
    if (!isActionUnlocked(act)) return;
    const state = actionStates[act.id] || { active: false, elapsed: 0 };
    actionStates[act.id] = state;
    const btn = document.createElement('button');
    btn.textContent = act.label;
    if (state.active) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.active) cancelAction(act.id); else startAction(act);
    });
    actionsContainer.appendChild(btn);
  });
  const transfer = document.createElement('button');
  transfer.textContent = 'Transfer Cash';
  transfer.addEventListener('click', transferCashFromGame);
  actionsContainer.appendChild(transfer);
  renderActivity();
}

function renderResources() {
  if (!resourcesContainer) return;
  resourcesContainer.innerHTML = '';
  ['inspiration','knowledge','endurance','ore','food','mana','influence','components','discovery','cash']
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
  actionsContainer = document.querySelector('.core-actions');
  resourcesContainer = document.querySelector('.core-resources');
  activityDisplay = document.getElementById('coreActivityText');
  renderSkillsList(document.querySelector('.skills-list'));
  renderActions();
  renderResources();
  if (!tickTimer) {
    tickTimer = setInterval(() => tickActions(1), 1000);
  }
}

export function refreshPlayerLife() {
  renderActions();
  renderResources();
  renderSkillsList(document.querySelector('.skills-list'));
}

export { renderSkillsList };
