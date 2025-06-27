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
    cohere: { level: 0, baseCost: 2 }
  },
  capacity: 1,
  slots: [null],
  cooldowns: {},
  echo: [],
  xp: 0,
  level: 1,
  formUnlocked: false
};

const words = {
  verbs: ['Murmur'],
  targets: []
};

const wordData = {
  verbs: {
    Murmur: { capacity: 1, cost: { insight: 5 }, power: 1, cd: 3000 }
  },
  targets: {
    Form: { capacity: 2 }
  }
};

const phraseEffects = {
  Murmur: {
    cost: { insight: 5 },
    create: { thought: 1 },
    cd: 3000,
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

let container;

export function initSpeech() {
  container = document.getElementById('speechPanel');
  if (!container) return;
  container.innerHTML = `
    <div class="speech-xp-container">
      <i class="speech-icon" data-lucide="message-circle"></i>
      <div class="speech-xp-bar"><div class="speech-xp-fill"></div></div>
      <div id="speechLevel" class="speech-level"></div>
    </div>
    <div class="speech-orbs">
      <div class="speech-orb" id="orbBody"><div class="orb-fill"></div></div>
      <div class="speech-orb" id="orbInsight"><div class="orb-fill"></div></div>
      <div class="speech-orb" id="orbWill"><div class="orb-fill"></div></div>
    </div>
    <div class="word-list" id="verbList"></div>
    <div class="word-list" id="targetList" style="display:none"></div>
    <div id="capacityDisplay" class="capacity-display"></div>
    <div class="phrase-slots" id="phraseSlots"></div>
    <div class="cast-wrapper">
      <button id="castPhraseBtn" class="cast-button"><span>Cast</span><div class="cooldown-overlay" style="--cooldown:0; display:none"></div></button>
      <div id="castCooldownCircle" class="cast-cooldown" style="display:none"><div class="cooldown-overlay" style="--cooldown:0"></div></div>
    </div>
  <div id="phraseInfo" class="phrase-info"></div>
    <div class="echo-log" id="echoLog"></div>
  `;
  if (window.lucide) lucide.createIcons();
  renderLists();
  renderOrbs();
  createSlots();
  container.querySelectorAll('.word-tile').forEach(t => {
    t.addEventListener('dragstart', onDrag);
  });
  const castBtn = container.querySelector('#castPhraseBtn');
  castBtn.addEventListener('click', castPhrase);
  castBtn.addEventListener('mouseenter', e => {
    const wordsArr = speechState.slots.filter(Boolean);
    if (wordsArr.length < 1) return;
    const phrase = wordsArr.join(' ');
    const def = phraseEffects[phrase];
    if (!def) return;
    const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
    const mastery = speechState.level;
    const difficulty = complexity + 100;
    const chance = ((mastery + 0.5) / difficulty) * 100;
    window.showTooltip(`${chance.toFixed(1)}% chance`, e.pageX + 10, e.pageY + 10);
  });
  castBtn.addEventListener('mouseleave', window.hideTooltip);
  renderSlots();
  updateCastCooldown();
  renderResources();
  renderGains();
  renderUpgrades();

  container.querySelectorAll('.speech-orb').forEach(el => {
    el.addEventListener('mouseenter', e => {
      const id = e.currentTarget.id.replace('orb', '').toLowerCase();
      const orb = speechState.orbs[id];
      if (!orb) return;
      window.showTooltip(`${id}: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    el.addEventListener('mouseleave', window.hideTooltip);
  });
}

function onDrag(e) {
  e.dataTransfer.setData('text/type', e.target.dataset.type);
  e.dataTransfer.setData('text/word', e.target.dataset.word);
}

function onDrop(e) {
  const type = e.dataTransfer.getData('text/type');
  const word = e.dataTransfer.getData('text/word');
  const idx = Number(e.currentTarget.dataset.index);
  if (type !== 'verb') return;
  speechState.slots[idx] = word;
  renderSlots();
}

function renderLists() {
  const makeTile = (word, type) => {
    const d = document.createElement('div');
    d.className = 'word-tile';
    d.textContent = word;
    d.draggable = true;
    d.dataset.type = type;
    d.dataset.word = word;
    return d;
  };
  const verbList = container.querySelector('#verbList');
  words.verbs.forEach(w => verbList.appendChild(makeTile(w, 'verb')));
  const targetList = container.querySelector('#targetList');
  if (targetList) {
    targetList.innerHTML = '';
    words.targets.forEach(w => targetList.appendChild(makeTile(w, 'target')));
    targetList.style.display = words.targets.length ? 'flex' : 'none';
  }
}

function createSlots() {
  const slotContainer = container.querySelector('#phraseSlots');
  slotContainer.innerHTML = '';
  speechState.slots.forEach((_, idx) => {
    const slot = document.createElement('div');
    slot.className = 'phrase-slot';
    slot.dataset.index = idx;
    slot.addEventListener('dragover', e => e.preventDefault());
    slot.addEventListener('drop', onDrop);
    slotContainer.appendChild(slot);
  });
}

function renderOrbs() {
  const update = (id, orb) => {
    const fill = container.querySelector(`#${id} .orb-fill`);
    if (!fill) return;
    const pct = Math.max(0, Math.min(1, orb.current / orb.max)) * 100;
    fill.style.height = `${pct}%`;
    const el = container.querySelector(`#${id}`);
    if (el) el.title = `${Math.floor(orb.current)}/${orb.max}`;
  };
  update('orbBody', speechState.orbs.body);
  update('orbInsight', speechState.orbs.insight);
  update('orbWill', speechState.orbs.will);
}

function renderSlots() {
  createSlots();
  container.querySelectorAll('.phrase-slot').forEach(slot => {
    const idx = Number(slot.dataset.index);
    slot.textContent = speechState.slots[idx] || '';
  });
  renderPhraseInfo();
  updateCastCooldown();
}

function renderPhraseInfo() {
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
  const cost = Object.entries(def.cost)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  const effect = def.create
    ? Object.entries(def.create)
        .map(([k, v]) => `+${v} ${k}`)
        .join(', ')
    : 'None';
  const cd = def.cd ? def.cd / 1000 + 's' : '0s';
  const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
  const mastery = speechState.level;
  const difficulty = complexity + 100;
  const chance = ((mastery + 0.5) / difficulty) * 100;
  info.textContent =
    `Cost: ${cost} | Effect: ${effect} | CD: ${cd} | Diff: ${complexity} | Chance: ${chance.toFixed(1)}%`;
  const cap = def.capacity || 0;
  const capDisplay = container.querySelector('#capacityDisplay');
  if (capDisplay) capDisplay.textContent = `Capacity: ${cap}/${speechState.capacity}`;
}

function castPhrase() {
  const wordsArr = speechState.slots.filter(Boolean);
  if (wordsArr.length < 1) return;
  const phrase = wordsArr.join(' ');
  const def = phraseEffects[phrase];
  if (!def) return;
  if (speechState.cooldowns[phrase] && Date.now() < speechState.cooldowns[phrase]) return;
  if ((def.capacity || 0) > speechState.capacity) return;
  const complexity = (def.complexity?.verb || 0) + (def.complexity?.target || 0);
  const mastery = speechState.level;
  const difficulty = complexity + 100;
  const chance = (mastery + 0.5) / difficulty;
  if (Math.random() > chance) {
    speechState.echo.unshift(`Failed ${phrase}`);
    if (speechState.echo.length > 5) speechState.echo.pop();
    renderEcho();
    return;
  }
  for (const [orb, cost] of Object.entries(def.cost)) {
    if (speechState.orbs[orb].current < cost) return;
  }
  for (const [orb, cost] of Object.entries(def.cost)) {
    speechState.orbs[orb].current -= cost;
  }
  if (def.create) {
    for (const [res, amt] of Object.entries(def.create)) {
      const r = speechState.resources[res];
      if (r) r.current = Math.min(r.max, r.current + amt);
    }
  }
  if (def.xp) addSpeechXP(def.xp);
  speechState.cooldowns[phrase] = Date.now() + def.cd;
  speechState.echo.unshift(`Used ${phrase}`);
  if (speechState.echo.length > 5) speechState.echo.pop();
  renderOrbs();
  renderResources();
  renderEcho();
  renderPhraseInfo();
  updateCastCooldown();
  checkUnlocks();
}

function renderEcho() {
  const log = container.querySelector('#echoLog');
  log.innerHTML = speechState.echo.map(e => `<div>${e}</div>`).join('');
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
    if (speechState.level >= 2 && !words.targets.includes('Insight')) {
      words.targets.push('Insight');
    }
    if (speechState.level >= 10 && speechState.slots.length < 3) {
      speechState.slots.push(null);
    }
    renderLists();
    renderSlots();
  }
  renderXpBar();
}

function renderXpBar() {
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
  if (!speechState.formUnlocked && speechState.resources.thought.current >= 15) {
    speechState.formUnlocked = true;
    if (!words.targets.includes('Form')) words.targets.push('Form');
    speechState.resources.structure.unlocked = true;
    if (speechState.slots.length < 2) speechState.slots.push(null);
    addLog('A concept stabilizes… Form is now available.', 'info');
    renderLists();
    renderResources();
    renderSlots();
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
  panel.innerHTML = `Insight/sec: ${speechState.gains.insight.toFixed(1)}<br>` +
    `Body/sec: ${speechState.gains.body.toFixed(1)}<br>` +
    `Will/sec: ${speechState.gains.will.toFixed(1)}`;
}

function getUpgradeCost(name) {
  const up = speechState.upgrades[name];
  return Math.floor(up.baseCost * Math.pow(2, up.level));
}

function purchaseUpgrade(name) {
  const up = speechState.upgrades[name];
  const cost = getUpgradeCost(name);
  if (speechState.orbs.insight.current < cost) return;
  speechState.orbs.insight.current -= cost;
  up.level += 1;
  speechState.gains.insight += 0.5;
  renderUpgrades();
  renderGains();
  renderOrbs();
}

function renderUpgrades() {
  const panel = document.getElementById('speechUpgrades');
  if (!panel) return;
  panel.innerHTML = '';
  const up = speechState.upgrades.cohere;
  const btn = document.createElement('button');
  const cost = getUpgradeCost('cohere');
  btn.textContent = `Cohere Lv.${up.level} (cost ${cost})`;
  btn.addEventListener('click', () => purchaseUpgrade('cohere'));
  panel.appendChild(btn);
}

export function tickSpeech(delta) {
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
  updateCastCooldown();
  checkUnlocks();
}
