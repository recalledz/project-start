export function getMoodEmoji(mood) {
  if (mood > 100) return '😄';
  if (mood < 25) return '😭';
  if (mood < 50) return '🙁';
  if (mood < 75) return '😐';
  return '🙂';
}
