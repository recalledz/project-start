import addLog from './log.js';
export const speechState = {
  orbs: {
    body: { current: 0, max: 10 },
    insight: { current: 0, max: 10 },
    will: { current: 0, max: 10 }
  },
  resources: {
    thought: { current: 0, max: 30 },
    structure: { current: 0, max: 10, unlocked: false }
  },
  gains: {
    body: 0,
    insight: 1,
    will: 0
  },
  upgrades: {
    cohere: { level: 0, baseCost: 2 },
    vocalMaturity: { level: 0, baseCost: 2, unlocked: false },
    capacityBoost: { level: 0, baseCost: { insight: 10, thought: 5 }, unlocked: false },
    expandMind: {
      level: 0,
      unlocked: true,
      costFunc: lvl => ({ structure: 2 * Math.pow(lvl + 1, 2) })
    }
  },
  capacity: 1,
  slots: [null],
  cooldowns: {},
  constructUnlocked: false,
  savedPhrases: [],
  xp: 0,
  level: 1,
  formUnlocked: false,
  failCount: 0,
  masteryBonus: 0
};

const words = {
  verbs: ['Murmur'],
  targets: []
};

const resourceIcons = {
  insight: '🟦',
  thought: '🧠',
  structure: '🧱',
  body: '❤️',
  will: '💜'
};

function capFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function orbColor(key) {
  switch (key) {
    case 'insight':
      return '#88f';
    case 'body':
      return '#f66';
    case 'will':
      return '#a060ff';
    case 'thought':
      return '#9cf';
    case 'structure':
      return '#ccc';
    default:
      return '#555';
  }
}

function formatCost(cost) {
  if (typeof cost === 'number') {
    return `${cost} ${resourceIcons.insight}`;
  }
  const parts = [];
  for (const [k, v] of Object.entries(cost)) {
    const icon = resourceIcons[k] || '';
    parts.push(`${v} ${icon}`);
  }
  return parts.join(' ');
}

export const wordState = {
  verbs: { Murmur: { level: 1, xp: 0 } },
  targets: {}
};

const wordData = {
  verbs: {
    Murmur: { capacity: 1, cost: { insight: 5 }, power: 1, cd: 0 }
  },
  targets: {
    Form: { capacity: 2 }
  }
};

const phraseEffects = {
  Murmur: {
    cost: { insight: 5 },
    // Murmur simply grants Speech XP and has no direct effect
    create: null,
    cd: 0,
    xp: 1,
    capacity: 1,
    complexity: { verb: 1, target: 0 }
  },
  'Murmur Form': {
    cost: { insight: 5 },
    create: { thought: -1, structure: 3 },
    cd: 3000,
    xp: 1,
    capacity: 3,
    complexity: { verb: 1, target: 1 }
  }
};

function getWordCategory(word) {
  if (wordData.verbs[word]) return 'verbs';
  if (wordData.targets[word]) return 'targets';
  return null;
}

function getWordPotency(word) {
  const cat = getWordCategory(word);
  if (!cat || !wordState[cat][word]) return 1;
  return Math.pow(1.1, wordState[cat][word].level - 1);
}

function getWordXpReq(word) {
  const cat = getWordCategory(word);
  if (!cat || !wordState[cat][word]) return 5;
  const lvl = wordState[cat][word].level;
  return Math.floor(5 * Math.pow(2, lvl - 1));
}

function addWordXp(word, amt) {
  const cat = getWordCategory(word);
  if (!cat || !wordState[cat][word]) return;
  const ws = wordState[cat][word];
  ws.xp += amt;
  while (ws.xp >= getWordXpReq(word)) {
    ws.xp -= getWordXpReq(word);
    ws.level += 1;
  }
}

let container;
function attachWordListeners() {
  if (!container) return;
  container.querySelectorAll('.word-tile').forEach(t => {
    t.removeEventListener('dragstart', onDrag);
    t.addEventListener('dragstart', onDrag);
  });
}

export function initSpeech() {
  container = document.getElementById('speechPanel');
  if (!container) return;
  container.innerHTML = `
    <h3 class="section-title">Core Orbs</h3>
    <div class="speech-orbs speech-tab-orbs">
      <div id="orbInsight" class="speech-orb"><div class="orb-fill"></div></div>
      <div id="orbBody" class="speech-orb"><div class="orb-fill"></div></div>
      <div id="orbWill" class="speech-orb"><div class="orb-fill"></div></div>
    </div>
    <h3 class="section-title">Speech Progression</h3>
    <div class="speech-xp-container">
      <i data-lucide="mic" class="speech-icon"></i>
      <div class="speech-xp-bar"><div class="speech-xp-fill"></div></div>
      <div id="speechLevel" class="speech-level"></div>
    </div>
    <div class="murmur-controls">
      <button id="murmurBtn" class="cast-button">Murmur</button>
      <button id="constructBtn" class="cast-button" style="display:none">Construct</button>
    </div>
    <div id="phraseHotbar" class="phrase-hotbar"></div>
    <div id="constructPanel" class="construct-panel">
      <div class="construct-header">
        <h3 class="section-title">Construct Reality</h3>
        <button id="closeConstructBtn" class="cast-button">❌</button>
      </div>
      <div class="word-list" id="verbList"></div>
      <div class="word-list" id="targetList" style="display:none"></div>
      <div class="phrase-slots" id="phraseSlots"></div>
      <div id="capacityDisplay" class="capacity-display"></div>
      <div class="cast-container">
        <div class="cast-wrapper">
          <button id="castPhraseBtn" class="cast-button"><span>Cast</span><div class="cooldown-overlay" style="--cooldown:0; display:none"></div></button>
          <button id="savePhraseBtn" class="cast-button">Save</button>
          <div id="castCooldownCircle" class="cast-cooldown" style="display:none"><div class="cooldown-overlay" style="--cooldown:0"></div></div>
        </div>
        <div id="phraseInfo" class="phrase-info"></div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
  renderLists();
  renderOrbs();
  createSlots();
  attachWordListeners();
  const castBtn = container.querySelector('#castPhraseBtn');
  castBtn.addEventListener('click', castPhrase);
  castBtn.addEventListener('mouseenter', e => {
    const wordsArr = speechState.slots.filter(Boolean);
    if (wordsArr.length < 1) return;
    const phrase = wordsArr.join(' ');
    const def = phraseEffects[phrase];
    if (!def) return;
    const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
    const mastery = speechState.level + speechState.masteryBonus;
    const difficulty = complexity;
    const chance = 0.95 / (1 + Math.exp(difficulty - mastery - 0.2)) * 100;
    window.showTooltip(`${chance.toFixed(1)}% chance`, e.pageX + 10, e.pageY + 10);
  });
  castBtn.addEventListener('mouseleave', window.hideTooltip);
  const saveBtn = container.querySelector('#savePhraseBtn');
  if (saveBtn) saveBtn.addEventListener('click', savePhrase);
  const murmurBtn = container.querySelector('#murmurBtn');
  if (murmurBtn) murmurBtn.addEventListener('click', castMurmur);
  const constructBtn = container.querySelector('#constructBtn');
  if (constructBtn) constructBtn.addEventListener('click', toggleConstructPanel);
  const closeBtn = container.querySelector('#closeConstructBtn');
  if (closeBtn) closeBtn.addEventListener('click', toggleConstructPanel);
  renderSlots();
  updateCastCooldown();
  renderResources();
  renderGains();
  renderUpgrades();
  renderHotbar();
  checkUnlocks();
}

function onDrag(e) {
  e.dataTransfer.setData('text/type', e.target.dataset.type);
  e.dataTransfer.setData('text/word', e.target.dataset.word);
}

function onDrop(e) {
  const type = e.dataTransfer.getData('text/type');
  const word = e.dataTransfer.getData('text/word');
  const idx = Number(e.currentTarget.dataset.index);
  if (idx === 0 && type !== 'verb') return;
  speechState.slots[idx] = word;
  renderSlots();
}

function onSlotClick(e) {
  const idx = Number(e.currentTarget.dataset.index);
  if (!speechState.slots[idx]) return;
  speechState.slots[idx] = null;
  renderSlots();
}

function renderLists() {
  if (!container) return;
  const makeTile = (word, type) => {
    const d = document.createElement('div');
    d.className = 'word-tile';
    d.classList.add(type);
    d.textContent = word;
    d.draggable = true;
    d.dataset.type = type;
    d.dataset.word = word;
    const ws = wordState[type + 's']?.[word];
    if (ws) {
      const potency = getWordPotency(word).toFixed(2);
      const xpReq = getWordXpReq(word);
      d.title = `Lv.${ws.level} ${ws.xp}/${xpReq} Potency ${potency}x`;
    }
    return d;
  };
  const verbList = container.querySelector('#verbList');
  if (verbList) {
    verbList.innerHTML = '';
    words.verbs.forEach(w => verbList.appendChild(makeTile(w, 'verb')));
  }
  const targetList = container.querySelector('#targetList');
  if (targetList) {
    targetList.innerHTML = '';
    words.targets.forEach(w => targetList.appendChild(makeTile(w, 'target')));
    targetList.style.display = words.targets.length ? 'flex' : 'none';
  }
  attachWordListeners();
}

function createSlots() {
  if (!container) return;
  const slotContainer = container.querySelector('#phraseSlots');
  slotContainer.innerHTML = '';
  speechState.slots.forEach((_, idx) => {
    const slot = document.createElement('div');
    slot.className = 'phrase-slot';
    slot.dataset.index = idx;
    slot.addEventListener('dragover', e => e.preventDefault());
    slot.addEventListener('drop', onDrop);
    slot.addEventListener('click', onSlotClick);
    slotContainer.appendChild(slot);
  });
}

function renderOrbs() {
  if (container) {
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
    };
    update('orbBody', speechState.orbs.body);
    update('orbInsight', speechState.orbs.insight);
    update('orbWill', speechState.orbs.will);
  }
  window.dispatchEvent(new CustomEvent('orbs-changed'));
}

function renderSlots() {
  if (!container) return;
  createSlots();
  container.querySelectorAll('.phrase-slot').forEach(slot => {
    const idx = Number(slot.dataset.index);
    slot.classList.toggle('verb-slot', idx === 0);
    slot.classList.toggle('target-slot', idx > 0);
    const word = speechState.slots[idx];
    slot.innerHTML = '';
    if (word) {
      const span = document.createElement('span');
      span.className = 'slot-word';
      span.textContent = word;
      const x = document.createElement('span');
      x.className = 'slot-clear';
      x.textContent = 'x';
      x.addEventListener('click', ev => {
        ev.stopPropagation();
        speechState.slots[idx] = null;
        renderSlots();
      });
      slot.appendChild(span);
      slot.appendChild(x);
    }
    slot.classList.toggle('filled', Boolean(word));
  });
  renderPhraseInfo();
  updateCastCooldown();
}

function renderPhraseInfo() {
  if (!container) return;
  const info = container.querySelector('#phraseInfo');
  if (!info) return;
  const wordsArr = speechState.slots.filter(Boolean);
  if (wordsArr.length < 1) {
    info.textContent = '';
    return;
  }
  const phrase = wordsArr.join(' ');
  const def = phraseEffects[phrase];
  if (!def) {
    info.textContent = '';
    return;
  }
  const potMult = wordsArr.reduce((a, w) => a + getWordPotency(w), 0) / wordsArr.length;
  const cost = Object.entries(def.cost)
    .map(([k, v]) => `${Math.ceil(v * potMult)} ${k}`)
    .join(', ');
  const effect = def.create
    ? Object.entries(def.create)
        .map(([k, v]) => `+${(v * potMult).toFixed(1)} ${k}`)
        .join(', ')
    : 'None';
  const cd = def.cd ? def.cd / 1000 + 's' : '0s';
  const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
  const mastery = speechState.level + speechState.masteryBonus;
  const difficulty = complexity;
  const chance = 0.95 / (1 + Math.exp(difficulty - mastery - 0.2)) * 100;
  const costHtml = Object.entries(def.cost)
    .map(([k, v]) => `<span class="info-tag" style="background:${orbColor(k)}">Cost: ${Math.ceil(v * potMult)} ${resourceIcons[k] || capFirst(k)}</span>`)
    .join(' ');
  const effectHtml = def.create
    ? Object.entries(def.create)
        .map(([k, v]) => `<span class="info-tag" style="background:${orbColor(k)}">Effect: +${(v * potMult).toFixed(1)} ${resourceIcons[k] || capFirst(k)}</span>`)
        .join(' ')
    : `<span class="info-tag">Effect: None</span>`;
  const cdHtml = `<span class="info-tag">CD: ${cd}</span>`;
  const chanceHtml = `<span class="info-tag">Chance: ${chance.toFixed(1)}%</span>`;
  info.innerHTML = `${costHtml} ${effectHtml} ${cdHtml} ${chanceHtml}`;
  const cap = def.capacity || 0;
  const capDisplay = container.querySelector('#capacityDisplay');
  if (capDisplay) capDisplay.textContent = `Capacity: ${cap}/${speechState.capacity}`;
}

function castPhrase(phraseArg) {
  const wordsArr = phraseArg ? phraseArg.split(' ') : speechState.slots.filter(Boolean);
  if (wordsArr.length < 1) return;
  const phrase = wordsArr.join(' ');
  const def = phraseEffects[phrase];
  if (!def) return;
  for (const orb of Object.values(speechState.orbs)) {
    if (orb.current < 0) return;
  }
  for (const res of Object.values(speechState.resources)) {
    if (res.current < 0) return;
  }
  if (speechState.cooldowns[phrase] && Date.now() < speechState.cooldowns[phrase]) return;
  if ((def.capacity || 0) > speechState.capacity) return;
  const potMult = wordsArr.reduce((a, w) => a + getWordPotency(w), 0) / wordsArr.length;
  for (const [orb, cost] of Object.entries(def.cost)) {
    if (speechState.orbs[orb].current < cost * potMult) return;
  }
  const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
  const mastery = speechState.level + speechState.masteryBonus;
  const difficulty = complexity;
  const chance = 0.95 / (1 + Math.exp(difficulty - mastery - 0.2));
  const success = Math.random() <= chance;
  for (const [orb, cost] of Object.entries(def.cost)) {
    speechState.orbs[orb].current -= cost * potMult;
    const el = container.querySelector(`#orb${capFirst(orb)}`);
    if (el) {
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 300);
    }
  }
  speechState.cooldowns[phrase] = Date.now() + def.cd;
  if (success) {
    if (def.create) {
      for (const [res, amt] of Object.entries(def.create)) {
        const r = speechState.resources[res];
        if (r) r.current = Math.min(r.max, r.current + amt * potMult);
      }
    }
    wordsArr.forEach(w => addWordXp(w, def.xp || 1));
    if (def.xp) addSpeechXP(def.xp);
    showPhraseCloud(phrase);
  } else {
    speechState.failCount += 1;
    if (!speechState.upgrades.vocalMaturity.unlocked && speechState.failCount >= 5) {
      speechState.upgrades.vocalMaturity.unlocked = true;
      addLog('Vocal Maturity unlocked!', 'info');
      renderUpgrades();
    }
    if (def.xp) addSpeechXP(def.xp / 2);
    showPhraseCloud('...');
  }
  renderOrbs();
  renderResources();
  renderPhraseInfo();
  updateCastCooldown();
  checkUnlocks();
}

function castMurmur() {
  castPhrase('Murmur');
  updateCastCooldown();
}

function toggleConstructPanel() {
  const panel = container.querySelector('#constructPanel');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  container.classList.toggle('construct-mode', open);
}

function savePhrase() {
  const wordsArr = speechState.slots.filter(Boolean);
  if (wordsArr.length < 2) return; // need verb + target
  const phrase = wordsArr.join(' ');
  if (speechState.savedPhrases.includes(phrase)) return;
  const def = phraseEffects[phrase];
  if (!def) return;
  if ((def.capacity || 0) > speechState.capacity) return;
  speechState.savedPhrases.push(phrase);
  renderHotbar();
}

function renderHotbar() {
  const bar = container.querySelector('#phraseHotbar');
  if (!bar) return;
  bar.innerHTML = '';
  speechState.savedPhrases.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'cast-button hotbar-phrase';
    btn.textContent = p;
    btn.addEventListener('click', () => castPhrase(p));
    bar.appendChild(btn);
  });
}

function updateCastCooldown() {
  const castBtn = container.querySelector('#castPhraseBtn');
  const circle = container.querySelector('#castCooldownCircle');
  if (!castBtn || !circle) return;
  const overlay = castBtn.querySelector('.cooldown-overlay');
  const wordsArr = speechState.slots.filter(Boolean);
  if (wordsArr.length < 1) {
    if (overlay) overlay.style.display = 'none';
    circle.style.display = 'none';
    castBtn.classList.remove('onCooldown');
    return;
  }
  const phrase = wordsArr.join(' ');
  const def = phraseEffects[phrase];
  if (!def) return;
  const cdEnd = speechState.cooldowns[phrase];
  if (cdEnd && Date.now() < cdEnd) {
    const ratio = (cdEnd - Date.now()) / def.cd;
    if (overlay) {
      overlay.style.setProperty('--cooldown', ratio);
      overlay.style.display = 'block';
    }
    const circleOverlay = circle.querySelector('.cooldown-overlay');
    if (circleOverlay) {
      circleOverlay.style.setProperty('--cooldown', ratio);
    }
    circle.style.display = 'block';
    castBtn.classList.add('onCooldown');
  } else {
    if (overlay) overlay.style.display = 'none';
    circle.style.display = 'none';
    castBtn.classList.remove('onCooldown');
  }
}

function addSpeechXP(amt) {
  speechState.xp += amt;
  const oldLevel = speechState.level;
  speechState.level = Math.floor(speechState.xp / 10) + 1;
  if (speechState.level !== oldLevel) {
    if (!words.verbs.includes('Murmur')) {
      words.verbs.push('Murmur');
    }
    if (speechState.level >= 10 && speechState.slots.length < 3) {
      speechState.slots.push(null);
    }
    renderLists();
    renderSlots();
    checkUnlocks();
  }
  renderXpBar();
}

function renderXpBar() {
  if (!container) return;
  const bar = container.querySelector('.speech-xp-bar');
  const fill = bar ? bar.querySelector('.speech-xp-fill') : null;
  if (!bar || !fill) return;
  const levelBase = (speechState.level - 1) * 10;
  const pct = Math.min(1, (speechState.xp - levelBase) / 10);
  fill.style.width = `${pct * 100}%`;
  bar.title = `Speech XP ${speechState.xp}/${levelBase + 10}`;
  const levelEl = container.querySelector('#speechLevel');
  if (levelEl) levelEl.textContent = `Speech Lv.${speechState.level}`;
}

function checkUnlocks() {
  if (!speechState.constructUnlocked && speechState.level >= 2) {
    speechState.constructUnlocked = true;
    const btn = container.querySelector('#constructBtn');
    if (btn) btn.style.display = 'inline-block';
    addLog('You feel your words press outward. You may now construct meaning.', 'info');
  }
  if (speechState.level >= 3) {
    speechState.capacity = Math.max(speechState.capacity, 2);
  }
  if (speechState.level >= 4 && speechState.slots.length < 3) {
    speechState.slots.push(null);
    renderSlots();
  }
  if (!speechState.formUnlocked && speechState.resources.thought.current >= 15) {
    speechState.formUnlocked = true;
    if (!words.targets.includes('Form')) {
      words.targets.push('Form');
      wordState.targets['Form'] = { level: 1, xp: 0 };
    }
    speechState.resources.structure.unlocked = true;
    if (speechState.slots.length < 2) speechState.slots.push(null);
    addLog('A concept stabilizes… Form is now available.', 'info');
    renderLists();
    renderResources();
    renderSlots();
    speechState.upgrades.capacityBoost.unlocked = true;
    renderUpgrades();
  }
  if (!speechState.upgrades.vocalMaturity.unlocked && speechState.failCount >= 5) {
    speechState.upgrades.vocalMaturity.unlocked = true;
    addLog('Vocal Maturity unlocked!', 'info');
    renderUpgrades();
  }
}

function renderResources() {
  const panel = document.getElementById('secondaryResources');
  if (!panel) return;
  panel.innerHTML = '';
  Object.entries(speechState.resources).forEach(([key, res]) => {
    if (res.unlocked === false) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'resource';
    const text = document.createElement('div');
    text.className = 'resource-text';
    text.textContent = `${key}: ${Math.floor(res.current)}/${res.max}`;
    const bar = document.createElement('div');
    bar.className = 'resource-bar';
    const fill = document.createElement('div');
    fill.className = 'resource-fill';
    fill.style.width = `${(res.current / res.max) * 100}%`;
    bar.appendChild(fill);
    wrapper.appendChild(text);
    wrapper.appendChild(bar);
    panel.appendChild(wrapper);
  });
}

function renderGains() {
  const panel = document.getElementById('speechGains');
  if (!panel) return;
  panel.innerHTML = '';
}

function getUpgradeCost(name) {
  const up = speechState.upgrades[name];
  if (typeof up.costFunc === 'function') {
    return up.costFunc(up.level);
  }
  if (typeof up.baseCost === 'number') {
    return Math.floor(up.baseCost * Math.pow(2, up.level));
  }
  const costs = {};
  for (const [k, v] of Object.entries(up.baseCost)) {
    costs[k] = Math.floor(v * Math.pow(2, up.level));
  }
  return costs;
}

function purchaseUpgrade(name) {
  const up = speechState.upgrades[name];
  const cost = getUpgradeCost(name);
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
    speechState.gains.insight += 0.5;
  } else if (name === 'vocalMaturity') {
    speechState.masteryBonus += 0.5;
  } else if (name === 'capacityBoost') {
    speechState.capacity += 2;
  } else if (name === 'expandMind') {
    speechState.orbs.insight.max += 10;
  }
  renderUpgrades();
  renderGains();
  renderOrbs();
  renderResources();
  renderPhraseInfo();
}

function renderUpgrades() {
  const panel = document.getElementById('speechUpgrades');
  if (!panel) return;
  panel.innerHTML = '';
  const addSection = title => {
    const h = document.createElement('h4');
    h.className = 'section-title';
    h.textContent = title;
    panel.appendChild(h);
  };

  addSection('Core Upgrades');
  const coreUp = [
    ['cohere', `Cohere Lv.${speechState.upgrades.cohere.level}`],
    ['expandMind', `Expand Mind Lv.${speechState.upgrades.expandMind.level}`]
  ];
  coreUp.forEach(([name, label]) => {
    const btn = document.createElement('button');
    const cost = getUpgradeCost(name);
    btn.innerHTML = `${label} (${formatCost(cost)})`;
    btn.addEventListener('click', () => purchaseUpgrade(name));
    panel.appendChild(btn);
  });

  addSection('Vocal Growth');
  const vocalUp = [];
  if (speechState.upgrades.vocalMaturity.unlocked)
    vocalUp.push(['vocalMaturity', `Vocal Maturity Lv.${speechState.upgrades.vocalMaturity.level}`]);
  if (speechState.upgrades.capacityBoost.unlocked)
    vocalUp.push(['capacityBoost', 'Capacity +2']);
  vocalUp.forEach(([name, label]) => {
    const btn = document.createElement('button');
    const cost = getUpgradeCost(name);
    btn.innerHTML = `${label} (${formatCost(cost)})`;
    btn.addEventListener('click', () => purchaseUpgrade(name));
    panel.appendChild(btn);
  });
}

export function tickSpeech(delta) {
  if (!container) return;
  const dt = delta / 1000;
  ['insight', 'body', 'will'].forEach(k => {
    const orb = speechState.orbs[k];
    const rate = speechState.gains[k];
    if (rate > 0 && orb.current < orb.max) {
      orb.current = Math.min(orb.max, orb.current + rate * dt);
    }
  });
  renderOrbs();
  renderResources();
  renderXpBar();
  renderPhraseInfo();
  updateCastCooldown();
  checkUnlocks();
}

function showPhraseCloud(text) {
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'phrase-cloud';
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
