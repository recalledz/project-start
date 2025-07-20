export function initMistTrails() {
  const container = document.getElementById('sectDisciplesContainer');
  if (!container) return;

  const orb = container.querySelector('#sectOrbs .sect-orb.water');
  const zones = container.querySelectorAll('.zone');
  const layer = container.querySelector('#mistLayer');
  if (!orb || !zones.length || !layer) return;

  layer.innerHTML = '';

  zones.forEach(zone => {
    for (let i = 0; i < 3; i++) {
      createMistParticle(orb, zone, layer);
    }
  });
}

function createMistParticle(orbEl, zoneEl, layer) {
  const orbRect = orbEl.getBoundingClientRect();
  const zoneRect = zoneEl.getBoundingClientRect();

  const midX = (orbRect.left + zoneRect.left) / 2 + (Math.random() - 0.5) * 40;
  const midY = (orbRect.top + zoneRect.top) / 2 + (Math.random() - 0.5) * 40;

  const startX = orbRect.left + orbRect.width / 2;
  const startY = orbRect.top + orbRect.height / 2;
  const endX = zoneRect.left + zoneRect.width / 2;
  const endY = zoneRect.top + zoneRect.height / 2;

  const particle = document.createElement('div');
  particle.className = 'mist';
  layer.appendChild(particle);

  const frames = [
    { transform: `translate(${startX}px, ${startY}px) scale(0)`, opacity: 0 },
    { transform: `translate(${midX}px, ${midY}px) scale(1)`, opacity: 0.4 },
    { transform: `translate(${endX}px, ${endY}px) scale(0)`, opacity: 0 }
  ];

  const duration = 5000 + Math.random() * 3000;
  particle.animate(frames, { duration, iterations: Infinity, delay: Math.random() * 3000 });
}

