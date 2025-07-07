import addLog from './log.js';
import { coreState, refreshCore } from './core.js';
import { sectState, systems } from './script.js';
import { generateDiscipleAttributes } from './discipleAttributes.js';
import { createOverlay } from './ui/overlay.js';

// Core state for the Constructs system. Orbs and upgrades from the
// previous speech implementation remain intact.
// Insight regeneration constants
// Insight regen now scales with the Cohere upgrade using a saturating
// logistic curve. This starts near zero and gradually approaches `R_MAX`
// with diminishing returns as more Cohere levels are purchased. The curve
// still tapers off as Insight accumulates.
const R_MAX = 6;        // cap per-second regen
const BASE_MIDPOINT = 1000;  // default inflection point
const K = 150;          // controls steepness of taper

function getInsightMidpoint() {
  return systems.voiceOfThePeople ? 1500 : BASE_MIDPOINT;
}

// Seasonal cycle configuration
// A full in-game day lasts 10 real minutes (600 seconds). Each season spans
// 28 of these days, so a complete season cycle takes 16,800 seconds.
export const DAY_LENGTH_SECONDS = 600;
export const SEASON_LENGTH_DAYS = 28;
const seasons = [
  { name: 'Verdantia', multiplier: 1.20 },
  { name: 'Solaria', multiplier: 1.35 },
  { name: 'Aurora', multiplier: 1.10 },
  { name: 'Aurelia', multiplier: 0.90 },
  { name: 'Bruma', multiplier: 0.70 }
];
const seasonIcons = ['\uD83C\uDF31', '\u2600\uFE0F', '\u2728', '\uD83C\uDF42', '\u2744\uFE0F'];
const seasonClasses = ['spring','summer','aurora','autumn','winter'];
const seasonTemps = [15, 25, 20, 10, -5];


export const speechState = {
  orbs: {
    body: { current: 0, max: 10 },
    insight: { current: 0, max: 2000, regen: R_MAX },
    will: { current: 0, max: 10 }
  },
  resources: {
    sound: { current: 0, max: 200, regen: 0, unlocked: true },
    thought: { current: 0, max: 10, regen: 0, unlocked: false },
    structure: { current: 0, max: 10, regen: 0, unlocked: false },
    woodEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    fireEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    earthEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    summerEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    waterEssence: { current: 0, max: 10, regen: 0, unlocked: false }
  },
  gains: {
    body: 0,
    insight: 0,
    will: 0
  },
  upgrades: {
    // Cohere costs scale more steeply so high levels require larger insight
    // investment. This keeps Cohere from overwhelming Intone's impact.
    cohere: { level: 0, costFunc: lvl => Math.round(15 * Math.pow(1.2, lvl)) },
    vocalMaturity: { level: 0, baseCost: 2, unlocked: false },
    capacityBoost: { level: 0, baseCost: { insight: 10 }, unlocked: false },
    expandMind: {
      level: 0,
      unlocked: true,
      costFunc: lvl => ({ insight: 2 * Math.pow(lvl + 1, 2) })
    },
    soundExpansion: {
      level: 0,
      unlocked: true,
      costFunc: lvl => ({ sound: 25 + lvl * 4 })
    },
    cognitiveLattice: {
      level: 0,
      unlocked: true,
      costFunc: lvl => ({
        sound: 50 + lvl * 10,
        thought: 10 + lvl * 2,
        structure: 5 + lvl
      })
    },
    clarividence: { level: 0, baseCost: 300, unlocked: false },
    idleChatter: {
      level: 0,
      baseCost: { sound: 200, thought: 10 },
      unlocked: true
    }
  },
  skills: {
    voice: { xp: 0, level: 0 },
    mind: { xp: 0, level: 0 },
    invocation: { xp: 0, level: 0 }
  },
  mindSlotAwarded: false,
  memorySlots: 2,
  seasonIndex: 0,
  seasonDay: 0,
  seasonTimer: 0,
  weather: null,
  insightRegenBase: 0,
  activeConstructs: [],
  savedConstructs: ['Murmur'],
  activeBuffs: {},
  cooldowns: {},
  constructUnlocked: true,
  pot: [],
  constructPotency: {},
  playerConstructXp: {},
  disciples: [],
  murmurCasts: 0,
  intonePresses: 0,
  intoneTimer: 0,
  intoneIdle: 0
};

// use the same object for the insight resource and orb
speechState.resources.insight = speechState.orbs.insight;

// Basic construct recipe list. Additional constructs can be appended
// later through unlocks or upgrades.
export const recipes = [
  {
    name: 'Murmur',
    // Increased cost to make early insight management more meaningful
    input: { insight: 25 },
    output: { sound: 1 },
    xp: { voice: 1 },
    tags: ['single-cast', 'generator'],
    unlocked: true,
    cooldown: 1,
    potency: 1
  },
  {
    name: 'Echo of Mind',
    input: { sound: 1, insight: 1 },
    output: { thought: 1 },
    xp: { mind: 0.5, voice: 0.5 },
    tags: ['single-cast', 'generator', 'duration'],
    unlocked: false,
    requirements: { voiceLevel: 3, insight: 1500 },
    castCost: { sound: 25, insight: 500 },
    duration: 5,
    cooldown: 5,
    potency: 1
  },
  {
    name: 'Clarity Pulse',
    input: { thought: 1, insight: 1 },
    output: {},
    xp: { mind: 1 },
    tags: ['single-cast', 'buff', 'duration'],
    unlocked: false,
    requirements: { mindLevel: 2, insight: 1700 },
    castCost: { thought: 20, sound: 50 },
    duration: 30,
    cooldown: 30,
    potency: 1
  },
  {
    name: 'Symbol Seed',
    input: { sound: 1, thought: 1 },
    output: { structure: 1 },
    xp: {},
    tags: ['duration', 'generator', 'drain'],
    unlocked: false,
    requirements: { mindLevel: 3, insight: 2000 },
    duration: 30,
    cooldown: 30,
    potency: 1
  },
  {
    name: 'Mental Construct',
    input: { sound: 1, thought: 1, insight: 1 },
    output: {},
    xp: { invocation: 1 },
    tags: ['single-cast'],
    unlocked: false,
    requirements: { voiceLevel: 5, mindLevel: 5, insight: 2300 },
    castCost: { thought: 10, structure: 10, insight: 1000 },
    cooldown: 10,
    potency: 1
  },
  {
    name: 'Intone',
    input: {},
    output: {},
    xp: {},
    tags: ['buff'],
    unlocked: false,
    cooldown: 30,
    potency: 1
  },
  {
    name: 'The Calling',
    input: { sound: 100 },
    output: {},
    xp: 0,
    tags: ['voice'],
    unlocked: false,
    requirements: { sound: 100 },
    cooldown: 300
  }
];

// initialize potency for each construct
recipes.forEach(r => {
  speechState.constructPotency[r.name] = r.potency || 1.0;
});

const resourceIcons = {
  insight: 'star',
  sound: 'volume-2',
  thought: 'activity',
  structure: 'box',
  body: 'heart',
  will: 'flame',
  woodEssence: 'leaf',
  fireEssence: 'flame',
  earthEssence: 'mountain',
  summerEssence: 'sun',
  waterEssence: 'droplet'
};

const upgradeDescriptions = {
  cohere: level => {
    // Cohere provides diminishing returns that taper off more sharply so
    // Intone remains relevant even at high levels.
    const current = (R_MAX * (level / (level + 5))).toFixed(2);
    const next = (R_MAX * ((level + 1) / (level + 6))).toFixed(2);
    const inc = (next - current).toFixed(2);
    return `Improves insight regeneration. Next +${inc}/s (now ${current}/s)`;
  },
  expandMind: 'Increase max insight by 15% each level.',
  soundExpansion: 'Raises sound capacity; Lv.2 grants an extra slot.',
  cognitiveLattice: 'Increase caps by +50 sound, +10 thought and +5 structure.',
  idleChatter: 'Bonus regen from idle disciples.',
  capacityBoost: 'Adds one memory slot.',
  clarividence: 'Reveals hidden constructs.',
  vocalMaturity: 'Grants a burst of voice experience.'
};

function xpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

function getSkillProgress(xp) {
  let total = 0;
  let level = 0;
  let next = xpRequired(level);
  while (xp >= total + next) {
    total += next;
    level += 1;
    next = xpRequired(level);
  }
  const progress = (xp - total) / next;
  return { level, progress, next };
}

function getIntoneMultiplier() {
  if (speechState.intoneTimer > 0) return 2.0;
  const p = speechState.intonePresses;
  if (p >= 15) return 2.0;
  if (p >= 10) return 1.5;
  if (p >= 5) return 1.2;
  return 1.0;
}



function getConstructLevel(caster = 'player', name) {
  const xp =
    caster === 'player'
      ? speechState.playerConstructXp[name] || 0
      : sectState.discipleConstructXp[caster]?.[name] || 0;
  return getSkillProgress(xp).level;
}

function awardXp(amount, tags) {
  if (!tags || tags.length === 0) return;
  const split = amount / tags.length;
  const prevSlots = speechState.memorySlots;
  tags.forEach(tag => {
    const skill = speechState.skills[tag];
      if (skill) {
        skill.xp += split;
        const progress = getSkillProgress(skill.xp);
        if (progress.level > skill.level) {
          skill.level = progress.level;
          if (tag === 'mind' && progress.level >= 1 && !speechState.mindSlotAwarded) {
            speechState.memorySlots += 1;
            speechState.mindSlotAwarded = true;
          }
        }
    }
  });
  if (speechState.memorySlots !== prevSlots) {
    renderConstructCards();
  }
  window.dispatchEvent(new CustomEvent('speech-xp-changed'));
}

function awardConstructXp(xpObj = {}) {
  Object.entries(xpObj).forEach(([tag, amt]) => {
    awardXp(amt, [tag]);
  });
}

// Per-tick effects for active constructs. These are simplified
// implementations to demonstrate the new constructs in action.
const constructEffects = {
  Murmur(dt, pot = speechState.constructPotency['Murmur'] || 1) {
    const amount = dt * pot; // 1 insight -> sound per second scaled
    const ins = speechState.resources.insight;
    const snd = speechState.resources.sound;
    if (ins.current >= amount) {
      ins.current -= amount;
      snd.current = Math.min(snd.max, snd.current + amount);
    }
  },
  'Echo of Mind'(dt, pot = speechState.constructPotency['Echo of Mind'] || 1) {
    const ins = speechState.resources.insight;
    const th = speechState.resources.thought;
    const amount = dt * pot;
    if (ins.current >= amount) {
      ins.current -= amount;
      th.current = Math.min(th.max, th.current + amount);
      th.unlocked = true;
    }
  },
  'Clarity Pulse'(dt, pot = speechState.constructPotency['Clarity Pulse'] || 1) {
    const bonus = 0.01 * dt * pot;
    speechState.resources.insight.current = Math.min(
      speechState.resources.insight.max,
      speechState.resources.insight.current + bonus
    );
  },
  'Symbol Seed'(dt, pot = speechState.constructPotency['Symbol Seed'] || 1) {
    const th = speechState.resources.thought;
    const str = speechState.resources.structure;
    const drain = dt * 1;
    if (th.current >= drain) {
      th.current -= drain;
      str.current = Math.min(str.max, str.current + drain * 0.1 * pot);
      str.unlocked = true;
      awardConstructXp({ mind: dt });
    }
  },
  'Mental Construct'(dt, pot = 1) {
    const gain = 0.1 * pot;
    const season = seasons[speechState.seasonIndex].name;
    let key = '';
    if (season === 'Verdantia') key = 'woodEssence';
    else if (season === 'Solaria') key = 'fireEssence';
    else if (season === 'Aurora') key = 'earthEssence';
    else if (season === 'Aurelia') key = 'summerEssence';
    else key = 'waterEssence';
    const res = speechState.resources[key];
    if (res) {
      res.current = Math.min(res.max, res.current + gain);
      res.unlocked = true;
    }
  },
  Intone(dt, pot = 1) {
    if (speechState.intoneTimer > 0) return;
    if (speechState.intonePresses < 15) {
      speechState.intonePresses += 1;
    }
    speechState.intoneIdle = 0;
    if (speechState.intonePresses >= 15) {
      speechState.intoneTimer = 30;
    }
  },
  'The Calling'(dt, pot = speechState.constructPotency['The Calling'] || 1) {
    const callPower = pot;
    const targetIdx = speechState.disciples.length + 1;
    const reqPower = Math.pow(1.8, targetIdx - 1);
    const chance = Math.max(0.05, Math.min(1, callPower / reqPower));
    if (Math.random() < chance) {
      const bonus = generateDiscipleAttributes();
      speechState.disciples.push({
        id: targetIdx,
        name: `Disciple ${targetIdx}`,
        health: 10,
        stamina: 10,
        hunger: 20,
        power: 1,
        strength: 1 + bonus.strength,
        dexterity: 1 + bonus.dexterity,
        endurance: 1 + bonus.endurance,
        intelligence: 1 + bonus.intelligence,
        incapacitated: false,
        inventorySlots: 10,
        inventory: {}
      });
      sectState.discipleConstructXp[targetIdx] = {};
      addLog('A new Disciple has answered your call!', 'info');
      if (lastConstructTarget) showConstructCloud('+1', lastConstructTarget);
      document.dispatchEvent(
        new CustomEvent('disciple-gained', { detail: { count: speechState.disciples.length } })
      );
    } else {
      addLog('Your call went unanswered.', 'info');
      if (lastConstructTarget) showConstructCloud('Failed', lastConstructTarget, 'red');
    }
  }
};

let container;
let panel;
let selectedChanter = null;
let lastConstructTarget = null;

export function initSpeech() {
  container = document.getElementById('speechPanel');
  if (!container) return;
  container.innerHTML = `
    <div class="speech-top">
      <div class="orbs-section">
        <h3 class="section-title">Core Orbs</h3>
        <div class="speech-orbs speech-tab-orbs">
          <div id="orbInsightContainer" class="orb-container">
            <div id="orbInsight" class="speech-orb"><div class="orb-fill"></div></div>
            <div id="orbInsightValue" class="orb-value"></div>
            <div id="orbInsightRegen" class="orb-regen">
              <span class="season-icon"></span><span class="regen-value"></span><span id="intoneMultiplier" class="mult-badge"></span>
            </div>
          </div>
          <div id="orbBodyContainer" class="orb-container" style="display:none">
            <div id="orbBody" class="speech-orb"><div class="orb-fill"></div></div>
            <div id="orbBodyValue" class="orb-value"></div>
            <div id="orbBodyRegen" class="orb-regen"></div>
          </div>
          <div id="orbWillContainer" class="orb-container" style="display:none">
            <div id="orbWill" class="speech-orb"><div class="orb-fill"></div></div>
            <div id="orbWillValue" class="orb-value"></div>
            <div id="orbWillRegen" class="orb-regen"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="constructToggle" class="construct-toggle">❮</div>
    <div id="constructHotbar" class="construct-hotbar"></div>
    <div id="modalConstructorPanel" class="modal-constructor-panel">
      <div class="construct-header">
        <span class="construct-title">Modal Panel Constructor</span>
        <button id="closeConstructBtn" class="cast-button">❌</button>
      </div>
      <div class="construct-tab constructor-view">
        <div class="constructor-container">
          <div id="constructPot" class="construct-pot">⚗️</div>
          <div id="resourceButtons" class="resource-buttons"></div>
          <button id="performConstruct" class="cast-button construct-button">Construct</button>
          <div id="constructRequirements" class="construct-requirements"></div>
        </div>
        <div class="card-construct-container">
          <div class="slots-and-disciples">
            <div id="memorySlotsDisplay" class="memory-slots"></div>
            <div id="constructDisciples" class="construct-disciples"></div>
          </div>
          <div id="constructCards" class="built-constructs"></div>
        </div>
      </div>
    </div>
  `;
  panel = container.querySelector('#modalConstructorPanel');
  const toggleBtn = container.querySelector('#constructToggle');
  toggleBtn.addEventListener('click', togglePanel);
  toggleBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle constructor panel', e.pageX + 10, e.pageY + 10);
  });
  toggleBtn.addEventListener('mouseleave', window.hideTooltip);
  panel.querySelector('#closeConstructBtn').addEventListener('click', togglePanel);
  panel.querySelector('#performConstruct').addEventListener('click', performConstruct);
  renderResourcesUI();
  renderPot();
  renderXpBar();
  renderOrbs();
  renderUpgrades();
  renderConstructCards();
  renderChantDisciples();
  renderHotbar();
  renderSeasonBanner();
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  const insightOrbEl = container.querySelector('#orbInsight');
  if (insightOrbEl) insightOrbEl.addEventListener('click', openInsightRegenPopup);
  document.addEventListener('disciple-gained', renderChantDisciples);
}

function togglePanel() {
  if (!panel) return;
  const open = panel.classList.contains('open');
  if (open) {
    panel.classList.remove('open');
    panel.classList.add('close-right');
  } else {
    panel.classList.remove('close-right');
    panel.classList.add('open');
    renderResourcesUI();
  }
  const toggle = container.querySelector('#constructToggle');
  if (toggle) toggle.textContent = open ? '❮' : '❯';
}

function addResourceToPot(name) {
  if (speechState.pot.includes(name)) return;
  if (speechState.pot.length >= 3) return;
  speechState.pot.push(name);
  renderPot();
}

function renderPot() {
  const pot = container.querySelector('#constructPot');
  if (!pot) return;
  if (speechState.pot.length) {
    pot.innerHTML = speechState.pot
      .map(r => `<i data-lucide="${resourceIcons[r] || 'package'}"></i>`)
      .join(' ');
    if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  } else {
    pot.textContent = '⚗️';
  }
  updateConstructButtonValidity();
  renderConstructRequirements();
}

function updateConstructButtonValidity() {
  const btn = panel.querySelector('#performConstruct');
  if (!btn) return;
  const unique = new Set(speechState.pot);
  const valid = speechState.pot.length > 0 &&
                speechState.pot.length <= 3 &&
                unique.size === speechState.pot.length;
  btn.classList.toggle('invalid', !valid);
}

function renderConstructRequirements() {
  const reqEl = panel.querySelector('#constructRequirements');
  if (!reqEl) return;
  reqEl.textContent = '';
  reqEl.style.display = 'none';
  const counts = {};
  speechState.pot.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });
  const recipe = recipes.find(r => r.unlocked && Object.entries(r.input).every(([k,v]) => counts[k] >= v));
  if (!recipe || !recipe.requirements) return;
  const reqs = [];
  if (recipe.requirements.voiceLevel) {
    reqs.push(`Voice Lv.${recipe.requirements.voiceLevel}`);
  }
  if (recipe.requirements.mindLevel) {
    reqs.push(`Mind Lv.${recipe.requirements.mindLevel}`);
  }
  if (recipe.requirements.insight) {
    reqs.push(`${recipe.requirements.insight} Insight`);
  }
  reqEl.textContent = `Requires: ${reqs.join(' & ')}`;
  reqEl.style.display = 'block';
}

function renderResourcesUI() {
  const cont = container.querySelector('#resourceButtons');
  if (!cont) return;
  cont.innerHTML = '';
  Object.entries(speechState.resources).forEach(([name, res]) => {
    if (res.unlocked === false) return;
    const btn = document.createElement('button');
    btn.className = 'cast-button';
    btn.textContent = `${name} (${Math.floor(res.current)})`;
    btn.addEventListener('click', () => addResourceToPot(name));
    cont.appendChild(btn);
  });
}

function performConstruct() {
  if (!speechState.pot.length) return;
  const counts = {};
  speechState.pot.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });
  const recipe = recipes.find(r => r.unlocked && Object.entries(r.input).every(([k,v]) => counts[k] >= v));
  speechState.pot = [];
  renderPot();
  renderConstructRequirements();
  if (!recipe) return;
  if (recipe.requirements) {
    if (recipe.requirements.voiceLevel && speechState.skills.voice.level < recipe.requirements.voiceLevel) {
      addLog(`Requires Voice Lv.${recipe.requirements.voiceLevel}`, 'error');
      return;
    }
    if (recipe.requirements.mindLevel && speechState.skills.mind.level < recipe.requirements.mindLevel) {
      addLog(`Requires Mind Lv.${recipe.requirements.mindLevel}`, 'error');
      return;
    }
    if (recipe.requirements.insight && speechState.resources.insight.current < recipe.requirements.insight) {
      addLog(`Requires ${recipe.requirements.insight} Insight`, 'error');
      return;
    }
  }
  for (const [res, amt] of Object.entries(recipe.input)) {
    if (!speechState.resources[res] || speechState.resources[res].current < amt) return;
  }
  for (const [res, amt] of Object.entries(recipe.input)) {
    speechState.resources[res].current -= amt;
  }
  for (const [res, amt] of Object.entries(recipe.output)) {
    const r = speechState.resources[res];
    if (r) r.current = Math.min(r.max, r.current + amt);
  }
  awardConstructXp(recipe.xp);
  addConstruct(recipe.name);
  renderResourcesUI();
  renderXpBar();
  addLog(`${recipe.name} constructed!`, 'info');
}

function addConstruct(name) {
  if (!speechState.savedConstructs.includes(name)) {
    speechState.savedConstructs.push(name);
    const def = recipes.find(r => r.name === name);
    if (
      def &&
      def.tags &&
      def.tags.includes('buff') &&
      speechState.activeConstructs.length < speechState.memorySlots
    ) {
      speechState.activeConstructs.push(name);
    }
  }
  if (panel && container) {
    renderConstructCards();
    renderHotbar();
  }
}

function renderConstructCards() {
  const cont = panel.querySelector('#constructCards');
  const slotCont = panel.querySelector('#memorySlotsDisplay');
  if (!cont || !slotCont) return;
  cont.innerHTML = '';
  slotCont.innerHTML = '';
  for (let i = 0; i < speechState.memorySlots; i++) {
    const ms = document.createElement('div');
    ms.className = 'memory-slot';
    if (i < speechState.activeConstructs.length) ms.classList.add('filled');
    slotCont.appendChild(ms);
  }
  speechState.savedConstructs.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.className = 'construct-card-wrapper';
    wrapper.dataset.name = c;
    const card = createConstructCard(c);
    card.classList.add('collapsed');
    if (speechState.activeConstructs.includes(c)) card.classList.add('active');
    card.addEventListener('click', () => {
      toggleConstructActive(c);
      wrapper.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    wrapper.appendChild(card);
    const timer = document.createElement('div');
    timer.className = 'cooldown-timer';
    wrapper.appendChild(timer);
    const info = createConstructInfo(c);
    if (info) wrapper.appendChild(info);
    const assignedId = Object.entries(sectState.chantAssignments).find(([id, n]) => n === c)?.[0];
    const assign = document.createElement('div');
    assign.className = 'construct-assignment';
    if (assignedId) {
      const disc = speechState.disciples.find(x => x.id == assignedId);
      assign.textContent = `Chanter: ${disc ? disc.name : assignedId}`;
    } else {
      assign.textContent = 'Assign';
    }
    assign.addEventListener('click', () => {
      if (selectedChanter !== null) {
        Object.keys(sectState.chantAssignments).forEach(k => {
          if (k == selectedChanter) delete sectState.chantAssignments[k];
        });
        sectState.chantAssignments[selectedChanter] = c;
        selectedChanter = null;
        renderChantDisciples();
        renderConstructCards();
      } else if (assignedId) {
        delete sectState.chantAssignments[assignedId];
        renderChantDisciples();
        renderConstructCards();
      }
    });
    wrapper.appendChild(assign);
    cont.appendChild(wrapper);
  });
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  renderChantDisciples();
}

export function createConstructCard(name) {
  const card = document.createElement('div');
  card.className = 'construct-card';
  card.dataset.name = name;
  const title = document.createElement('div');
  title.className = 'construct-name';
  title.textContent = name;
  card.appendChild(title);
  const recipe = recipes.find(r => r.name === name);
  if (recipe) {
    const iconCont = document.createElement('div');
    iconCont.className = 'construct-icons';
    const outRow = document.createElement('div');
    outRow.className = 'icon-row';
    Object.entries(recipe.output).forEach(([res, amt]) => {
      const span = document.createElement('span');
      span.innerHTML = `<i data-lucide="${resourceIcons[res] || 'package'}"></i> ${amt}`;
      outRow.appendChild(span);
    });
    iconCont.appendChild(outRow);
    const costRow = document.createElement('div');
    costRow.className = 'icon-row';
    Object.entries(recipe.input).forEach(([res, amt]) => {
      const span = document.createElement('span');
      span.innerHTML = `<i data-lucide="${resourceIcons[res] || 'package'}"></i> ${amt}`;
      costRow.appendChild(span);
    });
    iconCont.appendChild(costRow);
    card.appendChild(iconCont);
    if (name === 'Intone') {
      const meter = document.createElement('div');
      meter.className = 'intone-meter';
      for (let i = 0; i < 15; i++) {
        const seg = document.createElement('div');
        seg.className = 'intone-seg';
        if (i === 4 || i === 9) seg.classList.add('marker');
        meter.appendChild(seg);
      }
      card.appendChild(meter);
      const timer = document.createElement('div');
      timer.className = 'intone-timer';
      card.appendChild(timer);
    }
    if (recipe.cooldown) {
      const overlay = document.createElement('div');
      overlay.className = 'cooldown-overlay';
      card.appendChild(overlay);
    }
  } else {
    card.textContent = name;
  }
  return card;
}

function renderChantDisciples() {
  const cont = panel.querySelector('#constructDisciples');
  if (!cont) return;
  cont.innerHTML = '';
  const chanters = speechState.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Chant'
  );
  const available = chanters.filter(d => !sectState.chantAssignments[d.id]);
  const header = document.createElement('div');
  header.className = 'chant-header';
  header.textContent = `Chanters ${available.length}/${chanters.length}`;
  cont.appendChild(header);
  const list = document.createElement('div');
  list.className = 'chant-orbs';
  available.forEach(d => {
    const div = document.createElement('div');
    div.className = 'chant-disciple';
    div.textContent = d.id;
    if (selectedChanter === d.id) div.classList.add('selected');
    div.addEventListener('click', () => {
      selectedChanter = selectedChanter === d.id ? null : d.id;
      renderChantDisciples();
    });
    list.appendChild(div);
  });
  cont.appendChild(list);
}

export function createConstructInfo(name) {
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) return null;
  const info = document.createElement('div');
  info.className = 'construct-info';
  if (name === 'The Calling') {
    const effect = document.createElement('div');
    effect.className = 'construct-effect';
    effect.textContent = 'Effect: call for another faithful follower';
    info.appendChild(effect);
    const callPower = speechState.constructPotency['The Calling'] || 1;
    const targetIdx = speechState.disciples.length + 1;
    const reqPower = Math.pow(1.8, targetIdx - 1);
    const chance = Math.max(0.05, Math.min(1, callPower / reqPower));
    const chanceEl = document.createElement('div');
    chanceEl.className = 'construct-chance';
    chanceEl.textContent = `Chance: ${(chance * 100).toFixed(0)}%`;
    info.appendChild(chanceEl);
  } else if (name === 'Intone') {
    const effect = document.createElement('div');
    effect.className = 'construct-effect';
    effect.textContent = 'Effect: tap repeatedly to boost Insight regen';
    info.appendChild(effect);
  } else if (Object.keys(recipe.output).length) {
    const effect = document.createElement('div');
    effect.className = 'construct-effect';
    effect.textContent = `Effect: ${Object.entries(recipe.output)
      .map(([k, v]) => `+${v} ${k}`)
      .join(', ')}`;
    info.appendChild(effect);
  }
  const cost = document.createElement('div');
  cost.className = 'construct-cost';
  const cc = recipe.castCost || recipe.input;
  cost.textContent = `Cost: ${Object.entries(cc)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ')}`;
  info.appendChild(cost);
  if (recipe.duration) {
    const dur = document.createElement('div');
    dur.className = 'construct-duration';
    dur.textContent = `Duration: ${recipe.duration}s`;
    info.appendChild(dur);
  }
  if (recipe.cooldown) {
    const cd = document.createElement('div');
    cd.className = 'construct-cooldown';
    cd.textContent = `Cooldown: ${recipe.cooldown}s`;
    info.appendChild(cd);
  }
  return info;
}

function getConstructEffect(name) {
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) return null;
  if (name === 'The Calling') {
    return 'call for another faithful follower';
  }
  if (name === 'Intone') {
    return 'press repeatedly to charge';
  }
  if (!Object.keys(recipe.output).length) return null;
  return Object.entries(recipe.output)
    .map(([k, v]) => `+${v} ${k}`)
    .join(', ');
}

function toggleConstructActive(name) {
  const idx = speechState.activeConstructs.indexOf(name);
  if (idx >= 0) {
    speechState.activeConstructs.splice(idx, 1);
  } else if (speechState.activeConstructs.length < speechState.memorySlots) {
    speechState.activeConstructs.push(name);
  }
  const slotCont = panel.querySelector('#memorySlotsDisplay');
  if (slotCont) {
    [...slotCont.children].forEach((slot, i) => {
      slot.classList.toggle('filled', i < speechState.activeConstructs.length);
    });
  }
  const cardEl = panel.querySelector(`.construct-card[data-name="${name}"]`);
  if (cardEl) {
    const active = speechState.activeConstructs.includes(name);
    cardEl.classList.toggle('active', active);
  }
  renderHotbar();
}

export function castConstruct(name, el, powerMult = 1, caster = 'player') {
  const def = recipes.find(r => r.name === name);
  if (!def) return;
  const voiceSkill = speechState.skills.voice;
  const mindSkill = speechState.skills.mind;
  if (def.requirements && def.requirements.voiceLevel && voiceSkill.level < def.requirements.voiceLevel) {
    addLog(`Requires Voice Lv.${def.requirements.voiceLevel}`, 'error');
    return;
  }
  if (def.requirements && def.requirements.mindLevel && mindSkill.level < def.requirements.mindLevel) {
    addLog(`Requires Mind Lv.${def.requirements.mindLevel}`, 'error');
    return;
  }
  if (def.requirements && def.requirements.insight && speechState.resources.insight.current < def.requirements.insight) {
    addLog(`Requires ${def.requirements.insight} Insight`, 'error');
    return;
  }
  if (speechState.cooldowns[name] > 0) return;
  const cost = def.castCost || def.input;
  for (const [res, amt] of Object.entries(cost)) {
    const r = speechState.resources[res];
    if (!r || r.current < amt) return;
  }
  for (const [res, amt] of Object.entries(cost)) {
    speechState.resources[res].current -= amt;
  }
  for (const [res, amt] of Object.entries(def.output)) {
    const r = speechState.resources[res];
    if (r) r.current = Math.min(r.max, r.current + amt);
  }
  if (name === 'Murmur') {
    speechState.murmurCasts += 1;
    const intone = recipes.find(r => r.name === 'Intone');
    if (intone && !intone.unlocked && speechState.murmurCasts >= 10) {
      intone.unlocked = true;
      addLog('Intone construct unlocked!', 'info');
      addConstruct('Intone');
    }
  }
  awardConstructXp(def.xp);
  lastConstructTarget = el;
  showConstructCloud(name, el);
  const basePot = speechState.constructPotency[name] || 1;
  const levelPot = Math.pow(1.05, getConstructLevel(caster, name));
  let voiceMult = 1;
  if (caster === 'player' && def.tags && def.tags.includes('generator')) {
    voiceMult = Math.pow(1.05, speechState.skills.voice.level);
  }
  const finalMult = powerMult * basePot * levelPot * voiceMult;
  if (def.duration) {
    speechState.activeBuffs[name] = { time: def.duration, mult: finalMult };
  } else {
    const effect = constructEffects[name];
    if (effect) effect(1, finalMult);
  }
  lastConstructTarget = null;
  if (def.cooldown) {
    speechState.cooldowns[name] = def.cooldown;
  }
  renderResources();
  renderXpBar();
  renderOrbs();
}

function renderHotbar() {
  const bar = container.querySelector('#constructHotbar');
  if (!bar) return;
  bar.innerHTML = '';
  speechState.activeConstructs.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.className = 'construct-card-wrapper';
    const card = createConstructCard(c);
    card.classList.add('hotbar-construct');
    card.addEventListener('click', () => castConstruct(c, card));
    wrapper.appendChild(card);
    const effectText = getConstructEffect(c);
    if (effectText) {
      const eff = document.createElement('div');
      eff.className = 'construct-effect';
      eff.textContent = effectText;
      wrapper.appendChild(eff);
    }
    bar.appendChild(wrapper);
  });
}

export function renderXpBar() {
  const barFill = document.querySelector('#voiceSkillPanel .speech-xp-fill');
  const lvlEl = document.getElementById('voiceLevel');
  const detailEl = document.getElementById('voiceDetail');
  if (!barFill || !lvlEl) return;
  const skill = speechState.skills.voice;
  const prog = getSkillProgress(skill.xp);
  skill.level = prog.level;
  barFill.style.width = `${(prog.progress * 100).toFixed(1)}%`;
  lvlEl.textContent = `Voice Lv.${prog.level}`;
  if (detailEl) {
    const bonus = (Math.pow(1.05, skill.level) - 1) * 100;
    const xpToNext = Math.ceil((1 - prog.progress) * prog.next);
    detailEl.textContent = `Bonus: +${bonus.toFixed(0)}% generator potency | ${xpToNext} XP to Lv.${skill.level + 1}`;
  }
}

function renderOrbs() {
  if (!container) return;
  const update = (id, orb) => {
    const fill = container.querySelector(`#${id} .orb-fill`);
    if (!fill) return;
    const pct = Math.max(0, Math.min(1, orb.current / orb.max)) * 100;
    fill.style.height = `${pct}%`;
    const el = container.querySelector(`#${id}`);
    if (el) {
      el.title = `${Math.floor(orb.current)}/${orb.max} (${speechState.gains[id.replace('orb','').toLowerCase()].toFixed(1)}/sec)`;
      el.classList.toggle('full', orb.current >= orb.max);
    }
    const label = container.querySelector(`#${id}Value`);
    if (label) label.textContent = `${Math.floor(orb.current)}/${orb.max}`;
    const regenLabel = container.querySelector(`#${id}Regen`);
    if (regenLabel) {
      if (speechState.upgrades.clarividence.level > 0) {
        const iconEl = regenLabel.querySelector('.season-icon');
        const valEl = regenLabel.querySelector('.regen-value');
        if (valEl) {
          valEl.textContent = `+${speechState.gains[id.replace('orb','').toLowerCase()].toFixed(3)}/s`;
        }
        if (id === 'orbInsight' && iconEl) {
          const icon = seasonIcons[speechState.seasonIndex];
          iconEl.textContent = icon;
          regenLabel.onmouseenter = e => {
            showTooltip(`Base: ${speechState.insightRegenBase.toFixed(3)}<br>Current: ${speechState.gains.insight.toFixed(3)}`, e.clientX + 10, e.clientY + 10);
          };
          regenLabel.onmouseleave = hideTooltip;
        }
        regenLabel.style.display = 'flex';
      } else {
        regenLabel.style.display = 'none';
      }
    }
  };
  update('orbBody', speechState.orbs.body);
  update('orbInsight', speechState.orbs.insight);
  update('orbWill', speechState.orbs.will);
  const bodyEl = container.querySelector('#orbBodyContainer');
  if (bodyEl) bodyEl.style.display = speechState.orbs.body.current >= 1 ? 'flex' : 'none';
  const willEl = container.querySelector('#orbWillContainer');
  if (willEl) willEl.style.display = speechState.orbs.will.current >= 1 ? 'flex' : 'none';
  window.dispatchEvent(new CustomEvent('orbs-changed'));
}

function renderSeasonBanner() {
  const banner = document.getElementById('seasonBanner');
  if (!banner) return;
  const idx = speechState.seasonIndex;
  const season = seasons[idx];
  const day = speechState.seasonDay + 1;
  const daysLeft = SEASON_LENGTH_DAYS - day;
  const temp = seasonTemps[idx];
  banner.textContent = `${season.name} Day ${day} (${daysLeft}d) ${temp}°C`;
  banner.className = `season-banner ${seasonClasses[idx]}`;
  if (speechState.weather) {
    banner.innerHTML = `${season.name} Day ${day} (${daysLeft}d) ${temp}°C<span class="weather-icon">${speechState.weather.icon}</span>`;
  }
}

function renderResources() {
  const panelRes = document.getElementById('secondaryResources');
  if (!panelRes) return;
  panelRes.innerHTML = '';
  Object.entries(speechState.resources).forEach(([key, res]) => {
    if (key === 'insight' || res.unlocked === false) return;
    const box = document.createElement('div');
    box.className = 'resource-box';
    const header = document.createElement('div');
    header.className = 'resource-text';
    const icon = document.createElement('i');
    icon.dataset.lucide = resourceIcons[key] || 'package';
    const name = document.createElement('span');
    name.className = 'resource-name';
    name.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const value = document.createElement('span');
    value.className = `resource-value ${key}`;
    value.textContent = `${Math.floor(res.current)}/${res.max}`;
    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(value);
    const bar = document.createElement('div');
    bar.className = 'resource-bar';
    const fill = document.createElement('div');
    fill.className = `resource-fill ${key}`;
    fill.style.width = `${(res.current / res.max) * 100}%`;
    bar.appendChild(fill);
    box.appendChild(header);
    box.appendChild(bar);
    panelRes.appendChild(box);
  });
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  window.dispatchEvent(new CustomEvent('resources-changed'));
  updateUpgradeAffordability();
}

function getUpgradeCost(name) {
  const up = speechState.upgrades[name];
  if (typeof up.costFunc === 'function') {
    return up.costFunc(up.level);
  }
  if (typeof up.baseCost === 'number') {
    if (up.scale === 'linear') {
      return Math.floor(up.baseCost + up.level);
    }
    return Math.floor(up.baseCost * Math.pow(2, up.level));
  }
  const costs = {};
  for (const [k, v] of Object.entries(up.baseCost)) {
    if (up.scale === 'linear') {
      costs[k] = Math.floor(v + up.level);
    } else {
      costs[k] = Math.floor(v * Math.pow(2, up.level));
    }
  }
  return costs;
}

function canAfford(cost) {
  if (typeof cost === 'number') {
    return speechState.orbs.insight.current >= cost;
  }
  for (const [k, v] of Object.entries(cost)) {
    const orb = speechState.orbs[k];
    const res = speechState.resources[k];
    const have = orb ? orb.current : res ? res.current : 0;
    if (have < v) return false;
  }
  return true;
}

function updateUpgradeAffordability() {
  const panelUp = document.getElementById('speechUpgrades');
  if (!panelUp) return;
  const buttons = panelUp.querySelectorAll('button[data-upgrade]');
  buttons.forEach(btn => {
    const name = btn.dataset.upgrade;
    const cost = getUpgradeCost(name);
    const affordable = canAfford(cost);
    btn.classList.toggle('unaffordable', !affordable);
    const buy = btn.querySelector('.buy-btn');
    if (buy) buy.classList.toggle('disabled', !affordable);
    const spans = btn.querySelectorAll('.icon-row span');
    if (typeof cost === 'number') {
      const have = speechState.orbs.insight.current;
      spans.forEach(span => span.classList.toggle('cost-missing', have < cost));
    } else {
      const entries = Object.entries(cost);
      spans.forEach((span, idx) => {
        const [res, amt] = entries[idx] || [];
        const have =
          (speechState.orbs[res]?.current ?? speechState.resources[res]?.current ?? 0);
        span.classList.toggle('cost-missing', have < amt);
      });
    }
  });
}

function purchaseUpgrade(name) {
  const up = speechState.upgrades[name];
  const cost = getUpgradeCost(name);
  const prevSlots = speechState.memorySlots;
  if (typeof cost === 'number') {
    if (speechState.orbs.insight.current < cost) return;
    speechState.orbs.insight.current -= cost;
  } else {
    for (const [k, v] of Object.entries(cost)) {
      if (speechState.orbs[k] && speechState.orbs[k].current < v) return;
      if (speechState.resources[k] && speechState.resources[k].current < v) return;
    }
    for (const [k, v] of Object.entries(cost)) {
      if (speechState.orbs[k]) speechState.orbs[k].current -= v;
      if (speechState.resources[k]) speechState.resources[k].current -= v;
    }
  }
  up.level += 1;
  if (name === 'cohere') {
    // regen handled in tickSpeech based on upgrade level
  } else if (name === 'vocalMaturity') {
    awardXp(5, ['voice']);
  } else if (name === 'capacityBoost') {
    speechState.memorySlots += 1;
  } else if (name === 'expandMind') {
    speechState.orbs.insight.max = Math.round(speechState.orbs.insight.max * 1.15);
  } else if (name === 'soundExpansion') {
    speechState.resources.sound.max += 25;
    if (up.level === 2) {
      speechState.memorySlots += 1;
    }
  } else if (name === 'cognitiveLattice') {
    speechState.resources.sound.max += 50;
    speechState.resources.thought.max += 10;
    speechState.resources.structure.max += 5;
  }
  renderUpgrades();
  renderGains();
  renderOrbs();
  renderResources();
  if (speechState.memorySlots !== prevSlots) {
    renderConstructCards();
  }
}

export function renderUpgrades() {
  const panelUp = document.getElementById('speechUpgrades');
  if (!panelUp) return;
  panelUp.innerHTML = '';
  const coreGroup = document.createElement('div');
  coreGroup.className = 'upgrade-group';
  panelUp.appendChild(coreGroup);
  ['cohere','expandMind','soundExpansion','cognitiveLattice','idleChatter'].forEach(name => {
    const btn = document.createElement('button');
    btn.dataset.upgrade = name;
    const cost = getUpgradeCost(name);
    const up = speechState.upgrades[name];
    let costHtml = '';
    if (typeof cost === 'number') {
      const have = speechState.orbs.insight.current;
      const cls = have >= cost ? '' : 'cost-missing';
      costHtml = `<span class="icon-row"><span class="${cls}"><i data-lucide="${resourceIcons.insight}"></i> ${cost}</span></span>`;
    } else {
      costHtml = `<span class="icon-row">` +
        Object.entries(cost).map(([r,a]) => {
          const have = (speechState.orbs[r]?.current ?? speechState.resources[r]?.current ?? 0);
          const cls = have >= a ? '' : 'cost-missing';
          return `<span class="${cls}"><i data-lucide="${resourceIcons[r] || 'package'}"></i> ${a}</span>`;
        }).join(' ') +
        `</span>`;
    }
    const affordable = canAfford(cost);
    btn.classList.toggle('unaffordable', !affordable);
    const desc = typeof upgradeDescriptions[name] === 'function'
      ? upgradeDescriptions[name](up.level)
      : upgradeDescriptions[name] || '';
    btn.innerHTML = `<span class="upg-info"><span class="upg-name">${name}</span><span class="upgrade-level">Lv.${up.level}</span></span><div class="detail"><div class="cost">${costHtml}</div><div class="desc">${desc}</div><span class="buy-btn">Buy</span></div>`;
    btn.addEventListener('click', e => {
      if (!btn.classList.contains('expanded')) {
        btn.classList.add('expanded');
        return;
      }
      if (e.target.closest('.buy-btn')) {
        purchaseUpgrade(name);
      } else {
        btn.classList.remove('expanded');
      }
    });
    coreGroup.appendChild(btn);
  });
  if (speechState.upgrades.clarividence.unlocked && speechState.upgrades.clarividence.level === 0) {
    const btn = document.createElement('button');
    btn.dataset.upgrade = 'clarividence';
    const cost = getUpgradeCost('clarividence');
    const cls = speechState.orbs.insight.current >= cost ? '' : 'cost-missing';
    btn.classList.toggle('unaffordable', !canAfford(cost));
    btn.innerHTML = `<span class="upg-info"><span class="upg-name">clarividence</span><span class="upgrade-level">Lv.0</span></span><div class="detail"><div class="cost"><span class="icon-row"><span class="${cls}"><i data-lucide="${resourceIcons.insight}"></i> ${cost}</span></span></div><div class="desc">${upgradeDescriptions.clarividence}</div><span class="buy-btn">Buy</span></div>`;
    btn.addEventListener('click', e => {
      if (!btn.classList.contains('expanded')) {
        btn.classList.add('expanded');
        return;
      }
      if (e.target.closest('.buy-btn')) {
        purchaseUpgrade('clarividence');
      } else {
        btn.classList.remove('expanded');
      }
    });
    coreGroup.appendChild(btn);
  }
  if (speechState.upgrades.vocalMaturity.unlocked || speechState.failCount >= 5) {
    const vocal = document.createElement('div');
    vocal.className = 'upgrade-group';
    panelUp.appendChild(vocal);
    const btn = document.createElement('button');
    btn.dataset.upgrade = 'vocalMaturity';
    const cost = getUpgradeCost('vocalMaturity');
    const cls = speechState.orbs.insight.current >= cost ? '' : 'cost-missing';
    btn.classList.toggle('unaffordable', !canAfford(cost));
    btn.innerHTML = `<span class="upg-info"><span class="upg-name">vocalMaturity</span><span class="upgrade-level">Lv.${speechState.upgrades.vocalMaturity.level}</span></span><div class="detail"><div class="cost"><span class="icon-row"><span class="${cls}"><i data-lucide="${resourceIcons.insight}"></i> ${cost}</span></span></div><div class="desc">${upgradeDescriptions.vocalMaturity}</div><span class="buy-btn">Buy</span></div>`;
    btn.addEventListener('click', e => {
      if (!btn.classList.contains('expanded')) {
        btn.classList.add('expanded');
        return;
      }
      if (e.target.closest('.buy-btn')) {
        purchaseUpgrade('vocalMaturity');
      } else {
        btn.classList.remove('expanded');
      }
    });
    vocal.appendChild(btn);
  }
}

function renderGains() {
  const panel = document.getElementById('speechGains');
  if (!panel) return;
  panel.innerHTML = '';
}

function tickActiveConstructs(dt) {
  // Constructs no longer auto-cast when slotted. Only active buffs
  // from previously cast constructs are processed each tick.
  for (const name of Object.keys(speechState.activeBuffs)) {
    const data = speechState.activeBuffs[name];
    const effect = constructEffects[name];
    if (effect) effect(dt, data.mult || 1);
    data.time -= dt;
    if (data.time <= 0) delete speechState.activeBuffs[name];
  }
  for (const name of Object.keys(speechState.cooldowns)) {
    speechState.cooldowns[name] = Math.max(0, speechState.cooldowns[name] - dt);
    if (speechState.cooldowns[name] === 0) delete speechState.cooldowns[name];
  }
}

function updateCooldownOverlays() {
  if (!container) return;
  const cards = container.querySelectorAll('.construct-card[data-name]');
  cards.forEach(card => {
    const name = card.dataset.name;
    const def = recipes.find(r => r.name === name);
    if (!def) return;
    const remaining = def.cooldown ? (speechState.cooldowns[name] || 0) : 0;
    const ratio = def.cooldown ? 1 - remaining / def.cooldown : 1;
    const overlay = card.querySelector('.cooldown-overlay');
    if (overlay) overlay.style.setProperty('--cooldown', ratio);
    const cost = def.castCost || def.input || {};
    const affordable = Object.entries(cost).every(([res, amt]) => {
      const r = speechState.resources[res];
      return r && r.current >= amt;
    });
    const ready = remaining === 0 && affordable;
    card.classList.toggle('onCooldown', remaining > 0);
    card.classList.toggle('available', ready);
    card.classList.toggle('unavailable', !ready);
    const timer = card.parentElement.querySelector('.cooldown-timer');
    if (timer) timer.textContent = remaining > 0 ? `${remaining.toFixed(1)}s` : '';
  });
}

function updateIntoneUI() {
  if (!container) return;
  const card = container.querySelector('.construct-card[data-name="Intone"]');
  if (card) {
    const meter = card.querySelectorAll('.intone-seg');
    meter.forEach((seg, idx) => {
      const filled = speechState.intoneTimer > 0 || speechState.intonePresses > idx;
      seg.classList.toggle('filled', filled);
    });
    const timer = card.querySelector('.intone-timer');
    if (timer) {
      if (speechState.intoneTimer > 0) {
        timer.style.display = 'flex';
        timer.textContent = `${Math.ceil(speechState.intoneTimer)}s`;
      } else {
        timer.style.display = 'none';
      }
    }
  }
  const badge = container.querySelector('#intoneMultiplier');
  if (badge) {
    const mult = getIntoneMultiplier();
    badge.textContent = mult > 1 ? `×${mult.toFixed(1)}` : '';
  }
}

export function tickSpeech(delta) {
  const hasUI = !!container;
  const dt = delta / 1000;
  if (speechState.intoneTimer > 0) {
    speechState.intoneTimer = Math.max(0, speechState.intoneTimer - dt);
    if (speechState.intoneTimer === 0) {
      speechState.intonePresses = 0;
    }
  } else {
    speechState.intoneIdle += dt;
    if (speechState.intonePresses < 15 && speechState.intoneIdle >= 2) {
      const dec = Math.floor(speechState.intoneIdle / 2);
      speechState.intonePresses = Math.max(0, speechState.intonePresses - dec);
      speechState.intoneIdle -= dec * 2;
    }
  }
  ['body', 'will'].forEach(k => {
    const orb = speechState.orbs[k];
    const rate = speechState.gains[k];
    if (rate > 0) {
      if (coreState.meditating) {
        coreState.meditationProgress += rate * dt;
      } else if (orb.current < orb.max) {
        orb.current = Math.min(orb.max, orb.current + rate * dt);
      }
    }
  });
  speechState.seasonTimer += dt;
  if (speechState.seasonTimer >= DAY_LENGTH_SECONDS) {
    speechState.seasonTimer -= DAY_LENGTH_SECONDS;
    speechState.seasonDay += 1;
    document.dispatchEvent(new CustomEvent('day-passed', {
      detail: { day: speechState.seasonDay, season: speechState.seasonIndex }
    }));
    if (!speechState.weather && Math.random() < 0.01) {
      const type = Math.random() < 0.5 ? 'clear' : 'torment';
      const duration = 180 + Math.floor(Math.random() * 121); // 3-5 minutes
      speechState.weather = {
        type,
        multiplier: type === 'clear' ? 1.25 : 0.5,
        icon: type === 'clear' ? '\u2728' : '\uD83D\uDE2D',
        duration
      };
      addLog(type === 'clear' ? 'Clear minded day!' : 'Torment sets in!', 'info');
    }
    if (speechState.seasonDay >= SEASON_LENGTH_DAYS) {
      speechState.seasonDay = 0;
      speechState.seasonIndex = (speechState.seasonIndex + 1) % seasons.length;
    }
  }
  if (speechState.weather) {
    speechState.weather.duration -= dt;
    if (speechState.weather.duration <= 0) speechState.weather = null;
  }
  const ins = speechState.resources.insight;
  const startInsight = ins.current;
  const seasonMult = seasons[speechState.seasonIndex].multiplier;
  const baseRateRaw = R_MAX / (1 + Math.exp((ins.current - getInsightMidpoint()) / K));
  const level = speechState.upgrades.cohere.level;
  // provide baseline regen at level 0 while still tapering off with higher levels
  const upgradeMult = (level + 1) / (level + 5);
  const idleCount =
    speechState.upgrades.idleChatter.level > 0
      ? speechState.disciples.filter(
          d => (sectState.discipleTasks[d.id] || 'Idle') === 'Idle'
        ).length
      : 0;
  const idleMult = 1 + idleCount * 0.05;
  const baseTotal = baseRateRaw * upgradeMult * idleMult;
  let regen = baseTotal * seasonMult;
  if (speechState.weather) regen *= speechState.weather.multiplier;
  regen = Math.min(R_MAX, regen) * getIntoneMultiplier();
  speechState.insightRegenBase = baseTotal;
  ins.current = Math.min(ins.max, ins.current + regen * dt);
  // Unlock clarividence once the player demonstrates basic insight control
  // by accumulating at least 50 insight.
  if (!speechState.upgrades.clarividence.unlocked && ins.current >= 50) {
    speechState.upgrades.clarividence.unlocked = true;
    if (hasUI) renderUpgrades();
  }
  const echo = recipes.find(r => r.name === 'Echo of Mind');
  if (
    echo &&
    !echo.unlocked &&
    speechState.skills.voice.level >= 3 &&
    ins.current >= 1500
  ) {
    echo.unlocked = true;
    delete echo.requirements;
    addLog('Echo of Mind construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Echo of Mind');
    } else if (!speechState.savedConstructs.includes('Echo of Mind')) {
      speechState.savedConstructs.push('Echo of Mind');
    }
  }
  const pulse = recipes.find(r => r.name === 'Clarity Pulse');
  if (
    pulse &&
    !pulse.unlocked &&
    speechState.skills.mind.level >= 2 &&
    ins.current >= 1700
  ) {
    pulse.unlocked = true;
    delete pulse.requirements;
    addLog('Clarity Pulse construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Clarity Pulse');
    } else if (!speechState.savedConstructs.includes('Clarity Pulse')) {
      speechState.savedConstructs.push('Clarity Pulse');
    }
  }
  const seed = recipes.find(r => r.name === 'Symbol Seed');
  if (
    seed &&
    !seed.unlocked &&
    speechState.skills.mind.level >= 3 &&
    ins.current >= 2000
  ) {
    seed.unlocked = true;
    delete seed.requirements;
    addLog('Symbol Seed construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Symbol Seed');
    } else if (!speechState.savedConstructs.includes('Symbol Seed')) {
      speechState.savedConstructs.push('Symbol Seed');
    }
  }
  const mental = recipes.find(r => r.name === 'Mental Construct');
  if (
    mental &&
    !mental.unlocked &&
    speechState.skills.voice.level >= 5 &&
    speechState.skills.mind.level >= 5 &&
    ins.current >= 2300
  ) {
    mental.unlocked = true;
    delete mental.requirements;
    addLog('Mental Construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Mental Construct');
    } else if (!speechState.savedConstructs.includes('Mental Construct')) {
      speechState.savedConstructs.push('Mental Construct');
    }
  }
  const call = recipes.find(r => r.name === 'The Calling');
  if (call && !call.unlocked && speechState.resources.sound.current >= 100) {
    call.unlocked = true;
    addLog('The Calling construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('The Calling');
    } else if (!speechState.savedConstructs.includes('The Calling')) {
      speechState.savedConstructs.push('The Calling');
    }
  }
  tickActiveConstructs(dt);
  ins.current = Math.min(ins.max, Math.max(0, ins.current));
  if (hasUI) {
    updateCooldownOverlays();
    updateIntoneUI();
    renderOrbs();
    renderSeasonBanner();
    renderResources();
    refreshCore();
    renderXpBar();
  }
}

function showConstructCloud(text, target, color) {
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'construct-cloud';
  el.textContent = text;
  if (color) el.style.color = color;
  const parent = target || container;
  parent.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function openInsightRegenPopup() {
  const overlay = createOverlay({ className: 'insight-regen-overlay' });
  const box = overlay.box;
  const header = document.createElement('h2');
  header.textContent = 'Insight Regeneration';
  box.appendChild(header);

  const info = document.createElement('p');
  info.className = 'insight-info';
  info.textContent =
    `Base insight regeneration follows a logistic curve that slows as your` +
    ` total insight rises. At ${getInsightMidpoint()} insight the base rate is half of its` +
    ` ${R_MAX}/s maximum before multipliers.`;
  box.appendChild(info);

  const list = document.createElement('div');
  list.className = 'insight-regen-list';

  const ins = speechState.resources.insight;
  const season = seasons[speechState.seasonIndex];
  const baseRateRaw = R_MAX / (1 + Math.exp((ins.current - getInsightMidpoint()) / K));
  const level = speechState.upgrades.cohere.level;
  const upgradeMult = (level + 1) / (level + 5);
  const idleCount =
    speechState.upgrades.idleChatter.level > 0
      ? speechState.disciples.filter(
          d => (sectState.discipleTasks[d.id] || 'Idle') === 'Idle'
        ).length
      : 0;
  const idleMult = 1 + idleCount * 0.05;
  const seasonMult = season.multiplier;
  const weatherMult = speechState.weather ? speechState.weather.multiplier : 1;
  const intoneMult = getIntoneMultiplier();
  const researcherCount = speechState.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Research'
  ).length;
  const chanterCount = speechState.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Chant'
  ).length;

  // Compare against the level 0 baseline so the display shows the
  // actual boost rather than a sub-1 multiplier.
  const baseMult = 1 / 5; // (level + 1)/(level + 5) when level = 0
  const cohereContribution = upgradeMult / baseMult;
  const rows = [
    { label: 'Base Rate', value: `${baseRateRaw.toFixed(3)}/s` },
    {
      label: `Cohere Lv.${level}`,
      value: `×${cohereContribution.toFixed(2)}`,
    },
  ];
  if (idleCount > 0) {
    rows.push({ label: `Idle Disciples (${idleCount})`, value: `×${idleMult.toFixed(2)}` });
  }
  rows.push({ label: `Season (${season.name})`, value: `×${seasonMult.toFixed(2)}` });
  if (speechState.weather) {
    rows.push({ label: `Weather (${speechState.weather.type})`, value: `×${weatherMult.toFixed(2)}` });
  }
  rows.push({ label: 'Intone', value: `×${intoneMult.toFixed(2)}` });
  if (researcherCount > 0) {
    rows.push({
      label: `Research (${researcherCount})`,
      value: `-${(researcherCount * 4).toFixed(3)}/s`
    });
  }
  if (chanterCount > 0) {
    rows.push({
      label: `Chant (${chanterCount})`,
      value: `-${chanterCount.toFixed(3)}/s`
    });
  }

  rows.forEach(r => {
    const row = document.createElement('div');
    const isNeg =
      r.value.startsWith('-') ||
      (r.value.startsWith('×') && parseFloat(r.value.slice(1)) < 1);
    row.className = 'insight-row' + (isNeg ? ' negative' : '');
    row.innerHTML = `<span>${r.label}</span><span>${r.value}</span>`;
    list.appendChild(row);
  });

  const totalRow = document.createElement('div');
  totalRow.className = 'insight-total';
  totalRow.textContent = `Total: ${speechState.gains.insight.toFixed(3)}/s`;
  list.appendChild(totalRow);

  box.appendChild(list);
  overlay.appendButton('Close', overlay.close);
}

