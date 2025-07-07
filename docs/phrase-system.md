# Construct System

The phrase builder has been replaced with a simpler construct mechanic. The **Constructs** tab allows resources to be combined inside a small pot. When a valid recipe is present the *Construct* button crafts a card that can be slotted like the old phrases.

## Basics

- Drag available resources into the pot and press **Construct**.
- Recipes unlock as requirements are met.
- Crafted cards appear below the pot and must be equipped to provide their effect.
- Constructs may generate resources over time or provide buffs that modify production.
- Each construct has a **Potency** starting at 1.0. Voice level-ups increase all potencies by 5%.

### Starting Construct – Murmur

- Unlocked from the start.
- Costs: 25 Insight
- Produces: 1 Sound and 1 Voice XP
- When activated, Murmur converts 1 Insight into 1 Sound.
- Your Sound resource can hold up to 200.

### Invocation Summary

| Invocation           | Recipe (to Discover)      | Cost to Use           | Cooldown | Type        | Effect Summary                                        |
| -------------------- | ------------------------- | --------------------- | -------- | ----------- | ----------------------------------------------------- |
| **Murmur**           | —                         | 25 Insight            | 0s       | Generator   | +1 Sound, +1 Voice XP                                 |
| **Echo of Mind**     | Sound + Insight           | 25 Sound + 500 Insight | 5s       | Generator   | +1 Thought over 5s (decaying) *(Unlocks at Voice Lv.3 with 1500 Insight)* |
| **Clarity Pulse**    | Thought + Insight         | 2 Insight + 1 Thought | 30s      | Buff        | +1% Sound & Insight regen/sec for 30s                 |
| **Symbol Seed**      | Sound + Thought           | 2 Sound + 2 Thought   | 10s      | Generator   | After 10s of draining, produces +1 Structure          |
| **Mental Construct** | Thought + Insight + Sound | 30 Insight + 5 Sound  | 60s      | Buff        | Auto-cast any construct in slots for 60 seconds if possible, checking each second |
| **The Calling**     | —                         | 200 Sound            | 5m       | Action      | Attempts to recruit a Disciple based on Calling potency |

*Echo of Mind becomes available once you reach Voice Level 3 and have 1500 Insight saved up.*
*Voice skill levels follow an exponential XP curve starting at 50 XP with a 1.2× increase per level.*

### Upgrades

- **Sound Expansion** – costs 25 Sound for the first level and increases your maximum Sound by 25. The second level costs 50 Sound and grants an additional construct slot. Each further level costs 4 more Sound than the last.
