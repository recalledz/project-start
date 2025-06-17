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

export function renderJobCarousel(container) {
  if (!container) return;
  const jobs = Object.values(Jobs);
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.classList.add('job-carousel-wrapper');
  const left = document.createElement('button');
  left.textContent = '<';
  left.addEventListener('click', () => {
    carouselIndex = (carouselIndex - 1 + jobs.length) % jobs.length;
    renderJobCarousel(container);
  });
  const right = document.createElement('button');
  right.textContent = '>';
  right.addEventListener('click', () => {
    carouselIndex = (carouselIndex + 1) % jobs.length;
    renderJobCarousel(container);
  });
  const track = document.createElement('div');
  track.classList.add('job-carousel');
  jobs.forEach((job, idx) => {
    const card = document.createElement('div');
    card.classList.add('job-card');
    if (idx === carouselIndex) card.classList.add('focused');
    const icon = document.createElement('i');
    icon.dataset.lucide = jobIcons[job.id] || 'help-circle';
    card.appendChild(icon);
    const name = document.createElement('div');
    name.textContent = job.name;
    const desc = document.createElement('div');
    desc.textContent = job.description;
    desc.classList.add('passive-desc');
    card.append(name, desc);
    track.appendChild(card);
  });
  const info = document.createElement('div');
  info.classList.add('job-info');
  const j = jobs[carouselIndex];
  info.textContent = `${j.name}: ${j.description}`;
  wrapper.append(left, track, right);
  container.append(wrapper, info);
  if (window.lucide) window.lucide.createIcons();
}
