export function formatNumber(num) {
  const UNITS = ['', 'k', 'm', 'b', 't', 'q'];
  let n = Math.abs(num);
  let unit = 0;
  while (n >= 1000 && unit < UNITS.length - 1) {
    n /= 1000;
    unit++;
  }
  const formatted = unit === 0 ? Math.floor(num).toString() : n.toFixed(2);
  return `${formatted}${UNITS[unit]}`;
}
