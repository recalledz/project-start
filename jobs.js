export const Jobs = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    attribute: 'Strength',
    description: 'High HP, taunt abilities'
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    attribute: 'Dexterity',
    description: 'Increased critical hits and speed'
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    attribute: 'Mind',
    description: 'Powerful magical attacks'
  },
  trickster: {
    id: 'trickster',
    name: 'Trickster',
    attribute: 'Chaos',
    description: 'Unpredictable burst damage'
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    attribute: 'Holy',
    description: 'Healing and support abilities'
  }
};

export function getJob(id) {
  return Jobs[id] || null;
}

export function assignJob(card, jobId) {
  if (!Jobs[jobId]) return false;
  card.job = jobId;
  // Placeholder: apply job bonuses here in the future
  return true;
}

export function getAvailableJobs(card) {
  const mapping = {
    Spades: ['warrior'],
    Diamonds: ['rogue'],
    Clubs: ['mage'],
    Hearts: ['priest']
  };
  return mapping[card.suit] || [];
}

export const jobIcons = {
  warrior: 'sword',
  mage: 'wizard-hat',
  priest: 'cross',
  rogue: 'mask',
  trickster: 'target',
  paladin: 'shield'
};

let carouselIndex = 0;

export function renderJobAssignments(container, deck) {
  if (!container) return;
  container.innerHTML = '';
  deck.forEach(card => {
    if (card.currentLevel >= 20 && !card.job) {
      const row = document.createElement('div');
      row.classList.add('job-entry');
      row.textContent = `${card.value}${card.symbol} (Lv. ${card.currentLevel})`;

      const select = document.createElement('select');
      getAvailableJobs(card).forEach(id => {
        const j = Jobs[id];
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = j.name;
        select.appendChild(opt);
      });

      const btn = document.createElement('button');
      btn.textContent = 'Assign';
      btn.addEventListener('click', () => {
        const id = select.value;
        if (assignJob(card, id)) {
          renderJobAssignments(container, deck);
        }
      });

      row.append(' ', select, btn);
      container.appendChild(row);
    }
  });
  if (!container.firstChild) {
    container.textContent = 'No eligible cards.';
  }
}

export const jobRegistry = Object.values(Jobs).map(j => ({
  ...j,
  icon: jobIcons[j.id] || 'help-circle',
  unlocked: true,
  mastery: 0,
  recentlyUnlocked: false
}));

export function renderJobCarousel(container) {
  if (!container) return;

  const jobs = jobRegistry;
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.classList.add('job-carousel-canvas');
  canvas.tabIndex = 0;
  const info = document.createElement('div');
  info.classList.add('job-info');

  container.append(canvas, info);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  const dpr = window.devicePixelRatio || 1;
  let position = carouselIndex;
  let target = carouselIndex;

  function resize() {
    width = container.clientWidth;
    height = 220;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  function drawCard(job, x, y, scale, alpha, focused) {
    const cardW = 100;
    const cardH = 140;
    const radius = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(-cardW / 2 + radius, -cardH / 2);
    ctx.lineTo(cardW / 2 - radius, -cardH / 2);
    ctx.quadraticCurveTo(cardW / 2, -cardH / 2, cardW / 2, -cardH / 2 + radius);
    ctx.lineTo(cardW / 2, cardH / 2 - radius);
    ctx.quadraticCurveTo(cardW / 2, cardH / 2, cardW / 2 - radius, cardH / 2);
    ctx.lineTo(-cardW / 2 + radius, cardH / 2);
    ctx.quadraticCurveTo(-cardW / 2, cardH / 2, -cardW / 2, cardH / 2 - radius);
    ctx.lineTo(-cardW / 2, -cardH / 2 + radius);
    ctx.quadraticCurveTo(-cardW / 2, -cardH / 2, -cardW / 2 + radius, -cardH / 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#888';
    ctx.stroke();

    if (!job.unlocked) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', 0, 8);
    }

    if (focused) {
      ctx.shadowColor = 'rgba(255,215,0,0.7)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'gold';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(job.name, 0, cardH / 2 - 20);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = 120;
    jobs.forEach((job, i) => {
      let diff = i - position;
      if (diff > jobs.length / 2) diff -= jobs.length;
      if (diff < -jobs.length / 2) diff += jobs.length;
      const x = centerX + diff * spacing;
      const scale = 1 - Math.min(Math.abs(diff) * 0.2, 0.6);
      const y = centerY + Math.abs(diff) * 10;
      const alpha = 1 - Math.min(Math.abs(diff) / 3, 0.8);
      const focused = Math.abs(diff) < 0.1;
      drawCard(job, x, y, scale, alpha, focused);
    });
    const idx = Math.round(position) % jobs.length;
    const j = jobs[((idx % jobs.length) + jobs.length) % jobs.length];
    info.textContent = j.unlocked
      ? `${j.name}: ${j.description}`
      : `Locked - ${j.unlockHint || ''}`;
  }

  function tick() {
    position += (target - position) * 0.1;
    draw();
    requestAnimationFrame(tick);
  }

  function prev() {
    target = (target - 1 + jobs.length) % jobs.length;
  }

  function next() {
    target = (target + 1) % jobs.length;
  }

  canvas.addEventListener('pointerdown', e => {
    const startX = e.clientX;
    function up(ev) {
      const diff = ev.clientX - startX;
      if (diff > 30) prev();
      else if (diff < -30) next();
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointerup', up);
  });

  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  window.addEventListener('resize', resize);
  resize();
  tick();
}
