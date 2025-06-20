import { LifeGame, Activity } from './lifeCore.js';
import { addCoreXP } from './core.js';

let game;
let actionsContainer;
let resourcesContainer;
let activityDisplay;
let staminaFill;
let staminaText;
let tickTimer;

const skillInfo = {
  mentalAcuity: {
    effect:
      'Activities with the "mental" tag generate 2% more per level of Mental Acuity',
    flavor: 'Focus sharpens the mind.'
  },
  literacy: {
    effect:
      'Each level grants +1 reading mastery, +2% knowledge generation and +3% all skill XP gain',
    flavor: 'Words reveal worlds.'
  },
  physicalCondition: {
    effect: 'Improves your stamina and unlocks strenuous tasks as you train',
    flavor: 'A sound body fuels a sound mind.'
  },
  mining: {
    effect: 'Higher levels yield more copper when mining',
    flavor: 'Chipping away at the earth.'
  },
  craftsmanship: {
    effect:
      'Each level grants +1 crafting mastery, +5% component gain and -1% crafting cost',
    flavor: 'Skill transforms raw materials.'
  }
};

const activityInfo = {
  ponder: {
    effect: '+1 thought/sec, +1 stamina/sec, +Mental Acuity XP',
    flavor: 'Let your mind wander.',
    tags: ['mind']
  },
  walk: {
    effect: '+1 discovery/sec, -3 stamina/sec, +Physical Condition XP',
    flavor: 'A brisk stroll invigorates the body.',
    tags: ['physical', 'body']
  },
  read: {
    effect: '+0.2 knowledge/sec, -1 stamina/sec, +Literacy XP 0.1/sec',
    flavor: 'Lose yourself in stories.',
    tags: ['mental']
  }
};

function initActivities() {
  game.addActivity(new Activity('ponder', {
    label: 'Ponder',
    skill: 'mentalAcuity',
    resource: 'thought',
    rate: 1,
    tags: ['mental'],
    stamina: 1,
    description: activityInfo.ponder.effect,
    flavor: activityInfo.ponder.flavor
  }));
  game.addActivity(new Activity('walk', {
    label: 'Walk',
    skill: 'physicalCondition',
    resource: 'discovery',
    rate: 1,
    xpRate: 0.01,
    tags: ['physical', 'body'],
    stamina: -3,
    description: activityInfo.walk.effect,
    flavor: activityInfo.walk.flavor
  }));
  game.addActivity(new Activity('read', {
    label: 'Read',
    skill: 'literacy',
    resource: 'knowledge',
    rate: 0.2,
    xpRate: 0.1,
    tags: ['mental'],
    stamina: -1,
    unlock: g => g.skills.mentalAcuity.level >= 1,
    description: activityInfo.read.effect,
    flavor: activityInfo.read.flavor
  }));
}

function renderActions() {
  if (!actionsContainer) return;
  actionsContainer.innerHTML = '';
  Object.values(game.activities).forEach(act => {
    if (!act.unlock(game)) return;
    const btn = document.createElement('button');
    btn.textContent = act.label;
    if (game.current === act.id) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (game.current === act.id) game.stop(); else game.start(act.id);
      renderActions();
      renderActivity();
    });
    btn.addEventListener('mouseover', e => {
      const tip = document.getElementById('tooltip');
      if (!tip) return;
      const tagLine = act.tags.length ? `Tags: ${act.tags.join(', ')}` : '';
      tip.innerHTML = `<strong>${act.label}</strong><br>${act.description}${tagLine ? '<br>' + tagLine : ''}<br><em>${act.flavor}</em>`;
      tip.style.display = 'block';
      tip.style.left = e.pageX + 10 + 'px';
      tip.style.top = e.pageY + 10 + 'px';
    });
    btn.addEventListener('mousemove', e => {
      const tip = document.getElementById('tooltip');
      if (tip && tip.style.display === 'block') {
        tip.style.left = e.pageX + 10 + 'px';
        tip.style.top = e.pageY + 10 + 'px';
      }
    });
    btn.addEventListener('mouseout', () => {
      const tip = document.getElementById('tooltip');
      if (tip) tip.style.display = 'none';
    });
    actionsContainer.appendChild(btn);
  });
}

function renderResources() {
  if (!resourcesContainer) return;
  resourcesContainer.innerHTML = '';
  Object.entries(game.resources).forEach(([k, r]) => {
    if (k === 'stamina') return;
    const row = document.createElement('div');
    row.classList.add('resource-entry');
    row.textContent = `${k}: ${r.amount.toFixed(1)}`;
    resourcesContainer.appendChild(row);
  });
  staminaFill.style.width = `${(game.resources.stamina.amount / game.staminaMax) * 100}%`;
  if (staminaText) {
    staminaText.textContent = `${Math.floor(game.resources.stamina.amount)}/${game.staminaMax}`;
  }
}

function renderSkillsList(container) {
  if (!container) return;
  container.innerHTML = '';
  Object.values(game.skills).forEach(s => {
    const row = document.createElement('div');
    row.classList.add('skill-entry');
    const label = document.createElement('div');
    label.textContent = `${s.displayName} Lv ${s.level}`;
    const bar = document.createElement('div');
    bar.classList.add('skill-progress');
    const fill = document.createElement('div');
    fill.classList.add('skill-progress-fill');
    fill.style.width = `${Math.min(1, s.xp / s.threshold) * 100}%`;
    bar.appendChild(fill);
    row.append(label, bar);

    row.addEventListener('mouseover', e => {
      const tip = document.getElementById('tooltip');
      if (!tip) return;
      const info = skillInfo[s.name] || { effect: '', flavor: '' };
      tip.innerHTML = `<strong>${s.displayName}</strong><br>${info.effect}<br><em>${info.flavor}</em>`;
      tip.style.display = 'block';
      tip.style.left = e.pageX + 10 + 'px';
      tip.style.top = e.pageY + 10 + 'px';
    });
    row.addEventListener('mousemove', e => {
      const tip = document.getElementById('tooltip');
      if (tip && tip.style.display === 'block') {
        tip.style.left = e.pageX + 10 + 'px';
        tip.style.top = e.pageY + 10 + 'px';
      }
    });
    row.addEventListener('mouseout', () => {
      const tip = document.getElementById('tooltip');
      if (tip) tip.style.display = 'none';
    });
    container.appendChild(row);
  });
}

function renderActivity() {
  if (!activityDisplay) return;
  const act = game.activities[game.current];
  activityDisplay.textContent = act ? `${act.label}...` : '';
}

function tick() {
  game.tick(1, addCoreXP);
  renderResources();
  renderSkillsList(document.querySelector('.skills-list'));
  renderActivity();
  saveState();
}

function saveState() {
  const data = {
    skills: Object.fromEntries(Object.entries(game.skills).map(([k,s]) => [k,{level:s.level,xp:s.xp,threshold:s.threshold}])) ,
    resources: Object.fromEntries(Object.entries(game.resources).map(([k,r])=>[k,{amount:r.amount,total:r.total}])) ,
    current: game.current
  };
  localStorage.setItem('lifeGame', JSON.stringify(data));
}

function loadState() {
  const raw = localStorage.getItem('lifeGame');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.entries(data.skills||{}).forEach(([k,v])=>{
      if (game.skills[k]) {
        game.skills[k].level = v.level;
        game.skills[k].xp = v.xp;
        game.skills[k].threshold = v.threshold;
      }
    });
    Object.entries(data.resources||{}).forEach(([k,v])=>{
      if (game.resources[k]) {
        game.resources[k].amount = v.amount;
        game.resources[k].total = v.total;
      }
    });
    if (data.current) game.start(data.current);
  } catch(e) {}
}

export function initPlayerLife() {
  game = new LifeGame();
  actionsContainer = document.querySelector('.core-actions');
  resourcesContainer = document.querySelector('.core-resources');
  activityDisplay = document.getElementById('coreActivityText');
  staminaFill = document.getElementById('staminaFill');
  staminaText = document.getElementById('staminaText');
  initActivities();
  loadState();
  renderActions();
  renderResources();
  renderSkillsList(document.querySelector('.skills-list'));
  if (!tickTimer) tickTimer = setInterval(tick, 1000);
}

export function refreshPlayerLife() {
  renderActions();
  renderResources();
  renderSkillsList(document.querySelector('.skills-list'));
}

export { renderSkillsList };
