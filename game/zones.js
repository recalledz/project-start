export let zonesVisible = false;

export function toggleZones() {
  const container = document.getElementById('sectDisciplesContainer');
  if (!container) return;
  zonesVisible = !zonesVisible;
  container.querySelectorAll('.zone, .zone-path').forEach(z => {
    z.style.display = zonesVisible ? 'block' : 'none';
  });
}
