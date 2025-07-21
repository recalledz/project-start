# 09 – Skills & Proficiency

**Saturday, July 12, 2025 • 6:02 PM**

### Base XP Rates
| Task         | Base XP/s  |
|--------------|-----------:|
| Gather Fruit | 0.005      |
| Gather Softwood     | 0.0047     |
| Research     | 0.008      |
| Chant        | 0.333      |
| Building     | 1.000      |

### Milestone Times (no bonuses)
| Task        | To Lv 10   | To Lv 30    |
|-------------|-----------:|------------:|
| Gather Fruit| ~3 days    | ~137 days   |
| Gather Softwood    | ~3 days 5 h| ~146 days   |
| Research    | ~1 day 21 h| ~85 days    |
| Chant       | ~1 h       | ~2 days     |
| Building    | ~21 min    | ~16 h       |

### Affinity & Intelligence Example
- **Formula**: `XP = BaseXP × IntMultiplier × Affinity`
- Example: Int 5 → 1.5× from Intelligence. A **loved** skill (×2) yields
  `BaseXP × 3`.

Each disciple begins with 0‑3 **liked** skills and 0‑3 **loved** skills.
Liked skills grant 1.4× proficiency gain while loved skills grant 2×.
Attributes other than Intelligence do not affect proficiency gain.

### In-game Implementation
Proficiency XP is applied every tick while a disciple performs a task. The base
rates above are multiplied by the disciple's Intelligence modifier and any
affinity bonuses.
Loved skills display a heart icon in the Proficiency tab, while liked skills
show a thumbs-up icon.
