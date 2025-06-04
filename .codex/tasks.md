
## ✅ Completed Tasks
- Initial card draw system implemented
- Boss and enemy ability registry with cooldown logic
- Dealer death animation and rerender cycle
- Ability icons styled with cooldown pie shadow effect
- Lucide icons integrated
- Dealer HP system and healing logic for abilities
- Game loop updated for real-time cooldown tracking
- GitHub repository connected and Replit integration enabled

---

## 🚧 Upcoming Goals
- Finalize card visual polish for dealers
- Fix dev tools: spawn boss does not update stage stats properly
- Add appropriate icons to each dealer/boss card
- Increase size/intensity of icons depending on stage

### 🃏 Card System Overhaul
- Create Card class to unify structure
  - Store HP, attack, level, XP, job, suit, traits
  - Define methods for leveling, XP gain, and combat damage
  - Include references to job affinity and trait bonuses
- Implement affinities: each card has a job alignment
  - Types: Strength, Dexterity, Mind, Chaos, Holy
  - Influence stat scaling, ability unlocks, and synergy bonuses

### 🔁 Game Progression
- Implement start screen:
  - Triggered when all cards die, no cards defend, or player prestiges
  - Player selects deck loadout and Joker cards
- Redraw mechanic:
  - Player may redraw hand for escalating cost
  - Cost resets on start screen or clearing world
- Add enemy life bar animation (e.g., breaking or depleting bar on death)

### 🧙 Joker System
- Player abilities triggered by clicking Joker card
- Limited slots for Joker cards
- Unique art per Joker
- Unlocked after defeating world boss (first one heals)
- Use mana, goes on cooldown after use
- Implement Joker file/object registry

### 🔼 Upgrade System
- Card-based upgrades: HP, damage, regen
- Deck-wide or passive boosts

### 🔮 Mana System
- Mana bar unlocked after first boss
- Regenerates over time or from actions
- Required for Joker card use

### ✨ Prestige & Reincarnation
- Prestige unlocks global upgrades & new systems
- Reincarnation resets card jobs, retains traits and core bonuses
- Jobs grant XP towards skill trees (Strength, Dexterity, Mind, Chaos, Holy)

### 🌾 Resource Roles & Jobs
- Assign cards to non-combat jobs: mining, farming, conjuring
- Resource jobs prevent card use in combat
- Cards level in jobs to gain traits and unlock skill trees

---

## 🔄 Migration Status
- Codebase successfully committed to GitHub
- Replit connected and live-editable
- Preparing for Codex-based task and documentation management

## Notes
- Ability registry is in `abilityRegistry.js`.
- Cards render in `renderDealerCard()`.
- Lucide icons are used for visual consistency.
- All UI logic is JS-based; no framework.

